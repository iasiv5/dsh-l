import test from "node:test";
import assert from "node:assert/strict";
import * as github from "../src/github.mjs";

const page = (rows) => ({ ok: true, status: 200, json: async () => rows });
const fetchPages = (...pages) => {
  const calls = [];
  return { calls, f: async (url, init) => { calls.push({ url, init }); return pages.shift() ?? page([]); } };
};
const issue = (n, extra = {}) => ({ number: n, title: "i" + n, user: { login: "u" }, labels: [{ name: "bug" }], created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-02T00:00:00Z", html_url: "U", comments: 2, reactions: { total_count: 3 }, body: "b", ...extra });

test("issues 剔除 pull_request 行，带 Authorization", async () => {
  const { f, calls } = fetchPages(page([issue(1, { pull_request: {} }), issue(2)]));
  const rows = await github.listOpenIssues({ repo: "o/r", token: "tk", fetch: f });
  assert.deepEqual(rows.map((r) => r.number), [2]);
  assert.equal(rows[0].type, "issue");
  assert.deepEqual(rows[0].labels, ["bug"]);
  assert.equal(calls[0].init.headers.authorization, "Bearer tk");
  assert.ok(calls[0].url.startsWith("https://api.github.com/repos/o/r/issues?state=open"));
});

test("分页拼接：满 100 继续翻页", async () => {
  const full = Array.from({ length: 100 }, (_, i) => issue(i + 1));
  const { f, calls } = fetchPages(page(full), page([issue(101)]));
  assert.equal((await github.listOpenIssues({ repo: "o/r", token: null, fetch: f })).length, 101);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers.authorization, undefined);
});

test("pulls 映射 draft", async () => {
  const { f } = fetchPages(page([{ ...issue(7), draft: true, head: { ref: "b" } }]));
  const rows = await github.listOpenPulls({ repo: "o/r", token: null, fetch: f });
  assert.equal(rows[0].type, "pull");
  assert.equal(rows[0].pull.draft, true);
});

test("非 2xx 抛带路径的错误", async () => {
  const f = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(github.listOpenPulls({ repo: "o/x", token: null, fetch: f }), /github api 404 for \/repos\/o\/x\/pulls/);
});

// ── pagedGet 额度卫生（Task 4）：ETag 键=完整 URL、预算、err.status、仓库发现扩面 ──
test("pagedGet：ETag 键含 page——同 path 两 page 各自 304，回放上轮内容", async () => {
  const full = Array.from({ length: 100 }, (_, i) => issue(i + 1));
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, inm: init.headers["if-none-match"] });
    const pageNo = Number(new URL(url).searchParams.get("page"));
    if (calls.length <= 2) {
      return { ok: true, status: 200, headers: { get: (x) => (x.toLowerCase() === "etag" ? (pageNo === 1 ? 'W/"p1"' : 'W/"p2"') : null) }, json: async () => (pageNo === 1 ? full : [issue(101)]) };
    }
    return { ok: false, status: 304, headers: { get: () => null } };
  };
  const r1 = await github.pagedGet("/repos/o/r/issues?state=open", { token: "tk", fetch: f });
  assert.equal(r1.items.length, 101);
  assert.equal(r1.partial, false);
  const r2 = await github.pagedGet("/repos/o/r/issues?state=open", { token: "tk", fetch: f });
  assert.equal(r2.unchanged, true);            // 全部页 304
  assert.equal(r2.items.length, 101);          // 回放上轮两页内容（评审 R1-1：调用方零分支自然正确）
  assert.equal(r2.partial, false);
  assert.equal(calls[2].inm, 'W/"p1"');   // page1 带自己的 etag
  assert.equal(calls[3].inm, 'W/"p2"');   // page2 带自己的 etag（键含 page 的回归锚）
  assert.equal(calls.length, 4);              // 页长判断终止翻页：不越界预取 page3（次生 a）
});

test("pagedGet：单页仓 304 → 回放该页行、unchanged 置位", async () => {
  let n = 0;
  const calls = [];
  const f = async (url, init) => {
    calls.push(init.headers["if-none-match"]);
    n++;
    if (n === 1) return { ok: true, status: 200, headers: { get: (x) => (x.toLowerCase() === "etag" ? 'W/"s"' : null) }, json: async () => [issue(1)] };
    return { ok: false, status: 304, headers: { get: () => null } };
  };
  await github.pagedGet("/repos/o/uni1/issues", { token: "tk", fetch: f });
  const r2 = await github.pagedGet("/repos/o/uni1/issues", { token: "tk", fetch: f });
  assert.equal(r2.unchanged, true);
  assert.equal(r2.items.length, 1);            // 回放而非空数组（评审 R1-1）
  assert.equal(r2.partial, false);
  assert.equal(calls[1], 'W/"s"');
});

