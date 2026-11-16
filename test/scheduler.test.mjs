import test from "node:test";
import assert from "node:assert/strict";
import { computeReady, descendantsOf } from "../src/engine/scheduler.mjs";

// a→b（普通支）与 a→c(gate)→d（闸门支）：gate 只闸 d，不闸 b（design-v2 §4 / grill Q9-B）
const snap = { nodes: [{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges: [ {id:"e1",source:"a",target:"b",kind:"success"}, {id:"e2",source:"a",target:"c",kind:"success"},
           {id:"e3",source:"c",target:"d",kind:"success"} ] };
const st = (map) => Object.fromEntries(snap.nodes.map((n) => [n.id, { status: map[n.id] ?? "pending", attempt: 0, reworkCount: 0 }]));

test("computeReady：入口即绪、闸门只堵下游", () => {
  assert.deepEqual(computeReady(snap, st({})), ["a"]);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded" })), ["b", "c"]); // c 是 gate：ready 待人工，d 被堵
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "waiting" })), []);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "succeeded" })), ["d"]);
});
test("descendantsOf：success 边可达、不含自身", () => {
  assert.deepEqual(descendantsOf(snap, "a"), ["b", "c", "d"]);
  assert.deepEqual(descendantsOf(snap, "c"), ["d"]);
  assert.deepEqual(descendantsOf(snap, "d"), []);
});
