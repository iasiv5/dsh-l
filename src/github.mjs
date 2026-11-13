import { chmodSync, createWriteStream, mkdirSync, renameSync } from "node:fs";
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

async function pagedGet(path, { token, fetch: f = globalThis.fetch }) {
  const rows = [];
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const url = API_BASE + path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + pageNo;
    const res = await f(url, { headers: headers(token) });
    if (!res.ok) throw new Error("github api " + res.status + " for " + path);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

const excerpt = (body) => String(body ?? "").slice(0, 600);
const labelsOf = (r) => (r.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
const ageDays = (iso) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
const base = (repo, type, r) => ({
  repo, type, number: r.number, title: r.title, author: r.user?.login ?? "", labels: labelsOf(r),
  createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url, bodyExcerpt: excerpt(r.body),
});

export async function listOpenIssues({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/issues?state=open", { token, fetch });
  return rows.filter((r) => !r.pull_request).map((r) => ({
    ...base(repo, "issue", r),
    meta: { comments: r.comments ?? 0, reactionsTotal: r.reactions?.total_count ?? 0, ageDays: ageDays(r.created_at) },
    pull: null,
  }));
}

export async function listOpenPulls({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/pulls?state=open", { token, fetch });
  return rows.map((r) => ({
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

export async function discoverRepos({ token, fetch }) {
  const rows = await pagedGet("/user/repos?affiliation=owner&sort=pushed", { token, fetch });
  return rows.map((r) => ({ fullName: r.full_name, pushedAt: r.pushed_at, visibility: r.visibility }));
}

export async function getViewer({ token, fetch: f = globalThis.fetch }) {
  // 收活绑定校验：GET /user 拿 token 真实身份；失效/无权会 401 抛错，由调用方映射为绑定失败。
  const res = await f(API_BASE + "/user", { headers: headers(token) });
  if (!res.ok) throw new Error("github api " + res.status + " for /user");
  const v = await res.json();
  return { login: v.login ?? "" };
}

// gh 探测与调用均走候选序列：系统 PATH 的 gh 优先，插件私有安装（数据目录 bin/gh）兜底。
const ghCandidates = (ghPath) => ["gh", ...(ghPath ? [ghPath] : [])];

export async function ghAvailable({ execFile, ghPath }) {
  for (const gh of ghCandidates(ghPath)) {
    try { await execFile(gh, ["--version"]); return true; } catch {}
  }
  return false;
}

export async function resolveToken({ credentials, tokenRef, execFile, ghPath }) {
  if (typeof tokenRef === "string" && REF_PATTERN.test(tokenRef)) {
    try {
      const hit = await credentials?.resolve?.(tokenRef);
      if (typeof hit?.value === "string" && hit.value !== "") return hit.value;
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
