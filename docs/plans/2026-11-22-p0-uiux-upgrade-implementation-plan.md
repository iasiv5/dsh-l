# dsh-l P0 UI/UX 升级 实施计划（2026-11-22）

共识来源：`01_docs/research/dsh-l-uiux-competitor-comparison-2026-11-22.md`（同类项目对比报告）§6 P0 表 + 主人拍板指令（2026-11-22：先做 P0 全部，writing-plans 立项 → 独立评审对抗审核 → main 分支实施 → 实施再对抗审核至一致）。领域词汇遵循 `GLOSSARY.md`；设计纪律遵循 `DESIGN.md`（瓷面工作台）。

## 1. 目标（六项，全部只动 client 层）

| # | 提案 | 对应报告 GAP |
|---|---|---|
| P0-1 | 看板窄面板分组列表化：≤560px 六列退化为按列分组的单列列表；卡片最小信息集；迁移改「推进」+「移至…」菜单；空列引导 | GAP-1 |
| P0-2 | 六态色标系统（running/gating/unread/done/failed/idle）贯穿清单行与会话行 | GAP-2（有意收窄：待我确认三分区**不改分区结构**，色标只落清单行+会话行；报告「分区统一引用」留实施后评估） |
| P0-3 | 待我确认卡片增强：人话标题、三行闸门解释、备注输入并入 note、动词化按钮 | GAP-3（有意收窄：等待时长需 host 摘要新字段，划出 P0；失败卡停止原因以既有 error 文本 + Task 9 就地错误呈现承载，不新增分型枚举） |
| P0-4 | 双空态（真空 vs 过滤空）+ 清除过滤按钮 + 看板空列引导 | GAP-7（有意收窄：空列引导用中性文案，不做跨视图指引——开工路径引导已由 start-hint 承担） |
| P0-5 | 三个 bug 级修复：rolesTab 对话框逃逸 Shadow + `#fff` 兜底；设置面板 2 处硬编码中文；吞错路径就地呈现 | GAP-8/9/12 |
| P0-6 | 清单行元数据脚注（年龄/评论/反应 + PR 草稿） | GAP-4 |

**明确不在本计划范围**（划出，防 scope creep）：等待时长显示（需 host 侧 run 摘要增 `waitingSince` 字段，动 host）、键盘体系/命令面板/pinned search（P1）、G2 干跑预览（P2）、store schema 与全部 `/dsh-l/*` 路由形状（零改动）、`src/host.mjs`/`src/handlers.mjs`/`src/store.mjs`/`src/engine/*`（零改动）。

## 2. 架构快照（本次触点）

- 客户端为 vanilla DOM + Shadow DOM 全量重绘：`workbench.mjs paint()` 整树重建；全部共享样式集中在 `workbench.mjs` 顶部 `CSS` 数组（其余组件无独立样式源）。
- i18n：`makeT(lang)(key)` 平铺字典；三重守护（`npm test` 内跑）——①静态 `t("…")` 字面量 ⊆ zh/en 双字典（`test/i18n.test.mjs`）；②动态前缀 `t("prefix" + …)` 前缀 ⊆ 白名单 `{groups,urgency,gates,validity,recommendedActions,run.status,stages}` 且段键值域**精确等于**白名单（段内不许加新键）（同文件）；③zh/en 键集一致（`test/locale-parity.test.mjs`）。**陷阱：守护正则扫源码原文，注释里出现 `t("…")` 或 `t("xxx" +` 字面模式会误红——新代码注释禁止书写这两类模式。**
- 数据边界（决定 P0-3 文案形态）：
  - `state.runs[]` = `summarizeRun` 投影 `{id,candidateKey,status,waitingGate(nodeId),waitingGateId(G1/G2),currentNodeIds,failedNodeIds,cancelledNodeIds,models,templateId,error}`，**无时间戳、无 nodeStates 明细**。
  - `state.workflow.templates[]` = meta 投影 `{id,name,version,revision,builtin,nodes:[{id,name,type,roleId?}],edgeCount}`，**无 edges、无 rejectTarget、无 gateId**。
  - `state.candidates[]` 含 `meta{comments,reactionsTotal,ageDays}`、`pull{draft,headRef}`、`work`（开工会话索引）、`release{confirmedAt}`、`stage`、`triage`、`currentRunId`。
- 移动触控层（既有红线，不得回归）：`pointer:coarse` 下 button/select/chip min-height 44px、行高 48px、`:host` 滚动修复、ux-narrow/ux-wide 双渲染、`input font-size:16px`。新交互元素必须在该层可用（`<details>` summary 需显式 44px）。

## 3. 全局约束（逐字继承 + 本计划补充）

