import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildRuntime } from "../src/host.mjs";

// host 装配冒烟（M5 T7，评审 R1-1 根因防线）：buildRuntime 直驱（host.mjs:65 导出面，返回 {dir, store, handlers, table, workspace, engine}），
// 最小 ctx stub（inject 八项缺席面走既有 UNWIRED/缺省）。绿基线任务——红证=一次性变异（断开 templates/listRoles 注入→红→还原，评审 R-8）。
// DSH_L_DATA 隔离（评审 R-7）：paths.dataDir() 依赖该 env；setup 设 tmp、teardown 还原。
// 异步 ensure 在 tmp+ghBin ENOENT 下确定性失败→引擎 catch 收敛 run failed（不真实出网/clone——预期路径，只断同步面，评审执行细节）。

const setupEnv = () => {
  const prev = process.env.DSH_L_DATA;
  process.env.DSH_L_DATA = mkdtempSync(join(tmpdir(), "dsh-l-smoke-"));
  return () => { if (prev === undefined) delete process.env.DSH_L_DATA; else process.env.DSH_L_DATA = prev; };
};

const stubCtx = () => ({
  credentials: { set: async () => {}, resolve: async () => null },
  workingDirectory: { set: async () => {} },
  approval: { setPolicy: async () => {} },
  agents: { create: async () => { throw new Error("not used in smoke"); } },
  llm: {}, timer: {}, webServer: {}, agentDefaultModel: null,
});

const seed = (store) => {
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "", updatedAt: "", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  store.setStage("o/r#issue#1", "gating", "");
};

test("host 冒烟①：buildRuntime 不抛 + 路由表关键键在位（M4/M2 注入面回归锚）", () => {
  const restore = setupEnv();
  try {
    const rt = buildRuntime(stubCtx(), {});
    for (const key of ["/dsh-l/roles", "/dsh-l/run/start", "/dsh-l/release/confirm", "/dsh-l/feishu/test", "/dsh-l/roles/delete", "/dsh-l/models", "/dsh-l/triage", "/dsh-l/settings", "/dsh-l/watch", "/dsh-l/credential", "/dsh-l/credential/verify"]) {   // M7 §16-4：断言扩集（Task 7 增凭据端点）
      assert.ok(rt.table[key], "路由表缺 " + key);
    }
    assert.ok(rt.table["/dsh-l/roles"].GET && rt.table["/dsh-l/roles"].POST, "/dsh-l/roles 需 GET+POST");
    assert.ok(rt.table["/dsh-l/roles/delete"].POST, "/dsh-l/roles/delete 需 POST");
    assert.ok(rt.table["/dsh-l/credential"].PUT && rt.table["/dsh-l/credential"].DELETE, "/dsh-l/credential 需 PUT+DELETE");
    assert.ok(rt.table["/dsh-l/credential/verify"].POST, "/dsh-l/credential/verify 需 POST");
  } finally { restore(); }
});
test("host 冒烟②：模板解析探针（devflow-lite 可建跑；nope 同步 throw 404——R1-1 注入面锚）", () => {
  const restore = setupEnv();
  try {
    const rt = buildRuntime(stubCtx(), {});
    seed(rt.store);
    assert.throws(() => rt.engine.startRun("o/r#issue#1", { templateId: "nope" }), /unknown-template/);
    const { runId } = rt.engine.startRun("o/r#issue#1", { templateId: "devflow-lite" });   // 同步面：返回 {runId}
    assert.equal(rt.store.getRun(runId).templateId, "devflow-lite");
    assert.ok(rt.store.getRun(runId).snapshot.nodes.some((n) => n.id === "requirement"));
  } finally { restore(); }
});
test("host 冒烟③：角色解析源探针（store.upsertRole→store.listRoles 往返；引擎 role 注入源在位）", () => {
  const restore = setupEnv();
  try {
    const rt = buildRuntime(stubCtx(), {});
    rt.store.upsertRole({ id: "smoke-role", name: "冒烟角色", prompt: "p", executionPolicy: "ask" });
    assert.equal(rt.store.listRoles().find((r) => r.id === "smoke-role").name, "冒烟角色");
  } finally { restore(); }
});

