# dsh-l v2 M5（工程守护 + 面板深化 + 发版前清账）实施计划

## 目标

- 工程守护组（M4 产出评审建议四项）：host 装配冒烟测试（R1-1 根因）、i18n 动态前缀键白名单守护（R2-1 盲区）、roles golden 逐字锁（P12 防漂移）、loadTemplateDefs 警告对称性。
- 面板深化组：putFeishuWebhook 空 token 后缀校验；feishu 保存/测试交互 C 形态（独立保存按钮 + 测试前自动保存）。
- 口径与文档清账：kanban 全白名单口径注记（代码零改动）；design-v2 §14.2/§14.6/§14.7 追认回写；README 致谢核对。
- 发版准备：version bump 0.0.1 → 0.1.0、README 终审、装机冒烟注记核对；`npm publish` 在产出评审通过后执行（Q4-A）。
- 不含：DOM 冒烟（Q2-A 不做）、M6+ 功能、除 feishu 外的设置面板扩展。

## 架构快照

- host 装配冒烟：以最小 cordis ctx stub（credentials/workingDirectory/approval/storage 缺席面走 UNWIRED/缺省）驱动 host.apply 装配链，断言路由表关键键存在 + `/dsh-l/roles` GET 经 makeHttpHandler 返回 200 形状（未绑 auth 时 401 亦算装配成功——断言的是装配不抛 + 路由在位，不是业务值）。
- i18n 动态键守护：静态字面量守护（M4 T9）之上增「动态前缀白名单」——源码中 `t("前缀" +` 形态枚举前缀集合，逐一断言：①前缀在词典中存在为段键；②枚举该段全部键（如 gates.G1/G2/G3）格式合法。
- feishu 校验：PREFIX 前缀检查之上加「PREFIX 后 token 非空」校验（长度 > 0）。
- 发版准备：package.json version 0.0.1 → 0.1.0（全局约束唯一放行点，§15.5）；README（双语）终审；装机注记核对。

## 全局约束（从设计文档逐字继承 + M5 修订）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml；package.json **除 version 字段**（M5 发版任务内可改，§15.5）。
- 测试桩纪律：fetch/execFile/spawn/io/world 全注入；单测不真实出网/spawn/clone；**禁 jsdom**（Q2-A）。
- 术语按 GLOSSARY；emit 信封不变；i18n 新键双字典 + parity + 消费键守护（M4 T9 守护保持绿）。
- M5 执行阶段不发 npm（publish 在产出评审通过后，属验收后动作）；执行中 bump version 但不 publish。
- docs commit 纪律：docs 类变更独立 commit。
- 命令环境：Linux bash，工作目录 `/home/ubuntu/workspace/dsh-l`；管道显示验证输出加 `set -o pipefail`。
- 执行纪律：**先红后绿再 commit**（M4 备忘升格硬纪律——commit 前必须本任务验证全绿）。

## 输入工件

- 设计：docs/design-v2.md §14.8（M5 候选）、§15（M5 补钉全条）；M4 产出评审台账建议五项（.dsh-research/m4-impl-review-scratch/ledger.md ⑤节）。
- 参照实现：src/host.mjs apply/buildRuntime 装配链（R1-1 后形状）；test/i18n.test.mjs 守护范式；src/handlers.mjs putFeishuWebhook PREFIX 检查；src/client/components/actions.mjs openSettings feishu 段。

## 文件结构与职责

