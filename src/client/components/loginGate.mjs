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

export function renderLoginGate(shadow, { t, status, onConnected }) {
  const gate = document.createElement("div");
  gate.className = "gate";

  const h = document.createElement("h3");
  h.textContent = t("auth.loginTitle");
  gate.append(h);

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = t("auth.loginIntro");
  gate.append(intro);

  if (status && typeof status === "object") {
    const chips = document.createElement("div");
    chips.className = "chips";
    const cli = document.createElement("span");
    cli.className = "chip";
    cli.textContent = t("auth.ghCli") + " · " + (status.installed ? t("auth.ghInstalled") : t("auth.ghMissing"));
    const cred = document.createElement("span");
    cred.className = "chip";
    cred.textContent = t("auth.credential") + " · " + (status.tokenAvailable ? t("auth.credReady") : t("auth.credMissing"));
    chips.append(cli, cred);
    gate.append(chips);
  }

  const steps = document.createElement("ol");
  steps.className = "steps";
  const li = (text, ...nodes) => {
    const n = document.createElement("li");
    n.append(document.createTextNode(text), ...nodes);
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
  connect.type = "submit";
  connect.textContent = t("auth.connect");
  form.append(label, connect);
  gate.append(form);

  const err = document.createElement("div");
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
    }
  };

  shadow.append(gate);
  input.focus();
}
