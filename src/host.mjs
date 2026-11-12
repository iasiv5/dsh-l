import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { dataDir } from "./paths.mjs";
import { createStore } from "./store.mjs";
import * as github from "./github.mjs";
import { makeHandlers } from "./handlers.mjs";
import { createTrustGuard, makeHttpHandler } from "./http.mjs";

const execFile = promisify(execFileCb);
const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";
const UNWIRED = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };

export const name = "dsh-l";
export const inject = ["webServer", "credentials"];

export function buildRuntime(ctx, config, { makeTriage, onSettingsChange } = {}) {
  const dir = dataDir();
  const store = createStore({ filePath: join(dir, "store.json") });
  const handlers = makeHandlers({
    store, provider: github,
    triage: makeTriage ? makeTriage(dir) : UNWIRED,
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
    const runtime = buildRuntime(ctx, config);
    const trust = createTrustGuard(ctx, ctx.logger ?? console);
    const disposers = Object.entries(runtime.table).map(([path, methods]) =>
      ctx.webServer.register({ kind: "exact", path, handler: makeHttpHandler({ methods, trust }) }));
    return () => { for (const d of disposers) { try { d?.(); } catch {} } };
  }, "dsh-l:runtime");
}
