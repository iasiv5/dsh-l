# dsh-l 设计文档 — v2 工作流引擎（域模型双层化 + 执行环）

共识来源：2026-11-16 grill 定稿（/grill-with-docs，Q1–Q16 全量拍板）；ADR-0002；GLOSSARY.md（2026-11-16 增补版）。参考源：Tencent/LoopForge 纯模型层（MIT，只读镜像 `~/workspace/.dsh-research/loopforge`）。本文只落 v2 设计；v1 数据面与分诊冻结于 design.md（tag v0.0.1）。

## 0. 定位与边界（ADR-0002 摘要）

- **定位**：单人交付工作台 = 驾驶舱（看清楚/排优先级/拍板）+ 环内执行编排（自建轻工作流引擎）。
- **纪律**（ADR-0001 延伸）：不骑通用中台——不依赖官方 `@tencent/loopforge-dsh` bundle（共存互补、不检测），无 DB/自管沙箱/多租户/runner，一切骑宿主公开 API（钉版 0.2.2-rc.1，配方 dsh-api-mapping.md）。
- **吸收**：WorkflowDefinition 图模型、Run 状态机与人工动作语义、Needs review 聚合、run 锁模板快照、`reject{targetId}` 按边回退、能力探测诚实降级合同、DevFlow 式门禁语义（内置模板）。**拒绝**：画布设计器（降级为只读渲染+文件模板）、AI 调度（宿主自带）、成本度量（v3+）、独立需求实体（回流字段挂候选）。
- **IP**：模型语义自由借鉴（MIT 零义务），代码全自写；仅逐字复制其 skills/manifest/模板文本时附 THIRD_PARTY_NOTICES。

## 1. 架构总览（v2 增量）

```
client (src/client/)  不变 + 三视图 tab（清单/看板）+ 待我确认页头 + 工作流条（模板驱动只读渲染）+ 执行详情
host   (src/host.mjs) inject 不变（webServer, credentials, agents, agentDefaultModel, timer, llm）
  ├─ 路由 /dsh-l/*    → v1 路由全保留 + v2 run 路由（§7）
  ├─ store (src/store.mjs)      → doc.version 2：candidates 增字段 + runs 块（§2）
  ├─ workflows (src/workflows/) → 内置模板常量 + 用户模板加载 + schema 校验 + 指纹（§3）
  ├─ engine (src/engine/)       → scheduler（纯函数 DAG 调度）+ executor（agent/script 节点执行）（§4/§5）
  └─ provider/triage            → 不动（摄取/分诊与域模型正交）
```

## 2. store v2 schema（doc.version: 2）

v1 全部块（watch/candidates/snapshots/repos/ingestLog/settings/auth/credential）形状不变；credential 块为登录门禁改造（2026-11-19）新增，增量如下：

```js
{
  version: 2,
  // candidates[key] 增量字段（既有 stage/triage/gates/taskPackage/history 原样保留）：
  //   currentRunId: null | "run-…",          // 当前执行指针；重开=新 run，旧 run 留档
  //   release: { confirmedAt, note } | null, // G3 落痕：人工确认已发版（dsh-l 不代跑发版）
  //   delivery: { merged, mergedAt } | null, // 交付回流：摄取检测 PR merged 回填（仅 PR，M3 起）
  runs: {
    // "run-<epochMs>-<4rand>" →
    "run-1731730000000-a1b2": {
      id, candidateKey,
      templateId: "loop-v1", templateRevision: "<内容指纹>",
      snapshot: { nodes: […], edges: […] },   // run 锁模板快照：模板后续升级不影响在途 run
      nodeStates: { // [nodeId]
        // status ∈ pending|ready|running|waiting|succeeded|failed|cancelled|skipped
        //   waiting 仅 gate 节点；failed 仅 agent/script 节点（回炉计数见 §4）
        "build": { status, attempt, reworkCount, startedAt, endedAt, error, artifacts: [] },
      },
      status: "running|waiting|succeeded|failed|cancelled",
      cancelReason: null,                      // 面板取消/卸载 drain 落痕
      createdAt, updatedAt, history: [{ at, event, detail }],   // 上限 100 FIFO
    },
  },
}
```

**迁移（v1→v2）**：`version:1` 文档读入后补 `runs:{}`，全部候选补 `currentRunId:null / release:null / delivery:null`，`version` 置 2。v1 的 building/verifying 只读灰显从未真实进入（design.md §8），故无存量 run，迁移无损。迁移写进 store 打开路径（`doc.version ??= …` 同款就地补齐风格），golden fixture 锁行为。

**候选 stage ↔ run 映射**：stage 枚举维持 v1 不变（inbox/triaged/gating/building/verifying/shipped/closed/held），迁移时机：run 创建（G1 放行）→building 起点；gate 等待→gating（history 记 gateId 区分 G1/G2）；run 终态→shipped/failed→held。清单行内进行中阶段渲染 `currentRunId` 的在途节点名（比 stage 更细）。

## 3. 工作流模板（workflows 模块）

**模板形状**（内置与用户模板同构，schema 校验后才有 revision 指纹）：

```js
{
  id: "loop-v1", name: "Loop v1", version: 1, builtin: true,
  revision: "<sha1(规范化 JSON 内容)>",       // 指纹：run 锁快照的引用键
  nodes: [ // type ∈ agent|script|gate；gate 硬类型：不可配置为可跳过（产品红线）
    { id, name, type,
      // agent:  prompt（内联，M2）或 roleId（引用角色注册表，M4 起）；executionPolicy: "ask"|"auto"
      // script: scriptLanguage: "shell", script: "…", timeoutMs(默认 600000)
      // gate:   gateId: "G1"|"G2", rejectTarget: "<nodeId>"（驳回回退目标；G1 特例=取消 run）
      // 公共:   maxAttempts(默认 1), maxReworks(默认 0)，onFailure: "fail"|"hold"(默认 fail) },
  ],
  edges: [ { id, source, target, kind: "success"|"rework" } ],
  // success 边=顺序依赖；rework 边=源节点失败时激活的回炉边（target 重跑，reworkCount+1）
}
```

**来源三路**：① 内置只读常量 `src/workflows/builtin.mjs`（`loop-v1` M1；`devflow-lite` M4）——store 不存内置模板，run 只存 `templateId+revision+snapshot`；② 用户模板 = 插件数据目录 `workflows/*.json`，启动与 run 创建时加载，schema 校验失败跳过并记 history（警告事件），文件即模板（配置驱动，无画布）；③ store 不新增模板编辑状态机。

**内置 `loop-v1`**（v1 stage 机的泛化实例）：

```
G1(gate,G1) → build(agent, executionPolicy:"auto") → verify(script)
verify --rework(maxReworks:3)--> build        // 验证失败回炉，超限 run failed→候选 held
verify → G2(gate,G2, rejectTarget:"build") → deliver(script: push + gh pr create) → run 终态 shipped
G1 驳回（特例）→ 取消 run，候选回 triaged      // 不开工语义，v1 保留
```

## 4. 引擎调度（src/engine/scheduler.mjs，纯函数）