test("pagedGet：预算耗尽截断 partial；剩余 0 时不发请求", async () => {
  const full = Array.from({ length: 100 }, (_, i) => issue(i + 1));
  const calls = [];
  const f = async (url) => { calls.push(url); return { ok: true, status: 200, headers: { get: () => null }, json: async () => full }; };
  const r = await github.pagedGet("/repos/o/uni2/issues", { token: null, fetch: f, budget: { remaining: 1 } });
  assert.equal(r.items.length, 100);
  assert.equal(r.partial, true);
  assert.equal(calls.length, 1);
  const r0 = await github.pagedGet("/repos/o/uni2/pulls", { token: null, fetch: f, budget: { remaining: 0 } });
  assert.deepEqual(r0, { items: [], partial: true, unchanged: false });
  assert.equal(calls.length, 1);
});

test("pagedGet：错误对象挂 err.status，消息风格不变", async () => {
  const f = async () => ({ ok: false, status: 401, headers: { get: () => null }, json: async () => ({}) });
  await assert.rejects(github.pagedGet("/repos/o/uni3/pulls", { token: "tk", fetch: f }), /github api 401/);
  try {
    await github.pagedGet("/repos/o/uni3/pulls", { token: "tk", fetch: f });
    assert.fail("should reject");
  } catch (e) {
    assert.equal(e.status, 401);
    assert.match(e.message, /github api 401 for \/repos\/o\/uni3\/pulls/);
  }
});

test("listUserRepos：affiliation 扩 owner,collaborator,organization_member", async () => {
  const calls = [];
  const f = async (url) => { calls.push(url); return { ok: true, status: 200, headers: { get: () => null }, json: async () => [{ full_name: "o/r", pushed_at: "T", visibility: "private" }] }; };
  const rows = await github.listUserRepos({ token: "tk", fetch: f });
  assert.equal(rows[0].fullName, "o/r");
  assert.ok(calls[0].includes("affiliation=owner,collaborator,organization_member"));
  assert.ok(calls[0].includes("sort=pushed"));
});

test("getRepo 取真实默认分支与 SSH 克隆地址，带 token", async () => {
  const { f, calls } = fetchPages(page({ default_branch: "master", ssh_url: "git@github.com:o/r.git" }));
  const r = await github.getRepo({ repo: "o/r", token: "tk", fetch: f });
  assert.deepEqual(r, { defaultBranch: "master", cloneUrl: "git@github.com:o/r.git" });
  assert.ok(calls[0].url.startsWith("https://api.github.com/repos/o/r"));
  assert.equal(calls[0].init.headers.authorization, "Bearer tk");
});

test("getRepo 字段缺失时兜底 main 与 SSH 惯例地址", async () => {
  const { f } = fetchPages(page({}));
  const r = await github.getRepo({ repo: "o/r", token: null, fetch: f });
  assert.deepEqual(r, { defaultBranch: "main", cloneUrl: "git@github.com:o/r.git" });
});

test("token 解析顺序：配置引用 → gh → null；非法引用名跳过", async () => {
  const cred = (v) => ({ resolve: async (ref) => (ref === "GH_TOKEN" && v ? { value: v, source: "env" } : undefined) });
  const gh = (out) => async () => ({ stdout: out });
  const noGh = async () => { throw new Error("no gh"); };
  assert.equal(await github.resolveToken({ credentials: cred("ck"), tokenRef: "GH_TOKEN", execFile: gh("gk\n") }), "ck");
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: "GH_TOKEN", execFile: gh(" gk ") }), "gk");
  assert.equal(await github.resolveToken({ credentials: cred("ck"), tokenRef: "bad name", execFile: gh("gk") }), "gk");
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: null, execFile: noGh }), null);
});

