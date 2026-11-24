import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";

export const DEFAULT_WATCH_REPOS = [
  "iasiv5/dsh-skins", "iasiv5/dsh-quota-watch", "iasiv5/dsh-stock-kanban",
  "iasiv5/dsh-onetree-log", "iasiv5/dsh-obmc-web", "iasiv5/dsh-copilot-auth",
  "iasiv5/skills", "iasiv5/dsh-m", "iasiv5/dsh-send-later",
  "iasiv5/dsh-skip-browser-auth", "iasiv5/dsh-surf", "iasiv5/dsh-agent-autoloop",
];
const HISTORY_LIMIT = 50;
const INGEST_LOG_LIMIT = 50;
const RUN_HISTORY_LIMIT = 100;

export const candidateKey = (repo, type, number) => repo + "#" + type + "#" + number;

// runId（design-v2 §2）：run-<epochMs>-<4hex>——调用方注入 now 以便测试确定性。
export const makeRunId = (now = () => new Date()) =>
  "run-" + now().getTime() + "-" + randomBytes(2).toString("hex");

// credential 凭据元数据块（gh-as-source，2026-11-20）：token 只存 gh 凭据库，本块永不落 token 材料。
// 时间字段统一 ISO 8601 字符串（与 auth 块同构）；healthy=false 表示被动失效（401），待重校验。
export const EMPTY_CREDENTIAL = {
  source: null, scopes: null, verifiedAt: null, healthy: true, ghWrittenAt: null,
};
const normalizeCredential = (base, patch = {}) => {
  const c = { ...base };
  if ("source" in patch) c.source = patch.source === "device-flow" || patch.source === "manual-pat" ? patch.source : null;
  if ("scopes" in patch) c.scopes = Array.isArray(patch.scopes) ? patch.scopes.filter((x) => typeof x === "string") : null;
  if ("verifiedAt" in patch) c.verifiedAt = typeof patch.verifiedAt === "string" && patch.verifiedAt !== "" ? patch.verifiedAt : null;
  if ("healthy" in patch) c.healthy = patch.healthy !== false;
  if ("ghWrittenAt" in patch) c.ghWrittenAt = typeof patch.ghWrittenAt === "string" && patch.ghWrittenAt !== "" ? patch.ghWrittenAt : null;
  return c;
};

const emptyDoc = (now) => ({
  version: 3,
  runs: {},           // 执行层（design-v2 §2）：runId → run（锁模板快照 + 节点状态机）
  roles: {},          // 角色注册表（design-v2 §14.1，M4）：roleId → {name, description, prompt, executionPolicy, model?}；内置角色在 workflows/roles.mjs，不进 store
  watch: { repos: [...DEFAULT_WATCH_REPOS], updatedAt: now().toISOString() },
  candidates: {},
  snapshots: { lastIngestAt: null, perRepo: {} },
  repos: {},          // "owner/repo" → { defaultBranch, cloneUrl, fetchedAt }，任务包 repo 块数据源
  ingestLog: [],      // 每次摄取一条（上限 50，FIFO）——「刷新有历史可回溯」的载体
  settings: { intervalMinutes: 0, triageModel: null, engineConcurrency: 2, workspaceRetentionDays: 7, workSessionModel: null, workSessionPreset: null, workSessionApprovalPolicy: null },
  auth: { account: null, login: null, verifiedAt: null },  // 收活绑定：工作台级 GitHub 账号连接；退出=清空（不动本机 gh 登录态）
  credential: { ...EMPTY_CREDENTIAL },  // 凭据元数据（GLOSSARY「凭据」，gh-as-source）：来源/权限/校验健康；token 只存 gh 凭据库
});

