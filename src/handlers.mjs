import { candidateKey } from "./store.mjs";
import { summarizeRun } from "./engine/scheduler.mjs";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const ACCOUNT_RE = /^[A-Za-z0-9-]{1,39}$/;
const MANUAL_STAGES = new Set(["inbox", "triaged", "gating", "shipped", "closed", "held"]);
const VALIDITY = new Set(["high", "medium", "low"]);
const URGENCY = new Set(["P0", "P1", "P2", "P3"]);
const ACTION = new Set(["start", "feedback", "close", "hold"]);
const fail = (error, status = 400) => ({ error, status });
const validTriage = (r) => Boolean(r) && VALIDITY.has(r.validity) && URGENCY.has(r.urgency) && ACTION.has(r.action);
const langOf = (v) => (v === "en" ? "en" : "zh-CN");

export function buildTaskPackage(candidate, repoInfo = null, now = () => new Date()) {
  const at = now().toISOString();
  // emit 块 = 一条可原样 POST 给 autoloop /v1/events 的事件（source 身份由摄入方密钥承担，不在信封内；
  // id 确定性 → 重发去重；信封字段白名单 id/type/subject/summary/detail/link/hops，见
  // dsh-agent-autoloop protocol/validate.ts FIELDS —— 未知字段会被拒收）。
  const emit = {
    id: "dsh-l:" + candidate.key + ":G1:" + at,
    type: "build.requested",
    subject: candidate.key,
    summary: candidate.title,
    link: candidate.url,
  };
  return {
    version: 1,
    kind: "dsh-l.task-package",
    candidate: { key: candidate.key, repo: candidate.repo, type: candidate.type, number: candidate.number, title: candidate.title, url: candidate.url },
    triage: candidate.triage
      ? { validity: candidate.triage.validity, urgency: candidate.triage.urgency, action: candidate.triage.action, reason: candidate.triage.reason }
      : null,
    gate: { gate: "G1", decision: "pass", via: "workbench-ui", at },
    // v1 floor：goal 复用候选标题，constraints/DoD 留空由执行器侧补全（design.md §6 裁决记录）。
    instructions: { goal: candidate.title, constraints: [], definitionOfDone: [] },
    repo: {
      defaultBranch: repoInfo?.defaultBranch ?? "main",
      cloneUrl: repoInfo?.cloneUrl ?? ("git@github.com:" + candidate.repo + ".git"),
      localPath: null,
    },
    emit,
  };
}

