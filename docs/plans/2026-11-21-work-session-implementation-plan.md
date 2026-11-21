# 开工会话（Work Session）实施计划

> 评审闭环版：并入评审 R1–R4 全部 23 项发现（阻断 2 / 重要 9 / 建议 12）与红线复核意见；独立评审台账见 `.dsh-research/work-session-plan-review-scratch/ledger.md`。

## 目标

- 打通「挑选候选 → G1 放行双出口 → 我来开 → 新建 DSH 普通会话（工作区可设定）→ 跳转会话」的完整链路：会话由官方会话系统全权承载（普通会话、原生模型切换、原生审批 UI），dsh-l 只留薄索引与导航。
- G1 放行出口从唯一（引擎）变为二选一：`POST /dsh-l/run/start`（引擎，既有）｜`POST /dsh-l/work/start`（开工会话，新增）。
- v1 落齐配置面 schema：`settings.workSessionModel / workSessionPreset / workSessionApprovalPolicy`（工作台设置 UI 可编辑；审批策略仅创建时生效，`'never'` 需确认弹窗；无 YAML 配置键）。
- 工作台新增「会话」板块：开工会话（含历史另开）∪ 引擎执行行 ∪ **前缀兜底发现行**（重装后无索引也能找回，Q6），状态徽章 + 打开/另开/确认交付动作。
- 三条里程碑：M1 最小闭环（通道+配置 schema）→ M2 工作区选择器（含托管克隆 API 面与 sweeper 保全）→ M3 会话板块 + 确认交付。

## 架构快照

- **会话创建**（`composeWorkWorld(services)` 工厂，host.mjs 以 ctx 服务实例化）：`ctx.agents.create({ sessionId, meta: { cwd, agentPreset? }, agentOptions, setup })` → `ctx.workingDirectory.set(handle.agent, cwd)`（`meta.cwd` 只落会话头，工具实际目录必须二跳设置——autoloop `dsh/src/host.ts:83-97` 判例）→ 显式配置时 `ctx.approval.setPolicy(agent, policy)` → `handle.agent.send(userMessage(kickoff), "next-turn", true)` 自动发车（triage `send` 判例）。**调用序即红线**：send 必须晚于 workingDirectory.set 与 setPolicy（否则首个 turn 工作目录不对）。
- **模型/preset 三分支**（R1-6/R2-3）：「显式模型在场」判定 = `resolveAgentSelection` 自身 validity（provider+model 非空串；非法形状视同未设置，落入二/三分支）；显式 `workSessionModel` → `agentOptions = resolveAgentSelection(model, hostDefault)` 且 setup 内 select；preset 在场且无显式模型 → **agentOptions 不传、setup 不 select**（preset 自带组合生效；preset 无模型则落部署默认）；两者皆无 → agentOptions 不传、不 select（部署默认 preset+模型）。`agentOptions` 是「Route fallback and output controls」，非空即压过 preset 自带模型，故不能恒传。**reasoningEffort 在场即透传**（`resolveAgentSelection` 增量：显式 effort 存在则带入 agentOptions，否则 undefined——triage 存储形态从无 effort，行为不变；v1 设置 UI 不提供 effort 控件，仅 API 可设）。
- **postWorkStart 守卫序**（R1-2/R1-3 定稿）：
  1. requireAuth → 候选存在(404)；
  2. `active = store.getWorkSession(key)`；
  3. active 且 !another 且（cwd==null 或 cwd===active.cwd）→ 直接返回 `{sessionId, reused:true}`——**零记账、零 world 调用、不发 kickoff**（幂等重开，Q15①）；
  4. active 且 !another 且 cwd≠active.cwd → 409 `work-cwd-conflict`（早守卫，先于一切记账）；
  5. fresh（无 active）：`engine.hasAliveRun` → 409 `run-already-active`（先于闸门，沿用既有判例）→ stage≠gating → 409 `gate-requires-gating` → 工作区解析（**422/502 早守卫，先于 setGate，失败零记账**——见第 7 条）→ `buildTaskPackage` + `setGate(G1 pass)` + `setStage(building)`；
  6. another=true：要求 `c.gates.G1?.decision === "pass"`（否则 409 `gate-requires-gating`——未过 G1 不得开会话）；**workspace:"managed" 时先 `engine.hasAliveRun` → 409 `run-already-active`**（R3-1：托管目录与引擎 run 共享 `dirOf(key)` 同一工作树——engine.mjs `ensure({branch:"dsh-l/"+runId})` 与节点 `cwd=dirOf(key)`——活跃 run 期间同树 checkout work 分支会打断引擎节点；local cwd 与引擎目录无关，不守）；不重复 setGate、不动 stage；新会话照常发 kickoff；
  7. 工作区解析（fresh 与 another 同规，早守卫语义）：body `workspace ∈ "local"(缺省)|"managed"`——managed → `makeWorkspace.ensure(repo, branch)`（branch=`work-<type>-<number>`，已存在则复用；失败 502 `managed-clone-failed`），cwd=返回目录；local → cwd 显式或 `resolveLocalWorkspace(repo, {home, stat})`（`join(home,"workspace",repoName)` isDirectory 命中；失败 422 `workspace-not-found`）。**响应契约**（R2-4②）：reuse → `{ok, sessionId, reused:true, taskPackage:null}`；fresh/another → `{ok, sessionId, reused:false, taskPackage: pkg}`（another 的包为本次 kickoff 新建）。
