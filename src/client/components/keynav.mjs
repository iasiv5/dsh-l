// P1-1 键盘体系：键位分派纯逻辑 + 帮助浮层。
// 游标态由调用方持有（getCursor/setCursor）；typingTarget 守卫（输入焦点内不劫持）；
// 修饰键组合忽略；preventDefault 仅对已消费键调用（不吞宿主快捷键）。
export function createKeyHandler({ getCursor = () => -1, setCursor = () => {}, getRowCount = () => 0, rowAction = null, rowSelect = null, tabSwitch = null, onHelp = null, onPeek = null, escape = null, typingTarget = null } = {}) {
  const defaultTyping = (target) => {
    const tag = target ? String(target.tagName ?? "").toUpperCase() : "";
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || Boolean(target?.isContentEditable);
  };
  const isTyping = (target) => (typingTarget ? typingTarget(target) : defaultTyping(target));
  return (e) => {
    if (!e) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // rev-impl-p1 B1：Shadow DOM 事件重定向——监听在 shadow 根/host 时 e.target 可能被改写为宿主元素，
    // 必须取 composedPath()[0]（树内最内层元素）做 typing 判定，否则输入框内打字被劫持吞字。
    const target = (typeof e.composedPath === "function" ? e.composedPath()?.[0] : null) ?? e.target ?? null;
    if (isTyping(target)) return;
    const key = e.key;
    if (key === "j" || key === "J") {
      if (getRowCount() === 0) return;   // P2 Task 1：空行守卫（不动、不消费）
      e.preventDefault?.();
      setCursor(Math.min((getCursor() ?? -1) + 1, getRowCount() - 1));
      return;
    }
    if (key === "k" || key === "K") {
      if (getRowCount() === 0) return;   // P2 Task 1：空行守卫
      e.preventDefault?.();
      setCursor(Math.max((getCursor() ?? 0) - 1, 0));
      return;
    }
    if (key === "Enter" || key === " ") {
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) { e.preventDefault?.(); rowAction?.(c); }
      return;
    }
    if (key === "x" || key === "X") {
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) { e.preventDefault?.(); rowSelect?.(c); }
      return;
    }
    if (key === "p" || key === "P") {   // P2-6：Peek 预览（键位重排声明见 P2 计划 §3-3）
      const c = getCursor();
      if (c >= 0 && c < getRowCount()) { e.preventDefault?.(); onPeek?.(c); }
      return;
    }
    if (key === "?") { e.preventDefault?.(); onHelp?.(); return; }
    if (key === "Escape") { escape?.(); return; }   // S5/S6：帮助浮层关闭通道
    if (/^[1-5]$/.test(key)) { e.preventDefault?.(); tabSwitch?.(Number(key) - 1); return; }
  };
}

// 帮助浮层：挂锚元素子树（workSurface——backdrop-filter 成为 fixed 包含块，遮罩收窄为面板区，
// 对齐 P0 rtOverlay 裁决，rev-plan S6）；Esc 由 workbench keyhandler 的 escape 通道驱动。
export function openHelp(anchorEl, t) {
  const dlg = document.createElement("div");
  dlg.className = "kbdhelp";
  dlg.style.cssText = "position:fixed;inset:0;z-index:70;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = document.createElement("div");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;min-width:280px;max-width:90vw;font-size:13px";
  const title = document.createElement("b");
  title.textContent = t("kbd.title");
  box.append(title);
  for (const key of ["jk", "enter", "x", "peek", "digits", "help"]) {
    const row = document.createElement("div");
    row.className = "kbdrow";
    // 静态 switch（rev-plan B2 同款纪律）：动态前缀会撞 i18n 白名单守护，静态字面量让消费键守护逐键覆盖
    switch (key) {
      case "jk": row.textContent = t("kbd.jk"); break;
      case "enter": row.textContent = t("kbd.enter"); break;
      case "x": row.textContent = t("kbd.x"); break;
      case "peek": row.textContent = t("kbd.peek"); break;
      case "digits": row.textContent = t("kbd.digits"); break;
      default: row.textContent = t("kbd.help");
    }
    box.append(row);
  }
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = t("kbd.close");
  closeBtn.style.cssText = "align-self:flex-end;padding:2px 10px";
  const close = () => dlg.remove();
  closeBtn.onclick = close;
  dlg.onclick = (e) => { if (e && e.target === dlg) close(); };
  box.append(closeBtn);
  dlg.append(box);
  anchorEl.append(dlg);
  return { close };
}
