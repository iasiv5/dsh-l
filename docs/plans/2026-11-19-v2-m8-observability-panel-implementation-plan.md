# dsh-l v2 M8（可观测面板）实施计划

## 目标

- 设置面板深化（§16-5）：engineConcurrency 数字输入（写）+ agentDefaultModel 只读展示（宿主接口读）。
- 模型观测（吸收分析 #3 等价）：dispatch 记录 nodeStates.model（本轮解析模型）+ runBlock 展示。
- 流程项：T6 多 ready 补钉例、D9 口径进全局约束、§16 终态核对（docs 收尾）。
- 不含：publish/装机冒烟（auth 阻塞维持挂起）、模板名徽标、CLI 实跑模型追踪、新节点类型。

## 架构快照

- 设置面板：settings GET 已回 {intervalMinutes, triageModel, engineConcurrency, workspaceRetentionDays}；agentDefaultModel 经 hostDefault()（host.mjs:140-143 currentSelection() → {provider, model} | null）已进 handlers（listCatalog 同级注入）——GET settings 响应增 `agentDefaultModel` 只读字段（handlers 有 hostDefault 闭包可直取）；UI 增数字 input（engineConcurrency，putSettings 校验 1–4（评审问题3 修正：实文双钉） 已有 :412-415）与只读行（agentDefaultModel）。
- 模型观测：engine dispatch agent 分支（:112-118 roleModel 在位）→ runAgentNode ns 写入时增 `model: roleModel ?? null`（经 saveRun 持久）；client runBlock 增 model 行（run.nodeStates? 不——runs 摘要无 nodeStates；**实现时读实文**：summarizeRun 不含 nodeStates，model 展示数据源需经 nodeStates 摘要或从 run history——最小形改为「summarizeRun 增 models: {nodeId: model} 仅在途 agent 节点」或 runBlock 读取 needsReview 通道外的 run 全量?）——**形状分叉授权执行者按实文裁决并在 commit message 声明**（最小数据面：summarizeRun 增 `models` 对象仅含非空 model 的在途 agent 节点）。
- T6 多 ready 补钉例：resume 多节点（build+verify 同轮回 ready）→ node.resumed 各一条（detail 各带 nodeId）。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json（0.1.0 不动）、src/workflows/builtin.mjs、roles.mjs、review.mjs、scheduler.mjs **例外**：summarizeRun 增 models 字段（T2 数据面）。
- 测试桩纪律；禁 jsdom；先红后绿再 commit；绿基线红证=一次性变异；docs 独立 commit；回应前 grep 实文。
- **新增测试覆盖口径（D9 模板改写，M7 产出评审背书）**：计划验收的「新增 ≥N」= **块级或断言级择一声明**——本计划按断言级声明（块级预估 3–4、断言级预估 ≥12）。
- 命令环境：Linux bash，`/home/ubuntu/workspace/dsh-l`；`set -o pipefail`。

## 输入工件

- 设计：docs/design-v2.md §19 全条。
- 参照实现：src/handlers.mjs getSettings（GET 响应形状）+ putSettings engineConcurrency 校验（:412-415）+ hostDefault 闭包（host.mjs:140）；src/client/components/actions.mjs openSettings（feishu/modelSel 范式）+ runBlock 渲染；src/engine/engine.mjs dispatch agent 分支（roleModel :116）。

## 文件结构与职责

- Modify: `src/handlers.mjs` — getSettings 响应增 agentDefaultModel 只读字段（hostDefault 闭包取值）
- Modify: `src/client/components/actions.mjs` — openSettings 增 engineConcurrency input + agentDefaultModel 只读行；runBlock 增 model 展示（数据源经 T2）
- Modify: `test/handlers.test.mjs` — GET settings 增字段断言 + UI 数据面（若纯 UI 无单测则覆盖度声明）
- Modify: `src/engine/engine.mjs` — dispatch agent 分支 ns 增 model 字段
- Modify: `src/engine/scheduler.mjs` — summarizeRun 增 `models`（在途 agent 节点非空 model 映射）
- Modify: `test/scheduler.test.mjs` — models 断言（deepEqual 同步）
- Modify: `test/engine.test.mjs` — model 记录钉例 + T6 多 ready 钉例
- Modify: `docs/design-v2.md` — §16 终态核对尾注（T3 docs 步）
- 不动：builtin.mjs、roles.mjs、review.mjs、locale、package.json

任务依赖：T1（设置面板）→ T2（model 记录+展示）→ T3（钉例+docs）→ T4（终验）。按编号执行。

## 任务清单

### Task 1: 设置面板深化（§16-5）

- 目标：engineConcurrency 数字输入（写）+ agentDefaultModel 只读展示（读宿主接口）。
- 涉及文件：Modify `src/client/components/actions.mjs`、`src/client/logic.mjs`（settingsPatch 白名单增透传——评审问题2）；Test `test/logic.test.mjs`（三处 deepEqual 同步 + engineConcurrency 用例）
- 接口契约（评审问题1 修正：GET settings 为无消费方死面——**通道选 (b) 复用 api.models() 已回的 hostDefault**（actions.mjs:54 现成在案），零端点改造；§19.2 双通道授权按「实文最小面」落 (b)）：
  - Consumes: api.models() 响应 {providers, hostDefault}；settingsPatch(current, patch)（logic.mjs:50-56 白名单现状=intervalMinutes+triageModel——评审问题2：engineConcurrency 输入被白名单丢弃，PUT 永不携带）
  - Produces: ①settingsPatch 白名单增 `engineConcurrency` 透传；②openSettings 增「并发上限」number input（**min 1 max 4——评审问题3 修正：实文双钉 1–4**（handlers :414 校验 + handlers.test :123/:128），提交走新透传键）+「默认模型」只读行（值 = api.models() 已回的 hostDefault?.model ?? "（宿主未配置）"——与 modelSel 同一调用取数）
