import { candidateKey, makeRunId } from "./store.mjs";
import { scopesOk } from "./github.mjs";   // scope 规则单一来源（纯函数；provider 命名空间之外的规范引用）
import { summarizeRun } from "./engine/scheduler.mjs";
import { BUILTIN_ROLES, resolveRole } from "./workflows/roles.mjs";
import { LOOP_V1 } from "./workflows/builtin.mjs";
import { resolveLocalWorkspace } from "./worksession.mjs";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const ACCOUNT_RE = /^[A-Za-z0-9-]{1,39}$/;
const MANUAL_STAGES = new Set(["inbox", "triaged", "gating", "shipped", "closed", "held"]);
const VALIDITY = new Set(["high", "medium", "low"]);
const URGENCY = new Set(["P0", "P1", "P2", "P3"]);
const ACTION = new Set(["start", "feedback", "close", "hold"]);
const REFRESH_BUDGET = 60;              // Task 6/R3Q1c：每次刷新的请求预算硬上限（跨仓共享，pagedGet 逐页扣减）
const VERIFY_TTL_MS = 30 * 60 * 1000;   // B10/R2Q3：verifiedAt 超时才在摄取前静默校验（打开面板的校验由客户端触发）
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

export function makeHandlers({ store, provider, triage, credentials, tokenRef = null, githubClientId = null, execFile, fetch = globalThis.fetch, now = () => new Date(), onSettingsChange = () => {}, listCatalog = async () => [], hostDefault = () => null, ghBin = null, ghTmp = null, spawn = null, workflowCatalog = { templates: [], warnings: [] }, engine = null, feishu = null, templates = {}, startWork = null, home = null, stat = null, workspace = null, listPresets = async () => [] }) {
  // 两级 token 链（gh-as-source 2026-11-20）：credentials 引用覆写 → gh 登录态兜底；token 只存 gh 凭据库。
  const token = () => provider.resolveToken({ credentials, tokenRef, execFile, ghPath: ghBin });
  // 任务包 v2 生产接线（M4 契约补全，M5 后落账）：makeRunId 先行 + 首个 agent 节点角色 + workflow 块；
  // postRunStart 与 postGate 别名两路由共用（防双轨不一致）。
  const resolveStartTpl = (templateId) => (templateId ? (templates[templateId] ?? null) : LOOP_V1);
  const buildV2Ctx = (tpl, runId) => {
    const firstAgent = (tpl?.nodes ?? []).find((n) => n.type === "agent");
    const role = firstAgent ? resolveRole(firstAgent.roleId, Object.fromEntries(store.listRoles().map((r) => [r.id, r]))) : null;
    return {
      role: role ? { roleId: role.id, name: role.name, executionPolicy: role.executionPolicy } : null,
      workflow: { runId, nodeId: firstAgent?.id ?? null, templateId: tpl.id, templateRevision: tpl.revision ?? null },
    };
  };
  // 收活闸门：未绑定 GitHub 账号前，仓库勾选与摄取一律拒绝（design.md §4）。
  const requireAuth = () => (store.getAuth()?.account ? null : fail("auth-required", 401));
  // 登录状态机（进程内存，不落 store）：gh 后台安装与设备流授权的进行时状态。
  // 宿主重启即回到 idle——登录闸按 getAuth 重新判定，无残留半态。
  let ghInstallState = { phase: "idle" };            // idle|installing|done|failed(+version/error)
  let deviceState = { phase: "idle" };               // idle|pending|authorizing|authorized|expired|failed(+userCode/verificationUri/login/error)
  let viewerCache = null;                            // token→login 探测缓存（每进程一次；改绑极低频，可接受）
  let refreshInFlight = false;                       // Task 6 单飞互斥：刷新进行中新触发直接拒绝（不排队）
  let ghProbeCache = { at: 0, val: null };           // 评审 S4：gh 安装探测 30s 进程缓存（计划 Task 5 明文）——2s 轮询不反复 spawn；install 完成时失效
  const GH_PROBE_TTL_MS = 30_000;
  const ghProbe = async () => {
    if (ghProbeCache.val !== null && Date.now() - ghProbeCache.at < GH_PROBE_TTL_MS) return ghProbeCache.val;
    const val = await provider.ghAvailable({ execFile, ghPath: ghBin });
    ghProbeCache = { at: Date.now(), val };
    return val;
  };
  const ghInstalled = async () => (await ghProbe()).installed === true;   // gh-as-source：ghAvailable 返回 { installed, version }（版本供 gate1 展示）
  let rateLimitedUntil = null;                       // 最近一次限流恢复时刻（ISO，进程内存）——B9「限流中」横幅数据源；403/429 不伤凭据健康
  // credentialOk（Task 5/R1-4）：token 可解析 ∧ healthy ∧ verifiedAt ∧ scopesOk——device-start 守卫与 G3 闸共用此定义。
  const credentialOkFor = (tk) => {
    if (!tk) return false;
    const c = store.getCredential();
    return c.healthy !== false && Boolean(c.verifiedAt) && scopesOk(c.scopes);
  };
  // 凭据端点共用错误映射：token-invalid 置 unhealthy；rate-limited 置横幅时刻；其余 credential-verify-failed（可重试、不暗示令牌坏）。
  const credentialErrorMap = (err) => {
    const msg = String(err?.message ?? err);
    if (msg.startsWith("rate-limited:")) {
      const sec = Number(msg.slice("rate-limited:".length)) || 60;
      rateLimitedUntil = new Date(Date.now() + sec * 1000).toISOString();
      return fail(msg, 409);
    }
    if (msg === "token-invalid") { store.setCredential({ healthy: false }); return fail("token-invalid", 409); }
    return fail("credential-verify-failed: " + msg, 409);
  };
  return {
    async getState() {
      const c = store.getCredential();
      return { watch: store.getWatch(), snapshots: store.getSnapshots(), settings: store.getSettings(), candidates: store.listCandidates().map((cd) => ({ ...cd, work: store.getWorkSession(cd.key) })), ingestLog: store.getIngestLog(),
        auth: { ...store.getAuth(), credential: { configured: Boolean(c.source || c.verifiedAt), healthy: c.healthy !== false, verifiedAt: c.verifiedAt ?? null, rateLimitedUntil } },
        runs: store.listRuns().map(summarizeRun), workflow: workflowCatalog };
    },
    async getAuth() {
      // 门禁重塑（Task 5）：三关布尔 + 凭据卡详情。account 保留供客户端回显绑定态；token 在手仍顺带探身份（缓存）。
      const probe = await ghProbe();
      const tk = await token();
      if (tk && viewerCache === null) {
        try { viewerCache = (await provider.getViewer({ token: tk, fetch })).login ?? null; } catch { viewerCache = null; }
      }
      const c = store.getCredential();
      return {
        account: store.getAuth().account,
        gates: { ghInstalled: probe.installed === true, ghLogin: tk !== null, credentialOk: credentialOkFor(tk), ghVersion: probe.version ?? null },
        viewerLogin: tk ? viewerCache : null,
        credential: {
          configured: Boolean(c.source || c.verifiedAt),   // gh-as-source：凭据元数据在场（来源/校验痕）——token 不落 store
          source: c.source ?? null,
          scopes: c.scopes ?? null,
          verifiedAt: c.verifiedAt ?? null,
          healthy: c.healthy !== false,
          ghWrittenByUs: c.ghWrittenAt != null,
          rateLimitedUntil,
        },
        install: { ...ghInstallState },
        device: { ...deviceState },
      };
    },
    async postAuthBind(body) {
      // account 可选：无参绑定（登录闸「进入工作台」大按钮）直接采用 token 身份；
      // 显式传 account 仍做一致性校验（API 兼容与冒烟用）。
      const account = String(body?.account ?? "").trim();
      if (account && !ACCOUNT_RE.test(account)) return fail("invalid account");
      const tk = await token();
      if (!tk) return (await ghInstalled()) ? fail("gh-not-authorized", 409) : fail("gh-not-installed", 409);
      let viewer;
      try {
        viewer = await provider.getViewer({ token: tk, fetch });
      } catch (err) {
        if (err?.status === 401) store.setCredential({ healthy: false });   // 被动失效（B10）：401 才伤凭据健康（err.status 判据）
        return fail("token-invalid (" + String(err?.message ?? err) + ")", 409);
      }
      const login = String(viewer.login ?? "");
      if (account && account.toLowerCase() !== login.toLowerCase()) return fail("account-mismatch: " + login, 409);
      store.setAuth({ account: account || login, login });
      if (deviceState.phase === "authorized") deviceState = { phase: "idle" };   // authorized 已被绑定消费（gh-as-source 一跳一跳缺陷根治：终态不残留）
      try {
        // B3 实读 scopes：同端点 verifyToken（ETag 生效，通常 304 免计费），scopes/verifiedAt 落凭据块。
        const v = await provider.verifyToken(tk, { fetch });
        store.setCredential({ scopes: v.scopes, verifiedAt: v.verifiedAt, healthy: true });
        rateLimitedUntil = null;
      } catch {}
      return store.getAuth();
    },
    async postAuthLogout() {
      // 工作台级退出：只清绑定，watch/候选/设置全保留；绝不调 gh auth logout、不撤销本机凭据。
      // 残留 authorized 设备态一并复位 idle——否则门禁重挂即 onConnected→reload 循环（2026-11-20 一跳一跳缺陷根治）。
      store.clearAuth();
      deviceState = { phase: "idle" };
      return { ok: true };
    },
    async postAuthInstallGh() {
      // 页内一键安装：官方 release 二进制装入插件数据目录（无 root）。立即返回，进度经 getAuth 轮询。
      if (ghInstallState.phase === "installing") return { started: true, phase: "installing" };
      ghInstallState = { phase: "installing" };
      provider.ghInstall({ fetch, execFile, destFile: ghBin, tmpDir: ghTmp })
        .then((r) => { ghInstallState = { phase: "done", version: r.version }; ghProbeCache = { at: 0, val: null }; })   // 装完即失效探测缓存（S4）
        .catch((err) => { ghInstallState = { phase: "failed", error: String(err?.message ?? err).slice(0, 200) }; });
      return { started: true, phase: "installing" };
    },
    async postAuthDeviceStart() {
      // 页内设备流授权：出 user_code + 验证链接，后台轮询；授权成功即移交 gh 凭据库并自动绑定。
      const tk = await token();
      // R1-4（主人签核·收窄版）：仅「token 可解析 ∧ credentialOk」（就绪态）拒绝重复发起；
      // 非就绪态（未配置/失效/缺权限）允许重授权——成功后同槽覆盖（loopforge 同语义）。
      if (tk && credentialOkFor(tk)) return fail("already-authorized", 409);
      if (deviceState.phase === "pending" || deviceState.phase === "authorizing") return { ...deviceState };
      if (!(await ghInstalled())) return fail("gh-not-installed", 409);   // gh-as-source：token 终点站在场才允许发起（UI 已收敛为安装优先）
      let d;
      try {
        d = await provider.deviceCodeStart({ fetch, clientId: githubClientId });
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
          try { out = await provider.deviceCodePoll({ deviceCode: d.deviceCode, fetch, clientId: githubClientId }); } catch { continue; }
          if (out.token) {
            deviceState = { phase: "authorizing", userCode: deviceState.userCode, verificationUri: deviceState.verificationUri };
            try {
              await provider.ghLoginWithToken({ token: out.token, spawn, candidates: ["gh", ...(ghBin ? [ghBin] : [])] });
              const tk2 = await token();
              const v = await provider.verifyToken(tk2, { fetch });   // R1-2：getViewer→verifyToken，同端点一次取 login+实读 scopes
              viewerCache = v.login ?? null;
              store.setAuth({ account: viewerCache, login: viewerCache });
              store.setCredential({ source: "device-flow", scopes: v.scopes, verifiedAt: v.verifiedAt, healthy: true, ghWrittenAt: now().toISOString() });   // gh-as-source：token 只存 gh，落元数据
              rateLimitedUntil = null;
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
    // ── 凭据端点（Task 5）：重新校验 / 手动令牌（verify-before-save）/ 删除凭证 ──
    async postCredentialVerify() {
      const tk = await token();
      if (!tk) return fail("credential-missing", 409);
      try {
        const v = await provider.verifyToken(tk, { fetch });
        store.setCredential({ scopes: v.scopes, verifiedAt: v.verifiedAt, healthy: true });
        rateLimitedUntil = null;
        return { login: v.login, scopes: v.scopes, fineGrained: v.fineGrained, verifiedAt: v.verifiedAt };
      } catch (err) { return credentialErrorMap(err); }
    },
    async putCredential(body) {
      // gh-as-source（2026-11-20）：verify-before-handoff → 强制移交 gh 凭据库 → 落元数据（store 永不落 token 材料）。
      const tk = String(body?.token ?? "");
      if (!tk || tk.length > 4096 || /\s/.test(tk)) return fail("credential-format", 409);
      if (!(await ghInstalled())) return fail("gh-not-installed", 409);   // 令牌唯一居所不在场
      let v;
      try {
        v = await provider.verifyToken(tk, { fetch });   // 校验不过：不动 gh、不落库
      } catch (err) {
        const msg = String(err?.message ?? err);
        if (msg === "token-invalid") return fail("credential-invalid", 409);   // 不暗示令牌坏之外的重试语义由前端呈现
        return credentialErrorMap(err);
      }
      try {
        await provider.ghLoginWithToken({ token: tk, spawn, candidates: ["gh", ...(ghBin ? [ghBin] : [])] });   // 强制移交：gh 是唯一令牌居所
      } catch (err) {
        return fail("gh-handoff-failed: " + String(err?.message ?? err).slice(0, 160), 502);   // 移交失败不落任何凭据态
      }
      store.setCredential({ source: "manual-pat", scopes: v.scopes, verifiedAt: v.verifiedAt, healthy: true, ghWrittenAt: now().toISOString() });
      viewerCache = null;   // R1-5：换令牌（可能换账号）→ viewer 探测缓存失效
      rateLimitedUntil = null;
      return { login: v.login, scopes: v.scopes, fineGrained: v.fineGrained, verifiedAt: v.verifiedAt };
    },
    async deleteCredential(body) {
      const ghLogoutRequested = body?.ghLogout === true;
      const ours = store.getCredential()?.ghWrittenAt != null;   // gh 登录是否为工作台设备流所建（R2Q2 门控）
      store.clearCredential();
      store.clearAuth();
      deviceState = { phase: "idle" };   // 残留 authorized 同步复位（2026-11-20 一跳一跳缺陷根治）
      viewerCache = null;   // R1-5
      if (!ghLogoutRequested) return { cleared: true, ghLogoutDone: false };
      if (!ours) return { ...fail("gh-not-ours", 409), cleared: true, ghLogoutDone: false };   // 清除已执行；gh 登录非工作台所建，不代作主
      let ghLogoutDone = false;
      if (typeof provider.ghLogout === "function") {
        try { await provider.ghLogout({ spawn, candidates: ["gh", ...(ghBin ? [ghBin] : [])] }); ghLogoutDone = true; }
        catch {}   // 非零退出仅记录不回滚（工作台侧清除已生效）
      }
      return { cleared: true, ghLogoutDone };
    },
    async postRefresh() {
      const gate = requireAuth(); if (gate) return gate;
      if (refreshInFlight) return fail("refresh-in-progress", 409);   // Task 6 单飞：进行中新触发跳过不排队
      refreshInFlight = true;
      try {
        const tk = await token();
        // 摄取前静默校验（B10/R2Q3）：verifiedAt 超时或从未校验才打一次 verifyToken（ETag 生效，未变 304 免计费）。
        const verifiedAtMs = store.getCredential().verifiedAt ? Date.parse(store.getCredential().verifiedAt) : NaN;
        if (tk && (!Number.isFinite(verifiedAtMs) || Date.now() - verifiedAtMs > VERIFY_TTL_MS)) {
          try {
            const v = await provider.verifyToken(tk, { fetch });
            store.setCredential({ scopes: v.scopes, verifiedAt: v.verifiedAt, healthy: true });
            rateLimitedUntil = null;
          } catch (err) {
            const msg = String(err?.message ?? err);
            if (msg === "token-invalid") { store.setCredential({ healthy: false }); return fail("credential-unhealthy", 409); }
            if (msg.startsWith("rate-limited:")) return credentialErrorMap(err);
            return fail("credential-verify-failed: " + msg, 409);   // 预校验网络失败不盲目摄取
          }
        }
        const budget = { remaining: REFRESH_BUDGET };   // R3Q1c：跨仓共享预算，pagedGet 逐页扣减、耗尽置 partial
        const perRepo = {};
        const merged = [];
        let sweep = { closed: [], flagged: [] };
        let credentialBroke = false;
        for (const repo of store.getWatch().repos) {
          try {
            const [issues, pulls] = await Promise.all([
              provider.listOpenIssues({ repo, token: tk, fetch, budget }),
              provider.listOpenPulls({ repo, token: tk, fetch, budget }),
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
            if (err?.status === 401) {
              credentialBroke = true;   // B10 被动失效：401 才伤凭据健康；已获取的仓照常入库
              store.setCredential({ healthy: false });
            }
            perRepo[repo] = { issues: 0, pulls: 0, fetchedAt: now().toISOString(), error: String(err?.message ?? err) };
          }
        }
        const partial = Boolean(budget.exhausted);
        store.upsertCandidates(merged);
        store.setSnapshots(perRepo);
        const failedRepos = Object.entries(perRepo).filter(([, r]) => r.error).map(([repo]) => repo);
        store.appendIngestLog({ total: merged.length, authenticated: tk !== null, failedRepos, closed: sweep.closed.length, flagged: sweep.flagged.length, partial });
        if (credentialBroke) return { ...fail("credential-unhealthy", 409), perRepo, total: merged.length, partial };
        return { perRepo, total: merged.length, authenticated: tk !== null, sweep, partial };
      } finally { refreshInFlight = false; }
    },
    async getModels() {
      // presets（Task 6）：开工会话 preset 下拉数据源（agentPresets 名册，host 注入 listPresets）；
      // 规整为 id 串（AgentPreset 对象取 id，字符串直通——与 putSettings 校验同一规整）。
      const roster = (await listPresets()).map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean);
      return { providers: await listCatalog(), hostDefault: hostDefault(), presets: roster };
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
      try {
        return { repos: await provider.listUserRepos({ token: await token(), fetch }) };
      } catch (err) {
        if (err?.status === 401) {
          store.setCredential({ healthy: false });   // B10/R1-14：discover 独立出网路径的被动失效
          return fail("credential-unhealthy", 409);
        }
        throw err;
      }
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
        const runId = makeRunId(now);   // v2 接线（M4 契约补全）：与 postRunStart 同款 runId 先行
        const pkg = buildTaskPackage(c, store.getRepoFacts(c.repo), now, buildV2Ctx(LOOP_V1, runId));
        store.setGate(key, "G1", "pass", note ?? "", pkg, "workbench-ui");
        store.setStage(key, "building", "G1 pass");
        // M2 别名（design-v2 §12.3）：G1 放行即建 run；pkg 已由上方 setGate 落库（评审 R1-16）。
        if (engine) {
          try {
            engine.startRun(key, { taskPackage: pkg, runId });
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
      const templateId = body?.templateId ?? null;
      const tpl = resolveStartTpl(templateId);
      if (!tpl) return fail("unknown-template: " + templateId, 404);   // 早守卫：不动候选即拒
      const runId = makeRunId(now);   // runId 先行（M4 契约）：包内 workflow.runId 与 run 落库一致
      const pkg = buildTaskPackage(c, store.getRepoFacts(c.repo), now, buildV2Ctx(tpl, runId));
      store.setGate(key, "G1", "pass", body?.note ?? "", pkg, "workbench-ui");
      store.setStage(key, "building", "G1 pass");
      try {
        engine.startRun(key, { taskPackage: pkg, templateId, runId });
        return { ok: true, taskPackage: pkg, runId, workspace: "cloning" };
      } catch (e) { return fail(String(e?.message ?? e), e?.status ?? 400); }
    },
    // ---- 开工会话（GLOSSARY「开工会话」）：G1 双出口之二「我来开」。守卫序（架构快照 1-7）：
    // auth → 404 → 活跃行复用快路径（零记账零 startWork）→ cwd 冲突 409 → another 需 G1 pass →
    // 引擎互斥（fresh 恒查；another 仅 managed——托管目录与引擎 run 共享 dirOf(key) 同树，R3-1）→
    // fresh stage 守卫 → 工作区解析（422/502 早守卫先于记账）→ fresh 记账（setGate+setStage）→
    // startWork 创建事务（create→send→索引；send 失败回滚，评审 R1-3）。
    async postWorkStart(body) {
      if (!startWork) return fail("work-not-wired", 503);
      const gate = requireAuth(); if (gate) return gate;
      const key = body?.key;
      const c = store.getCandidate(key);
      if (!c) return fail("not found", 404);
      const another = body?.another === true;
      const managed = body?.workspace === "managed";
      const cwdIn = typeof body?.cwd === "string" && body.cwd ? body.cwd : null;
      const active = store.getWorkSession(key);
      if (active && !another && (!cwdIn || cwdIn === active.cwd)) {
        return { ok: true, sessionId: active.sessionId, reused: true, taskPackage: null };
      }
      if (active && !another && cwdIn && cwdIn !== active.cwd) return fail("work-cwd-conflict", 409);
      if (another && c.gates?.G1?.decision !== "pass") return fail("gate-requires-gating", 409);
      const engineBusy = engine ? engine.hasAliveRun(key) : false;
      if (engineBusy && (!another || managed)) return fail("run-already-active", 409);
      if (!another && c.stage !== "gating") return fail("gate-requires-gating", 409);
      let cwd = cwdIn;
      if (!cwd) {
        if (managed) {
          try {
            const r = await workspace.ensure({ key, repo: c.repo, branch: "work-" + c.type + "-" + c.number });
            cwd = r.dir;
          } catch (e) { return fail("managed-clone-failed: " + String(e?.message ?? e), 502); }
        } else {
          cwd = resolveLocalWorkspace(c.repo, { home, stat });
          if (!cwd) return fail("workspace-not-found", 422);
        }
      }
      const runId = makeRunId(now);
      const pkg = buildTaskPackage(c, store.getRepoFacts(c.repo), now, buildV2Ctx(LOOP_V1, runId));
      if (!another) {
        store.setGate(key, "G1", "pass", body?.note ?? "", pkg, "workbench-ui");
        store.setStage(key, "building", "G1 pass");
      }
      try {
        const out = await startWork({ store, lang: body?.lang === "en" ? "en" : "zh-CN", now }, { key, cwd, another, pkg });
        return { ok: true, sessionId: out.sessionId, reused: out.reused, taskPackage: out.reused ? null : pkg };
      } catch (e) { return fail(String(e?.code ?? e?.message ?? e), e?.status ?? 500); }
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
      if (!url.startsWith(PREFIX) || !url.slice(PREFIX.length).trim()) return fail("invalid webhook");   // M5 T3：空/空白 token 一并挡（评审 R-10）
      await feishu.setWebhook(PREFIX + url.slice(PREFIX.length).trim());   // M7 T2/§16-3：合法 token trim 入库
      return { ok: true };
    },
    // 角色三方法（design-v2 §14/M4 T6）：引用守卫在 handler 侧（templates 全量定义 + 存活 run 快照）。
    async postRolesUpsert(body) {
      const gate = requireAuth(); if (gate) return gate;
      const role = body?.role;
      if (!role || typeof role.id !== "string" || !role.id.trim()) return fail("role id required");
      if (!["ask", "auto"].includes(role?.executionPolicy)) return fail("invalid executionPolicy");
      if (!role.name) return fail("role name required");
      store.upsertRole({ id: role.id, name: role.name, description: role.description ?? "", prompt: role.prompt ?? "", executionPolicy: role.executionPolicy, ...(role.model ? { model: role.model } : {}) });
      return { ok: true };
    },
    async postRolesDelete(body) {
      const gate = requireAuth(); if (gate) return gate;
      const id = body?.id;
      if (!id) return fail("id required");
      // builtin 覆盖层放行（评审 R1-4/P9②）：id ∈ BUILTIN_ROLES 时删的是用户覆盖层，回落内置（resolveRole 天然支持），
      // 模板引用的是内置角色本体而非覆盖层 → 守卫扫描跳过。
      if (!BUILTIN_ROLES[id]) {
        const refs = [];
        for (const t of Object.values(templates)) {
          for (const n of t.nodes ?? []) if (n.type === "agent" && n.roleId === id) refs.push(t.id + "/" + n.id);
        }
        // 存活 run 快照守卫（评审 R1-2 修正）：roleId 在 run.snapshot.nodes（快照模板定义），非 nodeStates
        for (const run of store.listRuns()) {
          if (["running", "waiting"].includes(run.status)) {
            for (const n of run.snapshot?.nodes ?? []) {
              if (n.type === "agent" && n.roleId === id) refs.push(run.id + "/" + n.id);
            }
          }
        }
        if (refs.length > 0) return fail("role-in-use: " + id + " (" + refs.join(", ") + ")", 409);
      }
      store.deleteRole(id);
      return { ok: true };
    },
    async getRoles() {
      const gate = requireAuth(); if (gate) return gate;
      // 合并单列表（评审 P9③/R1-3）：覆盖行显用户值（override 字段优先展开）
      const roles = [];
      for (const r of Object.values(BUILTIN_ROLES)) {
        const override = store.getRole(r.id);
        roles.push(override ? { ...r, ...override, overridden: true } : { ...r, overridden: false });
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
      // 开工会话三键（Task 6）：逐键白名单 + 校验（workSessionModel 复用 triageModel 目录校验先例；
      // effort 可选 string 在场即存——v1 UI 不提供 effort 控件仅 API 可设；preset ∈ listPresets 名册）。
      if (body && "workSessionModel" in body) {
        const sel = body.workSessionModel;
        if (sel === null) {
          patch.workSessionModel = null;
        } else {
          if (!sel || typeof sel.provider !== "string" || typeof sel.model !== "string") return fail("invalid settings");
          if (sel.reasoningEffort !== undefined && typeof sel.reasoningEffort !== "string") return fail("invalid settings");
          const catalog = await listCatalog();
          const listed = catalog.some((p) => p.provider === sel.provider && p.models.some((m) => m.id === sel.model));
          if (!listed) return fail("model-not-in-catalog");
          patch.workSessionModel = sel.reasoningEffort !== undefined
            ? { provider: sel.provider, model: sel.model, reasoningEffort: sel.reasoningEffort }
            : { provider: sel.provider, model: sel.model };
        }
      }
      if (body && "workSessionPreset" in body) {
        const p = body.workSessionPreset;
        if (p === null) {
          patch.workSessionPreset = null;
        } else if (typeof p !== "string" || p === "") {
          return fail("invalid settings");
        } else {
          const roster = (await listPresets()).map((x) => (typeof x === "string" ? x : x?.id)).filter(Boolean);
          if (!roster.includes(p)) return fail("preset-not-in-roster");
          patch.workSessionPreset = p;
        }
      }
      if (body && "workSessionApprovalPolicy" in body) {
        const pol = body.workSessionApprovalPolicy;
        if (pol !== null && pol !== "ask" && pol !== "never") return fail("invalid settings");
        patch.workSessionApprovalPolicy = pol;
      }
      if (Object.keys(patch).length === 0) return fail("invalid settings");
      store.setSettings(patch);
      onSettingsChange(store.getSettings());
      return store.getSettings();
    },
  };
}
