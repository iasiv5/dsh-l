import test from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_ROLES, resolveRole } from "../src/workflows/roles.mjs";

test("内置 4 角色齐全且字段完整（M4 T2 golden）", () => {
  const ids = Object.keys(BUILTIN_ROLES);
  assert.deepEqual(ids.sort(), ["devflow-architect", "devflow-code-reviewer", "devflow-developer", "loop-builder"].sort());
  for (const r of Object.values(BUILTIN_ROLES)) {
    assert.ok(r.name && r.prompt && ["ask", "auto"].includes(r.executionPolicy));
    assert.equal(r.builtin, true);
  }
  // loop-builder prompt = builtin.mjs:17 prefix 原文迁移（评审 P12/D3）
  assert.equal(BUILTIN_ROLES["loop-builder"].prompt.includes("实现工程师"), true);
  // devflow 三角色 executionPolicy=ask（评审 D3：TEST 为 script 节点无角色落点）
  assert.equal(BUILTIN_ROLES["devflow-architect"].executionPolicy, "ask");
  assert.equal(BUILTIN_ROLES["devflow-developer"].executionPolicy, "ask");
  assert.equal(BUILTIN_ROLES["devflow-code-reviewer"].executionPolicy, "ask");
});

test("resolveRole：用户角色优先于内置（store.roles 优先）", () => {
  const user = { "loop-builder": { id: "loop-builder", name: "用户覆盖", prompt: "自定义", executionPolicy: "ask" } };
  assert.equal(resolveRole("loop-builder", user).name, "用户覆盖");
  assert.equal(resolveRole("devflow-architect", user).builtin, true);
  assert.equal(resolveRole("devflow-architect", user).name, "架构师");
  assert.equal(resolveRole("nope", user), null);
  assert.equal(resolveRole(undefined, user), null);
});
