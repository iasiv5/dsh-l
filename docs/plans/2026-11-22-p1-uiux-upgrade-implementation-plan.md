# dsh-l P1 UI/UX 升级 实施计划（2026-11-22）

共识来源：`01_docs/research/dsh-l-uiux-competitor-comparison-2026-11-22.md` §6 P1 表（P1-1..P1-8）+ rev-impl 遗留池（bar 吞错接线、sessionsView crimson 统一、会话行 unread、等待时长）+ 主人指令（2026-11-22：落全部 P1，按 P0 流程：writing-plans → 对抗评审 → main 实施 → 实施对抗评审至一致）。设计纪律 `DESIGN.md`；词汇 `GLOSSARY.md`；P0 计划与本计划同仓共存。

## 1. 目标（P1 八项 + 四笔小债）

| # | 提案 | 关键内容 | host 触碰 |
|---|---|---|---|
| P1-1 | 键盘体系 | j/k 行游标、Enter/Space 展开、x 勾选联动批量、数字 1-5 切 tab、`?` 帮助浮层；输入焦点内不劫持 | 无 |
| P1-2 | 乐观更新最小实现 | paint 保留滚动位置与焦点；动作按钮 pending 态（withPending） | 无 |
| P1-3 | facet 计数过滤 + 保存组合 | type 计数 chips、urgency/repo 下拉 option 带计数、**stage 过滤维度**（新增）；pinned filters 存 localStorage | 无 |
| P1-4 | 会话行升级 | 相对时间、run 行在途节点名、run 行 unread 点、终态折叠收纳 | 无 |
| P1-5 | run 详情同槽位视图 | 行内 run 区块增「详情」→ 节点/历史 两槽位 tab（**工件槽砍除**，见 §1.1） | summarizeRun 投影扩展 |
| P1-6 | strip 可点击 | pre 三枚计数 chip 可点 → stage 过滤联动（再点取消）；loop chip title 带计数 | 无 |
| P1-7 | 多选 + 批量动作 | 行复选框 + 批量栏：移到待拍板 / 关闭所选 / 批量推翻（统一理由表单，逐 key override）；Promise.allSettled 汇总 | 无 |
| P1-8 | 动效系统化 | motion token（时长/曲线 CSS 变量）、tabsbar 滑动指示条、既有动画迁移 token、reduced-motion 全对账 | 无 |
| 小债 A | bar() 吞错接线 | triageBatch 失败就地呈现（不再 console.warn 吞掉） | 无 |
| 小债 B | sessionsView 交付错误色统一 | crimson → color-mix | 无 |
| 小债 C | 会话行 unread | run 行终态未读 → st-unread；「打开」记账 | 无 |
| 小债 D | 等待时长 | gate 卡「已等待 {d}」+ 待放行卡按等待时长升序（最久优先） | **gateArrive + now 选项 + summarizeRun**（§4 边界） |

### 1.1 有意砍除/收窄（防实施后评审计缺）

- **工件槽砍除**：artifacts 仅在 executor 返回值与 deliver.mr 事件中使用，未持久化进 nodeStates（grep 实证）——「工件」槽位永远是空数据。P1-5 收窄为「节点/历史」两槽位；工件持久化留 P2（host 深化）。
- **Peek 预览不做**（报告属 P2-6）；Space 键仅复用「展开/收起」。
- **命令面板 ⌘K 不做**（P2-1）；数字切 tab + `?` 帮助即本期键盘面。
- **批量动作不含「批量分诊」**：既有 triageBatch 按钮（inbox ≤10 窗口）语义独立，不与勾选集合混流。
- **pinned filters 存 localStorage**（键 `dsh-l.pinnedFilters.v1`），不入 store.settings（PUT 逐键白名单是 host 面）；localStorage 不可用时静默降级为内存 Map（会话内有效）。storage 经参数注入可测。
- **滑动指示条**：`ResizeObserver` 存在性探测（node 测试环境缺失时回退静态定位，guard 必须显式）。

## 2. 架构快照（P0 后现状 + 数据边界）

