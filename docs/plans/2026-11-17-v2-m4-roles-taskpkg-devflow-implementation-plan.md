# dsh-l v2 M4（Role 入册 + 任务包 v2 + devflow-lite）实施计划

## 目标

- Role 数据面：builtin 角色常量（4 个）+ `store.roles` 用户自定义 + 解析顺序（store 优先）+ 引用计数与删除保护。
- devflow-lite 内置模板：6 节点精简链（requirement gate → design → implement → review(fail→implement ≤2) → test → g2 → deliver），作为第二个内置模板验证非线性执行。
- 任务包 v2：role 块 + workflow 块，双版本 golden 守卫；composeAgentPrompt 改用角色 prompt。
- 角色管理 UI：主栏第四 tab「角色」（搜索/行卡/编辑对话框/删除保护），信息架构参照 LoopForge agents.js（交互模式借鉴，vanilla DOM 自写）。
- 遗留清账：R4 gate 文案映射、i18n 消费键守护测试。
- 不含：角色 UI 之外的 M5 项（feishu 校验/保存并测试/kanban 口径/DOM 冒烟）、发版（Q10-B：M4 后攒 M5）。

## 架构快照

- Role 解析：`resolveRole(roleId, store)` = store.roles[roleId] ?? BUILTIN_ROLES[roleId] ?? null；agent 节点派发时经 resolveRole 取 prompt/executionPolicy/model，节点内联 prompt 仅在 roleId 缺失时兜底。
- store.roles：doc v2 增 `roles: {}` 键（additive 回填，无版本 bump）；内置角色不进 store（与 LOOP_V1 同源纪律）。
- devflow-lite：第二个 builtin 模板常量，语义骨架照 LoopForge Portable（需求闸→设计→实现→独立评审→测试→交付闸→交付），KNOWLEDGE/SUMMARY/规模分级砍掉。
- 角色 UI：主栏第四 tab「角色」——信息架构参照 LoopForge agents.js（搜索/行卡/使用计数/编辑对话框/删除保护），vanilla DOM 全自写；不引第三方框架。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面（M1–M3 继承）：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json。
- 测试桩纪律：fetch/execFile/spawn/io/world 全注入；单测不真实出网/spawn/clone。
- 术语按 GLOSSARY；任务包 emit 信封不变（autoloop 幂等契约）；v1 任务包字段全保留。
- M4 不发 npm、不 bump version（0.0.1）；i18n 新键双字典 + parity。
- **docs commit 纪律延续**：docs 类变更独立 commit。
- 退出码卫生：管道显示验证输出加 `set -o pipefail`。命令环境：Linux bash，工作目录 `/home/ubuntu/workspace/dsh-l`。
- UI 交互参考 LoopForge agents.js 仅限信息架构与交互模式（MIT 致谢已注明），实现全自写。

## 输入工件

- 设计：docs/design-v2.md §6（任务包 v2）、§12.4（prompt 组装）、§14（M4 补钉全条）、§11（里程碑）；参照 /home/ubuntu/workspace/.dsh-research/loopforge/local/skills/devflow/config/workflow.json（门禁/路由口径）与 agents/manifest.json（角色语义参照——prompt 自写不拷文本）。
- 参照实现：src/engine/executor.mjs composeAgentPrompt、src/client/components/actions.mjs（lastRuns 闭包/btn/row 助手）、src/client/components/review.mjs（分区卡片范式）、src/workflows/builtin.mjs（模板常量范式）。

## 文件结构与职责

