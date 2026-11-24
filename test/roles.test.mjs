import test from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_ROLES, resolveRole } from "../src/workflows/roles.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";

test("内置 5 角色齐全且字段完整（M4 T2 + M6 T1 golden）", () => {
  const ids = Object.keys(BUILTIN_ROLES);
  assert.deepEqual(ids.sort(), ["devflow-architect", "devflow-code-reviewer", "devflow-developer", "loop-builder", "mr-opener"].sort());
  for (const r of Object.values(BUILTIN_ROLES)) {
    assert.ok(r.name && r.prompt && ["ask", "auto"].includes(r.executionPolicy));
    assert.equal(r.builtin, true);
  }
  // loop-builder prompt = builtin.mjs build.prefix **逐字锁**（评审 P12/M5 T5：任一侧漂移即红）
  assert.equal(BUILTIN_ROLES["loop-builder"].prompt, LOOP_V1.nodes.find((n) => n.id === "build").prefix);
  // devflow 三角色 executionPolicy=ask（评审 D3：TEST 为 script 节点无角色落点）
  assert.equal(BUILTIN_ROLES["devflow-architect"].executionPolicy, "ask");
  assert.equal(BUILTIN_ROLES["devflow-developer"].executionPolicy, "ask");
  assert.equal(BUILTIN_ROLES["devflow-code-reviewer"].executionPolicy, "ask");
  // M6 T1/Q2-A：commit 约束入 prompt（commit 是工程责任归角色）
  assert.ok(BUILTIN_ROLES["loop-builder"].prompt.includes("commit 到当前分支"));
  assert.ok(BUILTIN_ROLES["devflow-developer"].prompt.includes("commit 到当前分支"));
});

test("mr-opener 角色 golden（M6 T1/D3）：幂等 MR/禁合并禁主分支/失败明报", () => {
  const r = BUILTIN_ROLES["mr-opener"];
  assert.equal(r.executionPolicy, "auto");
  assert.ok(r.prompt.includes("gh pr"));
  assert.ok(r.prompt.includes("不得合并"));
  assert.ok(r.prompt.includes("主分支"));
  assert.equal(r.prompt.includes("mr-body.md"), false, "mr-body.md 要求已取消（design-v2 §20 第 35 条）");
  assert.ok(r.prompt.includes("复用"));
  assert.ok(r.prompt.includes("在最终回复里写明"), "汇报要求改为写在最终回复，不再写文件");
});

test("resolveRole：用户角色优先于内置（store.roles 优先）", () => {
  const user = { "loop-builder": { id: "loop-builder", name: "用户覆盖", prompt: "自定义", executionPolicy: "ask" } };
  assert.equal(resolveRole("loop-builder", user).name, "用户覆盖");
  assert.equal(resolveRole("devflow-architect", user).builtin, true);
  assert.equal(resolveRole("devflow-architect", user).name, "架构师");
  assert.equal(resolveRole("nope", user), null);
  assert.equal(resolveRole(undefined, user), null);
});
