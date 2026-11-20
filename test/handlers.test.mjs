import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { makeRunId } from "../src/store.mjs";
import { loadTemplates } from "../src/workflows/loader.mjs";
import { makeHandlers, buildTaskPackage } from "../src/handlers.mjs";

const openStore = () => createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-h-")), "s.json") });
const login = (store, account = "o") => store.setAuth({ account, login: account });
const PROVIDER = (mode = {}) => ({
  resolveToken: async (opts = {}) => {
    // 桩贴合真实三级链：storedToken 优先（有值时），否则回 mode.token（模拟 gh 登录态）
    if (typeof opts?.storedToken === "function") {
      try { const t = await opts.storedToken(); if (typeof t === "string" && t !== "") return t; } catch {}
    }
    return mode.token ?? null;
  },
  ghAvailable: async () => mode.gh !== false,
  getViewer: async () => {
    if (!mode.viewerLogin) throw Object.assign(new Error("github api 401 for /user"), { status: 401 });
    return { login: mode.viewerLogin };
  },
  listOpenIssues: async ({ repo }) => {
    if (mode.bad && repo === "o/bad") throw new Error("github api 500 for /repos/o/bad/issues?state=open");
    if (mode.empty) return [];
    return repo === "o/good" ? [{ repo, type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }] : [];
  },
  listOpenPulls: async () => [],
  getRepo: async ({ repo }) => ({ defaultBranch: "trunk", cloneUrl: "git@github.com:" + repo + ".git" }),
  listUserRepos: async () => [{ fullName: "o/good" }],
  // Task 5：凭据校验默认实现（可经 mode.verify 注入失败形态）
  verifyToken: async () => {
    if (mode.verify === "invalid") throw new Error("token-invalid");
    if (mode.verify === "rate") throw new Error("rate-limited:120");
    if (mode.verify === "net") throw new Error("github api 500 for /user");
    return { login: mode.vLogin ?? mode.viewerLogin ?? "o", scopes: mode.scopes ?? ["repo", "read:org"], fineGrained: false, verifiedAt: mode.verifiedAt ?? "2026-11-19T00:00:00.000Z" };
  },
});
const noTriage = { runTriage: async () => ({ updated: [], failed: "triage-not-wired" }) };
const seed = (store, n = 1) => store.upsertCandidates([{ repo: "o/r", type: "issue", number: n, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);

test("postRefresh：单仓失败容错并记 perRepo.error", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good", "o/bad"]);
  const r = await makeHandlers({ store, provider: PROVIDER({ bad: true }), triage: noTriage }).postRefresh();
  assert.equal(r.perRepo["o/bad"].error, "github api 500 for /repos/o/bad/issues?state=open");
  assert.equal(r.perRepo["o/good"].error, null);
  assert.equal(store.listCandidates().length, 1);
});

test("getState：暴露 workflow meta（不含 script）与 runs 摘要", async () => {
  const store = openStore(); seed(store);
  const catalog = loadTemplates({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-hwf-")) });
  const runId = makeRunId();
  store.createRun({ id: runId, candidateKey: "o/r#issue#1", templateId: "loop-v1",
    templateRevision: catalog.templates[0].revision,
    snapshot: { nodes: catalog.templates[0].nodes, edges: [] },
    nodeStates: { g1: { status: "waiting", attempt: 0, reworkCount: 0, error: null } },
    status: "waiting", cancelReason: null, createdAt: "T", updatedAt: "T", history: [] });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, workflowCatalog: catalog });
  const state = await h.getState();
  assert.equal(state.workflow.templates[0].id, "loop-v1");
  assert.ok(state.workflow.templates[0].nodes.every((n) => !("script" in n)));
  assert.equal(state.runs.length, 1);
  assert.deepEqual(state.runs[0].currentNodeIds, ["g1"]);
  // 缺省 catalog：不传 workflowCatalog 时回空结构（host 侧总是传，兜底给直接调用者）
  const bare = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.deepEqual((await bare.getState()).workflow, { templates: [], warnings: [] });
});

test("putWatch 校验仓名形状", async () => {
  const store = openStore(); login(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.deepEqual((await h.putWatch({ repos: ["o/r"] })).repos, ["o/r"]);
  assert.equal((await h.putWatch({ repos: ["bad name"] })).error, "invalid repos");
});

test("postTriage：1..10 限制；结果写回 by=llm；失败透传", async () => {
  const store = openStore(); seed(store);
  const triage = { runTriage: async () => ({ updated: [{ key: "o/r#issue#1", validity: "low", urgency: "P3", action: "close", reason: "spam" }], failed: null }) };
  const h = makeHandlers({ store, provider: PROVIDER(), triage });
  assert.deepEqual((await h.postTriage({ keys: ["o/r#issue#1"], lang: "zh-CN" })).updated, ["o/r#issue#1"]);
  assert.equal(store.getCandidate("o/r#issue#1").triage.by, "llm");
  assert.equal((await h.postTriage({ keys: Array.from({ length: 11 }, (_, i) => "k" + i) })).error, "keys must be 1..10");
  const hf = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await hf.postTriage({ keys: ["o/r#issue#1"] })).error, "triage-not-wired");
});

test("postOverride：人工推翻分诊 by=human，非法值拒绝", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  await h.postOverride({ key: "o/r#issue#1", validity: "high", urgency: "P0", action: "start", reason: "我确认", lang: "zh-CN" });
  assert.equal(store.getCandidate("o/r#issue#1").triage.by, "human");
  assert.equal((await h.postOverride({ key: "o/r#issue#1", validity: "x", urgency: "P0", action: "start" })).error, "invalid triage");
});

