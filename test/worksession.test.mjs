import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { workSessionId, buildKickoff, resolveLocalWorkspace, composeWorkWorld, startWorkSession } from "../src/worksession.mjs";
import { resolveAgentSelection } from "../src/agent-selection.mjs";

// ---- 夹具 ----

const candidate = (n = 1, patch = {}) => ({
  key: "iasiv5/dsh-skins#issue#" + n, repo: "iasiv5/dsh-skins", type: "issue", number: n,
  title: "修复胶囊冷启动空窗", author: "a", labels: [],
  createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z",
  url: "https://github.com/iasiv5/dsh-skins/issues/" + n,
  meta: {}, pull: null, bodyExcerpt: "", stage: "building",
  triage: { validity: "high", urgency: "P1", action: "start", reason: "复现路径清晰", by: "llm", at: "t" },
  ...patch,
});

const pkg = () => ({
  version: 1, kind: "dsh-l.task-package",
  candidate: { key: "iasiv5/dsh-skins#issue#1", repo: "iasiv5/dsh-skins", type: "issue", number: 1, title: "修复胶囊冷启动空窗", url: "https://github.com/iasiv5/dsh-skins/issues/1" },
  triage: { validity: "high", urgency: "P1", action: "start", reason: "复现路径清晰" },
  instructions: { goal: "修复胶囊冷启动空窗", constraints: [], definitionOfDone: [] },
  repo: { defaultBranch: "main", cloneUrl: "git@github.com:iasiv5/dsh-skins.git", localPath: null },
});

const makeStore = (over = {}) => {
  const calls = { setGate: [], setStage: [], append: [], history: [] };
  const c = candidate();
  const store = {
    getCandidate: (key) => (key === c.key ? c : null),
    getWorkSession: over.active ?? (() => null),
    appendWorkSession: (key, row) => calls.append.push({ key, row }),
    recordHistory: (key, event, detail) => calls.history.push({ key, event, detail }),
    getSettings: () => ({ workSessionApprovalPolicy: null }),
    setGate: (...a) => calls.setGate.push(a),
    setStage: (...a) => calls.setStage.push(a),
    _calls: calls,
  };
  return store;
};

// fake world：录调用序（create → wd.set → policy → send 共用一条 ops 序列）。
const makeWorld = ({ sendFails = false } = {}) => {
  const ops = [];
  const world = {
    _ops: ops,
    createAgent: async (sessionId, opts) => {
      ops.push(["create", sessionId, opts]);
      const agent = {
        send: async (msg, mode, wake) => {
          ops.push(["send"]);
          if (sendFails) throw new Error("send-boom");
        },
      };
      return { agent, dispose: async () => { ops.push(["dispose"]); } };
    },
    send: (agent, text) => agent.send(text, "next-turn", true),
  };
  return world;
};

// fake services（composeWorkWorld 用）：agents/workingDirectory/approval 共录一条调用序。
const makeServices = ({ settings = {} } = {}) => {
  const ops = [];
  const services = {
    agents: {
      create: async (opts) => {
        ops.push(["create", opts]);
        const agent = {
          model: { select: (sel) => ops.push(["select", sel]) },
          send: async () => { ops.push(["send"]); },
        };
        opts.setup?.(null, agent);
        return { agent, dispose: async () => {} };
      },
    },
    workingDirectory: { set: async (agent, cwd) => ops.push(["wd.set", cwd]) },
    approval: { setPolicy: (agent, p) => ops.push(["policy", p]) },
    agentDefaultModel: { currentSelection: () => ({ provider: "p0", model: "m0", reasoningEffort: "high" }) },
    settings,
    userMessage: (text) => ({ role: "user", content: [{ type: "text", text }] }),
    _ops: ops,
  };
  return services;
};

test("composeWorkWorld.createAgent：headerCwd 定会话头目录、cwd 仍是工具目录；attachHost 收会话头目录", async () => {
  const svc = makeServices({});
  svc.attachHost = async (sid, dir) => { svc._ops.push(["attach", sid, dir]); };
  const w = composeWorkWorld(svc);
  await w.createAgent("s9", { cwd: "/ws/clone", headerCwd: "/ws" });
  await w.createAgent("s10", { cwd: "/w" });
  assert.deepEqual(svc._ops.filter((o) => o[0] === "create").map((o) => o[1].meta.cwd), ["/ws", "/w"]);
  assert.deepEqual(svc._ops.filter((o) => o[0] === "wd.set").map((o) => o[1]), ["/ws/clone", "/w"]);
  assert.deepEqual(svc._ops.filter((o) => o[0] === "attach"), [["attach", "s9", "/ws"], ["attach", "s10", "/w"]]);
});

