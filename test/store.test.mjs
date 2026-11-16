import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore, DEFAULT_WATCH_REPOS, candidateKey, makeRunId } from "../src/store.mjs";

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

test("旧档迁移：缺 repos/ingestLog 的存量档补空结构不炸", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
  writeFileSync(filePath, JSON.stringify({ version: 1, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null } }));
  const s = createStore({ filePath });
  assert.deepEqual(s.getIngestLog(), []);
  assert.equal(s.getRepoFacts("o/r"), null);
});

test("recordHistory 落痕；ingestLog 追加并 FIFO 截到 50", () => {
  const s = open();
  s.upsertCandidates([raw(4)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 4);
  s.recordHistory(key, "triage.error", "parse-failed");
  const last = s.getCandidate(key).history.at(-1);
  assert.equal(last.event, "triage.error");
  assert.equal(last.detail, "parse-failed");
  for (let i = 0; i < 60; i++) s.appendIngestLog({ total: i, authenticated: false, failedRepos: [], closed: 0, flagged: 0 });
  assert.equal(s.getIngestLog().length, 50);
  assert.equal(s.getIngestLog().at(-1).total, 59);
});

test("auth 绑定：set/get/clear + 旧档迁移补空 auth", () => {
  const s = open();
  assert.deepEqual(s.getAuth(), { account: null, login: null, verifiedAt: null });
  s.setAuth({ account: "iasiv5", login: "IasiV5" });
  assert.equal(s.getAuth().account, "iasiv5");
  assert.equal(s.getAuth().login, "IasiV5");
  assert.ok(s.getAuth().verifiedAt);
  s.clearAuth();
  assert.equal(s.getAuth().account, null);
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
  writeFileSync(filePath, JSON.stringify({ version: 1, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null } }));
  assert.equal(createStore({ filePath }).getAuth().account, null);
});

test("repo 事实：写入读回，未知的仓返回 null", () => {
  const s = open();
  s.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  assert.equal(s.getRepoFacts("o/r").defaultBranch, "trunk");
  assert.equal(s.getRepoFacts("o/unknown"), null);
});

test("sweepUpstream：inbox/triaged 自动关闭，在途阶段提示一次，closed/shipped 与他仓不动", () => {
  const s = open();
  s.upsertCandidates([raw(10), raw(11), raw(12), raw(13), raw(14), { ...raw(15), repo: "o/other" }]);
  const k = (n) => candidateKey("iasiv5/dsh-skins", "issue", n);
  s.setStage(k(11), "gating", "拍板了");     // 在途：只提示
  s.setStage(k(12), "closed", "done");       // 已关：不动
  s.setStage(k(13), "shipped", "v2");        // 已交付：不动
  s.setTriage(k(14), { validity: "high", urgency: "P2", action: "start", reason: "r", lang: "zh-CN" }, "llm"); // → triaged
  s.setStage(candidateKey("o/other", "issue", 15), "gating", "他仓");
  const live = [k(10)]; // 只有 #10 仍 open
  const r1 = s.sweepUpstream("iasiv5/dsh-skins", live);
  assert.deepEqual(r1.closed, [k(14)]);
  assert.deepEqual(r1.flagged, [k(11)]);
  assert.equal(s.getCandidate(k(10)).stage, "inbox");
  assert.equal(s.getCandidate(k(14)).stage, "closed");
  assert.equal(s.getCandidate(k(14)).history.at(-1).event, "upstream-closed");
  assert.equal(s.getCandidate(k(12)).history.at(-1).event, "stage");
  assert.equal(s.getCandidate(k(13)).history.at(-1).event, "stage");
  assert.equal(s.getCandidate(candidateKey("o/other", "issue", 15)).history.at(-1).event, "stage");
  // 再扫一遍：提示去重，结果稳定
  const r2 = s.sweepUpstream("iasiv5/dsh-skins", live);
  assert.deepEqual(r2, { closed: [], flagged: [] });
});

test("v1 旧档迁移：version 2 + runs 空 + 候选补新字段", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-mig-"));
  const file = join(dir, "store.json");
  const v1 = { version: 1, watch: { repos: ["a/b"], updatedAt: "2026-11-01T00:00:00Z" },
    candidates: { "a/b#issue#1": { key: "a/b#issue#1", repo: "a/b", type: "issue", number: 1,
      title: "t", author: "a", labels: [], createdAt: "", updatedAt: "", url: "", meta: {}, pull: null,
      bodyExcerpt: "", stage: "triaged", triage: null, gates: { G1: null, G2: null, G3: null },
      taskPackage: null, history: [] } } };
  writeFileSync(file, JSON.stringify(v1));
  const s = createStore({ filePath: file });
  const doc = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(doc.version, 2);
  assert.deepEqual(doc.runs, {});
  const c = s.getCandidate("a/b#issue#1");
  assert.equal(c.currentRunId, null);
  assert.equal(c.release, null);
  assert.equal(c.delivery, null);
  const s2 = createStore({ filePath: file });   // 二次打开：迁移幂等（评审 R1 采纳）
  assert.equal(JSON.parse(readFileSync(file, "utf8")).version, 2);
  assert.equal(s2.getCandidate("a/b#issue#1").currentRunId, null);
});
test("新候选与新档自带 v2 字段", () => {
  const s = open();
  s.upsertCandidates([raw(9)]);
  const c = s.getCandidate(candidateKey("iasiv5/dsh-skins", "issue", 9));
  assert.equal(c.currentRunId, null); assert.equal(c.release, null); assert.equal(c.delivery, null);
});

test("runs CRUD：createRun 指针与留痕、saveRun 刷新、history FIFO", () => {
  const s = open(); s.upsertCandidates([raw(3)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 3);
  const id = makeRunId();
  assert.match(id, /^run-\d+-[0-9a-f]{4}$/);
  s.createRun({ id, candidateKey: key, templateId: "loop-v1", templateRevision: "r1",
    snapshot: { nodes: [], edges: [] }, nodeStates: {}, status: "running",
    cancelReason: null, createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", history: [] });
  assert.equal(s.getCandidate(key).currentRunId, id);
  const run = s.getRun(id);
  s.saveRun({ ...run, status: "succeeded" });
  assert.equal(s.getRun(id).status, "succeeded");
  for (let i = 0; i < 102; i++) s.appendRunHistory(id, "e" + i, "");
  assert.equal(s.getRun(id).history.length, 100);
  assert.equal(s.getRun(id).history[99].event, "e101");
  assert.equal(s.getRun("nope"), null);
  assert.throws(() => s.createRun({ id, candidateKey: key }), /exists/);
});
