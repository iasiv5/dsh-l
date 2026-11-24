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

// ── credential 凭据块（登录门禁改造 Task 1）─────────────────────────
test("credential 默认空档：未初始化返回空档形状（gh-as-source：无 token 字段）", () => {
  const s = open();
  assert.deepEqual(s.getCredential(), { source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenAt: null });
});

test("credential setCredential：patch 部分合并 + 字段规整（token 材料拒收）", () => {
  const s = open();
  s.setCredential({ source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: "2026-11-19T00:00:00.000Z", healthy: true, ghWrittenAt: "2026-11-19T00:00:01.000Z" });
  assert.equal(s.getCredential().source, "device-flow");
  assert.deepEqual(s.getCredential().scopes, ["repo", "read:org"]);
  assert.equal(s.getCredential().ghWrittenAt, "2026-11-19T00:00:01.000Z");
  s.setCredential({ healthy: false });   // 部分合并：其余字段不丢
  assert.equal(s.getCredential().healthy, false);
  assert.equal(s.getCredential().source, "device-flow");
  s.setCredential({ scopes: "repo" });   // scopes 非数组 → null
  assert.equal(s.getCredential().scopes, null);
  s.setCredential({ scopes: [1, "repo", null] });   // 数组内非字符串剔除
  assert.deepEqual(s.getCredential().scopes, ["repo"]);
  s.setCredential({ bogus: "x", verifiedAt: "2026-11-20T00:00:00.000Z" });   // 未知字段拒收
  assert.equal(s.getCredential().bogus, undefined);
  assert.equal(s.getCredential().verifiedAt, "2026-11-20T00:00:00.000Z");
  s.setCredential({ token: "ghp_should_never_persist", source: "nope", ghWrittenAt: "" });   // token 键整体忽略（gh-as-source）；空串/非法枚举 → null
  assert.equal(s.getCredential().token, undefined);
  assert.equal(s.getCredential().source, null);
  assert.equal(s.getCredential().ghWrittenAt, null);
});

test("credential clearCredential：全字段复位", () => {
  const s = open();
  s.setCredential({ source: "manual-pat", scopes: ["repo"], verifiedAt: "2026-11-19T00:00:00.000Z", healthy: false, ghWrittenAt: "2026-11-19T00:00:00.000Z" });
  s.clearCredential();
  assert.deepEqual(s.getCredential(), { source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenAt: null });
});

test("store v3 迁移（gh-as-source）：v2 档含 credential.token → 整体复位 EMPTY 且落盘无 token；v1 档直跳 v3 仍获 runs/candidates 回填", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-"));
  // v2 档：token 在场 → 全部簿记同弃（保留 ghWrittenAt 会预勾 gh logout，误登出风险，评审 Q2 定谳）
  const p2 = join(dir, "v2.json");
  writeFileSync(p2, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null }, auth: { account: "a", login: "a", verifiedAt: "T" }, credential: { token: "gho_legacy", source: "device-flow", scopes: ["repo"], verifiedAt: "2026-11-01T00:00:00Z", healthy: true, ghWrittenAt: "2026-11-01T00:00:01Z" } }));
  const s2 = createStore({ filePath: p2 });
  assert.deepEqual(s2.getCredential(), { source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenAt: null });
  const persisted = JSON.parse(readFileSync(p2, "utf8"));
  assert.equal(persisted.version, 3);
  assert.equal(persisted.credential.token, undefined);   // 落盘无 token 字段
  assert.equal(createStore({ filePath: p2 }).getCredential().verifiedAt, null);   // 重开不复活
  // v1 档：直跳 v3 仍获 v2 时代的回填（runs + candidates 三字段）
  const p1 = join(dir, "v1.json");
  writeFileSync(p1, JSON.stringify({ version: 1, watch: { repos: [], updatedAt: "T" }, candidates: { k: { repo: "o/r", type: "issue", number: 1 } }, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null }, credential: { token: "gho_old" } }));
  const s1 = createStore({ filePath: p1 });
  assert.equal(s1.getCredential().token, undefined);
  assert.ok(s1.getCandidate("k").currentRunId === null && s1.getCandidate("k").release === null && s1.getCandidate("k").delivery === null);
});

test("credential 旧档迁移：无 credential 块的存量档补空结构", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
  writeFileSync(filePath, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null }, auth: { account: "iasiv5", login: "iasiv5", verifiedAt: "T" } }));
  const s = createStore({ filePath });
  assert.equal(s.getCredential().token, undefined);
  assert.equal(s.getCredential().healthy, true);
  assert.equal(createStore({ filePath }).getCredential().healthy, true);   // 重开读回
});

