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

v1 全部块（watch/candidates/snapshots/repos/ingestLog/settings/auth）形状不变；增量如下：

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
- 登录闸/收活板块不变；i18n 双字典同步新增键（locale-parity 测试守护）。

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
