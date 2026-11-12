import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const DEFAULT_WATCH_REPOS = [
  "iasiv5/dsh-skins", "iasiv5/dsh-quota-watch", "iasiv5/dsh-stock-kanban",
  "iasiv5/dsh-onetree-log", "iasiv5/dsh-obmc-web", "iasiv5/dsh-copilot-auth",
  "iasiv5/skills", "iasiv5/dsh-m", "iasiv5/dsh-send-later",
  "iasiv5/dsh-skip-browser-auth", "iasiv5/dsh-surf", "iasiv5/dsh-agent-autoloop",
];
const HISTORY_LIMIT = 50;
const INGEST_LOG_LIMIT = 50;

export const candidateKey = (repo, type, number) => repo + "#" + type + "#" + number;

const emptyDoc = (now) => ({
  version: 1,
  watch: { repos: [...DEFAULT_WATCH_REPOS], updatedAt: now().toISOString() },
  candidates: {},
  snapshots: { lastIngestAt: null, perRepo: {} },
  repos: {},          // "owner/repo" → { defaultBranch, cloneUrl, fetchedAt }，任务包 repo 块数据源
  ingestLog: [],      // 每次摄取一条（上限 50，FIFO）——「刷新有历史可回溯」的载体
  settings: { intervalMinutes: 0, triageModel: null },
});

export function createStore({ filePath, now = () => new Date() }) {
  let doc;
  try { doc = JSON.parse(readFileSync(filePath, "utf8")); } catch { doc = emptyDoc(now); }
  const persist = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmp = join(dirname(filePath), ".store-" + process.pid + "-" + Date.now() + ".tmp");
    writeFileSync(tmp, JSON.stringify(doc), { mode: 0o600 });
    renameSync(tmp, filePath);
  };
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