test("token 三级链：配置引用 → 工作台自存(storedToken) → gh → null", async () => {
  const cred = (v) => ({ resolve: async (ref) => (ref === "GH_TOKEN" && v ? { value: v, source: "env" } : undefined) });
  const gh = (out) => async () => ({ stdout: out });
  const noGh = async () => { throw new Error("no gh"); };
  const stored = (v) => async () => v;
  assert.equal(await github.resolveToken({ credentials: cred("ck"), tokenRef: "GH_TOKEN", storedToken: stored("sk"), execFile: gh("gk") }), "ck");   // 引用最优先
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: "GH_TOKEN", storedToken: stored("sk"), execFile: gh("gk") }), "sk");   // stored 次之
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: "GH_TOKEN", storedToken: stored(""), execFile: gh("gk") }), "gk");   // stored 空串 → gh 兜底
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: "GH_TOKEN", storedToken: stored("sk"), execFile: noGh }), "sk");   // 无 gh 时 stored 兜住
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: "GH_TOKEN", storedToken: async () => { throw new Error("boom"); }, execFile: gh("gk") }), "gk");   // stored 抛错不炸
  assert.equal(await github.resolveToken({ credentials: cred(null), tokenRef: null, storedToken: stored(null), execFile: noGh }), null);
});

test("getViewer：GET /user 拿 token 身份；401 抛错", async () => {
  const { f, calls } = fetchPages(page({ login: "iAsiV5" }));
  const v = await github.getViewer({ token: "tk", fetch: f });
  assert.deepEqual(v, { login: "iAsiV5" });
  assert.equal(calls[0].url, "https://api.github.com/user");
  assert.equal(calls[0].init.headers.authorization, "Bearer tk");
  const f401 = async () => ({ ok: false, status: 401, json: async () => ({}) });
  await assert.rejects(github.getViewer({ token: "bad", fetch: f401 }), /github api 401 for \/user/);
});

test("ghAvailable：--version 探测，异常按未安装", async () => {
  const ok = async () => ({ stdout: "gh version 2.45.0" });
  const boom = async () => { throw new Error("spawn gh ENOENT"); };
  assert.equal(await github.ghAvailable({ execFile: ok }), true);
  assert.equal(await github.ghAvailable({ execFile: boom }), false);
});


test("resolveToken/ghAvailable 支持 ghPath 兜底（插件私有 bin）", async () => {
  const onlyPath = async (cmd) => { if (cmd === "/custom/gh") return { stdout: "gk" }; throw new Error("no"); };
  assert.equal(await github.resolveToken({ credentials: null, tokenRef: null, execFile: onlyPath, ghPath: "/custom/gh" }), "gk");
  const pathOk = async (cmd) => { if (cmd === "gh") return { stdout: "v" }; throw new Error("no"); };
  assert.equal(await github.ghAvailable({ execFile: pathOk, ghPath: "/custom/gh" }), true);
  const noneOk = async () => { throw new Error("no"); };
  assert.equal(await github.ghAvailable({ execFile: noneOk, ghPath: "/custom/gh" }), false);
});

test("deviceCodeStart：POST /login/device/code 映射 user_code/verification_uri/interval", async () => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ device_code: "DC", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 5 }) };
  };
  const d = await github.deviceCodeStart({ fetch: f });
  assert.deepEqual([d.deviceCode, d.userCode, d.verificationUri], ["DC", "ABCD-1234", "https://github.com/login/device"]);
  assert.ok(calls[0].url.startsWith("https://github.com/login/device/code"));
  assert.deepEqual(JSON.parse(calls[0].init.body).client_id, github.GH_CLIENT_ID);
});

test("deviceCodeStart：clientId 可覆写（config.githubClientId 注入位）", async () => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ device_code: "DC", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", interval: 5 }) }; };
  await github.deviceCodeStart({ fetch: f, clientId: "my-client-id" });
  assert.deepEqual(JSON.parse(calls[0].init.body).client_id, "my-client-id");
});

test("deviceCodePoll：access_token 与 pending error 双路径", async () => {
  const ok = async () => ({ ok: true, status: 200, json: async () => ({ access_token: "tk" }) });
  assert.deepEqual(await github.deviceCodePoll({ deviceCode: "DC", fetch: ok }), { token: "tk" });
  const pending = async () => ({ ok: true, status: 200, json: async () => ({ error: "authorization_pending" }) });
  assert.deepEqual(await github.deviceCodePoll({ deviceCode: "DC", fetch: pending }), { error: "authorization_pending" });
});

// ── verifyToken（Task 3）：身份+scopes 一次取、ETag 条件请求、主/二级限流分型 ──
const hres = (status, { body = {}, headers = {}, text } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => text ?? JSON.stringify(body),
  headers: { get: (n) => headers[n.toLowerCase()] ?? null },
});