- **就绪规则**：节点 ready ⇔ 全部入边（success）源节点 succeeded 且自身 pending；ready 即调度，进程内并发上限默认 2（settings.engineConcurrency 可调）——按边并行，gate 只闸必经路径（Q9-B）。
- **gate 语义**：ready 的 gate 节点调度即转 `waiting` → run.status=waiting → 候选 stage=gating（history 记 gateId）→ 聚合进「待我确认」；`pass` → waiting→succeeded，success 边放行下游；`reject` → 沿 `rejectTarget` 回退：目标节点重置为 ready（reworkCount 不计——reject 是人工裁决非失败回炉），其下游全部置 `skipped`（待重跑）。
- **回炉语义**：节点失败时若存在出边 rework：目标节点重置 ready、本节点 reworkCount+1；`reworkCount > maxReworks` → run failed（onFailure=hold 时候选 held 人工接管）。工作区文件不因回炉回退（LoopForge 同款）。
- **终态**：全节点 succeeded（无出边者）→ run succeeded → 候选 shipped；`cancel` → 在途 agent cancel / script kill，未跑节点 cancelled，候选回 gating（待人工）。
- 调度器不碰网络与子进程：输入 (snapshot, nodeStates, 事件) → 输出 (nodeStates', 待调度列表)，全部单测覆盖。

## 5. 节点执行（src/engine/executor.mjs）

- **agent 节点** = ctx.agents 短会话（分诊同款通道，api-mapping §2/§3）：`ctx.agents.create({ sessionId: "dsh-l:run:<runId>:<nodeId>:<attempt>", meta:{cwd: workspace} })` + **`ctx.workingDirectory.set(agent, cwd)`**（阶段 C 实录：meta.cwd 只进会话头）→ `send` 投递 prompt（= 节点 prompt/角色 + 任务包 v1/v2 + 上游节点 artifacts 摘要）；完成证据 = `ctx.on('session/event')` 该会话 `turn/end{reason.kind:'completed'}`（**不用 whenIdle**）；选模 role.model ?? 宿主默认；审批 `ctx.approval.setPolicy(agent, executionPolicy)`（默认 ask）。
- **降级合同**（LoopForge 同款精神，适配 A 架构）：创建失败/`turn/end{blocked|error}`/LLM 凭据缺失（`MISSING_CREDENTIAL` 同分诊 fail-closed 判例）→ 节点 failed，`error` 与 fallback 原因如实入 nodeStates.error 与 run.history——不伪造执行、不静默重试；重试走人工（面板 retry）或回炉边。
- **script 节点** = 宿主子进程（`child_process`，shell，cwd=工作区，timeoutMs 到点 kill）→ exit 0 = succeeded（stdout/stderr 尾部 2KB 入 artifacts），非零 = failed。deliver 节点脚本用 `gh`（复用 §3 github.mjs resolveToken 登录态纪律）。
- **工作区** = `<data>/workspaces/<candidateKey 经安全化>/`：run 创建时 `gh repo clone` defaultBranch（仅首跑，复用 gh 登录态；已存在即复用）；回炉不回退；run 终态后保留 `settings.workspaceRetentionDays`（默认 7）定时清理（ctx.interval 顺带）。

## 6. 任务包 v2（M4；golden 双版本守卫）

version:2，v1 全部字段（candidate/triage/gate/instructions/repo/emit）原样保留，新增两块：

```js
role: { roleId|null, name, executionPolicy },              // 来源节点（内联 prompt 时 roleId=null）
workflow: { runId, nodeId, templateId, templateRevision }, // 执行上下文（v1 手动复制场景两块皆 null 补齐形状）
```

emit 信封不变（autoloop 幂等契约）。test/task-package.test.mjs 升级为 v1+v2 双 golden。

## 7. HTTP 路由 v2（v1 路由全保留）

| 方法 | 路径 | 语义 |
|---|---|---|
| POST | /dsh-l/run/start | {key}：G1 放行+创建 run（工作区 clone → 引擎调度）；复用 v1 任务包生成；409 run-already-active |
| POST | /dsh-l/run/gate | {runId, nodeId, decision:'pass'\|'reject', note}：waiting gate 的人工裁决；reject 带可选 targetNode 覆盖模板 rejectTarget |
| POST | /dsh-l/run/cancel | {runId, reason}：面板取消 → 引擎 cancel 在途执行 |
| POST | /dsh-l/run/retry | {runId, nodeId}：失败节点人工重试（attempt+1，上限 maxAttempts） |
| GET | /dsh-l/run/:id | run 全量（回溯入口） |
| GET | /dsh-l/state | 增 runs 摘要与 needsReview 聚合计数（gate waiting + G3 分区） |
| POST | /dsh-l/release/confirm | {key, note}：G3 人工确认已发版（落 release 块，不碰 npm） |

v1 `POST /dsh-l/candidate/gate` G1 分支在 v2 改为 run/start 的别名（行为收拢，golden 同步）；G2/G3 原 409 移除（G2 进环、G3 走 release/confirm）。

## 8. UI v2（Q15-A）

- 主栏（已绑定态）顶部 tab：**清单**（v1 分组列表升级：行内展开执行状态/在途节点名/人工动作）｜**看板**（按 stage 分列，点击迁移、无拖拽）。执行详情从清单行/看板卡点入：工作流条 + 节点状态列表 + artifacts + pass/reject/retry/cancel 按钮。
- **工作流条**（pipelineStrip 泛化）：模板驱动只读节点渲染（节点名+状态色+计数），替换 v1 硬编码 7 段 STAGES；v1 stageCounts 语义保留为兜底（无 run 候选）。
- **待我确认**：页头常驻入口（badge 计数），两分区——gate 等待（run waiting）+ G3 发版（shipped 且 release.confirmedAt 为空）；放行/驳回/确认动作即在此完成。
- 登录闸 → 登录门禁全面板（Task 9，2026-11-19：三关门禁 + loopforge 式凭据卡 + 双方法并列）；收活板块增紧凑连接卡与连接受损横幅（Task 10）；i18n 双字典同步新增 cred.* 键（locale-parity 测试守护）。

## 9. 安全（v2 增量）

- script 节点脚本内容来自内置常量或本机数据目录文件（信任边界=本机文件，与 gh 安装同级），cwd 限定工作区，timeout 强制。
- agent 节点审批走宿主管线（ask 默认）；auto 必须角色/节点显式声明，全局无 auto 默认。
- 飞书（M3）：仅 open.feishu.cn webhook 出网（design.md §9 预留兑现），gate 到达一条通知，不带凭据与正文全文。
- 取消语义：run cancel → AgentHandle.dispose / script kill；插件卸载经 cordis disposal drain 全部在途 handle（api-mapping §8），迟到 turn/end 随 disposal 失效。

## 10. v3 接缝（本文件不展开）

coordinator adapter（会话协调者，role→派发缝）、sub-SOP / preview-build 节点、G1 高置信自动放行、IM 双向拍板、GitLab provider、成本度量。

## 11. 里程碑与验证策略（Q16-A）

- **M1 域模型双层化**：store v2 + 迁移 golden；workflows 模块（内置 loop-v1 + 用户加载 + schema 校验 + 指纹）；scheduler 纯函数全单测；工作流条只读渲染；package-shape 测试同步。不发 npm（tag v0.0.1 已锁基线）。
- **M2 执行环闭环**：executor（agent/script）+ run 路由 + 工作区生命周期 + 挂起/续跑/回炉/取消全链；fake ctx.agents 桩单测（桩走注入不走真实 spawn）+ scratch profile 冒烟（fake 模型 fail-closed 双裁决同 v1 判例）。
- **M3 看板 + 待我确认 + 飞书通知 + 角标**：纯 UI/通知层，i18n parity + 逻辑单测。
- **M4 Role 入册 + 任务包 v2 + devflow-lite**：store.roles、双 golden、第二个内置模板（非线性验证用例）。
- 每里程碑独立验证闸；`npm test` 全绿 + package-shape + 装机冒烟（049 runbook）为通用收口。

## 12. M2 补钉（2026-11-17 grill 定稿，Q1–Q8 全按推荐；§4/§5/§7/§9 未重开部分以此节为准细则化）

1. **恢复语义（Q1）**：引擎装配时扫描 run.status∈running/waiting 的 run——running 节点置回 ready + run.history 记 `resume.interrupted`（attempt 槽位已消耗不再 +1，防静默烧穿 maxAttempts）；waiting 闸门照旧等待。自愈式，无新状态枚举。
2. **run/start 异步（Q2）**：路由立即返回 `{runId, workspace:"cloning"}`；工作区 clone 是引擎首步，build 节点 clone 完成后才 ready；clone 失败 → run failed（error 落 run.history）。
3. **G1 与 run（Q3）**：run 创建时 g1 节点预置 succeeded（其余 pending）；v1 `postGate(G1,pass)` 语义保留为 run/start 别名（任务包生成 + stage→building + 创建 run）；G1 reject 沿 v1 路径（候选回 triaged，无 run）——§4「G1 reject 取消 run」仅存在于理论路径。
4. **prompt 组成（Q4）**：executor 统一组装 = builtin 节点 `prefix` 字段（简短纪律前缀，固定 zh-CN）+ 任务包 JSON（v1 golden 形状全量）+ 上游工件摘要（无则省略）；builtin.build 不携带大段 prompt；M4 Role 注册表落地时 prefix 换 roleId 引用。
5. **git 凭据（Q5）**：纯 gh 路线——clone 用 `gh repo clone <repo> <dir>`（https + gh 凭据 helper，PATH 注入 ghBin），push 靠同一 helper；任务包 `repo.cloneUrl`（ssh 地址）保持 golden 原样不动，执行器在 run.history 记实际 remote。
6. **最小 UI（Q7）**：清单行展开区增 run 区块（在途节点/状态/error/取消/重试按钮）；G2 按钮从恒禁用改为 run.waitingGate==="g2" 时可操作；工作流条环内节点按 run 节点状态着色（替代 M1 恒灰）。三视图/看板/待我确认/角标仍 M3；本节新增 i18n 键（zh/en 双字典 + parity 测试）。
7. **再入环（Q8）**：failed/cancelled run → `run/retry` 同 run 重试失败节点（attempt+1 ≤ maxAttempts）；终态 run 允许完整重开——候选 held→gating 人工迁移后再点 G1 → 新 run（g1 再预置 succeeded，attempt/rework 清零，工作区沿用不回退）；run 存活（running/waiting）时 start 仍 409 run-already-active。
8. **backlog 折叠（Q6）**：F1 workbench:159 注释清理、F2 校验器强制「非 G1 gate 必带 rejectTarget」、F3 loader 环检测、F4 迁移区外无条件 `doc.runs ??= {}` 回填、F5 `onFailure:"hold"` 钉例——全部进 M2 计划；docs 类变更自 M2 起独立 chore/docs commit。
9. **settings 扩展**：`settings` 增 `engineConcurrency`（默认 2，PUT 校验 1..4）与 `workspaceRetentionDays`（默认 7，PUT 校验 1..90）；旧档 `??=` 回填；settings 面板 UI 不动（PUT 可用即可，UI 后续里程碑）。
10. **路由适配（实现期勘定）**：宿主 `webServer.register` 仅有 exact 路径、`makeHttpHandler` 的 GET 回调只收 body 不收 req——`GET /dsh-l/run/:id` 参数路由不可落地；run 详情（含失败 error）改由 `state.runs` 摘要承载（`summarizeRun` 增 `error` 字段 = 首个 failed 节点的 error），POST 四路由（start/gate/cancel/retry）形状不变。

## 13. M3 补钉（2026-11-17 grill 定稿，Q1–Q9 全按推荐）

1. **范围（Q1）**：看板视图 + 待我确认收件箱（gate waiting + G3 发版分区 + `POST /dsh-l/release/confirm`）+ 飞书单向通知 + 角标；折叠清账：executor lastText 死代码清理、workspace sweep 保留期口径注释、装机冒烟 runbook 补 inject 排查提示；**cancelled-run 的 UI 重试入口不做**（行内取消已有，续跑走 API/完整重开——设计备注存档）；docs commit 纪律延续。
2. **角标（Q2）**：宿主**无**公开 toggle-badge API（勘察实证：rc.3 类型无此服务；better-sidebar 的 badge 为其面板内 chip）——走 panellist **label 解析式计数**：`待确认 (N) · DSH Loop Forge`（N=待确认聚合数，无待确认保持原名）。宿主 label() 调用时机实测钉死；计数滞后一次刷新可接受。
3. **飞书配置（Q3 + credentials 勘察）**：webhook URL 存 **credentials**（ref=`DSH_L_FEISHU_WEBHOOK_URL`，env 语法合法；`credentials.set(ref, url)` 写入 / `resolve(ref)→{value}` 读取——CredentialRef 为品牌化字符串，运行时直调字符串，零运行时依赖新增）；设置面板增 URL 输入框 + 「发送测试消息」按钮（走同一 sendNotice）。
4. **通知触发点（Q4-B）**：gate 到达（g2 waiting）+ run failed（含 clone 失败）；succeeded 不推。通知尽力而为：未配置 webhook / 网络失败 → 静默跳过（warn 落日志），绝不阻塞引擎。
5. **待我确认（Q6/Q8）**：主栏第三 tab（清单/看板/待我确认）+ 页头 badge 计数点击切 tab；卡片动作齐全——gate 等待卡片：G2 放行/驳回（run/gate）；G3 卡片：确认已发版（release/confirm）；failed run 卡片：重试/取消（run/retry、run/cancel）。聚合口径 = gate waiting run 数 + 待发版 shipped 候选数（badge 同口径，不含 upstream-gone flagged）。
6. **看板（Q5）**：6 列与清单分组同构（待分诊/已分诊/待拍板/进行中[building+verifying]/已交付/已关闭·挂起，复用 bucketOf）；卡片点击迁移仅 MANUAL_STAGES 白名单内可用（进行中列禁迁移，v1 postStage 校验沿用）；无拖拽。
7. **执行详情（Q9）**：不做独立视图——M2 行内 run 区块即详情（M4 后按需再议）。
8. **改名（Q7）**：显示名 **DSH Loop Forge**（panelLabel 双字典同名不翻译；角标联动「待确认 (N) · DSH Loop Forge」）；README/PRODUCT/GLOSSARY 同步 + 一行免责声明「独立项目，与 Tencent LoopForge 无隶属关系」；npm 包名 dsh-l 与登录闸文案不动。
9. **i18n**：增键（tabs×3 / review 分区与动作 / feishu 设置 / badge.pending）双字典 + parity 守护。

## 14. M4 补钉（2026-11-17 grill 定稿，Q1–Q5 按推荐 + Q4 主人升级、Q10-B）

1. **Role 存放与解析（Q1-A）**：混合模式——builtin 角色常量（`src/workflows/roles.mjs` 只读，与 LOOP_V1 同源纪律）+ `store.roles` 用户自定义（roleId → `{name, description, prompt, executionPolicy, model?}`，随 store.json 持久，旧档 `??=` 回填空）；解析顺序 **store.roles 优先于 builtin**（用户可覆盖内置同名角色），升级跟随内置新版。
2. **devflow-lite 模板（Q2-A）**：7 节点精简链（requirement/design/implement/review/test/g2/deliver——评审 P13 计数修正）；LOOP_V1 增 `entryPresucceeded:"g1"` 显式声明（评审 P16 采纳：入口闸预置是审批时序语义而非结构位置，不泛化为「首个 gate」）（id=`devflow-lite`）——`requirement(gate, 强制人工确认) → design(agent) → implement(agent) → review(agent, fail→implement ≤2) → test(script) → g2(gate) → deliver(script)`；保留 DevFlow 语义骨架，砍 KNOWLEDGE/SUMMARY、不做规模分级（固定 medium 路由，small 需求走 loop-v1）；rework 预算由 maxReworks 承载（对齐 LoopForge `max_stage_failures:2` 语义）。
3. **内置角色 4 个（Q3-A）**：`loop-builder`（loop-v1 build 迁入，prompt=现 prefix）+ `devflow-architect` / `devflow-developer` / `devflow-code-reviewer`（精简自 LoopForge 角色语义，中文 prompt **自写**——不逐字拷 LoopForge 文本，避免 superpowers 系出处混淆）；helper 角色不做（TEST 为 script 节点无落点）。
4. **角色管理 UI（Q4 主人升级 + Q6-A/Q7-A/Q8-A）**：主栏第四 tab「角色」——信息架构参照 LoopForge `agents.js`（**仅借鉴信息架构与交互模式，vanilla DOM 全自写**，MIT 致谢注明）：搜索框 + 行卡（名称/职责/executionPolicy/被引用计数「N 个节点」/更多菜单）+ 「新增角色」+ 编辑对话框（name/description/prompt textarea/executionPolicy select；roleId 创建时定不可改）+ **删除保护**（被任何工作流节点引用 → 禁删并提示，`agentDeleteBlockReason` 同款语义）；内置角色可改 prompt 但可恢复默认。
5. **i18n 消费键守护（Q5-A）**：轻量测试折叠进 M4（扫描源码 `t("…")` 字面量 ⊆ 双字典键集，堵 M3 R3 类「消费键/词典键脱节」）；DOM 冒烟不折叠（jsdom 重依赖违反零依赖，留 M5+）。
6. **store schema（Q9-A）**：store.json v2 doc 增 `roles: {}` 键（additive、无版本 bump、旧档 `??=` 回填空）；角色引用计数守卫面（评审 P14 定口径）：扫 **templates 全量定义** agent 节点 roleId + **存活 run 快照** snapshot 节点 roleId（非存活旧失败 run 重派时 resolveRole null → prefix 兜底/空则 throw 快速失败——降级可接受；D6「全部快照」字面以本实现口径备注取代）。
7. **startRun 模板参数化**：`startRun(key, {taskPackage, templateId, runId})`——templateId 缺省 loop-v1，可解析 builtin（loop-v1/devflow-lite）或 store 用户模板，未知 templateId 404 unknown-template；**runId 可选参**（缺省 makeRunId 生成）+ **返回 { runId }**；run/start 路由响应含 runId（出处：M4 计划评审自检修正，runId 入参随 M5 后落账补全——commit 0442c1d）。**任务包 v2 生产接线（M5 后落账，commit 0442c1d）**：postRunStart 与 postGate 别名两路由统一「makeRunId 先行 → buildTaskPackage(首 agent 节点角色 + workflow 块) → startRun(runId)」，生产包 version:2；postRunStart 增 templateId 透传与 unknown-template 早守卫（不动候选即拒）。M2 遗留 backlog 折叠：R4 gate 文案映射（多 gate 模板前置需要，待我确认/行内按钮文案改按 gateId 映射——M4 已落地 waitingGateId 快照语义键）。
8. **发版时机（Q10-B）**：M4 后**不发版**，攒 M5 再发；M5 候选清单——设置面板深化、putFeishuWebhook 空 token 后缀校验、「保存并测试」复合动作、kanban 迁移「相邻 vs 全白名单」口径、R4 文案映射收尾、DOM 冒烟（jsdom 评估）。

## 15. M5 补钉（2026-11-18 grill 定稿，Q1–Q5 全按推荐）

1. **范围四组（Q1-A）**：A 工程守护（host 装配冒烟测试 / i18n 动态前缀键白名单守护 / roles golden 逐字锁 / loadTemplateDefs 警告对称性）+ B 面板深化（feishu 空 token 后缀校验 / 保存与测试动作拆分）+ C 口径裁决（kanban 迁移）+ D 文档清账（§14 追认回写 / README 致谢核对）。M5 = 工程守护 + 面板深化 + 发版前清账。
2. **DOM 冒烟不做（Q2-A）**：零依赖纪律优先（devDependencies 仅 esbuild）；DOM 渲染层靠装机冒烟人工核验兜底，UI 纯函数（roleRows/needsReview/stripCells）已有单测。
3. **kanban 迁移口径（Q3-A）**：保持全白名单自由迁移，不设相邻限制——单人工具灵活优先，误迁可再迁回；口径落 GLOSSARY/设计文档注记，代码零改动。
4. **feishu 交互形态（Q5-C）**：独立「保存 Webhook」按钮 + 「发送测试消息」按钮（**测试前自动保存**输入框当前值）——消掉「改了没存就测」坑，两键语义清晰。
5. **发版（Q4-A）**：M5 验收后发 **0.1.0**——发版准备（version bump / README 终审 / 装机冒烟 / npm 占名核查）入 M5 计划任务；`npm publish` 在产出评审通过后执行。全局约束相应放宽：不动面清单中 package.json 的 version 字段在发版任务内可改。

## 16. Backlog（M6+ 候选池，2026-11-18 落账）

主人裁决：M4 残留（任务包 v2 生产接线）已落账（§14.7/commit 0442c1d）；发版挂起待主人令（版本 0.1.0 就绪未 publish）。以下为各里程碑评审沉淀的未实施项，M6 grill 时逐项裁决：

1. **host.mjs listRoles/注入表达式锚**（M5 产出评审 S-3）：host 冒烟③仅锚 store 层——注入表达式断链会静默漏过全部测试；可加 engine 侧角色解析探针（dispatch 后 executor 收到的 rolePrompt 断言）。
2. **buildRuntime workspace/executor 注入缝**（M5 计划评审建议）：冒烟断言延伸到执行链需扩缝，本里程碑不做。
3. **putFeishuWebhook 合法 token 尾随空白 trim 入库**（M5 产出评审建议）：现校验挡空/纯空白，但合法 token 带尾空白原样入库。
4. **路由键断言扩集**（M5 产出评审建议）：host 冒烟①断言超计划最小集方向（更严）。
5. **设置面板深化**（M2 起 candidate）：feishu 段之外的设置面扩展（模型选择/引擎并发可视化等）。
6. **DOM 冒烟**（M5 Q2-A 否决维持）：零依赖纪律优先；如 jsdom/linkedom 代价可接受再议。
7. **executor cancelled-run UI 重试入口**（M2 设计备注）：行内重试按钮对 cancelled run 的节点可见性。
8. **stripCells 多模板演进**（M2 注释）：devflow-lite 全链跑通后清单行的多模板徽标/视图。
9. **resume 旗标观测**（M2 备注）：run history 的 resume 痕迹在 UI 的呈现。
10. **npm-claim 盘点自动化**（M5 计划评审建议）：属 dsh-workspace 侧 runbook，不在本仓。
11. **发版后置事项**（待 publish 时）：know-how 018 两阶段上架监视；dshm 上架轮询与 catalog 缓存翻转核对。
12. **check-script 字节锁 + revision 常量锁**（M6 产出评审 O2）：mr-push-check/mr-open-check script 仅 includes 片段断言——多行 shell 字节锁维护成本高，M7 裁决是否升格 deepEqual + revision 常量值锁。
13. **M6 产出评审 backlog 候选**：host sweeper 记录 skipped 计数（1 行）；onNodeDone 成功路径清 error 防 stale 挤占 prompt；装机冒烟（publish 前补做）。

## 18. M7 补钉（2026-11-18 grill 定稿，Q1–Q6 全按推荐——主题「清账 + 可观测性」）

1. **范围（Q1-A）**：守护收紧四小项（§16-1 注入表达式锚 / §16-3 feishu trim / §16-4 路由断言扩集 / §16-12 check-script 字节锁）+ 观测面板组（§16-7 cancelled 重试入口 / §16-8 多模板渲染 / §16-9 resume 痕迹 / §16-13 stale error 清理 + sweeper 计数）。**除维持不做项（§16-5 面板深化、§16-6 DOM 冒烟、§16-10 npm-claim 仓外）外 backlog 全清**；publish 维持挂起（Q6-A，auth 阻塞不变，M7 不含 publish 任务）。
2. **stale error 清理（Q2-A）**：onNodeDone 成功分支置 `error: null`——error 语义=「节点最新一次失败」，成功即清；**skipped 态 error 保留**（R3 反馈通道不动）。
3. **cancelled 重试入口（Q3-A）**：summarizeRun 增 `cancelledNodeIds`（failedNodeIds 同款）；行内重试按钮数据源扩 failed∪cancelled（retryNode 已支持 cancelled run——M2 R1-9 既有能力，纯数据源扩展）。
4. **resume 痕迹（Q4-A）**：dispatch resume 分支 `appendRunHistory("node.resumed", nodeId + " seq=" + resumeSeq)`（1 行）；UI 零改动（history 通道既有）。
5. **sweeper 计数（Q5-A）**：host sweeper 补一行 logger（`sweep done: removed=N skipped=M`）。
6. **多模板渲染（Q3 关联/§16-8 最小形）**：stripCells 按「候选 currentRun 的 templateId」匹配模板渲染管线（现固定 templates[0]=loop-v1，devflow-lite run 的管线渲染错模板）；无匹配回退 templates[0]；**模板名徽标不做**（面积控制，M8+ 再议）。
7. **守护收紧形态**：§16-1 = host-smoke ③ 升格 engine 侧锚（stub ctx.agents.create 捕获 initMessage，断言含用户覆盖角色 prompt——listRoles 闭包端到端）；§16-3 = upsert 前 token slice trim 入库；§16-4 = 路由断言增 models/triage/settings/watch；§16-12 = 两 check script **deepEqual 字节锁**（同 deliver 范式）；**revision 常量值锁不做**（computeRevision 内容哈希已被 script 字节锁传递锁定，另行锁值属冗余）。
8. **发版（Q6-A）**：维持挂起——auth 阻塞不变；M7 验收后仍等主人 `npm login`。

## 19. M8 补钉（2026-11-19 grill 定稿，Q1–Q5 全按推荐——主题「可观测面板」）

1. **范围（Q1-A）**：设置面板深化（§16-5）+ 模型观测（上游 v0.4.0 吸收分析 #3 的 dsh-l 等价）+ T6 多 ready 补钉例（M7 产出评审）+ D9 口径模板改写（流程项折叠）。publish 维持挂起（Q5-A——auth 阻塞不变，M8 不含 publish/装机冒烟任务）。
2. **设置面板深化（Q2-A/§16-5）**：①engineConcurrency 数字输入（settings 写路径已有 putSettings 校验，UI 增 input）；②agentDefaultModel **只读展示**（宿主接口 currentSelection() 无写路径——host.mjs:142 已有读取先例，面板展示当前选择；state 需经 handlers 暴露——新增只读字段或沿 settings GET 携带，实现时按实文最小面）。
3. **模型观测（Q3-A 最小记录形）**：dispatch agent 分支 nodeStates[nodeId].model = roleModel ?? null（本轮解析的实际模型——role.model 优先，兜底 null；经 saveRun 持久）；runBlock 展示「model: x」（有值时，字面量不译——零 i18n 新键）；**不做** CLI 实跑追踪（上游从 stream 首行读，dsh-l world 无此信息；agentOptions 即配置真值）。
4. **流程项折叠（Q4-A）**：①T6 多 ready 补钉例（resume 多节点各落一条的场景钉例）；②D9 口径模板改写进本计划全局约束：「新增测试覆盖口径 = 块级或断言级择一声明」；③§16 终态核对（docs 收尾：1/3/4/7/8/9/12/13 已清、5/6/10/11 维持）。
5. **不动面**：闸门语义、模板两内置、handlers v2 接线、mr 三件套 scripts、零依赖约束。**发版（publish 0.1.0）仍为验收后动作且等 auth**。
6. **§16 终态核对（T3 尾注，M8 后）**：已清 1/3/4/7/8/9/12/13（M7）+ 2 实质清账（M6 T1 假 gh）；5/6/10/11 维持；13c 装机冒烟随 publish。M8 新增：D9 口径已入 M8 计划全局约束（块级或断言级择一——后续计划沿用）。


## 17. M6 补钉（2026-11-18 grill 定稿：Q1-A/Q2-A/**Q3-B 主人选 B**/Q4-A/Q5-A/Q6-A/Q7-A——主题「交付完整性」）

上游依据：LoopForge v0.4.0 MR 节点设计（#967/#717，upstream 吸收分析钢人结论 2026-11-18）。

1. **范围（Q1-A）**：MR 闭环三件套（内置模板 + 引擎落痕）+ workspace 回收脏检查 + 脱密守护测试折叠（上游 v0.4.0 吸收分析低优先项——原未入 §16 编号，M6 直接吸收）。M6 = 交付完整性。
2. **commit 责任（Q2-A）**：build/implement 的角色 prompt 增「完成后把本轮改动 commit 到当前分支（不推送、不碰主分支）」——commit 是工程责任归角色；**roles golden 逐字锁要求 builtin.mjs build.prefix 与 roles.mjs loop-builder prompt 原子同步改**。
3. **MR 三件套（Q3-B 照搬上游结构，dsh-l 节点类型表达）**：两内置模板在 g2 与 deliver 之间插入三节点——
   - `mr-open`（agent，新内置角色 **mr-opener**，executionPolicy auto）：推送当前工作分支、`gh pr create/view` **幂等**（已存在指向目标分支的 MR 则复用不重复建）、把 MR 链接/分支/提交 SHA 写 mr-body.md、**不得合并/不得推主分支/不得强推**；失败（凭据/权限/网络）明确报告不谎报成功；
   - `mr-push-check`（script）：本地三查——`git status --porcelain` 非空（未提交）/ `git rev-list --count HEAD --not --remotes` 非零（未推送）/ 不在工作分支 → exit 1 附原因（上游 command gate 等价物）；
   - `mr-open-check`（script）：`gh pr view --json state,headRefOid,url` 校验 MR 存在且 state=OPEN 且 head=本地 HEAD（上游 mr gate 的 gh 单平台等价物——引擎侧确定性验证，agent 无法谎报）；
   - `deliver` 改交付汇总：输出 MR 行（url/title/state，stdout 末行），不再 push/建 PR（上游 交付汇总 同款收窄）。
   - **rework 边（Q4-A）**：mr-open/mr-push-check/mr-open-check 失败 → rework 回 build（loop-v1）/ implement（devflow-lite）——错误文本经 upstream 反馈回 agent（上游「带反馈重试一次再等人」等价物），检查节点 maxReworks:2 封顶，耗尽 → run failed → held → 人。
4. **MR 落痕（Q5-A）**：模板级字段 `deliverEvidence`（= "deliver"）；引擎 onNodeDone 对该节点成功时 `appendRunHistory("deliver.mr", stdout 末行)`——G3 确认的证据源（只落痕不代跑发版不动）。
5. **sweep 脏检查（Q6-A）**：rmSync 前注入式本地双查（`git status --porcelain` + `git rev-list --count HEAD --not --remotes`，**不出网**）；任一非空或 git 命令失败（fail-closed）→ 跳过并计入返回 `skipped[]`；sweep 改 async，host sweeper 补 .catch。假阳性=多留几天（保留期本 best-effort）。
6. **脱密守护（上游吸收项折叠）**：executor script env 白名单测试——断言注入 env 键集不含 `_TOKEN/_KEY/_SECRET/_PASSWORD` 后缀键（固化现状卫生，防上游 docker exec 泄密同型）。
7. **发版（Q7-A）**：M6 产出评审通过后 `npm publish 0.1.0`（版本已 bump 未发，无需再 bump）；publish 后走 §16-11 后置事项。
8. **不变式**：G1/G2/G3 全部人工放行不动；MR 环节全部位于 G2 之后（交付物成型）、G3 确认（发版拍板）之前；三闸门语义零变化。

9. **落地补钉（M6 计划评审 R2/R3/R5–R7 修订，2026-11-18）**：
   - **工作分支引擎侧落地（R7）**：ensure 后置 `git checkout -b dsh-l/<runId>`（engine 传 branch 参）——「工作区永不落默认分支」由构造保证；mr-push-check 第三查=当前分支非空且 ≠ 默认分支（symbolic-ref 解参照值，退化 main）。
   - **rework 后代失效（R3）**：applyFailure rework 分支对齐驳回语义——target → ready + descendantsOf(target) 非 pending → skipped（error 字段保留）；advanceRun 既有 skipped 重激活令其逐个重走。**语义明示：g2 随 rework 重过人工放行**——重建后的代码是新交付物，须重新拍板（上游 onExhausted:human 的等价保真）。
   - **反馈通道保真（R3 连带）**：upstreamOf 改 error 优先、状态无关——skipped 化检查节点的失败文本仍进重臂 agent 的 prompt。
   - **mr-open maxReworks:2（R2）**：凡带 rework 出边的节点必带 maxReworks（applyFailure exhausted 语义）。
   - **mr-open-check head=本地 HEAD（R6）**：headRefOid vs git rev-parse HEAD——防旧 MR/旧 head 假绿。
   - **失败源 skipped 化窗口期（M6 产出评审 O1，设计语义采纳）**：rework 扫掠会把刚失败的检查节点自身置 skipped（它是 target 的 success 后代）→ 窗口期 summarizeRun.error=null；反馈文本经 upstreamOf error 优先进重派 prompt（钉例 d 锁定），耗尽路径仍完整可见（exhausted → run failed + 通知）。有意设计非疏忽。

## 20. 收敛补钉（2026-11-23 /grill-with-docs；Q1–Q33，三轮全按推荐）

背景：PR80 实录（run-1795335897221-1e28）暴露三类问题。①G1 双出口标签失职，主人点「G1 放行」误入引擎。②PR 候选走 issue 流水线：克隆 main、另起分支、重做改动，G2 后另开 PR81。③引擎会话头 cwd 是插件数据目录，宿主按会话头目录归属工作区，全部落在「未分组」。钢人结论：数据模型成立，问题在用户面（入口、词表、可见性）。本节只改用户面与交付语义，引擎内核不动（状态机、模板快照、三道人工闸门、确定性检查、克隆隔离）。

阅读指引：第 1–17 条为第 1 轮，第 18–27 条为第 2 轮，第 28–37 条为第 3 轮（按精简重审）。第 3 轮覆盖前文对应条目，冲突时以第 3 轮为准：第 2、18 条 → 第 28 条；第 4、20、22 条 → 第 29 条；第 5、21、27 条 → 第 30 条；第 8 条 → 第 31、32 条；第 24 条的首页规则 → 第 32 条；第 6 条的「发版确认」→ 第 33 条；第 25、26 条 → 第 34、37 条；第 17 条①② → 第 35 条；第 16 条 → 第 36 条（backlog）。

1. **成功判据（Q1）**：①未开工候选一步点到「开工…」。②点下去之前写明四件事：走哪条路、在哪干活、会话在哪、谁交付。③开工后任意时刻可从候选跳回会话。④界面只讲「下一步谁动」，不讲引擎内部状态。
2. **开工单入口（Q2）**：两种模式保留——「我来开」（开工会话）与「自动执行」（执行）。行内只留一个主动作「开工…」，二选一并写明上述四件事；选中即记 G1 pass（`/work/start` 与 `/run/start` 既有记账不变）。行内并列的「G1 放行 / 驳回」按钮删除；「不做」走人工推翻或关闭。
3. **「待拍板」退场（Q3）**：开工不再要求先移到 gating；该列与「移到 待拍板」按钮删除。存量 `stage=gating` 且无存活执行、G1 未 pass 的候选，展示层归「已分诊」（不改存储）。
4. **PR 与 issue 分流（Q4）**：issue 维持现状。PR 走自动执行时：检出 PR head 分支（摄取已存 `pull.headRef`，`src/github.mjs:83`），任务目标为「推进到可合并」，G2 含义＝可否合并，通过后推回原分支，永不新开 PR。PR 走我来开时：不自动切换用户本地检出的分支，开工消息写明分支名与 `gh pr checkout` 命令。
5. **产出候选认亲（Q5）**：自动执行为 issue 新开的 PR 被摄取后，标注来源候选，不进待分诊、不过分诊，作为该候选的交付证据。命名、落列与合并回填见第 2 轮。
6. **列语义唯一化（Q6）**：清单分组与看板共用一套列——待分诊（等分诊）/ 已分诊（等你挑）/ 待我确认（G2 放行、执行失败、发版确认）/ 进行中 / 已交付 / 已关闭（归档，含挂起）。存储 stage 枚举不动，列由展示层派生（`bucketOf` 扩展），无数据迁移；`verifying` 不再出现在任何界面。
7. **存活执行期间禁手工迁移（Q7）**：候选有 running/waiting 执行时，看板与行内均不提供手工迁移，只留「取消执行」。消除人工迁移与引擎 `syncStage` 两个写者互相覆盖。
8. **标签页 5 合 2（Q8）**：顶层只留「待我确认」与「清单」，有待确认项时前者为首页。看板降为清单内「分组 / 看板」视图切换。角色并入设置「高级」折叠区。会话页去向见第 2 轮。
9. **顶部管线删除（Q9）**：`stripCells` 的 4 个前环 chip 与模板节点不再展示。「现在做到哪」只在候选行内一句话（当前节点 + 下一个闸门）。阶段筛选另有下拉，不丢功能。
10. **行内动作收敛（Q10）**：直接可见仅三类——「开工… / 打开会话」「放行 / 打回」「取消执行」。人工推翻、移到已关闭、复制任务包、执行详情、历史收进「更多 ▾」。
11. **分诊维度与设置（Q11）**：分诊四维（真实性 / 紧急度 / 建议动作 / 置信度）不动。开工会话三键、`engineConcurrency`、`workspaceRetentionDays` 收进设置「高级」折叠。
12. **术语（Q12）**：「工作区」拆为三个词——宿主工作区（宿主侧栏项目分组，会话按会话头目录归属）/ 执行目录（按候选克隆的目录）/ 工作目录（会话工具实际读写目录）。GLOSSARY.md 已同步。
13. **「我来开」目录记忆（Q13）**：按仓库记住上次选择；首次默认本地检出 `~/workspace/<仓名>`；托管克隆退为次要选项。
14. **引擎会话归一个分组（Q14-A）**：登记一个宿主工作区「DSH Loop Forge」，路径＝执行目录的父目录。凡在执行目录里干活的会话（引擎节点、托管开工会话、分诊），会话头 cwd 取该父目录并挂接到它；工具目录仍指向各自的执行目录。在用户自己目录里干活的会话，归该目录已登记的工作区；未登记则如实提示「会出现在未分组」，不替用户新建工作区。
    - 宿主事实（rc.5 源码）：归属判据＝`realpath(header.cwd) === workspace.path`，会话头 cwd 建后不可改（`dsh-workspace/src/entity.ts:110-125`）；沙箱可写根＝会话头 cwd（`dsh-sandbox-policy/src/index.ts:116,199-201`）；插件挂接先例 `ctx.get('workspaceRegistry')` → `resolveByPath(cwd)` → `attachSession(id)`（`dsh-schedule/src/runtime.ts:483-486`）。
    - 排除项：协调会话 + `origin:'subagent'` 子会话。宿主对该类会话侧栏隐藏（`dsh-client-ui-workspace/src/client/tree.ts:229-235`）、Web UI 不可打开；嵌套视图只认官方子代理运行时写的事件。
15. **标题创建时设定（Q15）**：dsh-l 创建的会话在创建后立刻 `ctx.get('sessionTitle').rename(session, title)`（写入 `source.kind:'user'` 即钉住，自动起名不再覆盖；先例 `dsh-schedule/src/runtime.ts:494-498`）。格式：引擎节点「`<repo>#<n> · <节点> ②`」、分诊「`分诊 · N 条`」、开工会话「`<repo>#<n> · <标题>`」。约束「dsh-l 不改标题」收窄为「创建后不改」。
16. **分诊会话用完归档（Q16）**：`dispose` 不删存储，分诊会话以冷会话残留侧栏（`dsh-api-session-controller/src/list.ts:145-156`）。改为批次结束后 `workspaceRegistry.archiveSession`，归档前按第 15 条设标题。引擎会话在 run 终态后保留，不自动归档。
17. **P0 一并修**：①检查脚本的诊断必须进入失败记录（现 `src/engine/executor.mjs:95` 只收 stderr，回炉反馈为「exit 1: 」）。②`mr-body.md` 移出工作树（与 mr-push-check「工作树干净」互斥，`src/workflows/builtin.mjs:24`、`src/workflows/roles.mjs:14`）。③run.history 补记闸门到达 / 放行 / 驳回、节点开始 / 结束、回炉、终态（现仅 `workspace.cloned` 一条）——回归 GLOSSARY「回炉：带着失败记录」。

第 2 轮（Q17–Q25，全按推荐）：

18. **默认模式（Q17）**：「开工…」弹窗每次出现，默认选中「我来开」，不记忆上次选择；自动执行须每次明确点选。
19. **有存活执行时的入口（Q18）**：候选有 running/waiting 执行时，行内不出「开工…」，只有「打开会话」与「取消执行」；「另开我来开的会话」入「更多」，仅限本地目录（沿用 another + local 守卫）。取消执行后候选展示为「已分诊」，可再次开工（完整重开＝新 run，既有规则）。
20. **分流模板（Q19）**：内置模板按候选类型自动选择，UI 不提供手选。issue 沿用 `loop-v1`（`devflow-lite` 同样只服务 issue）；新增 `pr-loop`：检出 PR 分支 → 评审并修复（agent，新角色）→ 验证（script）→ G2「可否合并」→ 推回原分支 → 推送检查 → 交付汇总。复用 mr-push-check / mr-open-check（无改动可推时推送为空操作，检查自然通过）。`/run/start` 的 `templateId` 参数保留给 API 调用方。
21. **产出候选（Q21）**：词条「产出候选」。落「已交付」列，带来源标注与「待合并」标记；上游合并后自动回填「已合并」，不进待我确认——「上游关闭不代作主」的唯一例外（一次执行的机械产物）。发版确认只在来源候选上出现一次。产出候选可像普通 PR 候选一样再开工。GLOSSARY.md 已入册。
22. **无推送权限的 PR（Q20）**：来自 fork 或对 head 分支无推送权限的 PR，自动执行降级为「只评审不推送」（G2 后输出评审结论，不推回），「开工…」弹窗提前写明；「我来开」不受影响。
23. **会话页去向（Q22）**：删除「会话」标签页。候选行按候选列出其全部会话（最近在前，带节点名）；`getWorkSessions` 的 run 行改为读取全部节点的 `nodeStates[*].sessionId`（现仅读在途节点）。兜底孤儿行（parseWorkAnchor / id 前缀发现）随页删除。「确认交付」并入候选行（我来开的候选处于「进行中」时显示）。
24. **小项（Q23）**：分组 / 看板视图切换记住上次选择（本地保存，与 pinned filters 同款 storage 注入）；「待我确认」清空时自动回清单；存量 `stage=gating`、无存活执行、G1 未 pass 的候选展示为「已分诊」。
25. **里程碑（Q24）**：三个里程碑各自走 计划 → TDD → 验收。①止血与可见：Q14–Q16、P0（第 17 条）、Q22 的行内部分。②入口与分流：Q2–Q5、Q17–Q21。③界面收敛：Q6–Q13、Q22–Q23。
26. **ADR 与文档同步（Q25）**：只为「PR 与 issue 分两条交付语义」立 ADR-0003；其余决定易于回退，留在本节。定稿后同步 PRODUCT.md（开工会话由「G1 放行第二出口」改为「开工两模式之一」）、README 双语、design.md §4a / §8 各加一行指向本节的注记（v1 冻结，正文不改）。
27. **留给实施计划**：kickoff 首行格式、快捷键重排、i18n 键名、store 新增字段名（产出候选的来源关联）、`pr-loop` 角色名与评审清单、任务包 schema 为 PR 增补的字段（加法变更，golden 守护同步）。

第 3 轮（Q26–Q33，全按推荐；按「一件事是什么、每个概念是否挣得位置」重审）：

28. **开工入口改两按钮（Q26，覆盖第 2、18 条）**：「开工」是主动作，等于我来开。某仓库首次点击时选目录，选择器写明「会话将出现在：<宿主工作区名 / 未分组>」；之后按仓库记住目录，一键直达，按钮下方小字显示该目录；「更多 › 换个目录开工」可重选，目录不存在时回落到选择器。「自动执行」是并列的次级按钮，点击后确认一次，写明四件事：执行目录路径、从默认分支新起 `dsh-l/<runId>`、会话归「DSH Loop Forge」、G2 后自动开 PR；确认即记 G1 pass 并建 run。「默认模式」与模式选择弹窗作废。
29. **引擎只服务 issue（Q27，覆盖第 4、20、22 条）**：PR 候选不提供自动执行——`/run/start` 与 `candidate/gate` 的 G1 pass 对 PR 候选返回 409 `engine-issue-only`，行内无「自动执行」按钮。PR 候选只有我来开：开工消息写明分支名（`pull.headRef`）与 `gh pr checkout` 命令，不自动切换用户本地检出的分支。不做 `pr-loop`、新角色、推回原分支、无推送权限降级、任务包 PR 字段。G2 对所有候选只有一个含义：交付前。日后如需「自动验证 PR」，另加只跑验证脚本的短模板。决策记录见 ADR-0003。
30. **引擎开的 PR 不成为候选（Q28，覆盖第 5、21 条）**：deliver 节点把 PR 号与链接记在来源候选的 `delivery` 块，卡片显示「PR #n · 待合并 / 已合并」。摄取跳过这类 PR；合并后回填来源候选。「产出候选」词条、「上游关闭」例外、发版确认不重复提醒全部作废。
31. **看板删除（Q29，覆盖第 8 条的视图切换）**：删除看板视图（`kanban.mjs`、相关 i18n 键与测试）；「看板」词条退役，入「清单」的 _Avoid_。手工迁移保留在清单行内「更多」。
32. **标签页 2 合 1（Q30，覆盖第 8 条的标签页与第 24 条的首页规则）**：只留「清单」。待我确认置顶成列，卡片沿用原标签页的解释（上游完成项、放行后果、备注留痕）。页头「待确认 (N)」点击即只看该列（复用阶段过滤）。「有待确认项时切首页」「清空时回清单」作废。快捷键随视图数缩减（留计划）。
33. **发版确认降为标记（Q31，覆盖第 6 条的「发版确认」）**：待我确认只含 G2 放行与执行失败。「已交付」卡片带「未发版」标记，点击留痕（`release/confirm` 路由不变）；不进待我确认、不计入角标（`needsReview.releaseList` 移除）。G3 永远人工的原则不变。
34. **里程碑（Q24 修订）**：三个里程碑各自走 设计简报（/impeccable shape）→ 实施计划 → TDD → 验收。①止血与可见：第 14–16 条、第 23 条的行内部分、第 35 条。②入口收敛：第 13、19、28–30 条。③界面收敛：第 3、6–12、23、31–33 条，含删除会话页与看板。
35. **P0 更小修法（Q32，覆盖第 17 条①②）**：①取消 mr-opener「写 mr-body.md」的要求——无任何代码读取它，只有 `src/workflows/roles.mjs:14` 的提示词要求写、`test/roles.test.mjs:30` 断言这句话；不搬家。②执行器把 stdout 尾部并入失败记录（`src/engine/executor.mjs` 一处改动，所有脚本受益），不逐个改脚本。③run.history 补记不变。
36. **分诊直连模型（Q33，入 §16 backlog）**：宿主 llm 服务类型声明含 `prepareCall` 与 `stream`（`dsh-llm/lib/types/index.d.ts:418,444`），分诊可直连模型而不建会话。本轮不做：分诊会话仍按第 16 条归档，换通道的风险不混进本轮。
37. **文档同步时点**：PRODUCT.md、README 双语、design.md §4a / §8 的注记，随对应里程碑的实现一起改，避免文档先于行为。

**落地注记（2026-11-24）**

- **M1 落地注记（2026-11-24，commit 924d2bb + 20d5327）**：第 14–17 条与第 23 条的行内部分、第 35 条已实现；存量会话（含 PR80 run 的 3 个）的会话头目录不可改，仍在「未分组」，不迁移。
- **M2 落地注记（2026-11-24，commit 87b34c9；执行期增补 9271085、bc132b9、5431c85）**：第 13、19、28–30 条与第 14 条的提示句已实现；第 3 条的列与按钮删除仍在里程碑 3。存量 PR80 run（PR 候选，早于「引擎只服务 issue」）的处置：已取消（2026-11-24 19:48，用户授意、宿主重启后执行；run `cancelled`，原因 `user`）；取消后该候选回已分诊，行内的开工入口只有「开工」（「更多」中另有「换个目录开工…」）。

**实机核验（2026-11-24）**

- 宿主重启：19:46:24（MainPID 2266291 → 2498056）。
- 构建指纹（计划 Step 5 原样）：`grep -c -F "DSH Loop Forge" lib/host.js` = 3；`grep -c -F "engine-issue-only" lib/host.js` = 2。
- 时间戳判据（计划 Step 5 原文「启动时间 > 构建时间」）**不成立**：重启之后又有一次构建（5431c85 的另开守卫，19:52:18）。按评审 I7，以健康接口的构建标识为主证据。
- 健康接口 `build`：重启后读数 `415c6b2e54e6`（bc132b9 的宿主模块）；磁盘 `lib/host.js` 为 `b892e37e7b22`（5431c85；2026-11-24 19:55 读数）。运行中的宿主尚未热加载最新构建，待复读。2026-11-24 20:03 复读：健康接口仍为 `415c6b2e54e6`，磁盘为 `abd902a8192d`（d2f31d3，I8 修复）。
- 会话与工作区：新桶 `--home-ubuntu-.dsh-profiles-web-data-dsh-l-workspaces--` 存在；分诊会话标题「分诊 · 4 条」，已归档（`archivedSessionIds` 含之）；宿主注册表中「DSH Loop Forge」登记了两个开工会话与该分诊会话；开工会话标题「dsh-m#82 PR · chore(deps-dev): …」。
- Task 18 Step 4（F1，模型缺失）：临时将审批设为 `ask` 发起托管另开的会话 `dsh-l:work-mwumybtk-b23d97`，创建后已改回 `never`。`model/selection` 为 `zai-coding-cn / glm-5.3-flash`；`step/start` 1 次；`has no provider/model` 出现 0 次；提供方返回 429「已达到 5 小时的使用上限，限额 2026-11-24 23:12:17 重置」，重试 5 次后 `turn/end` 为 `error / RATE_LIMIT`；工具调用 0。**判定：本机的模型缺失已消除；Step 4 的字面判据「turn/end 不再是 error」未满足，原因是账号额度，额度恢复后复核。**
- 人读项（计划 B7③：两按钮、确认条、去向提示、「打开 · <节点>」点击、硬刷新）：**未覆盖**。本轮没有在界面上人工操作，也无法从宿主侧确认浏览器已取到最新 bundle。
- D1（16:46 重启）：两次重启都是先出现 `sudo systemctl show … Restart …` 查询，随后数秒内出现 `status=75/TEMPFAIL` 退出（16:45:56→16:45:59；19:46:18→19:46:19），走同一通道；发起者未知，待主人确认。
- 指针更正：PR80 取消后 `currentRunId` 保留为已取消的 run（设计 §2：指针＝当前执行、重开＝新 run、旧 run 留档），不清空。

**执行期增补（计划外，均已入库）**

- Task 18（F1）：开工会话始终安装模型，消费 `workSessionModel`（9271085）。既有缺陷，不是收敛引入：「有预设、无显式模型时不装模型」这条规则自开工会话首版即存在（`f75c485`，2026-11-21，设计如此，R1-6：不压制 preset 自带模型）；`f62738e` 只为无预设会话补装了宿主默认模型，预设分支的缺口一直保留到 `9271085`。
- Task 19（I4 / I5 / I3）：会话页空态文案跟上开工两模式；脏态取消出口补回归防护（bc132b9）。
- Task 20：「另开会话」只用明确的本地目录；记住托管或无记录时隐藏，会话页「不在列表」行无目录时隐藏（5431c85）。服务端对空目录的本地回退未改（API 语义，待主人决定是否收紧）。评审 K21 I8 另补（d2f31d3）：工具目录落在托管根下的会话行亦不给另开；服务端对托管根下的显式目录返回 409 `managed-dir-explicit`，托管只经 `workspace:"managed"` 进入。
- 计划文档：`cae443a` 入库的计划已含执行期勘正①（检测器判据），与评审定稿版不同；`7b861f0` 补入判据改写、用例名同步与增补。

**未结项**

- F1 复核：额度恢复后（23:12 之后）对新会话读 `turn/end`，确认不再是 `error`。
- 健康接口构建标识与磁盘构建（`b892e37e7b22`）的一致性：宿主热加载后复读。
- 界面人读项：未覆盖。
- 待主人：D1 发起者；「另开」的服务端空目录回退是否收紧。
- I6（建议，计划外）：交付 PR 被关闭但未合并时持续显示「待合并」；`/run/gate` 对 PR 候选无类型守卫。