1. **The Host-Theme Rule**：禁止硬编码浅色底值；语义色固定值只允许出现在点/片段/横幅小面积；文字级语义色必须 `color-mix(in srgb, <语义色> 85%, currentColor)`。本计划新增固定色仅限六态色点与看板列色点（直径 ≤8px 的点）。
2. **The One Voice Rule**：主 CTA 唯一反色（`canvastext` 底 + `canvas` 字）；看板「推进」、放行按钮等一律普通按钮，不得反色。
3. **The Inherited Voice Rule**：不声明 font-family（mono 除外）。
4. **reduced-motion 成对降级**：新增动画必须成对给 `@media (prefers-reduced-motion:reduce)` 关闭；本计划默认不新增动画（六态点不加呼吸，避免与 `.dot.wait` 语义混淆）。
5. **i18n**：全部新 UI 文案走 zh-CN/en 双字典；组件内键一律静态字面量；不新增动态前缀（新分类键用静态 switch/映射调 `t`）；注释不写 `t(…)` 模式（见 §2 陷阱）。
6. **桌面像素红线范围声明**：mobile-touch-ux 计划的「桌面行内像素零变化」红线只约束该计划任务；本计划 P0-6 给桌面行加脚注行、P0-3 重排待我确认卡片、P0-1 改看板卡结构，均为**有意的产品变更**，桌面允许变化；除此之外的桌面样式不做无关改动。
7. 零新依赖；不动 `package.json`；测试框架沿用 `node --test` + `test/client-render.test.mjs` 的 `FakeElement` 桩。
8. 环境：命令在仓库根 `~/workspace/dsh-l` 执行；`npm test` 全量约 9s、`npm run build` 秒级，均可前台跑；验证输出经管道时 `set -o pipefail` 保退出码。
9. 提交：仓库惯例 `feat(scope)/fix(scope)` 前缀 + 中英混述正文；docs 类独立 commit。**main 分支直接提交（主人已明确授权）**；每任务一个 checkpoint commit（Task 0 为两个），不混入无关文件（提交前 `git status --short` 核对清单）。**每任务提交前必须 `npm run build`，重建后的 `lib/client.js`、`lib/host.js` 随本任务 commit 入库**（rev-plan B2）。
10. **测试注入缝（deps seam）**：`api` 是模块单例，`node --test` 无模块替换机制——`mountWorkbench`、`renderKanban`、`renderReview`、`installActions` 四个入口统一增可选尾参 `deps = {}`，内部受测路径（rowActions 的 stage/override/gate/run 系列、kanban 的 stage、review 的 runGate/runRetry/runCancel/releaseConfirm、workbench 的 state/auth/workSessions）经 `const a = deps.api ?? api` 调用；`openSettings`/`repoPicker`/`intake`/`bar` 等未受测路径维持模块 api 直调（seam 范围仅覆盖本计划受测路径，rev-plan S6）。默认路径零行为变化，`index.mjs` 不传 deps。涉及 api 调用断言的新测试一律经 deps 注入桩。
11. **既有断言冲突处置**：清单行新增状态点/脚注可能触碰 client-render 既有断言（若存在按子节点数/精确结构的断言）。处置原则：语义变更导致的断言失败**修断言并在 commit 正文注明**，不许为绿弱化被测语义。

## 4. 基线处理（先落账既有未提交工作）

现场 `workbench.mjs`（hint 移到板块标题下）与 `test/client-render.test.mjs`（disc Task 1 测试）有未提交改动——是主人 2026-11-22「开工路径可发现性计划」的收尾（该计划文档与 lib 产物已随 `70e41cb` 入库），全量 308 用例已实测绿。先重建 lib 指纹并独立落账，保证 P0 基线干净、对抗评审 diff 可读。

