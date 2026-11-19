# dsh-l v2 M8（可观测面板）实施计划

## 目标

- 设置面板深化（§16-5）：engineConcurrency 数字输入（写）+ agentDefaultModel 只读展示（宿主接口读）。
- 模型观测（吸收分析 #3 等价）：dispatch 记录 nodeStates.model（本轮解析模型）+ runBlock 展示。
- 流程项：T6 多 ready 补钉例、D9 口径进全局约束、§16 终态核对（docs 收尾）。
- 不含：publish/装机冒烟（auth 阻塞维持挂起）、模板名徽标、CLI 实跑模型追踪、新节点类型。

## 架构快照

- 设置面板：settings GET 为无消费方死面——**通道选 (b)（评审问题1）**：默认模型只读行数据复用 api.models() 已回 hostDefault（actions.mjs:54 现成在案，零端点改造）；settingsPatch 白名单增 engineConcurrency 透传（评审问题2：现状丢键 PUT 永不携带）；并发范围 **1–4**（评审问题3：实文双钉）
- 模型观测：dispatch agent 分支角色解析块上提 + nodeStates.model 记录（roleModel 解析真值）→ summarizeRun `models` 映射（在途 agent 非空 model）→ runBlock「model: 」join 展示——通路经评审探针 6/6 实证闭合（engine ns → saveRun → getState runs 投影 → runBlock）
- T6 多 ready 补钉例：resume 多节点（build+verify 同轮回 ready）→ node.resumed 各一条（detail 各带 nodeId）。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json（0.1.0 不动）、src/workflows/builtin.mjs、roles.mjs、review.mjs、scheduler.mjs **例外**：summarizeRun 增 models 字段（T2 数据面）。
- 测试桩纪律；禁 jsdom；先红后绿再 commit；绿基线红证=一次性变异；docs 独立 commit；回应前 grep 实文。
- **新增测试覆盖口径（D9 模板改写，M7 产出评审背书）**：计划验收的「新增 ≥N」= **块级或断言级择一声明**——本计划按断言级声明（块级预估 3–4、断言级预估 ≥12）。
- 命令环境：Linux bash，`/home/ubuntu/workspace/dsh-l`；`set -o pipefail`。

## 输入工件

- 设计：docs/design-v2.md §19 全条。
- 参照实现：src/client/components/actions.mjs:54 api.models() 消费点（hostDefault 现成在案——通道 (b)）+ settingsPatch（logic.mjs:50-56 白名单扩透传对象）+ putSettings 校验（handlers.mjs:412-415，1–4）

## 文件结构与职责

- Modify: `src/client/components/actions.mjs` — openSettings 增 engineConcurrency input + agentDefaultModel 只读行；runBlock 增 model 展示（数据源经 T2）
- Modify: `src/client/logic.mjs` — settingsPatch 白名单增 engineConcurrency 透传（评审问题2）
- Modify: `test/logic.test.mjs` — settingsPatch 三处全形 deepEqual 同步 + engineConcurrency 透传用例（评审问题2）
- Modify: `src/engine/engine.mjs` — dispatch agent 分支 ns 增 model 字段
- Modify: `src/engine/scheduler.mjs` — summarizeRun 增 `models`（在途 agent 节点非空 model 映射）
- Modify: `test/scheduler.test.mjs` — models 断言（deepEqual 同步）
- Modify: `test/engine.test.mjs` — model 记录钉例 + T6 多 ready 钉例
- Modify: `docs/design-v2.md` — §16 终态核对尾注（T3 docs 步）
- 不动：builtin.mjs、roles.mjs、review.mjs、locale、package.json

任务依赖：T1（设置面板）→ T2（model 记录+展示）→ T3（钉例+docs）→ T4（终验）。按编号执行。

## 任务清单

### Task 1: 设置面板深化（§16-5）

- 涉及文件：Modify `src/client/components/actions.mjs`、`src/client/logic.mjs`（settingsPatch 白名单增透传——评审问题2）；Test `test/logic.test.mjs`（三处 deepEqual 同步 + engineConcurrency 用例）
  - Consumes: api.models() 响应 {providers, hostDefault}；settingsPatch(current, patch)（logic.mjs:50-56 白名单现状=intervalMinutes+triageModel——评审问题2：engineConcurrency 输入被白名单丢弃，PUT 永不携带）
- 验证范围：`npm test`（logic 段：settingsPatch 三处 deepEqual 同步 + 新键用例）+ build（UI 面覆盖度声明沿先例）
- **i18n 权衡声明（评审问题4）**：新增控件文案（「并发上限」「默认模型」「宿主未配置」）为**硬编码 zh-CN 字面量，en 侧暂缺**——D7 零新键的直接后果，后续里程碑补键；locale-parity 不受影响（零新键即零键集差）
- [ ] Step 1: 失败测试：logic.test settingsPatch 增 engineConcurrency 透传用例 + 三处全形 deepEqual 同步（评审问题2：白名单现状丢键）。
- [ ] Step 2: 实现 settingsPatch 透传 + openSettings 双控件（并发 input min1 max4 + 默认模型只读行复用 hostDefault）。
- [ ] Step 3: Run: 全绿 + build → checkpoint commit。
### Task 2: 模型观测（§19.3）

- 目标：dispatch 记录 nodeStates.model + summarizeRun 增 models 映射 + runBlock 展示。
- 涉及文件：Modify `src/engine/engine.mjs`、`src/engine/scheduler.mjs`、`src/client/components/actions.mjs`；Test `test/engine.test.mjs`、`test/scheduler.test.mjs`
- 接口契约：
  - Produces: ①dispatch agent 分支**角色解析块上提至 ns 写入前**（评审建议4：现文 ns 写入 :104-107 先于 roleModel 解析 :116——原位硬塞取不到值）+ ns 增 `model: roleModel ?? null`（脚本节点不落）；②summarizeRun 增 `models`: 在途（running/waiting）agent 节点中 model 非空者的 {nodeId: model} 映射（空对象时仍输出 {}）；③runBlock 消费：行内 run 区块有 models 时展示「model: <值>」（字面量不译）；既有 deepEqual（scheduler.test 两处）与 M7 钉例按需同步
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
- [ ] Step 2: lib 重建产物入库——**时点钉死（评审建议1）：每任务 build 先行、lib 随该任务 commit**（检查点自洽，指纹判据每步可观测）。
- [ ] Step 3: 停下交产出评审（章程同 M1–M7）。publish 维持挂起（§19.1）。

## 执行纪律

- 开始实现前批判性复查整份计划；缺项/矛盾先修计划。
- 按编号执行；每任务红绿（或绿基线+变异红证）。
- 测试桩全注入；禁 jsdom；回应前 grep 实文验证；遇阻即停。
- 全部完成后最终验证并输出修改摘要，停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -8`
- Expected: 新指纹 ≠ a03576a126c2；187 存量 + 断言级 ≥12 全绿；测试文件 20；version 0.1.0；工作树干净（lib 随最后任务原子入库后）。；**断言级判据（评审建议2）：`git diff <基线>..HEAD -- test/ src/ | grep -c '^+.*assert\.'` 汇总 ≥12，最终摘要列新增用例×assert 数清单**
- 生效探针：构建指纹变化；nodeStates.model 落库钉例；settingsPatch 透传钉例（通道 (b)——默认模型行数据经 api.models()）

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。publish 维持挂起（§19.1）。