test("verifyToken：200 实读 X-OAuth-Scopes，多值去空白，首次不带 If-None-Match", async () => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return hres(200, { body: { login: "iasiv5" }, headers: { "x-oauth-scopes": "repo,  read:org , gist" } }); };
  const r = await github.verifyToken("tk", { fetch: f });
  assert.deepEqual(r.scopes, ["repo", "read:org", "gist"]);
  assert.equal(r.fineGrained, false);
  assert.equal(r.login, "iasiv5");
  assert.ok(r.verifiedAt);
  assert.equal(calls[0].init.headers.authorization, "Bearer tk");
  assert.equal(calls[0].init.headers["if-none-match"], undefined);
});

test("verifyToken：X-OAuth-Scopes 空 = 细粒度 PAT", async () => {
  const f = async () => hres(200, { body: { login: "iasiv5" }, headers: {} });
  const r = await github.verifyToken("tk", { fetch: f });
  assert.deepEqual(r.scopes, []);
  assert.equal(r.fineGrained, true);
});

test("verifyToken：401 → token-invalid", async () => {
  const f = async () => hres(401);
  await assert.rejects(github.verifyToken("bad", { fetch: f }), /token-invalid/);
});

test("verifyToken：403 主限流（Remaining:0）→ rate-limited:<reset 余秒，下限 60>", async () => {
  const reset = Math.floor(Date.now() / 1000) + 120;
  const f = async () => hres(403, { headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } });
  await assert.rejects(github.verifyToken("tk", { fetch: f }), /^Error: rate-limited:\d+$/);
});

test("verifyToken：403 二级限流（abuse：Remaining>0 + body 特征 + Retry-After）→ rate-limited:33", async () => {
  const f = async () => hres(403, { body: { message: "abuse detection mechanism: secondary rate limit" }, headers: { "x-ratelimit-remaining": "4900", "retry-after": "33" } });
  await assert.rejects(github.verifyToken("tk", { fetch: f }), /^Error: rate-limited:33$/);
});

test("verifyToken：429 → rate-limited:<Retry-After>", async () => {
  const f = async () => hres(429, { headers: { "retry-after": "10" } });
  await assert.rejects(github.verifyToken("tk", { fetch: f }), /^Error: rate-limited:10$/);
});

test("verifyToken：其余非 2xx 保持既有错误风格", async () => {
  const f = async () => hres(500);
  await assert.rejects(github.verifyToken("tk", { fetch: f }), /github api 500 for \/user/);
});

test("verifyToken：ETag 条件请求——200 存 etag，304 返回缓存 + notModified", async () => {
  const calls = [];
  let n = 0;
  const f = async (url, init) => {
    calls.push(init.headers["if-none-match"]);
    n++;
    if (n === 1) return hres(200, { body: { login: "iasiv5" }, headers: { "x-oauth-scopes": "repo", etag: 'W/"abc"' } });
    return hres(304);
  };
  const r1 = await github.verifyToken("tk", { fetch: f });
  assert.equal(r1.notModified, undefined);
  const r2 = await github.verifyToken("tk", { fetch: f });
  assert.equal(r2.notModified, true);
  assert.equal(r2.login, "iasiv5");
  assert.deepEqual(r2.scopes, ["repo"]);
  assert.ok(r2.verifiedAt);
  assert.equal(calls[0], undefined);
  assert.equal(calls[1], 'W/"abc"');
});

test("verifyToken：无缓存时 304 按既有错误风格上抛（不发生）", async () => {
  const f = async () => hres(304);
  await assert.rejects(github.verifyToken("tk-nocache-304", { fetch: f }), /github api 304 for \/user/);
});

test("scopesOk：repo 在场或细粒度空数组放行，缺 repo 拒绝", () => {
  assert.equal(github.scopesOk(["repo", "read:org"]), true);
  assert.equal(github.scopesOk([]), true);
  assert.equal(github.scopesOk(["read:org"]), false);
  assert.equal(github.scopesOk(null), false);
});

test("verifyToken：/user 缓存 LRU 上限 8，淘汰后重走全量", async () => {
  const mk = () => { let full = 0; const etag = 'W/"e"'; const f = async (url, init) => { if (init.headers["if-none-match"] === etag) return hres(304); full++; return hres(200, { body: { login: "L" }, headers: { etag } }); }; return { f, count: () => full }; };
  const tks = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
  const stubs = Object.fromEntries(tks.map((tk) => [tk, mk()]));
  for (const tk of tks) { await github.verifyToken(tk, { fetch: stubs[tk].f }); await github.verifyToken(tk, { fetch: stubs[tk].f }); }
  assert.equal(stubs.t1.count(), 1);   // 第二次走 304
  await github.verifyToken("t9", { fetch: mk().f });
  await github.verifyToken("t1", { fetch: stubs.t1.f });
  assert.equal(stubs.t1.count(), 2);   // 被 t9 挤出缓存 → 重走全量
});

