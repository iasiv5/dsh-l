# dsh-l P2 UI/UX 升级 实施计划（2026-11-22）

共识来源：调研报告 §6 P2 表（P2-1..P2-8）+ P1 rev-impl-p1 留档台账（S1/S2/S8/S9/S10/S11）+ 主人指令（2026-11-22：落所有 P2，按既有流程：writing-plans → 对抗评审 → main 实施 → 实施对抗审核至一致）。设计纪律 `DESIGN.md`；继承 P0 计划 §2/§3 全部约束（i18n 三重守护、deps seam、Host-Theme/One Voice、coarse 44px、lib 随任务入库、显式退出码提交门、FakeElement 桩含 P1 加法升级）。

## 1. 目标（落地八件 + 小债包）与降级声明

| # | 提案 | 关键内容 | host 触碰 |
|---|---|---|---|
| P2-1 | ⌘K 命令面板 | Ctrl/Cmd+K 唤出动作目录（五视图切换/刷新候选/键盘帮助），输入过滤 + ↑↓/Enter/Esc | 无 |
| P2-2 | staged 预览 lite | G2 等待卡「放行后继续」从一行名字串升级为逐节点列表（节点名+类型标签 nodeType.*） | 无 |
| P2-5 | 卡住检测 | 会话行：running ∧ 距上次更新 > 15min → 「疑似卡住」警示 chip（client 合成，无第四态色） | 无 |
| P2-7 | 角色创建向导 | 「新增角色」三步向导：起点（5 内置预设/空白）→ 身份（roleId/名称/职责）→ 确认（prompt/policy/回顾） | 无 |
| P2-6 前半 | Peek 预览 | 游标行按 **p** 键弹出候选全文预览浮层（只读；Esc/点背景关；j/k 联动刷新） | 无 |
| P2-6 后半 | runDetail 工件槽 | **更正 P1 认知**：artifacts 已持久化（engine.mjs:130 nodeStates 落盘），仅缺投影——summarizeRun nodeStatuses 增 artifacts（截断）+ runDetail 第三槽「工件」 | summarizeRun 投影 |
| P2-3 | 分诊置信度链路 | prompt（zh/en）增 confidence 自评（0–100 整数）；parser 容错（可选字段，非法视同缺省）；handlers 透传落 triage.confidence；清单行「置信 {n}」chip；任务包 triage 投影显式化 5 字段 + golden 更新 | 分诊链路（见 §3 边界） |
| P1 遗留 | 小债清偿包 | navKey 候选键收紧（S1）、批量表单闭包态（S2）、crimson×3（S8）、sortGateRunsByWait NaN 守卫（S11）、checkboxEls 死基建清偿（S11）、空行 k 键行为（S11） | 无 |

### 1.1 显式降级（主人「落所有 P2」口径下的三项不做 + 理由）

- **diff 就地查看不做**：diff 需工作区 git 数据面（base 分支 diff 计算 + 新路由或工件通道），属 v3 会话协调者缝（ADR-0002 已留 adapter 位）；本计划工件槽把脚本 stdout（含 deliver.mr 链接）呈现到位，diff 本体留 P2 后续/v3。
- **成本/用量面板不做**：宿主未暴露任何用量 API（勘察实证过 rc.3 类型无此服务）；且 ADR-0002 明文拒绝成本度量（"成本度量（v3+）"），重开需宿主数据面先行——工程上无从落地，非产品不愿。
- **客观信号「响应延迟」不做**：author 最后响应时刻需摄取 issue timeline（新 GitHub API 面 + 每刷新预算重算），预算纪律（60 请求/刷新）不容纳；ageDays/comments/reactions 已在行内脚注（P0-6）与分诊 prompt 输入（triage.mjs digest）双覆盖，增量价值薄。P2-4 余下部分（信号与 LLM 结论并排呈现）已由 P0-6 兑现。

## 2. 架构快照（P1 后现状 + 数据边界更正）

