var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// src/host.mjs
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { join as join3 } from "node:path";

// src/paths.mjs
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
var isProfileRoot = (dir) => {
  try {
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return Boolean(manifest.dsh && typeof manifest.dsh === "object" && "profile" in manifest.dsh);
  } catch {
    return false;
  }
};
function findProfileRoot(startDir) {
  let dir = startDir;
  for (; ; ) {
    if (isProfileRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return void 0;
    dir = parent;
  }
}
function profileFromArgv(argv, dshHome) {
  const profiles = join(dshHome, "profiles");
  const flag = argv.indexOf("--profile");
  const names = flag >= 0 ? [argv[flag + 1]] : argv.slice(2).filter((a) => !a.startsWith("-"));
  for (const name2 of names) {
    if (name2 && isProfileRoot(join(profiles, name2))) return join(profiles, name2);
  }
  return void 0;
}
function dataDir({ env = process.env, moduleUrl = import.meta.url, argv = process.argv, home } = {}) {
  if (env.DSH_L_DATA) {
    mkdirSync(env.DSH_L_DATA, { recursive: true, mode: 448 });
    return env.DSH_L_DATA;
  }
  let startDir = null;
  try {
    startDir = dirname(fileURLToPath(moduleUrl));
  } catch {
  }
  const dshHome = env.DSH_HOME || home || join(homedir(), ".dsh");
  const profile = (startDir && findProfileRoot(startDir)) ?? profileFromArgv(argv, dshHome);
  if (!profile || !existsSync(profile)) {
    throw new Error("dsh-l: \u627E\u4E0D\u5230\u6240\u5C5E profile\uFF08\u6A21\u5757\u4F4D\u7F6E\u4E0E argv \u5747\u672A\u547D\u4E2D dsh.profile \u58F0\u660E\uFF09\uFF1B\u53EF\u7528 DSH_L_DATA \u6307\u5B9A\u6570\u636E\u76EE\u5F55");
  }
  const dir = join(profile, "data", "dsh-l");
  mkdirSync(dir, { recursive: true, mode: 448 });
  return dir;
}

// src/store.mjs
import { readFileSync as readFileSync2, writeFileSync, renameSync, mkdirSync as mkdirSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
var DEFAULT_WATCH_REPOS = [
  "iasiv5/dsh-skins",
  "iasiv5/dsh-quota-watch",
  "iasiv5/dsh-stock-kanban",
  "iasiv5/dsh-onetree-log",
  "iasiv5/dsh-obmc-web",
  "iasiv5/dsh-copilot-auth",
  "iasiv5/skills",
  "iasiv5/dsh-m",
  "iasiv5/dsh-send-later",
  "iasiv5/dsh-skip-browser-auth",
  "iasiv5/dsh-surf",
  "iasiv5/dsh-agent-autoloop"
];
var HISTORY_LIMIT = 50;
var candidateKey = (repo, type, number) => repo + "#" + type + "#" + number;
var emptyDoc = (now) => ({
  version: 1,
  watch: { repos: [...DEFAULT_WATCH_REPOS], updatedAt: now().toISOString() },
  candidates: {},
  snapshots: { lastIngestAt: null, perRepo: {} },
  settings: { intervalMinutes: 0, triageModel: null }
});
function createStore({ filePath, now = () => /* @__PURE__ */ new Date() }) {
  let doc;
  try {
    doc = JSON.parse(readFileSync2(filePath, "utf8"));
  } catch {
    doc = emptyDoc(now);
  }
  const persist = () => {
    mkdirSync2(dirname2(filePath), { recursive: true });
    const tmp = join2(dirname2(filePath), ".store-" + process.pid + "-" + Date.now() + ".tmp");
    writeFileSync(tmp, JSON.stringify(doc), { mode: 384 });
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
    setWatch(repos) {
      doc.watch = { repos: [...new Set(repos)], updatedAt: now().toISOString() };
      persist();
    },
    listCandidates: () => Object.values(doc.candidates),
    getCandidate: (key) => doc.candidates[key] ?? null,
    upsertCandidates(list) {
      for (const raw of list) {
        const key = candidateKey(raw.repo, raw.type, raw.number);
        const prev = doc.candidates[key];
        if (!prev) {
          doc.candidates[key] = {
            key,
            ...raw,
            stage: "inbox",
            triage: null,
            gates: { G1: null, G2: null, G3: null },
            taskPackage: null,
            history: [{ at: now().toISOString(), event: "ingested", detail: "" }]
          };
        } else {
          Object.assign(prev, {
            title: raw.title,
            author: raw.author,
            labels: raw.labels,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            url: raw.url,
            meta: raw.meta,
            pull: raw.pull,
            bodyExcerpt: raw.bodyExcerpt
          });
        }
      }
      persist();
    },
    setStage(key, stage, note = "") {
      const c = need(key);
      c.stage = stage;
      touch(c, "stage", stage + (note ? " | " + note : ""));
      persist();
    },
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
    setSettings(patch) {
      doc.settings = { ...doc.settings, ...patch };
      persist();
    },
    getSnapshots: () => doc.snapshots,
    setSnapshots(perRepo) {
      doc.snapshots = { lastIngestAt: now().toISOString(), perRepo };
      persist();
    }
  };
}

// src/github.mjs
var github_exports = {};
__export(github_exports, {
  discoverRepos: () => discoverRepos,
  listOpenIssues: () => listOpenIssues,
  listOpenPulls: () => listOpenPulls,
  resolveToken: () => resolveToken
});
var API_BASE = "https://api.github.com";
var REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
var headers = (token) => ({
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  ...token ? { authorization: "Bearer " + token } : {}
});
async function pagedGet(path, { token, fetch: f = globalThis.fetch }) {
  const rows = [];
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const url = API_BASE + path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + pageNo;
    const res = await f(url, { headers: headers(token) });
    if (!res.ok) throw new Error("github api " + res.status + " for " + path);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}
var excerpt = (body) => String(body ?? "").slice(0, 600);
var labelsOf = (r) => (r.labels ?? []).map((l) => typeof l === "string" ? l : l.name);
var ageDays = (iso) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 864e5));
var base = (repo, type, r) => ({
  repo,
  type,
  number: r.number,
  title: r.title,
  author: r.user?.login ?? "",
  labels: labelsOf(r),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  url: r.html_url,
  bodyExcerpt: excerpt(r.body)
});
async function listOpenIssues({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/issues?state=open", { token, fetch });
  return rows.filter((r) => !r.pull_request).map((r) => ({
    ...base(repo, "issue", r),
    meta: { comments: r.comments ?? 0, reactionsTotal: r.reactions?.total_count ?? 0, ageDays: ageDays(r.created_at) },
    pull: null
  }));
}
async function listOpenPulls({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/pulls?state=open", { token, fetch });
  return rows.map((r) => ({
    ...base(repo, "pull", r),
    meta: { comments: r.comments ?? 0, reactionsTotal: 0, ageDays: ageDays(r.created_at) },
    pull: { draft: Boolean(r.draft), headRef: r.head?.ref ?? "" }
  }));
}
async function discoverRepos({ token, fetch }) {
  const rows = await pagedGet("/user/repos?affiliation=owner&sort=pushed", { token, fetch });
  return rows.map((r) => ({ fullName: r.full_name, pushedAt: r.pushed_at, visibility: r.visibility }));
}
async function resolveToken({ credentials, tokenRef, execFile: execFile2 }) {
  if (typeof tokenRef === "string" && REF_PATTERN.test(tokenRef)) {
    try {
      const hit = await credentials?.resolve?.(tokenRef);
      if (typeof hit?.value === "string" && hit.value !== "") return hit.value;
    } catch {
    }
  }
  try {
    const out = String((await execFile2("gh", ["auth", "token"])).stdout).trim();
    return out === "" ? null : out;
  } catch {
    return null;
  }
}

// src/handlers.mjs
var REPO_RE = /^[\w.-]+\/[\w.-]+$/;
var MANUAL_STAGES = /* @__PURE__ */ new Set(["inbox", "triaged", "gating", "shipped", "closed", "held"]);
var VALIDITY = /* @__PURE__ */ new Set(["high", "medium", "low"]);
var URGENCY = /* @__PURE__ */ new Set(["P0", "P1", "P2", "P3"]);
var ACTION = /* @__PURE__ */ new Set(["start", "feedback", "close", "hold"]);
var fail = (error, status = 400) => ({ error, status });
var validTriage = (r) => Boolean(r) && VALIDITY.has(r.validity) && URGENCY.has(r.urgency) && ACTION.has(r.action);
var langOf = (v) => v === "en" ? "en" : "zh-CN";
function buildTaskPackage(candidate, now = () => /* @__PURE__ */ new Date()) {
  const at = now().toISOString();
  return {
    version: 1,
    kind: "dsh-l.task-package",
    candidate: { key: candidate.key, repo: candidate.repo, type: candidate.type, number: candidate.number, title: candidate.title, url: candidate.url },
    triage: candidate.triage ? { validity: candidate.triage.validity, urgency: candidate.triage.urgency, action: candidate.triage.action, reason: candidate.triage.reason } : null,
    gate: { gate: "G1", decision: "pass", via: "workbench-ui", at },
    instructions: { goal: candidate.title, constraints: [], definitionOfDone: [] },
    repo: { defaultBranch: "main", cloneUrl: "git@github.com:" + candidate.repo + ".git", localPath: null },
    emit: { source: "dsh-l", type: "build.requested", at }
  };
}
function makeHandlers({ store, provider, triage, credentials, tokenRef = null, execFile: execFile2, fetch = globalThis.fetch, now = () => /* @__PURE__ */ new Date(), onSettingsChange = () => {
} }) {
  const token = () => provider.resolveToken({ credentials, tokenRef, execFile: execFile2 });
  return {
    async getState() {
      return { watch: store.getWatch(), snapshots: store.getSnapshots(), settings: store.getSettings(), candidates: store.listCandidates() };
    },
    async postRefresh() {
      const tk = await token();
      const perRepo = {};
      const merged = [];
      for (const repo of store.getWatch().repos) {
        try {
          const [issues, pulls] = await Promise.all([
            provider.listOpenIssues({ repo, token: tk, fetch }),
            provider.listOpenPulls({ repo, token: tk, fetch })
          ]);
          merged.push(...issues, ...pulls);
          perRepo[repo] = { issues: issues.length, pulls: pulls.length, fetchedAt: now().toISOString(), error: null };
        } catch (err) {
          perRepo[repo] = { issues: 0, pulls: 0, fetchedAt: now().toISOString(), error: String(err?.message ?? err) };
        }
      }
      store.upsertCandidates(merged);
      store.setSnapshots(perRepo);
      return { perRepo, total: merged.length, authenticated: tk !== null };
    },
    async getWatch() {
      return store.getWatch();
    },
    async putWatch(body) {
      const repos = body?.repos;
      if (!Array.isArray(repos) || repos.some((r) => typeof r !== "string" || !REPO_RE.test(r))) return fail("invalid repos");
      store.setWatch(repos);
      return store.getWatch();
    },
    async getDiscover() {
      return { repos: await provider.discoverRepos({ token: await token(), fetch }) };
    },
    async postTriage(body) {
      const keys = body?.keys;
      if (!Array.isArray(keys) || keys.length === 0 || keys.length > 10) return fail("keys must be 1..10");
      const lang = langOf(body?.lang);
      const candidates = keys.map((k) => store.getCandidate(k)).filter(Boolean);
      if (candidates.length === 0) return fail("no candidates", 404);
      const result = await triage.runTriage({ candidates, lang, model: store.getSettings().triageModel });
      if (result.failed) return fail(result.failed, 502);
      const updated = [];
      for (const row of result.updated) {
        if (!keys.includes(row.key) || !store.getCandidate(row.key) || !validTriage(row)) continue;
        store.setTriage(row.key, { validity: row.validity, urgency: row.urgency, action: row.action, reason: String(row.reason ?? "").slice(0, 160), lang }, "llm");
        updated.push(row.key);
      }
      return { updated };
    },
    async postOverride(body) {
      if (!store.getCandidate(body?.key)) return fail("not found", 404);
      if (!validTriage(body)) return fail("invalid triage");
      store.setTriage(body.key, { validity: body.validity, urgency: body.urgency, action: body.action, reason: String(body.reason ?? "").slice(0, 160), lang: langOf(body.lang) }, "human");
      return { ok: true };
    },
    async postStage(body) {
      const { key, stage, note } = body ?? {};
      if (!MANUAL_STAGES.has(stage)) return fail("invalid stage");
      if (!store.getCandidate(key)) return fail("not found", 404);
      store.setStage(key, stage, note ?? "");
      return { ok: true };
    },
    async postGate(body) {
      const { key, gate, decision, note } = body ?? {};
      if (!["G1", "G2", "G3"].includes(gate) || !["pass", "reject"].includes(decision)) return fail("invalid gate");
      if (gate !== "G1") return fail("gate-not-available-in-v1", 409);
      const c = store.getCandidate(key);
      if (!c) return fail("not found", 404);
      if (c.stage !== "gating") return fail("gate-requires-gating", 409);
      if (decision === "pass") {
        const pkg = buildTaskPackage(c, now);
        store.setGate(key, "G1", "pass", note ?? "", pkg, "workbench-ui");
        store.setStage(key, "building", "G1 pass");
        return { ok: true, taskPackage: pkg };
      }
      store.setGate(key, "G1", "reject", note ?? "", null, "workbench-ui");
      store.setStage(key, "triaged", "G1 reject");
      return { ok: true, taskPackage: null };
    },
    async getSettings() {
      return store.getSettings();
    },
    async putSettings(body) {
      const minutes = body?.intervalMinutes;
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return fail("invalid settings");
      store.setSettings({ intervalMinutes: minutes });
      onSettingsChange(store.getSettings());
      return store.getSettings();
    }
  };
}

// src/http.mjs
var BODY_MAX = 64 * 1024;
function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": String(body.length)
  });
  res.end(body);
}
async function readJsonBody(req, maxBytes = BODY_MAX) {
  const type = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw Object.assign(new Error("content-type must be application/json"), { status: 400 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += part.length;
    if (bytes > maxBytes) throw Object.assign(new Error("payload too large"), { status: 413 });
    chunks.push(part);
  }
  if (chunks.length === 0) throw Object.assign(new Error("empty body"), { status: 400 });
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid json"), { status: 400 });
  }
}
function createTrustGuard(ctx, logger = console) {
  let warned = false;
  const warnOnce = (err) => {
    if (warned) return;
    warned = true;
    logger?.warn?.("dsh-l: connection.requestRejection \u4E0D\u53EF\u7528\uFF0C\u5168\u8DEF\u7531 fail-closed 403");
    if (err) logger?.warn?.(err);
  };
  return (req) => {
    try {
      const connection = ctx?.get?.("connection");
      const reject = connection?.requestRejection;
      if (typeof reject !== "function") {
        warnOnce(void 0);
        return 403;
      }
      return reject.call(connection, { headers: req.headers }) ?? void 0;
    } catch (err) {
      warnOnce(err);
      return 403;
    }
  };
}
function isSameOriginRequest(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (origin === void 0 || origin === null || origin === "") {
    const site = req.headers["sec-fetch-site"];
    return site === void 0 || site === "same-origin" || site === "same-site" || site === "none";
  }
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}
function makeHttpHandler({ methods, trust }) {
  const allow = Object.keys(methods).join(", ");
  return async (req, res) => {
    const rejection = trust(req);
    if (rejection !== void 0) return sendJson(res, rejection, { error: "untrusted" });
    const fn = methods[req.method];
    if (!fn) {
      res.setHeader("Allow", allow);
      return sendJson(res, 405, { error: "method-not-allowed" });
    }
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (!isSameOriginRequest(req)) return sendJson(res, 403, { error: "origin-rejected" });
      try {
        body = await readJsonBody(req);
      } catch (e) {
        return sendJson(res, e.status ?? 400, { error: String(e.message ?? e) });
      }
    }
    try {
      const out = await fn(body);
      if (out && typeof out === "object" && "error" in out) return sendJson(res, out.status ?? 400, { error: out.error });
      return sendJson(res, 200, out ?? {});
    } catch (e) {
      return sendJson(res, e?.status ?? 500, { error: String(e?.message ?? e) });
    }
  };
}

