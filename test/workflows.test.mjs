import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateTemplate, computeRevision } from "../src/workflows/validate.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";
import { loadTemplates } from "../src/workflows/loader.mjs";

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

test("loop-v1 golden：形状锁", () => {
  assert.equal(LOOP_V1.id, "loop-v1");
  assert.equal(LOOP_V1.builtin, true);
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.id), ["g1", "build", "verify", "g2", "deliver"]);
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.type), ["gate", "agent", "script", "gate", "script"]);
  const byId = Object.fromEntries(LOOP_V1.nodes.map((n) => [n.id, n]));
  assert.equal(byId.g1.gateId, "G1");
  assert.equal(byId.build.executionPolicy, "auto");
  assert.equal(byId.verify.maxReworks, 3);
  assert.equal(byId.g2.gateId, "G2");
  assert.equal(byId.g2.rejectTarget, "build");
  assert.deepEqual(LOOP_V1.edges.map((e) => [e.source, e.target, e.kind]),
    [["g1","build","success"],["build","verify","success"],["verify","build","rework"],["verify","g2","success"],["g2","deliver","success"]]);
  assert.equal(validateTemplate(LOOP_V1).ok, true);
  assert.match(LOOP_V1.revision, /^[0-9a-f]{40}$/);
});

test("loadTemplates：内置在前、坏文件/撞 id 跳过并警告、非 json 忽略、meta 不含 script", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-wf-"));
  mkdirSync(join(dir, "workflows"));
  writeFileSync(join(dir, "workflows", "b.json"), JSON.stringify({ ...okT, id: "user-b", name: "UB" }));
  // 真·非法夹具（评审 R3 采纳·方案①）：edges 指向不存在节点；空 nodes 不算非法——校验器不新增
  // 「nodes 非空」规则，design-v2 §3 口径不变。
  writeFileSync(join(dir, "workflows", "bad.json"),
    '{"id":"bad","nodes":[{"id":"n1","name":"N","type":"agent"}],"edges":[{"id":"e1","source":"n1","target":"ghost","kind":"success"}]}');
  writeFileSync(join(dir, "workflows", "c.json"), JSON.stringify({ ...okT, id: "loop-v1", name: "撞内置" }));   // 评审 R12
  writeFileSync(join(dir, "workflows", "notes.txt"), "not a template");                                        // 评审 R12：非 json 忽略
  const out = loadTemplates({ dataDir: dir });
  assert.deepEqual(out.templates.map((t) => t.id), ["loop-v1", "user-b"]);
  assert.equal(out.warnings.length, 2);
  assert.ok(out.warnings.some((w) => w.includes("bad.json")));
  assert.ok(out.warnings.some((w) => w.includes("c.json")));
  const meta = out.templates[1];
  assert.ok(!("script" in meta.nodes[2]));
  assert.deepEqual(meta.nodes.map((n) => n.id), ["g1", "a", "s"]);
});
test("无 workflows 目录：仅内置、零警告", () => {
  const out = loadTemplates({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-wf0-")) });
  assert.deepEqual(out.templates.map((t) => t.id), ["loop-v1"]);
  assert.deepEqual(out.warnings, []);
});