## 5. 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/client/logic.mjs` | 修改 | 新增纯函数：`formatAge(ageDays)`、`candidateState({candidate, run, seen})`（seen 布尔）、`sessionState(item, summary)`、`advanceStageOf(stage)`、`gateWaitInfo({run, template})`、`prettyKey(key)`。logic 层保持零 i18n/DOM 依赖 |
| `src/client/components/stateDot.mjs` | **新建** | `stateDotEl(state, t)` → 返回状态点 span（class `stdot st-<state>`，title=静态 switch 的 `t("stateDot.<state>")`）。六态键的唯一静态映射点 |
| `src/client/components/candidateRow.mjs` | 修改 | 行内加状态点（opts 增 `run`、`seen`）+ 标题下 `.rowmeta` 脚注（年龄/评论/反应/PR 草稿） |
| `src/client/components/kanban.mjs` | 重写 | 列头（列色点+名+计数）、卡片最小信息集、推进按钮 + `<details>` 移至菜单、空列引导、错误 chip。`renderKanban(container,{t,candidates,view})` 签名不变 |
| `src/client/components/sessionsView.mjs` | 修改 | 行首加状态点（`sessionState`） |
| `src/client/components/review.mjs` | 修改 | 卡片重构：人话标题、三行解释、备注输入、动词化按钮、卡片级错误就地呈现 |
| `src/client/components/rolesTab.mjs` | 修改 | 对话框 append 目标 `document.body`→`wrap`；overlay/卡片底色换 canvas 语义 token |
| `src/client/components/actions.mjs` | 修改 | `openSettings` 3 处硬编码中文换 `t()`；`rowActions` 的 `go()` 失败写入 detail 内错误行 |
| `src/client/components/workbench.mjs` | 修改 | `CSS` 数组新增六态 token/看板/脚注样式；清单空态按过滤分叉；`renderRow` 调用传 `run/seen`（`seenRuns` Set，展开终态 run 行时记账） |
| `src/client/locale/zh-CN.mjs`、`en.mjs` | 修改 | 新键（见 §6 键表），双字典同步 |
| `test/logic.test.mjs` | 修改 | 六态真值表、sessionState 五态+孤儿行、formatAge、advanceStageOf、gateWaitInfo、prettyKey 用例 |
| `test/client-render.test.mjs` | 修改 | candidateRow 脚注/状态点、kanban 新结构、review 卡片、rolesTab 对话框归位、settings 无硬编码（grep 断言）、空态两态、会话行状态点 DOM 断言（Task 6 断言移此处，`test/sessions-view.test.mjs` 本计划不动） |
| `DESIGN.md` | 修改 | colors 增 unread-blue；Do 增「六态词汇必须复用 st-* token」一条 |
| `lib/client.js`、`lib/host.js` | 随任务重建入库 | 跟踪的 esbuild 构建产物；`buildId()` 对整个 src/ 树做 sha256，**任一 src 改动 + `npm run build` 后两文件同时变脏**——每任务 commit 一并入库（`70e41cb` 惯例），否则「工作树 clean」验收永不可达（rev-plan B2） |

## 6. i18n 新键表（zh / en 成对，全部静态消费）

```
stateDot.running   执行中 / Running
stateDot.gating    待你处理 / Needs you
stateDot.unread    有未看结果 / Unseen results
stateDot.done      已完成 / Done
stateDot.failed    失败 / Failed
stateDot.idle      常规 / Idle
kanban.advance     推进 / Advance
kanban.moveMore    移至… / Move to…
emptyStates.filtered      当前过滤下没有候选。 / No candidates match the current filters.
emptyStates.clearFilters  清除过滤 / Clear filters
emptyStates.kanbanCol     此阶段暂无候选 / Nothing at this stage
candidate.draft    草稿 / draft
review.notePlaceholder    备注（可选，随动作留痕） / Note (optional, recorded with the action)
review.gateWait    上游 {nodes} 已完成，run 停在 {gate} 等你放行。 / Upstream {nodes} finished; the run is paused at {gate} for your approval.
review.gateWaitGeneric    run 停在 {gate} 等你放行。 / The run is paused at {gate} for your approval.
review.gatePassEffect     放行后继续：{next} / After approval: {next}
review.gateRejectGeneric  驳回将按该闸门配置的回退目标重跑后续节点。 / Rejecting re-runs downstream from this gate's configured fallback target.
review.passBtn     放行（继续下游） / Approve (continue)
review.rejectBtn   驳回（回退重跑） / Reject (rework)
errors.actionFailed       操作失败 / Action failed
settings.concurrency      并发上限（1–4） / Concurrency (1–4)
settings.hostDefault      默认模型： / Default model:
settings.hostDefaultLoading 加载中… / loading…
settings.hostDefaultNone  （宿主未配置） / (host default not configured)
```

不新增动态前缀；`{nodes}/{gate}/{next}` 占位沿用 `badge.pending` 的手动 `replace` 惯例。

## 7. 六态判定契约（Task 3 Produces，后续任务 Consumes）

`candidateState({candidate: c, run, seen})` → `"running"|"gating"|"unread"|"done"|"failed"|"idle"`；`seen` 为**布尔**（workbench 持有 `seenRuns` Set，调用处换算，logic 层不收集合）。优先级从高到低：

1. `failed`：`run?.status === "failed"`
2. `gating`：`c.stage === "gating"` ∨ `run?.status === "waiting"` ∨（`c.stage === "shipped"` ∧ `!c.release?.confirmedAt`）——G1 待拍板 / G2 待放行 / G3 待发版统一为「待你处理」
3. `unread`：`run?.status === "succeeded"` ∧ `!seen`
4. `running`：`run?.status === "running"` ∨ `c.stage ∈ {building, verifying}`
5. `done`：`c.stage === "shipped"`（已确认发版）
6. `idle`：其余（inbox/triaged/held/closed 无活跃 run）