- P0 落地后：五视图（清单/看板/待我确认/会话/角色）+ 六态色标 + deps seam 四入口 + 错误就地呈现（失败不 reload）。全量重绘架构不变（paint 整树重建）。
- **host 数据边界（本轮新核实）**：
  - `run.history` **有真实写入**：`store.appendRunHistory(id, event, detail)` 被 engine.mjs 于 workspace.cloned/clone-failed/node.resumed/deliver.mr/resume.interrupted 等事件调用，`RUN_HISTORY_LIMIT` 截断——历史槽位有数据。
  - `gateArrive(run, nodeId)` 为纯函数（scheduler.mjs），无时钟参数；`waitingGate` 是 run 级字段先例——`waitingSince` 以同形第三参落字。
  - `run.updatedAt` 由 `saveRun` 注入 now 刷新（语义=最近变更，**不是**闸门到达时刻，不得冒充等待时长）。
  - artifacts 未持久化（§1.1）。
  - `summarizeRun` 现投影：`{id,candidateKey,status,waitingGate,waitingGateId,currentNodeIds,failedNodeIds,cancelledNodeIds,models,templateId,error}`。
- i18n 三重守护、FakeElement 桩（style 为普通对象、无 placeholder getter、无 document.body/querySelector/ResizeObserver/localStorage）、deps seam 四入口、coarse 44px 层、lib 产物随 commit——全部沿 P0 纪律（详见 P0 计划 §2/§3，本计划不重复，冲突时以 P0 计划为准）。

## 3. 全局约束（P0 计划 §3 全量继承 + 增补）

1. 继承：Host-Theme Rule / One Voice Rule / Inherited Voice / reduced-motion 成对 / i18n 静态键与动态前缀白名单（段内禁加键、注释禁写 `t(` 模式）/ 零新依赖 / main 直提已授权 / docs 独立 commit / lib 随任务重建入库。
2. **host 触碰边界（仅限两处，均带 golden；rev-plan B1 修正稿）**：①`engine.mjs:100` 的 `gateArrive(run, nodeId)` → `gateArrive(run, nodeId, now().toISOString())`——**`makeEngine` 的 `now` 选项早已存在（engine.mjs:46，返回 Date，供 store `.toISOString()` 消费），禁止改动其默认值与语义**；②`summarizeRun` 投影扩展 `waitingSince/history(nodeStatuses)`。**store schema、`/dsh-l/*` 路由形状、handlers 签名零改动**。
3. **验证纪律增补（P0 Task 8 教训）**：`npm test`/`npm run build` 输出重定向后必须显式 `echo $?`，**退出码非 0 禁止 commit**；禁止依赖 grep 管道退出码做提交门。
4. 测试注入缝扩展：`renderSessionsView`/`renderRunDetail`/`renderStrip`/`keynav` 均带可选参数注入（`nowMs`/`storage`/回调），默认路径零行为变化；`localStorage` 一律经 `storage` 参数访问，不得直引全局（node 环境缺失）。
5. 每任务一个 checkpoint commit（Task 0 无提交）；新增组件文件放 `src/client/components/`。
6. 既有断言冲突处置同 P0 §3-11：语义变更修断言并注明，不许为绿弱化。

## 4. 基线处理（Task 0：只核验，无提交）

`git status --short` 空、`npm test` 324 全绿、HEAD=`d8d2430`（或其后仅含本计划实施 commit——rev-plan B3）。若出现计划外 pending，停下报告，不自行落账。

