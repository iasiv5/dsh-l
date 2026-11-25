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
  // M8 T1/评审问题2（清账 §16-3 同源）：engineConcurrency 透传——白名单现状丢键 PUT 永不携带
  assert.deepEqual(settingsPatch({ intervalMinutes: 5, engineConcurrency: 2, triageModel: null }, { intervalMinutes: 5, modelValue: "", engineConcurrency: 3 }), { intervalMinutes: 5, engineConcurrency: 3 });   // initial triageModel=null：modelValue "" 属未变（提前 return，无 triageModel 键）
  assert.deepEqual(settingsPatch({ intervalMinutes: 5, engineConcurrency: 2, triageModel: null }, { intervalMinutes: 5, modelValue: "", engineConcurrency: 2 }), { intervalMinutes: 5 });   // 全未变 → 空补丁（提前 return 路径无 triageModel 键）
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

// ---- 开工可见性（design-v2 §20 第 19、28 条）：可开工阶段 = gating 或 triaged；引导文案随「待拍板」退场一并删除 ----
// 新导出用动态导入引入（实施计划 Task 6 硬规则）：红态下符号为 undefined，红落在调用行。
test("startable：gating 与 triaged 为真，其余为假", async () => {
  const { startable } = await import("../src/client/logic.mjs");
  assert.equal(startable({ stage: "gating" }), true);
  assert.equal(startable({ stage: "triaged" }), true);
  for (const st of ["inbox", "building", "verifying", "shipped", "held", "closed"]) assert.equal(startable({ stage: st }), false, st);
  assert.equal(startable(null), false);
});

// ---- P0 UI/UX 升级纯函数（docs/plans/2026-11-22-p0-uiux-upgrade-implementation-plan.md Task 3）----
test("candidateState 六态真值表（seen 布尔；P0-2 契约 §7）", async () => {
  const { candidateState } = await import("../src/client/logic.mjs");
  const cs = (o) => candidateState({ candidate: o, run: o.run ?? null, seen: o.seen ?? false });
  assert.equal(cs({ stage: "gating", run: { status: "failed" } }), "failed", "优先级 1 压过 gating");
  assert.equal(cs({ stage: "inbox", run: { status: "waiting" } }), "gating");
  assert.equal(cs({ stage: "triaged" }), "idle");
  assert.equal(cs({ stage: "gating" }), "gating");
  assert.equal(cs({ stage: "shipped" }), "gating", "shipped 未确认发版 = 待你处理");
  assert.equal(cs({ stage: "building", run: { status: "succeeded" }, seen: false }), "unread");
  assert.equal(cs({ stage: "shipped", release: { confirmedAt: "x" }, run: { status: "succeeded" }, seen: true }), "done");
  assert.equal(cs({ stage: "shipped", release: { confirmedAt: "x" } }), "done");
  assert.equal(cs({ stage: "building", run: { status: "running" } }), "running");
  assert.equal(cs({ stage: "verifying" }), "running");
  assert.equal(cs({ stage: "closed" }), "idle");
});

test("sessionState 五态 + 孤儿行（item=null 仅认 summary.running；P0-2）", async () => {
  const { sessionState } = await import("../src/client/logic.mjs");
  assert.equal(sessionState({ kind: "work", candidate: { stage: "building" } }, { running: true }), "running");
  assert.equal(sessionState({ kind: "work", candidate: { stage: "building" } }, { running: false }), "running");
  assert.equal(sessionState({ kind: "work", candidate: { stage: "gating" } }, { running: false }), "gating");
  assert.equal(sessionState({ kind: "work", candidate: { stage: "shipped" } }, { running: false }), "done");
  assert.equal(sessionState({ kind: "work", candidate: { stage: "triaged" } }, { running: false }), "idle");
  assert.equal(sessionState({ kind: "run", candidate: { stage: "gating" } }, { running: false }), "gating", "run 行停在闸门同为待你处理（实施期泛化，rev-impl S2）");
  assert.equal(sessionState(null, { running: true }), "running", "孤儿行 running");
  assert.equal(sessionState(null, { running: false }), "idle", "孤儿行非 running 即 idle");
  assert.equal(sessionState(null, null), "idle");
});

test("advanceStageOf：正向推进链两跳，之后为 null（P0-1）", async () => {
  const { advanceStageOf } = await import("../src/client/logic.mjs");
  assert.equal(advanceStageOf("inbox"), "triaged");
  assert.equal(advanceStageOf("triaged"), "gating");
  assert.equal(advanceStageOf("gating"), null);
  assert.equal(advanceStageOf("shipped"), null);
  assert.equal(advanceStageOf("held"), null);
  assert.equal(advanceStageOf(undefined), null);
});

test("formatAge：ageDays → 显示段（P0-6）", async () => {
  const { formatAge } = await import("../src/client/logic.mjs");
  assert.equal(formatAge(0.5), "<1d");
  assert.equal(formatAge(3), "3d");
  assert.equal(formatAge(3.6), "4d");
  assert.equal(formatAge(null), "");
  assert.equal(formatAge(undefined), "");
});