`sessionState(item, summary)`：`summary?.running` → running；`item.candidate?.stage ∈ {building,verifying}` → running；`item.kind === "work"` ∧ `stage === "gating"` → gating；`stage === "shipped"` → done；其余 idle。会话行 P0 不做 unread（run 终态在会话行的感知留 P1）。

`advanceStageOf(stage)`：`inbox→"triaged"`、`triaged→"gating"`、其余→`null`（正向链只有两跳；gating 之后属闸门语义，看板不带）。

`gateWaitInfo({run, template})` → `{gateId, upstreamNames[], nextNames[]}`：取 `template.nodes` 中 waitingGate（nodeId=`run.waitingGate`）的下标 i；`upstreamNames` = 下标 <i、type≠"gate"、不在 failed/cancelled 集的节点 name；`nextNames` = 下标 >i、type≠"gate" 的节点 name（对两个内置线性模板精确；用户非线性模板按定义序近似，文案不承诺边语义）。占位替换惯例：`{nodes}` 多名以 `", "` 连接、`{next}` 多名以 `" → "` 连接（rev-plan S1 全文统一口径）；`{gate}` 替换源钉死为 `t("gates." + (r.waitingGateId ?? (r.waitingGate ?? "").toUpperCase()))`（与现网 review.mjs 按钮文案同款，防 nodeId 混入，rev-plan S9）；`upstreamNames` 空时第 1 行改用 `review.gateWaitGeneric`，`nextNames` 空时省略 gatePassEffect 行。**不做 rejectTarget 解析**（meta 无该字段），驳回后果走 `review.gateRejectGeneric`。`formatAge(ageDays)`：`ageDays < 1 → "<1d"`，否则 `Math.round(ageDays) + "d"`（纯数字逻辑，无文案 i18n）。

CSS token（进 `workbench.mjs` CSS）：

```
.stdot{width:8px;height:8px;border-radius:50%;flex:none}
.st-running{background:#2da44e}
.st-gating{background:#d29922}
.st-unread{background:#4493f8}
.st-failed{background:#d1242f}
.st-done{background:color-mix(in srgb,currentColor 45%,transparent)}
.st-idle{background:color-mix(in srgb,currentColor 22%,transparent)}
```

看板列色点 `kbdot kbcol-<id>`（inbox/currentColor 30%、triaged #4493f8、gating #d29922、building #324DE2、shipped #2da44e、closed currentColor 22%）。

## 8. 任务清单（顺序执行；每任务红→绿 + checkpoint commit）

> TDD 纪律：每任务先写失败测试（或失败检查），跑红，再最小实现，跑绿，commit。验证命令一律仓库根执行。

### Task 0：基线落账（无新代码变更；修正确认清单——rev-plan B1/B2）

1. `cd ~/workspace/dsh-l && git status --short` 核对**恰为**：`M src/client/components/workbench.mjs`、`M test/client-render.test.mjs`、`?? docs/plans/2026-11-22-p0-uiux-upgrade-implementation-plan.md`。说明：`docs/plans/2026-11-22-work-start-discoverability-plan.md` 已随主人 commit `70e41cb` 入库（勿再 add）；lib 产物与 src 现场不同步（主人收尾改动未重建），本任务一并落账。
2. `npm run build` 重建基线指纹 → `git add src/client/components/workbench.mjs test/client-render.test.mjs lib/client.js lib/host.js && git commit -m "fix(workbench): start-hint 置于分诊板块标题下（work-start-discoverability 收尾）+ disc Task 1 首位按钮测试 + 基线 lib 同步"`（仓库惯例：lib 随改动同 commit，`70e41cb` 判例）。
3. `git add docs/plans/2026-11-22-p0-uiux-upgrade-implementation-plan.md && git commit -m "docs(plans): P0 UI/UX 升级实施计划入库（rev-plan 对抗审核通过稿）"`。
4. 验证：`npm test` 全绿（308+），`git status --short` 干净。
   预期：全绿；工作树 clean。

### Task 1：rolesTab 对话框归位 Shadow DOM + 主题 token（P0-5a）

