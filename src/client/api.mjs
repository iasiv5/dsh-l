const json = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? "http " + res.status), { status: res.status });
  return body;
};
const get = (path) => fetch(path, { credentials: "same-origin" }).then(json);
const send = (path, body, method = "POST") => fetch(path, {
  method, credentials: "same-origin",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body ?? {}),
}).then(json);

export const api = {
  state: () => get("dsh-l/state"),
  auth: () => get("dsh-l/auth"),
  bind: (account) => send("dsh-l/auth/bind", account ? { account } : {}),
  logout: () => send("dsh-l/auth/logout", {}),
  installGh: () => send("dsh-l/auth/install-gh", {}),
  deviceStart: () => send("dsh-l/auth/device", {}),
  deviceStatus: () => get("dsh-l/auth/device"),
  verifyCredential: () => send("dsh-l/credential/verify", {}),
  putCredential: (token) => send("dsh-l/credential", { token }, "PUT"),
  deleteCredential: (ghLogout) => send("dsh-l/credential", { ghLogout }, "DELETE"),
  refresh: () => send("dsh-l/refresh", {}),
  putWatch: (repos) => send("dsh-l/watch", { repos }, "PUT"),
  discover: () => get("dsh-l/discover"),
  models: () => get("dsh-l/models"),
  triage: (keys, lang) => send("dsh-l/triage", { keys, lang }),
  override: (payload) => send("dsh-l/candidate/override", payload),
  stage: (key, stage, note) => send("dsh-l/candidate/stage", { key, stage, note }),
  gate: (key, gate, decision, note) => send("dsh-l/candidate/gate", { key, gate, decision, note }),
  runStart: (key, note = "") => send("dsh-l/run/start", { key, note }),
  runGate: (runId, nodeId, decision, note = "", targetNode = null) => send("dsh-l/run/gate", { runId, nodeId, decision, note, targetNode }),
  runCancel: (runId, reason = "user") => send("dsh-l/run/cancel", { runId, reason }),
  runRetry: (runId, nodeId) => send("dsh-l/run/retry", { runId, nodeId }),
  releaseConfirm: (key, note = "") => send("dsh-l/release/confirm", { key, note }),
  workStart: (key, cwd = null, another = false, lang = "zh-CN") => send("dsh-l/work/start", { key, cwd, another, lang }),
  rolesList: () => get("dsh-l/roles"),
  rolesUpsert: (role) => send("dsh-l/roles", { role }),
  rolesDelete: (id) => send("dsh-l/roles/delete", { id }),
  feishuTest: () => send("dsh-l/feishu/test", {}),
  putFeishuWebhook: (url) => send("dsh-l/feishu/webhook", { url }, "PUT"),
  settings: () => get("dsh-l/settings"),
  putSettings: (patch) => send("dsh-l/settings", patch, "PUT"),
};
