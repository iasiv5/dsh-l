import test from "node:test";
import assert from "node:assert/strict";
import { groupCandidates, filterCandidates } from "../src/client/logic.mjs";

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