1. 红：`test/client-render.test.mjs` 新用例——`renderRolesTab(container, {t, workflow:{templates:[]}, view})` 后（api.rolesList 经 stub 环境 fetch 失败走 `.catch(() => paint())`，roles=[] 无行卡）**点击工具条「新增角色」按钮**打开对话框（rev-plan S4 路径修正）：断言 `byClass(container, "rtOverlay")` 命中（实现加类，见绿步骤）、其 `style.cssText` 含 `position:fixed`、其子树 box 元素底色为 canvas 语义（style 串含 `canvas`），且 `container` 子树内可寻获（不依赖 `document.body`——测试桩无 body，现实现按旧路径会直接 throw）。
2. 绿：`rolesTab.mjs` `openDialog`：`document.body.append(dlg)` → `wrap.append(dlg)`；`dlg.className = "rtOverlay"`（新增，供测试定位）；overlay 背景 `color-mix(in srgb,black 40%,transparent)` → `color-mix(in srgb,canvas 55%,transparent)`；`box` 背景 `var(--dsh-bg,#fff)` → `background:canvas;color:canvastext`。关闭路径不变（`dlg.remove()` 对挂载点无感知）。**行为变化声明（rev-plan S5）**：`.workSurface` 带 `backdrop-filter`，按 CSS 规范成为 fixed 后代的包含块——遮罩覆盖范围从整个应用视口收窄为插件面板区；侧栏场景下这避免遮罩盖住宿主侧栏外区域，属**有意变更**，commit 正文注明。
3. 验证：`npm test`（新增用例绿、既有 roles 相关用例不红）；`npm run build` 成功。
4. Commit：`fix(roles-tab): 对话框回归 Shadow DOM 并改宿主主题 token（Host-Theme Rule；遮罩范围随包含块收窄为面板区，有意变更）`。

### Task 2：设置面板硬编码中文入双字典（P0-5b）

1. 红：`test/client-render.test.mjs` 新用例——读 `src/client/components/actions.mjs` 源文本，断言不含 `"并发上限（1–4）"`、`"默认模型："`、`"（加载中）"`、`"（宿主未配置）"` 四个字面量（rev-plan S8 钉死回潮面）；`makeT` 后 `settings.concurrency` 等新键 zh/en 均可取值（键存在性由 i18n 守护兜底，此用例钉死源码无硬编码回潮）。
2. 绿：`zh-CN.mjs`/`en.mjs` 增 §6 settings 四键；`actions.mjs` 三处替换——`concLabel.textContent = t("settings.concurrency")`；`hostDefaultRow` 初始文案 `t("settings.hostDefault") + t("settings.hostDefaultLoading")`；`.then` 内 `hostDefaultRow.textContent = t("settings.hostDefault") + (r.hostDefault ? r.hostDefault.provider + " / " + r.hostDefault.model : t("settings.hostDefaultNone"))`。
3. 验证：`npm test`（i18n 静态键守护 + locale-parity 绿）。
4. Commit：`fix(settings): 并发上限/默认模型文案入 i18n 双字典（推翻 M8 D7 零新键权衡，属主人 P0 拍板）`。

### Task 3：六态纯函数 + stateDot 组件（P0-2 核心 Produces）

1. 红：`test/logic.test.mjs` 新用例——
   - `candidateState` 真值表（seen 传布尔；每条夹具显式给出 stage/release/run 三要素，rev-plan S2）：
     `{stage:"gating", run:{status:"failed"}}` → failed（优先级 1 压过 gating）｜`{stage:"inbox", run:{status:"waiting"}}` → gating｜`{stage:"triaged"}` → idle｜`{stage:"gating"}` → gating｜`{stage:"shipped", release:null}` → gating｜`{stage:"building", run:{status:"succeeded"}, seen:false}` → unread｜`{stage:"shipped", release:{confirmedAt:"x"}, run:{status:"succeeded"}, seen:true}` → done｜`{stage:"shipped", release:{confirmedAt:"x"}}` → done｜`{stage:"building", run:{status:"running"}}` → running｜`{stage:"verifying"}` → running｜`{stage:"closed"}` → idle。
   - `sessionState` 四态；`advanceStageOf` 三值；`formatAge(0.5|3|30)` → 「今天/3d/30d」形态（en 下同数字逻辑，纯函数只产 `n+"d"` 或 `"0d"`——显示层不加「今天」文案，避免 i18n 依赖：约定 `ageDays<1 → "<1d"`）。
   - `gateWaitInfo`：loop-v1 形状 fixture（nodes 与 builtin 同序）+ waitingGate="g2" → upstream=["build","verify"]（name），next 含 "发起 MR"；waitingGate="g1" → upstream 空；template 缺席 → 两数组空。
   - `prettyKey("iasiv5/dsh-m#pull#12")` → `"iasiv5/dsh-m#12"`；issue 同理；畸形键原样返回。
