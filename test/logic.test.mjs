import test from "node:test";
import assert from "node:assert/strict";
import { groupCandidates, filterCandidates, pickTriageBatch, gateState, stageCounts } from "../src/client/logic.mjs";

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