## 5. 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/engine/scheduler.mjs` | 修改 | `gateArrive(run, nodeId, waitingSince = null)` 第三参落 `waitingSince`；`summarizeRun` 增 `waitingSince/history/nodeStatuses` |
| `src/engine/engine.mjs` | 修改 | 仅 engine.mjs:100 的 gateArrive 调用点传入 `now().toISOString()`（`now` 选项已存在返回 Date，勿动；rev-plan B1） |
| `src/client/logic.mjs` | 修改 | `formatDuration(ms)`、`formatRelative(updatedAtMs, nowMs)`、`filterCandidates` 增 stage 维度、`facetCounts(list)`、`sortGateRunsByWait(runs)`、`loadPins(storage)/savePins(storage, pins)/makePinId()` |
| `src/client/components/workbench.mjs` | 修改 | stage 过滤维度 + facet chips + pinned UI + 批量栏/勾选 + 键盘接线 + paint 焦点滚动保留 + tabs 指示条 + motion token + strip 点击接线 + sessions 传参扩充 |
| `src/client/components/pipelineStrip.mjs` | 修改 | pre 三 chip 可点化（onStagePick 回调）+ loop chip title 计数 |
| `src/client/components/sessionsView.mjs` | 修改 | 相对时间、在途节点、unread、终态折叠、crimson→color-mix |
| `src/client/components/review.mjs` | 修改 | gate 卡等待行 + 最久优先排序 |
| `src/client/components/runDetail.mjs` | **新建** | 节点/历史两槽位 tab 视图 |
| `src/client/components/keynav.mjs` | **新建** | `createKeyHandler(ctx)` + `openHelp(anchorEl, t)` 帮助浮层（挂锚元素子树——rev-plan S6） |
| `src/client/components/uiFeedback.mjs` | **新建** | `withPending(btn, fn)` pending 态包装 |
| `src/client/components/actions.mjs` | 修改 | bar() errLine；rowActions 勾选回调透传（checkbox 由 workbench 决定是否注入）|
| `src/client/components/candidateRow.mjs` | 修改 | opts 增 `selectable/selected/onToggleSelect` 渲染复选框 |
| `src/client/locale/zh-CN.mjs`、`en.mjs` | 修改 | §7 新键表 |
| `test/scheduler.test.mjs`、`test/logic.test.mjs`、`test/client-render.test.mjs` | 修改 | 各任务红绿用例。**FakeElement 加法升级（Task 6 前）**：增 `focus()` 方法（`focusCalls` 计数）、`addEventListener` 改记账（`this._listeners` 数组）、`scrollTop` 走普通字段——三处均为加法，既有用例不受影响 |
| `DESIGN.md` | 修改 | motion token + Do 条目（Task 11） |

## 6. 契约（Produces → Consumes）

