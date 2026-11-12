const API_BASE = "https://api.github.com";
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

export async function discoverRepos({ token, fetch }) {
  const rows = await pagedGet("/user/repos?affiliation=owner&sort=pushed", { token, fetch });
  return rows.map((r) => ({ fullName: r.full_name, pushedAt: r.pushed_at, visibility: r.visibility }));
}

export async function resolveToken({ credentials, tokenRef, execFile }) {
  if (typeof tokenRef === "string" && REF_PATTERN.test(tokenRef)) {
    try {
      const hit = await credentials?.resolve?.(tokenRef);
      if (typeof hit?.value === "string" && hit.value !== "") return hit.value;
    } catch {}
  }
  try {
    const out = String((await execFile("gh", ["auth", "token"])).stdout).trim();
    return out === "" ? null : out;
  } catch {
    return null;
  }
}