- 五视图（清单/看板/待我确认/会话/角色）+ P0/P1 全部能力；键盘体系（j/k 游标/Enter/x/数字/?/Esc）挂 **shadow 根**（P1 B1 修复后），typing 守卫含 composedPath。
- **数据边界更正（P1 计划勘误）**：artifacts **已持久化**——`engine.mjs:130` onNodeDone 成功路径落 `nodeStates[nodeId].artifacts = result.artifacts ?? []`（executor 返回 {ok,error,artifacts}）；缺失的只是 `summarizeRun` 投影（现投影 nodeStatuses 只有 id/name/type/status/error）。
- 分诊链路：`buildPrompt`（RULES zh/en 要求严格五字段 JSON 围栏）→ 模型 → `parseTriageOutput`（逐元素严格校验五字段，任一不合法整批 null → fail-closed）→ handlers.mjs:386 `store.setTriage(key, {validity,urgency,action,reason:截断,lang}, "llm")`（setTriage spread 透传任意字段）。人工推翻走 :394（无 confidence）。任务包 `buildTaskPackage` 的 triage 块目前为候选 triage 的直拷（golden deepEqual 锚定形状）。
- 内置角色常量 `src/workflows/roles.mjs BUILTIN_ROLES`（5 角色，纯数据无依赖，可被 client esbuild 打包）；devflow-lite 节点 id：requirement/design/implement/review/test/g2/deliver；loop-v1：g1/build/verify/g2/mr-open/mr-push-check/mr-open-check/deliver。
- 会话 summaries 字段：`{id, displayTitle, running, updatedAt}`（updatedAt 毫秒）。

## 3. 全局约束（继承 + 增补）

1. 继承 P0 §3 全部 + P1 §3（deps/参数注入、storage/nowMs 不直引、既有断言冲突处置、lib 随任务入库、显式退出码提交门）。
2. **host 触碰边界（仅限两处，均带 golden）**：①`summarizeRun` nodeStatuses 增 `artifacts`（每节点截 2 条、每条截 500 字符——与 engine 上游摘要同口径）；②分诊链路：RULES 文案、`parseTriageOutput`（confidence 可选容错）、handlers.mjs:386 透传、`buildTaskPackage` triage 投影（**已是显式四字段投影**，handlers.mjs:38-40——仅增第五字段 `confidence: candidate.triage.confidence ?? null`）。**store schema doc.version 不 bump（triage.confidence 为候选对象 additive 字段，旧档 `??=` 天然容错）；`/dsh-l/*` 路由形状零改动**。
3. **键位重排声明（P1 语义演进）**：Enter=展开/收起（原样）、Space=展开/收起（原样保留，不破坏既有肌肉记忆）、**p=Peek 预览**（原调研设想 Space/长按——Space 已被占用，改 p 并同步帮助浮层与 kbd.* 文案）。数字 1-5、j/k、x、?、Esc 不变。
4. i18n：新增键全静态消费（stateDot/kbd 同款纪律）；`nodeType.*`/`wizard.*`/`palette.*`/`peek.*` 为新段。
5. 任务包契约变更声明：triage 块从「直拷」改为「显式五字段投影」（+confidence），emit 信封不变；golden 双版本更新；autoloop FIELDS 白名单只约束 emit 块（triage 块非其管辖，实证见 P0 计划 §6 裁决记录）。

## 4. 基线处理（Task 0：只核验，无提交）

`git status --short` 空；`npm test` 347 全绿；HEAD=`a40476b`（或其后仅含本计划实施 commit）。

## 5. 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/client/logic.mjs` | 修改 | `sortGateRunsByWait` NaN 守卫；`stalledOf(updatedAt, nowMs)`（P2-5 判定纯函数） |
| `src/client/components/workbench.mjs` | 修改 | ⌘K 截获与面板接线；Peek（p 键 + 游标联动 + 浮层）；navKey 候选键收紧（??=）；批量表单闭包态；checkboxEls 死基建删除 |
| `src/client/components/keynav.mjs` | 修改 | k 键空行守卫；帮助浮层键位行增 p（kbd.peek） |
| `src/client/components/commandPalette.mjs` | **新建** | `openPalette(anchorEl, { t, actions, onClose })`：input 过滤 + 列表 + 键盘导航，自管 keydown（stopPropagation） |
| `src/client/components/peek.mjs` | **新建** | `renderPeek(anchorEl, { t, candidate, onClose })` 只读浮层 |
| `src/client/components/candidateRow.mjs` | 修改 | row 元素 `dataset.key = candidate.key`；置信 chip；crimson 无（本文件无） |
| `src/client/components/pipelineStrip.mjs` | 无 | — |
| `src/client/components/review.mjs` | 修改 | G2 卡「放行后继续」逐节点列表（nodeType.*） |
| `src/client/components/sessionsView.mjs` | 修改 | 卡住警示 chip（stalledOf） |
| `src/client/components/runDetail.mjs` | 修改 | 第三槽「工件」（nodeStatuses.artifacts） |
| `src/client/components/rolesTab.mjs` | 修改 | 三步向导 + crimson 清偿 |
| `src/client/components/actions.mjs` | 修改 | crimson×2 清偿 |
| `src/engine/scheduler.mjs` | 修改 | summarizeRun nodeStatuses 增 artifacts（截断） |
| `src/triage.mjs` | 修改 | RULES zh/en 增 confidence；parseTriageOutput 容错 |
| `src/handlers.mjs` | 修改 | :386 透传 confidence |
| 任务包构建器 | 修改 | `handlers.mjs:38-40` triage 投影增第五字段 `confidence ?? null`（已定位，非 grep 待定） |
| `src/client/locale/zh-CN.mjs`、`en.mjs` | 修改 | §7 键表 |
| `test/*` | 修改 | 各任务红绿用例 |
| `DESIGN.md` | 无 | 本轮无新视觉 token（沿用 st-*/--dshl-*） |

