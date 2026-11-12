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