- **创建事务与回滚**（R1-3）：顺序 = create → send(kickoff) → appendWorkSession + recordHistory；send 失败 → **回滚 dispose（先于 appendWorkSession）** → 500 `kickoff-failed`。红线②据此定例外条款（见全局约束）。
- **复用语义**：索引 `workSessions[key]`（数组，末位=活跃）；命中同 cwd 复用（零宿主操作——Q9 不 resume；官方 UI 打开冷会话是原生能力）；「另开」= 追加新行（旧会话保留留档）；sessionId 恒新生成 `dsh-l:work-<epoch36>-<rand6>`（永不以已存在 id 调 create，无 cwd 采纳冲突面）。索引指向的会话若已被用户删除/归档：客户端列表成员资格判定 + 「另开」兜底重建（见会话板块）。
- **UI 入口三形态与数据通道**（R1-2/R2-1/R2-4③/R3-2）：形态 1「G1 · 我来开」（gating fresh；**重试态**：G1 pass 且 stage=building 且无活跃行——kickoff 失败后的恢复出口，走 another:true 重建）与形态 2「打开会话」（有活跃行候选、任意 stage，直接 `openSession(active.sessionId)` 不走 work/start）落 **M1**（Task 5）；形态 3「另开」落 **M3**（Task 12，候选详情 + 板块行同步提供）。数据通道 = `getState` 的候选 digest 并入活跃行摘要 `work: {sessionId, cwd, approvalPolicy, updatedAt} | null`——M1 起刷新/重开后客户端仍可渲染形态 2/3 与按钮可用性判断。kickoff 失败（回滚后）候选留痕 `work-session.kickoff-failed`，靠重试态出口恢复，不困死。
- **kickoff 首条消息**：首行 = 锚行 `[dsh-l] {repo}#{number} {issue|PR} · {title}`——固定 ASCII 前缀（Q14），类型词 issue|PR 为有意扩展（同仓 issue/PR 同号消歧，不违 Q14 的 ASCII 与固定前缀约束）；超 72 字符截断保前缀。随后人类可读块（链接/分诊结论与理由/目标/真实默认分支/工作区路径/建议首步）+ 完整任务包 JSON 围栏（复用 `buildTaskPackage` 产物）。语言跟随界面 `lang` 参数。
- **导航**：client `ctx.uiWorkspace.openSession(sessionId)`（dsh-client-ui-workspace 服务；schedule 面板判例）；守卫 = `ctx.sessions.list.getSnapshot()` 的 `ids` 含该 id 才启用，守卫整体 try/catch 包裹（cordis 对未 inject 属性的 get 即抛，可选链挡不住 getter throw——本仓 host.mjs L24-25 注释判例）；**M1 即注入 `sessions` 服务**（R1-7），失败 toast 兜底文案。
- **配置 resolve 链**：`resolveAgentSelection(settings.workSessionModel, ctx.agentDefaultModel.currentSelection())`（自 `resolveTriageSelection` 泛化抽出）；优先级 显式 > preset 自带 > 宿主默认（三分支见上）；`meta.agentPreset = settings.workSessionPreset ?? undefined`；`settings.workSessionApprovalPolicy ∈ null|'ask'|'never'`，null = 宿主部署默认且**不调用** setPolicy。putSettings 逐键白名单扩展（校验规则见 Task 6）。
- **会话板块数据**：`GET /dsh-l/work/sessions` 返回索引全量（含另开历史）∪ 引擎 run 行（run 行 sessionId 读自 nodeStates 持久化字段——Task 10 落地，旧 run 无字段则 null 降级）；client 订阅 `ctx.sessions.list` 做**富化**（running/updatedAt/cwd/displayTitle/blank，client 侧字段集）与**兜底发现**（R1-1/R2-2：id 不在索引∪run 集合、且标题以 `[dsh-l] ` 开头**或** id 以 `dsh-l:work-` / `dsh-l:run:` 开头的会话生成兜底行——work 孤儿行经 `parseWorkAnchor` 反解候选标识，反解失败只显原标题、不给确认交付动作；run 孤儿行只给「打开」按钮，无候选绑定、无确认交付——其标题无锚行（executor prompt 不走锚行格式），仅 id 腿可捞）。排序纯函数 `sortSessionRows`：running 置顶，其余 updatedAt 倒序。归档对账（R1-11）：id 不在列表 ids → 行状态「不在会话列表（可能已归档或已删除）」、行动作只留「另开」；v1 不消费宿主归档 API，归档判定 = 列表成员资格（best-effort，如实声明覆盖度）。
- **确认交付**：`POST /dsh-l/work/deliver` = 人工路径 G2 等价：活跃开工会话在场 + stage ∈ building/verifying → `store.setGate(key,"G2","pass",…,"workbench-ui")` + `store.setStage(key,"shipped",…)`（`shipped` 是 MANUAL_STAGES 既词汇）。
- **sweeper 保全**（R1-5）：host.mjs sweeper 的 activeKeys 并入 `listWorkSessions()` 的 key 集——开工会话可存活数周且冷会话也算活跃，不并入则托管目录超 `workspaceRetentionDays` 被误删。
- **非目标**（本轮明确不做）：闸门前「预研会话」轻路径；宿主 Workspace 体系接入（`workspaceId` 通道留 v2）；会话内实时审批切换器（归 DSH 原生会话权限选择器）；运行状态自动改候选阶段（徽章纯信息性，阶段手动迁移）。