## 6. 契约（Produces → Consumes）

- **命令面板**：`openPalette(anchorEl, { t, actions, onClose })`；`actions = [{ id, label, run }]`（workbench 注册：五视图 + 刷新候选 + 键盘帮助，标签全 `t()` 静态）。面板自管 keydown（input 上 stopPropagation，↑↓ 移动、Enter 执行、Esc 关闭）；过滤 = 大小写不敏感子串；匹配空显示 `palette.empty`。触发：**⌘K/Ctrl+K 截获位于 `keyHandlerGuarded` 函数体内、keyHandler 调用之前**（单监听零注册顺序依赖，rev-plan S4）→ preventDefault + toggle（openPalette 幂等：已开则关）。**⌘K 在输入焦点内亦可开**（截获先于 keynav typing 守卫）。paint 重建重置面板开启态为关（S5）；palette 与 peek 互斥（开其一先关另一个，S5）。
- **Peek**：`renderPeek(anchorEl, { t, candidate, onClose })`；显示：类型徽标、`repo#number 标题`全文、元数据（age/comments/reactions/draft——复用 metaFootnote 数据面但不限一行）、分诊三件 + reason + by/at、history 最近 8 条倒序（c.history 已有）、闸门 G1–G3 状态行、任务包有无。Esc/点背景关闭。workbench：keyhandler 增 `peekKey` 分派（`key === "p"` 且游标有效 → 按 rowEls[i].dataset.key 找候选渲染/刷新 peek；j/k 移动时若 peek 开着则重渲染）；`peekKey` 消费时 preventDefault。
- **卡住判定**：`stalledOf(updatedAt, nowMs)` = `running 语义由调用方保证`；数值非法 → false；`nowMs - updatedAt > 15 * 60_000` → true。常量 `STALL_MS = 15 * 60_000` 导出自 logic。会话行：`summary.running && stalledOf(s.updatedAt, nowMs)` → 警示 chip `sessions.stalled`（title 说明阈值）。
- **工件投影**：`nodeStatuses[n].artifacts = (run.nodeStates[n.id]?.artifacts ?? []).slice(0, 2).map((a) => String(a ?? "").slice(0, 500))`；runDetail 工件槽：任一节点 artifacts 非空才可切（全部为空时 tab 置灰 disabled），视图逐节点列 artifacts（pre-wrap mono 11.5px）；空数组节点不渲染行。
- **分诊置信度**：prompt 追加句（zh）「confidence 用 0–100 的整数自评置信度」/(en 对应)；输出对象形状说明同步含 confidence。**解析两层显式化（rev-plan B1 终稿）**：①`ok` 谓词**维持四字段+key 不变**——confidence 不入合法性门（advisory 元数据不触发整批 fail-closed）；②元素级净化独立于合法性判断：`confidence = (Number.isInteger(x.confidence) && x.confidence >= 0 && x.confidence <= 100) ? x.confidence : undefined`——**null/非法/缺省统一落 undefined**；③handlers 透传 `confidence: Number.isInteger(row.confidence) ? row.confidence : null`；任务包 triage 投影 `{ validity, urgency, action, reason, confidence: c.triage.confidence ?? null }`；清单行置信 chip（triage.confidence 为 0–100 整数时显示 `t("triage.confidence").replace("{n}", …)`）。
- **navKey 收紧**：candidateRow 行内 title/checkbox 预置 `dataset.navKey`（`"row-title:" + key` / `"row-check:" + key`）；workbench assignNavKeys 改 `c.dataset.navKey ??= "n" + navIdx++`（已有键保留）——过滤/增删行后同候选焦点恢复命中。
- **批量表单闭包态**：`batchForm = { open, validity, urgency, action, reason }` 闭包对象；selects 初始值/onChange/reason oninput 均读写 batchForm；提交成功（全成）后 `batchForm.reason = ""`。
- **keynav k 键**：`getRowCount() === 0` 时 j/k 均直接 return（不移动、不 preventDefault）。