- Create: `test/host-smoke.test.mjs` — host 装配冒烟（最小 ctx stub → apply → 断言路由在位/装配不抛）
- Modify: `test/i18n.test.mjs` — 增动态前缀键白名单守护用例
- Modify: `test/roles.test.mjs` — loop-builder prompt 逐字 deepEqual（对齐 builtin.mjs build.prefix 原文）
- Modify: `src/workflows/loader.mjs` — loadTemplateDefs 增 warnings 返回（与 loadTemplates 同构）
- Modify: `src/handlers.mjs` — putFeishuWebhook 空 token 校验
- Modify: `src/client/components/actions.mjs` — feishu 段 C 形态（保存按钮 + 测试按钮自动保存）
- Modify: `src/client/locale/zh-CN.mjs`、`en.mjs` — 新键（feishu.save 等）双字典
- Modify: `package.json` — version 0.1.0（T8 发版准备内）
- Modify: `docs/design-v2.md`、`README.md`、`README.en.md`、GLOSSARY（T1 文档清账）
- 不动：src/client/components/kanban.mjs（Q3-A 口径=零代码改动）、review.mjs、engine/*

任务间接口依赖：T1（docs 清账）→ T2（loader warnings）→ T3（feishu 校验）→ T4（feishu UI C 形态）→ T5（roles golden）→ T6（i18n 动态守护）→ T7（host 冒烟）→ T8（发版准备）。执行顺序按编号。

## 任务清单

### Task 1: 文档清账（§14 追认回写 + 口径注记 + README 致谢）

- 目标：主人已追认的三项 §14 修订回写；kanban 口径注记；README 致谢核对。
- 涉及文件：Modify `docs/design-v2.md`、`README.md`、`README.en.md`、GLOSSARY（仓根）
- 内容：
  1. §14.7 补 runId 语义（评审 R-5 修正文案：**startRun 返回 { runId }**（引擎 makeRunId 生成）；run/start 路由响应含 runId——出处表述为「M4 计划评审自检修正」，**不写「可选 runId 入参」**：engine.mjs:84 实文签名无此参，原稿会把事实错误固化进基线）
  2. kanban 全白名单口径注记（§14 附近或 GLOSSARY stage 条目：迁移不设相邻限制）
  3. README/README.en 致谢段核对：LoopForge UI 交互参考致谢在位（§15.1 D 组；缺则补）

- [ ] Step 1: Run: `grep -n 'runId' docs/design-v2.md | head -3 && grep -n 'LoopForge' README.md | head -3`
  Expected: §14.7 无 runId 字样（待补）；README 致谢现状可读（补或不补据实）。
- [ ] Step 2: 按上述三点编辑实文（§14.7 runId、口径注记、README 致谢按需）。
- [ ] Step 3: Run: `sed -n '/^7\. \*\*startRun/,/^8\./p' docs/design-v2.md | grep -c runId` — Expected: 基线 0 → 编辑后 ≥1（评审 R-4 修正：全局 grep 基线已 =5 永真，须条目段锚定）。
- [ ] Step 4: docs commit：`git add docs README.md README.en.md GLOSSARY.md && git commit -m "docs: M5 T1 §14 追认回写 + kanban 口径注记 + README 致谢核对"`

### Task 2: loadTemplateDefs 警告对称性

- 目标：坏 JSON/校验失败/撞 id 静默 continue → 改为收集 warnings 返回（与 loadTemplates 行为对称）。
- 涉及文件：Modify `src/workflows/loader.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Consumes: loadTemplates 的 warnings 范式（skip+push file: message）
  - Produces: `loadTemplateDefs({dataDir})` → `{ defs, warnings }`（**返回形状变化**：原为数组）；调用侧 host.mjs `templateDefs` 构造同步改 `.defs`；评审 R-9 措辞修正：**三类失败模式拆分入 warnings**（坏 JSON / 校验失败 / 撞 id——:28 一行双条件拆两支各产文案，对称 loadTemplates）；目录缺席与非 .json **保持静默**（同 loadTemplates）
- 验证范围：`npm test`（workflows 段）+ host 冒烟间接覆盖

- [ ] Step 1: 失败测试（评审 R-11 粒度钉死，三例：①坏 JSON 用户模板 → defs 不含且 warnings 含文件名；②校验失败模板 → warnings 文案对称 loadTemplates；③撞 id 用户模板 → warnings；另断言两内置恒在 defs）
- Run: 红（现返回数组无 warnings）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 实现——loader.mjs 改返回 `{ defs, warnings }`（**三类失败模式拆分**：坏 JSON / 校验失败 / 撞 id——:28 一行双条件拆两支各产文案，对称 loadTemplates；目录缺席与非 .json 保持静默）；host.mjs `templateDefs` 构造改 `loadTemplateDefs(...).defs`；测试同步。
- [ ] Step 4: Run: `set -o pipefail; npm test 2>&1 | tail -3` — Expected: 全绿。
- [ ] Step 5: checkpoint commit（先确认全绿再 commit——M4 备忘硬纪律）。

### Task 3: putFeishuWebhook 空 token 校验

- 目标：PREFIX 前缀之上加「PREFIX 后 token 非空」。
- 涉及文件：Modify `src/handlers.mjs`；Test `test/handlers.test.mjs`
- 接口契约：url === PREFIX（空 token）→ fail("invalid webhook")；合法带 token → 现行为。
- 验证范围：`npm test`（handlers feishu 段）

- [ ] Step 1: 失败测试（评审 R-11 粒度钉死，三例）：`putFeishuWebhook({url: PREFIX})` → error（现状通过）；`{url: PREFIX + "   "}` → error（空白 token）；`{url: PREFIX + "token-1"}` → 现行为不变。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 实现（评审 R-10：空白 token 一并挡）：`if (!url.startsWith(PREFIX) || !url.slice(PREFIX.length).trim()) return fail("invalid webhook");`
- [ ] Step 4: Run: 全绿 → checkpoint commit。

### Task 4: feishu 保存/测试 C 形态（独立保存 + 测试前自动保存）

- 目标：设置面板 feishu 段改双按钮——「保存 Webhook」（只保存）+「发送测试消息」（先自动保存输入框当前值再测试）。
- 涉及文件：Modify `src/client/components/actions.mjs`、`src/client/locale/zh-CN.mjs`、`en.mjs`；Test 无新增（UI 层无 DOM 测试；逻辑为 putFeishuWebhook 调用顺序，守护由 i18n 消费键守护兜底新键）
- 接口契约：
  - Consumes: api.putFeishuWebhook / api.feishuTest（现有）
  - Produces: 保存按钮 = putFeishuWebhook(输入值) → chip 提示已保存（feishu.saveOk）；测试按钮 = putFeishuWebhook(输入值) → feishuTest() → chip（testOk/testFail）——测试失败时先显示保存错误再测试结果
- 验证范围：`npm test`（i18n 守护对新增键）+ `npm run build`

- [ ] Step 1: locale 双字典增 `feishu.save` / `feishu.saveOk` 键（消费即加）。
- [ ] Step 2: actions.mjs feishu 段改造（保存按钮 + 测试按钮先保存）。
- [ ] Step 3: Run: `set -o pipefail; npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -1` — Expected: 全绿（含 i18n 守护）+ 双包成功。
- [ ] Step 4: checkpoint commit。

### Task 5: roles golden 逐字锁

- 目标：loop-builder prompt 从 includes 升格为与 builtin.mjs build.prefix **逐字 deepEqual**（P12 原文迁移防漂移）。
- 涉及文件：Modify `test/roles.test.mjs`
- 接口契约：`assert.equal(BUILTIN_ROLES["loop-builder"].prompt, LOOP_V1.nodes.find(n => n.id === "build").prefix)`（单值真相源=builtin prefix；后续任一侧改动另一侧测试即红，防漂移）

- [ ] Step 1: roles.test.mjs 改造（import LOOP_V1，逐字断言；如现状已逐字相等则测试直接绿——判据在基线自证）。
- [ ] Step 2: Run: 全绿 → checkpoint commit（若断言失败说明现存漂移，先修实文）。

### Task 6: i18n 动态前缀键白名单守护

- 目标：堵动态拼接键盲区（R2-1 漏出点）——源码枚举 `t("前缀" +` 形态，白名单断言：①前缀是词典段键；②该段键值域格式合法（gates 段键全大写 G\d 等）。
- 涉及文件：Modify `test/i18n.test.mjs`
- 接口契约：
  - Consumes: M4 T9 静态守护用例（保持绿）
  - Produces: 新用例（评审 R-3 修正：正则跨点 + 白名单 7 前缀）：正则提取 `t\("([a-z.]+)\." * \+` 动态前缀（[a-z.]+ 跨点，捕获 run.status 类多段）→ 白名单表显式 7 前缀：`groups`→6 列 id、`urgency`→P0–P3、`gates`→键集 ⊆ /^G\d$/、`validity`→high/medium/low/none、`recommendedActions`→start/feedback/close/hold、`run.status`→状态枚举、`stages`→7 stage 名；段键存在性按点分路径逐级下钻（run.status = 字典二段）；新动态前缀出现时守护红提示补表

- [ ] Step 1: 失败测试（先在源码临时加一个未入白名单的动态前缀调用 → 红 → 移除）。
- [ ] Step 2: 确认两向有效。
- [ ] Step 3: 守护用例固化（白名单表 + 枚举校验）。
- [ ] Step 4: Run: 全绿 → checkpoint commit。

### Task 7: host 装配冒烟测试

- 目标：堵 host.mjs 装配层盲区（R1-1 根因）——最小 ctx stub 驱动装配链，断言装配不抛 + 路由表关键键在位。
- 涉及文件：Create `test/host-smoke.test.mjs`（评审 R-8 已证 buildRuntime :65 可直驱，host.mjs 零改动）
- 接口契约：
  - Consumes: **host.mjs 导出面（实文锚点）+ 数据目录隔离（评审 R-7）**——paths.dataDir() 依赖 `DSH_L_DATA` env（profile root 判定在 node --test 下不命中会抛错）；测试 setup 设 `process.env.DSH_L_DATA = mkdtempSync(join(tmpdir(), "dsh-l-smoke-"))`、teardown 还原（隔离 + 可重复）——`export const inject = ["webServer","credentials","agents","agentDefaultModel","timer","llm","approval","workingDirectory"]`（:26）；`export function buildRuntime(ctx, config, { makeTriage, listCatalog, hostDefault, onSettingsChange } = {})`（:65，返回含 engine/handlers 的装配对象）；`export async function apply(ctx, config)`（:130，套壳 buildRuntime+路由注册）。冒烟驱动 **buildRuntime**（非 apply——避免 webServer/timer 真注册）；stub ctx 面按 inject 清单 × buildRuntime 实读消费面构造
  - Produces: 冒烟用例（评审 R-2 修正断言③④——engine 对象不暴露 templates/listRoles 闭包参）：stub ctx（credentials.set/resolve 空实现、workingDirectory/approval 空实现、agents/llm/timer/webServer 空实现、agentDefaultModel null）→ `buildRuntime(stubCtx, config)` → 断言：①不抛；②返回路由表含 /dsh-l/roles GET+POST、/dsh-l/run/start、/dsh-l/release/confirm（M4/M2 关键键）；③**模板解析探针**（评审执行细节钉死）：种子候选用 `store.upsertCandidates`（store.mjs:79）；**只断同步面**——`{templateId:"nope"}` 同步 throw unknown-template 404；known templateId → 返回 `{runId}` 且 `store.getRun(runId).templateId/snapshot` 断言，**不等待异步**（startRun 同步解析后异步触发 workspace.ensure，buildRuntime 无 workspace 注入缝）；异步 ensure 在 DSH_L_DATA=tmp 下因 ghBin ENOENT 确定性失败、被引擎 catch 收敛为 run failed——不真实出网/clone，测试退出码不受污染（预期路径）；④**角色解析源探针**：store.upsertRole → store.listRoles 往返生效（引擎侧 role 解析由既有 engine/scheduler 测试覆盖）
- 验证范围：`npm test`（新增文件）+ `npm run build`

- [ ] Step 1: 读实文定 stub 面（inject 八项 × buildRuntime 消费面）→ 直接写断言（**绿基线任务**——buildRuntime 已于 :65 导出，无红可确认；评审 R-8：红证=一次性变异，见执行纪律）。
- [ ] Step 2: 实现冒烟测试（四断言 + DSH_L_DATA 隔离）。
- [ ] Step 4: Run: `set -o pipefail; npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -1` — Expected: 全绿 + 双包成功。
- [ ] Step 5: checkpoint commit。

### Task 8: 发版准备（version bump + README 终审 + 装机注记核对）

- 目标：0.1.0 发版前置就绪（publish 本身在产出评审通过后执行——验收后动作）。
- 涉及文件：Modify `package.json`（version 0.0.1 → 0.1.0）、`README.md`、`README.en.md`（终审如有措辞修正随本任务 docs commit）
- 接口契约：version 0.1.0；build 指纹随 src/ 源码变化（bump 不影响指纹，评审 R-6）；占名核查判据见 Step 1（占位在位且归属本人）。

- [ ] Step 1: Run: `npm view dsh-l version && npm view dsh-l maintainers` — Expected: **version 0.0.1 且 maintainers 含 iasiv5**（评审 R-12 二次修正：本机 `npm owner ls` 返回 no admin found——trusted publishing 无管理员列表零证明力；`npm whoami` E401 无登录态不可求值——认证核对由 publish 动作自身认证兜底，属验收后动作。dsh-l 为主人自有占位包，01_docs/npm-claim/INVENTORY.md:50 佐证；publish 0.1.0 定性为占位包正式接管）。
- [ ] Step 2: package.json version → 0.1.0；npm run build（评审 R-6 修正：build-id 只哈希 src/ 树——**bump 单独不改变指纹**；指纹变化由 T2–T7 源码变更贡献）。
- [ ] Step 3: README 双语终审（安装段/致谢段/版本号如有硬编码核对）；装机注记核对（inject 八项/生效探针/approval·policy durable 事件）。
- [ ] Step 4: Run: `set -o pipefail; npm test 2>&1 | tail -3` — Expected: 全绿（无测试锁 version 值；若有即同步）。
- [ ] Step 5: checkpoint commit（package.json + docs 分开：docs 变更独立 commit 纪律）。

### Task 9: 最终验证与收口

- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -12`
  Expected: 双包成功（新指纹）；全量绿（167 存量 + 新增 ≥5；测试文件 19 → 20：新增 host-smoke.test.mjs）；提交序列 Task 1–8。
- [ ] Step 2: 停下交产出评审。装机冒烟注记沿 M4 T10 内嵌版（inject fail-fast / 指纹+runs 摘要探针 / approval·policy durable 事件）。发版（npm publish 0.1.0）在产出评审通过后按 §15.5 执行。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务编号顺序执行；每任务跑完它定义的验证再进下一个；docs 变更独立 commit。
- **先红后绿再 commit**（M4 备忘升格硬纪律）：commit 前本任务验证必须全绿；禁止带伤提交后 amend。**绿基线任务范式（评审 R-8）**：golden/冒烟/逐字锁类任务的红证=一次性变异（改一侧或断开注入→红→还原），变异不保留。
- 测试桩只走注入，单测不真实出网/spawn/clone；禁 jsdom。
- 遇阻、重复失败或计划与仓库现实不符：立即停下说明，不猜。
- 回应前 grep 实文验证（M2 R2-1/M3 R1/M4 R1-1 备忘）。
- 全部任务完成后运行最终验证并输出修改摘要，然后停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -12`
- Expected: 双包构建成功（新指纹 ≠ b40132fe16ca）；全量测试绿（167 存量 + 新增 ≥5；测试文件 19 → 20）；提交序列 Task 1–8；version 0.1.0；工作树干净。
- 生效探针：构建指纹变化；host 冒烟四断言；feishu 双按钮（装机可选）。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。发版（publish）在 M5 产出评审通过后执行，属验收后动作。