- `formatDuration(ms)`：`Number(ms)` 非有限 → `""`；`<90_000 → "1m"`；否则 `<1h → `${round(m)}m``、`<24h → `${round(h)}h``、else `${round(d)}d`（纯数字，无 i18n）。
- `formatRelative(updatedAtMs, nowMs)`：任一非有限 → `""`；`delta = max(0, nowMs - updatedAtMs)`；`<60_000 → "1m"`；同 formatDuration 分级——调用方以 `sessions.ago` 模板包一层。
- `filterCandidates(list, {type, repo, urgency, stage})`：stage 非 "all" 时 `bucketOf(c.stage) === stage`（复用既有 bucketOf：building/verifying 归 building、其余未知归 closed）。旧三维语义不变（stage 缺省 "all"）。
- `facetCounts(list)`：`{ type: {issue, pull}, urgency: {P0..P3}, repo: {repoName: n}, stage: {inbox, triaged, gating, building, shipped, closed} }`——stage 维度按 `bucketOf` 归桶计数（与 stage 过滤口径一致），其余按原值计数；仅计出现过的键。
- `sortGateRunsByWait(runs)`：`waitingSince` 升序（最久优先），缺失者排尾部保持原序（稳定排序）。
- `loadPins(storage)`/`savePins(storage, pins)`：JSON 数组 `[{id, label, filters:{type,repo,urgency,stage}}]`，键 `dsh-l.pinnedFilters.v1`；解析失败 → `[]`；`storage` 缺失 → 内存 Map（模块级 fallback）。`makePinId()` = `pin-` + Date.now() + 4 位随机。
- `keynav.createKeyHandler({ getRows, rowAction, rowSelect, tabSwitch, help, typingTarget })`：返回 `(e) => void`。守卫序：`e.ctrlKey||e.metaKey||e.altKey` → 忽略；`typingTarget(e.target)`（tagName ∈ INPUT/TEXTAREA/SELECT 或 `isContentEditable === true`）→ 忽略；`e.key` 分派：`j`/`J` 下移、`k`/`K` 上移、`Enter`/` `(Space) 展开切换、`x`/`X` 勾选切换、`?`（`shiftKey && key==="?"`）帮助、`1-5` 切 tab；`e.preventDefault()` 仅在已消费时调用。游标态由调用方持有（`cursorIndex` 传入 getRows 返回当前列表，处理函数计算 next index 回调）——keynav 不持 DOM。
- `uiFeedback.withPending(btn, fn)`：返回包装 async；执行前置 `btn.disabled = true; btn.dataset.pending = "1"`；finally 恢复（仅当 `btn.isConnected !== false`；失败路径恢复后错误行已由 go/act 呈现）。
- `runDetail.renderRunDetail(container, { t, run, deps = {} })`：`run` 为 summarizeRun 投影（**无 template 参数**——nodeStatuses 自带 name/type，rev-plan S10）。节点视图 = `run.nodeStatuses`（静态 switch 状态标签+dot：pending/ready/skipped 灰、running 绿、waiting 黄、succeeded 暗绿点、failed 红、cancelled 灰，failed 附 error 文本）；历史视图 = `run.history` 倒序（`at` 原样 + event + detail）；tab 态闭包内切换，无外发。**状态标签键映射（rev-plan B2）**：`running/waiting/succeeded/failed/cancelled` 五态静态复用 `run.status.*`（switch 内字面量，白名单安全）；`pending/ready/skipped` 三态走**新段** `nodeState.*` 静态字面量（非白名单前缀，守护安全）——禁止 `t("run.status." + status)` 动态拼接（白名单段值域仅 5、且不含节点三态）。
- `summarizeRun` 新字段（rev-plan S1 收口：陈旧 waitingSince 不外泄）：`waitingSince: run.status === "waiting" ? (run.waitingSince ?? null) : null`；`history: (run.history ?? []).slice(-20)`；`nodeStatuses: (run.snapshot?.nodes ?? []).map(n => ({ id: n.id, name: n.name, type: n.type, status: run.nodeStates[n.id]?.status ?? "pending", error: run.nodeStates[n.id]?.error ?? null }))`。
- `gateArrive(run, nodeId, waitingSince = null)`：`waitingSince` 为真值时 `...run, status:"waiting", waitingGate: nodeId, ...(waitingSince ? { waitingSince } : {}), nodeStates: …`；缺参时与现行为逐字节一致（golden 双断言）。`applyGateDecision` 不清 `waitingSince`（残留无碍——投影侧已按 status 收口）。
- `renderSessionsView(container, { t, items, summaries, onOpen, onAnother, onDeliver, runs = [], seenRunIds = [], nowMs = null })`：新增三参缺省零行为变化（nowMs 缺省 `Date.now()`）。unread 判定：`item.kind === "run" ∧ item.runId ∧ summary(runs 按 id).status === "succeeded" ∧ !seenRunIds.includes(runId)`。在途节点：该 run 的 `currentNodeIds` join "/"。终态行（badgeGone ∨ candidate.stage==="closed" ∨ stage==="shipped"）收入 `<details class="ssarchive">`（summary=`已结束 · n`）。

## 7. i18n 新键表（zh / en 成对，全部静态消费）

```
filters.stage        阶段 / Stage
filters.saveCurrent  存为常用 / Save as pinned
filters.pins         常用过滤 / Pinned filters
filters.pinRemove    删 / Remove
batch.selected       已选 {n} / Selected {n}
batch.close          关闭所选 / Close selected
batch.override       批量推翻（统一理由） / Bulk override (shared reason)
batch.reasonPlaceholder   统一理由（by:human 留痕） / Shared reason (recorded as by:human)
batch.done           完成 {ok}，失败 {fail} / {ok} done, {fail} failed
review.waited        已等待 {d} / Waiting for {d}
run.tabNodes         节点 / Nodes
run.tabHistory       历史 / History
run.detail           详情 / Details
run.emptyHistory     暂无历史事件 / No history events
sessions.ago         {t} 前 / {t} ago
sessions.archive     已结束 / Finished
nodeState.pending    待调度 / Pending
nodeState.ready      就绪 / Ready
nodeState.skipped    已跳过 / Skipped
kbd.title            键盘快捷键 / Keyboard shortcuts
kbd.jk               j / k：上下移动 / j / k: move up/down
kbd.enter            Enter / Space：展开或收起 / Enter / Space: expand or collapse
kbd.x                x：勾选当前行 / x: toggle row selection
kbd.digits           数字 1–5：切换视图 / Digits 1–5: switch views
kbd.help             ?：本帮助 / ?: this help
kbd.close            关闭 / Close
```