## 全局约束

- Node ≥24 ESM（.mjs），host 零运行时 dependencies；client 原生 DOM + Shadow DOM 零框架（PRODUCT.md Stack，逐字继承）。
- 双语：zh-CN / en 双字典键同步（test/i18n.test.mjs + test/locale-parity.test.mjs 守护）；组件内静态字面量键，禁动态拼接键名。
- DESIGN.md 规则逐字继承：Host-Theme Rule（禁硬编码浅色底）、One Voice（一屏一反色主 CTA）、mono 字体仅用于代码/数据、reduced-motion 降级。
- 开工会话三红线：①`meta.cwd` 与 `workingDirectory.set` 成对出现，且 send 晚于二者；②**对已登记（索引内）开工会话零 dispose**——唯一允许的 dispose 是创建事务回滚（send 失败且 appendWorkSession 之前），源扫描断言 `src/worksession.mjs` 中 `.dispose(` 恰出现一次且位于回滚分支；agent handle 不逃逸出 worksession.mjs（startWorkSession 只返回 sessionId，handlers/host 不接触 handle——这是单文件源扫描即覆盖全路径的依据）；③审批策略未显式配置时零 `setPolicy` 调用。
- dsh-l 永不替用户动会话：不归档、不删除、不改标题、不 resume；上游关闭只标记不动会话。
- store.json 0600 原子写不变；仓库在 main 直改（历批先例，主人已多轮确认此工作流）。
- TDD 红绿纪律：先跑出真实失败信号再实现（`01_docs/agent-ops/README.md`「测试注入形态与红确认」）。
- 实机生效：client-only 变更免重启（037 §5 构建指纹探针）；host 路由变更需重启 DSH 服务——重启时机由主人拍板，不在任务内自动执行。
- 面板客户端依赖面：`slots`/`uiWorkspace`/`sessions` 三服务（**本机 rc.5 实证在场；rc.1–rc.4 未核**——低于 rc.5 的装机目标需先核服务在场性；README 既定 engines `>=0.2.2-rc.1` 声明不变）。
- 无额外全局约束。

## 输入工件

- 设计共识：2026-11-21 本会话 grill 四轮（Q1–Q17 全部锁定；GLOSSARY.md「开工会话（Work Session）」词条已入册，本计划不重复定义）。
- 评审台账：`.dsh-research/work-session-plan-review-scratch/ledger.md`（R1 十四项证据与结论）。
- 宿主通道事实锚：`@deepseek-ai/dsh-agent` `CreateAgentOptions.meta.{cwd,agentPreset}`、`agentOptions`「Route fallback and output controls」语义；`dsh-user-approval` `ApprovalPolicy='ask'|'never'`；session-controller client 侧行字段 `id/displayTitle/cwd/running/updatedAt/blank`（host 侧 `agentAvailable` 不消费）；schedule 面板 `openSession` 判例。
- 现状代码锚：`src/host.mjs` inject(26)/makeTriage(28)/makeExecWorld(48)/装配(88-101)/路由表(102-120)/sweeper(152-160)；`src/handlers.mjs` MANUAL_STAGES(9)/makeHandlers(56)/postGate(400)/postRunStart(426)/putSettings 白名单(542-559)；`src/triage.mjs` resolveTriageSelection(35)/send(64)/dispose(76)；`src/store.mjs` emptyDoc(36)/迁移(69)/settings(80)/runs API(156-167)/sweepUpstream(202)；`src/engine/executor.mjs` sessionId 局部量(38)/create-send 序(50-53)；`src/engine/workspace.mjs` makeWorkspace/dirOf(20-49)；`src/client/index.mjs` inject(19)/apply(27)；`src/client/api.mjs`(13-44)；`src/client/components/actions.mjs` openSettings(6)/installActions(137)/G1 按钮(188-189)；`src/client/components/workbench.mjs` mountWorkbench(173)；`package.json` dsh.client.inject(30-35)；`scripts/ui-probe.cjs`、`scripts/install-smoke.sh`。

## 文件结构与职责

- Create: `src/agent-selection.mjs` — `resolveAgentSelection(explicit, defaults)`（自 triage 抽出，两用途共用）。
- Create: `src/worksession.mjs` — `workSessionId()`、`buildKickoff(candidate, pkg, lang)`、`resolveLocalWorkspace(repo, {home, stat})`、`composeWorkWorld(services)`、`startWorkSession(world, deps, params)`（守卫序/回滚/复用全语义；handle 不逃逸本文件）。
- Create: `src/client/components/sessionsView.mjs` — 「会话」板块视图 + `sortSessionRows` 纯函数 + 锚行反解 `parseWorkAnchor(title)`。
- Create: `test/worksession.test.mjs`、`test/sessions-view.test.mjs`。
- Modify: `src/store.mjs` — settings 三键补齐；`workSessions` 索引块（`getWorkSession/appendWorkSession/listWorkSessions`）。
- Modify: `src/triage.mjs` / `src/host.mjs` / `test/triage.test.mjs` — `resolveTriageSelection` → `resolveAgentSelection` 引用切换。
- Modify: `src/handlers.mjs` — `postWorkStart`（新守卫序）、`getWorkSessions`、`postWorkDeliver`、`getWorkspaceStatus`、`getModels` 增 `presets`、`putSettings` 三键白名单。
- Modify: `src/host.mjs` — `composeWorkWorld` 装配 + 路由表四行 + `home` 注入 + sweeper activeKeys 并入 work 键（M2）。
- Modify: `src/engine/executor.mjs` + `src/engine/engine.mjs` — `onSessionBound(run, nodeId, sessionId)` 回调持久化（M3）。
- Modify: `src/client/index.mjs` — inject 三服务（M1 一次到位）；`apply(ctx)` 传 `openWorkSession` 回调。
- Modify: `package.json` — dsh.client.inject 增 `"@deepseek-ai/dsh-client-ui-workspace"`、`"@deepseek-ai/dsh-api-session-controller"`（M1 一次到位）。
- Modify: `src/client/api.mjs` — `workStart` / `workSessions` / `workDeliver` / `workspaceStatus` 四方法。
- Modify: `src/client/components/actions.mjs` — 「G1 · 我来开」+「打开会话」入口；`openSettings` 三配置项。
- Modify: `src/client/components/workbench.mjs` — sections 增「会话」（M3）；「我来开」流接选择器（M2）。
- Modify: `src/client/locale/zh-CN.mjs` + `en.mjs` — `work.*` / `sessions.*` 键。
- Modify: `scripts/install-smoke.sh` — 探针清单补 work 路由条目（M3 收尾）。
- Modify: `README.md`、`README.en.md`、`docs/design.md`、`PRODUCT.md` — 文档同步。

