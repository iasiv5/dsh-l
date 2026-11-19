import test from "node:test";
import assert from "node:assert/strict";
import { makeHttpHandler, createTrustGuard } from "../src/http.mjs";

const req = (method, { body, headers = {} } = {}) => {
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  return Object.assign((async function* () { yield* chunks; })(), {
    method,
    url: "/dsh-l/x",
    headers: { host: "127.0.0.1:3095", "content-type": "application/json", ...headers },
  });
};
const res = () => {
  const r = { status: 0, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.writeHead = (s, h) => { r.status = s; Object.assign(r.headers, h); };
  r.end = (b) => { r.body = b ? JSON.parse(b.toString()) : null; };
  return r;
};
const allow = () => undefined;

test("信任检查拒绝即以其状态码返回", async () => {
  const r = res();
  await makeHttpHandler({ methods: { GET: async () => ({ ok: 1 }) }, trust: () => 403 })(req("GET"), r);
  assert.equal(r.status, 403);
});

test("createTrustGuard：connection 服务缺席 fail-closed 403；存在则委派", () => {
  assert.equal(createTrustGuard({ get: () => undefined }, { warn() {} })({ headers: {} }), 403);
  const ctx = { get: (n) => (n === "connection" ? { requestRejection: () => 401 } : undefined) };
  assert.equal(createTrustGuard(ctx, { warn() {} })({ headers: {} }), 401);
});

test("GET 分派与 405 Allow", async () => {
  const h = makeHttpHandler({ methods: { GET: async () => ({ ok: 1 }) }, trust: allow });
  const ok = res(); await h(req("GET"), ok);
  assert.deepEqual([ok.status, ok.body], [200, { ok: 1 }]);
  const no = res(); await h(req("DELETE"), no);
  assert.equal(no.status, 405);
  assert.equal(no.headers.allow, "GET");
});

test("写方法：跨站拒绝；同源解析 JSON 体并传给处理器", async () => {
  let seen = null;
  const h = makeHttpHandler({ methods: { POST: async (b) => { seen = b; return { ok: 1 }; } }, trust: allow });
  const cross = res(); await h(req("POST", { body: {}, headers: { origin: "http://evil.example" } }), cross);
  assert.equal(cross.status, 403);
  const same = res(); await h(req("POST", { body: { a: 1 }, headers: { origin: "http://127.0.0.1:3095" } }), same);
  assert.equal(same.status, 200);
  assert.deepEqual(seen, { a: 1 });
});

test("DELETE 分派：同源 JSON 体传给处理器（凭据端点依赖的通用契约）", async () => {
  let seen = null;
  const h = makeHttpHandler({ methods: { DELETE: async (b) => { seen = b; return { ok: 1 }; } }, trust: allow });
  const r = res(); await h(req("DELETE", { body: { ghLogout: true }, headers: { origin: "http://127.0.0.1:3095" } }), r);
  assert.equal(r.status, 200);
  assert.deepEqual(seen, { ghLogout: true });
});

test("处理器返回 error → out.status 或 400；抛错 → 500", async () => {
  const e = res();
  await makeHttpHandler({ methods: { GET: async () => ({ error: "nope", status: 409 }) }, trust: allow })(req("GET"), e);
  assert.deepEqual([e.status, e.body], [409, { error: "nope" }]);
  const t = res();
  await makeHttpHandler({ methods: { GET: async () => { throw new Error("boom"); } }, trust: allow })(req("GET"), t);
  assert.equal(t.status, 500);
});
