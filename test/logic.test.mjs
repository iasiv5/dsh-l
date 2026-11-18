import test from "node:test";
import assert from "node:assert/strict";
import { groupCandidates, filterCandidates, pickTriageBatch, gateState, stageCounts, settingsPatch } from "../src/client/logic.mjs";
import { stripCells, runBlock, needsReview, kanbanColumns, badgeLabel, roleRows } from "../src/client/logic.mjs";
import { LOOP_V1, DEVFLOW_LITE } from "../src/workflows/builtin.mjs";

const t = (k) => k;
let seq = 0;
const c = (stage, over = {}) => ({ key: "k" + seq++, stage, type: "issue", repo: "o/r", triage: null, ...over });

test("六组归位：building+verifying 并入 building；held/closed/未知并入 closed", () => {
  const g = groupCandidates([c("inbox"), c("triaged"), c("gating"), c("building"), c("verifying"), c("shipped"), c("held"), c("closed"), c("weird")], t);
  const n = (id) => g.find((x) => x.id === id).items.length;
  assert.deepEqual(["inbox", "triaged", "gating", "building", "shipped", "closed"].map(n), [1, 1, 1, 2, 1, 3]);
  assert.deepEqual(g.filter((x) => x.dim).map((x) => x.id), ["building", "shipped", "closed"]);
});

test("过滤组合：类型 × 仓 × 紧急度", () => {
  const list = [c("triaged", { type: "pull", repo: "o/a", triage: { urgency: "P0" } }), c("triaged", { repo: "o/b", triage: { urgency: "P1" } }), c("inbox", { repo: "o/b" })];
  assert.equal(filterCandidates(list, { type: "pull" }).length, 1);
  assert.equal(filterCandidates(list, { repo: "o/b" }).length, 2);
  assert.equal(filterCandidates(list, { urgency: "P0" }).length, 1);
  assert.equal(filterCandidates(list).length, 3);
});

test("pickTriageBatch：只取 inbox，尊重仓库过滤，上限 10", () => {
  const list = Array.from({ length: 15 }, (_, i) => ({ key: "k" + i, stage: i < 12 ? "inbox" : "triaged", repo: i % 2 ? "o/a" : "o/b", type: "issue", triage: null }));
  assert.equal(pickTriageBatch(list, { repo: "all" }).length, 10);
  assert.ok(pickTriageBatch(list, { repo: "o/a" }).every((k) => Number(k.slice(1)) % 2 === 1));
});
test("gateState：仅 gating 可操作 G1；G2/G3 恒禁用", () => {
  assert.deepEqual(gateState({ stage: "gating" }), { G1: true, G2: false, G3: false });
  assert.deepEqual(gateState({ stage: "triaged" }), { G1: false, G2: false, G3: false });
});
test("stageCounts：七段计数", () => {
  const counts = stageCounts([{ stage: "inbox", triage: null }, { stage: "triaged", triage: {} }, { stage: "gating", triage: {} }, { stage: "building", triage: {} }]);
  assert.deepEqual(counts, { ingest: 4, backlog: 1, triage: 3, feedback: 1, build: 1, verify: 0, ship: 0 });
});

test("settingsPatch：下拉未变不提交 triageModel；改为跟随 → null；改选 → 对象", () => {
  const initial = { intervalMinutes: 5, triageModel: { provider: "p1", model: "gone" } };
  assert.deepEqual(settingsPatch(initial, { intervalMinutes: 10, modelValue: "p1\ngone" }), { intervalMinutes: 10 });
  assert.deepEqual(settingsPatch(initial, { intervalMinutes: 10, modelValue: "" }), { intervalMinutes: 10, triageModel: null });
  assert.deepEqual(settingsPatch(initial, { intervalMinutes: 10, modelValue: "p2\nm2" }), { intervalMinutes: 10, triageModel: { provider: "p2", model: "m2" } });
  assert.deepEqual(settingsPatch({ intervalMinutes: 0, triageModel: null }, { intervalMinutes: 0, modelValue: "" }), { intervalMinutes: 0 });
});