- Create: `src/workflows/roles.mjs` — BUILTIN_ROLES 常量（loop-builder / devflow-architect / devflow-developer / devflow-code-reviewer）+ resolveRole(roleId, userRoles)
- Create: `src/client/components/roles.mjs` — 角色 tab 组件（搜索/行卡/编辑对话框/删除保护）
- Modify: `src/store.mjs` — doc.roles `{}` 回填；`upsertRole(role)` / `deleteRole(id)`（引用守卫在调用侧）/ `listRoles()`
- Modify: `src/engine/engine.mjs` — startRun 增 templateId 参（缺省 loop-v1）；dispatch 的 agent 分支经 resolveRole 组装 prompt/executionPolicy
- Modify: `src/engine/executor.mjs` — composeAgentPrompt 改签名（{ rolePrompt, taskPackage, upstream }），prefix 语义由调用方以角色 prompt 传入；删除 lastText 相关残留零改动确认
- Modify: `src/workflows/builtin.mjs` — build 节点增 roleId:"loop-builder"（保留 prefix 作 fallback——roleId 解析失败兜底）；LOOP_V1.revision 重算（golden 不锁值，安全）
- Modify: `src/handlers.mjs` — postRunStart 透传 templateId；postRolesUpsert/postRolesDelete/postRolesList 三方法（auth + 引用守卫）
- Modify: `src/host.mjs` — 路由表增 `/dsh-l/roles` GET/POST/DELETE 三行（DELETE 走 body 传 id）
- Modify: `src/client/api.mjs` — rolesList/rolesUpsert/rolesDelete 三端点
- Modify: `src/client/components/workbench.mjs` — 第四 tab「角色」+ mountRoles 接线
- Modify: `test/executor.test.mjs` — composeAgentPrompt 新签名用例改造
- Test 新文件: `test/roles.test.mjs`（builtin golden/resolve 顺序/引用计数）
- Modify: `test/engine.test.mjs`（startRun templateId/role 解析派发钉例）
- Modify: `test/handlers.test.mjs`（roles 三方法 + startRun templateId 透传）
- Modify: `src/client/i18n.mjs` 或 locale 两文件 — 增键（roles.* 段 + tabs.roles）
- 不动：src/client/components/kanban.mjs、review.mjs 的既有分区/列逻辑（仅按需增角色名展示）

任务间接口依赖：T1（store.roles 数据面）→ T2（builtin roles + resolveRole 消费 store.roles）→ T3（executor 消费 resolveRole）→ T4（devflow-lite 模板）→ T5（任务包 v2）→ T6（handlers/host 路由）→ T7（roles UI）→ T8（引擎/路由接线收口）→ T9（i18n 键）→ T10（最终验证）。执行顺序按编号。

## 任务清单

### Task 1: store.mjs — roles 数据面

- 目标：store 持久化用户自定义角色；旧档回填空。
- 涉及文件：Modify `src/store.mjs`；Test `test/store.test.mjs`
- 接口契约：
  - Consumes: 既有回填区（`doc.runs ??= {}` 一带）
  - Produces: `doc.roles ??= {}`；`upsertRole(role)`（role={id,name,description,prompt,executionPolicy,model?}，id 必填校验，touch+persist）；`deleteRole(id)`；`listRoles()`（对象值数组）；`getRole(id)`
- 验证范围：`npm test`（store 段）

- [ ] Step 1: 失败测试（store.test.mjs 追加）
```js
test("roles：upsert/list/get/delete 回填与幂等", () => {
  const s = open();
  assert.deepEqual(s.listRoles(), []);
  s.upsertRole({ id: "my-builder", name: "我的构建", prompt: "p", executionPolicy: "auto" });
  assert.equal(s.getRole("my-builder").name, "我的构建");
  s.upsertRole({ id: "my-builder", name: "我的构建2", prompt: "p2", executionPolicy: "ask" });
  assert.equal(s.getRole("my-builder").prompt, "p2");
  assert.equal(s.listRoles().length, 1);
  s.deleteRole("my-builder");
  assert.equal(s.getRole("my-builder"), null);
});
test("旧档回填：roles 空对象不炸", () => {
  const file = join(mkdtempSync(join(tmpdir(), "dsh-l-role-")), "store.json");
  writeFileSync(file, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {}, auth: {} }));
  assert.deepEqual(createStore({ filePath: file }).listRoles(), []);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: 两用例红（listRoles 不是函数）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——store.mjs：回填区增 `doc.roles ??= {};`；返回对象增四方法（upsertRole 校验 id 非空字符串、覆盖即更新；deleteRole 缺席静默）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(store): roles 数据面（M4 T1）"`

