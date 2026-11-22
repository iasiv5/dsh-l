// 六态状态点（P0-2 契约）：六键全部以静态字面量消费 i18n——i18n 消费键守护逐键覆盖，
// 不引入动态前缀（守护白名单不动）。未知状态归一 idle。
export function stateDotEl(state, t) {
  const el = document.createElement("span");
  const s = ["running", "gating", "unread", "done", "failed", "idle"].includes(state) ? state : "idle";
  el.className = "stdot st-" + s;
  switch (s) {
    case "running": el.title = t("stateDot.running"); break;
    case "gating": el.title = t("stateDot.gating"); break;
    case "unread": el.title = t("stateDot.unread"); break;
    case "done": el.title = t("stateDot.done"); break;
    case "failed": el.title = t("stateDot.failed"); break;
    default: el.title = t("stateDot.idle");
  }
  return el;
}