## 任务清单

### M1 — 最小闭环

#### Task 1: store 配置三键与 workSessions 索引块

- 目标：settings 补 `workSessionModel/workSessionPreset/workSessionApprovalPolicy`（默认 null）；新增 `doc.workSessions` 索引（key → 行数组，末位=活跃）及 API。
- Files: Modify `src/store.mjs`（emptyDoc L36 + 补键区 L80-82 + API 区 L140 旁）；Test `test/store.test.mjs`。
- 接口契约：
  - Consumes: `createStore({filePath, now})` 既有形态。
  - Produces: `store.getWorkSession(key)`（末位活跃行或 null）、`store.appendWorkSession(key, row)`（row=`{sessionId,cwd,approvalPolicy,createdAt,updatedAt}`，追加并 persist）、`store.listWorkSessions()`（`[{key, rows:[…]}]`）；settings 三键。
- 验证范围：`node --test test/store.test.mjs` 全绿。

- [ ] Step 1: 写失败测试
  用例：①旧档（无三键、无 workSessions 块）打开后三键为 null、`listWorkSessions()` 为 `[]`；②append 两行后 `getWorkSession` 返回末位、`listWorkSessions` 含全部行。
- Run: `node --test test/store.test.mjs`
- Expected: 新用例红。
- [ ] Step 2: 实现后确认
- Change: emptyDoc settings 加三键；`doc.workSessions ??= {}`（L79 旁）；两方法按契约（`need(key)` 复用候选校验）。
- Run: `node --test test/store.test.mjs && npm test`
- Expected: 绿。

#### Task 2: resolveAgentSelection 抽取

- 目标：`resolveTriageSelection` 泛化为 `resolveAgentSelection`，独立模块（行为零变化）。
- Files: Create `src/agent-selection.mjs`；Modify `src/triage.mjs`(L35-40)、`src/host.mjs`(L32/L50)、`test/triage.test.mjs`。
- 接口契约：Consumes 既有语义（设定值不继承默认 reasoningEffort）；Produces `resolveAgentSelection(explicit, defaults)` 签名语义逐字等同。
- 验证范围：`npm test`。

- [ ] Step 1: 引用清点
- Run: `grep -rn "resolveTriageSelection" src/ test/`
- Expected: 全部引用点列出。
- [ ] Step 2: 迁移并改引用（无行为 diff）
- Run: `npm test`
- Expected: 全量绿（triage 用例仅改 import 即过）。

#### Task 3: worksession.mjs 核心域

- 目标：id 生成、kickoff、composeWorkWorld（三分支 + 调用序红线）、resolveLocalWorkspace、startWorkSession（守卫序/回滚/复用）。
- Files: Create `src/worksession.mjs`、`test/worksession.test.mjs`；Modify `src/agent-selection.mjs`（Task 2 产物：增 reasoningEffort 透传）。
- 接口契约：
  - Consumes: Task 1 store API 与 settings 三键；Task 2 `resolveAgentSelection`。
  - Produces:
    - `workSessionId(now)`；
    - `buildKickoff(candidate, pkg, lang)`（锚行 + 可读块 + JSON 围栏）；
    - `resolveLocalWorkspace(repo, {home, stat})` → 绝对路径或 null；
    - `composeWorkWorld({ agents, workingDirectory, approval, agentDefaultModel, settings, userMessage })` → `{ createAgent(sessionId, { cwd, agentPreset, model, approvalPolicy }), send(agent, text) }`——「显式模型在场」= resolveAgentSelection validity（非法形状视同未设置）；三分支：显式 model → agentOptions=resolveAgentSelection+setup select（显式 reasoningEffort 在场即透传进 agentOptions）；preset 且无显式 → agentOptions 不传、不 select；皆无 → 不传、不 select；createAgent 内部序 = create → workingDirectory.set → [显式 policy 时] setPolicy；
    - `startWorkSession(world, { store, buildPackage, lang, now }, { key, cwd, another, workspace, home, stat, makeWorkspace })` → `{sessionId, reused}` 或带 status/code 的错——按架构快照守卫序 2-7 执行；创建事务 = create → send → append+recordHistory；send 失败 → 回滚 dispose（先于 append）+ `recordHistory(key, "work-session.kickoff-failed", 错误摘要)` 留痕 → 抛 `{status:500, code:"kickoff-failed"}`（R3-2：候选侧恢复出口 = 形态 1 重试态）。