不新增动态前缀；`{n}/{d}/{t}/{nodes}` 沿手动 replace 惯例；`run.status.*` 段值域仅 5（running/waiting/succeeded/failed/cancelled）——**nodeStatuses 的 pending/ready/skipped 不得走该段动态拼接**（rev-plan B2），一律走 `nodeState.*` 静态字面量 switch。

## 8. 任务清单（顺序执行；TDD；每任务 commit 前 `npm test`/`npm run build` 重定向后显式 echo 退出码，双 0 才提交）

### Task 0：基线核验（无提交）

`git status --short` 空；`npm test` 324 全绿；HEAD=`d8d2430`（或其后仅含本计划实施 commit）。异常即停。

### Task 1：等待时长（小债 D，host+logic+review）

1. 红：`test/scheduler.test.mjs`——①`gateArrive({...run}, "g2", "2026-01-01T00:00:00Z")` 断言 `waitingSince` 落字（ISO 字符串）且缺参调用不产生该键（双 golden）；②`summarizeRun` 断言三新字段：`waitingSince`（waiting 态透传、**非 waiting 态恒 null**——rev-plan S1 收口）、`history`（构造 21 条验证截 20）、`nodeStatuses`（name/type/status/error；snapshot 缺失 → 空数组）。
2. 红：`test/logic.test.mjs`——`formatDuration`（5 档：非法/1m/45m/3h/27d）与 `sortGateRunsByWait`（升序、缺省沉底稳定）。
3. 红：`test/client-render.test.mjs`——review gate 卡（waitingSince 在场）渲染 `t("review.waited")` 替换产物；两条 gateRuns 按等待时长升序渲染（老的在前）。**renderReview 签名增 `nowMs = null`**（缺省 `Date.now()`，rev-plan S2——nowMs 注入点与 sessionsView 同模式）。
4. 绿：按 §6 契约实现——scheduler（gateArrive 第三参 + summarizeRun 三字段含 S1 收口）/engine（**仅** engine.mjs:100 传 `now().toISOString()`，`now` 选项本身勿动）/logic/review（等待行 + sortGateRunsByWait + nowMs 参数）/i18n（`review.waited`）。
5. 验证 + Commit：`feat(engine): gate 等待时长数据面（waitingSince+now 选项）+ review 呈现与最久优先（P1 小债 D）`

### Task 2：小债 A/B（bar 吞错 + crimson 统一）

1. 红：client-render——①installActions 后 `hooks.bar(barEl, {t, state, filters, view})` 产出 errLine 元素（display none）；stub `a.triage` reject → 点批量分诊按钮 → errLine 可见含 `t("errors.actionFailed")` 且**不触发 view.reload**；成功清除并 reload。（deps seam 已覆盖 a.triage——P0 Task 9 已切）②sessionsView deliver 失败 chip 断言改为 color-mix 前缀（既有断言若钉死 "crimson" 字样则同步修正并注明）。
2. 绿：bar() 内建 errLine（append 至 bar 尾，模式同 rowActions，成功清空 + reload、失败呈现 + 不 reload）；sessionsView 交付错误 chip 色 `color-mix(in srgb,#d1242f 85%,currentColor)`。
3. 验证 + Commit：`fix(uiux): bar 批量分诊吞错接线 + sessions 交付错误色统一（P1 小债 A/B）`

### Task 3：stage 过滤维度 + facet 计数 + strip 可点击（P1-3 半 + P1-6）

