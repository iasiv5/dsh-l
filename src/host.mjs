import { execFile as execFileCb, spawn as spawnCb } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { runTriage } from "./triage.mjs";
import { resolveAgentSelection } from "./agent-selection.mjs";
import { composeWorkWorld, startWorkSession, resolveLocalWorkspace } from "./worksession.mjs";
import { homedir } from "node:os";
import { mkdirSync, statSync } from "node:fs";
import { dataDir } from "./paths.mjs";
import { createStore } from "./store.mjs";
import { loadTemplates } from "./workflows/loader.mjs";
import { makeWorkspace, sweepActiveKeys } from "./engine/workspace.mjs";
import { makeExecutor } from "./engine/executor.mjs";
import { makeEngine } from "./engine/engine.mjs";
import { makeFeishu, formatNotice } from "./feishu.mjs";
import { loadTemplateDefs } from "./workflows/loader.mjs";
import * as github from "./github.mjs";
import { makeHandlers } from "./handlers.mjs";
import { createTrustGuard, makeHttpHandler } from "./http.mjs";
import { armInterval } from "./poll.mjs";

const execFile = promisify(execFileCb);
const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";
const UNWIRED = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };

// ---- 收敛 M1 Task 5（design-v2 §20 第 14 条）：会话归属宿主工作区 ----
// 宿主规则：会话属于某个宿主工作区，当且仅当会话头目录（meta.cwd）就是该工作区目录；会话头目录建后不可改。
// 四个 helper 只经 ctx.get 取可选服务，服务缺席或方法不是函数时静默跳过；任何失败只告警，不阻断开工或执行。
// 先例：dsh-schedule/src/runtime.ts:482-502（joinWorkspace / nameSession）。
const LOOP_WORKSPACE_TITLE = "DSH Loop Forge";
const warnOf = (ctx, what) => (err) => (ctx.logger ?? console).warn?.("[dsh-l] " + what + ":", err);
const getRegistry = (ctx) => {
  const registry = ctx.get?.("workspaceRegistry");
  return registry && typeof registry === "object" ? registry : null;
};
// 只挂接 cwd 对应的已登记工作区（未登记目录不新建工作区——主人目录的侧栏结构不替用户改）。
async function joinWorkspace(ctx, sessionId, cwd) {
  const registry = getRegistry(ctx);
  if (registry === null || cwd === undefined || typeof registry.resolveByPath !== "function") return;
  try { await (await registry.resolveByPath(cwd))?.attachSession(sessionId); } catch (err) { warnOf(ctx, "workspace join")(err); }
}
// 「DSH Loop Forge」：同路径 create 幂等（返回既有实体），再挂接。
async function attachToLoopWorkspace(ctx, sessionId, sessionRoot) {
  const registry = getRegistry(ctx);
  if (registry === null || typeof registry.create !== "function") return;
  try { await registry.create(sessionRoot, LOOP_WORKSPACE_TITLE); await joinWorkspace(ctx, sessionId, sessionRoot); } catch (err) { warnOf(ctx, "loop workspace")(err); }
}
// 仅当会话尚无标题时改名（dsh-schedule/src/runtime.ts:493-502 同款守卫）。
function nameSession(ctx, agent, title) {
  const titles = ctx.get?.("sessionTitle");
  if (!titles || typeof titles.rename !== "function") return;
  try { if (titles.get?.(agent?.session) === undefined) titles.rename(agent.session, title); } catch (err) { warnOf(ctx, "session title")(err); }
}
async function archiveSession(ctx, sessionId) {
  const registry = getRegistry(ctx);
  if (registry === null || typeof registry.archiveSession !== "function") return;
  try { await registry.archiveSession(sessionId, { stopActivity: true }); } catch (err) { warnOf(ctx, "session archive")(err); }
}

export const name = "dsh-l";
// 评审 R1-12：approval/workingDirectory 为 runtime rc.2/rc.3 的 cordis 声明式服务（类型声明实证），
// M2 执行器的审批策略与工作目录注入依赖二者——不声明 inject 则 ctx 访问即抛错（fail-fast，非静默降级）。
export const inject = ["webServer", "credentials", "agents", "agentDefaultModel", "timer", "llm", "approval", "workingDirectory", "agentPresets"];