test("stripCells：前环计数 + 环内模板节点全灰", () => {
  const out = stripCells({ candidates: [{ stage: "inbox" }, { stage: "triaged" }], workflow: { templates: [LOOP_V1] } });
  assert.deepEqual(out.pre.map((c) => c.key), ["ingest", "backlog", "triage", "feedback"]);
  assert.equal(out.pre[0].count, 2);   // stageCounts.ingest = all.length（logic.mjs:38，评审 R5 采纳）
  assert.equal(out.pre[1].count, 1);   // backlog = stage==="inbox" 计数（logic.mjs:39）
  assert.equal(out.fallback, false);
  assert.deepEqual(out.loop.map((n) => n.id), ["g1", "build", "verify", "g2", "mr-open", "mr-push-check", "mr-open-check", "deliver"]);   // M6 三件套
  assert.ok(out.loop.every((n) => n.dim === true));   // M1 无执行器，环内恒灰
});
test("stripCells 多模板（M7 T7/§18.6 最小形）：按活跃 run templateId 匹配管线", () => {
  const meta = (tpl) => ({ id: tpl.id, nodes: tpl.nodes.map(({ id, name, type }) => ({ id, name, type })) });
  const workflow = { templates: [meta(LOOP_V1), meta(DEVFLOW_LITE)] };
  const runs = [{ id: "r1", templateId: "devflow-lite", status: "running", currentNodeIds: ["design"] }];
  const out = stripCells({ candidates: [], workflow, runs });
  assert.deepEqual(out.loop.map((n) => n.id), ["requirement", "design", "implement", "review", "test", "g2", "mr-open", "mr-push-check", "mr-open-check", "deliver"]);
  assert.equal(out.loop.find((n) => n.id === "design").count, 1);   // 在途计数随匹配模板
  // 无活跃 run → 回退 templates[0]
  const out0 = stripCells({ candidates: [], workflow, runs: [] });
  assert.deepEqual(out0.loop.map((n) => n.id), ["g1", "build", "verify", "g2", "mr-open", "mr-push-check", "mr-open-check", "deliver"]);
});
test("stripCells：无 workflow meta 回退旧 7 段", () => {
  const out = stripCells({ candidates: [], workflow: null });
  assert.equal(out.fallback, true);
  assert.deepEqual(out.loop, []);
});
test("stripCells：环内 chip 按 runs 在途计数着色（评审 R1-15/R2-2 数据源）", () => {
  const out = stripCells({ candidates: [], workflow: { templates: [LOOP_V1] },
    runs: [{ currentNodeIds: ["build"] }, { currentNodeIds: ["build", "verify"] }] });
  const byId = Object.fromEntries(out.loop.map((n) => [n.id, n]));
  assert.equal(byId.build.count, 2);
  assert.equal(byId.build.dim, false);
  assert.equal(byId.verify.count, 1);
  assert.equal(byId.g1.dim, true);
  assert.deepEqual(stripCells({ candidates: [], workflow: { templates: [LOOP_V1] } }).loop[0].dim, true);   // 无 runs 兼容（M1 用例同款）
});
test("runBlock：按 currentRunId 取 runs 摘要，未命中/无 run 返回 null", () => {
  const runs = [{ id: "r1", status: "running", waitingGate: null, currentNodeIds: ["build"], error: null }];
  assert.equal(runBlock({ currentRunId: "r1" }, runs).id, "r1");
  assert.equal(runBlock({ currentRunId: "nope" }, runs), null);
  assert.equal(runBlock({ currentRunId: null }, runs), null);
  assert.equal(runBlock({}, runs), null);
});
test("roleRows：搜索过滤 + builtin 标记 + uses 计数", () => {
  const roles = [
    { id: "loop-builder", name: "Loop 构建者", description: "构建执行", executionPolicy: "auto", builtin: true },
    { id: "devflow-architect", name: "架构师", description: "技术方案", executionPolicy: "ask", builtin: true },
    { id: "my-custom", name: "自定义", description: "", executionPolicy: "ask", builtin: false },
  ];
  const workflow = { templates: [
    { id: "loop-v1", nodes: [{ id: "g1", type: "gate" }, { id: "build", type: "agent", roleId: "loop-builder" }] },
    { id: "user-t", nodes: [{ id: "x", type: "agent", roleId: "my-custom" }, { id: "y", type: "agent", roleId: "my-custom" }] },
  ] };
  const rows = roleRows({ roles, workflow });
  assert.equal(rows.length, 3);
  const lb = rows.find((r) => r.id === "loop-builder");
  assert.equal(lb.uses, 1);   // loop-v1 build 节点引一次
  assert.equal(lb.builtin, true);
  const mc = rows.find((r) => r.id === "my-custom");
  assert.equal(mc.uses, 2);   // user-t 两个 agent 节点引两次
  assert.equal(mc.builtin, false);
  // 搜索过滤
  const filtered = roleRows({ roles, workflow, query: "架构" });
  assert.deepEqual(filtered.map((r) => r.id), ["devflow-architect"]);
});

