import { makeT } from "../i18n.mjs";
import { groupCandidates, filterCandidates, needsReview, shouldShowStartHint, runBlock, facetCounts, loadPins, savePins, makePinId } from "../logic.mjs";
import { api } from "../api.mjs";
import { badge } from "../badge.mjs";
import { renderRow } from "./candidateRow.mjs";
import { renderLoginGate } from "./loginGate.mjs";
import { renderConnectionCard } from "./connectionCard.mjs";

const VERIFY_TTL_MS = 30 * 60 * 1000;   // R2Q3/S6：compact 挂载静默校验节流窗（与 loginGate 同值）
import { renderKanban } from "./kanban.mjs";
import { renderReview } from "./review.mjs";
import { renderSessionsView } from "./sessionsView.mjs";
import { renderRolesTab } from "./rolesTab.mjs";
import { withPending } from "./uiFeedback.mjs";
import { createKeyHandler, openHelp } from "./keynav.mjs";

const CSS = [
  ":host{--dshl-dur-1:200ms;--dshl-dur-2:220ms;--dshl-ease:cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;height:100%;font-size:14px;line-height:1.45;color:inherit}",
  "header{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}",
  "h2{font-size:15px;margin:0 8px 0 0;font-weight:600}",
  "button,select,input{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:6px;padding:3px 10px;cursor:pointer}",
  "button:hover:not(:disabled){background:color-mix(in srgb,currentColor 7%,transparent)}",
  "button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid color-mix(in srgb,currentColor 68%,transparent);outline-offset:1px}",
  "button:disabled{opacity:.45;cursor:default}",
  ".meta{margin-left:auto;font-size:12px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}",
  "main{flex:1;overflow:auto;padding:0 16px 24px}",
  ".group>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 4px;color:color-mix(in srgb,currentColor 72%,transparent)}",
  ".group.dim{opacity:.6}",
  ".row{display:flex;align-items:center;gap:8px;min-height:32px;border-bottom:1px solid color-mix(in srgb,currentColor 7%,transparent)}",
  ".row .title{flex:1;min-width:0;text-align:left;border:none;padding:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".badge{font-size:11px;font-weight:600;padding:0 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 28%,transparent)}",
  ".chip{font-size:11px;padding:0 7px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);white-space:nowrap}",
  ".chip.u-P0{font-weight:600;border-color:currentColor}",
  ".chip.muted{color:color-mix(in srgb,currentColor 65%,transparent)}",
  ".detail{padding:8px 0 12px 44px;display:flex;flex-direction:column;gap:8px}",
  ".detail .reason{margin:0;color:color-mix(in srgb,currentColor 75%,transparent)}",
  ".empty,.error{padding:24px 0;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:24px}",
  ".intake>h3,.triage>h3{font-size:12px;font-weight:600;letter-spacing:.02em;margin:16px 0 6px;color:color-mix(in srgb,currentColor 72%,transparent)}",
  /* 登录闸：遮罩只盖插件主区（absolute）——侧栏始终可退回；flex 列 + margin:auto：
     空间够→居中，空间不够→顶对齐随容器自然滚动（手机上不出现内层拖动条） */
  ".gateWrap{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;padding:24px;background:color-mix(in srgb,canvas 78%,transparent)}",
  "@supports (padding:max(16px,env(safe-area-inset-top))){.gateWrap{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}}",
  ".gate{width:min(440px,100%);margin:auto;display:flex;flex-direction:column;padding:28px 28px 20px;border-radius:14px;background:color-mix(in srgb,canvas 96%,transparent);backdrop-filter:blur(14px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 32px 64px -24px rgb(0 0 0 /.4),0 4px 16px rgb(0 0 0 /.14);animation:gate-in var(--dshl-dur-2) var(--dshl-ease)}",
  "@media (prefers-reduced-motion:reduce){.gate{animation:none}}",
  "@keyframes gate-in{from{transform:translateY(8px);opacity:.6}}",
  "@keyframes success-in{0%{border-color:color-mix(in srgb,#2da44e 55%,transparent);transform:translateY(2px)}}",
  ".gate.success-turn{animation:success-in var(--dshl-dur-1) var(--dshl-ease)}",
  "@media (prefers-reduced-motion:reduce){:host{--dshl-dur-1:0s;--dshl-dur-2:0s}.gate.success-turn{animation:none}.dot.wait{animation:none}.tabindicator{transition:none}}",   // P1-8/B2：token 置 0s 全对账（计划红①）
  "@media (prefers-reduced-motion:reduce){.gate.success-turn{animation:none}}",
  ".gateHead{display:flex;align-items:center;justify-content:space-between;gap:10px}",
  /* 图标衬底：取图标主蓝做 tint plate——浅皮淡蓝瓷面、深皮深蓝绒面，柔影托起彩色图标 */
  ".gateMark{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:color-mix(in srgb,#324DE2 9%,canvas);border:1px solid color-mix(in srgb,#324DE2 20%,canvas);box-shadow:0 2px 6px rgb(50 77 226 /.16),0 8px 20px -8px rgb(50 77 226 /.28)}",
  ".gateMark svg{display:block}",
  ".gate h3{font-size:16px;font-weight:650;margin:14px 0 0;letter-spacing:-.01em}",
  ".gate .intro{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:color-mix(in srgb,currentColor 72%,transparent)}",
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
  ".gate .note{margin:14px 0 0;padding:12px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.55;color:color-mix(in srgb,currentColor 68%,transparent)}",
  // ── 凭据卡（Task 9）：全面板登录 + 收活紧凑卡共用视觉（theme 自适应沿用 canvas/canvastext color-mix 语言）──
  ".gatePanel{width:min(560px,100%);max-width:100%;margin:auto;display:flex;flex-direction:column}",
  // box-sizing 只圈新卡片子树（shadow 内无全局重置，content-box 下 width:100%+padding 横向溢出——手机截图实录）
  ".gatePanel .gate,.gatePanel .gate *,.credCompact,.credCompact *{box-sizing:border-box}",
  ".brandRow{display:flex;align-items:center;gap:14px}",
  ".gateTitle{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0}",
  ".gatePanel .gate{width:100%;margin:26px 0 0;padding:22px 24px 18px}",
  ".gateFoot{margin-top:20px;padding:14px 2px 4px;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);font-size:12px;line-height:1.6;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".credHead{display:flex;align-items:center;gap:12px}",
  ".ghMark{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:10px;color:inherit;background:color-mix(in srgb,currentColor 5%,transparent);border:1px solid color-mix(in srgb,currentColor 10%,transparent)}",
  ".ghMark svg{display:block}",
  ".credWho{flex:1;min-width:0}",
  ".credWho b{display:block;font-size:14px;font-weight:600}",
  ".credSub{margin-top:2px;font-size:12px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".badge{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:500;padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 12%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}",
  ".dot{width:7px;height:7px;border-radius:50%;flex:none}",
  ".dot.ok{background:#2da44e}",
  ".dot.warn{background:#d29922}",
  ".dot.err{background:#d1242f}",
  ".dot.wait{background:#d29922;animation:dot-breathe 1.6s ease-in-out infinite}",
  "@keyframes dot-breathe{50%{opacity:.35}}",
  "@media (prefers-reduced-motion:reduce){.dot.wait{animation:none}}",
  ".recheck{flex:none;padding:0;width:30px;height:30px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 12%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer}",
  ".recheck svg{transition:transform 400ms cubic-bezier(.22,1,.36,1)}",
  "@media (prefers-reduced-motion:reduce){.recheck svg{transition:none}}",
  ".recheck:hover svg{transform:rotate(140deg)}",
  ".recheck:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:2px}",
  ".gates{margin-top:16px;display:flex;flex-direction:column;gap:9px}",
  ".gateRow{display:flex;align-items:center;gap:10px;min-height:24px;font-size:13px}",
  ".gateRow .gName{flex:none;font-weight:550}",
  ".gateRow .gSt{flex:1;min-width:0;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".gateRow .gSt.is-bad{color:color-mix(in srgb,#d1242f 85%,currentColor)}",
  ".kv{margin:18px 0 0;padding:14px 0 0;border-top:1px solid color-mix(in srgb,currentColor 8%,transparent);display:grid;grid-template-columns:64px 1fr;row-gap:10px;column-gap:12px;font-size:13px}",
  ".kv dt{color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".kv dd{line-height:1.5;min-width:0;overflow-wrap:anywhere}",
  ".chips{display:inline-flex;gap:6px;flex-wrap:wrap;vertical-align:-2px}",
  ".chip{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;padding:1px 8px;border-radius:5px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);background:color-mix(in srgb,currentColor 5%,transparent)}",
  // 作用域覆写（评审 N2 修正版）：全局 .chip(:30，数据面候选行) 冻结不动——.gate 子树内 scope chip 允许换行
  ".gate .chip{white-space:normal;display:inline-block;overflow-wrap:anywhere}",
  ".chip.is-miss{color:color-mix(in srgb,#d1242f 85%,currentColor);border-color:color-mix(in srgb,#d1242f 35%,transparent);background:color-mix(in srgb,#d1242f 9%,canvas)}",
  ".okFrag{color:color-mix(in srgb,#2da44e 80%,currentColor)}",
  ".switchLink{border:none;background:transparent;padding:2px 4px;cursor:pointer;font-size:12.5px;text-decoration:underline;text-underline-offset:2px;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".switchLink:hover{color:inherit}",
  ".switchLink:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patForm{margin-top:18px;padding:14px 16px;border-radius:10px;border:1px dashed color-mix(in srgb,currentColor 20%,transparent);display:none;flex-direction:column;gap:10px}",
  ".patForm.open{display:flex}",
  ".patForm label{font-size:12.5px;font-weight:550}",
  ".patInput{width:100%;height:36px;padding:0 12px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit}",
  ".patInput::placeholder{color:color-mix(in srgb,currentColor 65%,transparent)}",
  ".patInput:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".patRow{display:flex;align-items:center;gap:12px}",
  ".patSave{height:40px;padding:0 16px;border:none;border-radius:8px;cursor:pointer;background:canvastext;color:canvas;font-size:13px;font-weight:600}",
  ".patSave:hover{background:color-mix(in srgb,canvastext 84%,canvas)}",
  ".patSave:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 70%,transparent);outline-offset:2px}",
  ".patSave.is-danger{background:color-mix(in srgb,#d1242f 85%,currentColor);color:canvas}",
  ".patCancel{border:none;background:transparent;color:color-mix(in srgb,currentColor 68%,transparent);font-size:12.5px;cursor:pointer}",
  ".patCancel:hover{color:inherit}",
  ".patHint{font-size:12px;line-height:1.5;color:color-mix(in srgb,currentColor 68%,transparent)}",
  ".errForm{font-size:12.5px;line-height:1.5;margin:2px 0 0;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  ".aux{margin-top:10px;display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap}",
  ".auxAct{border:none;background:transparent;cursor:pointer;font-size:12.5px;padding:4px 8px;border-radius:6px;color:color-mix(in srgb,currentColor 72%,transparent);text-underline-offset:2px}",
  ".auxAct:hover{color:inherit;background:color-mix(in srgb,currentColor 6%,transparent)}",
  ".auxAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  ".auxAct.is-danger{color:color-mix(in srgb,#d1242f 78%,currentColor);margin-left:8px}",
  ".warnBox{font-size:13px;line-height:1.5;margin-top:12px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".credCompact{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,currentColor 10%,transparent);background:color-mix(in srgb,currentColor 3%,transparent)}",
  ".degradedBanner{margin:0 0 12px;padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;border:1px solid color-mix(in srgb,#d1242f 32%,transparent);background:color-mix(in srgb,#d1242f 8%,canvas)}",
  // ── 工作台统一可读表面（用户反馈：内容直接浮在宿主壁纸上不可读）——玻璃面板语言与登录卡一致 ──
  ".workSurface{box-sizing:border-box;margin:12px;padding:12px 16px 14px;border-radius:14px;background:color-mix(in srgb,canvas 90%,transparent);backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,currentColor 10%,transparent);box-shadow:0 18px 40px -20px rgb(0 0 0/.35)}",
  ".degradedBanner.is-limited{border-color:color-mix(in srgb,#d29922 40%,transparent);background:color-mix(in srgb,#d29922 10%,canvas)}",
  ".bannerAct{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:7px;background:transparent;color:inherit;font-size:12.5px;padding:4px 10px;cursor:pointer}",
  ".bannerAct:focus-visible{outline:2px solid color-mix(in srgb,#324DE2 60%,transparent);outline-offset:1px}",
  // ── 窄屏/手机自适应（≤560px 主断点；≤380px 二级收紧）：冗余 padding 收敛、卡头换行、双方法竖排 ──
  ".credHead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}",
  ".credWho{flex:1 1 160px;min-width:0}",
  "@media (max-width:560px){",
    ".gateWrap{padding:16px 12px}",
    ".gatePanel .gate{padding:18px 16px 14px;border-radius:12px}",
    ".brandRow{gap:11px}",
    ".gateTitle{font-size:17px}",
    ".credHead{gap:10px}",
    ".badge{margin-left:auto}",
    ".kv{grid-template-columns:56px 1fr;column-gap:10px;font-size:12.5px}",
    ".credCompact{font-size:12px;gap:8px}",
  "}",
  "@media (max-width:380px){",
    ".gateTitle{font-size:16px}",
    ".gatePanel .gate{padding:16px 14px 12px}",
    ".credHead{gap:9px}",
    ".ghMark{width:34px;height:34px}",
  "}",
  // ── 移动触控/窄视口适配层（2026-11-22 Mobile Touch UX；计划 docs/plans/2026-11-22-mobile-touch-ux-implementation-plan.md）──
  // 断点矩阵：fine+宽=桌面（零变化）；coarse+任意宽=触控层；≤560=布局层；平板(coarse+宽)拿触控层+P0 滚动。
  "@media (pointer:coarse){",
    "button,select{min-height:44px}",
    ".chip{min-height:44px}",
    "button:active:not(:disabled){opacity:.72}",
    ".row{min-height:48px}",
    "input,select{font-size:16px}",
    "input{min-height:36px;padding:8px 10px}",   // 验收③：override 理由框等 31px→36（ux-accept 终判缺口）
    "*{touch-action:manipulation}",
    // P0（与宽度无关）：shadow host 被 React 内联 overflow:hidden 裁剪——!important 越权（评审 r9 实证）；
    // fine pointer 永不命中 coarse，桌面零风险。平板(coarse+宽)同样由此恢复可达。
    ":host{overflow-y:auto !important}",
    ".ux-chev{display:inline}",
    ".rowActive{background:color-mix(in srgb,currentColor 6%,transparent)}",
  "}",
  "@media (max-width:560px){",
    // P0（手机）：同款滚动修复 + 底部行情悬浮胶囊避让（26px 实测 + 余量 30px；iOS 安全区 env 承担）
    ":host{overflow-y:auto !important;padding-bottom:calc(56px + env(safe-area-inset-bottom))}",
    "header button[data-short]{font-size:0;min-width:44px;text-align:center}",
    'header button[data-short]::after{content:attr(data-short);font-size:13px}',
    ".tabsbar{overflow-x:auto}",
    ".tabsbar button{flex:0 0 auto}",
    ".primary-actions{display:flex;flex-direction:column;gap:8px}",
    ".primary-actions button{width:100%;min-height:44px}",
    ".stage-chips{display:flex;gap:8px;overflow-x:auto}",
    ".stage-chips button{min-height:44px;flex:0 0 auto}",
    ".override-box{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:6px 10px}",
    ".override-box summary{cursor:pointer;min-height:44px;display:flex;align-items:center}",
    ".ux-wide{display:none}",
  "}",
  ".ux-narrow{display:none}",
  ".ux-chev{display:none}",
  ".start-hint{font-size:13px;opacity:.75;margin:2px 16px 0}",
  /* ── P1-1 键盘游标高亮（fine pointer 语义，不进 coarse 层）── */
  ".knav-cursor{background:color-mix(in srgb,currentColor 8%,transparent)}",
  /* ── P0-2 六态色标 token（小面积点，Host-Theme Rule 合规；唯一新固定色 #4493f8 = unread 蓝）── */
  ".stdot{width:8px;height:8px;border-radius:50%;flex:none}",
  ".st-running{background:#2da44e}",
  ".st-gating{background:#d29922}",
  ".st-unread{background:#4493f8}",
  ".st-failed{background:#d1242f}",
  ".st-done{background:color-mix(in srgb,currentColor 45%,transparent)}",
  ".st-idle{background:color-mix(in srgb,currentColor 22%,transparent)}",
  /* ── P0-6 清单行元数据脚注（标题按钮内第二行）── */
  ".rowmeta{display:block;font-size:11px;opacity:.65;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  /* ── P0-1 看板分组列表化（桌面横向六列；≤560px 退化单列分组、列头吸顶）── */
  ".kb{display:flex;gap:10px;padding:12px 16px;align-items:flex-start;overflow-x:auto}",
  ".kbcol{flex:1;min-width:150px;background:color-mix(in srgb,currentColor 4%,transparent);border-radius:8px;padding:8px}",
  ".kbhead{display:flex;gap:6px;align-items:center;font-size:12px;font-weight:600;margin-bottom:6px}",
  ".kbdot{width:8px;height:8px;border-radius:50%;flex:none}",
  ".kbcol-inbox{background:color-mix(in srgb,currentColor 30%,transparent)}",
  ".kbcol-triaged{background:#4493f8}",
  ".kbcol-gating{background:#d29922}",
  ".kbcol-building{background:#324DE2}",
  ".kbcol-shipped{background:#2da44e}",
  ".kbcol-closed{background:color-mix(in srgb,currentColor 22%,transparent)}",
  ".kbcount{opacity:.65;font-weight:400}",
  ".kbcard{border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:8px;padding:8px;margin-bottom:6px;font-size:13px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}",
  ".kbtitle{font-weight:550;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}",
  ".kbempty{font-size:12px;opacity:.6}",
  ".kbmove summary{cursor:pointer;list-style:none;font-size:12px;opacity:.75}",
  ".kbmovebtn{font-size:11px;padding:1px 6px;margin:2px 4px 0 0}",
  "@media (max-width:560px){",
    ".kb{flex-direction:column;overflow:visible}",
    ".kbcol{width:100%;min-width:0}",
    ".kbhead{position:sticky;top:0;background:color-mix(in srgb,canvas 92%,transparent);z-index:1;padding:4px 0}",
  "}",
  "@media (pointer:coarse){",
    ".kbmove summary{min-height:44px;display:flex;align-items:center}",
    ".ssarchive summary{min-height:44px;display:flex;align-items:center}",   // P1-4/S7：会话归档头 coarse 44px
  "}",
  "@media (max-width:560px){.ux-narrow{display:flex;flex-direction:column;gap:8px}}",

].join("\n");

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function mountWorkbench(shadow, { getLang, build, extend, deps = {}, storage = null } = {}) {
  const a = deps?.api ?? api;   // deps seam（计划 §3-10）：mount 自身的 state/auth/workSessions/refresh 可注入桩
  let state = null;
  let authInfo = null;
  // 紧凑卡 UI 态由卡内管理（连接卡句柄化重构：开关零 DOM 重建）；服务动作经 compactOn 抛错给卡呈现。
  const compactOn = {
    verify: async () => { try { await api.verifyCredential(); } catch {} await view.reload(); },
    patSave: async (token) => {
      await api.putCredential(token);   // 失败抛错 → 卡内 errForm 呈现（评审问题 3 纪律延续），成功才 reload
      await view.reload();
    },
    deleteConfirmed: async (ghLogout) => {
      await api.deleteCredential(ghLogout);
      await view.reload();
    },
    connect: () => {}, enter: () => {}, install: () => {},
    cancelPat: () => {}, cancelDelete: () => {}, switchToDevice: () => {},
  };
  let compactVerifiedAt = 0;    // 评审 S6：compact 挂载的 TTL 静默校验节流（Task 10「Task 9 同款」）
  let reloadRunning = false;    // view.reload 并发合并（用户报告回归钉：连点换令牌/删除时的 paint 重入 churn）
  let reloadQueued = false;
  let error = null;
  let notice = null;
  let busy = false;
  let disposed = false;
  let activeTab = "list";   // 评审 P10：tab 互斥显隐（list|board|review），闭包状态——paint 全量重建时保持，不进 store
  let sessionsItems = [];   // Task 12：会话板块数据（GET /dsh-l/work/sessions，reload 并行拉取）
  const filters = { type: "all", repo: "all", urgency: "all", stage: "all" };   // P1-3：stage 维度
  const expanded = new Set();
  const seenRuns = new Set();   // P0-2 unread 语义：展开过终态 run 的行记已读（内存态，页面刷新归零——有意取舍）
  const selectedKeys = new Set();   // P1-7 多选集合
  const checkboxEls = new Map();   // P1-7：勾选框元素登记（key → el，供批量部分失败后就地同步）
  const checkboxElSink = (elc) => checkboxEls.set(elc.dataset.key, elc);
  let batchFormOpen = false;   // P1-7 批量推翻共享表单开关（闭包态，paint 存续）
  let rowEls = [];   // P1-1：可视清单行元素（paint 收集，j/k 游标用）
  let surfaceEl = null;   // P1-1：帮助浮层锚点（paint 更新）
  let cursorIndex = -1;   // P1-1 游标态（keynav 持方为调用方）
  let helpInstance = null;
  let credMount = null;   // 紧凑连接卡挂载点（原隐式全局：产物非严格加载侥幸可用，node ESM 严格模式必炸——Task 8 测试揪出）
  const view = {};

  const select = (pairs, value, onChange, label) => {
    const s = el("select");
    s.setAttribute("aria-label", label);
    for (const [v, text] of pairs) { const o = el("option", null, text); o.value = v; s.append(o); }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };
  const btn = (text, onClick, disabled = false) => {   // P1-7 批量栏引入：与 review/actions 同款 pending 包装
    const b = el("button", null, text);
    b.type = "button";
    b.disabled = disabled;
    b.onclick = withPending(b, onClick);
    return b;
  };

  let prevMainEl = null;   // P1-2：上一棵树的滚动容器引用（重绘前快照 scrollTop）
  let tabsObserver = null;   // P1-8：tab 指示条观察器（paint 重建前断开防泄漏）
  const paint = () => {
    if (disposed) return;
    const t = makeT(getLang());
    tabsObserver?.disconnect?.(); tabsObserver = null;   // P1-8：旧指示条观察器清账
    // P1-2 快照：滚动位置（旧 main）与焦点（navKey 标记，shadow.activeElement 桩安全可选读）
    const savedScroll = prevMainEl ? (prevMainEl.scrollTop ?? 0) : 0;
    const activeEl = shadow.activeElement ?? null;
    const navKey = (activeEl && activeEl.dataset && activeEl.dataset.navKey) || null;
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
    const refreshLbl = busy ? t("refreshing") : t("refresh");
    const refreshBtn = el("button", null, refreshLbl);
    refreshBtn.type = "button";
    refreshBtn.setAttribute("aria-label", refreshLbl);
    refreshBtn.dataset.short = refreshLbl.slice(0, 1);
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
      out.setAttribute("aria-label", t("auth.logout"));
      out.dataset.short = t("auth.logout").slice(0, 1);
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
    extend?.strip?.(strip, { t, state, stagePick: (bucket) => { filters.stage = filters.stage === bucket ? "all" : bucket; paint(); }, stageFilter: filters.stage });   // P1-6：strip 点击联动
    const bar = el("div", "bar");
    const repos = [...new Set((state?.candidates ?? []).map((c) => c.repo))].sort();
    const facets = facetCounts(state?.candidates ?? []);   // P1-3 计数数据源
    // P1-3：type 计数 chips 替代 type 下拉（点击设置 filters.type；全部=复位）
    const total = (state?.candidates ?? []).length;
    for (const [val, label, count] of [["all", t("filters.all"), total], ["issue", t("filters.issues"), facets.type.issue ?? 0], ["pull", t("filters.pullRequests"), facets.type.pull ?? 0]]) {
      const chipBtn = el("button", "chip typechip" + (filters.type === val ? " is-active" : ""), label + " (" + count + ")");
      chipBtn.type = "button";
      chipBtn.setAttribute("aria-pressed", String(filters.type === val));
      chipBtn.onclick = () => { filters.type = val; paint(); };
      bar.append(chipBtn);
    }
    const stagePairs = [["all", t("filters.all")], ...["inbox", "triaged", "gating", "building", "shipped", "closed"].map((s) => [s, t("groups." + s) + " (" + (facets.stage[s] ?? 0) + ")"])];
    bar.append(
      select(stagePairs, filters.stage, (v) => { filters.stage = v; paint(); }, t("filters.stage")),
      select([["all", t("filters.repo")], ...repos.map((r) => [r, r + " (" + (facets.repo[r] ?? 0) + ")"])], filters.repo, (v) => { filters.repo = v; paint(); }, t("filters.repo")),
      select([["all", t("filters.urgency")], ...["P0", "P1", "P2", "P3"].map((u) => [u, t("urgency." + u) + " (" + (facets.urgency[u] ?? 0) + ")"])], filters.urgency, (v) => { filters.urgency = v; paint(); }, t("filters.urgency")),
    );
    extend?.bar?.(bar, { t, state, filters, view });
    // P1-3 后半：pinned filters（storage 注入；缺失降级内存；取值防抛在调用方 safeStorage）
    const pins = loadPins(storage);
    const filtersActiveNow = filters.type !== "all" || filters.repo !== "all" || filters.urgency !== "all" || filters.stage !== "all";
    const pinLabel = (f) => {
      const parts = [];
      if (f.type !== "all") parts.push(f.type === "issue" ? t("filters.issues") : t("filters.pullRequests"));
      if (f.repo !== "all") parts.push(f.repo);
      if (f.urgency !== "all") parts.push(t("urgency." + f.urgency));
      if (f.stage !== "all") parts.push(t("groups." + f.stage));
      return parts.join(" · ") || "—";
    };
    const savePinBtn = el("button", "chip pinsave", t("filters.saveCurrent"));
    savePinBtn.type = "button";
    savePinBtn.disabled = !filtersActiveNow;
    savePinBtn.title = t("filters.saveCurrent");
    savePinBtn.onclick = () => {
      const next = [...loadPins(storage), { id: makePinId(), label: pinLabel(filters), filters: { ...filters } }];
      savePins(storage, next);
      paint();
    };
    bar.append(savePinBtn);
    if (pins.length > 0) {
      const pinWrap = el("span", "pinrow");
      pinWrap.setAttribute("aria-label", t("filters.pins"));
      for (const p of pins) {
        const chipBtn = el("button", "chip pinchip" + (JSON.stringify(filters) === JSON.stringify(p.filters) ? " is-active" : ""), p.label);
        chipBtn.type = "button";
        chipBtn.onclick = () => { Object.assign(filters, p.filters); paint(); };
        pinWrap.append(chipBtn);
        const rm = el("button", "chip pinrm", t("filters.pinRemove"));
        rm.type = "button";
        rm.setAttribute("aria-label", t("filters.pinRemove"));
        rm.onclick = () => { savePins(storage, loadPins(storage).filter((x) => x.id !== p.id)); paint(); };
        pinWrap.append(rm);
      }
      bar.append(pinWrap);
    }
    const main = el("main");
    // 主栏 tab bar（design-v2 §13.5/D6）：三视图互斥显隐（评审 P10）；P1-8 滑动指示条（S12 双探测，缺省退化）。
    const tabsBar = el("div", "tabsbar");
    tabsBar.style.cssText = "display:flex;gap:6px;padding:10px 16px 0;position:relative";
    const TAB_IDS = ["list", "board", "review", "sessions", "roles"];
    const TAB_LABELS = [t("tabs.list"), t("tabs.board"), t("tabs.review"), t("tabs.sessions"), t("tabs.roles")];   // 静态字面量（动态前缀撞白名单守护，B2 同款纪律）
    let tabIndex = 0;
    TAB_IDS.forEach((id, idx) => {
      const b = el("button", null, TAB_LABELS[idx]);
      b.type = "button";
      if (activeTab === id) { b.style.cssText = "font-weight:700;border-bottom:2px solid currentColor;border-radius:0"; tabIndex = idx; }
      b.onclick = () => { activeTab = id; paint(); };
      tabsBar.append(b);
    });
    const indicator = el("div", "tabindicator");
    indicator.style.cssText = "position:absolute;bottom:0;height:2px;background:currentColor;transition:transform var(--dshl-dur-2) var(--dshl-ease),width var(--dshl-dur-2) var(--dshl-ease)";
    indicator.style.display = "none";   // S12：缺省静态退化（启用探测通过后置空）
    tabsBar.append(indicator);
    if (typeof ResizeObserver !== "undefined" && globalThis.matchMedia?.("(pointer:fine)")?.matches) {
      indicator.style.display = "";
      const alignIndicator = () => {
        const b = tabsBar.children[tabIndex];
        if (!b || b.offsetWidth === undefined) return;
        indicator.style.width = b.offsetWidth + "px";
        indicator.style.transform = "translateX(" + b.offsetLeft + "px)";
      };
      tabsObserver?.disconnect?.();
      tabsObserver = new ResizeObserver(alignIndicator);
      tabsObserver.observe(tabsBar);
      alignIndicator();
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
    // 评审 S6：verifiedAt 超 TTL（Task 9 同款 30min）挂载时静默校验一次（paint 重建经节流不重复发起）。
    {
      const credS6 = authInfo?.credential ?? {};
      const vMs = credS6.verifiedAt ? Date.parse(credS6.verifiedAt) : NaN;
      if (authInfo?.gates?.credentialOk && Number.isFinite(vMs) && Date.now() - vMs > VERIFY_TTL_MS && Date.now() - compactVerifiedAt > VERIFY_TTL_MS) {
        compactVerifiedAt = Date.now();
        api.verifyCredential().then(() => view.reload()).catch(() => {});
      }
    }
    credMount = el("div");
    intake.append(credMount);
    renderConnectionCard(credMount, { t, status: authInfo, mode: "compact", on: compactOn });
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
    triage.append(el("h3", null, t("sections.triage")));
    if (shouldShowStartHint(state ?? {})) triage.append(el("div", "start-hint", t("work.startHint")));
    triage.append(strip, bar);
    // P1-7 批量栏（B4 收尾语义）：全成 → 清勾选 + reload；部分失败 → 不 reload、汇总 notice、失败键保留勾选
    if (selectedKeys.size > 0) {
      const batchBar = el("div", "batchbar");
      batchBar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 0";
      batchBar.append(el("span", "chip", t("batch.selected").replace("{n}", String(selectedKeys.size))));
      const batchGo = async (fn) => {
        const keys = [...selectedKeys];
        if (keys.length === 0) return;
        const results = await Promise.allSettled(keys.map((k) => fn(k)));
        let ok = 0;
        const failedKeys = [];
        results.forEach((res, i) => { if (res.status === "fulfilled") { ok++; selectedKeys.delete(keys[i]); } else failedKeys.push(keys[i]); });
        if (failedKeys.length === 0) { notice = null; await view.reload(); }
        else { notice = t("batch.done").replace("{ok}", String(ok)).replace("{fail}", String(failedKeys.length)); paint(); }
      };
      batchBar.append(btn(t("actions.moveTo") + " " + t("groups.gating"), () => batchGo((k) => a.stage(k, "gating", ""))));
      batchBar.append(btn(t("batch.close"), () => batchGo((k) => a.stage(k, "closed", ""))));
      batchBar.append(btn(t("batch.override"), () => { batchFormOpen = !batchFormOpen; paint(); }));
      if (batchFormOpen) {
        const form = el("div", "batchform");
        form.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 0";
        const v = select([["high", t("validity.high")], ["medium", t("validity.medium")], ["low", t("validity.low")]], "medium", () => {}, t("batch.formValidity"));
        const u = select([["P0", t("urgency.P0")], ["P1", t("urgency.P1")], ["P2", t("urgency.P2")], ["P3", t("urgency.P3")]], "P2", () => {}, t("batch.formUrgency"));
        const actSel = select([["start", t("recommendedActions.start")], ["feedback", t("recommendedActions.feedback")], ["close", t("recommendedActions.close")], ["hold", t("recommendedActions.hold")]], "hold", () => {}, t("batch.formAction"));
        const reason = el("input", "batchreason");
        reason.placeholder = t("batch.reasonPlaceholder");
        form.append(v, u, actSel, reason);
        form.append(btn(t("actions.override"), () => batchGo((k) => a.override({ key: k, validity: v.value, urgency: u.value, action: actSel.value, reason: reason.value, lang: getLang() }))));
        batchBar.append(form);
      }
      triage.append(batchBar);
    }
    if (error) triage.append(el("div", "error", t("errors.refreshFailed") + " (" + error + ")"));
    if (notice) triage.append(el("div", "error", notice));
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      const filtersActive = filters.type !== "all" || filters.repo !== "all" || filters.urgency !== "all" || filters.stage !== "all";   // P1-3/S4：纳入 stage
      const emptyBox = el("div", "empty");
      if (filtersActive) {
        emptyBox.append(el("span", null, t("emptyStates.filtered")));
        const clearBtn = el("button", null, t("emptyStates.clearFilters"));
        clearBtn.type = "button";
        clearBtn.onclick = () => { filters.type = "all"; filters.repo = "all"; filters.urgency = "all"; filters.stage = "all"; paint(); };
        emptyBox.append(clearBtn);
      } else {
        emptyBox.append(el("span", null, t("emptyStates.backlog")));
      }
      triage.append(emptyBox);
    } else {
      checkboxEls.clear();
      for (const group of groupCandidates(list, t)) {
        if (group.items.length === 0) continue;
        const sec = el("section", "group" + (group.dim ? " dim" : ""));
        sec.append(el("h3", null, group.label + " · " + group.items.length));
        for (const c of group.items) {
          const rowRun = runBlock(c, state?.runs ?? []);
          renderRow(sec, c, t, {
            expanded: expanded.has(c.key),
            onToggle: (key) => {
              if (expanded.has(key)) expanded.delete(key);
              else {
                expanded.add(key);
                if (rowRun && ["succeeded", "failed", "cancelled"].includes(rowRun.status)) seenRuns.add(rowRun.id);   // P0-2 已读记账
              }
              paint();
            },
            run: rowRun,
            seen: seenRuns.has(c.currentRunId),
            selectable: true,
            selected: selectedKeys.has(c.key),
            onToggleSelect: (key) => { if (selectedKeys.has(key)) selectedKeys.delete(key); else selectedKeys.add(key); paint(); },
            onCheckboxEl: checkboxElSink,
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
    const sessionsWrap = el("div");
    boardWrap.style.display = activeTab === "board" ? "" : "none";
    reviewWrap.style.display = activeTab === "review" ? "" : "none";
    rolesWrap.style.display = activeTab === "roles" ? "" : "none";
    sessionsWrap.style.display = activeTab === "sessions" ? "" : "none";
    if (activeTab === "board") renderKanban(boardWrap, { t, candidates: state?.candidates ?? [], view });
    if (activeTab === "review") renderReview(reviewWrap, { t, candidates: state?.candidates ?? [], runs: state?.runs ?? [], view, templates: state?.workflow?.templates ?? [], nowMs: Date.now() });
    if (activeTab === "roles") renderRolesTab(rolesWrap, { t, workflow: state?.workflow ?? { templates: [] }, view });
    if (activeTab === "sessions") renderSessionsView(sessionsWrap, { t, items: sessionsItems, summaries: extend?.sessionsFeed?.() ?? [], onOpen: (id, item) => { if (item?.runId) seenRuns.add(item.runId); extend?.openWorkSession?.(id); }, onAnother: (key, cwd) => extend?.startAnother?.(key, cwd), onDeliver: async (key) => { try { await api.workDeliver(key, ""); } catch (e) { return t("sessions.deliverFailed") + " (" + String(e?.message ?? e) + ")"; } await view.reload(); return null; }, runs: state?.runs ?? [], seenRunIds: [...seenRuns], nowMs: Date.now() });
    intake.style.display = activeTab === "list" ? "" : "none";
    triage.style.display = activeTab === "list" ? "" : "none";
    main.append(intake, triage, boardWrap, reviewWrap, rolesWrap, sessionsWrap);
    // 统一可读表面（用户反馈）：header/tabs/main 收进玻璃面板，不再直接浮在宿主壁纸上。
    const surface = el("div", "workSurface");
    surface.append(header, tabsBar, main);
    shadow.append(style, surface);
    // P1-2 恢复：navKey 标记 → 滚动复位 → 焦点复位（全部尽力而为，桩/无焦点安全）
    let navIdx = 0;
    const assignNavKeys = (node) => {
      for (const c of node.children ?? []) {
        const tag = String(c.tagName).toUpperCase();
        if (tag === "BUTTON" || tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") c.dataset.navKey = "n" + navIdx++;
        assignNavKeys(c);
      }
    };
    assignNavKeys(surface);
    prevMainEl = main;
    if (savedScroll) main.scrollTop = savedScroll;
    if (navKey) {
      const findByNavKey = (node) => {
        for (const c of node.children ?? []) {
          if (c.dataset && c.dataset.navKey === navKey) return c;
          const hit = findByNavKey(c);
          if (hit) return hit;
        }
        return null;
      };
      findByNavKey(surface)?.focus?.();
    }
    // P1-1：收集可视清单行（classList.contains 兼容游标高亮类的追加）
    rowEls = [];
    const collectRows = (node) => {
      for (const c of node.children ?? []) {
        if (c.classList?.contains?.("row")) rowEls.push(c);
        collectRows(c);
      }
    };
    collectRows(surface);
    surfaceEl = surface;
    if (cursorIndex >= rowEls.length) cursorIndex = rowEls.length - 1;
  };

  view.reload = async () => {
    // 并发合并（用户报告回归钉）：连续点击触发的多次 reload 收敛为一次收尾重跑，防 paint 重入 churn
    if (reloadRunning) { reloadQueued = true; return; }
    reloadRunning = true;
    try {
      do {
        reloadQueued = false;
        const [s, w, au] = await Promise.allSettled([a.state(), a.workSessions(), a.auth()]);
        if (s.status === "fulfilled") { state = s.value; error = null; } else { error = s.reason?.message ?? String(s.reason); }
        authInfo = au.status === "fulfilled" ? au.value : null;
        sessionsItems = w.status === "fulfilled" ? (w.value.items ?? []) : [];
        paint();
      } while (reloadQueued);
    } finally { reloadRunning = false; }
  };
  view.refresh = async () => {
    busy = true; paint();
    try {
      const r = await a.refresh();
      notice = r.authenticated === false ? makeT(getLang())("errors.noToken") : null;
    } catch (e) { error = e.message; }
    busy = false;
    await view.reload();
  };
  view.relabel = paint;
  // P1-1 键盘接线（S5 dispose 对称）：游标高亮 + 行展开/勾选经既有 DOM 回调复用
  const highlightCursor = () => {
    for (const r of rowEls) r.classList?.remove?.("knav-cursor");
    const r = rowEls[cursorIndex];
    if (r) {
      r.classList?.add?.("knav-cursor");
      r.scrollIntoView?.({ block: "nearest" });
    }
  };
  const keyHandler = createKeyHandler({
    getCursor: () => cursorIndex,
    setCursor: (i) => { cursorIndex = i; highlightCursor(); },
    getRowCount: () => rowEls.length,
    rowAction: (i) => {
      const title = rowEls[i]?.children?.find((c) => String(c.className) === "title");
      title?.onclick?.();
    },
    rowSelect: (i) => {
      const chk = rowEls[i]?.children?.find((c) => c.getAttribute?.("role") === "checkbox");
      chk?.onclick?.();
    },
    tabSwitch: (i) => {
      const ids = ["list", "board", "review", "sessions", "roles"];
      if (ids[i]) { activeTab = ids[i]; paint(); }
    },
    onHelp: () => { if (helpInstance) { helpInstance.close(); helpInstance = null; } else { helpInstance = openHelp(surfaceEl ?? shadow, makeT(getLang())); } },   // P1-1：? toggle（rev-impl-p1 S5 防叠开）
    escape: () => { helpInstance?.close?.(); helpInstance = null; },
  });
  const keyHandlerGuarded = (e) => { if (disposed) return; keyHandler(e); };
  // rev-impl-p1 B1：监听挂 shadow 根（不挂 host——Shadow DOM 事件重定向会把 host 级监听的
  // e.target 改写为宿主元素，typing 守卫永不命中，输入框打字被劫持）；keynav 内再以 composedPath 双保险。
  shadow.addEventListener?.("keydown", keyHandlerGuarded);
  view.dispose = () => { disposed = true; tabsObserver?.disconnect?.(); tabsObserver = null; shadow.removeEventListener?.("keydown", keyHandlerGuarded); shadow.innerHTML = ""; };   // P1-1/S5/S6：dispose 对称（监听 + 指示条观察器）
  view.state = () => state;
  view.shadow = shadow;
  paint();
  view.reload();
  return view;
}
