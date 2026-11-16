import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateTemplate, computeRevision } from "../src/workflows/validate.mjs";

const okT = { id: "t1", name: "T1", version: 1, builtin: false,
  nodes: [ { id: "g1", name: "G1", type: "gate", gateId: "G1", rejectTarget: null },
           { id: "a", name: "build", type: "agent", executionPolicy: "ask" },
           { id: "s", name: "verify", type: "script", scriptLanguage: "shell", script: "exit 0" } ],
  edges: [ { id: "e1", source: "g1", target: "a", kind: "success" },
           { id: "e2", source: "a", target: "s", kind: "success" } ] };

test("合法模板通过校验", () => assert.deepEqual(validateTemplate(okT), { ok: true, errors: [] }));
test("结构缺陷逐条报错", () => {
  const bad = { ...okT, nodes: [okT.nodes[0], { id: "gx", name: "gateX", type: "gate" }],   // gx 缺 gateId
    edges: [ { id: "e1", source: "g1", target: "a", kind: "success" },
             { id: "e9", source: "a", target: "ghost", kind: "rework" } ] };
  const r = validateTemplate(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("e1")));   // 边指向被删节点（target missing）
  assert.ok(r.errors.some((e) => e.includes("gate"))); // node gx: gate missing gateId（评审 R2 采纳：补缺 gateId 夹具）
  assert.ok(r.errors.some((e) => e.includes("e9")));   // source 与 target 双缺失
});
test("revision 稳定且内容敏感", () => {
  const a = computeRevision(okT);
  assert.equal(a, computeRevision({ ...okT, revision: "旧指纹也影响不到" }));
  assert.notEqual(a, computeRevision({ ...okT, name: "T2" }));
  assert.match(a, /^[0-9a-f]{40}$/);
  // 顶层键重排不换指纹（评审 R13 采纳：stable stringify）
  assert.equal(computeRevision({ edges: okT.edges, nodes: okT.nodes, builtin: false, version: 1, name: "T1", id: "t1" }), a);
});
