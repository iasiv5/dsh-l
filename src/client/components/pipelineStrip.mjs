import { stageCounts, stripCells } from "../logic.mjs";

// 旧 7 段回退形态：无 workflow meta 时沿用（state 载荷缺 workflow 键的兜底）。
const STAGES = [["ingest", false], ["backlog", false], ["triage", false], ["feedback", false], ["build", true], ["verify", true], ["ship", true]];

// 工作流条（design-v2 §8）：模板驱动只读渲染——前环计数 chip（沿用 stages.* i18n 键）+ 分隔符 +
// 环内节点 chip（node.name 字面量，M1 无执行器恒灰）；fallback 时渲染旧 7 段。
// P1-6：带 onStagePick 时 pre 三枚（backlog/triage/feedback，count>0）转为可点 button → stage 过滤联动
//（stageFilter 对应桶时加 is-active，再点取消由调用方负责）；loop chip title 附计数。缺省回调时全为 span（零变化）。
export function renderStrip(container, { t, candidates, workflow, runs = [], onStagePick = null, stageFilter = "all" } = {}) {
  const cells = stripCells({ candidates, workflow, runs });   // M7 评审问题7：转发 runs——环内在途着色生效（M2 残留修复）+ 多模板匹配
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
    const PRE_BUCKET = { backlog: "inbox", triage: "triaged", feedback: "gating" };
    for (const c of cells.pre) {
      const clickable = onStagePick && c.key !== "ingest" && c.count > 0 && PRE_BUCKET[c.key];
      if (clickable) {
        const bucket = PRE_BUCKET[c.key];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "chip stripchip" + (stageFilter === bucket ? " is-active" : "");
        cell.textContent = t("stages." + c.key) + " " + c.count;
        cell.onclick = () => onStagePick(bucket);
        wrap.append(cell);
      } else {
        const cell = document.createElement("span");
        cell.className = "chip";
        cell.textContent = t("stages." + c.key) + " " + c.count;
        wrap.append(cell);
      }
    }
    const divider = document.createElement("span");
    divider.textContent = "·";
    divider.style.opacity = ".4";
    wrap.append(divider);
    for (const n of cells.loop) {
      const cell = document.createElement("span");
      cell.className = "chip";
      cell.style.opacity = n.count > 0 ? "1" : ".45";   // M7：在途着色生效（M2 残留修复——renderStrip 转发 runs 后计数真实）
      cell.title = n.count > 0 ? n.name + " · " + n.count : n.name;   // P1-6：title 附计数
      cell.textContent = n.name;
      wrap.append(cell);
    }
  }
  container.append(wrap);
}