// ---- Task 2：待我确认聚合 + 看板列（评审 D5/D6）----
test("needsReview：gate 等待 + G3 待发版聚合（failed 入分区不入角标）", () => {
  const candidates = [
    { key: "k1", stage: "shipped", currentRunId: null, release: null },
    { key: "k2", stage: "shipped", currentRunId: null, release: { confirmedAt: "T" } },
    { key: "k3", stage: "building", currentRunId: null, release: null },
    { key: "k4", stage: "gating", currentRunId: "r4", release: null,
      history: [{ at: "T", event: "upstream-gone", detail: "" }] },   // 评审 R5-b：flagged 候选不计入角标
  ];
  const runs = [
    { id: "r1", status: "waiting", waitingGate: "g2", currentNodeIds: ["g2"], error: null },
    { id: "r2", status: "running", waitingGate: null, currentNodeIds: ["build"], error: null },
    { id: "r3", status: "failed", waitingGate: null, currentNodeIds: [], failedNodeIds: ["deliver"], error: "push rejected" },
    { id: "r4", status: "waiting", waitingGate: "g2", candidateKey: "k4", currentNodeIds: ["g2"], error: null },
  ];
  const out = needsReview({ candidates, runs });
  assert.deepEqual(out.gateRuns.map((r) => r.id), ["r1"]);       // r4（flagged 候选）被排除
  assert.deepEqual(out.failedRuns.map((r) => r.id), ["r3"]);     // 评审 P1：第三分区数据源
  assert.deepEqual(out.releaseList.map((c) => c.key), ["k1"]);   // k2 已确认发版、k3 非 shipped
  assert.equal(out.count, 2);                                    // D5 口径：failed 不计入角标
});
test("kanbanColumns：6 列同构 + 进行中列禁迁移", () => {
  const out = kanbanColumns({ candidates: [c("inbox"), c("building"), c("verifying"), c("shipped"), c("held")] });
  assert.deepEqual(out.columns.map((col) => col.id), ["inbox", "triaged", "gating", "building", "shipped", "closed"]);
  const byId = Object.fromEntries(out.columns.map((col) => [col.id, col]));
  assert.deepEqual(byId.building.cards.map((x) => x.stage), ["building", "verifying"]);
  assert.deepEqual(byId.closed.cards.map((x) => x.stage), ["held"]);
  assert.equal(byId.inbox.cards[0].movable, true);
  assert.equal(byId.building.cards[0].movable, false);
});
test("badgeLabel：计数前缀格式（i18n 模板注入，logic 层零 i18n 依赖）", () => {
  assert.equal(badgeLabel({ count: 2, label: "DSH Loop Forge", template: "待确认 ({n})" }), "待确认 (2) · DSH Loop Forge");
  assert.equal(badgeLabel({ count: 0, label: "DSH Loop Forge", template: "待确认 ({n})" }), "DSH Loop Forge");
});