### Task 2: workflows/roles.mjs — 内置角色与解析顺序

- 目标：内置 4 角色常量 + resolveRole（store 优先）。
- 涉及文件：Create `src/workflows/roles.mjs`；Test `test/roles.test.mjs`（新）
- 接口契约：
  - Consumes: design-v2 §14.1/§14.3
  - Produces: `BUILTIN_ROLES`（id: loop-builder / devflow-architect / devflow-developer / devflow-code-reviewer；字段 {id,name,description,prompt,executionPolicy,builtin:true}）；`resolveRole(roleId, userRoles = {})` → userRoles[roleId] ?? BUILTIN_ROLES[roleId] ?? null
- 验证范围：`npm test`（roles 段）

- [ ] Step 1: 新建 `test/roles.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { BUILTIN_ROLES, resolveRole } from "../src/workflows/roles.mjs";
test("内置 4 角色齐全且字段完整", () => {
  const ids = Object.keys(BUILTIN_ROLES);
  assert.deepEqual(ids.sort(), ["devflow-architect", "devflow-code-reviewer", "devflow-developer", "loop-builder"].sort());
  for (const r of Object.values(BUILTIN_ROLES)) {
    assert.ok(r.name && r.prompt && ["ask", "auto"].includes(r.executionPolicy));
    assert.equal(r.builtin, true);
  }
});
test("resolveRole：用户角色优先于内置", () => {
  const user = { "loop-builder": { id: "loop-builder", name: "用户覆盖", prompt: "自定义", executionPolicy: "ask" } };
  assert.equal(resolveRole("loop-builder", user).name, "用户覆盖");
  assert.equal(resolveRole("devflow-architect", user).builtin, true);
  assert.equal(resolveRole("nope", user), null);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: Cannot find module roles.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——roles.mjs（四个角色对象；prompt 为中文精简自写——architect=产出技术方案与改动清单、developer=按方案实现并自测、code-reviewer=独立审查 diff 给结论；executionPolicy 各自 ask/auto 按 design §14.3 与 loop-v1 现状对齐：loop-builder=auto，devflow 三角色=ask）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(workflows): 内置角色注册表与解析顺序（M4 T2）"`

### Task 3: executor composeAgentPrompt 改签名（rolePrompt 接线）

- 目标：prompt 组装从 node.prefix 切换为角色 prompt（调用方解析后传入），prefix 语义退役为 fallback。
- 涉及文件：Modify `src/engine/executor.mjs`、`src/engine/engine.mjs`（dispatch agent 分支传 rolePrompt）、`src/host.mjs`（engine 构造增 `listRoles` 接线——评审自检补）；Test `test/executor.test.mjs`、`test/engine.test.mjs`
- 接口契约：
  - Consumes: resolveRole（engine dispatch 侧引入）
  - Produces: `composeAgentPrompt({ rolePrompt, taskPackage, upstream })`（rolePrompt 必填非空，空则 throw）；engine dispatch agent 分支：`const role = resolveRole(node.roleId, listRoles())` → rolePrompt=role?.prompt ?? node.prefix ?? ""（双兜底），executionPolicy=role?.executionPolicy ?? node.executionPolicy ?? "ask"，model=role?.model → world.createAgent opts；makeEngine 构造参增 `listRoles = () => ({})`（host 传 `() => Object.fromEntries(store.listRoles().map(r => [r.id, r]))`）
- 验证范围：`npm test`（executor/engine 段）

- [ ] Step 1: 改造 executor 测试用例（composeAgentPrompt 三处调用点 prefix→rolePrompt；runAgentNode 断言 sent[0].msg.text 含角色 prompt 内容而非 prefix）→ Run 红（签名不符）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 实现——executor.mjs composeAgentPrompt 改名参数；engine.mjs dispatch agent 分支引入 resolveRole（import 自 ../workflows/roles.mjs），engine 构造参增 `listRoles = () => ({})`（store.listRoles 转 map 由 host 传闭包）——engine.test setup 同步传 `listRoles: () => store.listRolesAsMap()`（store 增 listRolesAsMap 或 engine 内转换，取实现简者）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（executor+engine 全量）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): prompt 组装切换角色解析（M4 T3）"`