test("闸门：G1 仅 gating 可放行；pass→building+任务包；reject→triaged；G2/G3 409", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  const early = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass" });
  assert.deepEqual([early.error, early.status], ["gate-requires-gating", 409]);
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  store.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass", note: "" });
  assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.equal(r.taskPackage.emit.type, "build.requested");
  assert.equal(r.taskPackage.repo.defaultBranch, "trunk");
  assert.equal(store.getCandidate("o/r#issue#1").stage, "building");
  assert.equal((await h.postGate({ key: "o/r#issue#1", gate: "G2", decision: "pass" })).status, 409);
  seed(store, 2);
  await h.postStage({ key: "o/r#issue#2", stage: "gating" });
  await h.postGate({ key: "o/r#issue#2", gate: "G1", decision: "reject", note: "不做" });
  assert.equal(store.getCandidate("o/r#issue#2").stage, "triaged");
});

test("postStage：building 只能经 G1 进入；未知候选 404", async () => {
  const store = openStore(); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.postStage({ key: "o/r#issue#1", stage: "building" })).error, "invalid stage");
  assert.equal((await h.postStage({ key: "nope", stage: "held" })).status, 404);
});

test("putSettings：intervalMinutes 0..1440 整数，变更回调", async () => {
  const store = openStore();
  let changed = 0;
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, onSettingsChange: () => { changed++; } });
  assert.equal((await h.putSettings({ intervalMinutes: 15 })).intervalMinutes, 15);
  assert.equal(changed, 1);
  assert.equal((await h.putSettings({ intervalMinutes: -1 })).error, "invalid settings");
});

test("putSettings：并发 1..4 与保留期 1..90 边界", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.putSettings({ engineConcurrency: 3 })).engineConcurrency, 3);
  assert.equal((await h.putSettings({ workspaceRetentionDays: 14 })).workspaceRetentionDays, 14);
  assert.equal((await h.putSettings({ engineConcurrency: 5 })).error, "invalid settings");
  assert.equal((await h.putSettings({ workspaceRetentionDays: 0 })).error, "invalid settings");
});

test("buildTaskPackage 形状", () => {
  const pkg = buildTaskPackage({ key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", url: "U", triage: null }, null, () => new Date(0));
  assert.equal(pkg.repo.cloneUrl, "git@github.com:o/r.git");
  assert.equal(pkg.gate.at, "1970-01-01T00:00:00.000Z");
});

test("postRefresh：上游已关闭候选回收 + ingestLog 落痕 + state 可回溯", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good"]);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  await h.postRefresh();
  assert.equal(store.getCandidate("o/good#issue#1").stage, "inbox");
  assert.equal(store.getRepoFacts("o/good").defaultBranch, "trunk");
  const h2 = makeHandlers({ store, provider: PROVIDER({ empty: true }), triage: noTriage });
  const r2 = await h2.postRefresh();
  assert.deepEqual(r2.sweep.closed, ["o/good#issue#1"]);
  assert.equal(store.getCandidate("o/good#issue#1").stage, "closed");
  assert.equal(store.getCandidate("o/good#issue#1").history.at(-1).event, "upstream-closed");
  const log = (await h2.getState()).ingestLog;
  assert.equal(log.length, 2);
  assert.deepEqual(log.at(-1).failedRepos, []);
  assert.equal(log.at(-1).closed, 1);
});

test("postTriage 失败：502 透传且候选留原阶段、history 记 triage.error", async () => {
  const store = openStore(); seed(store);
  const hf = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  const r = await hf.postTriage({ keys: ["o/r#issue#1"] });
  assert.equal(r.error, "triage-not-wired");
  assert.equal(r.status, 502);
  const c = store.getCandidate("o/r#issue#1");
  assert.equal(c.stage, "inbox");
  assert.equal(c.history.at(-1).event, "triage.error");
  assert.equal(c.history.at(-1).detail, "triage-not-wired");
});

test("postTriage 崩溃（runTriage 抛错）：同样 502 + triage.error 落痕，不裸 500", async () => {
  const store = openStore(); seed(store);
  const boom = { runTriage: async () => { throw new Error("agents.create exploded"); } };
  const r = await makeHandlers({ store, provider: PROVIDER(), triage: boom }).postTriage({ keys: ["o/r#issue#1"] });
  assert.equal(r.status, 502);
  assert.match(r.error, /triage-crashed: agents\.create exploded/);
  assert.equal(store.getCandidate("o/r#issue#1").history.at(-1).event, "triage.error");
});

const CATALOG = async () => [{ provider: "p1", name: "P1", models: [{ id: "m1", name: "M1" }] }];
const DEFAULT = () => ({ provider: "p0", model: "m0" });

test("getModels：目录 + 宿主默认", async () => {
  const h = makeHandlers({ store: openStore(), provider: PROVIDER(), triage: noTriage, listCatalog: CATALOG, hostDefault: DEFAULT });
  const r = await h.getModels();
  assert.equal(r.providers[0].models[0].id, "m1");
  assert.deepEqual(r.hostDefault, { provider: "p0", model: "m0" });
});

test("putSettings：triageModel 须在目录内；null 恢复跟随；可只改其中一项", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, listCatalog: CATALOG, hostDefault: DEFAULT });
  assert.deepEqual((await h.putSettings({ triageModel: { provider: "p1", model: "m1" } })).triageModel, { provider: "p1", model: "m1" });
  assert.equal(store.getSettings().intervalMinutes, 0);
  assert.equal((await h.putSettings({ triageModel: { provider: "p1", model: "nope" } })).error, "model-not-in-catalog");
  assert.equal((await h.putSettings({ triageModel: null })).triageModel, null);
  assert.equal((await h.putSettings({})).error, "invalid settings");
});

test("postTriage 把设置中的 triageModel 传给 runTriage", async () => {
  const store = openStore(); seed(store);
  store.setSettings({ triageModel: { provider: "p1", model: "m1" } });
  let seen = null;
  const triage = { runTriage: async (p) => { seen = p.model; return { updated: [], failed: null }; } };
  await makeHandlers({ store, provider: PROVIDER(), triage }).postTriage({ keys: ["o/r#issue#1"] });
  assert.deepEqual(seen, { provider: "p1", model: "m1" });
});