## 7. i18n 新键表（zh / en 成对，全部静态消费）

```
palette.title        命令面板 / Command palette
palette.placeholder  输入以筛选动作… / Type to filter actions…
palette.empty        没有匹配的动作 / No matching actions
peek.title           候选预览 / Candidate preview
peek.close           关闭 / Close
peek.history         最近动态 / Recent activity
peek.gates           闸门 / Gates
peek.package         任务包 / Task package
peek.none            未生成 / Not created
run.tabArtifacts     工件 / Artifacts
run.emptyArtifacts   暂无工件 / No artifacts
nodeType.agent       agent 节点 / agent node
nodeType.script      script 节点 / script node
nodeType.gate        人工闸门 / human gate
sessions.stalled     疑似卡住 / Possibly stuck
sessions.stalledTitle 运行超 15 分钟无更新 / No update for over 15 minutes
triage.confidence    置信 {n} / Confidence {n}
wizard.stepStart     选择起点 / Choose a starting point
wizard.stepIdentity  角色身份 / Role identity
wizard.stepReview    确认与保存 / Review and save
wizard.blank         空白起步 / Start blank
wizard.copySuffix    （副本） / (copy)
wizard.next          下一步 / Next
wizard.back          上一步 / Back
roles.wizardTitle    新增角色向导 / New role wizard
kbd.peek             p：预览当前行 / p: preview current row
```

## 8. 任务清单（顺序 TDD；每任务验证 = `npm test`/`npm run build` 重定向后显式 echo 退出码，双 0 才 commit）

### Task 0：基线核验（无提交）

`git status --short` 空、`npm test` 347 全绿、HEAD=`a40476b`（或其后仅含本计划实施 commit）。异常即停。

### Task 1：小债清偿包（P1 遗留六项）

1. 红：logic.test——`sortGateRunsByWait` 畸形 waitingSince（"not-a-date"）不产生 NaN 崩溃且沉底；client-render——①`k` 键在无行（board tab）时不移动不 preventDefault（keynav 纯逻辑用例扩展）；②批量表单：填 reason → 点别处触发 paint（如勾选第三行）→ reason 值保留（闭包态）；③checkbox 元素不再带 onCheckboxEl 登记断言（源码 grep 无 checkboxEls）。
2. 红：client-render——actions.mjs/rolesTab.mjs 源文本不含 `"crimson"` 字面量（三处清偿 + 防回潮）。
3. 绿：§6 各项实现（navKey ??=、batchForm 闭包、crimson color-mix×3、NaN 守卫、checkboxEls 删除、keynav 空行守卫）；candidateRow title/checkbox 预置 dataset.navKey。
4. 验证 + Commit：`fix(uiux): P1 遗留小债清偿包（navKey 候选键/批量表单闭包态/crimson×3/NaN 守卫/死基建/空行 k 键）`

### Task 2：⌘K 命令面板（P2-1）

1. 红：client-render——①`openPalette` 形态：anchor 挂载 → input 在场（placeholder=t("palette.placeholder")）→ 输入 "看" 过滤后仅剩匹配动作 → ↑↓ 移动高亮（aria-selected/类）→ Enter 执行回调 → Esc 关闭 → 点背景关闭；②空匹配显示 `t("palette.empty")`；③workbench 接线：shadow 派发 `{key:"k", ctrlKey:true, target:{tagName:"INPUT"}}`（typing 内）→ 面板仍打开（⌘K 优先于 typing 守卫）；再派发同键 → 关闭；④面板打开时 input 内 keydown j 不驱动背后游标（stopPropagation 生效——以游标不动断言）。
2. 绿：新建 commandPalette.mjs；workbench shadow keydown 最前置 ⌘K/Ctrl+K 截获（在 keyHandlerGuarded 之前，preventDefault + toggle）；动作目录注册（五视图标签 + t("refresh") + t("kbd.title") 帮助）。
3. 验证 + Commit：`feat(palette): ⌘K 命令面板——动作目录化（P2-1；目录即注册表，后续动作按 {id,label,run} 追加）`

### Task 3：Peek 预览（P2-6 前半 + 键位重排声明）

