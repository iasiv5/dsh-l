# PRODUCT.md

## Product

L♾️p Engineering 工作台（dsh-l）：DeepSeek Harness 的侧栏工作台插件。把你监看的 GitHub 仓库中所有 open issue / open PR 摄取成候选清单，用 LLM 分诊出真实性、紧急度与建议动作，三道闸门全部人工放行，开工时产出可交接的任务包。工作台管「看清楚、排优先级、拍板」；干活与落地交给执行引擎（v2+）。

差异化：不是 issue viewer——分诊建议 + 闸门纪律 + 任务包契约构成「环」的驾驶舱；刻意不做通用中台（见 ADR-0001）。

## Primary user

iasi（GitHub iasiv5），独立维护者，一人维护 12+ 个 DSH 插件仓。场景：每天快速看清哪些 issue / PR 值得做、什么顺序做，并为「开工」打包好上下文。自用起步、结构可发布（配置驱动、双语、文档齐全），上架门留着但不着急走。

## Platform

web——DSH web 宿主侧栏：main slot 主栏整页 + sidebar.panellist（order: 30，排在全部官方条目之后：插件管理 0–2、自动化任务 10、上下文洞察 20，与自动化任务 / 上下文洞察 / 歸藏设计同列）。无独立 URL 路由。

## Stack

- host：Node ≥24 ESM（.mjs），零运行时 dependencies，esbuild 打包 lib/host.js。
- client：原生 DOM + Shadow DOM，零框架运行时，esbuild 打包 lib/client.js。
- 【推断·代答】技术栈由结构化提问确认时超时未答，按推荐项代定（quota-watch / stock-kanban 先例，与「薄垂直层」定位一致）。用户可随时推翻，翻案成本低（UI 层重写，host 与数据模型不动）。

## First run

首次打开预勾选 12 个自研插件仓（iasiv5/ 下的 dsh-skins、dsh-quota-watch、dsh-stock-kanban、dsh-onetree-log、dsh-obmc-web、dsh-copilot-auth、skills、dsh-m、dsh-send-later、dsh-skip-browser-auth、dsh-surf、dsh-agent-autoloop），首开即有真实候选；repo 选择器随时增删。

- 【推断·代答】首跑策略提问超时未答，按推荐项代定。

## Durable facts & constraints

- 三道闸门（G1 开工前 / G2 交付前 / G3 发版前）永远人工放行；G3 永久人工（npm 发版不可撤）。
- 分诊结果是建议，v1 绝不自动触发任何下游动作。
- GitHub only（v1）；provider 接口预留 GitLab 适配位。token 复用本机 gh 登录态，可用 credentials 记录覆写。
- 中英双语：接宿主 locale 服务 + zh-CN / en 双字典，无私有语言开关；分诊理由语言跟随界面语言。
- 任务包 schema 是工作台与执行引擎的交接契约，对齐 agent-autoloop 事件语义（ADR-0001）。
- npm dsh-l 已由 iasiv5 占位 0.0.1；显示名「L♾️p Engineering 工作台」。
- 面板 label 用解析式注册（label 随 lang 解析，歸藏设计同款）。

## Roadmap

v1 数据面（摄取+清单+分诊建议）→ v2 飞书单向通知 + 执行环（任务包→agent 会话→状态回流）→ v3 G1 高置信自动放行、IM 双向拍板、交付 Ship、GitLab。详见 README 与 docs/design.md §10。

## Success criteria (v1)

- 打开工作台能一次看全 12 仓候选，操作路径（刷新/筛选/分诊/拍板）无需解释。
- 分诊建议被主人真实采纳或推翻（有反馈环），而非永远无视。
- 刷新、分诊、闸门操作全部有历史记录可回溯。