2. 绿：`logic.mjs` 按契约 §7 实现六个纯函数。
3. 新建 `src/client/components/stateDot.mjs`：`stateDotEl(state, t)` 静态 switch 六键（i18n 守护覆盖）；同任务在 `zh/en` 字典加 `stateDot.*` 六键（否则守护红，属本任务绿条件）。
4. 验证：`npm test`。
5. Commit：`feat(logic): 六态判定/推进链/闸门解释/键美化纯函数 + stateDot 组件（P0-2 数据层）`。

### Task 4：清单行状态点 + 元数据脚注（P0-2a + P0-6）

1. 红：`test/client-render.test.mjs` 新用例——`renderRow(sec, candidate, t, {expanded, run, seen, onToggle, actions})`：
   - 有 failed run 的候选：行首 `stdot st-failed` 在场且 title=`t("stateDot.failed")`；
   - succeeded run 未 seen → `st-unread`；seen 后（`seen:true`）→ 非 unread；
   - `meta:{ageDays:3, comments:4, reactionsTotal:2}` → `.rowmeta` 文本含 `"3d"`、`"4"`、`"2"`；
   - `pull:{draft:true}` → 脚注含 `t("candidate.draft")`；meta 缺省 → 脚注段不渲染（不输出空行）。
2. 绿：
   - `workbench.mjs`：`logic.mjs` import 行增 `runBlock`（现未导入，rev-plan S10）；`CSS` 增 `.stdot/.st-*/.rowmeta` 样式；闭包增 `const seenRuns = new Set()`；`paint` 内 `renderRow(sec, c, t, { expanded, onToggle, actions, run: runBlock(c, state?.runs ?? []), seen: seenRuns.has(c.currentRunId) })`；`onToggle` 展开分支增：该候选 run 存在且终态（succeeded/failed/cancelled）时 `seenRuns.add(c.currentRunId)`（failed/waiting 不受 unread 判定影响，记账无害）。
   - `candidateRow.mjs`：`renderRow` opts 增 `run`/`seen`；行首插入 `stateDotEl(candidateState({candidate: c, run, seen}), t)`（§7 契约签名）；并把脚注格式化抽为**导出函数** `export function metaFootnote(candidate, t)`（返回 span 或 null）——Task 5 看板卡复用同一实现，禁止两处各写一份；行 title 按钮内加 `<span class="rowmeta">`（`display:block;font-size:11px;opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`）：`[formatAge] · 💬n · ▲n`，至少一项存在才渲染；`pull.draft` 追加 `t("candidate.draft")` 段。
   - `zh/en` 增 `candidate.draft`。
3. 验证：`npm test`；`npm run build`。
4. Commit：`feat(list): 行内六态状态点 + 年龄/评论/反应元数据脚注（P0-2/P0-6）`。

### Task 5：看板分组列表化 + 卡片信息集 + 推进/移至（P0-1）

1. 红：`test/client-render.test.mjs` 新用例——
   - `renderKanban` 输出：每列 `.kbcol` 含列头（`.kbhead`：列名 + 计数）与 `.kbdot`；
   - 卡片含标题、类型徽章文本（PR/Issue）、`meta.ageDays` 脚注；
   - inbox 卡有且仅有一个「推进」按钮（文本含 `t("kanban.advance")`），`renderKanban(wrap, {t, candidates, view, deps: {api: stageStub}})` 注入桩记录 `(key, stage, note)` 调用参数并断言 `stage==="triaged"`（note 用既有惯例中文留痕字面量「看板推进」，与现网「看板迁移」同性质：数据留痕非 UI 文案，不入字典）；
   - `<details class="kbmove">` 内目标按钮集合 = 白名单移除当前阶段；building/verifying 列卡片无迁移按钮且无菜单；
   - 空列含 `t("emptyStates.kanbanCol")` 文本节点。
2. 绿：
   - `logic.mjs` 增 `advanceStageOf`（若 Task 3 已含则跳过，Consumes）。
   - `kanban.mjs` 重写：签名 `renderKanban(container, { t, candidates, view, deps = {} })`，内部 `const a = deps.api ?? api`；容器 `.kb`（`display:flex;gap:10px;padding:12px 16px;align-items:flex-start;overflow-x:auto`）；列 `.kbcol{flex:1;min-width:150px;...}`；列头 `.kbhead`（`.kbdot kbcol-<id>` + `t("groups."+col.id)` 动态前缀既有白名单 + 计数）；卡片 `.kbcard`：`stateDotEl` + 类型徽章 + 标题（两行 clamp `-webkit-line-clamp:2`）+ 紧急度 chip（`triage.urgency` 在场时）+ 脚注复用 `candidateRow.mjs` 导出的 `metaFootnote(candidate, t)`；movable 卡主动作行 = `advanceStageOf(c.stage)` 非空时「推进」按钮（`a.stage(key, next, "看板推进")`，失败走 Task 9 错误 chip，先接占位 catch——**顺序依赖**：Task 9 在本任务后统一接入）；`<details class="kbmove"><summary>t("kanban.moveMore")</summary>` 内白名单目标按钮（排除当前阶段；gating 目标按钮仍直接 `a.stage`——迁入待拍板不设确认弹层，P0 范围外）；空列 `.kbempty`。
   - `workbench.mjs` CSS 增：`@media (max-width:560px){.kb{flex-direction:column;overflow:visible}.kbcol{width:100%;min-width:0}.kbhead{position:sticky;top:0;background:color-mix(in srgb,canvas 92%,transparent);z-index:1}}`；`coarse` 层增 `.kbmove summary{min-height:44px;display:flex;align-items:center}`。
   - `zh/en` 增 `kanban.advance/kanban.moveMore/emptyStates.kanbanCol`。
