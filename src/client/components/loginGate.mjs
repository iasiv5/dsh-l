import { api } from "../api.mjs";
import { renderConnectionCard } from "./connectionCard.mjs";

// 登录面板（Task 9 重写，用户实测反馈二次重构）：全面板三段式——品牌区/三关门禁+凭据卡/脚注区。
// 结构约束（评审执行产出反馈）：外壳一次构建常驻，凭据卡经句柄 update(status) 单点同步——
// 任何 UI 开关（PAT 表单/删除确认）都是卡内类切换，**零 DOM 重建**（宿主工作区空白的触发面消除）。
// 轮询节奏不变（install 2s / device 4s / authorizing 1.5s）；DOM 保留 .gateWrap > article.gate > button.cta 锚链。
// 作者化图标 = icon.svg 原样（蓝青双弧循环双箭头），衬底由 .gateMark 蓝调 plate 提供。
const MARK = '<svg width="27" height="27" viewBox="0 0 36 36" fill="none" aria-hidden="true">'
  + '<path d="M14.41 27.87A10.5 10.5 0 0 1 13.56 8.48" stroke="url(#dshl-mk-b)" stroke-width="4" stroke-linecap="round" fill="none"/>'
  + '<path d="M21.59 8.13A10.5 10.5 0 0 1 22.44 27.52" stroke="url(#dshl-mk-t)" stroke-width="4" stroke-linecap="round" fill="none"/>'
  + '<path d="M13.42 11.98 10.8 6.36 19.18 5.87Z" fill="url(#dshl-mk-b)" stroke="url(#dshl-mk-b)" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<path d="M22.58 24.02 25.2 29.64 16.82 30.13Z" fill="url(#dshl-mk-t)" stroke="url(#dshl-mk-t)" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<defs><linearGradient id="dshl-mk-b" x1="9" y1="8" x2="25" y2="29" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#69B9FF"/><stop offset="1" stop-color="#324DE2"/></linearGradient>'
  + '<linearGradient id="dshl-mk-t" x1="22" y1="8" x2="20" y2="28" gradientUnits="userSpaceOnUse">'
  + '<stop stop-color="#45E7A4"/><stop offset="1" stop-color="#05909D"/></linearGradient></defs></svg>';

const svg = (markup) => { const s = document.createElement("span"); s.innerHTML = markup; return s.firstElementChild; };
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

const VERIFY_TTL_MS = 30 * 60 * 1000;   // R2Q3：已校验但 verifiedAt 超时 → 挂载时静默重校验

