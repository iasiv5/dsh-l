const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const MANUAL_STAGES = new Set(["inbox", "triaged", "gating", "shipped", "closed", "held"]);
const VALIDITY = new Set(["high", "medium", "low"]);
const URGENCY = new Set(["P0", "P1", "P2", "P3"]);
const ACTION = new Set(["start", "feedback", "close", "hold"]);
const fail = (error, status = 400) => ({ error, status });
const validTriage = (r) => Boolean(r) && VALIDITY.has(r.validity) && URGENCY.has(r.urgency) && ACTION.has(r.action);
const langOf = (v) => (v === "en" ? "en" : "zh-CN");

export function buildTaskPackage(candidate, now = () => new Date()) {
  const at = now().toISOString();
  return {
    version: 1,
    kind: "dsh-l.task-package",
    candidate: { key: candidate.key, repo: candidate.repo, type: candidate.type, number: candidate.number, title: candidate.title, url: candidate.url },
    triage: candidate.triage
      ? { validity: candidate.triage.validity, urgency: candidate.triage.urgency, action: candidate.triage.action, reason: candidate.triage.reason }
      : null,
    gate: { gate: "G1", decision: "pass", via: "workbench-ui", at },
    instructions: { goal: candidate.title, constraints: [], definitionOfDone: [] },
    repo: { defaultBranch: "main", cloneUrl: "git@github.com:" + candidate.repo + ".git", localPath: null },
    emit: { source: "dsh-l", type: "build.requested", at },
  };
}

export function makeHandlers({ store, provider, triage, credentials, tokenRef = null, execFile, fetch = globalThis.fetch, now = () => new Date(), onSettingsChange = () => {} }) {
  const token = () => provider.resolveToken({ credentials, tokenRef, execFile });
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
            provider.listOpenPulls({ repo, token: tk, fetch }),
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
    async getWatch() { return store.getWatch(); },
    async putWatch(body) {
      const repos = body?.repos;
      if (!Array.isArray(repos) || repos.some((r) => typeof r !== "string" || !REPO_RE.test(r))) return fail("invalid repos");
      store.setWatch(repos);
      return store.getWatch();
    },
    async getDiscover() { return { repos: await provider.discoverRepos({ token: await token(), fetch }) }; },
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
    async getSettings() { return store.getSettings(); },
    async putSettings(body) {
      const minutes = body?.intervalMinutes;
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return fail("invalid settings");
      store.setSettings({ intervalMinutes: minutes });
      onSettingsChange(store.getSettings());
      return store.getSettings();
    },
  };
}
