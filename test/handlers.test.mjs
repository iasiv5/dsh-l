import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { makeRunId } from "../src/store.mjs";
import { loadTemplates } from "../src/workflows/loader.mjs";
import { makeHandlers, buildTaskPackage } from "../src/handlers.mjs";

const openStore = () => createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-h-")), "s.json") });
const login = (store, account = "o") => store.setAuth({ account, login: account });
const PROVIDER = (mode = {}) => ({
  resolveToken: async () => mode.token ?? null,
  ghAvailable: async () => mode.gh !== false,
  getViewer: async () => {
    if (!mode.viewerLogin) throw new Error("github api 401 for /user");
    return { login: mode.viewerLogin };
  },
  listOpenIssues: async ({ repo }) => {
    if (mode.bad && repo === "o/bad") throw new Error("github api 500 for /repos/o/bad/issues?state=open");
    if (mode.empty) return [];
    return repo === "o/good" ? [{ repo, type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }] : [];
  },
  listOpenPulls: async () => [],
  getRepo: async ({ repo }) => ({ defaultBranch: "trunk", cloneUrl: "git@github.com:" + repo + ".git" }),
  discoverRepos: async () => [{ fullName: "o/good" }],
});
const noTriage = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };
const seed = (store, n = 1) => store.upsertCandidates([{ repo: "o/r", type: "issue", number: n, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);

test("postRefresh：单仓失败容错并记 perRepo.error", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good", "o/bad"]);
  const r = await makeHandlers({ store, provider: PROVIDER({ bad: true }), triage: noTriage }).postRefresh();
  assert.equal(r.perRepo["o/bad"].error, "github api 500 for /repos/o/bad/issues?state=open");
  assert.equal(r.perRepo["o/good"].error, null);
  assert.equal(store.listCandidates().length, 1);
});

test("getState：暴露 workflow meta（不含 script）与 runs 摘要", async () => {
  const store = openStore(); seed(store);
  const catalog = loadTemplates({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-hwf-")) });
  const runId = makeRunId();
  store.createRun({ id: runId, candidateKey: "o/r#issue#1", templateId: "loop-v1",
    templateRevision: catalog.templates[0].revision,
    snapshot: { nodes: catalog.templates[0].nodes, edges: [] },
    nodeStates: { g1: { status: "waiting", attempt: 0, reworkCount: 0, error: null } },
    status: "waiting", cancelReason: null, createdAt: "T", updatedAt: "T", history: [] });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, workflowCatalog: catalog });
  const state = await h.getState();
  assert.equal(state.workflow.templates[0].id, "loop-v1");
  assert.ok(state.workflow.templates[0].nodes.every((n) => !("script" in n)));
  assert.equal(state.runs.length, 1);
  assert.deepEqual(state.runs[0].currentNodeIds, ["g1"]);
  // 缺省 catalog：不传 workflowCatalog 时回空结构（host 侧总是传，兜底给直接调用者）
  const bare = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.deepEqual((await bare.getState()).workflow, { templates: [], warnings: [] });
});

test("putWatch 校验仓名形状", async () => {
  const store = openStore(); login(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.deepEqual((await h.putWatch({ repos: ["o/r"] })).repos, ["o/r"]);
  assert.equal((await h.putWatch({ repos: ["bad name"] })).error, "invalid repos");
});

test("postTriage：1..10 限制；结果写回 by=llm；失败透传", async () => {
  const store = openStore(); seed(store);
  const triage = { runTriage: async () => ({ updated: [{ key: "o/r#issue#1", validity: "low", urgency: "P3", action: "close", reason: "spam" }], failed: null }) };
  const h = makeHandlers({ store, provider: PROVIDER(), triage });
  assert.deepEqual((await h.postTriage({ keys: ["o/r#issue#1"], lang: "zh-CN" })).updated, ["o/r#issue#1"]);
  assert.equal(store.getCandidate("o/r#issue#1").triage.by, "llm");
  assert.equal((await h.postTriage({ keys: Array.from({ length: 11 }, (_, i) => "k" + i) })).error, "keys must be 1..10");
  const hf = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await hf.postTriage({ keys: ["o/r#issue#1"] })).error, "triage-not-wired");
});

test("postOverride：人工推翻分诊 by=human，非法值拒绝", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  await h.postOverride({ key: "o/r#issue#1", validity: "high", urgency: "P0", action: "start", reason: "我确认", lang: "zh-CN" });
  assert.equal(store.getCandidate("o/r#issue#1").triage.by, "human");
  assert.equal((await h.postOverride({ key: "o/r#issue#1", validity: "x", urgency: "P0", action: "start" })).error, "invalid triage");
});

