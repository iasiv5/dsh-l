import { roleRows } from "../logic.mjs";
import { api } from "../api.mjs";

// 角色 tab（design-v2 §14.4/Q4 主人升级）：搜索 + 行卡（名称/职责/executionPolicy/被引用计数）+
// 编辑对话框（roleId 创建态可编辑/编辑态只读 + name/description/prompt textarea/executionPolicy select）+
// 删除保护（uses>0 禁用；评审 P9①②③）。
// 信息架构参照 LoopForge agents.js（仅交互模式，vanilla DOM 自写；MIT 致谢见 README）。
export function renderRolesTab(container, { t, workflow, view }) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "padding:12px 16px;display:flex;flex-direction:column;gap:10px";
  const reload = () => view.reload();
  const act = (fn) => async () => { try { await fn(); } catch (e) { console.warn("[dsh-l]", e); } await reload(); };

  // 搜索框
  const search = document.createElement("input");
  search.type = "search"; search.placeholder = t("roles.search");
  search.style.cssText = "font-size:13px;padding:4px 8px;max-width:280px";
  wrap.append(search);

  // 行卡列表容器
  const list = document.createElement("div");
  list.style.cssText = "display:flex;flex-direction:column;gap:6px";
  wrap.append(list);

  const state = { roles: [], workflow: workflow ?? { templates: [] } };
  const paint = () => {
    list.textContent = "";
    const rows = roleRows({ roles: state.roles, workflow: state.workflow, query: search.value });
    if (rows.length === 0) list.append(Object.assign(document.createElement("div"), { textContent: t("roles.empty"), style: "opacity:.6" }));
    for (const r of rows) {
      const row = document.createElement("div");
      row.style.cssText = "border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer";
      const who = document.createElement("div");
      who.style.cssText = "flex:1";
      const name = document.createElement("b");
      name.textContent = r.name + (r.overridden ? " ·" + t("roles.overridden") : "");
      const desc = document.createElement("div");
      desc.style.cssText = "opacity:.7;font-size:12px";
      desc.textContent = r.description || r.id;
      who.append(name, desc);
      const policy = document.createElement("span");
      policy.textContent = r.executionPolicy === "auto" ? t("roles.policyAuto") : t("roles.policyAsk");
      policy.style.cssText = "font-size:11px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:10px;padding:1px 8px";
      const uses = document.createElement("span");
      uses.textContent = r.uses > 0 ? r.uses + " " + t("roles.uses") : t("roles.unused");
      uses.style.cssText = "font-size:11px;opacity:.7";
      const editBtn = document.createElement("button");
      editBtn.type = "button"; editBtn.textContent = t("roles.edit");
      editBtn.style.cssText = "font-size:12px;padding:2px 10px";
      editBtn.onclick = () => openDialog(r);
      row.append(who, policy, uses, editBtn);
      row.onclick = () => openDialog(r);
      list.append(row);
    }
  };
  search.oninput = paint;

  // 编辑/新增对话框
  const openDialog = (role) => {
    const isNew = !role;
    const dlg = document.createElement("div");
    dlg.className = "rtOverlay";   // P0-5a：对话框归位 Shadow DOM 后供测试定位（rev-plan S4）
    dlg.style.cssText = "position:fixed;inset:0;background:color-mix(in srgb,canvas 55%,transparent);display:flex;align-items:center;justify-content:center;z-index:60";
    const box = document.createElement("div");
    box.style.cssText = "background:canvas;color:canvastext;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;min-width:340px;max-width:90vw;font-size:13px";
    const field = (labelText, input) => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;flex-direction:column;gap:2px";
      row.append(Object.assign(document.createElement("span"), { textContent: labelText, style: "font-size:12px;opacity:.8" }));
      input.style.cssText = "font-size:13px;padding:4px 6px";
      row.append(input);
      return row;
    };
    // roleId：创建态可编辑、编辑态只读（评审 P9①：D4「roleId 创建时定不可改」的 UI 落点）
    const idInput = document.createElement("input");
    idInput.value = role?.id ?? ""; idInput.readOnly = !isNew;
    idInput.disabled = !isNew;
    const nameInput = document.createElement("input");
    nameInput.value = role?.name ?? "";
    const descInput = document.createElement("input");
    descInput.value = role?.description ?? "";
    const promptInput = document.createElement("textarea");
    promptInput.value = role?.prompt ?? "";
    promptInput.rows = 6; promptInput.style.cssText = "font-size:12px;padding:4px 6px;font-family:monospace";
    const policySelect = document.createElement("select");
    for (const [v, label] of [["ask", t("roles.policyAsk")], ["auto", t("roles.policyAuto")]]) {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = label;
      if ((role?.executionPolicy ?? "ask") === v) opt.selected = true;
      policySelect.append(opt);
    }
    box.append(
      Object.assign(document.createElement("b"), { textContent: isNew ? t("roles.new") : t("roles.editTitle") }),
      field(t("roles.roleId"), idInput),
      field(t("roles.name"), nameInput),
      field(t("roles.description"), descInput),
      field(t("roles.prompt"), promptInput),
      field(t("roles.executionPolicy"), policySelect),
    );
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button"; closeBtn.textContent = t("roles.cancel");
    closeBtn.onclick = () => dlg.remove();
    const saveBtn = document.createElement("button");
    saveBtn.type = "button"; saveBtn.textContent = t("roles.save");
    saveBtn.onclick = act(async () => {
      await api.rolesUpsert({ id: idInput.value.trim(), name: nameInput.value, description: descInput.value, prompt: promptInput.value, executionPolicy: policySelect.value });
      dlg.remove();
    });
    btnRow.append(closeBtn, saveBtn);
    // 删除（评审 R1-7：确认步骤 + uses>0 禁用——仅对自定义角色；builtin 覆盖层删除回落内置始终可删（R1-4 豁免））
    if (!isNew) {
      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.textContent = t("roles.delete");
      delBtn.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);margin-right:auto";
      delBtn.disabled = !role.builtin && role.uses > 0;
      delBtn.title = delBtn.disabled ? t("roles.inUse") : "";
      delBtn.onclick = act(async () => {
        if (!window.confirm(t("roles.deleteConfirm").replace("{id}", role.id))) { return; }
        await api.rolesDelete(role.id);
        dlg.remove();
      });
      btnRow.prepend(delBtn);
    }
    box.append(btnRow);
    dlg.append(box);
    dlg.onclick = (e) => { if (e.target === dlg) dlg.remove(); };
    wrap.append(dlg);   // P0-5a：挂 Shadow DOM 内（原 document.body 逃逸隔离 + 硬编码浅色兜底违反 Host-Theme Rule）
  };

  // 「新增角色」按钮 + 数据装载
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center";
  const newBtn = document.createElement("button");
  newBtn.type = "button"; newBtn.textContent = t("roles.new");
  newBtn.style.cssText = "font-size:12px;padding:3px 12px";
  newBtn.onclick = () => openDialog(null);
  toolbar.append(search, newBtn);
  wrap.prepend(toolbar);

  api.rolesList().then((r) => { state.roles = r?.roles ?? []; paint(); }).catch(() => paint());
  paint();
  container.append(wrap);
  return { dispose: () => wrap.remove() };
}
