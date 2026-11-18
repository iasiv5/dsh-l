import { execFile as execFileCb, spawn as spawnCb } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { runTriage, resolveTriageSelection } from "./triage.mjs";
import { dataDir } from "./paths.mjs";
import { createStore } from "./store.mjs";
import { loadTemplates } from "./workflows/loader.mjs";
import { makeWorkspace } from "./engine/workspace.mjs";
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
export const inject = ["webServer", "credentials", "agents", "agentDefaultModel", "timer", "llm", "approval", "workingDirectory"];

const makeTriage = (ctx, dir) => {
  const world = {
    async createAgent(sessionId, { model } = {}) {
      // autoloop dsh/src/host.ts:83-97：程序化会话须在 setup 里显式选模，宿主默认选择补齐。
      const configured = resolveTriageSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
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
    const configured = resolveTriageSelection(model, ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" });
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
  const executor = makeExecutor({ world: makeExecWorld(ctx, dir), spawn: spawnCb, ghBin: join(dir, "bin", "gh") });
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
    execFile, fetch: globalThis.fetch, onSettingsChange, listCatalog, hostDefault,
    ghBin: join(dir, "bin", "gh"), ghTmp: join(dir, "tmp"), spawn: spawnCb,
    // M1 启动时读一次模板目录（内置 loop-v1 + workflows/*.json）；用户模板改动重启生效——design-v2 §3。
    workflowCatalog: loadTemplates({ dataDir: dir }),
    engine,
    feishu: { notifier, setWebhook },
    templates: templateDefs,   // M4 T6/R1-1②：引用守卫数据源（templates 全量定义）
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
        const active = runtime.store.listRuns().filter((r) => ["running", "waiting"].includes(r.status)).map((r) => r.candidateKey);
        Promise.resolve(runtime.workspace.sweep({ activeKeys: active, retentionDays: runtime.store.getSettings().workspaceRetentionDays })).catch((e2) => { (ctx.logger ?? console).warn?.('[dsh-l] workspace sweep async:', e2); });   // M6 D5：async 化补 .catch
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
