import { makeT, createLangSource } from "./i18n.mjs";
import { badge } from "./badge.mjs";
import { installKeyboardPrototypeShim } from "./keyboard-shim.mjs";
import { mountWorkbench } from "./components/workbench.mjs";
import { installActions } from "./components/actions.mjs";

// 鲁棒性 shim（尽早安装，幂等）：补齐合成键盘事件的 W3C 未知按键语义，
// 覆盖宿主 ui-primitives/shortcuts 对缺 key 合成 keydown 的崩溃缺口（用户 Edge 实测反馈）。
installKeyboardPrototypeShim();

const React = require("react");
const h = React.createElement;
const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";
export const PANEL_KEY = "dsh-l.workbench";
export const name = "dsh-l";
export const isPlugin = true; // guizang lib/client.js:75 同款导出
// 客户端 cordis 插件的 inject 列表来自模块自身导出（quota-watch src/client.mjs:10-14 判例）；
// package.json dsh.client.inject 只负责把宿主模块打进行包。缺此导出即报 cannot get property "slots" without inject。
// 开工会话（Task 5/R1-7）：uiWorkspace 供 openSession 导航，sessions 供列表成员守卫——cordis 对未 inject
// 属性的 get 即抛，可选链挡不住 getter throw，故 M1 一次到位注入 + 守卫整体 try/catch。
export const inject = ["slots", "uiWorkspace", "sessions"];

function PanelIcon(props) {
  const s = (props && props.size) || 18;
  return h("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z" }));
}

export function apply(ctx) {
  const lang = createLangSource(ctx);
  const label = () => {   // 评审 R2：badge 计数接线（T7 Produces 补落盘）
    const base = makeT(lang.get())("panelLabel");
    return badge.count > 0 ? makeT(lang.get())("badge.pending").replace("{n}", String(badge.count)) + " · " + base : base;
  };

  // 开工会话导航守卫（schedule 面板判例）：sessions.list 的 ids 含该 id 才启用；守卫整体 try/catch
  // （inject 错配的宿主降级为 false → 行内 openPending chip 兜底），不向面板外写 DOM。
  const openWorkSession = (sessionId) => {
    try {
      const ids = ctx.sessions?.list?.getSnapshot?.()?.ids;
      if (Array.isArray(ids) && ids.includes(sessionId)) {
        ctx.uiWorkspace.openSession(sessionId);
        return true;
      }
    } catch (e) { console.warn("[dsh-l] openSession guard:", e); }
    return false;
  };

  function WorkbenchPanel() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const host = ref.current;
      if (!host) return undefined;
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const view = mountWorkbench(shadow, { getLang: lang.get, build: BUILD, extend: installActions({ getLang: lang.get, openWorkSession, pickDirectory: (opts) => ctx.uiWorkspace.pickDirectory(opts) }) });
      const off = lang.subscribe(() => view.relabel());
      return () => { off(); view.dispose(); };
    }, []);
    return h("div", { ref, style: { width: "100%", height: "100%", overflow: "hidden", position: "relative" } });
  }

  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register({ name: "sidebar.panellist", id: PANEL_KEY, order: 30, label }, PanelIcon));
  ctx.slots.inject("main", () =>
    ctx.slots.register({ name: "main", key: PANEL_KEY }, WorkbenchPanel));
}
