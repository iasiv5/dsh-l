import { api } from "../api.mjs";

// handlers 用错误串前缀携带细节（account-mismatch: <login> / token-invalid (…)），这里按前缀取词典文案。
const errText = (t, message) => {
  const m = String(message ?? "");
  if (m === "invalid account") return t("auth.errInvalidAccount");
  if (m === "auth-required") return t("auth.errAuthRequired");
  if (m.startsWith("gh-not-installed")) return t("auth.errGhNotInstalled");
  if (m.startsWith("gh-not-authorized")) return t("auth.errGhNotAuthorized");
  if (m.startsWith("token-invalid")) return t("auth.errTokenInvalid");
  if (m.startsWith("account-mismatch")) return t("auth.errAccountMismatch");
  return t("errors.refreshFailed") + " (" + m + ")";
};

const code = (text) => { const c = document.createElement("code"); c.textContent = text; return c; };
const link = (href, text) => {
  const a = document.createElement("a");
  a.href = href; a.target = "_blank"; a.rel = "noreferrer noopener"; a.textContent = text;
  return a;
};

// 作者化 SVG（描边风格，与面板图标同一笔画语言）：环上的一个节点 = 收活入口的标识别。
const MARK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<circle cx="6" cy="18" r="2.6"/><circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="12" r="2.6"/>'
  + '<path d="M6 8.6v6.8"/><path d="M8.5 16.4c4 .6 6.5-1 7.6-3.2"/><path d="M8.6 7.2c2.2-.5 4.4.5 5.6 2.4"/></svg>';

const WARN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/></svg>';

const svg = (markup) => { const s = document.createElement("span"); s.innerHTML = markup; return s.firstElementChild; };

const pill = (t, key, okKey, missKey, ok) => {
  const p = document.createElement("span");
  p.className = "pill";
  const dot = document.createElement("span");
  dot.className = "dot " + (ok ? "ok" : "miss");
  p.append(dot, document.createTextNode(t(key) + " · " + t(ok ? okKey : missKey)));
  return p;
};

export function renderLoginGate(shadow, { t, status, onConnected }) {
  const wrap = document.createElement("div");
  wrap.className = "gateWrap";

  const gate = document.createElement("article");
  gate.className = "gate";

  const head = document.createElement("div");
  head.className = "gateHead";
  const mark = document.createElement("div");
  mark.className = "gateMark";
  mark.append(svg(MARK));
  const pills = document.createElement("div");
  pills.className = "gateStatus";
  pills.style.margin = "0";
  if (status && typeof status === "object") {
    pills.append(
      pill(t, "auth.ghCli", "auth.ghInstalled", "auth.ghMissing", status.installed === true),
      pill(t, "auth.credential", "auth.credReady", "auth.credMissing", status.tokenAvailable === true),
    );
  }
  head.append(mark, pills);
  gate.append(head);

  const h = document.createElement("h3");
  h.textContent = t("auth.loginTitle");
  gate.append(h);

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = t("auth.loginIntro");
  gate.append(intro);

  const steps = document.createElement("ol");
  steps.className = "steps";
  const li = (text, ...nodes) => {
    const n = document.createElement("li");
    const body = document.createElement("span");
    body.append(document.createTextNode(text), ...nodes);
    n.append(body);
    return n;
  };
  steps.append(
    li(t("auth.stepInstall"), link("https://cli.github.com", "cli.github.com")),
    li(t("auth.stepLogin"), code("gh auth login")),
    li(t("auth.stepBind")),
  );
  gate.append(steps);

  const form = document.createElement("form");
  const label = document.createElement("label");
  label.append(document.createTextNode(t("auth.accountLabel")));
  const input = document.createElement("input");
  input.name = "account";
  input.autocomplete = "username";
  input.spellcheck = false;
  input.placeholder = t("auth.accountPlaceholder");
  label.append(input);
  const connect = document.createElement("button");
  connect.className = "primary";
  connect.type = "submit";
  connect.textContent = t("auth.connect");
  form.append(label, connect);
  gate.append(form);

  const err = document.createElement("p");
  err.className = "err";
  err.setAttribute("role", "alert");
  gate.append(err);

  const note = document.createElement("p");
  note.className = "note";
  note.textContent = t("auth.logoutHint");
  gate.append(note);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const account = input.value.trim();
    err.style.display = "none";
    if (!account) {
      err.textContent = t("auth.errInvalidAccount");
      err.style.display = "block";
      input.focus();
      return;
    }
    connect.disabled = true;
    connect.textContent = t("auth.connecting");
    try {
      await api.bind(account);
      onConnected?.();
    } catch (e2) {
      err.textContent = errText(t, e2?.message);
      err.style.display = "block";
      connect.disabled = false;
      connect.textContent = t("auth.connect");
      input.focus();
    }
  };

  wrap.append(gate);
  shadow.append(wrap);
  input.focus();
}