export const makeTriage = (ctx, sessionRoot) => {
  const world = {
    async createAgent(sessionId, { model } = {}) {
      // autoloop dsh/src/host.ts:83-97：程序化会话须在 setup 里显式选模，宿主默认选择补齐。
      const configured = resolveAgentSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
      return ctx.agents.create({
        sessionId,
        meta: { cwd: sessionRoot },
        agentOptions: configured,
        setup: (_agentCtx, agent) => { agent.model?.select?.(configured); },
      });
    },
    onSessionEvent: (handler) => ctx.on("session/event", (session, event) => handler(String(session?.id ?? ""), event)),
    userMessage: (text) => ({ id: randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
    attach: (sessionId) => attachToLoopWorkspace(ctx, sessionId, sessionRoot),
    setTitle: (agent, title) => nameSession(ctx, agent, title),
    archiveSession: (sessionId) => archiveSession(ctx, sessionId),   // 收敛 M1 Task 7：分诊会话用完归档
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  return { runTriage: (params) => runTriage(world, params) };
};

// M2 执行器 world（makeTriage 同款 + 审批/工作目录直调——inject 已声明，缺失会在激活期抛错而非静默）。
const makeExecWorld = (ctx, sessionRoot) => ({
  async createAgent(sessionId, { model } = {}) {
    const configured = resolveAgentSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
    return ctx.agents.create({
      sessionId,
      meta: { cwd: sessionRoot },
      agentOptions: configured,
      setup: (_agentCtx, agent) => { agent.model?.select?.(configured); },
    });
  },
  onSessionEvent: (handler) => ctx.on("session/event", (session, event) => handler(String(session?.id ?? ""), event)),
  userMessage: (text) => ({ id: randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  setPolicy: (agent, policy) => ctx.approval.setPolicy(agent, policy),
  setWorkingDirectory: (agent, cwd) => ctx.workingDirectory.set(agent, cwd),
  attach: (sessionId) => attachToLoopWorkspace(ctx, sessionId, sessionRoot),   // 收敛 M1 Task 5：先于 send
  setTitle: (agent, title) => nameSession(ctx, agent, title),   // 收敛 M1 Task 6
});

export function buildRuntime(ctx, config, { makeTriage, listCatalog = async () => [], hostDefault = () => null, onSettingsChange } = {}) {
  const dir = dataDir();
  // 会话根目录（design-v2 §20 第 14 条）：引擎节点 / 托管开工 / 分诊三类会话的会话头目录，也是「DSH Loop Forge」工作区的路径。
  const sessionRoot = join(dir, "workspaces");
  try { mkdirSync(sessionRoot, { recursive: true, mode: 0o700 }); } catch {}
  const store = createStore({ filePath: join(dir, "store.json") });
  const workspace = makeWorkspace({ dataDir: dir, ghBin: join(dir, "bin", "gh"), execFile });
  const executor = makeExecutor({
    world: makeExecWorld(ctx, sessionRoot), spawn: spawnCb, ghBin: join(dir, "bin", "gh"),
    // Task 10（R1-8）：会话 id 落 run 节点状态（nodeStates[nodeId] ??= {} 兜底——executor 以 ?.attempt 可选读，节点态可能未建）。
    onSessionBound: (run, nodeId, sessionId) => {
      try {
        const cur = store.getRun(run.id);
        if (!cur) return;
        const ns = { ...cur.nodeStates };
        ns[nodeId] = { ...(ns[nodeId] ?? {}), sessionId };
        store.saveRun({ ...cur, nodeStates: ns });
        store.appendRunSession(run.id, nodeId, sessionId);   // 收敛 M1 Task 4：候选行会话入口的数据源
      } catch (err) { (ctx.logger ?? console).warn?.("[dsh-l] onSessionBound:", err); }
    },
  });
  // 开工会话 world（GLOSSARY「开工会话」；Task 4 装配）：调用序红线在 composeWorkWorld 内。
  const workWorld = composeWorkWorld({
    agents: ctx.agents,
    workingDirectory: ctx.workingDirectory,
    approval: ctx.approval,
    agentDefaultModel: ctx.agentDefaultModel,
    settings: () => store.getSettings(),
    userMessage: (text) => ({ id: randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
    // 会话头目录等于会话根目录（托管开工）→ 归「DSH Loop Forge」；否则挂到该目录已登记的工作区。
    attachHost: (sessionId, cwd) => (cwd === sessionRoot ? attachToLoopWorkspace(ctx, sessionId, sessionRoot) : joinWorkspace(ctx, sessionId, cwd)),
    setTitle: (agent, title) => nameSession(ctx, agent, title),   // 收敛 M1 Task 6
  });
  // 飞书通知（design-v2 §13.3/§13.4）：webhook 经 credentials 存取（ref=DSH_L_FEISHU_WEBHOOK_URL）；
  // emit → formatNotice → sendNotice，fire-and-forget（尽力而为，通知失败不影响引擎）。
  const getWebhook = async () => {
    try {
      const hit = await ctx.credentials?.resolve?.("DSH_L_FEISHU_WEBHOOK_URL");
      return typeof hit?.value === "string" && hit.value ? hit.value : null;
    } catch { return null; }
  };
  const notifier = makeFeishu({ fetch: globalThis.fetch, getWebhook });
  const setWebhook = (url) => ctx.credentials.set("DSH_L_FEISHU_WEBHOOK_URL", url);
  // 模板全量 defs（M4 评审 R1-1：引擎 templates 注入 + 守卫数据源共源）；角色解析 store.roles 优先（listRoles 闭包）
  const templateDefs = Object.fromEntries(loadTemplateDefs({ dataDir: dir }).defs.map((d) => [d.id, d]));   // M5 T2：{defs, warnings} 形状
  const engine = makeEngine({
    store, workspace, executor, concurrencyOf: () => store.getSettings().engineConcurrency ?? 2,
    templates: templateDefs,
    listRoles: () => Object.fromEntries(store.listRoles().map((r) => [r.id, r])),
    emit: (evt) => { Promise.resolve(notifier.sendNotice(formatNotice(evt))).catch(() => {}); },
  });
  const handlers = makeHandlers({
    store, provider: github,
    triage: makeTriage ? makeTriage(ctx, sessionRoot) : UNWIRED,
    credentials: ctx.credentials, tokenRef: config?.githubTokenRef ?? null,
    // 可覆写设备流 client_id（缺省 GitHub CLI 官方 App）；gh-as-source 后无自存凭据闭包（token 只存 gh 凭据库）
    githubClientId: config?.githubClientId ?? null,
    execFile, fetch: globalThis.fetch, onSettingsChange, listCatalog, hostDefault,
    ghBin: join(dir, "bin", "gh"), ghTmp: join(dir, "tmp"), spawn: spawnCb,
    // M1 启动时读一次模板目录（内置 loop-v1 + workflows/*.json）；用户模板改动重启生效——design-v2 §3。
    workflowCatalog: loadTemplates({ dataDir: dir }),
    engine,
    feishu: { notifier, setWebhook },
    templates: templateDefs,   // M4 T6/R1-1②：引用守卫数据源（templates 全量定义）
    // 开工会话（Work Session）：composeWorkWorld 以 ctx 服务装配；settings 传取值函数（评审 impl#1——
    // store.setSettings 整体替换引用，装配期对象快照会 stale）；startWork 绑定 world 后交 handlers（测试注 fake）。
    // home/stat 承载本地检出默认命中；workspace 供托管克隆。
    startWork: (deps, params) => startWorkSession(workWorld, deps, params),
    home: homedir(),
    stat: (p) => statSync(p),
    workspace,
    sessionRoot,
    // 收敛 M2 Task 13：选择器去向提示的数据面——本地默认检出解析、宿主工作区名（未登记为 null → 界面显示「未分组」）。
    paths: { dataDir: dir, workspacesDir: sessionRoot },
    resolveLocalDir: (repo) => resolveLocalWorkspace(repo, { home: homedir(), stat: (p) => statSync(p) }),
    workspaceTitleOf: async (cwd) => {
      const registry = getRegistry(ctx);
      if (!registry || typeof registry.resolveByPath !== "function") return null;
      try { return (await registry.resolveByPath(cwd))?.title ?? null; } catch { return null; }
    },
    // preset 名册（Task 6）：agentPresets.list() 直读，异常降级空名册（UI 只显「跟随部署默认」）。
    listPresets: async () => {
      try { return await ctx.agentPresets.list(); } catch { return []; }
    },
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
    "/dsh-l/run/start": { POST: handlers.postRunStart },
    "/dsh-l/work/start": { POST: handlers.postWorkStart },
    "/dsh-l/work/workspace-status": { GET: handlers.getWorkspaceStatus },
    "/dsh-l/work/default-dir": { GET: handlers.getWorkDefaultDir },
    "/dsh-l/work/sessions": { GET: handlers.getWorkSessions },
    "/dsh-l/work/deliver": { POST: handlers.postWorkDeliver },
    "/dsh-l/run/gate": { POST: handlers.postRunGate },
    "/dsh-l/run/cancel": { POST: handlers.postRunCancel },
    "/dsh-l/run/retry": { POST: handlers.postRunRetry },
    "/dsh-l/release/confirm": { POST: handlers.postReleaseConfirm },
    "/dsh-l/roles": { GET: handlers.getRoles, POST: handlers.postRolesUpsert },
    "/dsh-l/roles/delete": { POST: handlers.postRolesDelete },
    "/dsh-l/feishu/test": { POST: handlers.postFeishuTest },
    "/dsh-l/feishu/webhook": { PUT: handlers.putFeishuWebhook },
    "/dsh-l/auth": { GET: handlers.getAuth },
    "/dsh-l/auth/bind": { POST: handlers.postAuthBind },
    "/dsh-l/auth/logout": { POST: handlers.postAuthLogout },
    "/dsh-l/auth/install-gh": { POST: handlers.postAuthInstallGh },
    "/dsh-l/auth/device": { GET: handlers.getAuthDevice, POST: handlers.postAuthDeviceStart },
    "/dsh-l/credential": { PUT: handlers.putCredential, DELETE: handlers.deleteCredential },
    "/dsh-l/credential/verify": { POST: handlers.postCredentialVerify },
    "/dsh-l/settings": { GET: handlers.getSettings, PUT: handlers.putSettings },
    "/dsh-l/models": { GET: handlers.getModels },
  };
  return { dir, store, handlers, table, workspace, engine };
}

export function apply(ctx, config = {}) {
  ctx.effect(() => {
    let poll = null;
    const listCatalog = async () => {
      const providers = ctx.llm?.listProviders?.() ?? [];
      return Promise.all(providers.map(async (p) => ({
        provider: p.id,
        name: p.name,
        models: (await ctx.llm.listModels(p.id).catch(() => [])).map((m) => ({ id: m.id, name: m.name })),
      })));
    };
    const hostDefault = () => {
      const s = ctx.agentDefaultModel?.currentSelection?.();
      return s ? { provider: s.provider, model: s.model } : null;
    };
    const runtime = buildRuntime(ctx, config, { makeTriage, listCatalog, hostDefault, onSettingsChange: () => poll?.rearm() });
    // 恢复扫描（design-v2 §12.1）：宿主/插件启动一次性——running→ready + resume 重派（不烧 attempt）。
    try { runtime.engine.recover(); } catch (err) { (ctx.logger ?? console).warn?.("[dsh-l] recover:", err); }
    let sweeper = null;   // 保留期清扫（design-v2 §5）：每日一次，非活跃且超期的工作区递归删除。
    sweeper = ctx.interval(() => {
      try {
        // Task 9（R1-5）：活跃集并入开工会话键（sweepActiveKeys 纯函数）——work 会话可存活数周且冷会话亦活跃。
        const active = sweepActiveKeys({ runs: runtime.store.listRuns(), workSessions: runtime.store.listWorkSessions() });
        Promise.resolve(runtime.workspace.sweep({ activeKeys: active, retentionDays: runtime.store.getSettings().workspaceRetentionDays }))
          .then((out) => { (ctx.logger ?? console).info?.(`[dsh-l] sweep done: removed=${out.removed.length} skipped=${out.skipped?.length ?? 0}`); })   // M7/§18.5：skipped 计数（§16-13a）
          .catch((e2) => { (ctx.logger ?? console).warn?.('[dsh-l] workspace sweep async:', e2); });   // M6 D5：async 化补 .catch
      } catch (e) { (ctx.logger ?? console).warn?.("[dsh-l] workspace sweep:", e); }
    }, 24 * 60 * 60000);
    poll = armInterval({
      interval: (callback, delay) => ctx.interval(callback, delay),
      getMinutes: () => runtime.store.getSettings().intervalMinutes,
      refresh: () => runtime.handlers.postRefresh(),
    });
    const trust = createTrustGuard(ctx, ctx.logger ?? console);
    const disposers = Object.entries(runtime.table).map(([path, methods]) =>
      ctx.webServer.register({ kind: "exact", path, handler: makeHttpHandler({ methods, trust }) }));
    return () => {
      poll.dispose();
      try { sweeper?.dispose?.(); } catch {}
      for (const d of disposers) { try { d?.(); } catch {} }
    };
  }, "dsh-l:runtime");
}
