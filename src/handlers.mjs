import { candidateKey } from "./store.mjs";
import { summarizeRun } from "./engine/scheduler.mjs";
import { BUILTIN_ROLES } from "./workflows/roles.mjs";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const ACCOUNT_RE = /^[A-Za-z0-9-]{1,39}$/;
const MANUAL_STAGES = new Set(["inbox", "triaged", "gating", "shipped", "closed", "held"]);
const VALIDITY = new Set(["high", "medium", "low"]);
const URGENCY = new Set(["P0", "P1", "P2", "P3"]);
const ACTION = new Set(["start", "feedback", "close", "hold"]);
const fail = (error, status = 400) => ({ error, status });
const validTriage = (r) => Boolean(r) && VALIDITY.has(r.validity) && URGENCY.has(r.urgency) && ACTION.has(r.action);
const langOf = (v) => (v === "en" ? "en" : "zh-CN");

export function buildTaskPackage(candidate, repoInfo = null, now = () => new Date(), ctx = {}) {
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
  const pkg = {
    version: ctx.role || ctx.workflow ? 2 : 1,
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
  // 任务包 v2（design-v2 §6/M4 T5）：role/workflow 块在位 → version:2 新增块；否则 version:1 零变化。
  if (ctx.role || ctx.workflow) {
    pkg.role = ctx.role ?? { roleId: null, name: null, executionPolicy: null };
    pkg.workflow = ctx.workflow ?? { runId: null, nodeId: null, templateId: null, templateRevision: null };
  }
  return pkg;
}

export function makeHandlers({ store, provider, triage, credentials, tokenRef = null, execFile, fetch = globalThis.fetch, now = () => new Date(), onSettingsChange = () => {}, listCatalog = async () => [], hostDefault = () => null, ghBin = null, ghTmp = null, spawn = null, workflowCatalog = { templates: [], warnings: [] }, engine = null, feishu = null, templates = {} }) {
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
        // M2 别名（design-v2 §12.3）：G1 放行即建 run；pkg 已由上方 setGate 落库（评审 R1-16）。
        if (engine) {
          try {
            const { runId } = engine.startRun(key, { taskPackage: pkg });
            return { ok: true, taskPackage: pkg, runId };
          } catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
        }
        return { ok: true, taskPackage: pkg };
      }
      store.setGate(key, "G1", "reject", note ?? "", null, "workbench-ui");
      store.setStage(key, "triaged", "G1 reject");
      return { ok: true, taskPackage: null };
    },
    // ---- M2 run 路由（design-v2 §7/§12）：全部走收活闸门 + engine 门槛（未装配 503）。 ----
    async postRunStart(body) {
      if (!engine) return fail("engine-not-wired", 503);
      const gate = requireAuth(); if (gate) return gate;
      const key = body?.key;
      const c = store.getCandidate(key);
      if (!c) return fail("not found", 404);
      if (engine.hasAliveRun(key)) return fail("run-already-active", 409);   // 评审 R1-5：先于闸门校验
      if (c.stage !== "gating") return fail("gate-requires-gating", 409);
      const pkg = buildTaskPackage(c, store.getRepoFacts(c.repo), now);
      store.setGate(key, "G1", "pass", body?.note ?? "", pkg, "workbench-ui");
      store.setStage(key, "building", "G1 pass");
      try {
        const { runId } = engine.startRun(key, { taskPackage: pkg });
        return { ok: true, taskPackage: pkg, runId, workspace: "cloning" };
      } catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
    },
    async postRunGate(body) {
      if (!engine) return fail("engine-not-wired", 503);
      const gate = requireAuth(); if (gate) return gate;
      const { runId, nodeId, decision, note, targetNode } = body ?? {};
      if (!["pass", "reject"].includes(decision)) return fail("invalid gate");
      try { engine.applyGateDecision(runId, nodeId, decision, targetNode ?? null); return { ok: true }; }
      catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
    },
    async postRunCancel(body) {
      if (!engine) return fail("engine-not-wired", 503);
      const gate = requireAuth(); if (gate) return gate;
      try { engine.cancelRun(body?.runId, body?.reason ?? "user"); return { ok: true }; }
      catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
    },
    async postRunRetry(body) {
      if (!engine) return fail("engine-not-wired", 503);
      const gate = requireAuth(); if (gate) return gate;
      try { engine.retryNode(body?.runId, body?.nodeId); return { ok: true }; }
      catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
    },
    // G3 发版闸人工确认（design-v2 §13.5）：只落痕，不代跑发版；重复确认 409。
    async postReleaseConfirm(body) {
      const gate = requireAuth(); if (gate) return gate;
      const key = body?.key;
      const c = store.getCandidate(key);
      if (!c) return fail("not found", 404);
      if (c.stage !== "shipped") return fail("release-requires-shipped", 409);
      if (c.release?.confirmedAt) return fail("release-already-confirmed", 409);
      store.setRelease(key, body?.note ?? "");
      return { ok: true };
    },
    // 飞书（design-v2 §13.3）：webhook 写 credentials（ref=DSH_L_FEISHU_WEBHOOK_URL，不落 store）；
    // 测试发送走注入通知器；未装配 503 feishu-not-wired。
    async postFeishuTest() {
      const gate = requireAuth(); if (gate) return gate;
      if (!feishu) return fail("feishu-not-wired", 503);
      const r = await feishu.notifier.testSend();
      return { ok: true, sent: Boolean(r?.sent) };
    },
    async putFeishuWebhook(body) {
      const gate = requireAuth(); if (gate) return gate;
      if (!feishu) return fail("feishu-not-wired", 503);
      const url = String(body?.url ?? "");
      const PREFIX = "https://open.feishu.cn/open-apis/bot/v2/hook/";
      if (!url.startsWith(PREFIX)) return fail("invalid webhook");
      await feishu.setWebhook(url);
      return { ok: true };
    },
    // 角色三方法（design-v2 §14/M4 T6）：引用守卫在 handler 侧（templates 全量定义 + 存活 run 快照）。
    async postRolesUpsert(body) {
      const gate = requireAuth(); if (gate) return gate;
      const role = body?.role;
      if (!role || typeof role.id !== "string" || !role.id.trim()) return fail("role id required");
      if (!["ask", "auto"].includes(role?.executionPolicy)) return fail("invalid executionPolicy");
      if (!role.name) return fail("role name required");
      store.upsertRole({ id: role.id, name: role.name, description: role.description ?? "", prompt: role.prompt ?? "", executionPolicy: role.executionPolicy });
      return { ok: true };
    },
    async postRolesDelete(body) {
      const gate = requireAuth(); if (gate) return gate;
      const id = body?.id;
      if (!id) return fail("id required");
      // 引用守卫（评审 P2②）：扫 templates 全量定义 + 存活 run 快照的 roleId
      const refs = [];
      for (const t of Object.values(templates)) {
        for (const n of t.nodes ?? []) if (n.type === "agent" && n.roleId === id) refs.push(t.id + "/" + n.id);
      }
      for (const run of store.listRuns()) {
        if (["running", "waiting"].includes(run.status)) {
          for (const [nid, s] of Object.entries(run.nodeStates ?? {})) {
            if (s.roleId === id && ["running", "waiting", "ready"].includes(s.status)) refs.push(run.id + "/" + nid);
          }
        }
      }
      if (refs.length > 0) return fail("role-in-use: " + id + " (" + refs.join(", ") + ")", 409);
      store.deleteRole(id);
      return { ok: true };
    },
    async getRoles() {
      const gate = requireAuth(); if (gate) return gate;
      // 合并单列表（评审 P9③）：builtin + 用户覆盖（overridden:true + 用户 prompt）+ 纯自定义
      const roles = [];
      for (const r of Object.values(BUILTIN_ROLES)) {
        const override = store.getRole(r.id);
        roles.push({ ...r, overridden: Boolean(override) });   // 评审 P9③：显式 false/true，不省略
      }
      for (const r of store.listRoles()) {
        if (!BUILTIN_ROLES[r.id]) roles.push({ ...r, builtin: false });
      }
      return { ok: true, roles };
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