// ---- workSessionId / buildKickoff / resolveLocalWorkspace ----

test("workSessionId：dsh-l:work- 前缀 + 唯一性", () => {
  const now = () => new Date(1700000000000);
  const a = workSessionId(now);
  const b = workSessionId(now);
  assert.ok(a.startsWith("dsh-l:work-"));
  assert.notEqual(a, b);
});

test("buildKickoff：锚行开头 + 围栏 JSON + 可读块字段", () => {
  const text = buildKickoff(candidate(), { ...pkg(), repo: { ...pkg().repo, localPath: "/w/dir" } }, "zh-CN");
  assert.ok(text.startsWith("[dsh-l] iasiv5/dsh-skins#1 issue · 修复胶囊冷启动空窗"));
  assert.ok(text.includes("```json"));
  assert.ok(text.includes("https://github.com/iasiv5/dsh-skins/issues/1"));
  assert.ok(text.includes("main"));
  assert.ok(text.includes("/w/dir"));
  const en = buildKickoff(candidate(), pkg(), "en");
  assert.ok(en.startsWith("[dsh-l] iasiv5/dsh-skins#1 issue · "));
});

test("buildKickoff：锚行超 72 字符截断且保前缀", () => {
  const c = candidate(2, { title: "超".repeat(80) });
  const text = buildKickoff(c, pkg(), "zh-CN");
  const anchor = text.split("\n")[0];
  assert.ok(anchor.length <= 72, "anchor length " + anchor.length);
  assert.ok(anchor.startsWith("[dsh-l] iasiv5/dsh-skins#2 issue · "));
});

test("resolveLocalWorkspace：stat 命中返回绝对路径，未命中 null", () => {
  const hit = resolveLocalWorkspace("iasiv5/dsh-skins", { home: "/h", stat: () => ({ isDirectory: () => true }) });
  assert.equal(hit, join("/h", "workspace", "dsh-skins"));
  const miss = resolveLocalWorkspace("iasiv5/dsh-skins", { home: "/h", stat: () => null });
  assert.equal(miss, null);
  assert.equal(resolveLocalWorkspace("noslash", { home: "/h", stat: () => ({ isDirectory: () => true }) }), null);
});

// ---- composeWorkWorld：三分支 + 调用序红线 ----

test("composeWorkWorld 模型安装：显式模型优先；无显式模型时无论有没有预设都装宿主默认（rc.5 预设不供模型，实机 2026-11-24 定谳）", async () => {
  // 分支 1：显式模型
  const s1 = makeServices({ settings: { workSessionPreset: "preset-x", workSessionApprovalPolicy: null } });
  const w1 = composeWorkWorld(s1);
  await w1.createAgent("s1", { cwd: "/w", model: { provider: "p1", model: "m1" } });
  const create1 = s1._ops.find((o) => o[0] === "create")[1];
  assert.deepEqual(create1.agentOptions, { provider: "p1", model: "m1", reasoningEffort: undefined });
  assert.equal(create1.meta.agentPreset, "preset-x");
  assert.ok(create1.setup, "显式模型应有 setup select");
  assert.ok(s1._ops.some((o) => o[0] === "select"));
  assert.equal(s1._ops.filter((o) => o[0] === "policy").length, 0, "policy null → 零 setPolicy（红线③）");

  // 分支 2：preset 在场、无显式模型 → 仍装宿主默认模型，policy 生效。
  // 旧断言是「不传 agentOptions、不 select」（R1-6：不压制 preset 自带模型）；rc.5 的预设只决定工具 schema 与提示段、不供模型，
  // 不装模型的开工会话首回合 preStep 即报 has no provider/model（实机 2026-11-24，评审 F1）。
  const s2 = makeServices({ settings: { workSessionPreset: "preset-y", workSessionApprovalPolicy: "ask" } });
  const w2 = composeWorkWorld(s2);
  await w2.createAgent("s2", { cwd: "/w" });
  const create2 = s2._ops.find((o) => o[0] === "create")[1];
  assert.deepEqual(create2.agentOptions, { provider: "p0", model: "m0", reasoningEffort: "high" });
  assert.ok(create2.setup, "有预设也 select 宿主默认");
  assert.equal(create2.meta.agentPreset, "preset-y");
  assert.deepEqual(s2._ops.find((o) => o[0] === "select")[1], { provider: "p0", model: "m0", reasoningEffort: "high" });
  assert.deepEqual(s2._ops.find((o) => o[0] === "policy")[1], "ask");

  // 分支 3：皆无 → 安装宿主默认模型（实机 2026-11-21 定谳：程序化会话不显式 select 即无模型，
  // 首请求落 deepseek-official 兜底路由 → MISSING_CREDENTIAL——截图证据；autoloop/makeTriage 判例同款恒传）
  const s3 = makeServices({ settings: {} });
  const w3 = composeWorkWorld(s3);
  await w3.createAgent("s3", { cwd: "/w" });
  const create3 = s3._ops.find((o) => o[0] === "create")[1];
  assert.deepEqual(create3.agentOptions, { provider: "p0", model: "m0", reasoningEffort: "high" });
  assert.equal(create3.meta.agentPreset, undefined);
  assert.ok(create3.setup, "分支 3 也 select 宿主默认");
  assert.ok(s3._ops.some((o) => o[0] === "select"));
});