test("收活闸门：未连接时 refresh/watch/discover 一律 401 auth-required", async () => {
  const h = makeHandlers({ store: openStore(), provider: PROVIDER({ token: "tk", viewerLogin: "o" }), triage: noTriage });
  const gated = await Promise.all([h.postRefresh(), h.putWatch({ repos: ["o/r"] }), h.getDiscover()]);
  assert.deepEqual(gated.map((r) => r.error), ["auth-required", "auth-required", "auth-required"]);
  assert.equal(gated[0].status, 401);
});

test("postAuthBind：身份一致（大小写不敏感）才绑定；state 回显 auth；绑定后闸门放行", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "IasiV5" }), triage: noTriage });
  const r = await h.postAuthBind({ account: "iasiv5" });
  assert.equal(r.account, "iasiv5");
  assert.equal(r.login, "IasiV5");
  assert.ok(r.verifiedAt);
  assert.equal((await h.getState()).auth.account, "iasiv5");
  const st = await h.getAuth();
  assert.equal(st.account, "iasiv5");
  assert.deepEqual(st.gates, { ghInstalled: true, ghLogin: true, credentialOk: true });   // R1-6 明示改锚：installed/tokenAvailable → gates.*
  assert.equal(st.install.phase, "idle");
  assert.equal(st.device.phase, "idle");
  await h.postRefresh();                        // 绑定后摄取不再 401
  assert.equal((await h.getDiscover()).repos[0].fullName, "o/good");
});

test("postAuthBind 免填账号：直接采用 token 身份（登录闸大按钮路径）", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "IasiV5" }), triage: noTriage });
  const r = await h.postAuthBind({});
  assert.equal(r.account, "IasiV5");
  assert.equal(r.login, "IasiV5");
  // 显式传错账号仍拦截（API 兼容）
  assert.match((await h.postAuthBind({ account: "someone-else" })).error, /^account-mismatch/);
});

test("postAuthDeviceStart：就绪态（健康凭据在场）409；非就绪可发起并可回到 idle 形状", async () => {
  // R1-4（主人签核·收窄版）：守卫 = token 可解析 ∧ credentialOk；夹具随凭据模型现代化，409 断言语义不变（B14）。
  const ready = openStore();
  ready.setCredential({ token: "tk", source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: "T0", healthy: true });
  assert.equal((await makeHandlers({ store: ready, provider: PROVIDER({ token: "tk", viewerLogin: "o" }), triage: noTriage }).postAuthDeviceStart()).status, 409);
  const h = makeHandlers({ store: openStore(), provider: PROVIDER({}), triage: noTriage });
  const r = await h.postAuthDeviceStart();
  assert.match(r.error, /^device-start-failed: /);
  assert.equal((await h.getAuthDevice()).phase, "idle");
});

test("postAuthInstallGh：后台安装经 getAuth 可见 installing→done", async () => {
  const store = openStore();
  let release;
  const provider = {
    ...PROVIDER({}),
    ghInstall: () => new Promise((res) => { release = () => res({ version: "2.99.0" }); }),
    ghAvailable: async () => false,
  };
  const h = makeHandlers({ store, provider, triage: noTriage, ghBin: "/tmp/gh", ghTmp: "/tmp/ghtmp" });
  assert.equal((await h.postAuthInstallGh()).started, true);
  assert.equal((await h.getAuth()).install.phase, "installing");
  release();
  await new Promise((r) => setTimeout(r, 0));
  const st = await h.getAuth();
  assert.equal(st.install.phase, "done");
  assert.equal(st.install.version, "2.99.0");
});

test("postAuthBind 错误映射：invalid account / gh-not-installed / gh-not-authorized / token-invalid / account-mismatch", async () => {
  const mk = (mode) => makeHandlers({ store: openStore(), provider: PROVIDER(mode), triage: noTriage });
  assert.equal((await mk({ token: "tk", viewerLogin: "o" }).postAuthBind({ account: "bad name" })).error, "invalid account");
  const noInstall = await mk({ gh: false }).postAuthBind({ account: "o" });
  assert.deepEqual([noInstall.error, noInstall.status], ["gh-not-installed", 409]);
  assert.equal((await mk({}).postAuthBind({ account: "o" })).error, "gh-not-authorized");
  const invalid = await mk({ token: "tk" }).postAuthBind({ account: "o" });
  assert.equal(invalid.status, 409);
  assert.match(invalid.error, /^token-invalid \(github api 401 for \/user\)$/);
  assert.equal((await mk({ token: "tk", viewerLogin: "someone-else" }).postAuthBind({ account: "o" })).error, "account-mismatch: someone-else");
});

test("postAuthLogout：只清绑定，watch/设置保留；refresh 重新 401", async () => {
  const store = openStore();
  login(store);
  store.setWatch(["o/good"]);
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk", viewerLogin: "o" }), triage: noTriage });
  await h.postAuthBind({ account: "o" });
  assert.deepEqual(await h.postAuthLogout(), { ok: true });
  assert.equal((await h.postRefresh()).status, 401);
  assert.equal(store.getAuth().account, null);
  assert.deepEqual(store.getWatch().repos, ["o/good"]);
  assert.equal(store.getSettings().intervalMinutes, 0);
});

// ── Task 5：门禁 getAuth 重塑 + 凭据端点（verify/PUT/DELETE）────────
const PROVIDER5 = (mode = {}) => ({
  ...PROVIDER(mode),
  ghLoginWithToken: async () => { if (mode.ghWrite === false) throw new Error("no gh"); return { ok: true }; },
  ghLogout: async () => { if (mode.ghLogoutFail) throw new Error("gh auth logout failed (1)"); return { ok: true }; },
});
const healthyCred = (store, token = "tk") => store.setCredential({ token, source: "device-flow", scopes: ["repo", "read:org"], verifiedAt: "2026-11-19T00:00:00.000Z", healthy: true, ghWrittenAt: "2026-11-19T00:00:01.000Z" });