test("闸门：G1 仅 gating 可放行；pass→building+任务包；reject→triaged；G2/G3 409", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  const early = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass" });
  assert.deepEqual([early.error, early.status], ["gate-requires-gating", 409]);
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  store.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass", note: "" });
  assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.equal(r.taskPackage.emit.type, "build.requested");
  assert.equal(r.taskPackage.repo.defaultBranch, "trunk");
  assert.equal(store.getCandidate("o/r#issue#1").stage, "building");
  assert.equal((await h.postGate({ key: "o/r#issue#1", gate: "G2", decision: "pass" })).status, 409);
  seed(store, 2);
  await h.postStage({ key: "o/r#issue#2", stage: "gating" });
  await h.postGate({ key: "o/r#issue#2", gate: "G1", decision: "reject", note: "不做" });
  assert.equal(store.getCandidate("o/r#issue#2").stage, "triaged");
});

test("postStage：building 只能经 G1 进入；未知候选 404", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.postStage({ key: "o/r#issue#1", stage: "building" })).error, "invalid stage");
  assert.equal((await h.postStage({ key: "nope", stage: "held" })).status, 404);
});

test("putSettings：intervalMinutes 0..1440 整数，变更回调", async () => {
  const store = openStore();
  let changed = 0;
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, onSettingsChange: () => { changed++; } });
  assert.equal((await h.putSettings({ intervalMinutes: 15 })).intervalMinutes, 15);
  assert.equal(changed, 1);
  assert.equal((await h.putSettings({ intervalMinutes: -1 })).error, "invalid settings");
});

test("putSettings：并发 1..4 与保留期 1..90 边界", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.putSettings({ engineConcurrency: 3 })).engineConcurrency, 3);
  assert.equal((await h.putSettings({ workspaceRetentionDays: 14 })).workspaceRetentionDays, 14);
  assert.equal((await h.putSettings({ engineConcurrency: 5 })).error, "invalid settings");
  assert.equal((await h.putSettings({ workspaceRetentionDays: 0 })).error, "invalid settings");
});

test("buildTaskPackage 形状", () => {
  const pkg = buildTaskPackage({ key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", url: "U", triage: null }, null, () => new Date(0));
  assert.equal(pkg.repo.cloneUrl, "git@github.com:o/r.git");
  assert.equal(pkg.gate.at, "1970-01-01T00:00:00.000Z");
});

test("postRefresh：上游已关闭候选回收 + ingestLog 落痕 + state 可回溯", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good"]);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  await h.postRefresh();
  assert.equal(store.getCandidate("o/good#issue#1").stage, "inbox");
  assert.equal(store.getRepoFacts("o/good").defaultBranch, "trunk");
  const h2 = makeHandlers({ store, provider: PROVIDER({ empty: true }), triage: noTriage });
  const r2 = await h2.postRefresh();
  assert.deepEqual(r2.sweep.closed, ["o/good#issue#1"]);
  assert.equal(store.getCandidate("o/good#issue#1").stage, "closed");
  assert.equal(store.getCandidate("o/good#issue#1").history.at(-1).event, "upstream-closed");
  const log = (await h2.getState()).ingestLog;
  assert.equal(log.length, 2);
  assert.deepEqual(log.at(-1).failedRepos, []);
  assert.equal(log.at(-1).closed, 1);
});

test("postTriage 失败：502 透传且候选留原阶段、history 记 triage.error", async () => {
  const store = openStore(); seed(store);
  const hf = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  const r = await hf.postTriage({ keys: ["o/r#issue#1"] });
  assert.equal(r.error, "triage-not-wired");
  assert.equal(r.status, 502);
  const c = store.getCandidate("o/r#issue#1");
  assert.equal(c.stage, "inbox");
  assert.equal(c.history.at(-1).event, "triage.error");
  assert.equal(c.history.at(-1).detail, "triage-not-wired");
});

test("postTriage 崩溃（runTriage 抛错）：同样 502 + triage.error 落痕，不裸 500", async () => {
  const store = openStore(); seed(store);
  const boom = { runTriage: async () => { throw new Error("agents.create exploded"); } };
  const r = await makeHandlers({ store, provider: PROVIDER(), triage: boom }).postTriage({ keys: ["o/r#issue#1"] });
  assert.equal(r.status, 502);
  assert.match(r.error, /triage-crashed: agents\.create exploded/);
  assert.equal(store.getCandidate("o/r#issue#1").history.at(-1).event, "triage.error");
});

const CATALOG = async () => [{ provider: "p1", name: "P1", models: [{ id: "m1", name: "M1" }] }];
const DEFAULT = () => ({ provider: "p0", model: "m0" });

test("getModels：目录 + 宿主默认", async () => {
  const h = makeHandlers({ store: openStore(), provider: PROVIDER(), triage: noTriage, listCatalog: CATALOG, hostDefault: DEFAULT });
  const r = await h.getModels();
  assert.equal(r.providers[0].models[0].id, "m1");
  assert.deepEqual(r.hostDefault, { provider: "p0", model: "m0" });
});

test("putSettings：triageModel 须在目录内；null 恢复跟随；可只改其中一项", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, listCatalog: CATALOG, hostDefault: DEFAULT });
  assert.deepEqual((await h.putSettings({ triageModel: { provider: "p1", model: "m1" } })).triageModel, { provider: "p1", model: "m1" });
  assert.equal(store.getSettings().intervalMinutes, 0);
  assert.equal((await h.putSettings({ triageModel: { provider: "p1", model: "nope" } })).error, "model-not-in-catalog");
  assert.equal((await h.putSettings({ triageModel: null })).triageModel, null);
  assert.equal((await h.putSettings({})).error, "invalid settings");
});