test("startWorkSession 接线：settings.workSessionModel 传给 createAgent；未配则装宿主默认——设了预设也一样", async () => {
  // 生产接线用例（评审 F1：此前 workSessionModel 只被校验和存储，开工路径从不消费；分支用例按调用传参测，与接线脱节）
  const run = async (settings) => {
    const store = makeStore();
    store.getSettings = () => settings;
    const svc = makeServices({ settings });
    await startWorkSession(composeWorkWorld(svc), { store, lang: "zh-CN", now: () => new Date(1700000000000) },
      { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() });
    return svc._ops.find((o) => o[0] === "create")[1];
  };
  const explicit = await run({ workSessionApprovalPolicy: "ask", workSessionModel: { provider: "pm", model: "mm" }, workSessionPreset: "standard" });
  assert.deepEqual(explicit.agentOptions, { provider: "pm", model: "mm", reasoningEffort: undefined }, "显式模型进 agentOptions");
  assert.equal(explicit.meta.agentPreset, "standard", "预设照常生效");
  const fallback = await run({ workSessionApprovalPolicy: null, workSessionModel: null, workSessionPreset: "standard" });
  assert.deepEqual(fallback.agentOptions, { provider: "p0", model: "m0", reasoningEffort: "high" }, "未配显式模型 → 宿主默认");
  assert.ok(fallback.setup, "有 setup select");
});

test("composeWorkWorld：显式 effort 在场即透传（覆盖设定）", async () => {
  const s = makeServices({ settings: {} });
  const w = composeWorkWorld(s);
  await w.createAgent("s", { cwd: "/w", model: { provider: "p1", model: "m1", reasoningEffort: "low" } });
  const create = s._ops.find((o) => o[0] === "create")[1];
  assert.equal(create.agentOptions.reasoningEffort, "low");
  assert.equal(resolveAgentSelection({ provider: "p", model: "m", reasoningEffort: "high" }, null).reasoningEffort, "high");
  assert.equal(resolveAgentSelection({ provider: "p", model: "m" }, null).reasoningEffort, undefined);
});

test("composeWorkWorld 调用序（红线①）：create → wd.set → [policy] → send；wd.set 早于 send", async () => {
  const s = makeServices({ settings: { workSessionApprovalPolicy: "never" } });
  const w = composeWorkWorld(s);
  const { agent } = await w.createAgent("s", { cwd: "/w/dir", approvalPolicy: "never" });
  const idx = (k) => s._ops.findIndex((o) => o[0] === k);
  assert.ok(idx("create") < idx("wd.set"), "wd.set 必须晚于 create");
  assert.ok(idx("wd.set") < idx("policy"), "policy 晚于 wd.set");
  await w.send(agent, "kickoff-text");
  assert.ok(idx("policy") < idx("send"), "send 必须晚于 wd.set 与 setPolicy（红线①时序）");
  assert.deepEqual(s._ops.find((o) => o[0] === "wd.set")[1], "/w/dir");
});