export function createStore({ filePath, now = () => new Date() }) {
  let doc;
  try { doc = JSON.parse(readFileSync(filePath, "utf8")); } catch { doc = emptyDoc(now); }
  // 旧档迁移：v1 早期档无 repos/ingestLog/auth（各自引入时间不同），补空结构。
  doc.repos ??= {};
  doc.ingestLog ??= [];
  doc.auth ??= { account: null, login: null, verifiedAt: null };
  doc.credential ??= { ...EMPTY_CREDENTIAL };   // 登录门禁改造 Task 1：存量档补凭据空档
  const persist = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmp = join(dirname(filePath), ".store-" + process.pid + "-" + Date.now() + ".tmp");
    writeFileSync(tmp, JSON.stringify(doc), { mode: 0o600 });
    renameSync(tmp, filePath);
  };
  // 迁移块置放：const persist 定义之后、const need 之前——persist 为 const 声明，留在上面旧迁移区
  // 会因 TDZ 调不到 persist()（评审 R1 采纳·方案①：迁移落盘，一次性、幂等）。
  // v3（gh-as-source，2026-11-20）：credential 去 token 材料——token 在场即整体复位 EMPTY（材料不可信即弃；
  // 保留 ghWrittenAt 会令删除框预勾「同时 gh auth logout」，而 gh 库中该令牌可能已不存在/已换账号，误登出风险）。
  // v2 时代的 runs 与 candidates 回填原样保留（v1 旧档直跳 v3 仍获同等回填，评审 Q2e）。
  if (doc.version !== 3) {
    doc.version = 3;
    doc.runs ??= {};
    for (const c of Object.values(doc.candidates)) {
      c.currentRunId ??= null; c.release ??= null; c.delivery ??= null;
    }
    if (doc.credential?.token != null) doc.credential = { ...EMPTY_CREDENTIAL };
    persist();   // 打开旧档会重写 store.json（原子写不变）；此后不再触发。
  }
  doc.runs ??= {};   // 评审 F4：version 2 手改档缺 runs 块的无条件回填
  doc.roles ??= {};   // 评审 P6/R5：version 2 手改档缺 roles 块的无条件回填
  doc.settings ??= { intervalMinutes: 0, triageModel: null, engineConcurrency: 2, workspaceRetentionDays: 7 };
  doc.settings.engineConcurrency ??= 2;             // design-v2 §12.9：M2 引擎并发上限
  doc.settings.workspaceRetentionDays ??= 7;        // design-v2 §5：工作区保留期
  doc.settings.workSessionModel ??= null;           // 开工会话（Work Session）：显式模型覆盖，null=宿主默认
  doc.settings.workSessionPreset ??= null;          // 开工会话 agent preset，null=部署默认
  doc.settings.workDirs ??= {};                    // 收敛 M2 Task 13：按仓库记住的开工目录（repo → 目录 | "managed"）
  doc.settings.workSessionApprovalPolicy ??= null;  // 开工会话初始审批策略，null=宿主部署默认（零 setPolicy）
  doc.workSessions ??= {};                          // 开工会话索引：candidateKey → 行数组（末位=活跃）
  const need = (key) => {
    const c = doc.candidates[key];
    if (!c) throw Object.assign(new Error("candidate not found: " + key), { status: 404 });
    return c;
  };
  const touch = (c, event, detail) => {
    c.history.push({ at: now().toISOString(), event, detail: detail ?? "" });
    if (c.history.length > HISTORY_LIMIT) c.history.splice(0, c.history.length - HISTORY_LIMIT);
  };
  return {
    getWatch: () => doc.watch,
    setWatch(repos) { doc.watch = { repos: [...new Set(repos)], updatedAt: now().toISOString() }; persist(); },
    getAuth: () => doc.auth,
    setAuth({ account, login }) { doc.auth = { account, login, verifiedAt: now().toISOString() }; persist(); },
    clearAuth() { doc.auth = { account: null, login: null, verifiedAt: null }; persist(); },
    // credential 凭据块（Task 1）：patch 部分合并 + 字段规整（normalizeCredential）；clear 全字段复位。
    getCredential: () => doc.credential,
    setCredential(patch) { doc.credential = normalizeCredential(doc.credential, patch); persist(); },
    clearCredential() { doc.credential = { ...EMPTY_CREDENTIAL }; persist(); },
    listCandidates: () => Object.values(doc.candidates),
    getCandidate: (key) => doc.candidates[key] ?? null,
    upsertCandidates(list) {
      for (const raw of list) {
        const key = candidateKey(raw.repo, raw.type, raw.number);
        const prev = doc.candidates[key];
        if (!prev) {
          doc.candidates[key] = {
            key, ...raw, stage: "inbox", triage: null,
            gates: { G1: null, G2: null, G3: null }, taskPackage: null,
            currentRunId: null, release: null, delivery: null,
            history: [{ at: now().toISOString(), event: "ingested", detail: "" }],
          };
        } else {
          Object.assign(prev, {
            title: raw.title, author: raw.author, labels: raw.labels, createdAt: raw.createdAt,
            updatedAt: raw.updatedAt, url: raw.url, meta: raw.meta, pull: raw.pull, bodyExcerpt: raw.bodyExcerpt,
          });
        }
      }
      persist();
    },
    setStage(key, stage, note = "") { const c = need(key); c.stage = stage; touch(c, "stage", stage + (note ? " | " + note : "")); persist(); },
    setTriage(key, result, by) {
      const c = need(key);
      c.triage = { ...result, by, at: now().toISOString() };
      if (c.stage === "inbox") c.stage = "triaged";
      touch(c, "triage." + by, result.validity + "/" + result.urgency + "/" + result.action);
      persist();
    },
    setGate(key, gate, decision, note = "", taskPackage = null, via = "workbench-ui") {
      const c = need(key);
      c.gates[gate] = { decision, note, via, at: now().toISOString() };
      if (taskPackage) c.taskPackage = taskPackage;
      touch(c, "gate." + gate, decision + " via " + via);
      persist();
    },
    getSettings: () => doc.settings,
    setSettings(patch) { doc.settings = { ...doc.settings, ...patch }; persist(); },
    // 开工目录记忆（design-v2 §20 第 13 条）：postWorkStart 成功后按仓库写入。
    setWorkDir(repo, cwd) { (doc.settings.workDirs ??= {})[repo] = cwd; persist(); },
    // 开工会话索引（GLOSSARY「开工会话」）：append 追加行（末位=活跃）；get 取末位或 null（候选不存在不炸——
    // 读路径无候选校验，写路径 need(key) 404）。
    getWorkSession: (key) => {
      const rows = doc.workSessions[key];
      return rows && rows.length ? rows[rows.length - 1] : null;
    },
    appendWorkSession(key, row) {
      need(key);
      (doc.workSessions[key] ??= []).push({ ...row });
      persist();
    },
    listWorkSessions: () => Object.entries(doc.workSessions).map(([key, rows]) => ({ key, rows })),
    getSnapshots: () => doc.snapshots,
    setSnapshots(perRepo) { doc.snapshots = { lastIngestAt: now().toISOString(), perRepo }; persist(); },
    // 摄取日志：追加一条并 FIFO 截到上限（design.md §2）。
    appendIngestLog(entry) {
      doc.ingestLog.push({ at: now().toISOString(), ...entry });
      if (doc.ingestLog.length > INGEST_LOG_LIMIT) doc.ingestLog.splice(0, doc.ingestLog.length - INGEST_LOG_LIMIT);
      persist();
    },
    getIngestLog: () => doc.ingestLog,
    // 候选级事件落痕（分诊失败等 design.md §5 承诺的 error 记录）。
    recordHistory(key, event, detail = "") {
      const c = need(key);
      touch(c, event, detail);
      persist();
    },
    // 执行层 runs（design-v2 §2）：createRun 置候选 currentRunId 并留痕；saveRun 以注入 now 刷新 updatedAt。
    createRun(run) {
      if (doc.runs[run.id]) throw Object.assign(new Error("run exists: " + run.id), { status: 409 });
      const c = need(run.candidateKey);
      doc.runs[run.id] = run;
      c.currentRunId = run.id;
      touch(c, "run.created", run.id);
      persist();
    },
    getRun: (id) => doc.runs[id] ?? null,
    listRuns: () => Object.values(doc.runs),
    saveRun(run) { run.updatedAt = now().toISOString(); doc.runs[run.id] = run; persist(); },
    // G3 发版确认落痕（design-v2 §13.5 / M2 T3）：候选 release 块 + history，不代跑发版。
    setRelease(key, note = "") {
      const c = need(key);
      c.release = { confirmedAt: now().toISOString(), note };
      touch(c, "release.confirmed", note);
      persist();
    },
    // 角色注册表（design-v2 §14.1 / M4 T1）：用户自定义角色 CRUD；内置角色在 workflows/roles.mjs，不进 store。
    upsertRole(role) {
      if (!role || typeof role.id !== "string" || !role.id.trim()) throw Object.assign(new Error("role id required"), { status: 400 });
      doc.roles[role.id] = { ...role, id: role.id };
      persist();
    },
    getRole: (id) => doc.roles[id] ?? null,
    listRoles: () => Object.values(doc.roles),
    deleteRole(id) {
      if (!doc.roles[id]) return;
      delete doc.roles[id];
      persist();
    },
    appendRunHistory(id, event, detail = "") {
      const run = doc.runs[id];
      if (!run) throw Object.assign(new Error("run not found: " + id), { status: 404 });
      run.history.push({ at: now().toISOString(), event, detail });   // 评审 R11：用注入 now
      if (run.history.length > RUN_HISTORY_LIMIT) run.history.splice(0, run.history.length - RUN_HISTORY_LIMIT);
      persist();
    },
    // run 会话登记（design-v2 §20 第 23 条行内部分）：节点会话按发生序追加，摘要倒序成「最近在前」。
    appendRunSession(id, nodeId, sessionId) {
      const run = doc.runs[id];
      if (!run) throw Object.assign(new Error("run not found: " + id), { status: 404 });
      (run.sessionLog ??= []).push({ nodeId, sessionId, at: now().toISOString() });
      persist();
    },
    // 交付记在来源候选（design-v2 §20 第 30 条）：引擎为 issue 新开的 PR 不另成候选；合并写并留痕。
    setDelivery(key, patch, event = "delivery") {
      const c = need(key);
      c.delivery = { ...(c.delivery ?? {}), ...patch };
      touch(c, event, JSON.stringify(patch).slice(0, 120));
      persist();
    },
    // 仓库事实（任务包 repo 块数据源）。
    setRepoFacts(repo, facts) { doc.repos[repo] = { ...facts, fetchedAt: now().toISOString() }; persist(); },
    getRepoFacts: (repo) => doc.repos[repo] ?? null,
    // 上游回收（design.md §8）：某仓摄取成功后，该仓已不在 open 集合里的候选——
    // 未拍板阶段（inbox/triaged）自动移入 closed（event=upstream-closed）；
    // 拍板后仍在途的阶段（gating/held/building/verifying）不代作主，只追加一次 upstream-gone 提示（去重）；
    // closed/shipped 消失上游属预期，不动。
    sweepUpstream(repo, liveKeys) {
      const live = new Set(liveKeys);
      const closed = [];
      const flagged = [];
      for (const c of Object.values(doc.candidates)) {
        if (c.repo !== repo || live.has(c.key)) continue;
        if (c.stage === "inbox" || c.stage === "triaged") {
          c.stage = "closed";
          touch(c, "upstream-closed", "");
          closed.push(c.key);
        } else if (c.stage !== "closed" && c.stage !== "shipped") {
          const last = c.history[c.history.length - 1];
          if (last?.event !== "upstream-gone") {
            touch(c, "upstream-gone", "");
            flagged.push(c.key);
          }
        }
      }
      if (closed.length || flagged.length) persist();
      return { closed, flagged };
    },
  };
}