test("postTriage 把设置中的 triageModel 传给 runTriage", async () => {
  const store = openStore(); seed(store);
  store.setSettings({ triageModel: { provider: "p1", model: "m1" } });
  let seen = null;
  const triage = { runTriage: async (p) => { seen = p.model; return { updated: [], failed: null }; } };
  await makeHandlers({ store, provider: PROVIDER(), triage }).postTriage({ keys: ["o/r#issue#1"] });
  assert.deepEqual(seen, { provider: "p1", model: "m1" });
});

test("收活闸门：未连接时 refresh/watch/discover 一律 401 auth-required", async () => {
  const h = makeHandlers({ store: openStore(), provider: PROVIDER({ token: "tk", viewerLogin: "o" }), triage: noTriage });
  const gated = await Promise.all([h.postRefresh(), h.putWatch({ repos: ["o/r"] }), h.getDiscover()]);
  assert.deepEqual(gated.map((r) => r.error), ["auth-required", "auth-required", "auth-required"]);
  assert.equal(gated[0].status, 401);
});

test("postAuthBind：身份一致（大小写不敏感）才绑定；state 回显 auth；绑定后闸门放行", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "IasiV5" }), triage: noTriage });
  const r = await h.postAuthBind({ account: "iasiv5" });
  assert.equal(r.account, "iasiv5");
  assert.equal(r.login, "IasiV5");
  assert.ok(r.verifiedAt);
  assert.equal((await h.getState()).auth.account, "iasiv5");
  const st = await h.getAuth();
  assert.equal(st.account, "iasiv5");
  assert.equal(st.installed, true);
  assert.equal(st.tokenAvailable, true);
  assert.equal(st.install.phase, "idle");
  assert.equal(st.device.phase, "idle");
  await h.postRefresh();                        // 绑定后摄取不再 401
  assert.equal((await h.getDiscover()).repos[0].fullName, "o/good");
});

test("postAuthBind 免填账号：直接采用 token 身份（登录闸大按钮路径）", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "IasiV5" }), triage: noTriage });
  const r = await h.postAuthBind({});
  assert.equal(r.account, "IasiV5");
  assert.equal(r.login, "IasiV5");
  // 显式传错账号仍拦截（API 兼容）
  assert.match((await h.postAuthBind({ account: "someone-else" })).error, /^account-mismatch/);
});

test("postAuthDeviceStart：已有凭据 409；无凭据出 pending 并可回到 idle 形状", async () => {
  const mk = (mode) => makeHandlers({ store: openStore(), provider: PROVIDER(mode), triage: noTriage });
  assert.equal((await mk({ token: "tk", viewerLogin: "o" }).postAuthDeviceStart()).status, 409);
  const h = mk({});
  const r = await h.postAuthDeviceStart();
  assert.match(r.error, /^device-start-failed: /);
  assert.equal((await h.getAuthDevice()).phase, "idle");
});

test("postAuthInstallGh：后台安装经 getAuth 可见 installing→done", async () => {
  const store = openStore();
  let release;
  const provider = {
    ...PROVIDER({}),
    ghInstall: () => new Promise((res) => { release = () => res({ version: "2.99.0" }); }),
    ghAvailable: async () => false,
  };
  const h = makeHandlers({ store, provider, triage: noTriage, ghBin: "/tmp/gh", ghTmp: "/tmp/ghtmp" });
  assert.equal((await h.postAuthInstallGh()).started, true);
  assert.equal((await h.getAuth()).install.phase, "installing");
  release();
  await new Promise((r) => setTimeout(r, 0));
  const st = await h.getAuth();
  assert.equal(st.install.phase, "done");
  assert.equal(st.install.version, "2.99.0");
});

