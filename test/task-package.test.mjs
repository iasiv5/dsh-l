import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskPackage } from "../src/handlers.mjs";
// 契约守卫：任务包是工作台与执行引擎的交接契约（design.md §6，ADR-0001）。
// 顶层与各块字段在此精确锁定——任何字段增删改名都必须在此测试里显式改判。
const CAND = (triage) => ({
  key: "o/r#pull#7", repo: "o/r", type: "pull", number: 7,
  title: "标题", url: "https://github.com/o/r/pull/7", triage: triage ?? null,
});
const KEYS = (o) => Object.keys(o).sort();

test("任务包 golden：顶层与各块字段精确锁定", () => {
  const now = () => new Date("2026-11-12T14:00:00.000Z");
  const pkg = buildTaskPackage(
    CAND({ validity: "high", urgency: "P1", action: "start", reason: "r" }),
    { defaultBranch: "master", cloneUrl: "git@github.com:o/r.git" },
    now,
  );
  assert.deepEqual(KEYS(pkg), ["candidate", "emit", "gate", "instructions", "kind", "repo", "triage", "version"]);
  assert.deepEqual(KEYS(pkg.candidate), ["key", "number", "repo", "title", "type", "url"]);
  assert.deepEqual(KEYS(pkg.gate), ["at", "decision", "gate", "via"]);
  assert.deepEqual(KEYS(pkg.instructions), ["constraints", "definitionOfDone", "goal"]);
  assert.deepEqual(KEYS(pkg.repo), ["cloneUrl", "defaultBranch", "localPath"]);
  assert.equal(pkg.version, 1);
  assert.equal(pkg.kind, "dsh-l.task-package");
  assert.deepEqual(pkg.triage, { validity: "high", urgency: "P1", action: "start", reason: "r", confidence: null });   // P2 Task 8：triage 五字段投影显式化（无置信 → null）
  const confPkg = buildTaskPackage(
    CAND({ validity: "high", urgency: "P1", action: "start", reason: "r", confidence: 82 }),
    { defaultBranch: "master", cloneUrl: "git@github.com:o/r.git" },
    now,
  );
  assert.equal(confPkg.triage.confidence, 82, "置信随包交接");
  assert.deepEqual(pkg.gate, { gate: "G1", decision: "pass", via: "workbench-ui", at: "2026-11-12T14:00:00.000Z" });
  assert.equal(pkg.repo.defaultBranch, "master");
  assert.equal(pkg.repo.cloneUrl, "git@github.com:o/r.git");
  assert.equal(pkg.repo.localPath, null);
});

test("无分诊也成包（triage=null）；repo 事实缺失回退 main", () => {
  const bare = buildTaskPackage(CAND(null), null, () => new Date(0));
  assert.equal(bare.triage, null);
  assert.equal(bare.repo.defaultBranch, "main");
  assert.equal(bare.repo.cloneUrl, "git@github.com:o/r.git");
});

test("emit 块逐字段满足 autoloop 事件信封（白名单外字段会被 autoloop 拒收）", () => {
  // 白名单与必填约束取自 dsh-agent-autoloop protocol/validate.ts FIELDS（2026-11-12 实核）。
  const FIELDS = ["id", "type", "subject", "summary", "detail", "link", "hops"];
  const pkg = buildTaskPackage(CAND(null), null, () => new Date("2026-11-12T14:00:00.000Z"));
  for (const k of Object.keys(pkg.emit)) assert.ok(FIELDS.includes(k), "信封外字段：" + k);
  assert.ok(pkg.emit.id !== "", "id 必填（autoloop 按其去重）");
  assert.ok(pkg.emit.type !== "", "type 必填");
  assert.equal(pkg.emit.type, "build.requested");
  assert.equal(pkg.emit.subject, "o/r#pull#7");
  assert.equal(pkg.emit.summary, "标题");
  assert.equal(pkg.emit.link, "https://github.com/o/r/pull/7");
  // id 确定性：同一放行时刻重复构建得到同一 id → 重发可被 autoloop 幂等去重。
  assert.equal(pkg.emit.id, "dsh-l:o/r#pull#7:G1:2026-11-12T14:00:00.000Z");
});

test("任务包 v2 golden：role/workflow 块 + v1 字段全保留（评审 D6/M4 T5）", () => {
  const now = () => new Date("2026-11-16T10:00:00.000Z");
  const pkg = buildTaskPackage(
    { ...CAND({ validity: "high", urgency: "P1", action: "start", reason: "r" }), key: "o/r#issue#3", type: "issue", number: 3, url: "https://github.com/o/r/issues/3" },
    { defaultBranch: "main", cloneUrl: "git@github.com:o/r.git" },
    now,
    { role: { roleId: "loop-builder", name: "Loop 构建者", executionPolicy: "auto" },
      workflow: { runId: "run-1731730000000-a1b2", nodeId: "build", templateId: "loop-v1", templateRevision: "abc" } },
  );
  assert.equal(pkg.version, 2);
  // v1 字段全保留
  assert.equal(pkg.kind, "dsh-l.task-package");
  assert.ok(pkg.candidate && pkg.triage && pkg.gate && pkg.instructions && pkg.repo && pkg.emit);
  assert.equal(pkg.emit.type, "build.requested");
  // v2 新增块
  assert.deepEqual(pkg.role, { roleId: "loop-builder", name: "Loop 构建者", executionPolicy: "auto" });
  assert.deepEqual(pkg.workflow, { runId: "run-1731730000000-a1b2", nodeId: "build", templateId: "loop-v1", templateRevision: "abc" });
});

test("任务包 v1 形状不变（无 ctx.role/workflow 时零 v2 泄漏）", () => {
  const pkg = buildTaskPackage(CAND(null), null, () => new Date(0));
  assert.equal(pkg.version, 1);
  assert.equal(pkg.role, undefined);
  assert.equal(pkg.workflow, undefined);
});
