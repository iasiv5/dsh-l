# 升格单人交付工作台：自建轻工作流引擎，参考 LoopForge 纯模型层

dsh-l v1 是分诊驾驶舱（看清楚、排优先级、拍板），干活交给 v2+ 执行引擎。2026-11-16 grill 对表后拍板：参考对象从 agent-autoloop 换为 Tencent/LoopForge（MIT，只读镜像 `.dsh-research/loopforge`）——其产品定位（coding-agent 交付编排 + 人工闸门纪律 + 需求→交付回流）与本插件目标高度契合；且其「纯模型/流程层」（WorkflowDefinition 图 schema、Role 模型与节点/委派双绑定、Run 状态机与 approve/reject/retry 语义、Needs review 收件箱、run 锁模板快照、`reject{targetId}` 按边回退、能力探测诚实降级合同）不依赖服务端基建，可整体作为宿主内插件的设计蓝本。据此 dsh-l 定位升格为「单人交付工作台」：驾驶舱 + 环内执行编排都成为本体。ADR-0001 的纪律保留并延伸：不骑通用中台——本次同样不依赖官方 `@tencent/loopforge-dsh` bundle（共存互补），不引入 DB/自管沙箱/多租户/runner，一切骑宿主公开 API；任务包仍是工作台与执行器的唯一交接契约（v2 升 version:2，增 role/workflow 块，emit 信封不变）。

## Considered Options

- 保持纯驾驶舱，执行外包给官方 loopforge-dsh：零引擎成本，但核心执行链绑第三方仓库，正是 ADR-0001 否决过的形态（autoloop 判例）；且可选依赖带来测试矩阵爆炸。
- 全面靠拢 LoopForge 平台（多人/服务端/Docker 画布设计器）：违反宿主边界与薄层纪律，对单人维护者是负资产。
- 升格为单人交付工作台，自建轻引擎吸收纯模型层（选定）：状态单一权威在 store，agent 节点与分诊同款 ctx.agents 通道（实证最厚），工程量与产品目标匹配。

## Consequences

- 引擎形态：插件侧 DAG 调度器——节点按依赖边就绪即跑（按边并行），gate 只闸必经路径；agent 节点 = ctx.agents 短会话，script 节点 = 宿主子进程，gate 节点 = 引擎挂起等人工。
- 吸收/拒绝清单与域模型见 docs/design-v2.md；内置模板 `loop-v1` 是 v1 硬编码 stage 机的泛化实例，存量候选迁移后 currentRunId=null，无破坏性。
- 会话协调者（LoopForge Local 同构）不进 v2，role→派发接口留 adapter 缝（v3 议）。
- GLOSSARY 2026-11-16 增补：工作流/执行/节点/角色/看板/待我确认；「管线」退役。
- IP 姿势：模型语义自由借鉴（MIT 零义务）、代码全自写；仅逐字复制其 skills/manifest/模板文本时附 THIRD_PARTY_NOTICES（superpowers 派生目录另加 Jesse Vincent 声明）。