1. 红：logic.test——`filterCandidates` stage 维度（building 归并 verifying、closed 归并 held、"all" 全量、缺省兼容旧三维调用）；`facetCounts` 计数口径。
2. 红：client-render——①过滤条 stage select（aria-label=`t("filters.stage")`，option 文案 `列名 (n)`）切换后清单只剩该桶；②type 计数 chips（三枚，文案含计数，点击切换 active 态）替换 type select；③`renderStrip` 带 `onStagePick` 时 pre 三枚 chip 为 button 且 count>0 才启用，点击回调收到 bucket id；strip chip active 态（filters.stage 对应时）；④loop chip title 含计数。
3. 绿：logic 两纯函数；pipelineStrip 签名 `renderStrip(container, { t, candidates, workflow, runs, onStagePick = null, stageFilter = "all" })`（缺省回调时 chip 退化为 span——**workbench 既有调用零变化**）。**接线契约（rev-plan S8 引述修正）**：strip 由 actions.mjs `strip` 钩子渲染（workbench 实际调用 `extend?.strip?.(strip, { t, state })`，workbench.mjs:350），故 workbench 在 ctx 增 `stagePick: (bucket) => {...} / stageFilter: filters.stage` 两个键，actions.strip 解构并透传 `onStagePick: ctx.stagePick, stageFilter: ctx.stageFilter`——既有 ctx 消费者零破坏（ctx 是开放对象）。workbench：filters 增 stage、过滤条加 stage select、type chips、onStagePick 点击同值取消；**P0 清除过滤联动（rev-plan S4）**：`filtersActive` 判定与清除按钮复位三键处（workbench.mjs:424/430 一带）纳入 `filters.stage`，否则 stage 过滤空态会误判真空态。i18n `filters.stage`。
4. 验证 + Commit：`feat(filters): stage 过滤维度 + type 计数 chips + 下拉计数 + strip 点击联动（P1-3 半/P1-6）`

### Task 4：pinned filters（P1-3 后半）

1. 红：logic.test——`loadPins/savePins/makePinId`（存储缺失→[]；坏 JSON→[]；round-trip；storage 注入 fake）。
2. 红：client-render——过滤条尾部「存为常用」按钮（全默认时 disabled）；保存后出现 pin chips（label=四维组合文本）；点 pin 应用过滤（selects/chips 同步）；pin 上删除钮移除；重启模拟（同 storage 重新 mount）pins 仍在。
3. 绿：logic 三函数（`storage` 参数，fallback 模块级 Map）；workbench 过滤条尾 pinned UI；**storage 取值防抛（rev-plan S11）**：`const safeStorage = (() => { try { return globalThis.localStorage ?? null; } catch { return null; } })();` 传参（沙箱 iframe/隐私模式访问 getter 本身可能 throw，测试注入 fake）。
4. 验证 + Commit：`feat(filters): pinned filters 本地保存/应用/删除（P1-3）`

### Task 5：会话行升级 + unread（P1-4 + 小债 C）

1. 红：logic.test——`formatRelative` 档位。
2. 红：client-render——`renderSessionsView` 带 `runs/seenRunIds/nowMs`：①work 行相对时间文本（`t("sessions.ago")` 替换产物含 formatRelative 段）；②run 行 succeeded 未读 → 行尾 `st-unread` 独立小点、seen 后消失；③run 行在途节点名以 chip 呈现原文节点 id（无新键）；④终态行收进 `ssarchive` details（summary 含 `t("sessions.archive")` 与计数），活跃行在外。**终态判定**：`badgeGone`（上游已关闭）∨ `candidate.stage === "closed"` ∨（`stage === "shipped"` ∧ `release?.confirmedAt` 在场）——**shipped 未确认发版是活跃行**（待 G3，不得归档）。
3. 绿：logic.formatRelative；sessionsView 签名扩三参（缺省零变化）+ 存档分组 + unread 点（复用 stateDotEl，行首已有六态点——unread 覆盖为状态判定的一部分：sessionState 不改，unread 独立小蓝点附于行尾元信息区）；workbench 调用点传 `runs/seenRunIds/nowMs: Date.now()`，**onOpen 签名扩参（rev-plan S3）**：`onOpen(sessionId, item)`——orphan 行传 `onOpen(s.id, null)`，workbench 包装 `(id, item) => { if (item?.runId) seenRuns.add(item.runId); openWorkSession(id); }`（既有单参回调测试兼容）；CSS coarse 层补 `.ssarchive summary{min-height:44px;display:flex;align-items:center}`（rev-plan S7）。
4. 验证 + Commit：`feat(sessions): 相对时间 + 在途节点 + 未读点 + 终态折叠（P1-4/小债 C）`

### Task 6：run 详情同槽位视图（P1-5）

