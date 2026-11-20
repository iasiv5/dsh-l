import { api } from "../api.mjs";
import { renderConnectionCard } from "./connectionCard.mjs";

// 登录面板（Task 9 重写）：全面板三段式——品牌区（大标题金句）/ 三关门禁 + 凭据卡 / 脚注区。
// 组件契约：renderLoginGate 签名不变（workbench 调用点零改动）；轮询节奏不变（install 2s / device 4s / authorizing 1.5s）；
// DOM 保留 .gateWrap > article.gate > button.cta 类名链（scripts/ui-probe.cjs 视图判定锚）。
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

const VERIFY_TTL_MS = 30 * 60 * 1000;   // R2Q3：打开面板时 verifiedAt 超时才静默校验（失败静默不阻塞渲染）

// 登录门禁（GLOSSARY「门禁」）：三关全绿才放行进入工作台；授权方式并列双方法（设备流 / 访问令牌，随时互切）。
export function renderLoginGate(shadow, { t, status, onConnected }) {
  let local = status ?? {};
  let timer = null;
  let dead = false;
  let patOpen = false;        // 手动令牌表单（组件局部 UI 态，与服务器状态无关）
  let confirmDelete = false;  // 删除确认浮层（R2Q2：gh logout 复选框按 ghWrittenByUs 门控）
  let patError = null;        // PAT 保存失败的服务端错误串（评审问题 3：失败态可见呈现）
  let deleteError = null;     // 删除凭证失败的服务端错误串（gh-not-ours 等）
  let entered = false;        // bind 成功后防重入

  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };

  const refresh = async () => {
    try { local = await api.auth(); } catch {}
    draw();
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

  // R1-3：PUT 成功后按三关判定——全绿才自动 bind 进入；未全绿停留面板（CTA 切缺失门禁动作），轮询续走。
  const afterPatSave = async () => {
    patOpen = false;
    await refresh();
    if (local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) await enter();
  };

  const on = {
    install: async () => {
      try {
        await api.installGh();
        local = { ...local, install: { phase: "installing" } };
      } catch {}
      draw();
      schedule();
    },
    connect: async () => {
      try {
        const d = await api.deviceStart();
        local = { ...local, device: d };
        draw();
        schedule();
      } catch {}   // already-authorized 等守卫失败经状态刷新呈现
      await refresh();
    },
    enter,
    verify: async () => { await refresh(); },
    togglePat: () => { patOpen = !patOpen; confirmDelete = false; patError = null; draw(); },
    cancelPat: () => { patOpen = false; patError = null; draw(); },
    switchToDevice: async () => { patOpen = false; patError = null; await on.connect(); },
    toggleDelete: () => { confirmDelete = !confirmDelete; patOpen = false; deleteError = null; draw(); },
    cancelDelete: () => { confirmDelete = false; deleteError = null; draw(); },
    deleteConfirmed: async (ghLogout) => {
      try {
        await api.deleteCredential(ghLogout);
        deleteError = null;
        patOpen = false;
        await refresh();   // 成功：凭据/绑定已变，刷新进入新状态（未配置面板或工作台）
      } catch (e) {
        deleteError = e?.message ?? String(e);   // gh-not-ours：清除已执行但 gh 未动——浮层就地呈现，不 refresh（避免整面板重置吞掉提示）
        confirmDelete = true;
        draw();
      }
    },
    patSave: async (token) => {
      if (!token) return;
      try {
        await api.putCredential(token);
        patError = null;
        await afterPatSave();
      } catch (err) {
        patError = err?.message ?? String(err);   // credential-format/invalid/verify-failed → 表单下错误行
        await refresh();
        draw();
      }
    },
  };

  const draw = () => {
    if (dead) return;
    // 只清自己拥有的 .gateWrap——shadow 里的 <style> 是 workbench 注入的，抹掉会让整台裸奔成纯文本
    for (const el of [...shadow.children]) {
      if (el.classList?.contains("gateWrap")) el.remove();
    }
    const wrap = el("div", "gateWrap");
    const panel = el("div", "gatePanel");

    // ① 品牌区：品牌标 + 大标题（金句 B，无副标题——B6 范围事实）
    const brand = el("header", "brandRow");
    const mark = el("div", "gateMark");
    mark.append(svg(MARK));
    const title = el("h3", "gateTitle", t("auth.loginTitle"));
    brand.append(mark, title);
    panel.append(brand);

    // ② 授权卡（connectionCard full 形态，直接产出 article.gate；面板打开时超 TTL 静默校验一次）
    renderConnectionCard(panel, { t, status: local, mode: "full", patOpen, confirmDelete, patError, deleteError, on });

    // ③ 脚注区
    panel.append(el("footer", "gateFoot", t("cred.footNote")));

    wrap.append(panel);
    shadow.append(wrap);
  };

  const schedule = () => {
    stop();
    if (local?.install?.phase === "installing") {
      timer = setTimeout(async () => {
        try { local = await api.auth(); } catch {}
        // 评审 S5（计划 Task 9 明文）：安装轮询中检测三关全绿 → 自动续走 bind+onConnected
        if (entered !== true && local?.gates?.ghInstalled && local?.gates?.ghLogin && local?.gates?.credentialOk) {
          await enter();
          return;
        }
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

  // 打开面板时的主动静默校验（B10/R2Q3）：三关已过凭据校验但 verifiedAt 超时 → 校验一次刷新状态。
  const c = local?.credential ?? {};
  const verifiedAtMs = c.verifiedAt ? Date.parse(c.verifiedAt) : NaN;
  if (local?.gates?.credentialOk && Number.isFinite(verifiedAtMs) && Date.now() - verifiedAtMs > VERIFY_TTL_MS) {
    api.verifyCredential().then(refresh).catch(() => {});
  }

  draw();
  schedule();
}
