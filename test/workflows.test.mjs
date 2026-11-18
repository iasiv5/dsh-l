import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateTemplate, computeRevision } from "../src/workflows/validate.mjs";
import { LOOP_V1, DEVFLOW_LITE } from "../src/workflows/builtin.mjs";
import { loadTemplates } from "../src/workflows/loader.mjs";

const okT = { id: "t1", name: "T1", version: 1, builtin: false,
  nodes: [ { id: "g1", name: "G1", type: "gate", gateId: "G1", rejectTarget: null },
           { id: "a", name: "build", type: "agent", executionPolicy: "ask", roleId: "user-builder" },
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
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.id), ["g1", "build", "verify", "g2", "mr-open", "mr-push-check", "mr-open-check", "deliver"]);
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.type), ["gate", "agent", "script", "gate", "agent", "script", "script", "script"]);
  const byId = Object.fromEntries(LOOP_V1.nodes.map((n) => [n.id, n]));
  assert.equal(byId.g1.gateId, "G1");
  assert.equal(byId.build.executionPolicy, "auto");
  assert.equal(byId.build.roleId, "loop-builder");
  assert.equal(byId.verify.maxReworks, 3);
  assert.equal(byId.g2.gateId, "G2");
  assert.equal(byId.g2.rejectTarget, "build");
  // M6 三件套（评审 R2/R5/R6/D3）
  assert.equal(byId["mr-open"].roleId, "mr-opener");
  assert.equal(byId["mr-open"].executionPolicy, "auto");
  assert.equal(byId["mr-open"].maxAttempts, 2);
  assert.equal(byId["mr-open"].maxReworks, 2);   // R2：缺此首败即 run failed
  assert.equal(byId["mr-push-check"].maxReworks, 2);
  // M7 T3/§16-12：字节锁（评审 O2 升格——同 deliver 范式；两模板字节相同）
  assert.equal(byId["mr-push-check"].script, "[ -z \"$(git status --porcelain)\" ] || { echo \"存在未提交改动\"; exit 1; }; [ \"$(git rev-list --count HEAD --not --remotes)\" = \"0\" ] || { echo \"存在未推送提交\"; exit 1; }; branch=$(git branch --show-current); [ -n \"$branch\" ] || { echo \"分离 HEAD，不在工作分支\"; exit 1; }; def=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); [ \"${def:-main}\" != \"$branch\" ] || { echo \"当前在默认分支 $branch，不在本轮工作分支\"; exit 1; }");   // M7 T3/§16-12 字节锁（JSON 字面量=合法 JS 双引号形）
  assert.equal(byId["mr-open-check"].script, "url=$(gh pr view --json url -q .url 2>/dev/null) && state=$(gh pr view --json state -q .state) && [ \"$state\" = \"OPEN\" ] && head=$(gh pr view --json headRefOid -q .headRefOid) && [ \"$head\" = \"$(git rev-parse HEAD)\" ] && echo \"$url\"");   // M7 T3/§16-12 字节锁
  assert.ok(byId["mr-push-check"].script.includes("git branch --show-current"));   // R5 第三查
  assert.ok(byId["mr-push-check"].script.includes("--not --remotes"));
  assert.ok(byId["mr-open-check"].script.includes("headRefOid"));   // R6 head=tip
  assert.equal(byId["mr-open-check"].maxReworks, 2);
  // R4/R11：deliver script 值字节级锁（jq 双引号插值形）
  assert.equal(byId.deliver.script, 'gh pr view --json url,title,state --jq \'"\\(.url) \\(.title) [\\(.state)]"\'');
  assert.equal(LOOP_V1.deliverEvidence, "deliver");   // D4 落痕字段
  assert.deepEqual(LOOP_V1.edges.map((e) => [e.source, e.target, e.kind]),
    [["g1","build","success"],["build","verify","success"],["verify","build","rework"],["verify","g2","success"],
     ["g2","mr-open","success"],["mr-open","mr-push-check","success"],["mr-push-check","mr-open-check","success"],["mr-open-check","deliver","success"],
     ["mr-open","build","rework"],["mr-push-check","build","rework"],["mr-open-check","build","rework"]]);
  assert.equal(validateTemplate(LOOP_V1).ok, true);
  assert.match(LOOP_V1.revision, /^[0-9a-f]{40}$/);
});
test("devflow-lite golden：形状锁（评审 D2/D3 + M6 三件套）", () => {
  assert.equal(DEVFLOW_LITE.id, "devflow-lite");
  assert.equal(DEVFLOW_LITE.builtin, true);
  assert.deepEqual(DEVFLOW_LITE.nodes.map((n) => n.id), ["requirement", "design", "implement", "review", "test", "g2", "mr-open", "mr-push-check", "mr-open-check", "deliver"]);
  const byId = Object.fromEntries(DEVFLOW_LITE.nodes.map((n) => [n.id, n]));
  assert.equal(byId.requirement.gateId, "G1");
  assert.equal(byId.design.roleId, "devflow-architect");
  assert.equal(byId.implement.roleId, "devflow-developer");
  assert.equal(byId.implement.executionPolicy, "auto");
  assert.equal(byId.review.roleId, "devflow-code-reviewer");
  assert.equal(byId.review.maxReworks, 2);
  assert.equal(byId.g2.gateId, "G2");
  assert.equal(byId.g2.rejectTarget, "implement");
  assert.equal(byId["mr-open"].roleId, "mr-opener");
  assert.equal(byId["mr-open"].maxReworks, 2);
  assert.equal(byId["mr-push-check"].maxReworks, 2);
  assert.equal(byId["mr-open-check"].maxReworks, 2);
  assert.equal(byId.deliver.script, 'gh pr view --json url,title,state --jq \'"\\(.url) \\(.title) [\\(.state)]"\'');
  assert.equal(DEVFLOW_LITE.deliverEvidence, "deliver");
  assert.deepEqual(DEVFLOW_LITE.edges.filter((e) => e.kind === "rework").map((e) => [e.source, e.target]),
    [["review","implement"], ["mr-open","implement"], ["mr-push-check","implement"], ["mr-open-check","implement"]]);
  assert.equal(validateTemplate(DEVFLOW_LITE).ok, true);
  assert.match(DEVFLOW_LITE.revision, /^[0-9a-f]{40}$/);
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
test("loader 契约（M4 T2）：meta agent 节点带 roleId；loadTemplateDefs 全量含 script", async () => {
  const { loadTemplateDefs } = await import("../src/workflows/loader.mjs");
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-wf2-"));
  mkdirSync(join(dir, "workflows"));
  writeFileSync(join(dir, "workflows", "b.json"), JSON.stringify({ ...okT, id: "user-b", name: "UB" }));
  const { defs } = loadTemplateDefs({ dataDir: dir });   // M5 T2：返回形状 {defs, warnings}
  assert.deepEqual(defs.map((t) => t.id), ["loop-v1", "devflow-lite", "user-b"]);   // 评审 R1-8：builtin 二模板
  const agentNode = defs.find((t) => t.id === "loop-v1").nodes.find((n) => n.id === "build");
  assert.ok(agentNode.prompt || agentNode.prefix, "全量 def 保留 agent 节点正文");
  assert.ok("script" in defs.find((t) => t.id === "user-b").nodes[2]);
  const meta = loadTemplates({ dataDir: dir }).templates.find((t) => t.id === "user-b");
  assert.equal(meta.nodes[2].roleId, undefined);   // meta 层 script 节点无 roleId 字段
  const buildMeta = meta.nodes.find((n) => n.id === "a");
  assert.equal(buildMeta.roleId, "user-builder");   // 评审 P2①/P3 数据源：meta agent 节点带 roleId
  const loopMeta = loadTemplates({ dataDir: dir }).templates.find((t) => t.id === "loop-v1");
  const loopBuild = loopMeta.nodes.find((n) => n.id === "build");
  assert.equal(loopBuild.roleId, "loop-builder");   // builtin 同款投影
});
test("loadTemplateDefs warnings 对称（M5 T2）：三类失败模式 + 目录缺席静默", async () => {
  const { loadTemplateDefs } = await import("../src/workflows/loader.mjs");
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-wf3-"));
  mkdirSync(join(dir, "workflows"));
  writeFileSync(join(dir, "workflows", "bad.json"), "{ not json");                                    // ①坏 JSON
  writeFileSync(join(dir, "workflows", "invalid.json"), JSON.stringify({ id: "bad2", name: "B2", version: 1,
    nodes: [{ id: "gx", name: "Gx", type: "gate", gateId: "G2", rejectTarget: null }], edges: [] })); // ②校验失败（F2：非 G1 gate 带 rejectTarget=null）
  writeFileSync(join(dir, "workflows", "uniq.json"), JSON.stringify(okT));                           // 合法、id 唯一 → 入 defs
  writeFileSync(join(dir, "workflows", "dup.json"), JSON.stringify(okT));                            // 与 uniq 撞 id t1 → warning
  writeFileSync(join(dir, "workflows", "note.txt"), "ignore me");                                    // 非 .json 静默
  const { defs, warnings } = loadTemplateDefs({ dataDir: dir });
  assert.deepEqual(defs.map((t) => t.id), ["loop-v1", "devflow-lite", "t1"]);   // uniq 入 defs；bad/invalid/dup 不入
  assert.equal(warnings.length, 3);   // bad/invalid/dup 各一条（字母序处理）
  assert.match(warnings[0], /bad\.json/);
  assert.match(warnings[1], /invalid\.json/);
  assert.match(warnings[2], /uniq\.json.*duplicate/);   // 字母序：dup.json 先载入（t1），uniq.json 才撞 id
  // 目录缺席静默（不抛、零警告）
  const empty = loadTemplateDefs({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-wf4-")) });
  assert.deepEqual(empty.defs.map((t) => t.id), ["loop-v1", "devflow-lite"]);
  assert.deepEqual(empty.warnings, []);
});
test("F2：非 G1 gate 缺 rejectTarget 报错；G1 豁免", () => {
  const bad = { ...okT, nodes: [ ...okT.nodes, { id: "g2", name: "G2", type: "gate", gateId: "G2" } ],
    edges: [ ...okT.edges, { id: "e3", source: "s", target: "g2", kind: "success" } ] };
  const r = validateTemplate(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("rejectTarget")));
  assert.equal(validateTemplate(okT).ok, true);   // G1 rejectTarget:null 豁免
});
test("F3：success 边成环报 cycle detected", () => {
  const cyc = { ...okT, edges: [ ...okT.edges, { id: "e9", source: "s", target: "a", kind: "success" } ] };
  const r = validateTemplate(cyc);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("cycle")));
});
