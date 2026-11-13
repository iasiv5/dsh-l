import { api } from "../api.mjs";

// handlers 用错误串前缀携带细节，这里按前缀取词典文案。
const errText = (t, message) => {
  const m = String(message ?? "");
  if (m.startsWith("gh-not-installed")) return t("auth.errGhNotInstalled");
  if (m.startsWith("gh-not-authorized")) return t("auth.errGhNotAuthorized");
  if (m.startsWith("token-invalid")) return t("auth.errTokenInvalid");
  return t("errors.refreshFailed") + " (" + m + ")";
};

// 作者化图标 = icon.svg 原样（蓝青双弧循环双箭头），衬底由 .gateMark 蓝调 plate 提供。
const MARK = '<svg width="26" height="26" viewBox="0 0 36 36" fill="none" aria-hidden="true">'
  + '<path d="M14.41 27.87A10.5 10.5 0 0 1 13.56 8.48" stroke="url(#dshl-mk-b)" stroke-width="4" stroke-linecap="round" fill="none"/>'
  + '<path d="M21.59 8.13A10.5 10.5 0 0 1 22.44 27.52" stroke="url(#dshl-mk-t)" stroke-width="4" stroke-linecap="round" fill="none"/>'
  + '<path d="M13.42 11.98 10.8 6.36 19.18 5.87Z" fill="url(#dshl-mk-b)" stroke="url(#dshl-mk-b)" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<path d="M22.58 24.02 25.2 29.64 16.82 30.13Z" fill="url(#dshl-mk-t)" stroke="url(#dshl-mk-t)" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<defs><linearGradient id="dshl-mk-b" x1="9" y1="8" x2="25" y2="29" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#69B9FF"/><stop offset="1" stop-color="#324DE2"/></linearGradient>'
  + '<linearGradient id="dshl-mk-t" x1="22" y1="8" x2="20" y2="28" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#45E7A4"/><stop offset="1" stop-color="#05909D"/></linearGradient></defs></svg>';

const svg = (markup) => { const s = document.createElement("span"); s.innerHTML = markup; return s.firstElementChild; };

const pill = (t, key, okKey, missKey, ok) => {
  const p = document.createElement("span");
  p.className = "pill";
  const dot = document.createElement("span");
  dot.className = "dot " + (ok ? "ok" : "miss");
  p.append(dot, document.createTextNode(t(key) + " · " + t(ok ? okKey : missKey)));
  return p;
};

