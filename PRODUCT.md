# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- host：Node ≥24 ESM（.mjs），零运行时 dependencies，esbuild 打包 lib/host.js。
- client：原生 DOM + Shadow DOM，零框架运行时，esbuild 打包 lib/client.js。
- 【已确认 2026-11-20】当年超时代答的「薄垂直层」技术栈经主人确认保留，推翻成本低（UI 层重写，host 与数据模型不动）。

## Users

iasi（GitHub iasiv5），独立维护者，一人维护 12+ 个 DSH 插件仓。场景：每天快速看清哪些 issue / PR 值得做、什么顺序做，并为「开工」打包好上下文。自用起步、结构可发布（配置驱动、双语、文档齐全），上架门留着但不着急走。

## Product Purpose

DSH Loop Forge（dsh-l）：DeepSeek Harness 的侧栏工作台插件。把你监看的 GitHub 仓库中所有 open issue / open PR 摄取成候选清单，用 LLM 分诊出真实性、紧急度与建议动作，三道闸门全部人工放行，开工时产出可交接的任务包并驱动自建轻工作流引擎完成构建→验证→交付。工作台管「看清楚、排优先级、拍板」与环内执行编排（v2 起，ADR-0002）。成功 = 分诊建议被主人真实采纳或推翻（有反馈环），而非永远无视。

## Positioning

不是 issue viewer——分诊建议 + 闸门纪律 + 任务包契约 + 自建工作流引擎构成「环」的驾驶舱；刻意不做通用中台（ADR-0001/0002：不依赖官方 loopforge-dsh bundle，无服务端基建，模型层对标 Tencent/LoopForge）。邻品拿不走的是「环」：从候选到交付一环扣一环，且每道闸都人工拍板。

## Operating Context

- 载体：DSH web 宿主侧栏——main slot 主栏整页 + sidebar.panellist（order: 30，排在全部官方条目之后），无独立 URL 路由。
- 使用节律：每日开工时打开侧栏看候选、分诊、拍板、开工；退出账号即回到登录门禁（监看配置保留，重连即恢复）。
- 首开策略【已确认 2026-11-20】：首次打开先过登录门禁（gh CLI 安装 → gh 登录 → 凭据校验，三关强制；gh 未装态页面只给「安装 gh CLI」一条路；装好后 CTA「连接 GitHub」为唯一设备流入口，「使用访问令牌」在辅助行——round-2 单主行动），全绿后进入「收活」：预勾选 12 个自研插件仓（iasiv5/ 下 dsh-skins、dsh-quota-watch、dsh-stock-kanban、dsh-onetree-log、dsh-obmc-web、dsh-copilot-auth、skills、dsh-m、dsh-send-later、dsh-skip-browser-auth、dsh-surf、dsh-agent-autoloop），首开即有真实候选；repo 选择器随时勾选/取消。
- 机器环境：token 只存 gh 凭据库（系统级 0600），工作台 store 仅元数据；宿主重启清空进程内登录状态机，无残留半态。

## Capabilities and Constraints

- 三道闸门（G1 开工前 / G2 交付前 / G3 发版前）永远人工放行；G3 永久人工（npm 发版不可撤）。落点：G1=环首 gate 节点、G2=环内交付前 gate 节点、G3=环外收尾闸（放行=人工确认已发版留痕，dsh-l 不代跑发版）。
- 分诊结果是建议，v1 绝不自动触发任何下游动作。
- 开工会话（G1 放行第二出口）：交给用户亲自开工的普通 DSH 会话，官方会话系统全权承载，dsh-l 只留索引与导航；三红线 = cwd 成对设置且先于首条消息、已登记会话零 dispose、未配置审批策略零 setPolicy。
- 收活闸门：未绑定 GitHub 账号前，仓库勾选与摄取一律 401 拒绝；进入工作台前另有三关强制门禁，全绿才放行。退出只解绑工作台，不动本机 gh 登录态。
- GitHub only（v1）；provider 接口预留 GitLab 适配位。gh-as-source（2026-11-20 翻案，替代 2026-11-19 自持案）：授权 token 只存 gh 凭据库，工作台 store.json credential 块只落元数据（source/scopes/verifiedAt/healthy/ghWrittenAt，store 版本 3 迁移剥离旧 token）；resolveToken 链 = credentials 引用覆写 → gh auth token。授权路径：CTA「连接 GitHub」设备流（gh 未装 409 拒绝发起）/ 辅助行「使用访问令牌」（verify-before-handoff：校验 → 强制移交 gh → 元数据落库，移交失败 502 不落库）；凭据可重新校验、更换、删除（gh logout 需显式勾选且限工作台自建登录）。限流（403/429）不误伤凭据健康、仅 401 置失效；摄取全量 ETag + 每刷新 60 请求预算。
- 中英双语：接宿主 locale 服务 + zh-CN / en 双字典，无私有语言开关；分诊理由语言跟随界面语言。
- 任务包 schema（v2）是工作台与执行引擎的交接契约：emit 对齐 agent-autoloop 事件语义（ADR-0001），role/workflow 块对齐 LoopForge 纯模型层（ADR-0002）。工作流模板=内置只读 + 数据目录 workflows/*.json 用户模板；run 锁模板快照；gate 是硬类型节点，不可配置为可跳过。
- npm dsh-l 已由 iasiv5 占位 0.0.1；面板 label 用解析式注册（label 随 lang 解析，歸藏设计同款）。

## Brand Commitments

- 显示名「DSH Loop Forge」；npm 包名 dsh-l（iasiv5 占位）。
- 大标题金句「连接代码库，让 Agent 自主交付」（用户选定，2026-11-20 删「你的」）；品牌区只留大标题，不加副标题/脚标。
- 双弧品牌标（蓝青渐变，icon.svg），衬底用品牌靛蓝 tint plate。

## Evidence on Hand

自用起步，无对外证据材料：无推荐语、无案例、无基准数据，此类内容一律不得虚构。已具备的真实基础是环境事实而非证据：12 仓预勾开箱即有真实候选。后续产生实测记录（候选量、分诊采纳率、交付次数）再补录。

## Product Principles

1. **闸门纪律**：自动化只到建议为止，三道闸永远人工放行（G3 永久人工）。
2. **环的完整性优先于功能广度**：摄取→分诊→任务包→执行→交付垂直打透，不做通用中台。
3. **真实功能优先**：每个状态走真实链路，不做假绿演示（gh 未装态实测即例证）。
4. **自用起步、结构可发布**：配置驱动、双语、文档齐全，上架门留着。
5. **宿主共生**：借宿主能力（locale、主题、slots），不自建基建。

## Roadmap

v1 数据面（摄取+清单+分诊建议；tag v0.0.1 基线）→ v2 工作流引擎：M1 域模型双层化 → M2 执行环闭环 → M3 看板+待我确认+飞书通知+角标 → M4 Role 入册+任务包 v2+devflow-lite（ADR-0002 / docs/design-v2.md）→ v3 会话协调者 adapter、G1 高置信自动放行、IM 双向拍板、GitLab。详见 README 与 docs/design-v2.md。

## Success criteria (v1)

- 打开工作台能一次看全 12 仓候选，操作路径（刷新/筛选/分诊/拍板）无需解释。
- 分诊建议被主人真实采纳或推翻（有反馈环），而非永远无视。
- 刷新、分诊、闸门操作全部有历史记录可回溯。
