# 开工路径可发现性修复 实施计划

> 背景：主人手机实测「找不到哪里开工」。根因：「我来开」仅在候选进入待拍板（gating）阶段且展开行时可见——事发时清单（1 待分诊 + 11 已关闭；现活体 2 待拍板 + 10 已关闭/挂起）无任何待拍板候选时，界面没有任何开工路径的可见线索。方法：/impeccable Operate 精度克制，小改动。

## 目标

1. 每条展开的候选行在**非 gating 阶段**也有一条可见的开工路径主动作：「移到 待拍板」（全宽 44px，置于 ux-narrow 主动作行首位）；gating 态维持现状（我来开 + G1 对；主动作行无反色样式——反色仅登录卡 CTA，disc#3 更正）。
2. 待拍板候选数为 0（且账号已绑定）时，「分诊与拍板」区头部下出现一行开工路径引导文案。
3. 桌面同步获得引导文案（新功能行，非回归）；行内动作桌面不变（ux-narrow 专属）。

## 设计取舍（disc 评审修正）

- 不新增「一键开工直达」跳过闸门的路径——闸门纪律不动；引导只把既有合法路径显性化：**移到 待拍板 → 我来开（G1 由 postWorkStart 随开工自动记账放行，handlers L487-490——无需人肉三步）**。
- 非 gating 行的 primary 现状 = 禁用 G1 对（非空）——新增的 移到 待拍板 置于**首位**，置于既有 append（mkOpen/mkStart）之前（disc#2 钉死实现位置）。
- 源阶段白名单（disc#1）：`["inbox","triaged","held","closed","shipped"]`——排除 building/verifying（与 kanban/logic 禁手工迁移口径一致；且开工成功即产生 building 行，若不过滤会立即错误出现首位按钮）。
- uxChips 的 移到 待拍板 保留（迁移全集入口，disc#7）——与 primary 首位按钮同屏重复为有意设计。
- 引导文案跟随双语；出现条件（disc#4/#5）= 账号已绑定 ∧ 候选数 > 0 ∧ 无 gating 候选，抽 logic.mjs 纯函数 `shouldShowStartHint(state)` + logic.test 直测。
- 反色事实更正：.primary-actions button 无反色样式（反色仅 .gate .cta）——主动作行以全宽 44px 强调，不涉 One Voice 反色冲突。

## 全局约束

- 桌面行内（ux-wide/legacy）像素零变化（新增动作仅入 ux-narrow）；引导文案行是新增 DOM（桌面可见——功能本身）。
- 双语键：`work.startHint`（zh：「暂无待拍板候选——展开任意行点『移到 待拍板』，再点『我来开』即可开工。」en 对应）。
- TDD：client-render 断言 + locale-parity；探针截图落盘 `.dsh-research/dsh-l-touchux/`。

## 文件结构与职责

- Modify: `src/client/components/actions.mjs` — rowActions ux-narrow primary：白名单源阶段（inbox/triaged/held/closed/shipped）时首位插入 移到 待拍板 全宽按钮。
- Modify: `src/client/logic.mjs` + `test/logic.test.mjs` — `shouldShowStartHint(state)` 纯函数 + 三态直测。
- Modify: `src/client/components/workbench.mjs` — triage 区头部下 `shouldShowStartHint(state)` 条件引导行 + locale 键。
- Modify: `src/client/locale/zh-CN.mjs` + `en.mjs` — `work.startHint`。
- Test: `test/client-render.test.mjs` — 非 gating 行 primary 首位=移到 待拍板（含 held 行）；Test: `test/logic.test.mjs` — hint 三态。

## 任务清单

### Task 1: 非 gating 行开工路径主动作（首位、源阶段白名单）

- rowActions：uxPrimary **首位**（在 mkOpen/mkStart 条件 append 之前）插入 `btn(t("actions.moveTo") + " " + t("groups.gating"), () => go(() => api.stage(c.key, "gating", "")))`——条件 = 白名单源阶段 `["inbox","triaged","held","closed","shipped"].includes(c.stage)`（disc#1：排除 building/verifying——与禁手工迁移口径一致，且开工成功产生的 building 行不得出现首位按钮）。gating 态不插入（我来开已是主动作）。
- 验证：client-render 断言——inbox/triaged/closed 行 primary 首位 = 移到 待拍板；building 行不含；gating 行不含（我来开已在）。uxChips 的 移到 待拍板 保留（disc#7 注记）。

### Task 2: 待拍板空态引导行（条件抽纯函数）

- logic.mjs 新增 `shouldShowStartHint(state)`：`auth.account 在场 ∧ candidates.length > 0（disc#4）∧ 无 stage==="gating" 候选`；logic.test 直测三态。
- workbench paint：triage 区头部行后——`shouldShowStartHint(state)` → 追加 `el("div", "start-hint", t("work.startHint"))`（样式：13px opacity .75 margin）。
- 文案（disc#6 路径校正）：zh「暂无待拍板候选——展开任意行点『移到 待拍板』，再点『我来开』即可开工。」；en 对应。
- 验证：logic.test 三态直测 + 静态源断言（workbench.mjs 含 startHint 渲染行）+ locale-parity + 实机截图。

### Task 3: 验收（探针 walk 修正 + 空态覆盖 + 全量回归）

- 探针修正（disc#8）：build 标记 `data-dsh-l-build` 在 shadow.host 光 DOM 元素上——先 `document.querySelector("[data-dsh-l-build]")` 定位 host 再取 `.shadowRoot`（可复用 disc-review-scratch 的 probe-r1e/f 已验证形态）；旧 m4/m5 walk 恒 null 判定作废。
- 空态覆盖（disc#9）：当前活体已有 2 条 gating 行（其一为演示留置的 dsh-m#69）——验收时经 API 临时拨离（验 hint 出现）再复原，以「待拍板 · 2」计数核对复原成功；stage 变更会在行 history 留痕（无害）。
- 验证：移动探针截图（非 gating 行首位按钮 + 0 gating 态 hint 行）+ 桌面探针 exit 0 + `npm test` + `npm run build` + locale-parity。
- 实机主人目视。

## 执行纪律

- Task 顺序执行；每任务验证；探针落盘 scratch。
