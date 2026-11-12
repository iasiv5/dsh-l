export const BODY_MAX = 64 * 1024;

export function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": String(body.length),
  });
  res.end(body);
}

export async function readJsonBody(req, maxBytes = BODY_MAX) {
  const type = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") throw Object.assign(new Error("content-type must be application/json"), { status: 400 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += part.length;
    if (bytes > maxBytes) throw Object.assign(new Error("payload too large"), { status: 413 });
    chunks.push(part);
  }
  if (chunks.length === 0) throw Object.assign(new Error("empty body"), { status: 400 });
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid json"), { status: 400 });
  }
}

// stock-kanban src/access.mjs:10-33 同款：非抛式 ctx.get 查 connection，缺席/抛错 fail-closed 403。
export function createTrustGuard(ctx, logger = console) {
  let warned = false;
  const warnOnce = (err) => {
    if (warned) return;
    warned = true;
    logger?.warn?.("dsh-l: connection.requestRejection 不可用，全路由 fail-closed 403");
    if (err) logger?.warn?.(err);
  };
  return (req) => {
    try {
      const connection = ctx?.get?.("connection");
      const reject = connection?.requestRejection;
      if (typeof reject !== "function") { warnOnce(undefined); return 403; }
      return reject.call(connection, { headers: req.headers }) ?? undefined;
    } catch (err) {
      warnOnce(err);
      return 403;
    }
  };
}

export function isSameOriginRequest(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (origin === undefined || origin === null || origin === "") {
    const site = req.headers["sec-fetch-site"];
    return site === undefined || site === "same-origin" || site === "same-site" || site === "none";
  }
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
  } catch {
    return false;
  }
}

export function makeHttpHandler({ methods, trust }) {
  const allow = Object.keys(methods).join(", ");
  return async (req, res) => {
    const rejection = trust(req);
    if (rejection !== undefined) return sendJson(res, rejection, { error: "untrusted" });
    const fn = methods[req.method];
    if (!fn) {
      res.setHeader("Allow", allow);
      return sendJson(res, 405, { error: "method-not-allowed" });
    }
    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (!isSameOriginRequest(req)) return sendJson(res, 403, { error: "origin-rejected" });
      try { body = await readJsonBody(req); } catch (e) { return sendJson(res, e.status ?? 400, { error: String(e.message ?? e) }); }
    }
    try {
      const out = await fn(body);
      if (out && typeof out === "object" && "error" in out) return sendJson(res, out.status ?? 400, { error: out.error });
      return sendJson(res, 200, out ?? {});
    } catch (e) {
      return sendJson(res, e?.status ?? 500, { error: String(e?.message ?? e) });
    }
  };
}