test("getAuth 门禁重塑：gates 三关组合与 credential 块形状", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER5({ token: "tk", viewerLogin: "iasiv5" }), triage: noTriage });
  let st = await h.getAuth();   // gh 在、gh 登录、凭据未校验 → credentialOk false
  assert.deepEqual(st.gates, { ghInstalled: true, ghLogin: true, credentialOk: false });
  assert.equal(st.viewerLogin, "iasiv5");
  assert.equal(st.credential.configured, false);
  assert.equal(st.credential.healthy, true);
  assert.equal(st.credential.ghWrittenByUs, false);
  assert.equal(st.account, null);
  healthyCred(store);           // 预置健康凭据 → 全绿
  st = await h.getAuth();
  assert.deepEqual(st.gates, { ghInstalled: true, ghLogin: true, credentialOk: true });
  assert.equal(st.credential.configured, true);
  assert.deepEqual(st.credential.scopes, ["repo", "read:org"]);
  assert.equal(st.credential.ghWrittenByUs, true);
  store.setCredential({ healthy: false });   // 被动失效 → credentialOk false
  st = await h.getAuth();
  assert.equal(st.gates.credentialOk, false);
});

test("postCredentialVerify：成功落库 / missing / token-invalid 置 unhealthy / rate-limited 不改 healthy 且置横幅时刻 / net 映射", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER5({ token: "tk" }), triage: noTriage });
  const ok = await h.postCredentialVerify();
  assert.equal(ok.login, "o");
  assert.deepEqual(ok.scopes, ["repo", "read:org"]);
  assert.equal(store.getCredential().verifiedAt, "2026-11-19T00:00:00.000Z");
  assert.equal(store.getCredential().healthy, true);
  assert.equal((await makeHandlers({ store: openStore(), provider: PROVIDER5({}), triage: noTriage }).postCredentialVerify()).error, "credential-missing");
  const badStore = openStore();
  const bad = makeHandlers({ store: badStore, provider: PROVIDER5({ token: "tk", verify: "invalid" }), triage: noTriage });
  const r = await bad.postCredentialVerify();
  assert.equal(r.status, 409);
  assert.match(r.error, /token-invalid/);
  assert.equal(badStore.getCredential().healthy, false);
  const limStore = openStore();
  const lim = makeHandlers({ store: limStore, provider: PROVIDER5({ token: "tk", verify: "rate" }), triage: noTriage });
  const lr = await lim.postCredentialVerify();
  assert.equal(lr.status, 409);
  assert.match(lr.error, /^rate-limited:120$/);
  assert.equal(limStore.getCredential().healthy, true);   // 限流不误伤
  assert.ok((await lim.getAuth()).credential.rateLimitedUntil);   // ISO 时刻已置（B9 横幅数据源）
  const net = makeHandlers({ store: openStore(), provider: PROVIDER5({ token: "tk", verify: "net" }), triage: noTriage });
  const nr = await net.postCredentialVerify();
  assert.equal(nr.status, 409);
  assert.match(nr.error, /^credential-verify-failed: /);
});

test("PUT credential：verify-before-save（失败不落库）+ 格式守卫 + 成功落库与移交标记", async () => {
  const store = openStore();
  const bad = makeHandlers({ store, provider: PROVIDER5({ verify: "invalid" }), triage: noTriage });
  const rb = await bad.putCredential({ token: "bad-token" });
  assert.equal(rb.status, 409);
  assert.match(rb.error, /^credential-invalid/);
  assert.equal(store.getCredential().token, null);   // 校验不过不落库
  assert.equal((await bad.putCredential({ token: "" })).error, "credential-format");
  assert.equal((await bad.putCredential({ token: "a b" })).error, "credential-format");
  assert.equal((await bad.putCredential({ token: "x".repeat(4097) })).error, "credential-format");
  const store2 = openStore();
  const h2 = makeHandlers({ store: store2, provider: PROVIDER5({ vLogin: "b-account", ghWrite: false }), triage: noTriage });
  const ok = await h2.putCredential({ token: "ghp_new" });
  assert.equal(ok.login, "b-account");
  assert.equal(store2.getCredential().token, "ghp_new");
  assert.equal(store2.getCredential().source, "manual-pat");
  assert.equal(store2.getCredential().ghWrittenAt, null);   // gh 不可用 → 不打移交标记
  const store3 = openStore();
  const h3 = makeHandlers({ store: store3, provider: PROVIDER5({}), triage: noTriage });
  await h3.putCredential({ token: "ghp_ok" });
  assert.ok(store3.getCredential().ghWrittenAt);   // gh 可用 → 移交并打标
});

test("PUT credential 换账号：viewerCache 失效，viewerLogin 即时刷新（R1-5）", async () => {
  const store = openStore();
  const provider = PROVIDER5({ token: "tk", viewerLogin: "old-acct", vLogin: "new-acct" });
  provider.getViewer = async ({ token }) => ({ login: token === "ghp_new" ? "new-acct" : "old-acct" });   // 按传入 token 回身份
  const h = makeHandlers({ store, provider, triage: noTriage, storedToken: async () => store.getCredential()?.token ?? null });   // host 同款注入（Task 7 预演）
  assert.equal((await h.getAuth()).viewerLogin, "old-acct");
  await h.putCredential({ token: "ghp_new" });
  assert.equal((await h.getAuth()).viewerLogin, "new-acct");
});

