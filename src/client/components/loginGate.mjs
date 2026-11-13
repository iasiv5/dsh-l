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

// 作者化图标 = icon.svg 原样（彩色渐变无限环+双节点），衬底由 .gateMark 蓝调 plate 提供。
const MARK = '<svg width="26" height="26" viewBox="0 0 36 36" fill="none" aria-hidden="true">'
  + '<path d="M18 18C13.4 10.6 3.6 10.6 3.6 18C3.6 25.4 13.4 25.4 18 18C22.6 10.6 32.4 10.6 32.4 18C32.4 25.4 22.6 25.4 18 18" stroke="url(#dshl-mk-b)" stroke-width="4" stroke-linecap="round"/>'
  + '<circle cx="9.1" cy="12.45" r="2.8" fill="url(#dshl-mk-t)"/>'
  + '<circle cx="26.9" cy="23.55" r="2.8" fill="url(#dshl-mk-t)"/>'
  + '<defs><linearGradient id="dshl-mk-b" x1="3.6" y1="10.6" x2="32.4" y2="25.4" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#69B9FF"/><stop offset="1" stop-color="#324DE2"/></linearGradient>'
  + '<linearGradient id="dshl-mk-t" x1="9.1" y1="12.45" x2="26.9" y2="23.55" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#45E7A4"/><stop offset="1" stop-color="#05909D"/></linearGradient></defs></svg>';

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