test("ghLoginWithToken：token 走 stdin；spawn ENOENT 换下一候选；非零退出抛真实错误", async () => {
  const { EventEmitter } = await import("node:events");
  const mkChild = (code, failSpawn) => {
    const child = new EventEmitter();
    child.stdin = { write: () => {}, end: () => {} };
    queueMicrotask(() => { if (failSpawn) child.emit("error", new Error("ENOENT")); else child.emit("close", code); });
    return child;
  };
  let used = [];
  const spawnOk = (cmd) => { used.push(cmd); return mkChild(0, false); };
  assert.deepEqual(await github.ghLoginWithToken({ token: "tk", spawn: spawnOk, candidates: ["gh"] }), { ok: true });
  const spawnFallback = (cmd) => { used.push(cmd); return mkChild(0, cmd === "gh"); };
  assert.deepEqual(await github.ghLoginWithToken({ token: "tk", spawn: spawnFallback, candidates: ["gh", "/custom/gh"] }), { ok: true });
  assert.deepEqual(used.slice(-2), ["gh", "/custom/gh"]);
  const spawnFail = () => mkChild(1, false);
  await assert.rejects(github.ghLoginWithToken({ token: "tk", spawn: spawnFail, candidates: ["gh"] }), /failed \(1\)/);
});

test("ghLogout：stdin 关闭纪律（stdio ignore），候选序失败换下一个，全败抛真实错误", async () => {
  const { EventEmitter } = await import("node:events");
  const mkChild = (code) => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("close", code));
    return child;
  };
  const seen = [];
  const spawnOk = (cmd, args, opts) => { seen.push({ cmd, args, opts }); return mkChild(0); };
  assert.deepEqual(await github.ghLogout({ spawn: spawnOk, candidates: ["gh"] }), { ok: true });
  assert.equal(seen[0].args.join(" "), "auth logout --hostname github.com");
  assert.equal(seen[0].opts.stdio[0], "ignore", "stdin 必须关闭（多账号交互确认场景防挂起——评审问题 4）");
  const spawnFallback = (cmd, args, opts) => { seen.push({ cmd, args, opts }); return mkChild(cmd === "gh" ? 1 : 0); };
  assert.deepEqual(await github.ghLogout({ spawn: spawnFallback, candidates: ["gh", "/custom/gh"] }), { ok: true });
  assert.equal(seen.at(-1).cmd, "/custom/gh");
  await assert.rejects(github.ghLogout({ spawn: () => mkChild(1), candidates: ["gh"] }), /gh auth logout failed/);
});

test("ghInstall：latest release → 下载 → tar 解包 → 移动 destFile（全链 stub）", async () => {
  const fsMod = await import("node:fs");
  const pathMod = await import("node:path");
  const osMod = await import("node:os");
  const dir = fsMod.mkdtempSync(pathMod.join(osMod.tmpdir(), "dsh-l-ghi-"));
  const slug = "gh_2.99.0_linux_amd64";
  const calls = [];
  const f = async (url) => {
    calls.push(url);
    if (url.endsWith("/releases/latest")) return { ok: true, status: 200, json: async () => ({ tag_name: "v2.99.0" }) };
    return { ok: true, status: 200, body: new ReadableStream({ start(c) { c.enqueue(Buffer.from("tarball")); c.close(); } }) };
  };
  const execFile = async (cmd, args) => {
    if (cmd !== "tar") throw new Error("unexpected " + cmd);
    const inner = pathMod.join(args[3], slug, "bin", "gh");
    fsMod.mkdirSync(pathMod.join(inner, ".."), { recursive: true });
    fsMod.writeFileSync(inner, "binary");
    return { stdout: "" };
  };
  const destFile = pathMod.join(dir, "bin", "gh");
  const r = await github.ghInstall({ fetch: f, execFile, destFile, tmpDir: dir, arch: "x64" });
  assert.deepEqual(r, { version: "2.99.0", destFile });
  assert.ok(fsMod.existsSync(destFile));
  assert.ok(calls[1].includes("/cli/cli/releases/download/v2.99.0/gh_2.99.0_linux_amd64.tar.gz"));
});