### Task 4: devflow-lite 内置模板

- 目标：第二个 builtin 模板，验证非线性执行（多 agent 角色 + rework 边 + 双 gate）。
- 涉及文件：Modify `src/workflows/builtin.mjs`（增 DEVFLOW_LITE 常量 + 导出）；Test `test/workflows.test.mjs`
- 接口契约：
  - Consumes: validateTemplate、LOOP_V1 范式
  - Produces: `DEVFLOW_LITE`（id:"devflow-lite"，节点 requirement(gate,G1,无 rejectTarget——G1 语义) → design(agent, devflow-architect, ask) → implement(agent, devflow-developer, auto, maxAttempts:2) → review(agent, devflow-code-reviewer, ask, maxReworks:2, fail→implement) → test(script "npm test", maxAttempts:2) → g2(gate,G2, rejectTarget:implement) → deliver(script, 同 loop-v1)；edges 顺序连线 + review→implement rework；revision 重算；validateTemplate 通过）
- 验证范围：`npm test`（workflows golden 段）

- [ ] Step 1: golden 测试（节点 id 序列 [requirement,design,implement,review,test,g2,deliver]、边序列、门禁字段、角色引用、validateTemplate ok、revision 格式）→ 红。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——builtin.mjs 增 DEVFLOW_LITE（按契约逐字段写，末尾 revision 重算）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(workflows): devflow-lite 内置模板（M4 T4）"`

### Task 5: 任务包 v2（role 块 + workflow 块）

- 目标：任务包升级 version:2（design §6 定稿形状），v1 字段与 emit 信封零改动；双版本 golden。
- 涉及文件：Modify `src/handlers.mjs`（buildTaskPackage 增 roleBlock/workflowBlock 两参）；Test `test/task-package.test.mjs`（双 golden）
- 接口契约：
  - Consumes: §6 定稿 role={roleId|null,name,executionPolicy}、workflow={runId,nodeId,templateId,templateRevision}
  - Produces: v2 包 = v1 全字段 + 两新块；golden 断言 v1 键集与 emit 信封逐字不变、v2 新增块字段精确
- 验证范围：`npm test`（task-package 段）

- [ ] Step 1: 失败测试（task-package.test.mjs 追加 v2 golden 用例：buildTaskPackage(candidate, repoInfo, now, {role:{roleId,name,executionPolicy}, workflow:{runId,nodeId,templateId,templateRevision}}) → version:2 + 两块字段精确；v1 调用形状不变产出 version:1）
- Run: 红（未实现第四参/两块）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——buildTaskPackage(candidate, repoInfo, now, ctx={})：ctx.role/ctx.workflow 在位时 version:2 并嵌两块（缺省字段补 null 形状）；否则 version:1 零变化。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（含存量 v1 golden 不动）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(api): 任务包 v2 role/workflow 块（双版本 golden，M4 T5）"`

### Task 6: handlers/host — 角色三方法与路由

- 目标：角色 CRUD 走 HTTP；引用守卫在 handler 侧。
- 涉及文件：Modify `src/handlers.mjs`、`src/host.mjs`；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 1 store 四方法
  - Produces: `postRolesUpsert({role})`（auth；id 必填；executionPolicy ∈ ask|auto）→ upsert → `{ok}`；`postRolesDelete({id})`（auth；**引用守卫**：扫 workflowCatalog 全模板节点 roleId + LOOP_V1——被引用 → 409 role-in-use: <id>）→ deleteRole → `{ok}`；`getRoles()`（auth）→ `{ builtin: [meta], custom: [meta] }`（meta=id/name/description/executionPolicy/prompt——UI 编辑需要 prompt 全文，直接返回）；路由表 `/dsh-l/roles` GET+POST、`/dsh-l/roles/delete` POST
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: 失败测试（三方法：upsert 往返、delete 空闲成功/被 LOOP_V1 引用 409、getRoles 双列表、engine 缺省行为不涉）
- Run: 红。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——handlers + host 路由三行（GET/POST /dsh-l/roles、POST /dsh-l/roles/delete）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(api): 角色三方法与引用守卫（M4 T6）"`

