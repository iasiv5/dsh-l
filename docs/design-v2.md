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