- 验证范围：`node --test test/worksession.test.mjs` 全绿，含三红线断言。

- [ ] Step 1: 写失败测试（fake services 录调用序）
  用例：①创建：createAgent 收 `{cwd, agentPreset}`、send 文本锚行开头 + 围栏 JSON、索引与留痕落库；②复用：命中同 cwd（cwd=null 或相等）→ reused:true、fake world **零调用**、响应 taskPackage:null；③冲突：命中且 cwd≠ → 409（且此路径零记账断言——store fake 记录 setGate 未被调）；④another：新 id 追加、旧行保留、响应含新建 taskPackage；⑤三分支：agentOptions 传/不传/不传 + select 有/无；**显式 reasoningEffort 透传断言**（带 effort 的 model → agentOptions.reasoningEffort 等值；不带 → undefined）；调用序断言：`workingDirectory.set` 与 `setPolicy` 均早于 `send`（红线①含时序）；approvalPolicy null → 零 setPolicy（红线③）；⑥源扫描：`readFileSync("src/worksession.mjs")` 中 `.dispose(` 恰出现 1 次且其前 3 行内含标记注释 `rollback-only`（红线②例外条款）；⑦回滚：send 抛错 → dispose 被调、appendWorkSession 未被调、`work-session.kickoff-failed` 留痕落候选 history、抛 kickoff-failed；⑧锚行 72 字符截断保前缀；⑨resolveLocalWorkspace：stat 命中/未命中两态。
- Run: `node --test test/worksession.test.mjs`
- Expected: 全红。
- [ ] Step 2: 实现后确认
- Run: `node --test test/worksession.test.mjs`
- Expected: 全绿。

#### Task 4: postWorkStart 路由与宿主装配

- 目标：`POST /dsh-l/work/start` 按架构快照守卫序；host.mjs 装配 `composeWorkWorld` 与 `home` 注入。
- Files: Modify `src/handlers.mjs`（postRunStart L426 旁）、`src/host.mjs`（装配段 L88-101 + 路由表）。
- 接口契约：
  - Consumes: Task 3 全部导出；`makeHandlers` 既有注入位；host 装配既有 `workspace` 实例（L68）。
  - Produces: 路由 body `{key, cwd?, another?, lang?, workspace?}`，响应契约见架构快照第 7 条（reuse → taskPackage:null；fresh/another → 含本次 pkg）；错误码：`workspace-not-found`(422 早守卫先于 setGate)、`work-cwd-conflict`(409 早守卫零记账)、`run-already-active`(409 仅 fresh 与 another+managed)、`gate-requires-gating`(409：fresh 看 stage；another 看 G1 pass 记录)、`managed-clone-failed`(502)、`kickoff-failed`(500)。makeHandlers 增注入位 `startWork`（缺省 503 同 engine 惯例）+ `home`。**getState 通道（R2-1）**：`getState` 的候选 digest 并入 `work: {sessionId, cwd, approvalPolicy, updatedAt} | null`（读 `store.getWorkSession(key)`）——M1 形态 2/3 与按钮可用性的数据源。
- 验证范围：`node --test test/handlers.test.mjs test/host-smoke.test.mjs`。

- [ ] Step 1: 写失败测试（fake startWork 注入）
  用例：①stage 非 gating 且无 active → 409；②fresh + 引擎活跃 run → 409 且不动候选；③fresh + local 未命中 → 422 且 setGate 未被调（早守卫）；④fresh 成功：setGate(G1 pass)+setStage(building)+留痕 + engine.startRun 未被调；⑤reuse：有 active 同 cwd（stage=building）→ 200 reused 且 setGate/setStage 未被调、taskPackage:null；⑥another：G1-pass+building → 200 新 sessionId、响应含 taskPackage；⑦another 无 G1 pass → 409；⑧workspace:"managed" → startWork 收到 managed 标记（透传断言）；⑨getState：候选 digest 含 work 摘要（有活跃行/无活跃行两态）；⑩another+managed+引擎活跃 run → 409 run-already-active；another+local+引擎活跃 run → 放行（R3-1 互斥面精确到 managed）。