### Task 7: 角色 tab UI（LoopForge agents.js 信息架构参照）

- 目标：主栏第四 tab「角色」——搜索 + 行卡（名称/职责/executionPolicy/被引用计数）+ 编辑对话框 + 删除保护。
- 涉及文件：Create `src/client/components/rolesTab.mjs`；Modify `src/client/components/workbench.mjs`（第四 tab + 挂载 + runs 透传沿用 lastRuns 先例扩展为 lastState）；Test：UI 组件无 DOM 测试（零依赖约束），行卡数据组装纯函数放 logic.mjs（`roleRows({builtinRoles, customRoles, candidates, runs, templates})` → 行数组含 uses 计数）+ logic.test 钉例
- 接口契约：
  - Consumes: Task 6 getRoles 三方法、Task 2 needsReview（计数无关）、kanbanColumns 引用扫描结果
  - Produces: `roleRows(...)` 纯函数（行={id,name,description,executionPolicy,prompt,uses,builtin}，uses=全部模板 agent 节点 roleId 计数）；`renderRolesTab(container, { t, state, view, go, rolesApi })`：搜索 input（行卡 name/id/description 过滤）+ 行卡列表 + 新增/编辑对话框（name/description/prompt textarea/executionPolicy select）+ 删除按钮（uses>0 禁用）
- 验证范围：`npm test`（logic roleRows）+ `npm run build`

- [ ] Step 1: 失败测试（logic.test：roleRows 空输入/计数正确/builtin 标记）
- Run: 红。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 实现——logic.mjs roleRows 纯函数；rolesTab.mjs 组件（信息架构：搜索框→行卡列表→点击行开编辑对话框→对话框含 name/description/prompt textarea/executionPolicy select/save 走 api.rolesUpsert→删除按钮 uses>0 禁用+确认后走 api.rolesDelete）；workbench 第四 tab（tabs.roles 键已在 T7）+ lastState 闭包透传 state 给 rolesTab。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -1` — Expected: 全绿 + 双包成功。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(ui): 角色 tab（搜索/行卡/编辑对话框/删除保护——LoopForge 信息架构参照）"`

### Task 8: 引擎接线收口（startRun templateId + devflow-lite 可跑 + emit 文案映射）

- 目标：startRun 支持模板选择；devflow-lite 全链钉例（双 agent 角色 + rework + 双 gate）；G2/按钮文案按 gateId 映射（R4 折叠）。
- 涉及文件：Modify `src/engine/engine.mjs`（startRun 增 templateId 参：模板解析 LOOP_V1/DEVFLOW_LITE/用户目录）、`src/client/components/actions.mjs`（待我确认与行内 G2 按钮文案改映射）、`src/client/components/review.mjs`（同）；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: Task 2 resolveRole、Task 4 DEVFLOW_LITE
  - Produces: startRun(key, {taskPackage, templateId, runId}) —— engine 构造参增 `templates`（id → 模板定义 map，host 由 loadTemplates 结果注入，含用户模板）；startRun 可选 `runId`（缺省 makeRunId(now)——供 postRunStart 先定 runId 再生成含 workflow.runId 的任务包 v2）；未知 templateId 404 unknown-template；emit 的 nodeId 即钉例锚；review.mjs/行内按钮文案 `t("gates." + (r.waitingGate ?? "").toUpperCase())`（G2→gates.G2 键已存在）；postRunStart 接线（handlers）：makeRunId 先行 → buildTaskPackage(…, ctx.workflow.runId=runId) → engine.startRun(key, {taskPackage, templateId, runId})