// 登录门禁（GLOSSARY「门禁」）：三关全绿才放行进入工作台；授权方式并列双方法（设备流 / 访问令牌，随时互切）。
export function renderLoginGate(shadow, { t, status, onConnected }) {
  let local = status ?? {};
  let dead = false;
  let entered = false;
  let timer = null;
  let successTimers = [];   // success-turn 编排链（2026-11-20 峰值时刻，评审 Q2 生命周期协议）

  const stop = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    successTimers.forEach(clearTimeout);
    successTimers = [];
  };
  // gh-as-source 成功峰值（主人拍板第二作者化时刻）：全绿门禁短暂定格 + success-turn 定影 → 进入工作台。
  // initial=挂载残留：按 idle 呈现绝不触发（2026-11-20 一跳一跳防线）；编排期 dead/shadow 断开即中止；
  // 真实 gates 未全绿禁编排（伪造绿会在 onConnected→reload 后被打回）；reduced-motion 瞬切（评审 Q2 协议）。
  const finishAuthorized = async (initial) => {
    if (dead) return;   // 终态已消费（评审 Q2 协议）：重复调用（残留定时器/重复事件）不重复触发 onConnected
    if (initial) {
      local = { ...local, device: { phase: "idle" } };
      sync(local);
      return;
    }
    try { local = await api.auth(); } catch {}   // authorized 到达时 gates 可能仍是轮询旧值——刷新取真实全绿（green 判据真实性）
    if (dead) return;   // await 期间终态已被并发调用消费（互斥：评审 Q2 生命周期协议）
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const green = local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk;
    if (!green || reduced || !shadow.isConnected) {
      dead = true;
      stop();
      onConnected?.();
      return;
    }
    // 依次转绿编排（计划 Task 4-①，评审 R1-1 采纳补实现）：authorizing 为真实历史态（移交后校验中），分步呈现非伪造
    const staged = { ...local, device: { phase: "authorizing", login: local?.viewerLogin ?? null } };
    sync(staged);   // g2 转绿「已登录」+ g3「授权成功，正在校验凭据…」+ badge 校验中
    successTimers.push(setTimeout(() => {
      if (dead || !shadow.isConnected) return;
      sync(local);   // 终态全绿
      cardHandle?.el?.classList?.add("success-turn");
    }, 150));
    successTimers.push(setTimeout(() => {
      if (dead || !shadow.isConnected) return;
      dead = true;
      stop();
      onConnected?.();
    }, 650));
  };

  const refresh = async () => {
    try { local = await api.auth(); } catch {}
    sync(local);
    schedule();
  };

  const enter = async () => {
    if (entered) return;
    entered = true;
    try {
      await api.bind();
      stop();
      dead = true;
      onConnected?.();
    } catch {
      entered = false;
      await refresh();   // bind 失败（如 token-invalid）→ 状态刷新后凭据卡呈现 unhealthy
    }
  };

  const afterPatSave = async () => {
    await refresh();   // PAT 保存成功：状态刷新；三关全绿则自动续走 bind+onConnected（计划 Task 9）
    if (local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) await enter();
  };

  // on.patSave / on.deleteConfirmed **抛错** → 凭据卡内 errForm 就地呈现（错误所有权在卡）
  const on = {
    install: async () => {
      try {
        await api.installGh();
        local = { ...local, install: { phase: "installing" } };
        sync(local);
      } catch {}
      schedule();
    },
    connect: async () => {
      cardHandle?.setConnectError(null);
      try {
        const d = await api.deviceStart();
        local = { ...local, device: d };
        sync(local);
        schedule();
      } catch (err) {
        cardHandle?.setConnectError(String(err?.message ?? err));   // 就地呈现，不再静默（2026-11-20 用户实测「点击无反应」）
      }
      await refresh();
    },
    enter,
    verify: async () => { await refresh(); },
    switchToDevice: async () => { await on.connect?.(); },
    cancelPat: () => {},
    cancelDelete: () => {},
    patSave: async (token) => {
      if (!token) throw new Error("credential-format");
      await api.putCredential(token);
      await afterPatSave();
    },
    deleteConfirmed: async (ghLogout) => {
      await api.deleteCredential(ghLogout);
      await refresh();
    },
  };

  // 外壳一次构建：品牌区 / 凭据卡挂载点 / 脚注区
  const wrap = el("div", "gateWrap");
  const panel = el("div", "gatePanel");
  const brand = el("header", "brandRow");
  const mark = el("div", "gateMark");
  mark.append(svg(MARK));
  brand.append(mark, el("h3", "gateTitle", t("auth.loginTitle")));
  const cardMount = el("div");
  panel.append(brand, cardMount);
  const foot = el("footer", "gateFoot", t("cred.footNote"));
  panel.append(foot);
  wrap.append(panel);
  shadow.append(wrap);

  const cardHandle = renderConnectionCard(cardMount, { t, status: local, mode: "full", on });

  // 脚注随凭据在场才显示（2026-11-20 简报：未安装态「凭据仅存本机…」是纯噪音）
  const syncFoot = (s) => {
    const c = s?.credential ?? {};
    const limitedNow = Boolean(c.rateLimitedUntil) && new Date(c.rateLimitedUntil) > new Date();
    foot.style.display = s?.gates?.credentialOk === true || c.healthy === false || limitedNow ? "" : "none";
  };
  const sync = (s) => { cardHandle?.update(s); syncFoot(s); };
  syncFoot(local);

  const schedule = (initial = false) => {
    stop();
    if (local?.install?.phase === "installing") {
      timer = setTimeout(async () => {
        try { local = await api.auth(); } catch {}
        // 评审 S5（计划 Task 9 明文）：安装轮询中检测三关全绿 → 自动续走 bind+onConnected
        if (entered !== true && local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) {
          await enter();
          return;
        }
        sync(local);
        schedule();
      }, 2000);
      return;
    }
    const ph = local?.device?.phase;
    if (ph === "authorized") {
      finishAuthorized(initial);
      return;
    }
    if (ph === "pending" || ph === "authorizing") {
      timer = setTimeout(async () => {
        try {
          const d = await api.deviceStatus();
          local = { ...local, device: d };
        } catch {}
        if (local?.device?.phase === "authorized") {
          finishAuthorized(false);
        }
        sync(local);
        schedule();
      }, ph === "authorizing" ? 1500 : 4000);
    }
  };

  // 挂载时主动静默校验（B10/R2Q3 + gh-fallback 补验）：
  // ① 已校验但 verifiedAt 超时 → 重校验；② gh 登录态在场但从未校验（存量 gh-fallback 用户）→ 补校验一次，
  // 成功后 G3 转绿、CTA 自动切换为「进入工作台」——不再要求 gh 登录用户显式走一遍面板授权。
  const c0 = local?.credential ?? {};
  const g0 = local?.gates ?? {};
  const verifiedAtMs = c0.verifiedAt ? Date.parse(c0.verifiedAt) : NaN;
  const deviceActive = local?.device?.phase === "pending" || local?.device?.phase === "authorizing";
  const needVerify =
    (g0.credentialOk && Number.isFinite(verifiedAtMs) && Date.now() - verifiedAtMs > VERIFY_TTL_MS) ||
    (g0.ghLogin && !g0.credentialOk && !deviceActive);
  if (needVerify && !deviceActive) {
    api.verifyCredential().then(refresh).catch(() => {});
  }

  schedule(true);   // initial：挂载首轮——authorized 视为进程内残留，不触发 onConnected
}