- Run: `node --test test/handlers.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `node --test test/handlers.test.mjs test/host-smoke.test.mjs && npm run build`
- Expected: 绿 + 构建成功。

#### Task 5: 客户端动作与导航接线

- 目标：「G1 · 我来开」（gating fresh）+「打开会话」（有活跃行）两入口；守卫跳转；inject 三服务一次到位。
- Files: Modify `src/client/api.mjs`（`workStart`）、`src/client/components/actions.mjs`（L188 旁两按钮）、`src/client/index.mjs`（`export const inject = ["slots", "uiWorkspace", "sessions"]`；apply 构造 `openWorkSession`）、`package.json`（dsh.client.inject 增 `"@deepseek-ai/dsh-client-ui-workspace"`、`"@deepseek-ai/dsh-api-session-controller"`）、`src/client/locale/*.mjs`（`work.*` 键）。
- 接口契约：
  - Consumes: Task 4 路由；`ctx.uiWorkspace.openSession(id)`；`ctx.sessions.list.getSnapshot().ids`（已注入，守卫仍整体 try/catch 防 inject 错配）。
  - Produces: `openWorkSession(id)`（守卫失败 toast `work.openPending`）；「G1 · 我来开」双条件（R3-2）：(stage=gating 且 !g.G1) → `workStart(key, null, false, lang)`（fresh），或 (g.G1 pass 且 stage=building 且无活跃 work 行) → `workStart(key, null, true, lang)`（**重试态**，kickoff 失败恢复出口；按钮文案统一「我来开」，不加「（重试）」后缀——该入口同样覆盖引擎路径 building 候选（another+local 与引擎无冲突），语义中性，评审建议①）；「打开会话」= 直接 `openWorkSession(active.sessionId)`（候选有活跃 work 行时显示，任意 stage）。
- 验证范围：`npm test` + `npm run build` + `node scripts/ui-probe.cjs`。

- [ ] Step 1: parity 先红（单侧加键）
- Run: `node --test test/locale-parity.test.mjs`
- Expected: 红。
- [ ] Step 2: 双侧键 + 接线后确认
- Run: `npm test && npm run build && node scripts/ui-probe.cjs`
- Expected: 绿 + 探针 PASS（无 `without inject` 类错误）。
- [ ] Step 3: 实机冒烟（主人时机，host 路由需重启宿主后生效）
- Expected: gating 候选「我来开」→ 跳转新会话、kickoff 在场、刷新后侧栏可见；再次进入候选 → 「打开会话」直达。

#### Task 6: 设置面板三项配置

- 目标：openSettings 三控件；getModels 增 presets；putSettings 三键白名单与校验。
- Files: Modify `src/client/components/actions.mjs`（openSettings L6 区）、`src/handlers.mjs`（getModels + putSettings L542-559 白名单区）、`src/client/locale/*.mjs`。
- 接口契约：
  - Consumes: `api.models()`；Task 1 三键。
  - Produces: getModels 响应增 `presets: string[]`（数据源 `listCatalog` 注入位）；putSettings 白名单新增：`workSessionModel`（null 或 `{provider, model, reasoningEffort?}`——provider/model 必须在 listCatalog 目录内，复用 triageModel 校验先例 L549-558；reasoningEffort 可选 string，在场即存——v1 UI 不提供 effort 控件，仅 API 可设）、`workSessionPreset`（null 或 ∈ presets）、`workSessionApprovalPolicy`（null 或 ∈ {'ask','never'}）；'never' 保存前确认弹窗（文案写明「会话内工具调用将自动放行」）。
- 验证范围：`npm test && npm run build`。

- [ ] Step 1: 失败测试（getModels presets / putSettings 三键校验含非法值拒绝 / 'never' 确认弹窗交互）
- Run: `node --test test/handlers.test.mjs test/client-render.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `npm test && npm run build`
- Expected: 绿。
- [ ] Step 3: M1 checkpoint
- Run: `git add -A && git commit -m "feat(work-session): M1 minimal loop — G1 second exit, host channel, config schema"`
- Expected: commit 成功。

### M2 — 工作区选择器与托管保全

#### Task 7: workspace-status 探测路由

- 目标：`GET /dsh-l/work/workspace-status?cwd=` → `{exists, isRepo, dirty, branch}`。
- Files: Modify `src/handlers.mjs`、`src/host.mjs` 路由表；Test `test/handlers.test.mjs`。
- 接口契约：Consumes execFile 注入 + requireAuth；Produces 上述响应；cwd 必须绝对路径（相对 400 `invalid-path`）；非存在 `{exists:false}` 不抛。
- 验证范围：`node --test test/handlers.test.mjs`。

- [ ] Step 1: 失败测试（porcelain 有输出=dirty / 非 repo / 不存在三态）
- Run: `node --test test/handlers.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Change: `git -C <cwd> status --porcelain` + `rev-parse --abbrev-ref HEAD`，失败分型 isRepo:false。
- Run: `node --test test/handlers.test.mjs && npm run build`
- Expected: 绿。

#### Task 8: 选择器 UI 与接入

- 目标：「我来开」先弹选择器：本地默认（命中显示路径 + 脏态警示行，提示不阻止）｜「选择目录…」（pickDirectory）｜「托管克隆」（发 `workspace:"managed"`，不带 cwd）；冲突/未命中错误就地呈现。
- Files: Modify `src/client/components/actions.mjs`、`src/client/api.mjs`（`workspaceStatus(cwd)`）、`src/client/locale/*.mjs`；Test `test/client-render.test.mjs`。
- 接口契约：Consumes Task 7 路由、`ctx.uiWorkspace.pickDirectory()`、Task 5 按钮流（gating fresh 改为先弹选择器）；Produces `pickWorkspace({candidate, t, ui, status})` → `Promise<cwd | "managed" | null>`（调用方据此组 body：cwd 或 workspace:"managed"）。
- 验证范围：`npm test` + 实机目视（主人时机）。

- [ ] Step 1: 失败测试（三选项渲染 + 脏态警示 + 取消 null + managed 分支 body 形态）
- Run: `node --test test/client-render.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `npm test && npm run build && node scripts/ui-probe.cjs`
- Expected: 绿 + 探针 PASS。

#### Task 9: sweeper 活跃集纯函数化（含开工会话键）

- 目标：每日清扫不再误删活跃开工会话的托管目录（R1-5）；断言面打在真缺陷处——host.mjs 的 active 计算（R3-3：sweep 本就尊重任意 activeKeys，直接测 sweep 永绿）。
- Files: Modify `src/engine/workspace.mjs`（新增导出纯函数）、`src/host.mjs`（sweeper L155 改调纯函数）；Test `test/workspace.test.mjs`。
- 接口契约：
  - Consumes: Task 1 `store.listWorkSessions()`；`store.listRuns()`。
  - Produces: `sweepActiveKeys({ runs, workSessions })` → 去重键数组 = running/waiting run 的 candidateKey ∪ workSessions 全部 key（纯函数，无 IO）；host.mjs L155 改为 `sweep({ activeKeys: sweepActiveKeys({ runs: runtime.store.listRuns(), workSessions: runtime.store.listWorkSessions() }), … })`。
- 验证范围：`node --test test/workspace.test.mjs && npm run build`。

- [ ] Step 1: 失败测试（纯函数用例：runs 含 running/waiting/finished 三态 + workSessions 两键 → 输出恰为 running/waiting 键 ∪ work 键去重；finished run 键不进）
- Run: `node --test test/workspace.test.mjs`
- Expected: 红（`sweepActiveKeys` 导出不存在——真红，非永绿）。
- [ ] Step 2: 实现纯函数 + host.mjs 接线 + 确认
- Run: `node --test test/workspace.test.mjs && npm run build && npm test`
- Expected: 绿。
- [ ] Step 3: M2 checkpoint
- Run: `git add -A && git commit -m "feat(work-session): M2 workspace picker + managed channel + sweeper guard"`
- Expected: commit 成功。

### M3 — 会话板块与确认交付

#### Task 10: executor 会话 id 持久化

- 目标：run 行的打开按钮有真实目标（R1-8）：executor 创建会话后把 sessionId 写入 run 节点状态。
- Files: Modify `src/engine/executor.mjs`（runAgentNode L38 旁）、`src/engine/engine.mjs`（接线持久化回调）；Test `test/executor.test.mjs`。
- 接口契约：
  - Consumes: executor 既有 world/createAgent 流（L50-53）。
  - Produces: executor 增注入回调 `onSessionBound(run, nodeId, sessionId)`（makeExecutor 参数位），createAgent 成功后即调；engine 实现里 `run.nodeStates[nodeId] ??= {}` 后写 `.sessionId` 并 `store.saveRun(run)`（R3-4①：节点态可能未建，executor 现以 `?.attempt` 可选读）；`makeExecutor` 缺省回调为 no-op（向后兼容既有测试）。
- 验证范围：`node --test test/executor.test.mjs && npm test`。

- [ ] Step 1: 失败测试（fake onSessionBound 收到 `dsh-l:run:<runId>:<nodeId>:<attempt+1>` 形态 sessionId；缺省 no-op 不炸）
- Run: `node --test test/executor.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `node --test test/executor.test.mjs && npm test`
- Expected: 绿。

#### Task 11: work/sessions 聚合路由与排序纯函数

- 目标：`GET /dsh-l/work/sessions` 视图数据 + `sortSessionRows`。
- Files: Modify `src/handlers.mjs`（getWorkSessions）、`src/host.mjs` 路由表；Create `src/client/components/sessionsView.mjs`（纯函数 + `parseWorkAnchor`）；Test `test/handlers.test.mjs`、`test/sessions-view.test.mjs`。
- 接口契约：
  - Consumes: Task 1 `listWorkSessions`；`store.listRuns()`；Task 10 `nodeStates[].sessionId`。
  - Produces: 响应 `{items:[{kind:"work"|"run", key, sessionId?, runId?, cwd, approvalPolicy, createdAt, updatedAt, candidate:{repo,number,title,stage}}]}`——run 行 sessionId 选取规则（R3-4②）：按 `run.currentNodeIds` 顺序取**首个** `nodeStates[].sessionId` 非空的节点；全空或 currentNodeIds 缺失 → null（旧 run 降级，行上只给看板链接不给打开）；`sortSessionRows(rows, summaries)`（running 置顶、updatedAt 倒序、无 summaries 退化按 updatedAt）；`parseWorkAnchor(title)` → `{repo, number, type}|null`（正则 `^\[dsh-l\] (\S+)#(\d+) (issue|PR) · `）。
- 验证范围：`node --test test/handlers.test.mjs test/sessions-view.test.mjs`。

- [ ] Step 1: 失败测试（聚合含另开历史 + run 行含/缺 sessionId + 排序三态 + parseWorkAnchor 成功/失败）
- Run: `node --test test/handlers.test.mjs test/sessions-view.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `node --test test/handlers.test.mjs test/sessions-view.test.mjs && npm run build`
- Expected: 绿。

#### Task 12: 会话板块视图挂载（含兜底发现与归档对账）

- 目标：workbench sections 增「会话」；sessions.list 富化 + 兜底行；行动作。
- Files: Modify `src/client/components/workbench.mjs`（sections + 挂载）、`src/client/components/sessionsView.mjs`（视图主体）、`src/client/api.mjs`（`workSessions()`）；Test `test/client-render.test.mjs`、`test/sessions-view.test.mjs`。
- 接口契约：
  - Consumes: Task 11 响应/`sortSessionRows`/`parseWorkAnchor`；client 侧 `ctx.sessions.list` 行字段 `id/displayTitle/cwd/running/updatedAt/blank`；Task 5 `openWorkSession`；`api.workStart(key, cwd, true, lang)`（另开）。
  - Produces: `renderSessionsView(container, {t, items, summaries, onOpen, onAnother})`；行合并 = host items ∪ 兜底行（id 不在 items 且（displayTitle 以 `[dsh-l] ` 开头或 id 以 `dsh-l:work-` / `dsh-l:run:` 开头）——work 孤儿经 parseWorkAnchor 反解候选标识（kind:"work-orphan"），反解失败只显标题；**run 孤儿（id 前缀 `dsh-l:run:`）只给「打开」，无候选绑定、无确认交付**）；徽章：开工/执行/自动放行（approvalPolicy==='never'）/上游已关闭（candidate.stage==='closed'）/不在列表（id 不在 summaries ids → 行状态文案 + 仅留「另开」；run 孤儿除外）；空态 `sessions.empty` 引导去清单 G1；排序 = `sortSessionRows`（running 置顶、updatedAt 倒序）。
- 验证范围：`npm test` + `npm run build` + `node scripts/ui-probe.cjs`。

- [ ] Step 1: 失败测试（渲染分组/五类徽章/空态/排序应用/兜底行出现与降级/「不在列表」行只留另开）
- Run: `node --test test/client-render.test.mjs test/sessions-view.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 双语键 + 确认
- Run: `npm test && npm run build && node scripts/ui-probe.cjs`
- Expected: 绿 + 探针 PASS。
- [ ] Step 3: 实机目视（主人时机）：板块可见、冷会话显示空闲、徽章与兜底行正确
- Expected: 主人确认。

#### Task 13: 确认交付路由与动作

- 目标：`POST /dsh-l/work/deliver {key, note}` = 人工 G2 等价留痕；板块行动作。
- Files: Modify `src/handlers.mjs`、`src/host.mjs` 路由表、`src/client/api.mjs`（`workDeliver`）、`src/client/components/sessionsView.mjs`（行动作，building/verifying 才可用）；Test `test/handlers.test.mjs`。
- 接口契约：Consumes Task 1 `getWorkSession`；Produces 守卫：活跃开工会话在场（404 `no-work-session`）+ stage ∈ building/verifying（409 `deliver-requires-building`）；成功 = `setGate(key,"G2","pass",note,"","workbench-ui")` + `setStage(key,"shipped","work deliver")` + history `work-session.delivered`。
- 验证范围：`node --test test/handlers.test.mjs` + `npm test`。

- [ ] Step 1: 失败测试（三守卫 + 成功留痕含 via 字段）
- Run: `node --test test/handlers.test.mjs`
- Expected: 红。
- [ ] Step 2: 实现 + 确认
- Run: `npm test && npm run build`
- Expected: 绿。

#### Task 14: 文档同步、冒烟探针与最终验证

- 目标：README（功能/配置节）、README.en.md、docs/design.md（开工会话节：双出口/守卫序/kickoff/复用/三红线/托管与 sweeper，**并记 sweep 取舍一句**：work 键并入 activeKeys 后，曾有开工会话的候选其托管目录不再自动清扫、磁盘回收转手动——Q9 冷会话亦活跃的保守取舍，评审建议④）、PRODUCT.md（Capabilities 增句）；install-smoke 探针清单补 work 路由条目。
- Files: Modify `README.md`、`README.en.md`、`docs/design.md`、`PRODUCT.md`、`scripts/install-smoke.sh`。
- 接口契约：Consumes Task 4/8/9/12/13 最终行为；Produces 文档与探针与实现一致（探针按 install-smoke 既有条目形态补 `/dsh-l/work/start` 与 `/dsh-l/work/sessions`）。
- 验证范围：`npm test && npm run build && bash scripts/install-smoke.sh`。

- [ ] Step 1: 文档与探针改动
- Change: 按目标节描述落笔；探针条目照脚本内既有形态。
- [ ] Step 2: 最终验证
- Run: `npm test && npm run build && bash scripts/install-smoke.sh`
- Expected: 全绿。
- [ ] Step 3: M3 checkpoint
- Run: `git add -A && git commit -m "feat(work-session): M3 sessions board + deliver confirmation + docs sync"`
- Expected: commit 成功。

## 执行纪律

- 开始实现前先复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标。
- 每完成一个任务运行该任务定义的验证；红灯先修再前进。
- 实机冒烟步骤（Task 5/8/12）涉及宿主重启与主人目视，等待主人时机，不自动重启服务。
- 遇阻塞、重复失败或计划与仓库现实不符，立即停下说明，不猜。
- 仓库在 main 直改为主人既定工作流（全局约束），无需另开分支。

## 最终验证

- `npm test` —— 全量含新增 worksession/sessions-view/handlers/store/executor/workspace 用例与 i18n/locale-parity 守护。
- `npm run build` —— lib/host.js + lib/client.js 构建成功（含构建指纹）。
- `bash scripts/install-smoke.sh` —— 隔离 profile 装机冒烟全环探针通过（含 work 路由探针条目）。
- 实机清单（主人时机）：①同候选重复入口 =「打开会话」直达既有会话（API 幂等：work/start reuse 路径 200 reused）；②刷新后侧栏可见 `[dsh-l]` 前缀会话；③重启宿主后冷会话可打开、板块显示空闲；④'never' 创建的会话带「自动放行」徽章；⑤上游关闭候选的行带标记且会话原样；⑥清空索引（模拟重装）后板块仍能以前缀列出会话（兜底发现）。