- 验证范围：`npm test`（engine 全链 devflow-lite 钉例：requirement gateArrive → design ok → implement ok → review fail→implement 重臂 → … → G2 → deliver → succeeded）

- [ ] Step 1: 失败钉例（devflow-lite 全链：startRun(key,{templateId:"devflow-lite"}) → requirement gateArrive waiting → applyGateDecision pass → design/implement/review 轮转 → test ok → g2 pass → deliver ok → succeeded + 候选 shipped；中途 review fail 一次 → implement 重臂 running）→ 红（startRun 不识别 templateId）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 实现——engine.startRun 增 templateId 解析（构造参 templates 注入，缺省 {LOOP_V1.id: LOOP_V1}；host 装配时并入 loadTemplates 结果）+ emit nodeId 文案映射收尾（actions/review 两处）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): startRun 模板参数化 + devflow-lite 全链钉例（M4 T8）"`

### Task 9: i18n 消费键守护测试

- 目标：堵 M3 R3 类「消费键/词典键脱节」——扫描 src/client 源码 t("…") 字面量 ⊆ 两字典键集（扁平化嵌套键）。
- 涉及文件：Test `test/i18n.test.mjs`（追加守护用例）
- 接口契约：
  - Consumes: 两字典 export、src/client 源码路径（相对测试文件 ../src/client）
  - Produces: 守护用例：正则扫 `t("…")` 与 `t('…')` 调用字面量 → 每键在 zh/en 扁平键集中存在（嵌套键拼接 dotted path）→ 缺失即红（列出缺失键）
- 验证范围：`npm test`（i18n 段）

- [ ] Step 1: 失败测试——先在 workbench.mjs 临时加一个 `t("guard.missing")` 调用 → 守护用例红 → 移除。
- Run: 红/绿符合预期。
- [ ] Step 2: 确认判据两向有效（假键红、真键绿）。
- [ ] Step 3: 守护用例固化（读 ../src/client 递归 .mjs 源码字符串，正则提取 t("键") 字面量集合，对两字典扁平键集断言子集）。**守护范围限定：仅静态字面量键**——动态拼接键（如 `t("stages." + key)`、`t("groups." + id)`）无法静态提取，靠词典完备性人工保证（评审自检：勿在实现中尝试解析动态拼接）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "test(i18n): 消费键守护（M4 T9，M2 建议折叠）"`

### Task 10: 最终验证与收口

- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -20`
  Expected: 双包构建成功（新指纹）；全量测试绿（152 存量 + 新增 ≥12；测试文件 18 → 19：新增 roles.test.mjs）；提交序列 Task 1–11。
- [ ] Step 2: 停下交产出评审（章程同 M1–M3）。装机冒烟注记沿 T12 Step 2（inject 八项 fail-fast / 生效探针=指纹+runs 摘要 / approval·policy durable 事件）。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务编号顺序执行；每任务跑完它定义的验证再进下一个；docs 变更独立 commit。
- 测试桩只走注入（fetch/execFile/spawn/io/world 全可注入），单测不真实出网/spawn/clone；**禁用 jsdom**（零依赖约束，DOM 不做单测）。
- 遇阻、重复失败或计划与仓库现实不符：立即停下说明，不猜。
- 全部任务完成后运行最终验证并输出修改摘要，然后停下交评审。
- **回应前 grep 实文验证**（M2 R2-1/M3 R1 事故备忘）：声称修改前先落盘、落盘后 grep 自证，再回话。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -20`
- Expected: 双包构建成功（新指纹 ≠ 48671d958690）；全量测试绿（152 存量 + 新增 ≥12；测试文件 18 → 19：新增 roles.test.mjs）；提交序列 Task 1–11（T10 无独立 commit 时按实际）。
- 生效探针：构建指纹变化；角色 tab 行卡与对话框；`GET /dsh-l/roles` 返回 builtin+custom 双列表（装机可选）。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。M5 候选（设置面板深化/feishu 校验/保存并测试/kanban 口径/DOM 冒烟评估）与本计划验收后另立。