3. 验证：`npm test`；`npm run build`。
4. Commit：`feat(kanban): 窄面板分组列表化 + 卡片最小信息集 + 推进/移至菜单 + 空列引导（P0-1）`。

### Task 6：会话行状态点（P0-2b）

1. 红：**DOM 断言写进 `test/client-render.test.mjs`**（该文件有 document 桩且已有 renderSessionsView DOM 测试先例；`test/sessions-view.test.mjs` 无 document 桩，render 断言在那儿会 crash 而非干净变红——rev-plan S3）：running summary → 行首 `st-running`；work+building → `st-running`；work+gating → `st-gating`；shipped → `st-done`；普通 work → `st-idle`；孤儿行（items 外的 summary 兜底行）→ 有 running 时 `st-running`、否则 `st-idle`。另在 `test/logic.test.mjs` 直测 `sessionState` 纯函数同五态 + 孤儿行（`item=null` 时仅 `summary.running` → running，其余 idle）。
2. 绿：`logic.mjs` `sessionState(item, summary)` 含孤儿行分支；`sessionsView.mjs` 行渲染首格插 `stateDotEl(sessionState(item, summary), t)`；`zh/en` 无新键（复用 stateDot.*）。
3. 验证：`npm test`。
4. Commit：`feat(sessions): 会话行六态状态点（P0-2）`。

### Task 7：待我确认卡片增强（P0-3）

1. 红：`test/client-render.test.mjs` 新用例——构造 `runs=[{...waiting run, waitingGate:"g2", waitingGateId:"G2", templateId:"loop-v1", currentNodeIds:["g2"]}]`、`candidates=[同 key 候选]`、`templates=[loop-v1 meta fixture（nodes 与 builtin 同序）]`，`renderReview(wrap, {t, candidates, runs, view, deps: {api: gateStub}})`：
   - gate 卡标题含 `prettyKey` 形态（`iasiv5/x#12`）与候选 title，不含原 `#pull#` 键形态；
   - 卡内解释行含 `review.gateWait` 替换产物（upstreamNames=["build","verify"]，以 `", "` 连接替换 `{nodes}`；文本含 build、verify 与 `t("gates.G2")`）；`runs` 缺 template 命中时改含 `review.gateWaitGeneric` 产物；
   - 含 `t("review.passBtn")`/`t("review.rejectBtn")` 按钮，pass 按钮 onclick 调 `gateStub.runGate(id,"g2","pass", <输入框值>)`（断言 note 参数 = 备注输入框文本）；
   - 卡内含备注输入框（placeholder=`t("review.notePlaceholder")`）；
   - G3 卡同构：标题 humanize + 备注框 + `gateStub.releaseConfirm(key, note)`。
2. 绿：
   - `review.mjs` 重构：签名 `renderReview(container, { t, candidates, runs, view, deps = {} })`（`const a = deps.api ?? api`）；`card()` 标题行 = `prettyKey(key) + " " + title`；gate 卡解释区：第 1 行 `gateWait`（upstreamNames 以 `", "` 连接替换 `{nodes}`；空 → `gateWaitGeneric`）、第 2 行 `gatePassEffect`（nextNames 以 `" → "` 连接；空 → 省略行）、第 3 行 `gateRejectGeneric`；每卡备注 `<input class="rvnote">`（placeholder=notePlaceholder）；按钮文案换 passBtn/rejectBtn（G3 保持 `t("review.confirm")`）；`act` 改造接收卡片 err 元素（接口为 Task 9 预留：`act(fn, errEl)`）。
   - `zh/en` 增 `review.notePlaceholder/review.gateWait/review.gatePassEffect/review.gateRejectGeneric/review.passBtn/review.rejectBtn`。
3. 验证：`npm test`；`npm run build`。
4. Commit：`feat(review): 待我确认卡片三行解释 + 人话标题 + 备注留痕 + 动词化按钮（P0-3）`。