test("gateWaitInfo：waitingGate 前后节点按模板序推导；gateId 取 waitingGateId（P0-3）", async () => {
  const { gateWaitInfo } = await import("../src/client/logic.mjs");
  const tpl = { nodes: LOOP_V1.nodes.map(({ id, name, type }) => ({ id, name, type })) };   // 模拟 metaOf 投影
  const run = { waitingGate: "g2", waitingGateId: "G2", failedNodeIds: [], cancelledNodeIds: [] };
  const info = gateWaitInfo({ run, template: tpl });
  assert.equal(info.gateId, "G2");
  assert.deepEqual(info.upstreamNames, ["build", "verify"]);
  assert.ok(info.nextNames.includes("发起 MR"), "后续节点含发起 MR");
  const g1 = gateWaitInfo({ run: { waitingGate: "g1", waitingGateId: "G1", failedNodeIds: [], cancelledNodeIds: [] }, template: tpl });
  assert.deepEqual(g1.upstreamNames, []);
  const failed = gateWaitInfo({ run: { waitingGate: "g2", waitingGateId: "G2", failedNodeIds: ["build"], cancelledNodeIds: [] }, template: tpl });
  assert.deepEqual(failed.upstreamNames, ["verify"], "failed 节点不计入已完成上游");
  assert.deepEqual(gateWaitInfo({ run: { waitingGate: "g2", waitingGateId: "G2" }, template: null }).upstreamNames, []);
  assert.deepEqual(gateWaitInfo({ run: { waitingGate: "ghost", waitingGateId: null }, template: tpl }).nextNames, []);
});

test("prettyKey：owner/repo#type#number → owner/repo#number；畸形键原样（P0-3）", async () => {
  const { prettyKey } = await import("../src/client/logic.mjs");
  assert.equal(prettyKey("iasiv5/dsh-m#pull#12"), "iasiv5/dsh-m#12");
  assert.equal(prettyKey("iasiv5/dsh-m#issue#3"), "iasiv5/dsh-m#3");
  assert.equal(prettyKey("weird"), "weird");
  assert.equal(prettyKey(null), null);
});

// ---- P1 小债 D：时长档位与闸门等待排序 ----
test("formatDuration 档位（P1 小债 D）", async () => {
  const { formatDuration } = await import("../src/client/logic.mjs");
  assert.equal(formatDuration(undefined), "");
  assert.equal(formatDuration("x"), "");
  assert.equal(formatDuration(30_000), "1m");
  assert.equal(formatDuration(45 * 60_000), "45m");
  assert.equal(formatDuration(3 * 3_600_000), "3h");
  assert.equal(formatDuration(27 * 86_400_000), "27d");
});

test("sortGateRunsByWait：waitingSince 升序（最久优先），缺省沉底稳定（P1 小债 D）", async () => {
  const { sortGateRunsByWait } = await import("../src/client/logic.mjs");
  const runs = [{ id: "a", waitingSince: "2026-01-02T00:00:00Z" }, { id: "b" }, { id: "c", waitingSince: "2026-01-01T00:00:00Z" }];
  assert.deepEqual(sortGateRunsByWait(runs).map((r) => r.id), ["c", "a", "b"]);
  assert.deepEqual(sortGateRunsByWait(null), []);
});

// ---- P1-3/P1-6：stage 过滤维度与 facet 计数 ----
test("filterCandidates stage 维度：bucketOf 归桶，缺省全量（P1-3）", async () => {
  const { filterCandidates } = await import("../src/client/logic.mjs");
  const list = [c("inbox"), c("triaged"), c("building"), c("verifying"), c("held"), c("shipped")];
  assert.equal(filterCandidates(list, { stage: "building" }).length, 2, "building 归并 verifying");
  assert.equal(filterCandidates(list, { stage: "closed" }).length, 1, "held 归 closed");
  assert.equal(filterCandidates(list, { stage: "inbox" }).length, 1);
  assert.equal(filterCandidates(list, {}).length, list.length, "缺省全量");
  assert.equal(filterCandidates(list, { stage: "all" }).length, list.length);
});

test("facetCounts 计数口径：stage 按桶、其余原值、仅计出现键（P1-3）", async () => {
  const { facetCounts } = await import("../src/client/logic.mjs");
  const list = [c("inbox"), c("inbox"), c("building"), c("held"), { ...c("triaged"), type: "pull", triage: { urgency: "P1" } }];
  const fc = facetCounts(list);
  assert.deepEqual(fc.type, { issue: 4, pull: 1 });
  assert.deepEqual(fc.urgency, { P1: 1 });
  assert.deepEqual(fc.stage, { inbox: 2, triaged: 1, building: 1, closed: 1 });
  assert.deepEqual(fc.repo, { "o/r": 5 });
});