// ---- startWorkSession：守卫/事务/回滚 ----

test("startWorkSession 创建：createAgent 收 cwd、send 锚行围栏、索引与留痕落库", async () => {
  const store = makeStore();
  const world = makeWorld();
  const out = await startWorkSession(world, { store, lang: "zh-CN", now: () => new Date(1700000000000) },
    { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() });
  assert.equal(out.reused, false);
  assert.ok(out.sessionId.startsWith("dsh-l:work-"));
  const create = world._ops.find((o) => o[0] === "create");
  assert.deepEqual(create[2], { cwd: "/w/dir" });
  const sent = world._ops.find((o) => o[0] === "send");
  assert.ok(sent, "kickoff 已发");
  assert.equal(store._calls.append.length, 1);
  assert.equal(store._calls.append[0].row.sessionId, out.sessionId);
  assert.equal(store._calls.append[0].row.cwd, "/w/dir");
  assert.ok(store._calls.history.some((h) => h.event === "work-session.opened"));
  assert.equal(store._calls.setGate.length, 0, "域层零记账（守卫在路由层）");
});

// 新导出用顶层动态导入引入（Task 6 硬规则）。
const { workSessionTitle } = await import("../src/worksession.mjs");

test("workSessionTitle + startWorkSession：创建后先 setTitle 再 send", async () => {
  assert.equal(workSessionTitle({ repo: "iasiv5/dsh-m", number: 80, type: "pull", title: "docs: add SECURITY_MODEL.md threat model" }), "dsh-m#80 PR · docs: add SECURITY_MODEL.md threat model");
  const long = workSessionTitle({ repo: "iasiv5/dsh-m", number: 80, type: "pull", title: "x".repeat(70) });   // 前缀 14 字符，72 − 14 = 58
  assert.equal(long, "dsh-m#80 PR · " + "x".repeat(58) + "…");
  assert.equal(workSessionTitle({ repo: "o/r", number: 1, type: "issue", title: "t" }), "r#1 issue · t");
  const store = makeStore();
  const world = makeWorld();
  world.setTitle = (_agent, title) => { world._ops.push(["title", title]); };
  await startWorkSession(world, { store, lang: "zh-CN", now: () => new Date(1700000000000) },
    { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() });
  const titleIdx = world._ops.findIndex((o) => o[0] === "title");
  const sendIdx = world._ops.findIndex((o) => o[0] === "send");
  assert.ok(titleIdx >= 0, "创建后设了标题");
  assert.equal(world._ops[titleIdx][1], workSessionTitle(candidate()));
  assert.ok(titleIdx < sendIdx, "标题先于 send");
});

test("startWorkSession 复用：命中同 cwd（含 cwd=null）→ reused:true、world 零调用", async () => {
  const active = { sessionId: "dsh-l:work-old", cwd: "/w/dir", approvalPolicy: null, createdAt: "t", updatedAt: "t" };
  const store = makeStore({ active: (key) => (key === candidate().key ? active : null) });
  const world = makeWorld();
  const out1 = await startWorkSession(world, { store, lang: "zh-CN", now: () => new Date() },
    { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() });
  assert.deepEqual(out1, { sessionId: "dsh-l:work-old", reused: true });
  const out2 = await startWorkSession(world, { store, lang: "zh-CN", now: () => new Date() },
    { key: candidate().key, cwd: null, another: false, pkg: pkg() });
  assert.equal(out2.reused, true);
  assert.equal(world._ops.length, 0, "复用路径 world 零调用");
  assert.equal(store._calls.append.length, 0);
});

test("startWorkSession 冲突：命中且 cwd≠ → 409 且零记账", async () => {
  const active = { sessionId: "dsh-l:work-old", cwd: "/w/other", approvalPolicy: null, createdAt: "t", updatedAt: "t" };
  const store = makeStore({ active: () => active });
  const world = makeWorld();
  await assert.rejects(
    () => startWorkSession(world, { store, lang: "zh-CN", now: () => new Date() },
      { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() }),
    (e) => e.status === 409 && e.code === "work-cwd-conflict",
  );
  assert.equal(world._ops.length, 0);
  assert.equal(store._calls.setGate.length, 0);
  assert.equal(store._calls.append.length, 0);
});