1. 红：client-render——①`renderRunDetail` 节点视图：nodeStatuses 三行（name+状态标签 `t("run.status."+status)` 动态前缀既有白名单+failed error 文本）；②点历史 tab → 倒序列表（at+event+detail）；③空 history → `t("run.emptyHistory")`；④actions.mjs runRow 增「详情」toggle 按钮：点击展开 runDetail、再点收起。
2. 绿：新建 runDetail.mjs（tab 态闭包）；actions.mjs runRow 追加 toggle 按钮（`t("run.detail")`），展开态把 runDetail 挂 runRow 之后。
3. 验证 + Commit：`feat(run-detail): 行内 run 节点/历史两槽位视图（P1-5）`

### Task 7：乐观更新最小实现（P1-2）

1. 红：client-render——①`withPending(btn, fn)`：fn pending 期间 btn.disabled=true 且 dataset.pending==="1"，fn reject 后恢复（失败不 reload 场景按钮必须复活）；②mountWorkbench paint 两次间保留 `main.scrollTop` 与焦点（构造：mount → 找到一个 button 并 `btn.focus()` + 设 main.scrollTop=88 → 触发 filters 变更 paint → 断言 scrollTop===88 且 `shadow.activeElement` 恢复——**桩无 activeElement/focus**：FakeElement 增 `focus(){}` 与 workbench 用 `shadow.activeElement?.` 可选读，测试给 shadow 挂 `activeElement` 指向某按钮并给该按钮 `dataset.navKey`，断言重建后新树同 navKey 元素 `focusCalls===1`（FakeElement 增 focus 计数））。
2. 绿：新建 uiFeedback.mjs；review `btn()`、actions rowActions 的 stages/uxChips/gate 按钮、kanban adv/move 接 withPending（与 go/act 组合：`withPending(b, () => go(...))`）；workbench paint 头尾增快照/恢复（`main` 引用在 paint 内可得；activeElement 经 `shadow.activeElement` 可选读，navKey=`data-nav-key` 属性，恢复时 `?.focus?.()`）。
3. 验证 + Commit：`feat(uiux): 动作 pending 态 + paint 保留滚动与焦点（P1-2）`

### Task 8：多选 + 批量动作（P1-7）

1. 红：logic.test——（无新纯函数；选择态在 workbench 闭包）client-render——①mount 后 renderRow 出现复选框（`selectable:true` 传入时；**插入位钉死：六态点之后、type badge 之前**，button role="checkbox" aria-checked——既有 :749 断言「行内第一个 BUTTON=id 作 aria-labelledby」会因复选框成为第一个 BUTTON 而红，属语义变更，修断言为「跳过 role=checkbox 后取 title 按钮」并在 commit 注明，rev-plan S9）；②点击勾选 → 批量栏出现（`t("batch.selected")` 替换 n）+ 三个动作；③批量关闭 → `a.stage` 被调 n 次（allSettled）；④批量展开共享表单 → 提交 → `a.override` n 次且 reason 同值；⑤**部分失败语义（rev-plan B4 钉死）**：一失败一成功 → `t("batch.done")` 汇总出现 + **不 reload**（P0 不变式）+ **失败键仍在 selectedKeys 且勾选框 aria-checked=true**（原位重试），成功键已从选择集移除；⑥空选择时批量栏不出现。
2. 绿：workbench `selectedKeys` Set；renderRow 传 `selectable/selected/onToggleSelect`（勾选框是 button 元素 `role="checkbox" aria-checked`，coarse 44px 继承）；批量栏（append 在 bar 之后、清单组之前）：三动作全部走 `a.*` + `Promise.allSettled`；**收尾语义（rev-plan B4）**：全部成功 → `selectedKeys.clear()` + `notice` 清空 + reload；部分失败 → **不 reload**、`notice = t("batch.done").replace({ok},{fail})` 汇总、仅从 selectedKeys 移除成功键（失败键保留勾选）；i18n §7 batch.* 四键。
3. 验证 + Commit：`feat(batch): 行勾选 + 批量移到待拍板/关闭/批量推翻（P1-7）`

### Task 9：键盘体系（P1-1）

