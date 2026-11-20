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
export const inject = ["slots"];

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

  function WorkbenchPanel() {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const host = ref.current;
      if (!host) return undefined;
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const view = mountWorkbench(shadow, { getLang: lang.get, build: BUILD, extend: installActions({ getLang: lang.get }) });
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
