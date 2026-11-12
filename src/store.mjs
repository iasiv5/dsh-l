import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const DEFAULT_WATCH_REPOS = [
  "iasiv5/dsh-skins", "iasiv5/dsh-quota-watch", "iasiv5/dsh-stock-kanban",
  "iasiv5/dsh-onetree-log", "iasiv5/dsh-obmc-web", "iasiv5/dsh-copilot-auth",
  "iasiv5/skills", "iasiv5/dsh-m", "iasiv5/dsh-send-later",
  "iasiv5/dsh-skip-browser-auth", "iasiv5/dsh-surf", "iasiv5/dsh-agent-autoloop",
];
const HISTORY_LIMIT = 50;

export const candidateKey = (repo, type, number) => repo + "#" + type + "#" + number;

const emptyDoc = (now) => ({
  version: 1,
  watch: { repos: [...DEFAULT_WATCH_REPOS], updatedAt: now().toISOString() },
  candidates: {},
  snapshots: { lastIngestAt: null, perRepo: {} },
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
  };
}
