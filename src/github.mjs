import { chmodSync, createWriteStream, mkdirSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const API_BASE = "https://api.github.com";
const WEB_BASE = "https://github.com";
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// GitHub CLI 官方 OAuth App 的公开 client_id（设备流用；cli/cli 仓库公开常量）
export const GH_CLIENT_ID = "178c6fc778ccc68e1d6a";
const ARCH_MAP = { x64: "amd64", arm64: "arm64" };

const headers = (token) => ({
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  ...(token ? { authorization: "Bearer " + token } : {}),
});

// ── 摄取分页（登录门禁改造 Task 4）：ETag 条件请求 + 请求预算 ────
// ETag 键 = 完整请求 URL（path+query+page）：仅按 path 建键会被末页 etag 覆写、多页仓 304 收益静默失效。
// 与 verifyToken 的 /user 缓存（token hash 键）是两个独立 Map，LRU 64。
// budget = { remaining }（调用方创建并跨仓共享）：请求前 remaining<=0 即停、置 partial（Task 6 每次刷新预算 60）。
const pagedEtagCache = new Map();
const PAGED_CACHE_LIMIT = 64;
const pagedCacheTouch = (key, etag) => {
  if (!etag) return;
  pagedEtagCache.delete(key);
  pagedEtagCache.set(key, etag);
  if (pagedEtagCache.size > PAGED_CACHE_LIMIT) pagedEtagCache.delete(pagedEtagCache.keys().next().value);
};

export async function pagedGet(path, { token, fetch: f = globalThis.fetch, budget }) {
  const rows = [];
  let partial = false;
  let unchanged = true;   // 全部页都 304 才判 unchanged（列表尾部变更不会改 page1 的 etag，禁单页短路）
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    if (budget && budget.remaining <= 0) { partial = true; break; }
    if (budget) budget.remaining -= 1;
    const url = API_BASE + path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + pageNo;
    const etag = pagedEtagCache.get(url) ?? null;
    const res = await f(url, { headers: { ...headers(token), ...(etag ? { "if-none-match": etag } : {}) } });
    if (res.status === 304) continue;   // 该页未变：内容与上轮一致，upsert 幂等无害，直接跳过
    unchanged = false;
    if (!res.ok) throw Object.assign(new Error("github api " + res.status + " for " + path), { status: res.status });
    pagedCacheTouch(url, res.headers?.get?.("etag"));
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  if (unchanged && rows.length === 0 && !partial) return { items: [], unchanged: true, partial: false };
  return { items: rows, partial };
}

const excerpt = (body) => String(body ?? "").slice(0, 600);
const labelsOf = (r) => (r.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
const ageDays = (iso) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
const base = (repo, type, r) => ({
  repo, type, number: r.number, title: r.title, author: r.user?.login ?? "", labels: labelsOf(r),
  createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url, bodyExcerpt: excerpt(r.body),
});

export async function listOpenIssues({ repo, token, fetch }) {
  const { items } = await pagedGet("/repos/" + repo + "/issues?state=open", { token, fetch });
  return items.filter((r) => !r.pull_request).map((r) => ({
    ...base(repo, "issue", r),
    meta: { comments: r.comments ?? 0, reactionsTotal: r.reactions?.total_count ?? 0, ageDays: ageDays(r.created_at) },
    pull: null,
  }));
}

export async function listOpenPulls({ repo, token, fetch }) {
  const { items } = await pagedGet("/repos/" + repo + "/pulls?state=open", { token, fetch });
  return items.map((r) => ({
    ...base(repo, "pull", r),
    meta: { comments: r.comments ?? 0, reactionsTotal: 0, ageDays: ageDays(r.created_at) },
    pull: { draft: Boolean(r.draft), headRef: r.head?.ref ?? "" },
  }));
}

export async function getRepo({ repo, token, fetch: f = globalThis.fetch }) {
  // 任务包 repo 块的数据源：真实默认分支与克隆地址，替代 v1 早期对 "main" 的硬编码。
  const res = await f(API_BASE + "/repos/" + repo, { headers: headers(token) });
  if (!res.ok) throw new Error("github api " + res.status + " for /repos/" + repo);
  const r = await res.json();
  return { defaultBranch: r.default_branch ?? "main", cloneUrl: r.ssh_url ?? ("git@github.com:" + repo + ".git") };
}

// 仓库发现（Task 4）：affiliation 对齐 loopforge 口径；read:org 分句经查证对本端点不适用（repo scope 即可用）。
export async function listUserRepos({ token, fetch, budget }) {
  const { items } = await pagedGet("/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed", { token, fetch, budget });
  return items.map((r) => ({ fullName: r.full_name, pushedAt: r.pushed_at, visibility: r.visibility }));
}

export async function getViewer({ token, fetch: f = globalThis.fetch }) {
  // 收活绑定校验：GET /user 拿 token 真实身份；失效/无权会 401 抛错，由调用方映射为绑定失败。
  const res = await f(API_BASE + "/user", { headers: headers(token) });
  if (!res.ok) throw new Error("github api " + res.status + " for /user");
  const v = await res.json();
  return { login: v.login ?? "" };
}

// ── verifyToken（登录门禁改造 Task 3）────────────────────────────
// GET /user 一次同时取身份与 X-OAuth-Scopes（细粒度 PAT 该头为空 = scopes:[]）。
// ETag 条件请求：304 免计费（GitHub 官方语义），缓存 LRU 8 条、key=token sha256 前 16 位。
// 限流分型：403 且（Remaining:0 ∨ body abuse/secondary 特征 ∨ Retry-After）或 429 → rate-limited:<秒>；
// 仅 401 → token-invalid。Task 5/6 的端点语义建立在此分型上（403/429 不伤凭据健康）。
const userVerifyCache = new Map();
const USER_CACHE_LIMIT = 8;
const cacheTouch = (key, entry) => {
  userVerifyCache.delete(key);
  userVerifyCache.set(key, entry);
  if (userVerifyCache.size > USER_CACHE_LIMIT) userVerifyCache.delete(userVerifyCache.keys().next().value);
};

const looksRateLimited = async (res) => {
  if (res.status === 429) return true;
  if (res.status !== 403) return false;
  if ((res.headers?.get?.("x-ratelimit-remaining") ?? "") === "0") return true;
  if (res.headers?.get?.("retry-after") != null) return true;
  let body = "";
  try { body = typeof res.text === "function" ? await res.text() : ""; } catch {}
  return /abuse detection|secondary rate limit/i.test(body);
};

const rateLimitedError = (res) => {
  const ra = parseInt(res.headers?.get?.("retry-after"), 10);
  let sec = Number.isFinite(ra) ? ra : NaN;
  if (!Number.isFinite(sec)) {
    const reset = parseInt(res.headers?.get?.("x-ratelimit-reset"), 10);
    sec = Number.isFinite(reset) ? Math.max(60, Math.ceil(reset - Date.now() / 1000)) : 60;
  }
  return new Error("rate-limited:" + sec);
};

export function scopesOk(scopes) {
  if (!Array.isArray(scopes)) return false;
  return scopes.includes("repo") || scopes.length === 0;
}

export async function verifyToken(token, { fetch: f = globalThis.fetch } = {}) {
  const key = createHash("sha256").update(String(token)).digest("hex").slice(0, 16);
  const cached = userVerifyCache.get(key) ?? null;
  const h = { ...headers(token), ...(cached?.etag ? { "if-none-match": cached.etag } : {}) };
  const res = await f(API_BASE + "/user", { headers: h });
  if (res.status === 304 && cached) {
    cacheTouch(key, cached);
    return { login: cached.login, scopes: cached.scopes, fineGrained: cached.scopes.length === 0, verifiedAt: new Date().toISOString(), notModified: true };
  }
  if (res.status === 401) throw new Error("token-invalid");
  if (await looksRateLimited(res)) throw rateLimitedError(res);
  if (!res.ok) throw new Error("github api " + res.status + " for /user");
  const v = await res.json();
  const scopes = String(res.headers?.get?.("x-oauth-scopes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const entry = { login: v.login ?? "", scopes, etag: res.headers?.get?.("etag") ?? null };
  if (entry.etag) cacheTouch(key, entry);
  return { login: entry.login, scopes, fineGrained: scopes.length === 0, verifiedAt: new Date().toISOString() };
}

// gh 登出（Task 5）：删除凭证的显式选项专用——stdin 由调用方管理；非零退出/异常上抛，调用方记录不回滚。
export async function ghLogout({ spawn, candidates = ["gh"] }) {
  let lastErr = null;
  for (const gh of candidates) {
    try {
      const child = spawn(gh, ["auth", "logout", "--hostname", "github.com"]);
      const code = await new Promise((resolve, reject) => {
        child.on?.("error", reject);
        child.on?.("close", (c) => resolve(c));
      });
      if (code === 0) return { ok: true };
      lastErr = new Error("gh auth logout failed (" + code + ")");
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("gh auth logout failed");
}

// gh 探测与调用均走候选序列：系统 PATH 的 gh 优先，插件私有安装（数据目录 bin/gh）兜底。
const ghCandidates = (ghPath) => ["gh", ...(ghPath ? [ghPath] : [])];

export async function ghAvailable({ execFile, ghPath }) {
  for (const gh of ghCandidates(ghPath)) {
    try { await execFile(gh, ["--version"]); return true; } catch {}
  }
  return false;
}

export async function resolveToken({ credentials, tokenRef, storedToken, execFile, ghPath }) {
  if (typeof tokenRef === "string" && REF_PATTERN.test(tokenRef)) {
    try {
      const hit = await credentials?.resolve?.(tokenRef);
      if (typeof hit?.value === "string" && hit.value !== "") return hit.value;
    } catch {}
  }
  // 工作台自存凭据（登录门禁改造 Task 2）：引用覆写之后、gh 登录态兜底之前；空串/抛错视为未提供。
  if (typeof storedToken === "function") {
    try {
      const own = await storedToken();
      if (typeof own === "string" && own !== "") return own;
    } catch {}
  }
  for (const gh of ghCandidates(ghPath)) {
    try {
      const out = String((await execFile(gh, ["auth", "token"])).stdout).trim();
      if (out !== "") return out;
    } catch {}
  }
  return null;
}

// 设备流·起点：拿 user_code 与验证链接——用户在浏览器完成授权，本插件只轮询结果。
export async function deviceCodeStart({ fetch: f = globalThis.fetch, clientId = GH_CLIENT_ID, scope = "repo read:org" }) {
  const res = await f(WEB_BASE + "/login/device/code", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, scope }),
  });
  if (!res.ok) throw new Error("github device code " + res.status);
  const j = await res.json();
  return {
    deviceCode: j.device_code,
    userCode: j.user_code,
    verificationUri: j.verification_uri,
    expiresAt: Date.now() + (j.expires_in ?? 900) * 1000,
    interval: j.interval ?? 5,
  };
}

// 设备流·单次轮询：authorization_pending / slow_down 的节奏控制交给调用方。
export async function deviceCodePoll({ deviceCode, fetch: f = globalThis.fetch, clientId = GH_CLIENT_ID }) {
  const res = await f(WEB_BASE + "/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
  });
  if (!res.ok) throw new Error("github device poll " + res.status);
  const j = await res.json();
  return j.access_token ? { token: j.access_token } : { error: j.error ?? "unknown" };
}

// 设备流·成果移交 gh 凭据库：token 走 stdin 管道，不落盘、不进参数与日志。
// candidates 逐个尝试：spawn 失败（ENOENT）换下一个；非零退出是真实授权失败，直接抛。
export function ghLoginWithToken({ token, spawn, candidates = ["gh"] }) {
  const attempt = (gh) => new Promise((resolve, reject) => {
    const child = spawn(gh, ["auth", "login", "--with-token"], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    child.stderr?.on?.("data", (d) => { err += String(d); });
    child.on("error", () => reject(Object.assign(new Error("spawn-failed"), { spawnFailed: true })));
    child.on("close", (code) => (code === 0 ? resolve({ ok: true }) : reject(new Error("gh auth login --with-token failed (" + code + "): " + err.trim().slice(-180)))));
    child.stdin?.write?.(token);
    child.stdin?.end?.();
  });
  return (async () => {
    let last = null;
    for (const gh of candidates) {
      try { return await attempt(gh); } catch (e) { if (e?.spawnFailed) { last = e; continue; } throw e; }
    }
    throw last ?? new Error("no gh candidate");
  })();
}

// 后台一键安装：官方 latest release 的 linux 二进制 → 插件数据目录（无 root、不动系统 PATH）。
export async function ghInstall({ fetch: f = globalThis.fetch, execFile, destFile, tmpDir, arch = process.arch, platform = process.platform }) {
  if (platform !== "linux") throw new Error("gh auto-install supports linux only (got " + platform + ")");
  const rel = await f(API_BASE + "/repos/cli/cli/releases/latest", { headers: headers(null) });
  if (!rel.ok) throw new Error("gh release lookup " + rel.status);
  const tag = String((await rel.json()).tag_name ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(tag)) throw new Error("gh release tag unexpected: " + tag);
  const slug = "gh_" + tag + "_linux_" + (ARCH_MAP[arch] ?? arch);
  mkdirSync(tmpDir, { recursive: true });
  const tgz = join(tmpDir, slug + ".tar.gz");
  const dl = await f(WEB_BASE + "/cli/cli/releases/download/v" + tag + "/" + slug + ".tar.gz");
  if (!dl.ok || !dl.body) throw new Error("gh download " + dl.status);
  await pipeline(Readable.fromWeb(dl.body), createWriteStream(tgz));
  await execFile("tar", ["-xzf", tgz, "-C", tmpDir]);
  mkdirSync(dirname(destFile), { recursive: true });
  renameSync(join(tmpDir, slug, "bin", "gh"), destFile);
  chmodSync(destFile, 0o755);
  return { version: tag, destFile };
}
