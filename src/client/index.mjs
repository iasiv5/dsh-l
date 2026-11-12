import { makeT, createLangSource } from "./i18n.mjs";
import { mountWorkbench } from "./components/workbench.mjs";
import { installActions } from "./components/actions.mjs";

const React = require("react");
const h = React.createElement;
const BUILD = typeof __DSH_L_BUILD__ === "string" ? __DSH_L_BUILD__ : "dev";
export const PANEL_KEY = "dsh-l.workbench";
export const name = "dsh-l";
export const isPlugin = true; // guizang lib/client.js:75 同款导出

function PanelIcon(props) {
  const s = (props && props.size) || 18;
  return h("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" },
    h("path", { d: "M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4z" }));
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