// src/host.mjs
var execFile = promisify(execFileCb);
var BUILD = true ? "b2df00b2991f" : "dev";
var UNWIRED = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };
var name = "dsh-l";
var inject = ["webServer", "credentials"];
function buildRuntime(ctx, config, { makeTriage, onSettingsChange } = {}) {
  const dir = dataDir();
  const store = createStore({ filePath: join3(dir, "store.json") });
  const handlers = makeHandlers({
    store,
    provider: github_exports,
    triage: makeTriage ? makeTriage(dir) : UNWIRED,
    credentials: ctx.credentials,
    tokenRef: config?.githubTokenRef ?? null,
    execFile,
    fetch: globalThis.fetch,
    onSettingsChange
  });
  const table = {
    "/dsh-l/health": { GET: async () => ({ ok: true, name, build: BUILD, dataDir: dir }) },
    "/dsh-l/state": { GET: handlers.getState },
    "/dsh-l/refresh": { POST: handlers.postRefresh },
    "/dsh-l/watch": { GET: handlers.getWatch, PUT: handlers.putWatch },
    "/dsh-l/discover": { GET: handlers.getDiscover },
    "/dsh-l/triage": { POST: handlers.postTriage },
    "/dsh-l/candidate/override": { POST: handlers.postOverride },
    "/dsh-l/candidate/stage": { POST: handlers.postStage },
    "/dsh-l/candidate/gate": { POST: handlers.postGate },
    "/dsh-l/settings": { GET: handlers.getSettings, PUT: handlers.putSettings }
  };
  return { dir, store, handlers, table };
}
function apply(ctx, config = {}) {
  ctx.effect(() => {
    const runtime = buildRuntime(ctx, config);
    const trust = createTrustGuard(ctx, ctx.logger ?? console);
    const disposers = Object.entries(runtime.table).map(([path, methods]) => ctx.webServer.register({ kind: "exact", path, handler: makeHttpHandler({ methods, trust }) }));
    return () => {
      for (const d of disposers) {
        try {
          d?.();
        } catch {
        }
      }
    };
  }, "dsh-l:runtime");
}
export {
  apply,
  buildRuntime,
  inject,
  name
};