export function makeHandlers({ store, provider, triage, credentials, tokenRef = null, execFile, fetch = globalThis.fetch, now = () => new Date(), onSettingsChange = () => {}, listCatalog = async () => [], hostDefault = () => null, ghBin = null, ghTmp = null, spawn = null, workflowCatalog = { templates: [], warnings: [] } }) {
  const token = () => provider.resolveToken({ credentials, tokenRef, execFile, ghPath: ghBin });
  // 收活闸门：未绑定 GitHub 账号前，仓库勾选与摄取一律拒绝（design.md §4）。
  const requireAuth = () => (store.getAuth()?.account ? null : fail("auth-required", 401));
  // 登录状态机（进程内存，不落 store）：gh 后台安装与设备流授权的进行时状态。
  // 宿主重启即回到 idle——登录闸按 getAuth 重新判定，无残留半态。
  let ghInstallState = { phase: "idle" };            // idle|installing|done|failed(+version/error)
  let deviceState = { phase: "idle" };               // idle|pending|authorizing|authorized|expired|failed(+userCode/verificationUri/login/error)
  let viewerCache = null;                            // token→login 探测缓存（每进程一次；改绑极低频，可接受）
  return {
    async getState() {
      return { watch: store.getWatch(), snapshots: store.getSnapshots(), settings: store.getSettings(), candidates: store.listCandidates(), ingestLog: store.getIngestLog(), auth: store.getAuth(),
        runs: store.listRuns().map(summarizeRun), workflow: workflowCatalog };
    },
    async getAuth() {
      // gh 安装（PATH 优先、插件私有 bin 兜底）+ 凭据可得性；token 可得时顺带探一次身份（缓存）。
      const installed = await provider.ghAvailable({ execFile, ghPath: ghBin });
      const tk = await token();
      if (tk && viewerCache === null) {
        try { viewerCache = (await provider.getViewer({ token: tk, fetch })).login ?? null; } catch { viewerCache = null; }
      }
      return { ...store.getAuth(), installed, tokenAvailable: tk !== null, viewerLogin: tk ? viewerCache : null, install: { ...ghInstallState }, device: { ...deviceState } };
    },
    async postAuthBind(body) {
      // account 可选：无参绑定（登录闸「进入工作台」大按钮）直接采用 token 身份；
      // 显式传 account 仍做一致性校验（API 兼容与冒烟用）。
      const account = String(body?.account ?? "").trim();
      if (account && !ACCOUNT_RE.test(account)) return fail("invalid account");
      const tk = await token();
      if (!tk) return (await provider.ghAvailable({ execFile, ghPath: ghBin })) ? fail("gh-not-authorized", 409) : fail("gh-not-installed", 409);
      let viewer;
      try {
        viewer = await provider.getViewer({ token: tk, fetch });
      } catch (err) {
        return fail("token-invalid (" + String(err?.message ?? err) + ")", 409);
      }
      const login = String(viewer.login ?? "");
      if (account && account.toLowerCase() !== login.toLowerCase()) return fail("account-mismatch: " + login, 409);
      store.setAuth({ account: account || login, login });
      return store.getAuth();
    },
    async postAuthLogout() {
      // 工作台级退出：只清绑定，watch/候选/设置全保留；绝不调 gh auth logout、不撤销本机凭据。
      store.clearAuth();
      return { ok: true };
    },
    async postAuthInstallGh() {
      // 页内一键安装：官方 release 二进制装入插件数据目录（无 root）。立即返回，进度经 getAuth 轮询。
      if (ghInstallState.phase === "installing") return { started: true, phase: "installing" };
      ghInstallState = { phase: "installing" };
      provider.ghInstall({ fetch, execFile, destFile: ghBin, tmpDir: ghTmp })
        .then((r) => { ghInstallState = { phase: "done", version: r.version }; })
        .catch((err) => { ghInstallState = { phase: "failed", error: String(err?.message ?? err).slice(0, 200) }; });
      return { started: true, phase: "installing" };
    },
    async postAuthDeviceStart() {
      // 页内设备流授权：出 user_code + 验证链接，后台轮询；授权成功即移交 gh 凭据库并自动绑定。
      const tk = await token();
      if (tk) return fail("already-authorized", 409);
      if (deviceState.phase === "pending" || deviceState.phase === "authorizing") return { ...deviceState };
      let d;
      try {
        d = await provider.deviceCodeStart({ fetch });
      } catch (err) {
        return fail("device-start-failed: " + String(err?.message ?? err).slice(0, 160), 502);
      }
      deviceState = { phase: "pending", userCode: d.userCode, verificationUri: d.verificationUri, expiresAt: new Date(d.expiresAt).toISOString() };
      const run = async () => {
        let wait = d.interval ?? 5;
        while (Date.now() < d.expiresAt && deviceState.phase === "pending") {
          await new Promise((r) => setTimeout(r, wait * 1000));
          if (deviceState.phase !== "pending") return;
          let out;
          try { out = await provider.deviceCodePoll({ deviceCode: d.deviceCode, fetch }); } catch { continue; }
          if (out.token) {
            deviceState = { phase: "authorizing", userCode: deviceState.userCode, verificationUri: deviceState.verificationUri };
            try {
              await provider.ghLoginWithToken({ token: out.token, spawn, candidates: ["gh", ...(ghBin ? [ghBin] : [])] });
              const tk2 = await token();
              const viewer = await provider.getViewer({ token: tk2, fetch });
              viewerCache = viewer.login ?? null;
              store.setAuth({ account: viewerCache, login: viewerCache });
              deviceState = { phase: "authorized", login: viewerCache };
            } catch (err) {
              deviceState = { phase: "failed", error: String(err?.message ?? err).slice(0, 200) };
            }
            return;
          }
          if (out.error === "slow_down") { wait += 5; continue; }
          if (out.error === "authorization_pending") continue;
          deviceState = { phase: "failed", error: String(out.error).slice(0, 120) };
          return;
        }
        if (deviceState.phase === "pending") deviceState = { phase: "expired" };
      };
      run();
      return { ...deviceState };
    },
    async getAuthDevice() {
      return { ...deviceState };
    },
    async postRefresh() {
      const gate = requireAuth(); if (gate) return gate;
      const tk = await token();
      const perRepo = {};
      const merged = [];
      let sweep = { closed: [], flagged: [] };
      for (const repo of store.getWatch().repos) {
        try {
          const [issues, pulls] = await Promise.all([
            provider.listOpenIssues({ repo, token: tk, fetch }),
            provider.listOpenPulls({ repo, token: tk, fetch }),
          ]);
          merged.push(...issues, ...pulls);
          perRepo[repo] = { issues: issues.length, pulls: pulls.length, fetchedAt: now().toISOString(), error: null };
          // 仓库事实（任务包 repo 块）：失败不影响摄取本体，保留旧事实。
          try { store.setRepoFacts(repo, await provider.getRepo({ repo, token: tk, fetch })); } catch {}
          // 上游回收只对摄取成功的仓执行（失败仓的 open 集合未知，回收会误伤）。
          const liveKeys = [...issues, ...pulls].map((c) => candidateKey(c.repo, c.type, c.number));
          const s = store.sweepUpstream(repo, liveKeys);
          sweep.closed.push(...s.closed); sweep.flagged.push(...s.flagged);
        } catch (err) {
          perRepo[repo] = { issues: 0, pulls: 0, fetchedAt: now().toISOString(), error: String(err?.message ?? err) };
        }
      }
      store.upsertCandidates(merged);
      store.setSnapshots(perRepo);
      const failedRepos = Object.entries(perRepo).filter(([, r]) => r.error).map(([repo]) => repo);
      store.appendIngestLog({ total: merged.length, authenticated: tk !== null, failedRepos, closed: sweep.closed.length, flagged: sweep.flagged.length });
      return { perRepo, total: merged.length, authenticated: tk !== null, sweep };
    },
    async getModels() {
      return { providers: await listCatalog(), hostDefault: hostDefault() };
    },
    async getWatch() { return store.getWatch(); },
    async putWatch(body) {
      const gate = requireAuth(); if (gate) return gate;
      const repos = body?.repos;
      if (!Array.isArray(repos) || repos.some((r) => typeof r !== "string" || !REPO_RE.test(r))) return fail("invalid repos");
      store.setWatch(repos);
      return store.getWatch();
    },
    async getDiscover() {
      const gate = requireAuth(); if (gate) return gate;
      return { repos: await provider.discoverRepos({ token: await token(), fetch }) };
    },
    async postTriage(body) {
      const keys = body?.keys;
      if (!Array.isArray(keys) || keys.length === 0 || keys.length > 10) return fail("keys must be 1..10");
      const lang = langOf(body?.lang);
      const candidates = keys.map((k) => store.getCandidate(k)).filter(Boolean);
      if (candidates.length === 0) return fail("no candidates", 404);
      let result;
      try {
        result = await triage.runTriage({ candidates, lang, model: store.getSettings().triageModel });
      } catch (err) {
        // 崩溃路径同样落痕（http 层只会裸 500，不留痕对「回溯」不可见）。
        const msg = String(err?.message ?? err);
        for (const c of candidates) store.recordHistory(c.key, "triage.error", msg);
        return fail("triage-crashed: " + msg, 502);
      }
      if (result.failed) {
        // design.md §5：失败也留痕（候选留原阶段，可重跑）——不落痕的失败对「回溯」不可见。
        for (const c of candidates) store.recordHistory(c.key, "triage.error", result.failed);
        return fail(result.failed, 502);
      }
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
        const pkg = buildTaskPackage(c, store.getRepoFacts(c.repo), now);
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
      const patch = {};
      if (body && "intervalMinutes" in body) {
        const minutes = body.intervalMinutes;
        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return fail("invalid settings");
        patch.intervalMinutes = minutes;
      }
      if (body && "triageModel" in body) {
        const sel = body.triageModel;
        if (sel === null) {
          patch.triageModel = null;
        } else {
          if (!sel || typeof sel.provider !== "string" || typeof sel.model !== "string") return fail("invalid settings");
          const catalog = await listCatalog();
          const listed = catalog.some((p) => p.provider === sel.provider && p.models.some((m) => m.id === sel.model));
          if (!listed) return fail("model-not-in-catalog");
          patch.triageModel = { provider: sel.provider, model: sel.model };
        }
      }
      if (body && "engineConcurrency" in body) {   // design-v2 §12.9：M2 引擎并发上限
        const n = body.engineConcurrency;
        if (!Number.isInteger(n) || n < 1 || n > 4) return fail("invalid settings");
        patch.engineConcurrency = n;
      }
      if (body && "workspaceRetentionDays" in body) {
        const d = body.workspaceRetentionDays;
        if (!Number.isInteger(d) || d < 1 || d > 90) return fail("invalid settings");
        patch.workspaceRetentionDays = d;
      }
      if (Object.keys(patch).length === 0) return fail("invalid settings");
      store.setSettings(patch);
      onSettingsChange(store.getSettings());
      return store.getSettings();
    },
  };
}