test("DELETE credential：ours 可带 gh logout；not-ours 409 但清除已执行；不请求 gh 时直接清", async () => {
  const store = openStore();
  healthyCred(store);
  login(store);
  let logoutCalled = 0;
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), ghLogout: async () => { logoutCalled++; return { ok: true }; } };
  const r = await makeHandlers({ store, provider, triage: noTriage }).deleteCredential({ ghLogout: true });
  assert.deepEqual(r, { cleared: true, ghLogoutDone: true });
  assert.equal(logoutCalled, 1);
  assert.equal(store.getCredential().token, null);
  assert.equal(store.getAuth().account, null);
  const store2 = openStore();
  login(store2);
  const h2 = makeHandlers({ store: store2, provider: { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), ghLogout: async () => { logoutCalled++; return { ok: true }; } }, triage: noTriage });
  const r2 = await h2.deleteCredential({ ghLogout: true });
  assert.equal(r2.status, 409);
  assert.equal(r2.error, "gh-not-ours");
  assert.equal(r2.cleared, true);
  assert.equal(store2.getAuth().account, null);
  assert.equal(logoutCalled, 1);   // gh 登录不是工作台建的，不动
  const store3 = openStore();
  healthyCred(store3);
  login(store3);
  const r3 = await makeHandlers({ store: store3, provider: PROVIDER5({ token: "tk", viewerLogin: "o" }), triage: noTriage }).deleteCredential({});
  assert.deepEqual(r3, { cleared: true, ghLogoutDone: false });
});

test("device 流成功：verifyToken 替换 getViewer，凭据块落 verifiedAt/实读 scopes/ghWrittenAt（R1-2）；clientId 覆写全链透传（评审问题 5）", async () => {
  const store = openStore();
  const seen = [];
  const provider = {
    ...PROVIDER5({ token: "tk2", viewerLogin: "iasiv5" }),
    deviceCodeStart: async (opts) => { seen.push(["start", opts.clientId]); return { deviceCode: "DC", userCode: "ABCD-1234", verificationUri: "https://github.com/login/device", expiresAt: Date.now() + 60000, interval: 0 }; },
    deviceCodePoll: async (opts) => { seen.push(["poll", opts.clientId]); return { token: "tk2" }; },
    getViewer: async () => { seen.push("getViewer"); return { login: "x" }; },
    verifyToken: async (tk) => { seen.push("verify:" + tk); return { login: "iasiv5", scopes: ["repo", "read:org"], fineGrained: false, verifiedAt: "2026-11-19T00:00:02.000Z" }; },
  };
  const h = makeHandlers({ store, provider, triage: noTriage, githubClientId: "my-client-id" });
  await h.postAuthDeviceStart();
  await new Promise((res) => setTimeout(res, 20));   // interval:0 → 立即轮询完成后台循环
  assert.equal((await h.getAuthDevice()).phase, "authorized");
  assert.deepEqual(seen.filter((s) => Array.isArray(s)), [["start", "my-client-id"], ["poll", "my-client-id"]]);   // 两端口径一致
  assert.deepEqual(seen.filter((s) => typeof s === "string" && s.startsWith("verify")), ["verify:tk2"]);
  assert.equal(seen.includes("getViewer"), false);   // 设备流路径不再调 getViewer
  const c = store.getCredential();
  assert.equal(c.source, "device-flow");
  assert.deepEqual(c.scopes, ["repo", "read:org"]);
  assert.equal(c.verifiedAt, "2026-11-19T00:00:02.000Z");
  assert.ok(c.ghWrittenAt);
  assert.equal(store.getAuth().account, "iasiv5");   // 既有自动绑定保持
});

test("postAuthBind 成功后凭据块持久化 scopes/verifiedAt（B3 实读）", async () => {
  const store = openStore();
  const provider = { ...PROVIDER({ token: "tk", viewerLogin: "IasiV5" }), verifyToken: async () => ({ login: "IasiV5", scopes: ["repo", "read:org"], fineGrained: false, verifiedAt: "2026-11-19T00:00:03.000Z" }) };
  await makeHandlers({ store, provider, triage: noTriage }).postAuthBind({});
  assert.deepEqual(store.getCredential().scopes, ["repo", "read:org"]);
  assert.equal(store.getCredential().verifiedAt, "2026-11-19T00:00:03.000Z");
});

test("bind 遇 401：token-invalid 锚映射不变，且 healthy=false（被动失效）", async () => {
  const store = openStore();
  store.setCredential({ token: "tk", scopes: ["repo"], verifiedAt: "T0", healthy: true });
  const h = makeHandlers({ store, provider: PROVIDER({ token: "tk" }), triage: noTriage });
  const r = await h.postAuthBind({ account: "o" });
  assert.match(r.error, /^token-invalid/);
  assert.equal(store.getCredential().healthy, false);
});

// ── Task 6：刷新配额卫生 ────────────────────────────────────────
test("postRefresh 单飞：进行中新触发 409 refresh-in-progress", async () => {
  const store = openStore(); login(store);
  store.setWatch(["o/good"]);
  let release;
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }),
    listOpenIssues: () => new Promise((res) => { release = () => res([]); }),
    listOpenPulls: async () => [] };
  const h = makeHandlers({ store, provider, triage: noTriage });
  const first = h.postRefresh();
  await new Promise((r) => setTimeout(r, 0));   // 让首个刷新进入 in-flight
  // 无单飞实现时第二调用会与首个共享 pending promise 造成死锁——500ms 超时兜底，明确失败而非挂死
  const second = await Promise.race([h.postRefresh(), new Promise((res) => setTimeout(() => res({ status: -1, error: "timeout" }), 500))]);
  assert.equal(second.status, 409);
  assert.equal(second.error, "refresh-in-progress");
  release();
  const r = await first;
  assert.ok(r.perRepo);
});