1. 红：client-render——①keynav 纯逻辑：`p` 键触发 peek 回调（游标有效时）、preventDefault；帮助浮层键位行含 `t("kbd.peek")`（openHelp 用例扩展）；②mount 级：游标定位行按 p → 浮层含标题全文/元数据/分诊理由/history 事件/闸门行/任务包「未生成」；Esc 关闭；j 移动游标后 peek 内容跟随（第二候选数据）；③row 元素 dataset.key 在场。
2. 绿：candidateRow `row.dataset.key = candidate.key`；新建 peek.mjs；**keynav createKeyHandler 增 `onPeek` 选项**（`p` 分派、消费时 preventDefault，帮助浮层键位 switch 增 `case "peek"` 渲染 `t("kbd.peek")`）；workbench keyhandler 传 onPeek（cursorIndex + rowEls[i].dataset.key → candidates find → renderPeek(surfaceEl, {candidate, onClose})；j/k 后若 peek 开着重渲染；Esc 通道顺序：peek 开则关 peek，否则关 help；paint 重置 peek 开启态为关、与 palette 互斥——rev-plan S5）；i18n peek.*/kbd.peek；kbd.enter 键值文案复核（Enter/Space 语义不变）。
3. 验证 + Commit：`feat(peek): 游标行 p 键候选全文预览浮层（P2-6 前半；键位重排声明见计划 §3-3）`

### Task 4：工件槽（P2-6 后半，P1 认知更正兑现）

1. 红：scheduler.test——既有 nodeStatuses deepEqual 断言增 `artifacts: []`；新用例：nodeStates 带 artifacts（["a1", "a2", "a3"]）→ 投影截 2 条各截 500 字符（构造 501 字符串）。
2. 红：client-render——runDetail：nodeStatuses 带 artifacts 的 run → 工件 tab 可点（非 disabled）→ 视图含工件文本；全空 → tab disabled（disabled 属性 + title）。
3. 绿：summarizeRun 投影（§6 截断口径）；runDetail 第三槽（`t("run.tabArtifacts")`，disabled 态 `title=t("run.emptyArtifacts")`）；i18n 两键。
4. 验证 + Commit：`feat(run-detail): 工件槽补齐（P2-6 后半；P1「未持久化」判断勘误——engine 已落盘，仅缺投影）`

### Task 5：staged 预览 lite（P2-2）

1. 红：client-render——review gate 卡（template meta 含 agent/script/gate 三类后续节点）「放行后继续」区为逐节点行：节点名 + 类型标签（`t("nodeType."+type)` 三态静态消费）。
2. 绿：review.mjs「放行后继续」区升级——**gatePassEffect 汇总行保留消费**（{next} 沿名字串连接，P0 断言零破坏，rev-plan S6 二选一裁决），紧随其后为逐节点行（节点名 + `t("nodeType."+type)` 类型标签）；gateWaitInfo 增 `nextNodes: [{name, type}]`（保留 nextNames 兼容既有调用/测试——标 deprecated 注记）；i18n nodeType.* 三键。
3. 验证 + Commit：`feat(review): G2 放行后果逐节点 staged 列表 + 类型标签（P2-2 lite）`

### Task 6：卡住检测（P2-5）

1. 红：logic.test——`stalledOf` 三档（<阈值 false、>阈值 true、非法 false）；client-render——sessions 行 running ∧ 超 15min → `t("sessions.stalled")` chip 在场（title 含阈值说明），未超时不在场。
2. 绿：logic `STALL_MS` 导出 + stalledOf；sessionsView 行尾警示 chip（title=`t("sessions.stalled")` + 阈值说明复用同键）；i18n sessions.stalled（zh「疑似卡住」/ en "Possibly stuck"）。
3. 验证 + Commit：`feat(sessions): 卡住检测警示 chip（P2-5；client 合成 15min 阈值，无第四态色）`

### Task 7：角色创建向导（P2-7）

