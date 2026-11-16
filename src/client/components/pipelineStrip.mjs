import { stageCounts, stripCells } from "../logic.mjs";

// 旧 7 段回退形态：无 workflow meta 时沿用（state 载荷缺 workflow 键的兜底）。
const STAGES = [["ingest", false], ["backlog", false], ["triage", false], ["feedback", false], ["build", true], ["verify", true], ["ship", true]];

// 工作流条（design-v2 §8）：模板驱动只读渲染——前环计数 chip（沿用 stages.* i18n 键）+ 分隔符 +
// 环内节点 chip（node.name 字面量，M1 无执行器恒灰）；fallback 时渲染旧 7 段。
export function renderStrip(container, { t, candidates, workflow }) {
  const cells = stripCells({ candidates, workflow });
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:4px;padding:8px 16px 0;flex-wrap:wrap;align-items:center";
  if (cells.fallback) {
    const counts = stageCounts(candidates);
    for (const [key, dim] of STAGES) {
      const cell = document.createElement("span");
      cell.className = "chip";
      if (dim) { cell.style.opacity = ".45"; cell.title = t("gateV1Hint"); }
      cell.textContent = t("stages." + key) + " " + counts[key];
      wrap.append(cell);
    }
  } else {
    for (const c of cells.pre) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.textContent = t("stages." + c.key) + " " + c.count;
      wrap.append(cell);
    }
    const divider = document.createElement("span");
    divider.textContent = "·";
    divider.style.opacity = ".4";
    wrap.append(divider);
    for (const n of cells.loop) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.style.opacity = ".45";           // M1 无执行器，环内恒灰；M2 接 run 节点状态
      cell.title = n.name;
      cell.textContent = n.name;
      wrap.append(cell);
    }
  }
  container.append(wrap);
}
