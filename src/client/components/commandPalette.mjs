// P2-1 ⌘K 命令面板：动作目录（{id,label,run} 注册表，后续动作追加即可）。
// input 自管 keydown（stopPropagation——面板开着时不泄给 keynav）；过滤=大小写不敏感子串；
// ↑↓ 移动高亮、Enter 执行、Esc/点背景关闭；关闭必经 onClose（workbench 重置开启态）。
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export function openPalette(anchorEl, { t, actions = [], onClose = () => {} } = {}) {
  let query = "";
  let index = 0;
  const dlg = el("div", "palette");
  dlg.style.cssText = "position:fixed;inset:0;z-index:75;display:flex;align-items:flex-start;justify-content:center;padding-top:8vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const box = el("div", "palettebox");
  box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;width:min(420px,92vw);max-width:90vw";
  const title = el("div", "palettetitle", t("palette.title"));
  title.style.cssText = "font-weight:600;opacity:.8;font-size:12px";
  const input = el("input", "paletteinput");
  input.placeholder = t("palette.placeholder");
  input.style.cssText = "width:100%;max-width:100%;min-height:36px;padding:6px 10px;font-size:14px;border-radius:8px;border:1px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,canvas);color:inherit";
  const list = el("div", "palettelist");
  box.append(title, input, list);
  dlg.append(box);
  const close = () => { dlg.remove(); onClose(); };
  const filtered = () => (actions ?? []).filter((a) => String(a.label ?? "").toLowerCase().includes(query.toLowerCase()));
  const paintList = () => {
    list.innerHTML = "";
    const items = filtered();
    if (index >= items.length) index = Math.max(0, items.length - 1);
    if (items.length === 0) {
      list.append(el("div", "paletteempty", t("palette.empty")));
      return;
    }
    items.forEach((a, i) => {
      const item = el("button", "paletteitem" + (i === index ? " is-active" : ""), a.label);
      item.type = "button";
      item.setAttribute("aria-selected", String(i === index));
      item.style.cssText = "text-align:left;padding:6px 10px;border:none;background:transparent;color:inherit;cursor:pointer;min-height:32px" + (i === index ? ";background:color-mix(in srgb,currentColor 10%,transparent);font-weight:600" : "");
      item.onclick = () => { dlg.remove(); onClose(); a.run?.(); };
      list.append(item);
    });
  };
  input.oninput = () => { query = input.value; index = 0; paintList(); };
  input.onkeydown = (e) => {
    e?.stopPropagation?.();   // 面板开着时不泄给 keynav（P1 B1 同源语义）
    if (!e) return;
    const items = filtered();
    if (e.key === "ArrowDown") { e.preventDefault?.(); index = Math.min(index + 1, Math.max(items.length - 1, 0)); paintList(); }
    else if (e.key === "ArrowUp") { e.preventDefault?.(); index = Math.max(index - 1, 0); paintList(); }
    else if (e.key === "Enter") { e.preventDefault?.(); const a = items[index]; if (a) { dlg.remove(); onClose(); a.run?.(); } }
    else if (e.key === "Escape") { e.preventDefault?.(); close(); }
  };
  dlg.onclick = (e) => { if (e && e.target === dlg) close(); };
  paintList();
  anchorEl.append(dlg);
  input.focus?.();
  return { close };
}