// M7 T1：捕获型 stub（prompt 走 handle.agent.send 通道——评审问题2 实文修正）
const stubCtxCapture = () => {
  const captured = { create: [], send: [] };
  const ctx = {
    credentials: { set: async () => {}, resolve: async () => null },
    workingDirectory: { set: async () => {} },
    approval: { setPolicy: async () => {} },
    on: () => () => {},
    agentDefaultModel: null,
    agents: { create: async (sessionId, opts) => {
      captured.create.push({ sessionId, opts });
      return { agent: { send: (msg) => captured.send.push({ sessionId, msg }) } };
    } },
    llm: {}, timer: {}, webServer: {},
  };
  return { ctx, captured };
};
const FAKE_GH = `#!/usr/bin/env bash
# 评审问题4 豁免口径：tmp 内自建假 gh（clone=本地 git init+seed；其余输出 JSON），无网络无远端
if [ "$1" = "repo" ] && [ "$2" = "clone" ]; then
  mkdir -p "$4" && cd "$4" || exit 1
  git init -q
  git -c user.email=a@b -c user.name=t commit --allow-empty -q -m seed
  exit 0
fi
echo '{"url":"https://x/pr/1","title":"T","state":"OPEN","headRefOid":"x"}'
exit 0`;
const waitFor = async (fn, timeout = 5000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > timeout) throw new Error("waitFor timeout"); await new Promise((r) => setTimeout(r, 10)); } };

test("host 冒烟⑤：auth 路由形状锁（Task 7）——gates/credential 键在位 + credential.configured 经 store 生效", async () => {
  const restore = setupEnv();
  try {
    const rt = buildRuntime(stubCtx(), {});
    rt.store.setCredential({ token: "tk", source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: "T0", healthy: true });
    const st = await rt.table["/dsh-l/auth"].GET();   // 真实 github provider 注入（gh 探测为本地 spawn，无出网）
    assert.deepEqual(["ghInstalled" in st.gates, "ghLogin" in st.gates, "credentialOk" in st.gates], [true, true, true]);
    assert.equal(st.credential.configured, true);
    assert.equal(st.credential.source, "device-flow");
    assert.ok(typeof rt.table["/dsh-l/credential"].DELETE === "function");
  } finally { restore(); }
});
test("host 冒烟③升格（M7 T1/评审 R-问题2/3）：rolePrompt 端到端锚——listRoles 闭包 → resolveRole → world.send", async () => {
  const restore = setupEnv();
  try {
    const { ctx, captured } = stubCtxCapture();
    const rt = buildRuntime(ctx, {});
    // 假 gh 脚本（spawn 豁免口径见计划 T1）
    const binDir = join(rt.dir, "bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, "gh"), FAKE_GH);
    chmodSync(join(binDir, "gh"), 0o755);
    seed(rt.store);
    rt.store.upsertRole({ id: "devflow-architect", name: "覆盖架构师", prompt: "USER-OVERRIDE-MARKER-7f3 覆盖提示词", executionPolicy: "ask" });
    const t0 = Date.now(); const log = (m) => console.log("T1", Math.round((Date.now() - t0) / 100) / 10 + "s", m);
    const { runId } = rt.engine.startRun("o/r#issue#1", { templateId: "devflow-lite" });
    log("started");
    // 三层轮候（评审问题3 探针节拍）：①waiting（ensure 收敛）②G1 pass ③send 被调
    await waitFor(() => rt.store.getRun(runId).status === "waiting");
    log("waiting reached, hist=" + JSON.stringify(rt.store.getRun(runId).history.map(h => h.event)));
    rt.engine.applyGateDecision(runId, "requirement", "pass");
    log("g1 passed");
    await waitFor(() => captured.send.length > 0);
    log("send captured");
    const texts = captured.send.map((s) => s.msg.content?.[0]?.text ?? "");
    assert.ok(texts.some((x) => x.includes("USER-OVERRIDE-MARKER-7f3")), "覆盖角色 prompt 未达 world.send——listRoles 注入断链");
    // agentOptions 空形态（评审建议5 零成本侧）
    // ctx.agents.create 收单对象 {sessionId, meta, agentOptions, setup}（host.mjs:51）——agentOptions 在 sessionId 字段内
    const ao = captured.create[0].sessionId.agentOptions;
    assert.equal(ao.provider, "");
    assert.equal(ao.model, "");   // 空形态（评审建议5；reasoningEffort:undefined 键不入断言——deepStrictEqual 键集敏感）
    // 收尾：cancelRun 清 runAgentNode 的 30min 超时 timer（fake world 永不 turn/end——否则事件循环被挂起 timer 拖住，文件级 ~60s 强制中断）
    rt.engine.cancelRun(runId, "smoke-end");
    await new Promise((r) => setTimeout(r, 20));
  } finally { restore(); }
});