- 验证范围：`npm test`（logic 段：settingsPatch 三处 deepEqual 同步 + 新键用例）+ build（UI 面覆盖度声明沿先例）

- [ ] Step 1: 失败测试：logic.test settingsPatch 增 engineConcurrency 透传用例 + 三处全形 deepEqual 同步（评审问题2：白名单现状丢键）。
- [ ] Step 2: 实现 settingsPatch 透传 + openSettings 双控件（并发 input min1 max4 + 默认模型只读行复用 hostDefault）。
- [ ] Step 3: Run: 全绿 + build → checkpoint commit。

- 目标：engineConcurrency 数字输入（写）+ agentDefaultModel 只读展示（读宿主接口）。
- 涉及文件：Modify `src/handlers.mjs`、`src/client/components/actions.mjs`；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: getSettings/putSettings（engineConcurrency 校验在位 :412-415）；hostDefault 闭包（host.mjs:140 → buildRuntime 注入 handlers）
  - Produces: GET settings 响应增 `"agentDefaultModel": {provider, model} | null`（hostDefault() 直取——只读不写）；UI：openSettings 增「并发上限」number input（min 1 max 8，putSettings 已校验）+「默认模型」只读行（值=agentDefaultModel?.model ?? "（宿主未配置）"）
- 验证范围：`npm test`（handlers 段：GET settings 断言增字段）+ build（UI 面覆盖度声明沿先例）

- [ ] Step 1: 失败测试：getSettings 断言含 agentDefaultModel 形状（handlers.test 现 settings 用例处）。
- [ ] Step 2: 实现 handlers + UI（feishu/modelSel 范式复用）。
- [ ] Step 3: Run: 全绿 + build → checkpoint commit。

### Task 2: 模型观测（§19.3）

- 目标：dispatch 记录 nodeStates.model + summarizeRun 增 models 映射 + runBlock 展示。
- 涉及文件：Modify `src/engine/engine.mjs`、`src/engine/scheduler.mjs`、`src/client/components/actions.mjs`；Test `test/engine.test.mjs`、`test/scheduler.test.mjs`
- 接口契约：
  - Produces: ①dispatch agent 分支 ns 增 `model: roleModel ?? null`（脚本节点不落）；②summarizeRun 增 `models`: 在途（running/waiting）agent 节点中 model 非空者的 {nodeId: model} 映射（空对象时仍输出 {}）；③runBlock 消费：行内 run 区块有 models 时展示「model: <值>」（字面量不译）；既有 deepEqual（scheduler.test 两处）与 M7 钉例按需同步
- 验证范围：`npm test`（engine/scheduler 段）

- [ ] Step 1: 失败测试：engine 钉例（design 派发后 nodeStates.design.model 含覆盖角色标记或 null——按 store.upsertRole 有无 model）+ scheduler models 映射断言。
- [ ] Step 2: 实现（engine 一行 + summarizeRun 数行 + runBlock 展示）。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 3: 流程项（T6 多 ready 钉例 + D9 口径 + §16 终态核对）

- 目标：resume 多节点各落一条的场景钉例；D9 口径已入全局约束（本计划）；§16 终态核对尾注。
- 涉及文件：Modify `test/engine.test.mjs`、`docs/design-v2.md`
- 接口契约：
  - Produces: 钉例：recover 场景 ≥2 节点同轮回 ready → node.resumed 两条且 detail 各带 nodeId（M7 单 ready 钉例的扩展）；§16 尾注：「M7 已清 1/3/4/7/8/9/12/13；5/6/10/11 维持；2 实质清账（T1 假 gh）；13c 装机冒烟随 publish」
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 失败测试：多 ready recover 钉例（模拟两 running 节点 restart → 两条 node.resumed）。
- [ ] Step 2: 若实现已支持（M7 T6 循环内落痕天然多节点）则测试直接绿——绿基线红证=一次性变异（移出循环只落首条→红→还原）。
- [ ] Step 3: Run: 全绿 → docs 尾注 + checkpoint commit（docs 独立）。

### Task 4: 最终验证与收口

- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -8`
  Expected: 双包成功（新指纹 ≠ a03576a126c2）；全量绿（187 存量 + **断言级 ≥12 / 块级 3–4**（D9 择一口径=断言级）；测试文件 20 不变）；version 0.1.0 不变。
- [ ] Step 2: lib 重建产物入库（随最后任务原子 commit——M7 P1 采纳的每任务原子范式）。
- [ ] Step 3: 停下交产出评审（章程同 M1–M7）。publish 维持挂起（§19.1）。

## 执行纪律

- 开始实现前批判性复查整份计划；缺项/矛盾先修计划。
- 按编号执行；每任务红绿（或绿基线+变异红证）。
- 测试桩全注入；禁 jsdom；回应前 grep 实文验证；遇阻即停。
- 全部完成后最终验证并输出修改摘要，停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -8`
- Expected: 新指纹 ≠ a03576a126c2；187 存量 + 断言级 ≥12 全绿；测试文件 20；version 0.1.0；工作树干净（lib 随最后任务原子入库后）。
- 生效探针：构建指纹变化；GET settings 增 agentDefaultModel 字段；nodeStates.model 落库钉例。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。publish 维持挂起（§19.1）。
