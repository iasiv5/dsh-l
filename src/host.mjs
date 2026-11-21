import { execFile as execFileCb, spawn as spawnCb } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { runTriage } from "./triage.mjs";
import { resolveAgentSelection } from "./agent-selection.mjs";
import { composeWorkWorld, startWorkSession } from "./worksession.mjs";
import { homedir } from "node:os";
import { statSync } from "node:fs";
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

export const name = "dsh-l";
// 评审 R1-12：approval/workingDirectory 为 runtime rc.2/rc.3 的 cordis 声明式服务（类型声明实证），
// M2 执行器的审批策略与工作目录注入依赖二者——不声明 inject 则 ctx 访问即抛错（fail-fast，非静默降级）。
export const inject = ["webServer", "credentials", "agents", "agentDefaultModel", "timer", "llm", "approval", "workingDirectory", "agentPresets"];

const makeTriage = (ctx, dir) => {
  const world = {
    async createAgent(sessionId, { model } = {}) {
      // autoloop dsh/src/host.ts:83-97：程序化会话须在 setup 里显式选模，宿主默认选择补齐。
      const configured = resolveAgentSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
      return ctx.agents.create({
        sessionId,
        meta: { cwd: dir },
        agentOptions: configured,
        setup: (_agentCtx, agent) => { agent.model?.select?.(configured); },
      });
    },
    onSessionEvent: (handler) => ctx.on("session/event", (session, event) => handler(String(session?.id ?? ""), event)),
    userMessage: (text) => ({ id: randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  return { runTriage: (params) => runTriage(world, params) };
};

// M2 执行器 world（makeTriage 同款 + 审批/工作目录直调——inject 已声明，缺失会在激活期抛错而非静默）。
const makeExecWorld = (ctx, dir) => ({
  async createAgent(sessionId, { model } = {}) {
    const configured = resolveAgentSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
    return ctx.agents.create({
      sessionId,
      meta: { cwd: dir },
      agentOptions: configured,
      setup: (_agentCtx, agent) => { agent.model?.select?.(configured); },
    });
  },
  onSessionEvent: (handler) => ctx.on("session/event", (session, event) => handler(String(session?.id ?? ""), event)),
  userMessage: (text) => ({ id: randomUUID(), role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  setPolicy: (agent, policy) => ctx.approval.setPolicy(agent, policy),
  setWorkingDirectory: (agent, cwd) => ctx.workingDirectory.set(agent, cwd),
});

export function buildRuntime(ctx, config, { makeTriage, listCatalog = async () => [], hostDefault = () => null, onSettingsChange } = {}) {
  const dir = dataDir();
  const store = createStore({ filePath: join(dir, "store.json") });
  const workspace = makeWorkspace({ dataDir: dir, ghBin: join(dir, "bin", "gh"), execFile });
  const executor = makeExecutor({
    world: makeExecWorld(ctx, dir), spawn: spawnCb, ghBin: join(dir, "bin", "gh"),
    // Task 10（R1-8）：会话 id 落 run 节点状态（nodeStates[nodeId] ??= {} 兜底——executor 以 ?.attempt 可选读，节点态可能未建）。
    onSessionBound: (run, nodeId, sessionId) => {
      try {
        const cur = store.getRun(run.id);
        if (!cur) return;
        const ns = { ...cur.nodeStates };
        ns[nodeId] = { ...(ns[nodeId] ?? {}), sessionId };
        store.saveRun({ ...cur, nodeStates: ns });
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
    triage: makeTriage ? makeTriage(ctx, dir) : UNWIRED,
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
