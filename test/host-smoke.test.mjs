import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
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
    for (const key of ["/dsh-l/roles", "/dsh-l/run/start", "/dsh-l/release/confirm", "/dsh-l/feishu/test", "/dsh-l/roles/delete"]) {
      assert.ok(rt.table[key], "路由表缺 " + key);
    }
    assert.ok(rt.table["/dsh-l/roles"].GET && rt.table["/dsh-l/roles"].POST, "/dsh-l/roles 需 GET+POST");
    assert.ok(rt.table["/dsh-l/roles/delete"].POST, "/dsh-l/roles/delete 需 POST");
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