test("postAuthBind 错误映射：invalid account / gh-not-installed / gh-not-authorized / token-invalid / account-mismatch", async () => {
  const mk = (mode) => makeHandlers({ store: openStore(), provider: PROVIDER(mode), triage: noTriage });
  assert.equal((await mk({ token: "tk", viewerLogin: "o" }).postAuthBind({ account: "bad name" })).error, "invalid account");
  const noInstall = await mk({ gh: false }).postAuthBind({ account: "o" });
  assert.deepEqual([noInstall.error, noInstall.status], ["gh-not-installed", 409]);
  assert.equal((await mk({}).postAuthBind({ account: "o" })).error, "gh-not-authorized");
  const invalid = await mk({ token: "tk" }).postAuthBind({ account: "o" });
  assert.equal(invalid.status, 409);
  assert.match(invalid.error, /^token-invalid \(github api 401 for \/user\)$/);
  assert.equal((await mk({ token: "tk", viewerLogin: "someone-else" }).postAuthBind({ account: "o" })).error, "account-mismatch: someone-else");
});

test("postAuthLogout：只清绑定，watch/设置保留；refresh 重新 401", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good"]);
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "o" }), triage: noTriage });
  await h.postAuthBind({ account: "o" });
  assert.deepEqual(await h.postAuthLogout(), { ok: true });
  assert.equal((await h.postRefresh()).status, 401);
  assert.equal(store.getAuth().account, null);
  assert.deepEqual(store.getWatch().repos, ["o/good"]);
  assert.equal(store.getSettings().intervalMinutes, 0);
});

// ---- Task 9：run 四路由 + postGate 别名（engine 真 makeEngine + fake workspace/executor）----
const fakeRunWorkspace = () => ({ ensure: async () => ({ dir: "/ws", cloned: false }), dirOf: () => "/ws", sweep: async () => ({ removed: [] }) });
const fakeRunExecutor = () => {
  const inflight = new Map();
  const exe = { inflight,
    runAgentNode(args) { const { run, node } = args; const key = run.id + ":" + node.id; const entry = {}; inflight.set(key, entry);
      const promise = new Promise((resolve) => { entry.resolve = (r) => { inflight.delete(key); resolve(r); }; });
      return { promise, cancel: () => entry.resolve({ ok: false, error: "cancelled" }) }; },
    runScriptNode(args) { return exe.runAgentNode(args); } };
  return exe;
};
const drainRun = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("run 路由：start 链/409/gate/cancel/retry/engine 缺省 503", async () => {
  const store = openStore(); login(store); seed(store);
  store.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const executor = fakeRunExecutor();
  const engine = makeEngine({ store, workspace: makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-rt-")), execFile: async () => {} }),
    executor, concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "gate-requires-gating");
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postRunStart({ key: "o/r#issue#1" });
  assert.ok(r.runId); assert.equal(r.workspace, "cloning"); assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.ok(store.getCandidate("o/r#issue#1").taskPackage);   // 评审 R1-16：pkg 落库（引擎读它组装 prompt）
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "run-already-active");
  await drainRun();
  executor.inflight.get(r.runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drainRun();
  executor.inflight.get(r.runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drainRun();
  assert.equal(store.getRun(r.runId).nodeStates.g2.status, "waiting");
  assert.equal((await h.postRunGate({ runId: r.runId, nodeId: "g2", decision: "pass" })).ok, true);
  await drainRun();
  assert.equal((await h.postRunRetry({ runId: r.runId, nodeId: "deliver" })).error, "retry-requires-failed-or-cancelled");   // 评审 R2-2
  assert.equal((await h.postRunCancel({ runId: r.runId, reason: "test" })).ok, true);
  assert.equal(store.getCandidate("o/r#issue#1").stage, "gating");
  const noEngine = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noEngine.postRunStart({ key: "o/r#issue#1" })).error, "engine-not-wired");
});
test("postGate 别名：G1 pass 追加 runId 并创建 run", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass", note: "" });
  assert.ok(r.taskPackage); assert.ok(r.runId);
  assert.equal(store.getRun(r.runId).nodeStates.g1.status, "succeeded");
  assert.equal(store.getCandidate("o/r#issue#1").stage, "building");
});