test("postRefresh 预算：跨仓共享硬上限，耗尽置 partial 并写 ingestLog", async () => {
  const store = openStore(); login(store);
  const repos = Array.from({ length: 35 }, (_, i) => "a/r" + i);   // 每仓 issues+pulls 各 1 页 = 2 预算 → 35 仓需 70 > 60
  store.setWatch(repos);
  const burn = async ({ budget }) => {   // 桩模拟 provider 层预算消费契约（真实逐页扣减在 github.test pagedGet 用例覆盖）
    if (budget && budget.remaining <= 0) { budget.exhausted = true; return []; }
    if (budget) budget.remaining -= 1;
    return [];
  };
  const h = makeHandlers({ store, provider: { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), listOpenIssues: burn, listOpenPulls: burn }, triage: noTriage });
  const r = await h.postRefresh();
  assert.equal(r.partial, true);
  assert.equal(store.getIngestLog().at(-1).partial, true);
});

test("postRefresh 401：被动失效置 healthy=false（材料保留），已获取仓照常入库，响应 credential-unhealthy", async () => {
  const store = openStore(); login(store);
  healthyCred(store, "tk");
  store.setWatch(["o/good", "o/bad"]);
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }),
    listOpenIssues: async ({ repo }) => {
      if (repo === "o/bad") { const e = new Error("github api 401 for /repos/o/bad/issues"); e.status = 401; throw e; }
      return [{ repo, type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }];
    },
    listOpenPulls: async () => [] };
  const h = makeHandlers({ store, provider, triage: noTriage });
  const r = await h.postRefresh();
  assert.equal(r.status, 409);
  assert.match(r.error, /^credential-unhealthy/);
  assert.equal(store.getCredential().healthy, false);
  assert.equal(store.getCredential().token, "tk");       // 凭据材料保留待重校验
  assert.equal(store.listCandidates().length, 1);        // 已获取的仓照常入库
});

test("postRefresh 摄取前静默校验：超时校验一次，TTL 内不重复（stub 计数）", async () => {
  const store = openStore(); login(store);
  healthyCred(store, "tk");   // verifiedAt 在过去 → 首次刷新触发校验
  let verifyCount = 0;
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }),
    verifyToken: async () => { verifyCount++; return { login: "o", scopes: ["repo", "read:org"], fineGrained: false, verifiedAt: new Date().toISOString() }; },
    listOpenIssues: async () => [], listOpenPulls: async () => [] };
  const h = makeHandlers({ store, provider, triage: noTriage });
  await h.postRefresh();
  assert.equal(verifyCount, 1);
  await h.postRefresh();
  assert.equal(verifyCount, 1);   // 刚校验过 → TTL 内跳过
});

test("getDiscover 401：被动失效置 healthy=false（B10 双路径收编 R1-14）", async () => {
  const store = openStore(); login(store);
  healthyCred(store, "tk");
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), listUserRepos: async () => { const e = new Error("github api 401 for /user/repos"); e.status = 401; throw e; } };
  const h = makeHandlers({ store, provider, triage: noTriage });
  const r = await h.getDiscover();
  assert.equal(r.status, 409);
  assert.match(r.error, /^credential-unhealthy/);
  assert.equal(store.getCredential().healthy, false);
});

test("getState：auth 载荷带 credential 健康摘要（无网络探测）", async () => {
  const store = openStore(); login(store);
  healthyCred(store, "tk");
  const h = makeHandlers({ store, provider: PROVIDER5({ token: "tk", viewerLogin: "o" }), triage: noTriage });
  const st = await h.getState();
  assert.deepEqual(st.auth.credential, { configured: true, healthy: true, verifiedAt: "2026-11-19T00:00:00.000Z", rateLimitedUntil: null });
});

test("postRefresh 304 集成回归（评审 R1-1）：未变化仓二轮刷新——候选保留 inbox、perRepo 计数不变、无误回收", async () => {
  const realGithub = await import("../src/github.mjs");
  const store = openStore(); login(store); healthyCred(store);
  store.setWatch(["o/r"]);
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, inm: init?.headers?.["if-none-match"] ?? null });
    const etag = 'W/"e"';
    if (init?.headers?.["if-none-match"] === etag) return { ok: false, status: 304, headers: { get: () => null } };
    const path = new URL(url).pathname;
    if (path.endsWith("/issues")) {
      const pageNo = Number(new URL(url).searchParams.get("page")) || 1;
      if (pageNo >= 2) return { ok: true, status: 200, headers: { get: () => null }, json: async () => [] };   // 总长 1 行：page1 后即止
      return { ok: true, status: 200, headers: { get: (x) => (x.toLowerCase() === "etag" ? etag : null) }, json: async () => [{ number: 7, title: "t", user: { login: "u" }, labels: [], created_at: "2026-11-01T00:00:00Z", updated_at: "T", html_url: "U", comments: 0, reactions: { total_count: 0 }, body: "b" }] };
    }
    if (path.endsWith("/pulls")) return { ok: true, status: 200, headers: { get: () => null }, json: async () => [] };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ default_branch: "main", ssh_url: "git@github.com:o/r.git" }) };   // /repos/o/r
  };
  const h = makeHandlers({ store, provider: { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), listOpenIssues: realGithub.listOpenIssues, listOpenPulls: realGithub.listOpenPulls, getRepo: realGithub.getRepo }, triage: noTriage, fetch: f });
  const calls1 = calls.length;
  const r1 = await h.postRefresh();
  assert.equal(r1.perRepo["o/r"].issues, 1);
  assert.equal(store.getCandidate("o/r#issue#7").stage, "inbox");
  const calls2Start = calls.length;
  const r2 = await h.postRefresh();
  assert.equal(r2.perRepo["o/r"].issues, 1);                          // 计数不归零
  assert.equal(r2.perRepo["o/r"].error, null);
  assert.equal(store.getCandidate("o/r#issue#7").stage, "inbox");     // 不误回收（阻断主断言）
  assert.equal(store.getCandidate("o/r#issue#7").history.some((x) => x.event === "upstream-closed"), false);
  const secondRound = calls.slice(calls2Start);
  assert.equal(secondRound.length, 3);                                // issues 304 + pulls 200 + getRepo 200（页长终止，不越界）
  assert.equal(secondRound[0].inm, 'W/"e"');
});