1. 红：client-render——①「新增角色」→ 向导出现：step1 五预设卡 + 空白卡（文案 `t("wizard.blank")`）；选「空白」→ step2（roleId/name/description 空）；选预设（如 devflow-developer）→ step2 预填 roleId=`devflow-developer-copy`、name 含 `t("wizard.copySuffix")`、description 预填；②下一步 → step3 prompt 预填预设 prompt + policy select + 回顾摘要（含 roleId/name）→ 上一步可回；③保存 → `a.rolesUpsert` 收到合并对象（prompt=预设 prompt、policy 沿预设）→ 关闭；④Esc/背景关闭不落库。
2. 绿：**renderRolesTab 增 `deps = {}` seam**（`const a = deps.api ?? api`——rolesList/rolesUpsert/rolesDelete 全走 a，rolesTab 加入 seam 家族）；rolesTab openDialog 新增路径改三步向导（step 闭包态；预设数据 `BUILTIN_ROLES` import 自 `../workflows/roles.mjs`——纯常量可打包）；编辑既有角色路径不变（仍单表单）；i18n wizard.* 八键 + `roles.wizardTitle`。
3. 验证 + Commit：`feat(roles): 新增角色三步向导（P2-7；内置预设起步）`

### Task 8：分诊置信度链路（P2-3）

1. 红：triage.test——①parseTriageOutput：元素含合法 confidence（82）→ 透传；**confidence: null → 元素合法且字段不落（rev-plan B1 补档）**；**confidence: "high" → 元素合法且字段不落（B1 补档）**；confidence 150/1.5 → 元素合法且字段不落；无 confidence → 字段缺省（元素合法）；②buildPrompt zh/en 文本含 confidence 要求字面量。
2. 红：handlers.test——分诊应用写入含 `confidence`（合法透传/缺省 null）；**缺失率可观测（rev-plan S1）**：一批内缺失行数 > 0 → console.info 一次 `[dsh-l] triage: n/N rows missing confidence`（handlers.test 断言调用）；task-package.test——golden 更新：CAND fixture triage 含 confidence: 82 → pkg.triage deepEqual 含 confidence: 82；human/无分诊路径 confidence null/缺省形状。
3. 红：client-render——候选 triage.confidence=87 → 行内置信 chip `t("triage.confidence").replace("{n}","87")`；confidence 缺省 → 无 chip。
4. 绿：triage.mjs RULES/parse（两层显式化：ok 谓词不动 + 净化步骤）；handlers.mjs:386 透传 + 缺失率 console.info（S1）；任务包构建器 triage 显式五字段投影；candidateRow 置信 chip；i18n triage.confidence；**既有 golden 全量核对**（emit/gate/repo 块不受影响）。
5. 验证 + Commit：`feat(triage): 分诊置信度链路（P2-3；prompt+容错解析+store 透传+UI chip+任务包投影显式化，golden 更新）`

### Task 9：docs 注记 + 最终验证

1. 计划文档注记回写：P1 计划 §6 nowMs 措辞（S9）、§8/§10 算术与台账更正（S10/S11——crimson 三处清单、杂项）；本计划 §1.1 降级声明即权威口径。
2. 最终验证（显式退出码双 0）：`npm test` 全绿、`npm run build`、`git log` 序列核对、`git status --short` 干净。
3. Commit：`docs(plans): P2 降级声明与 P1 注记回写（收尾同步）`

## 9. 执行纪律

继承 P0 §9 / P1 §9 全部条款（批判性复查、不跳步、阻塞即停、禁 git add -A、显式退出码、sed 后 grep 验证、main 已授权、两轮对抗评审）。另加：
- 触碰 buildTaskPackage/triage prompt 属核心链路：实现前先读目标文件全文，golden 更新必须在 commit 正文列明「哪些断言因契约显式化而更新」。
- 新增组件（commandPalette/peek）全部参数注入（anchor/回调），不直引 localStorage/Date.now()。

## 10. 最终验证与遗留

全量 `npm test` + `npm run build` 双 0；`git log` 与任务一一对应；树干净。**P2 后遗留（v3 池）**：diff 就地查看（会话协调者缝）、成本面板（宿主用量 API）、客观信号响应延迟（timeline 摄取）、GitLab provider、IM 双向拍板、G1 高置信自动放行。

**实施期注记（2026-11-22 实施后回写）**：
1. Task 3+4 合并提交（ecd47e5）：Task 4 首验红跳过提交后 amend 误并入 peek 提交，locale/lib 交叉无法干净拆分——诚实标注，两任务红绿链各自完整。
2. dot-breathe 1.6s 与 `.recheck svg` 400ms 保留字面量（无对应 token 档位）——DESIGN.md Do 条外例外，P2 后可加 `--dshl-dur-3`。
3. crimson 三处（actions.mjs×2 + rolesTab.mjs×1）已全数清偿（Task 1），actions.mjs:316/:409 与 rolesTab:116 台账销账。
4. guard 体内误植 palette/peek 重置（每按键杀 peekOpen）由 Task 3 实测揪出，paint 体重置为准。