1. 红：client-render——`createKeyHandler` 纯逻辑（伪造事件 `{key, ctrlKey:false, target:{tagName:"DIV"}}` 序列）：①j/k 移动游标（回调收到新 index、越界钳制）；②Enter/Space 触发当前行展开回调；③x 触发勾选回调；④1-5 触发 tab 切换回调；⑤`?` 触发帮助回调；⑥target tagName=INPUT 时全部忽略；⑦ctrl+j 忽略；⑧`preventDefault` 仅被消费键调用（fake 事件记调用数）。另：`openHelp` 挂载浮层含 `t("kbd.title")` 与键位行、关闭钮与 Esc 关闭。workbench 接线冒烟：mount 后 `shadow.host` 上 keydown 监听被安装（host._listeners 记账形态——FakeElement 增 addEventListener 记账）。
2. 绿：新建 keynav.mjs（§6 契约）；workbench mount 时 `shadow.host?.addEventListener?.("keydown", handler)`（host 存在性守卫）+ **dispose 对称（rev-plan S5）**：`view.dispose` 增 `shadow.host?.removeEventListener?.("keydown", handler)` 且 handler 首行 `if (disposed) return` 守卫（React remount 复用 host 防双监听）；游标态闭包 + paint 时把行元素收集进 `rowEls` 闭包数组（paint 重建后更新，规避无 querySelectorAll）；帮助浮层 **`openHelp(anchorEl, t)` 挂 `.workSurface` 子树**（rev-plan S6：对齐 P0 rtOverlay「遮罩收窄为面板区」裁决，shadow 根直系 fixed 会罩全应用视口）；i18n `kbd.*` 八键。
3. 验证 + Commit：`feat(keynav): j/k/Enter/x/数字/? 键盘体系 + 帮助浮层（P1-1）`

### Task 10：动效系统化（P1-8）

1. 红：client-render 静态断言——workbench CSS 文本含 `--dshl-dur-1/--dshl-dur-2/--dshl-ease` token、`@media (prefers-reduced-motion:reduce)` 块含三 token 置 0s、tabsbar 含指示条元素（mount 后 `byClass(shadow,"tabindicator")` 在场）。
2. 绿：CSS `:host{--dshl-dur-1:160ms;--dshl-dur-2:240ms;--dshl-ease:cubic-bezier(.22,1,.36,1)}`；gate-in/success-turn/dot-breathe 改引 token（值不变）；tabsbar 增 `tabindicator` 元素（**守卫补全（rev-plan S12）**：`typeof ResizeObserver !== "undefined" && globalThis.matchMedia?.("(pointer:fine)")?.matches` 双探测，否则 display:none 静态退化——纯视觉增强不承载信息）；reduced-motion 块统一置 0s。
3. 验证 + Commit：`feat(motion): motion token + tabs 滑动指示条 + reduced-motion 全对账（P1-8）`

### Task 11：docs 同步 + 最终验证

1. DESIGN.md：colors 不变；Do 增「动效一律引 `--dshl-*` token，新增动画必须 reduced-motion 成对」。计划文档若有实施期注记（rev 阶段产生）一并回写。
2. 最终验证（显式退出码双 0）：`npm test`（324+新增全绿）、`npm run build`、`git log` 序列核对（预期 Task 3/4 拆两 commit → 共 13 个代码/docs commit + Task 0 无提交）、`git status --short` 干净。
3. Commit：`docs(design): motion token Do 条目（P1 收尾同步）`

## 9. 执行纪律

继承 P0 计划 §9 全部条款（批判性复查计划、不跳步、阻塞即停、禁 `git add -A`、管道显式退出码、main 已授权、两轮对抗评审），另加：
- 每任务实施前先读目标文件当前版本（跨 commit 后快照失效）；sed 批量替换后必须 grep 验证零残留（P0 Task 9 教训：`a` 遮蔽）。
- 新增组件全部走 deps/参数注入（storage/nowMs/回调），禁止直引 `localStorage`/`Date.now()` 于组件体内（workbench 调用点传 `Date.now()` 除外——它是注入点）。
- 既有断言冲突：修断言 + commit 正文注明；禁止弱化语义。

## 10. 最终验证

全量 `npm test` 全绿 + `npm run build` 退出码 0 + `git log --oneline` 序列与任务对应 + `git status --short` 干净。P1 遗留交接（P2 池）：命令面板、Peek、工件持久化、diff 就地查看、卡住检测、成本面板。