test("getAuth gh 探测 30s 进程缓存（评审 S4）：重复轮询不重探；install 完成即失效", async () => {
  const store = openStore();
  let probes = 0;
  const provider = { ...PROVIDER5({ token: "tk", viewerLogin: "o" }), ghAvailable: async () => { probes++; return true; } };
  const h = makeHandlers({ store, provider, triage: noTriage });
  await h.getAuth();
  await h.getAuth();
  await h.getAuth();
  assert.equal(probes, 1);   // 30s 内只探一次
  let release;
  const installer = {
    ...provider,
    ghAvailable: async () => { probes++; return false; },
    ghInstall: () => new Promise((res) => { release = () => res({ version: "2.99.0" }); }),
  };
  const h2 = makeHandlers({ store, provider: installer, triage: noTriage, ghBin: "/tmp/gh", ghTmp: "/tmp/ghtmp" });
  await h2.postAuthInstallGh();
  await h2.getAuth();          // installing 期间（缓存被 install 开始后首探刷新）
  release();
  await new Promise((r) => setTimeout(r, 0));
  await h2.getAuth();          // done 后缓存失效 → 重探
  assert.ok(probes >= 3);
});

// ---- Task 9：run 四路由 + postGate 别名（engine 真 makeEngine + fake workspace/executor）----
const fakeRunWorkspace = () => ({ ensure: async () => ({ dir: "/ws", cloned: false }), dirOf: () => "/ws", sweep: async () => ({ removed: [] }) });
const fakeRunExecutor = () => {
  const inflight = new Map(); const sent = [];
  const exe = { inflight, sent,
    runAgentNode(args) { const { run, node } = args; const key = run.id + ":" + node.id; const entry = {}; inflight.set(key, entry); sent.push({ sessionId: key, msg: { text: (args.prompt ?? '') + JSON.stringify(args.upstream ?? []).slice(0, 200) } });
      const promise = new Promise((resolve) => { entry.resolve = (r) => { inflight.delete(key); resolve(r); }; });
      return { promise, cancel: () => entry.resolve({ ok: false, error: "cancelled" }) }; },
    runScriptNode(args) { return exe.runAgentNode(args); } };
  return exe;
};
const drainRun = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test("任务包 v2 生产接线（M4 残留落账）：postRunStart 产 v2 包 + runId 先行 + unknown-template 早守卫", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  // unknown-template：404 且不动候选（setGate/setStage 未发生）
  const bad = await h.postRunStart({ key: "o/r#issue#1", templateId: "nope" });
  assert.match(bad.error, /unknown-template/);
  assert.equal(store.getCandidate("o/r#issue#1").stage, "gating");
  assert.equal(store.listRuns().length, 0);
  // 正常启动：v2 包 + runId 先行（workflow.runId === 返回 runId）
  const r = await h.postRunStart({ key: "o/r#issue#1" });
  assert.equal(r.taskPackage.version, 2);
  assert.equal(r.taskPackage.role.roleId, "loop-builder");
  assert.equal(r.taskPackage.role.name, "Loop 构建者");
  assert.equal(r.taskPackage.role.executionPolicy, "auto");
  assert.equal(r.taskPackage.workflow.runId, r.runId);
  assert.equal(r.taskPackage.workflow.templateId, "loop-v1");
  assert.equal(r.taskPackage.workflow.nodeId, "build");
  assert.ok(r.taskPackage.workflow.templateRevision);
  // run 落库与包一致；落库包同为 v2
  assert.equal(store.getRun(r.runId).candidateKey, "o/r#issue#1");
  assert.equal(store.getCandidate("o/r#issue#1").taskPackage.version, 2);
});
test("任务包 v2 生产接线：postGate 别名路由同款 v2（双路由一致，防双轨）", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass" });
  assert.equal(r.taskPackage.version, 2);
  assert.equal(r.taskPackage.role.roleId, "loop-builder");
  assert.equal(r.taskPackage.workflow.runId, r.runId);
  assert.equal(r.taskPackage.workflow.templateId, "loop-v1");
});

test("run 路由：start 链/409/gate/cancel/retry/engine 缺省 503", async () => {
  const store = openStore(); login(store); seed(store);
  store.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const executor = fakeRunExecutor();
  const engine = makeEngine({ store, workspace: makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-rt-")), execFile: async () => {} }),
    executor, concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "gate-requires-gating");
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postRunStart({ key: "o/r#issue#1" });
  assert.ok(r.runId); assert.equal(r.workspace, "cloning"); assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.ok(store.getCandidate("o/r#issue#1").taskPackage);   // 评审 R1-16：pkg 落库（引擎读它组装 prompt）
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "run-already-active");
  await drainRun();
  executor.inflight.get(r.runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drainRun();
  executor.inflight.get(r.runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drainRun();
  assert.equal(store.getRun(r.runId).nodeStates.g2.status, "waiting");
  assert.equal((await h.postRunGate({ runId: r.runId, nodeId: "g2", decision: "pass" })).ok, true);
  await drainRun();
  assert.equal((await h.postRunRetry({ runId: r.runId, nodeId: "deliver" })).error, "retry-requires-failed-or-cancelled");   // 评审 R2-2
  assert.equal((await h.postRunCancel({ runId: r.runId, reason: "test" })).ok, true);
  assert.equal(store.getCandidate("o/r#issue#1").stage, "gating");
  const noEngine = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noEngine.postRunStart({ key: "o/r#issue#1" })).error, "engine-not-wired");
});
test("postGate 别名：G1 pass 追加 runId 并创建 run", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass", note: "" });
  assert.ok(r.taskPackage); assert.ok(r.runId);
  assert.equal(store.getRun(r.runId).nodeStates.g1.status, "succeeded");
  assert.equal(store.getCandidate("o/r#issue#1").stage, "building");
});

