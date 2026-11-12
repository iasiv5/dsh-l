import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore, DEFAULT_WATCH_REPOS, candidateKey } from "../src/store.mjs";

const open = () => createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json") });
const raw = (n) => ({
  repo: "iasiv5/dsh-skins", type: "issue", number: n, title: "t" + n, author: "a",
  labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z",
  url: "https://example.com/" + n, meta: { comments: 0, reactionsTotal: 0 }, pull: null, bodyExcerpt: "b",
});

test("首跑默认 12 仓", () => {
  assert.equal(DEFAULT_WATCH_REPOS.length, 12);
  assert.deepEqual(open().getWatch().repos, DEFAULT_WATCH_REPOS);
});

test("新候选落 inbox；重复摄取刷新可变字段、保留人工字段", () => {
  const s = open();
  s.upsertCandidates([raw(1)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 1);
  assert.equal(s.getCandidate(key).stage, "inbox");
  s.setStage(key, "gating", "manual");
  s.upsertCandidates([{ ...raw(1), title: "changed" }]);
  assert.equal(s.getCandidate(key).title, "changed");
  assert.equal(s.getCandidate(key).stage, "gating");
});

test("setTriage：llm 与 human 都把 inbox 升 triaged，by 如实记录", () => {
  const s = open();
  s.upsertCandidates([raw(2)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 2);
  s.setTriage(key, { validity: "high", urgency: "P1", action: "start", reason: "r", lang: "zh-CN" }, "llm");
  assert.equal(s.getCandidate(key).stage, "triaged");
  s.setTriage(key, { validity: "low", urgency: "P3", action: "close", reason: "人工", lang: "zh-CN" }, "human");
  assert.equal(s.getCandidate(key).triage.by, "human");
  assert.equal(s.getCandidate(key).triage.validity, "low");
});

test("setGate 记录放行与来源并可挂任务包；history 有界 50", () => {
  const s = open();
  s.upsertCandidates([raw(3)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 3);
  const pkg = { kind: "dsh-l.task-package", version: 1 };
  s.setGate(key, "G1", "pass", "", pkg, "workbench-ui");
  assert.equal(s.getCandidate(key).gates.G1.decision, "pass");
  assert.equal(s.getCandidate(key).gates.G1.via, "workbench-ui");
  assert.equal(s.getCandidate(key).taskPackage, pkg);
  for (let i = 0; i < 60; i++) s.setStage(key, "held", String(i));
  assert.equal(s.getCandidate(key).history.length, 50);
});

test("持久化：重开读回", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
  createStore({ filePath }).setWatch(["o/r"]);
  assert.deepEqual(createStore({ filePath }).getWatch().repos, ["o/r"]);
});
