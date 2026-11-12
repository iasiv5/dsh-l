import { api } from "../api.mjs";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export function openRepoPicker(shadow, { t, current, onSaved }) {
  const selected = new Set(current);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;background:color-mix(in srgb,canvas 55%,transparent)";
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", t("repoPicker.title"));
  dialog.style.cssText = "width:min(440px,92%);max-height:70vh;display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:10px;background:canvas;color:canvastext;border:1px solid color-mix(in srgb,currentColor 18%,transparent)";
  const title = document.createElement("h3");
  title.textContent = t("repoPicker.title");
  title.style.margin = "0";
  const list = document.createElement("div");
  list.style.cssText = "overflow:auto;flex:1";
  const renderList = (names) => {
    list.innerHTML = "";
    for (const name of [...new Set([...selected, ...names])].sort()) {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;gap:8px;padding:2px 0";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(name);
      cb.onchange = () => { if (cb.checked) selected.add(name); else selected.delete(name); };
      label.append(cb, document.createTextNode(name));
      list.append(label);
    }
  };
  renderList([]);
  const discover = document.createElement("button");
  discover.type = "button";
  discover.textContent = t("repoPicker.discover");
  discover.onclick = async () => {
    discover.disabled = true;
    try { renderList((await api.discover()).repos.map((r) => r.fullName)); } catch {} finally { discover.disabled = false; }
  };
  const input = document.createElement("input");
  input.placeholder = t("repoPicker.addManually");
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "+";
  add.onclick = () => { const v = input.value.trim(); if (REPO_RE.test(v)) { selected.add(v); input.value = ""; renderList([]); } };
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = t("repoPicker.save");
  const close = () => overlay.remove();
  save.onclick = async () => { await api.putWatch([...selected]); close(); onSaved?.(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.onkeydown = (e) => { if (e.key === "Escape") close(); };
  const addRow = document.createElement("div");
  addRow.style.cssText = "display:flex;gap:6px";
  addRow.append(input, add);
  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;gap:6px;justify-content:space-between";
  footer.append(discover, save);
  dialog.append(title, list, addRow, footer);
  overlay.append(dialog);
  shadow.append(overlay);
  input.focus();
}
