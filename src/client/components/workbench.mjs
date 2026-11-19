import { makeT } from "../i18n.mjs";
import { groupCandidates, filterCandidates, needsReview } from "../logic.mjs";
import { api } from "../api.mjs";
import { badge } from "../badge.mjs";
import { renderRow } from "./candidateRow.mjs";
import { renderLoginGate } from "./loginGate.mjs";
import { renderConnectionCard } from "./connectionCard.mjs";
import { renderKanban } from "./kanban.mjs";
import { renderReview } from "./review.mjs";
import { renderRolesTab } from "./rolesTab.mjs";

const CSS = [
  ":host{display:flex;flex-direction:column;height:100%;font-size:14px;line-height:1.45;color:inherit}",
  "header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  "h2{font-size:15px;margin:0 8px 0 0;font-weight:600}",
  "button,select,input{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:6px;padding:3px 10px;cursor:pointer}",
  "button:hover:not(:disabled){background:color-mix(in srgb,currentColor 7%,transparent)}",
  "button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid color-mix(in srgb,currentColor 55%,transparent);outline-offset:1px}",
  "button:disabled{opacity:.45;cursor:default}",
  ".meta{margin-left:auto;font-size:12px;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}",
  "main{flex:1;overflow:auto;padding:0 16px 24px}",
  ".group>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 4px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  ".group.dim{opacity:.6}",
  ".row{display:flex;align-items:center;gap:8px;min-height:32px;border-bottom:1px solid color-mix(in srgb,currentColor 7%,transparent)}",
  ".row .title{flex:1;min-width:0;text-align:left;border:none;padding:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".badge{font-size:11px;font-weight:600;padding:0 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent)}",
  ".chip{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);white-space:nowrap}",
  ".chip.u-P0{font-weight:600;border-color:currentColor}",
  ".chip.muted{color:color-mix(in srgb,currentColor 45%,transparent)}",
  ".detail{padding:8px 0 12px 44px;display:flex;flex-direction:column;gap:8px}",
  ".detail .reason{margin:0;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:24px}",
  ".intake>h3,.triage>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 6px;color:color-mix(in srgb,currentColor 60%,transparent)}",
  /* 登录闸：遮罩只盖插件主区（absolute）——侧栏始终可退回；flex 列 + margin:auto：
     空间够→居中，空间不够→顶对齐随容器自然滚动（手机上不出现内层拖动条） */
  ".gateWrap{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;padding:24px;background:color-mix(in srgb,canvas 78%,transparent)}",
  "@supports (padding:max(16px,env(safe-area-inset-top))){.gateWrap{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}}",
  ".gate{width:min(440px,100%);margin:auto;display:flex;flex-direction:column;padding:28px 28px 20px;border-radius:14px;background:color-mix(in srgb,canvas 96%,transparent);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 32px 64px -24px rgb(0 0 0 /.4),0 4px 16px rgb(0 0 0 /.14);animation:gate-in 220ms cubic-bezier(.22,1,.36,1)}",
  "@media (prefers-reduced-motion:reduce){.gate{animation:none}}",
  "@keyframes gate-in{from{transform:translateY(8px);opacity:.6}}",
  ".gateHead{display:flex;align-items:center;justify-content:space-between;gap:10px}",
  /* 图标衬底：取图标主蓝做 tint plate——浅皮淡蓝瓷面、深皮深蓝绒面，柔影托起彩色图标 */
  ".gateMark{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,#324DE2 9%,canvas);border:1px solid color-mix(in srgb,#324DE2 20%,canvas);box-shadow:0 2px 6px rgb(50 77 226 /.16),0 8px 20px -8px rgb(50 77 226 /.28)}",
  ".gateMark svg{display:block}",
  ".gate h3{font-size:16px;font-weight:650;margin:14px 0 0;letter-spacing:-.01em}",
  ".gate .intro{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 62%,transparent)}",
  ".gateStatus{display:flex;gap:6px;margin:14px 0 0;flex-wrap:wrap}",
  ".pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".pill .dot{width:7px;height:7px;border-radius:50%}",
  ".pill .dot.ok{background:#2da44e}",
  ".pill .dot.miss{background:#d29922}",
  ".gate code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);border-radius:5px;padding:1px 6px;background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".gate a{color:inherit;text-underline-offset:2px}",
  /* 状态机 CTA：每个状态只有一个主行动按钮，窄屏整行可点 */
  ".gate .cta{width:100%;height:44px;margin:18px 0 0;padding:0 18px;font-weight:600;font-size:14.5px;border:none;border-radius:10px;background:canvastext;color:canvas;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  ".gate .cta:hover:not(:disabled){background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".gate .cta:disabled{opacity:.6}",
  ".gateCode{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 0;padding:12px 16px;border-radius:10px;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  ".gateCode b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:.08em}",
  ".gateLink{display:block;margin:10px 0 0;font-size:13px;color:inherit;text-underline-offset:2px}",
  "@media (max-width:520px){.gate{padding:20px 16px 12px;border-radius:12px}.gate h3{font-size:15px}.gate .intro{font-size:13px}.gateStatus{margin-top:12px}.gateCode b{font-size:20px;letter-spacing:.05em}.gate .cta{height:46px;font-size:15px}}",
  /* 矮屏（手机竖屏主区）：收紧纵向节奏，让卡整体放得下、免滚动 */
  "@media (max-height:640px){.gateWrap{padding:12px}.gate{padding:16px 16px 10px}.gate h3{margin-top:10px;font-size:15px}.gate .intro{margin-top:4px}.gateStatus{margin-top:10px}.gate .cta{margin-top:12px;height:44px}.gate .note{margin-top:10px;padding-top:8px}}",
  ".gate .err{font-size:13px;line-height:1.5;display:none;margin:12px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 52%,transparent)}",
  // ── 凭据卡（Task 9）：全面板登录 + 收活紧凑卡共用视觉（theme 自适应沿用 canvas/canvastext color-mix 语言）──
  ".gatePanel{width:min(560px,100%);margin:auto;display:flex;flex-direction:column}",
  ".brandRow{display:flex;align-items:center;gap:14px}",
  ".gateTitle{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0}",
  ".gatePanel .gate{width:100%;margin:26px 0 0;padding:22px 24px 18px}",
  ".gateFoot{margin-top:20px;padding:14px 2px 4px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.6;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".credHead{display:flex;align-items:center;gap:12px}",
  ".ghMark{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:10px;color:inherit;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 10%,transparent)}",
  ".ghMark svg{display:block}",
  ".credWho{flex:1;min-width:0}",
  ".credWho b{display:block;font-size:14px;font-weight:600}",
  ".credSub{margin-top:2px;font-size:12px;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".badge{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".dot{width:7px;height:7px;border-radius:50%;flex:none}",
  ".dot.ok{background:#2da44e}",
  ".dot.warn{background:#d29922}",
  ".dot.err{background:#d1242f}",
  ".dot.wait{background:#d29922;animation:dot-breathe 1.6s ease-in-out infinite}",
  "@keyframes dot-breathe{50%{opacity:.35}}",
  "@media (prefers-reduced-motion:reduce){.dot.wait{animation:none}}",
  ".recheck{flex:none;width:30px;height:30px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer}",
  ".recheck svg{transition:transform 400ms cubic-bezier(.22,1,.36,1)}",
  ".recheck:hover svg{transform:rotate(140deg)}",
  ".recheck:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:2px}",
  ".gates{margin-top:16px;display:flex;flex-direction:column;gap:9px}",
  ".gateRow{display:flex;align-items:center;gap:10px;min-height:24px;font-size:13px}",
  ".gateRow .gName{flex:none;font-weight:550}",
  ".gateRow .gSt{flex:1;min-width:0;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".gateRow .gSt.is-bad{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".kv{margin:18px 0 0;padding:14px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);display:grid;grid-template-columns:64px 1fr;row-gap:10px;column-gap:12px;font-size:13px}",
  ".kv dt{color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".kv dd{line-height:1.5;min-width:0;overflow-wrap:anywhere}",
  ".chips{display:inline-flex;gap:6px;flex-wrap:wrap;vertical-align:-2px}",
  ".chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;padding:1px 8px;border-radius:5px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 5%,transparent)}",
  ".chip.is-miss{color:color-mix(in srgb,#d1242f 85%,currentColor);border-color:color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".okFrag{color:color-mix(in srgb,#2da44e 80%,currentColor)}",
  ".badFrag{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".connectZone{margin-top:18px;padding-top:14px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 62%,transparent)}",
  ".methodRow{display:flex;gap:10px;margin-top:10px}",
  ".method{flex:1;height:40px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:1px solid color-mix(in srgb,currentColor 20%,transparent);background:transparent;color:inherit}",
  ".method:hover{background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".method:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".methodHint{margin-top:8px;font-size:12px;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".switchLink{border:none;background:transparent;padding:2px 4px;cursor:pointer;font-size:12.5px;text-decoration:underline;text-underline-offset:2px;color:color-mix(in srgb,currentColor 55%,transparent)}",
  ".switchLink:hover{color:inherit}",
  ".switchLink:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patForm{margin-top:18px;padding:14px 16px;border-radius:10px;border:1px dashed color-mix(in srgb,currentColor 20%,transparent);display:none;flex-direction:column;gap:10px}",
  ".patForm.open{display:flex}",
  ".patForm label{font-size:12.5px;font-weight:550}",
  ".patInput{width:100%;height:36px;padding:0 12px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit}",
  ".patInput::placeholder{color:color-mix(in srgb,currentColor 40%,transparent)}",
  ".patInput:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patRow{display:flex;align-items:center;gap:12px}",
  ".patSave{height:34px;padding:0 16px;border:none;border-radius:8px;cursor:pointer;background:canvastext;color:canvas;font-size:13px;font-weight:600}",
  ".patSave:hover{background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".patSave:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".patSave.is-danger{background:color-mix(in srgb,#d1242f 85%,currentColor);color:canvas}",
  ".patCancel{border:none;background:transparent;color:color-mix(in srgb,currentColor 55%,transparent);font-size:12.5px;cursor:pointer}",
  ".patCancel:hover{color:inherit}",
  ".patHint{font-size:12px;line-height:1.5;color:color-mix(in srgb,currentColor 52%,transparent)}",
  ".aux{margin-top:10px;display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}",
  ".auxAct{border:none;background:transparent;cursor:pointer;font-size:12.5px;padding:4px 8px;border-radius:6px;color:color-mix(in srgb,currentColor 62%,transparent);text-underline-offset:2px}",
  ".auxAct:hover{color:inherit;background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".auxAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".auxAct.is-danger{color:color-mix(in srgb,#d1242f 78%,currentColor)}",
  ".warnBox{font-size:13px;line-height:1.5;margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".credCompact{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,currentColor 10%,transparent);background:color-mix(in srgb,currentColor 3%,transparent)}",
  ".degradedBanner{margin:0 0 12px;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  ".degradedBanner.is-limited{border-color:color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".bannerAct{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:7px;background:transparent;color:inherit;font-size:12.5px;padding:4px 10px;cursor:pointer}",
  ".bannerAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
].join("\n");

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function mountWorkbench(shadow, { getLang, build, extend } = {}) {
  let state = null;
  let authInfo = null;
  let compactPat = false;       // Task 10：收活紧凑卡的内联换令牌表单开关
  let compactDelete = false;    // Task 10：收活紧凑卡的内联删除确认开关
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  let activeTab = "list";   // 评审 P10：tab 互斥显隐（list|board|review），闭包状态——paint 全量重建时保持，不进 store
  const filters = { type: "all", repo: "all", urgency: "all" };
  const expanded = new Set();
  const view = {};

  const select = (pairs, value, onChange, label) => {
    const s = el("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) { const o = el("option", null, text); o.value = v; s.append(o); }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };

  const paint = () => {
    if (disposed) return;
    const t = makeT(getLang());
    shadow.innerHTML = "";
    shadow.host.dataset.dshLBuild = build;
    const style = el("style"); style.textContent = CSS;
    // 收活闸门：未拿到 state 先给加载态；未绑定账号（auth.account 空）整台退回登录界面。
    if (!state) {
      shadow.append(style, el("div", "empty", error ? t("errors.refreshFailed") + " (" + error + ")" : t("auth.loading")));
      return;
    }
    if (!state.auth?.account) {
      shadow.append(style);
      renderLoginGate(shadow, { t, status: authInfo, onConnected: () => view.reload() });
      return;
    }
    const header = el("header");
    header.append(el("h2", null, t("panelLabel")));
    // 待确认聚合（design-v2 §13.5）：页头 badge chip（N>0 才显）+ 侧栏 label 计数（badge.count 供 index label 读取）。
    const review = needsReview({ candidates: state?.candidates ?? [], runs: state?.runs ?? [] });
    badge.count = review.count;
    const refreshBtn = el("button", null, busy ? t("refreshing") : t("refresh"));
    refreshBtn.type = "button";
    refreshBtn.disabled = busy;
    refreshBtn.onclick = () => view.refresh();
    header.append(refreshBtn);
    if (badge.count > 0) {
      const pendingChip = el("button", "chip", t("badge.pending").replace("{n}", String(badge.count)));
      pendingChip.type = "button";
      pendingChip.onclick = () => { activeTab = "review"; paint(); };
      header.append(pendingChip);
    }
    extend?.header?.(header, { t, state, view });
    const account = state?.auth?.login || state?.auth?.account;
    if (account) {
      // Task 10：页头健康点（绿=健康 / 黄=限流中 / 红=失效；未配置凭据不显点）
      const credChip = state?.auth?.credential ?? {};
      const limChip = credChip.rateLimitedUntil && new Date(credChip.rateLimitedUntil) > new Date();
      const who = el("span", "chip", t("auth.connected") + " " + account);
      if (credChip.configured) {
        const d = el("span", "dot " + (credChip.healthy === false ? "err" : limChip ? "warn" : "ok"));
        d.style.marginRight = "5px"; d.style.verticalAlign = "middle";
        who.prepend(d);
      }
      who.title = t("auth.logoutHint");
      header.append(who);
      const out = el("button", null, t("auth.logout"));
      out.type = "button";
      out.onclick = async () => {
        out.disabled = true;
        try { await api.logout(); } catch (e) { console.warn("[dsh-l]", e); }
        await view.reload();
      };
      header.append(out);
    }
    const last = state?.snapshots?.lastIngestAt;
    header.append(el("span", "meta", t("meta.lastRefreshAt") + ": " + (last ? new Date(last).toLocaleString(getLang()) : "—")));
    const strip = el("div", "strip");
    extend?.strip?.(strip, { t, state });
    const bar = el("div", "bar");
    const repos = [...new Set((state?.candidates ?? []).map((c) => c.repo))].sort();
    bar.append(
      select([["all", t("filters.all")], ["issue", t("filters.issues")], ["pull", t("filters.pullRequests")]], filters.type, (v) => { filters.type = v; paint(); }, t("filters.all")),
      select([["all", t("filters.repo")], ...repos.map((r) => [r, r])], filters.repo, (v) => { filters.repo = v; paint(); }, t("filters.repo")),
      select([["all", t("filters.urgency")], ...["P0", "P1", "P2", "P3"].map((u) => [u, t("urgency." + u)])], filters.urgency, (v) => { filters.urgency = v; paint(); }, t("filters.urgency")),
    );
    extend?.bar?.(bar, { t, state, filters, view });
    const main = el("main");
    // 主栏 tab bar（design-v2 §13.5/D6）：三视图互斥显隐（评审 P10）。
    const tabsBar = el("div");
    tabsBar.style.cssText = "display:flex;gap:6px;padding:10px 16px 0";
    for (const [id, label] of [["list", t("tabs.list")], ["board", t("tabs.board")], ["review", t("tabs.review")], ["roles", t("tabs.roles")]]) {
      const b = el("button", null, label);
      b.type = "button";
      if (activeTab === id) b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0";
      b.onclick = () => { activeTab = id; paint(); };
      tabsBar.append(b);
    }
    // 板块一：收活 —— 已连接账号下的仓源概况与监看管理入口。
    const intake = el("section", "intake");
    intake.append(el("h3", null, t("sections.intake")));
    // Task 10：连接受损横幅（B9/B10）——绑定态凭据已配置且（失效 ∨ 限流中）时呈现；不踢出、就地重校验（R2Q5）。
    const credH = state?.auth?.credential ?? {};
    const limNow = credH.rateLimitedUntil && new Date(credH.rateLimitedUntil) > new Date();
    if (credH.configured && (credH.healthy === false || limNow)) {
      const banner = el("div", "degradedBanner" + (credH.healthy === false ? "" : " is-limited"));
      banner.append(el("span", "", credH.healthy === false ? t("cred.bannerUnhealthy") : t("cred.bannerLimited")));
      const fix = el("button", "bannerAct", t("cred.bannerRecheck"));
      fix.type = "button";
      fix.onclick = async () => {
        fix.disabled = true;
        try { await api.verifyCredential(); } catch {}
        await view.reload();
      };
      banner.append(fix);
      intake.append(banner);
    }
    // Task 10：紧凑连接卡（connectionCard compact 形态）——换令牌/删除经内联表单与确认浮层完成。
    const credMount = el("div");
    intake.append(credMount);
    renderConnectionCard(credMount, { t, status: authInfo, mode: "compact", patOpen: compactPat, confirmDelete: compactDelete,
      on: {
        verify: async () => { try { await api.verifyCredential(); } catch {} await view.reload(); },
        togglePat: () => { compactPat = !compactPat; compactDelete = false; paint(); },
        toggleDelete: () => { compactDelete = !compactDelete; compactPat = false; paint(); },
        patSave: async (token) => {
          if (!token) return;
          try { await api.putCredential(token); } catch {}
          compactPat = false;
          await view.reload();
        },
        deleteConfirmed: async (ghLogout) => {
          try { await api.deleteCredential(ghLogout); } catch {}
          compactDelete = false;
          await view.reload();
        },
        cancelPat: () => { compactPat = false; paint(); },
        cancelDelete: () => { compactDelete = false; paint(); },
        // 紧凑卡不发起设备流（登录面板专属入口）；switchToDevice 在此处退化为收起表单
        switchToDevice: () => { compactPat = false; paint(); },
        connect: () => {}, enter: () => {}, install: () => {},
      } });
    const intakeChips = el("div", "chips");
    const watchRepos = state?.watch?.repos ?? [];
    const perRepo = state?.snapshots?.perRepo ?? {};
    let issueCount = 0; let pullCount = 0;
    for (const r of Object.values(perRepo)) { issueCount += r.issues ?? 0; pullCount += r.pulls ?? 0; }
    intakeChips.append(
      el("span", "chip", watchRepos.length + " " + t("intake.repos")),
      el("span", "chip", "Issue " + issueCount),
      el("span", "chip", "PR " + pullCount),
    );
    if (watchRepos.length === 0) intakeChips.append(el("span", "chip muted", t("intake.none")));
    extend?.intake?.(intakeChips, { t, state, view });
    intake.append(intakeChips);
    // 板块二：分诊与拍板 —— 工作流条 + 过滤条 + 阶段分组列表。
    const triage = el("section", "triage");
    triage.append(el("h3", null, t("sections.triage")), strip, bar);
    if (error) triage.append(el("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      triage.append(el("div", "empty", t("emptyStates.backlog")));
    } else {
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el("h3", null, group.label + " · " + group.items.length));
        for (const c of group.items) {
          renderRow(sec, c, t, {
            expanded: expanded.has(c.key),
            onToggle: (key) => { if (expanded.has(key)) expanded.delete(key); else expanded.add(key); paint(); },
            actions: extend?.rowActions ? (detail, cand) => extend.rowActions(detail, cand, { t, view, lang: getLang() }) : undefined,
          });
        }
        triage.append(sec);
      }
    }
    // 三视图互斥显隐（评审 P10）：清单 = 收活+分诊两板块；看板/待我确认为 M3 新视图容器（T8/T9 挂载组件）。
    const boardWrap = el("div");
    const reviewWrap = el("div");
    const rolesWrap = el("div");
    boardWrap.style.display = activeTab === "board" ? "" : "none";
    reviewWrap.style.display = activeTab === "review" ? "" : "none";
    rolesWrap.style.display = activeTab === "roles" ? "" : "none";
    if (activeTab === "board") renderKanban(boardWrap, { t, candidates: state?.candidates ?? [], view });
    if (activeTab === "review") renderReview(reviewWrap, { t, candidates: state?.candidates ?? [], runs: state?.runs ?? [], view });
    if (activeTab === "roles") renderRolesTab(rolesWrap, { t, workflow: state?.workflow ?? { templates: [] }, view });
    intake.style.display = activeTab === "list" ? "" : "none";
    triage.style.display = activeTab === "list" ? "" : "none";
    main.append(intake, triage, boardWrap, reviewWrap, rolesWrap);
    shadow.append(style, header, tabsBar, main);
  };

  view.reload = async () => {
    const [s, a] = await Promise.allSettled([api.state(), api.auth()]);
    if (s.status === "fulfilled") { state = s.value; error = null; } else { error = s.reason?.message ?? String(s.reason); }
    authInfo = a.status === "fulfilled" ? a.value : null;
    paint();
  };
  view.refresh = async () => {
    busy = true; paint();
    try {
      const r = await api.refresh();
      notice = r.authenticated === false ? makeT(getLang())("errors.noToken") : null;
    } catch (e) { error = e.message; }
    busy = false;
    await view.reload();
  };
  view.relabel = paint;
  view.dispose = () => { disposed = true; shadow.innerHTML = ""; };
  view.state = () => state;
  view.shadow = shadow;
  paint();
  view.reload();
  return view;
}