test("release/confirm：G3 发版确认落痕；非 shipped/重复确认 409", async () => {
  const store = openStore(); login(store); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-requires-shipped");
  store.setStage("o/r#issue#1", "shipped", "v2");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1", note: "0.2.5" })).ok, true);
  const c = store.getCandidate("o/r#issue#1");
  assert.ok(c.release.confirmedAt);
  assert.equal(c.history.at(-1).event, "release.confirmed");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-already-confirmed");
});

test("角色三方法：upsert 往返/删除守卫/getRoles 合并列表", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const { LOOP_V1 } = await import("../src/workflows/builtin.mjs");
  const { BUILTIN_ROLES } = await import("../src/workflows/roles.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const fakeT = { id: "user-t", nodes: [{ id: "x", type: "agent", roleId: "busy" }], edges: [] };
  const templates = { [LOOP_V1.id]: LOOP_V1, "user-t": fakeT };
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine, templates });
  // upsert 往返
  assert.equal((await h.postRolesUpsert({ role: { id: "my-builder", name: "我的构建", prompt: "p", executionPolicy: "auto" } })).ok, true);
  assert.equal(store.getRole("my-builder").prompt, "p");
  // builtin 覆盖层放行删除（评审 R1-4/P9②）：模板引用内置本体，删覆盖层回落内置
  await h.postRolesUpsert({ role: { id: "loop-builder", name: "覆盖版", prompt: "覆盖 prompt", executionPolicy: "ask" } });
  assert.equal((await h.postRolesDelete({ id: "loop-builder" })).ok, true);
  assert.equal(store.getRole("loop-builder"), null);
  // 自定义角色被模板引用 → 409（评审 P2②/R1-2：引用守卫含位置详情）
  await h.postRolesUpsert({ role: { id: "busy", name: "被引用", prompt: "p", executionPolicy: "ask" } });
  assert.match((await h.postRolesDelete({ id: "busy" })).error, /role-in-use: busy/);
  // 存活 run 快照守卫（评审 R1-2 修正）：snapshot.nodes roleId 在活跃 run 中 → 409
  store.saveRun({ id: "r-snap", candidateKey: "o/r#issue#1", templateId: "user-t", templateRevision: "x",
    snapshot: { id: "user-t", nodes: [{ id: "x", type: "agent", roleId: "my-builder" }], edges: [] },
    nodeStates: { x: { status: "running", attempt: 1, reworkCount: 0, error: null, artifacts: [] } },
    status: "running", cancelReason: null, createdAt: "T", updatedAt: "T", history: [] });
  assert.match((await h.postRolesDelete({ id: "my-builder" })).error, /r-snap/);
  // delete 空闲成功
  assert.equal((await h.postRolesUpsert({ role: { id: "tmp", name: "临时", prompt: "x", executionPolicy: "ask" } })).ok, true);
  assert.equal((await h.postRolesDelete({ id: "tmp" })).ok, true);
  // getRoles 合并单列表 + overridden
  const roles = await h.getRoles();
  assert.ok(roles.roles.length >= 4);   // 4 builtin
  const lb = roles.roles.find((r) => r.id === "loop-builder");
  assert.equal(lb.overridden, false);
  assert.equal(lb.builtin, true);
});

test("feishu 路由：webhook 写入 credentials、测试发送走注入通知器；未装配 503", async () => {
  const store = openStore(); login(store);
  const saved = [];
  const credentials = { set: async (ref, v) => { saved.push([ref, v]); }, resolve: async (ref) => { const hit = saved.find(([r]) => r === ref); return hit ? { value: hit[1] } : undefined; } };
  const notifier = { sendNotice: async (t) => ({ sent: true, text: t }), testSend: async () => ({ sent: true }) };
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, credentials,
    feishu: { notifier, setWebhook: async (url) => { await credentials.set("DSH_L_FEISHU_WEBHOOK_URL", url); } } });
  assert.equal((await h.putFeishuWebhook({ url: "http://evil" })).error, "invalid webhook");
  assert.equal((await h.putFeishuWebhook({ url: "https://open.feishu.cn/open-apis/bot/v2/hook/" })).error, "invalid webhook");   // M5 T3：空 token
  assert.equal((await h.putFeishuWebhook({ url: "https://open.feishu.cn/open-apis/bot/v2/hook/   " })).error, "invalid webhook");   // M5 T3：空白 token（评审 R-10）
  assert.equal((await h.putFeishuWebhook({ url: "https://open.feishu.cn/open-apis/bot/v2/hook/abc" })).ok, true);
  assert.deepEqual(saved, [["DSH_L_FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/abc"]]);
  const r = await h.postFeishuTest();
  assert.equal(r.sent, true);
  const noFeishu = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noFeishu.postFeishuTest()).error, "feishu-not-wired");
});
