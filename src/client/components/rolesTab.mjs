import { roleRows } from "../logic.mjs";
import { BUILTIN_ROLES } from "../../workflows/roles.mjs";
import { api } from "../api.mjs";

// 角色 tab（design-v2 §14.4/M4）：搜索 + 行卡（名称/职责/executionPolicy/被引用计数）+
// 编辑对话框（roleId 创建态可编辑/编辑态只读 + name/description/prompt textarea/executionPolicy select）+
// 删除保护（uses>0 禁用；评审 P9①②③）。信息架构参照 LoopForge agents.js（仅交互模式，vanilla DOM 自写）。
// P2 Task 7：「新增角色」改三步向导（起点=5 内置预设/空白 → 身份 → 确认保存）；
// 编辑既有角色路径不变（openDialog）；deps seam（P2：rolesList/Upsert/Delete 注入可测）。
export function renderRolesTab(container, { t, workflow, view, deps = {} } = {}) {
  const a = deps.api ?? api;
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

  // 编辑/新增对话框（编辑路径；P0 Task 1：对话框归位 wrap + canvas 语义 token）
  const openDialog = (role) => {
    const isNew = !role;
    const dlg = document.createElement("div");
    dlg.className = "rtOverlay";
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
      await a.rolesUpsert({ id: idInput.value.trim(), name: nameInput.value, description: descInput.value, prompt: promptInput.value, executionPolicy: policySelect.value });
      dlg.remove();
    });
    btnRow.append(closeBtn, saveBtn);
    // 删除（评审 R1-7：确认步骤 + uses>0 禁用——仅对自定义角色；builtin 覆盖层删除回落内置始终可删（R1-4 豁免））
    if (!isNew) {
      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.textContent = t("roles.delete");
      delBtn.style.cssText = "color:color-mix(in srgb,#d1242f 85%,currentColor);margin-right:auto";   // P2 Task 1：语义色统一（硬编码红字清偿）
      delBtn.disabled = !role.builtin && role.uses > 0;
      delBtn.title = delBtn.disabled ? t("roles.inUse") : "";
      delBtn.onclick = act(async () => {
        if (!window.confirm(t("roles.deleteConfirm").replace("{id}", role.id))) { return; }
        await a.rolesDelete(role.id);
        dlg.remove();
      });
      btnRow.prepend(delBtn);
    }
    box.append(btnRow);
    dlg.append(box);
    dlg.onclick = (e) => { if (e && e.target === dlg) dlg.remove(); };
    wrap.append(dlg);
  };

  // P2 Task 7：三步创建向导（起点=5 内置预设/空白 → 身份 → 确认保存）
  const openWizard = () => {
    const presets = [
      { id: "", name: t("wizard.blank"), description: "", prompt: "", executionPolicy: "ask", blank: true },
      ...Object.values(BUILTIN_ROLES).map((r) => ({ ...r, blank: false })),
    ];
    let step = 1;
    let preset = null;
    const draft = { id: "", name: "", description: "", prompt: "", executionPolicy: "ask" };
    const dlg = document.createElement("div");
    dlg.className = "rtOverlay";
    dlg.style.cssText = "position:fixed;inset:0;background:color-mix(in srgb,canvas 55%,transparent);display:flex;align-items:flex-start;justify-content:center;padding-top:8vh;z-index:70";
    const box = document.createElement("div");
    box.style.cssText = "background:canvas;color:canvastext;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:10px;width:min(520px,92vw);max-width:90vw;max-height:80vh;overflow:auto;font-size:13px";
    dlg.append(box);
    const close = () => dlg.remove();
    dlg.onclick = (e) => { if (e && e.target === dlg) close(); };
    const mkBtn = (text, onClick) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.style.cssText = "padding:4px 12px"; b.onclick = onClick; return b; };
    const field = (labelText, input) => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;flex-direction:column;gap:2px";
      const sp = document.createElement("span");
      sp.style.cssText = "font-size:12px;opacity:.8";
      sp.textContent = labelText;
      row.append(sp);
      input.style.cssText = "font-size:13px;padding:4px 6px";
      row.append(input);
      return row;
    };
    const paint = () => {
      box.innerHTML = "";
      const title = document.createElement("b");
      title.textContent = t("roles.wizardTitle") + " · " + (step === 1 ? t("wizard.stepStart") : step === 2 ? t("wizard.stepIdentity") : t("wizard.stepReview"));
      box.append(title);
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
      if (step === 1) {
        const grid = document.createElement("div");
        grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
        for (const p of presets) {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "wzpreset";
          card.style.cssText = "text-align:left;padding:10px;border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:8px;background:transparent;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:4px";
          const nm = document.createElement("b");
          nm.textContent = p.blank ? t("wizard.blank") : p.id;
          const ds = document.createElement("span");
          ds.style.cssText = "opacity:.7;font-size:12px";
          ds.textContent = p.blank ? t("wizard.blank") : (p.description ?? "");
          card.append(nm, ds);
          card.onclick = () => {
            preset = p;
            draft.id = p.blank ? "" : p.id + "-copy";
            draft.name = p.blank ? "" : (p.name ?? "") + t("wizard.copySuffix");
            draft.description = p.description ?? "";
            draft.prompt = p.prompt ?? "";
            draft.executionPolicy = p.executionPolicy ?? "ask";
            step = 2;
            paint();
          };
          grid.append(card);
        }
        box.append(grid);
        btnRow.append(mkBtn(t("roles.cancel"), close));
        box.append(btnRow);
        return;
      }
      const cancelBtn = mkBtn(t("roles.cancel"), close);   // P2：每步均可取消（测试 B4 同款——step2 点取消路径）
      if (step === 2) {
        const idInput = document.createElement("input");
        idInput.className = "wzid"; idInput.value = draft.id;
        idInput.oninput = () => { draft.id = idInput.value; };
        box.append(field(t("roles.roleId"), idInput));
        const nameInput = document.createElement("input");
        nameInput.className = "wzname"; nameInput.value = draft.name;
        nameInput.oninput = () => { draft.name = nameInput.value; };
        box.append(field(t("roles.name"), nameInput));
        const descInput = document.createElement("input");
        descInput.className = "wzdesc"; descInput.value = draft.description;
        descInput.oninput = () => { draft.description = descInput.value; };
        box.append(field(t("roles.description"), descInput));
        btnRow.append(cancelBtn);
        btnRow.append(mkBtn(t("wizard.back"), () => { step = 1; paint(); }));
        btnRow.append(mkBtn(t("wizard.next"), () => { step = 3; paint(); }));
        box.append(btnRow);
        return;
      }
      // step 3：prompt/policy/回顾 + 保存
      const promptInput = document.createElement("textarea");
      promptInput.className = "wzprompt"; promptInput.rows = 6; promptInput.value = draft.prompt;
      promptInput.oninput = () => { draft.prompt = promptInput.value; };
      box.append(field(t("roles.prompt"), promptInput));
      const policySelect = document.createElement("select");
      policySelect.className = "wzpolicy";
      for (const [v, key] of [["ask", "roles.policyAsk"], ["auto", "roles.policyAuto"]]) {
        const o = document.createElement("option");
        o.value = v; o.textContent = t(key);
        if (draft.executionPolicy === v) o.selected = true;
        policySelect.append(o);
      }
      policySelect.onchange = () => { draft.executionPolicy = policySelect.value; };
      box.append(field(t("roles.executionPolicy"), policySelect));
      const review = document.createElement("div");
      review.className = "wzreview";
      review.style.cssText = "font-size:12px;opacity:.75";
      review.textContent = t("roles.roleId") + ": " + draft.id + " · " + t("roles.name") + ": " + draft.name;
      box.append(review);
      btnRow.append(cancelBtn);
      btnRow.append(mkBtn(t("wizard.back"), () => { step = 2; paint(); }));
      btnRow.append(mkBtn(t("roles.save"), act(async () => {
        await a.rolesUpsert({ id: draft.id.trim(), name: draft.name, description: draft.description, prompt: draft.prompt, executionPolicy: draft.executionPolicy });
        close();
      })));
      box.append(btnRow);
    };
    paint();
    wrap.append(dlg);
  };

  // 「新增角色」按钮 + 数据装载
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center";
  const newBtn = document.createElement("button");
  newBtn.type = "button"; newBtn.textContent = t("roles.new");
  newBtn.style.cssText = "font-size:12px;padding:3px 12px";
  newBtn.onclick = () => openWizard();
  toolbar.append(search, newBtn);
  wrap.prepend(toolbar);

  a.rolesList().then((r) => { state.roles = r?.roles ?? []; paint(); }).catch(() => paint());
  paint();
  container.append(wrap);
  return { dispose: () => wrap.remove() };
}
