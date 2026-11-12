import { makeT } from "../i18n.mjs";

export function mountWorkbench(shadow, { getLang, build }) {
  const paint = () => {
    const t = makeT(getLang());
    shadow.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = ":host{display:block;padding:16px;font-size:14px}";
    const title = document.createElement("h2");
    title.textContent = t("panelLabel");
    const empty = document.createElement("p");
    empty.textContent = t("emptyStates.backlog");
    shadow.append(style, title, empty);
    shadow.host.dataset.dshLBuild = build;
  };
  paint();
  return { relabel: paint, reload: paint, dispose: () => { shadow.innerHTML = ""; } };
}