// 登录闸 = 一台状态机，每个状态只有一个主行动（CTA），全程零手动输入：
//   未装 gh   → 「一键安装 gh CLI」（后台装到插件私有目录）
//   已装未授权 → 「授权登录 GitHub」（设备流：授权码 + 浏览器验证，成功自动绑定）
//   已授权    → 「{login} · 进入工作台」（一键绑定进入）
export function renderLoginGate(shadow, { t, status, onConnected }) {
  let local = status ?? {};
  let timer = null;
  let dead = false;

  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };

  const draw = () => {
    if (dead) return;
    // 只清自己拥有的 .gateWrap——shadow 里的 <style> 是 workbench 注入的，抹掉会让整台裸奔成纯文本
    for (const el of [...shadow.children]) {
      if (el.classList?.contains("gateWrap")) el.remove();
    }
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
    pills.append(
      pill(t, "auth.ghCli", "auth.ghInstalled", "auth.ghMissing", local.installed === true),
      pill(t, "auth.credential", "auth.credReady", "auth.credMissing", local.tokenAvailable === true),
    );
    head.append(mark, pills);
    gate.append(head);

    const h = document.createElement("h3");
    h.textContent = t("auth.loginTitle");
    const intro = document.createElement("p");
    intro.className = "intro";
    intro.textContent = t("auth.loginIntro");
    gate.append(h, intro);

    const err = document.createElement("p");
    err.className = "err";
    err.setAttribute("role", "alert");
    err.style.display = "none";

    const installing = local.install?.phase === "installing";
    const installFailed = local.install?.phase === "failed";
    const hasGh = local.installed === true;
    const hasToken = local.tokenAvailable === true;
    const dv = local.device ?? {};
    const pending = dv.phase === "pending";
    const handing = dv.phase === "authorizing";

    const cta = document.createElement("button");
    cta.className = "cta";
    cta.type = "button";

    if (installing) {
      cta.disabled = true;
      cta.textContent = t("auth.installing");
      gate.append(cta);
    } else if (!hasGh) {
      cta.textContent = installFailed ? t("auth.installRetry") : t("auth.installBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        try {
          await api.installGh();
          local = { ...local, install: { phase: "installing" } };
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
        }
        draw();
        schedule();
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.installNote");
      gate.append(note);
      if (installFailed) {
        err.textContent = t("auth.installFailed") + " (" + (local.install?.error ?? "") + ")";
        err.style.display = "block";
      }
    } else if (hasToken) {
      cta.textContent = (local.viewerLogin ?? "GitHub") + " · " + t("auth.enterBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        cta.textContent = t("auth.entering");
        try {
          await api.bind();
          stop();
          onConnected?.();
          return;
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
          draw();
          schedule();
        }
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.readyNote");
      gate.append(note);
    } else if (pending || handing) {
      const codeBox = document.createElement("div");
      codeBox.className = "gateCode";
      const codeEl = document.createElement("b");
      codeEl.textContent = dv.userCode ?? "····-····";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = t("auth.copy");
      copyBtn.onclick = () => navigator.clipboard?.writeText(dv.userCode ?? "").catch(() => {});
      codeBox.append(codeEl, copyBtn);
      const line = document.createElement("p");
      line.className = "intro";
      line.textContent = handing ? t("auth.deviceHanding") : t("auth.deviceWaiting");
      const link = document.createElement("a");
      link.className = "gateLink";
      link.href = dv.verificationUri ?? "https://github.com/login/device";
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.textContent = dv.verificationUri ?? "https://github.com/login/device";
      gate.append(codeBox, line, link);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.deviceNote");
      gate.append(note);
    } else {
      cta.textContent = t("auth.deviceBtn");
      cta.onclick = async () => {
        cta.disabled = true;
        try {
          const d = await api.deviceStart();
          local = { ...local, device: d };
        } catch (e) {
          err.textContent = errText(t, e?.message);
          err.style.display = "block";
        }
        draw();
        schedule();
      };
      gate.append(cta);
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.deviceNote");
      gate.append(note);
      if (dv.phase === "expired") {
        err.textContent = t("auth.deviceExpired");
        err.style.display = "block";
      } else if (dv.phase === "failed") {
        err.textContent = t("auth.deviceFailed") + " (" + (dv.error ?? "") + ")";
        err.style.display = "block";
      }
    }

    gate.append(err);
    if (!["pending", "authorizing"].includes(dv.phase ?? "") && !installing && !hasToken) {
      const note = document.createElement("p");
      note.className = "note";
      note.textContent = t("auth.logoutHint");
      gate.append(note);
    }
    wrap.append(gate);
    shadow.append(wrap);
  };

  const schedule = () => {
    stop();
    if (local?.install?.phase === "installing") {
      timer = setTimeout(async () => {
        try { local = await api.auth(); } catch {}
        draw();
        schedule();
      }, 2000);
      return;
    }
    const ph = local?.device?.phase;
    if (ph === "authorized") {
      dead = true;
      stop();
      onConnected?.();
      return;
    }
    if (ph === "pending" || ph === "authorizing") {
      timer = setTimeout(async () => {
        try {
          const d = await api.deviceStatus();
          local = { ...local, device: d };
        } catch {}
        if (local?.device?.phase === "authorized") {
          dead = true;
          stop();
          onConnected?.();
          return;
        }
        draw();
        schedule();
      }, ph === "authorizing" ? 1500 : 4000);
    }
  };

  draw();
  schedule();
}
