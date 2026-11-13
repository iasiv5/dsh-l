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
  bind: (account) => send("dsh-l/auth/bind", { account }),
  logout: () => send("dsh-l/auth/logout", {}),
  refresh: () => send("dsh-l/refresh", {}),
  putWatch: (repos) => send("dsh-l/watch", { repos }, "PUT"),
  discover: () => get("dsh-l/discover"),
  models: () => get("dsh-l/models"),
  triage: (keys, lang) => send("dsh-l/triage", { keys, lang }),
  override: (payload) => send("dsh-l/candidate/override", payload),
  stage: (key, stage, note) => send("dsh-l/candidate/stage", { key, stage, note }),
  gate: (key, gate, decision, note) => send("dsh-l/candidate/gate", { key, gate, decision, note }),
  settings: () => get("dsh-l/settings"),
  putSettings: (patch) => send("dsh-l/settings", patch, "PUT"),
};