test("release/confirm：G3 发版确认落痕；非 shipped/重复确认 409", async () => {
  const store = openStore(); login(store); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-requires-shipped");
  store.setStage("o/r#issue#1", "shipped", "v2");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1", note: "0.2.5" })).ok, true);
  const c = store.getCandidate("o/r#issue#1");
  assert.ok(c.release.confirmedAt);
  assert.equal(c.history.at(-1).event, "release.confirmed");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-already-confirmed");
});

test("角色三方法：upsert 往返/删除守卫/getRoles 合并列表", async () => {
  const store = openStore(); login(store); seed(store);
  const { makeEngine } = await import("../src/engine/engine.mjs");
  const { makeWorkspace } = await import("../src/engine/workspace.mjs");
  const { makeExecutor } = await import("../src/engine/executor.mjs");
  const { LOOP_V1 } = await import("../src/workflows/builtin.mjs");
  const { BUILTIN_ROLES } = await import("../src/workflows/roles.mjs");
  const engine = makeEngine({ store, workspace: fakeRunWorkspace(), executor: fakeRunExecutor(), concurrencyOf: () => 2 });
  const fakeT = { id: "user-t", nodes: [{ id: "x", type: "agent", roleId: "busy" }], edges: [] };
  const templates = { [LOOP_V1.id]: LOOP_V1, "user-t": fakeT };
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine, templates });
  // upsert 往返
  assert.equal((await h.postRolesUpsert({ role: { id: "my-builder", name: "我的构建", prompt: "p", executionPolicy: "auto" } })).ok, true);
  assert.equal(store.getRole("my-builder").prompt, "p");
  // builtin 覆盖层放行删除（评审 R1-4/P9②）：模板引用内置本体，删覆盖层回落内置
  await h.postRolesUpsert({ role: { id: "loop-builder", name: "覆盖版", prompt: "覆盖 prompt", executionPolicy: "ask" } });
  assert.equal((await h.postRolesDelete({ id: "loop-builder" })).ok, true);
  assert.equal(store.getRole("loop-builder"), null);
  // 自定义角色被模板引用 → 409（评审 P2②/R1-2：引用守卫含位置详情）
  await h.postRolesUpsert({ role: { id: "busy", name: "被引用", prompt: "p", executionPolicy: "ask" } });
  assert.match((await h.postRolesDelete({ id: "busy" })).error, /role-in-use: busy/);
  // 存活 run 快照守卫（评审 R1-2 修正）：snapshot.nodes roleId 在活跃 run 中 → 409
  store.saveRun({ id: "r-snap", candidateKey: "o/r#issue#1", templateId: "user-t", templateRevision: "x",
    snapshot: { id: "user-t", nodes: [{ id: "x", type: "agent", roleId: "my-builder" }], edges: [] },
    nodeStates: { x: { status: "running", attempt: 1, reworkCount: 0, error: null, artifacts: [] } },
    status: "running", cancelReason: null, createdAt: "T", updatedAt: "T", history: [] });
  assert.match((await h.postRolesDelete({ id: "my-builder" })).error, /r-snap/);
  // delete 空闲成功
  assert.equal((await h.postRolesUpsert({ role: { id: "tmp", name: "临时", prompt: "x", executionPolicy: "ask" } })).ok, true);
  assert.equal((await h.postRolesDelete({ id: "tmp" })).ok, true);
  // getRoles 合并单列表 + overridden
  const roles = await h.getRoles();
  assert.ok(roles.roles.length >= 4);   // 4 builtin
  const lb = roles.roles.find((r) => r.id === "loop-builder");
  assert.equal(lb.overridden, false);
  assert.equal(lb.builtin, true);
});

test("feishu 路由：webhook 写入 credentials、测试发送走注入通知器；未装配 503", async () => {
  const store = openStore(); login(store);
  const saved = [];
  const credentials = { set: async (ref, v) => { saved.push([ref, v]); }, resolve: async (ref) => { const hit = saved.find(([r]) => r === ref); return hit ? { value: hit[1] } : undefined; } };
  const notifier = { sendNotice: async (t) => ({ sent: true, text: t }), testSend: async () => ({ sent: true }) };
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, credentials,
    feishu: { notifier, setWebhook: async (url) => { await credentials.set("DSH_L_FEISHU_WEBHOOK_URL", url); } } });
  const PREFIX = "https://open.feishu.cn/open-apis/bot/v2/hook/";
  assert.equal((await h.putFeishuWebhook({ url: "http://evil" })).error, "invalid webhook");
  assert.equal((await h.putFeishuWebhook({ url: PREFIX })).error, "invalid webhook");   // M5 T3：空 token
  assert.equal((await h.putFeishuWebhook({ url: PREFIX + "   " })).error, "invalid webhook");   // M5 T3：空白 token（评审 R-10）
  // M7 T2/§16-3（评审建议11 粒度）：合法 token trim 入库 + 纯空白仍拒回归
  assert.equal((await h.putFeishuWebhook({ url: PREFIX + "tok  " })).ok, true);
  assert.equal(saved.at(-1)[1], PREFIX + "tok");   // trim 后入库
  assert.equal((await h.putFeishuWebhook({ url: PREFIX + "   " })).error, "invalid webhook");
  assert.equal((await h.putFeishuWebhook({ url: PREFIX + "abc" })).ok, true);
  assert.equal(saved.at(-1)[1], PREFIX + "abc");
  assert.equal(saved.length, 2);   // 拒单不落库
  const r = await h.postFeishuTest();
  assert.equal(r.sent, true);
  const noFeishu = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noFeishu.postFeishuTest()).error, "feishu-not-wired");
});