test("startWorkSession another：新 id 追加、旧行保留", async () => {
  const rows = [{ sessionId: "dsh-l:work-old", cwd: "/w/dir", approvalPolicy: null, createdAt: "t", updatedAt: "t" }];
  const appended = [];
  const store = makeStore();
  store.getWorkSession = () => rows[rows.length - 1];
  store.appendWorkSession = (key, row) => { rows.push(row); appended.push(row); };
  const world = makeWorld();
  const out = await startWorkSession(world, { store, lang: "zh-CN", now: () => new Date() },
    { key: candidate().key, cwd: "/w/dir", another: true, pkg: pkg() });
  assert.equal(out.reused, false);
  assert.notEqual(out.sessionId, "dsh-l:work-old");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].sessionId, "dsh-l:work-old", "旧行保留");
});

test("startWorkSession 回滚：send 失败 → dispose、不 append、kickoff-failed 留痕、抛 500", async () => {
  const store = makeStore();
  const world = makeWorld({ sendFails: true });
  await assert.rejects(
    () => startWorkSession(world, { store, lang: "zh-CN", now: () => new Date() },
      { key: candidate().key, cwd: "/w/dir", another: false, pkg: pkg() }),
    (e) => e.status === 500 && e.code === "kickoff-failed",
  );
  const idxDispose = world._ops.findIndex((o) => o[0] === "dispose");
  assert.ok(idxDispose >= 0, "dispose 被调（回滚）");
  assert.equal(store._calls.append.length, 0, "appendWorkSession 未被调");
  assert.ok(store._calls.history.some((h) => h.event === "work-session.kickoff-failed"), "失败留痕");
});

// ---- 红线②：源扫描 ----

test("红线②：worksession.mjs 中 .dispose( 恰出现 1 次且位于 rollback-only 标记分支", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/worksession.mjs", import.meta.url)), "utf8");
  const count = src.split(".dispose(").length - 1;
  assert.equal(count, 1, ".dispose( 出现次数 " + count);
  const idx = src.indexOf(".dispose(");
  const before = src.slice(Math.max(0, idx - 400), idx);
  assert.ok(before.includes("rollback-only"), "dispose 前应有 rollback-only 标记注释");
});

test("composeWorkWorld：settings 支持函数形态——store.getSettings 引用替换后读到新值（评审 impl#1）", async () => {
  let s = { workSessionPreset: "p1", workSessionApprovalPolicy: null };
  const svc = makeServices({ settings: () => s });
  const w = composeWorkWorld(svc);
  await w.createAgent("a1", { cwd: "/w" });
  const c1 = svc._ops.find((o) => o[0] === "create")[1];
  assert.equal(c1.meta.agentPreset, "p1");
  assert.equal(svc._ops.filter((o) => o[0] === "policy").length, 0);
  s = { workSessionPreset: "p2", workSessionApprovalPolicy: "never" };   // 引用整体替换（store.setSettings 语义）
  await w.createAgent("a2", { cwd: "/w" });
  const c2 = svc._ops.filter((o) => o[0] === "create").at(-1)[1];
  assert.equal(c2.meta.agentPreset, "p2", "函数形态下读到替换后的新 settings");
  assert.deepEqual(svc._ops.filter((o) => o[0] === "policy").at(-1)[1], "never");
});

test("buildKickoff：PR 候选含 PR 分支行与 gh pr checkout <n>；issue 候选不含", () => {
  const pr = { ...candidate(), type: "pull", number: 80, pull: { draft: false, headRef: "devin/security-model" } };
  const zh = buildKickoff(pr, pkg(), "zh-CN");
  assert.ok(zh.includes("PR 分支：devin/security-model"), "PR 分支行");
  assert.ok(zh.includes("gh pr checkout 80"), "gh pr checkout");
  assert.ok(zh.includes("工作台不会替你切换分支"), "不替用户切分支");
  const en = buildKickoff(pr, pkg(), "en");
  assert.ok(en.includes("PR branch: devin/security-model") && en.includes("gh pr checkout 80"), "en");
  assert.ok(!buildKickoff(candidate(), pkg(), "zh-CN").includes("PR 分支"), "issue 候选不含");
});