// ---- P1-3 后半：pinned filters 本地持久化 ----
test("loadPins/savePins/makePinId：注入 storage、坏 JSON 与缺失回退（P1-3）", async () => {
  const { loadPins, savePins, makePinId } = await import("../src/client/logic.mjs");
  const mkStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  const st = mkStorage();
  assert.deepEqual(loadPins(st), [], "空存储 → []");
  const pin = { id: makePinId(), label: "P0", filters: { type: "all", repo: "all", urgency: "P0", stage: "all" } };
  assert.ok(/^pin-\d+-/.test(pin.id), "id 形态");
  savePins(st, [pin]);
  assert.deepEqual(loadPins(st), [pin], "round-trip");
  st.setItem("dsh-l.pinnedFilters.v1", "{broken");
  assert.deepEqual(loadPins(st), [], "坏 JSON → []");
  st.setItem("dsh-l.pinnedFilters.v1", JSON.stringify({ not: "array" }));
  assert.deepEqual(loadPins(st), [], "非数组 → []");
});

// ---- P1-4：相对时间档位 ----
test("formatRelative 档位（P1-4）", async () => {
  const { formatRelative } = await import("../src/client/logic.mjs");
  const now = 1_000_000_000;
  assert.equal(formatRelative(undefined, now), "");
  assert.equal(formatRelative(now - 30_000, now), "1m");
  assert.equal(formatRelative(now - 45 * 60_000, now), "45m");
  assert.equal(formatRelative(now - 3 * 3_600_000, now), "3h");
  assert.equal(formatRelative(now - 27 * 86_400_000, now), "27d");
  assert.equal(formatRelative(now + 5_000, now), "1m", "未来时间钳为 0");
});

// ---- P2 Task 1：sortGateRunsByWait NaN 守卫 ----
test("sortGateRunsByWait：畸形 waitingSince 不崩且沉底（P2 Task 1）", async () => {
  const { sortGateRunsByWait } = await import("../src/client/logic.mjs");
  const runs = [{ id: "a", waitingSince: "not-a-date" }, { id: "b", waitingSince: "2026-01-01T00:00:00Z" }, { id: "c" }];
  assert.deepEqual(sortGateRunsByWait(runs).map((r) => r.id), ["b", "a", "c"]);
});

// ---- P2 Task 5：gateWaitInfo nextNodes 投影 ----
test("gateWaitInfo nextNodes：name+type 投影，nextNames 兼容保留（P2 Task 5）", async () => {
  const { gateWaitInfo } = await import("../src/client/logic.mjs");
  const tpl = { nodes: LOOP_V1.nodes.map(({ id, name, type }) => ({ id, name, type })) };
  const info = gateWaitInfo({ run: { waitingGate: "g2", waitingGateId: "G2", failedNodeIds: [], cancelledNodeIds: [] }, template: tpl });
  assert.deepEqual(info.nextNodes, [
    { name: "发起 MR", type: "agent" },
    { name: "推送检查", type: "script" },
    { name: "MR 检查", type: "script" },
    { name: "交付汇总", type: "script" },
  ]);
  assert.deepEqual(info.nextNames, ["发起 MR", "推送检查", "MR 检查", "交付汇总"], "nextNames 兼容保留");
});

// ---- P2 Task 6：卡住检测判定 ----
test("stalledOf 档位 + STALL_MS 常量（P2 Task 6）", async () => {
  const { stalledOf, STALL_MS } = await import("../src/client/logic.mjs");
  assert.equal(STALL_MS, 15 * 60_000);
  const now = 1_000_000_000;
  assert.equal(stalledOf(now - 14 * 60_000, now), false, "阈值内 false");
  assert.equal(stalledOf(now - 16 * 60_000, now), true, "超阈值 true");
  assert.equal(stalledOf(undefined, now), false, "非法 false");
  assert.equal(stalledOf(now + 5_000, now), false, "未来时间 false");
});

test("runDirName：与 workspace.sanitizeKey 同构（o/r#issue#1 → o_r_issue_1）", async () => {
  const { runDirName } = await import("../src/client/logic.mjs");   // 新导出用动态导入（Task 6 硬规则）
  assert.equal(runDirName("o/r#issue#1"), "o_r_issue_1");
  assert.equal(runDirName("iasiv5/dsh-m#pull#80"), "iasiv5_dsh-m_pull_80");
  assert.equal(runDirName(null), "");
});
  test("errorText：收录的码 → 词典文案；未收录 → null（调用点回落旧格式）；无 error → null（收敛收口 C3）", async () => {
    const { errorText } = await import("../src/client/logic.mjs");
    const dict = { "errors.codes.managed-dir-explicit": "托管克隆请用「托管克隆」按钮进入", "errors.codes.gate-requires-gating": "先对待拍板候选放行 G1" };
    const t = (k) => dict[k] ?? k;
    assert.equal(errorText("managed-dir-explicit", t), "托管克隆请用「托管克隆」按钮进入");
    assert.equal(errorText(new Error("gate-requires-gating"), t), "先对待拍板候选放行 G1");
    assert.equal(errorText("some-new-code", t), null, "未收录 → null，调用点回落「操作失败 (码)」");
    assert.equal(errorText(undefined, t), null, "无错误 → null");
    assert.equal(errorText(new Error(""), t), null, "空消息 → null");
  });
