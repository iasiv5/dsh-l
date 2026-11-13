import { makeT, createLangSource } from "./i18n.mjs";
import { mountWorkbench } from "./components/workbench.mjs";
import { installActions } from "./components/actions.mjs";

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
    // icon.svg 同款无限环+双节点，currentColor 随主题（侧栏深底可读）
    h("path", { d: "M18 18C13.4 10.6 3.6 10.6 3.6 18C3.6 25.4 13.4 25.4 18 18C22.6 10.6 32.4 10.6 32.4 18C32.4 25.4 22.6 25.4 18 18" }),
    h("circle", { cx: 9.1, cy: 12.45, r: 2.8, fill: "currentColor", stroke: "none" }),
    h("circle", { cx: 26.9, cy: 23.55, r: 2.8, fill: "currentColor", stroke: "none" }));
}

export function apply(ctx) {
  const lang = createLangSource(ctx);
  const label = () => makeT(lang.get())("panelLabel");

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
