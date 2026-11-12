import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { runTriage } from "./triage.mjs";
import { dataDir } from "./paths.mjs";
import { createStore } from "./store.mjs";
import * as github from "./github.mjs";
import { makeHandlers } from "./handlers.mjs";
import { createTrustGuard, makeHttpHandler } from "./http.mjs";
import { armInterval } from "./poll.mjs";

const execFile = promisify(execFileCb);
const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";
const UNWIRED = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };

export const name = "dsh-l";
export const inject = ["webServer", "credentials", "agents", "agentDefaultModel", "timer"];

const makeTriage = (ctx, dir) => {
  const world = {
    async createAgent(sessionId, { model } = {}) {
      // autoloop dsh/src/host.ts:83-97：程序化会话须在 setup 里显式选模，宿主默认选择补齐。
      const defaults = ctx.agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" };
      const configured = { provider: defaults.provider, model: model ?? defaults.model, reasoningEffort: defaults.reasoningEffort };
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

export function buildRuntime(ctx, config, { makeTriage, onSettingsChange } = {}) {
  const dir = dataDir();
  const store = createStore({ filePath: join(dir, "store.json") });
  const handlers = makeHandlers({
    store, provider: github,
    triage: makeTriage ? makeTriage(ctx, dir) : UNWIRED,
    credentials: ctx.credentials, tokenRef: config?.githubTokenRef ?? null,
    execFile, fetch: globalThis.fetch, onSettingsChange,
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
    "/dsh-l/settings": { GET: handlers.getSettings, PUT: handlers.putSettings },
  };
  return { dir, store, handlers, table };
}

export function apply(ctx, config = {}) {
  ctx.effect(() => {
    let poll = null;
    const runtime = buildRuntime(ctx, config, { makeTriage, onSettingsChange: () => poll?.rearm() });
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
      for (const d of disposers) { try { d?.(); } catch {} }
    };
  }, "dsh-l:runtime");
}