test("repo 事实：写入读回，未知的仓返回 null", () => {  const s = open();
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
  assert.equal(doc.version, 3);   // v3（gh-as-source）：v1 直跳 v3，回填同等
  assert.deepEqual(doc.runs, {});
  const c = s.getCandidate("a/b#issue#1");
  assert.equal(c.currentRunId, null);
  assert.equal(c.release, null);
  assert.equal(c.delivery, null);
  const s2 = createStore({ filePath: file });   // 二次打开：迁移幂等（评审 R1 采纳）
  assert.equal(JSON.parse(readFileSync(file, "utf8")).version, 3);
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

test("appendRunSession：sessionLog 追加 { nodeId, sessionId, at } 并持久化", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
  const s = createStore({ filePath, now: () => new Date("2026-11-23T00:00:00Z") });
  s.upsertCandidates([raw(3)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 3);
  const id = makeRunId();
  s.createRun({ id, candidateKey: key, templateId: "loop-v1", templateRevision: "r1",
    snapshot: { nodes: [], edges: [] }, nodeStates: {}, status: "running",
    cancelReason: null, createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", history: [] });
  s.appendRunSession(id, "build", "dsh-l:run:x:build:2");
  s.appendRunSession(id, "mr-open", "dsh-l:run:x:mr-open:2");
  assert.deepEqual(s.getRun(id).sessionLog, [
    { nodeId: "build", sessionId: "dsh-l:run:x:build:2", at: "2026-11-23T00:00:00.000Z" },
    { nodeId: "mr-open", sessionId: "dsh-l:run:x:mr-open:2", at: "2026-11-23T00:00:00.000Z" },
  ]);
  assert.equal(createStore({ filePath }).getRun(id).sessionLog.length, 2);   // 落盘可读回
  assert.throws(() => s.appendRunSession("run-nope", "build", "s"), /run not found/);
});

test("F4：version 2 手改档缺 runs 块，打开即回填不炸", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-f4-"));
  const file = join(dir, "store.json");
  writeFileSync(file, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {}, auth: {} }));
  const s = createStore({ filePath: file });
  assert.deepEqual(s.listRuns(), []);
});

test("settings v2：engineConcurrency/workspaceRetentionDays 默认与旧档回填", () => {
  const s = open();
  assert.equal(s.getSettings().engineConcurrency, 2);
  assert.equal(s.getSettings().workspaceRetentionDays, 7);
  const file = join(mkdtempSync(join(tmpdir(), "dsh-l-set-")), "store.json");
  writeFileSync(file, JSON.stringify({ version: 1, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {} }));
  assert.equal(createStore({ filePath: file }).getSettings().engineConcurrency, 2);
  assert.equal(createStore({ filePath: file }).getSettings().workspaceRetentionDays, 7);
});

test("roles：upsert/list/get/delete 回填与幂等", () => {
  const s = open();
  assert.deepEqual(s.listRoles(), []);
  s.upsertRole({ id: "my-builder", name: "我的构建", prompt: "p", executionPolicy: "auto" });
  assert.equal(s.getRole("my-builder").name, "我的构建");
  s.upsertRole({ id: "my-builder", name: "我的构建2", prompt: "p2", executionPolicy: "ask" });
  assert.equal(s.getRole("my-builder").prompt, "p2");
  assert.equal(s.listRoles().length, 1);
  s.deleteRole("my-builder");
  assert.equal(s.getRole("my-builder"), null);
});
test("旧档回填：roles 空对象不炸", () => {
  const file = join(mkdtempSync(join(tmpdir(), "dsh-l-role-")), "store.json");
  writeFileSync(file, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {}, auth: {} }));
  assert.deepEqual(createStore({ filePath: file }).listRoles(), []);
});

// ---- 开工会话（Work Session）Task 1：settings 三键 + workSessions 索引块 ----

test("settings 开工会话三键：新档缺省 null，旧档回填 null", () => {
  const s = open();
  assert.equal(s.getSettings().workSessionModel, null);
  assert.equal(s.getSettings().workSessionPreset, null);
  assert.equal(s.getSettings().workSessionApprovalPolicy, null);
  const file = join(mkdtempSync(join(tmpdir(), "dsh-l-ws-")), "store.json");
  writeFileSync(file, JSON.stringify({ version: 3, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: { intervalMinutes: 0, triageModel: null } }));
  const old = createStore({ filePath: file });
  assert.equal(old.getSettings().workSessionModel, null);
  assert.equal(old.getSettings().workSessionPreset, null);
  assert.equal(old.getSettings().workSessionApprovalPolicy, null);
});

test("workSessions：append 追加、getWorkSession 取末位活跃、listWorkSessions 含全部行", () => {
  const s = open();
  s.upsertCandidates([raw(1)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 1);
  assert.deepEqual(s.listWorkSessions(), []);
  assert.equal(s.getWorkSession(key), null);
  s.appendWorkSession(key, { sessionId: "dsh-l:work-a", cwd: "/w/a", approvalPolicy: null, createdAt: "t1", updatedAt: "t1" });
  s.appendWorkSession(key, { sessionId: "dsh-l:work-b", cwd: "/w/b", approvalPolicy: "never", createdAt: "t2", updatedAt: "t2" });
  assert.equal(s.getWorkSession(key).sessionId, "dsh-l:work-b");
  const listed = s.listWorkSessions();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].key, key);
  assert.equal(listed[0].rows.length, 2);
  assert.equal(listed[0].rows[0].sessionId, "dsh-l:work-a");
});

test("workSessions：缺候选 404；持久化重开读回；候选不存在时 getWorkSession 为 null 不炸", () => {
  const s = open();
  s.upsertCandidates([raw(2)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 2);
  s.appendWorkSession(key, { sessionId: "dsh-l:work-c", cwd: "/w/c", approvalPolicy: "ask", createdAt: "t", updatedAt: "t" });
  assert.throws(() => s.appendWorkSession("o/none#issue#9", { sessionId: "x", cwd: "/x", approvalPolicy: null, createdAt: "t", updatedAt: "t" }), (e) => e.status === 404);
  const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-wsp-")), "store.json");
  const seed = createStore({ filePath });
  seed.upsertCandidates([raw(2)]);
  seed.appendWorkSession(key, { sessionId: "dsh-l:work-c", cwd: "/w/c", approvalPolicy: "ask", createdAt: "t", updatedAt: "t" });
  const reopened = createStore({ filePath });
  assert.equal(reopened.getWorkSession(key).sessionId, "dsh-l:work-c");
  assert.equal(reopened.getWorkSession(candidateKey("iasiv5/dsh-skins", "issue", 99)), null);
});
