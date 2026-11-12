import { stageCounts } from "../logic.mjs";

const STAGES = [["ingest", false], ["backlog", false], ["triage", false], ["feedback", false], ["build", true], ["verify", true], ["ship", true]];

export function renderStrip(container, { t, candidates }) {
  const counts = stageCounts(candidates);
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:4px;padding:8px 16px 0;flex-wrap:wrap";
  for (const [key, dim] of STAGES) {
    const cell = document.createElement("span");
    cell.className = "chip";
    if (dim) { cell.style.opacity = ".45"; cell.title = t("gateV1Hint"); }
    cell.textContent = t("stages." + key) + " " + counts[key];
    wrap.append(cell);
  }
  container.append(wrap);
}