### Task 8：清单双空态 + 清除过滤（P0-4）

1. 红：`test/client-render.test.mjs` 新用例——经 `mountWorkbench(shadow, { getLang, build: "t", extend: 无, deps: { api: stateStub } })` 挂载（若文件内已有 mount 用例形态则沿用其 stub 约定；`stateStub.state` 返回含 1 候选与空 runs 的最小 state，`auth` 返回绑定态，`workSessions` 返回空）：
   - 有候选且 filters 全默认 → 不出现 `t("emptyStates.filtered")`；
   - filters.type 设为与现有候选不匹配的值（如候选全为 issue 时选 PR——repo 维度下拉选项来自候选仓集合、恒有命中不可达，改走 type 维度，rev-plan S10）→ 出现 filtered 文本 + `t("emptyStates.clearFilters")` 按钮，点击后 filters 复位（再次断言 filtered 消失）；
   - 无任何候选 → `t("emptyStates.backlog")`。
2. 绿：`workbench.mjs` 清单空态分支——`const filtersActive = filters.type!=="all"||filters.repo!=="all"||filters.urgency!=="all";`，`list.length===0` 时三分支渲染；清除过滤按钮复位 `filters` 三键后 `paint()`。`zh/en` 增 `emptyStates.filtered/emptyStates.clearFilters`（kanbanCol 已在 Task 5 入典）。
3. 验证：`npm test`。
4. Commit：`feat(workbench): 清单双空态 + 一键清除过滤（P0-4）`。

### Task 9：吞错路径就地呈现（P0-5c）

1. 红：`test/client-render.test.mjs` 新用例（一律经 §3-10 deps 桩注入，reject 用 `async () => { throw new Error("boom"); }`）——
   - `installActions` 产出 hooks 后调 `rowActions`：stub `a.stage` reject → 展开 detail 内出现含 `t("errors.actionFailed")` 与错误消息的元素；成功路径无残留；
   - `renderReview`：stub `a.runGate` reject → 对应卡片出现错误文本；成功后清除；
   - `renderKanban`：stub `a.stage` reject → 卡片出现错误 chip（Task 5 占位 catch 在此转正）。
2. 绿：
   - `actions.mjs` `rowActions`：detail 顶部预留 `errLine`（`small` 元素，默认 display:none）；`go()` 失败分支 `errLine.textContent = t("errors.actionFailed") + " (" + msg + ")"; errLine.style.display="block"`，成功分支复位；
   - `review.mjs`：`act(fn)` → `act(fn, errEl)`，失败写 `errEl`（卡内 `rverr` 元素），成功清空；
   - `kanban.mjs`：卡片迁移按钮 catch → 卡内 `.kberr` chip（crimson，`color-mix(in srgb,#d1242f 85%,currentColor)` 文字混色符合规范）；
   - `zh/en` 增 `errors.actionFailed`。
3. 验证：`npm test`。
4. Commit：`fix(uiux): 行内/收件箱/看板吞错路径就地呈现（P0-5c）`。

### Task 10：DESIGN.md 同步 + 最终验证

1. `DESIGN.md`：colors 增 `state-unread: "#4493f8"`；Do 清单增一条：**Do** 状态语义一律复用 `st-*` 六态 token（running/gating/unread/done/failed/idle），新视图不得自造状态色。
2. 最终验证（全绿才算完成）：
   - `npm test`（全部用例 + 三重 i18n 守护 + locale-parity）；
   - `npm run build`（lib/host.js + lib/client.js 构建指纹更新）；
   - `git log --oneline -13` 核对提交序列（Task 0 两个 + Task 1..10 各一，共 12 个，无混入）；
   - `git status --short` 干净。
3. Commit：`docs(design): 六态色板 token 与 Do 条目（P0 收尾同步）`。
4. 遗留交接：等待时长（host 摘要增 waitingSince）、会话行 unread、键盘体系、pinned search → P1 池（报告 §6），不在本计划。

## 9. 执行纪律

- 开始实现前先批判性复查本计划；发现缺项/矛盾/与仓库现实不符，先修计划再动手。
- 按任务顺序执行，不无声跳步、合并或改目标；每任务跑其验证并贴出结果。
- 遇阻塞或重复失败，停下说明，不猜。
- 提交前 `git status --short` 核对本任务文件清单，严禁 `git add -A`/`git add .`。
- `npm test`/`npm run build` 均前台执行（实测 <90s）；管道验证带 `set -o pipefail`。
- 本计划获独立评审 subagent 对抗审核通过后，在 main 分支直接实施（主人 2026-11-22 明确授权）；实施完成后由第二独立评审 subagent 对抗审核实施产物，分歧修复至一致。
