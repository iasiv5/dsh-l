# 停用 agent-autoloop 路线，自建薄执行层，保留任务包交接契约

dsh-l 需要执行引擎跑通「构建→验证→交付」。workspace 里已有 dsh-agent-autoloop（上游 agent-autoloop 的 fork + DSH 原生适配层，进度约 Stage C），已高质量解决 IM 卡片、agent 派活、交付管线与事件溯源持久化。我们决定**不**复活它：通用中台的维护负担（上游同步、协议兼容、内核纯净性纪律、模拟级 CI）正是它被停置的原因，把新工作台拴上去会继承这份负担。dsh-l 改为自建面向个人的薄垂直层，直接使用宿主公开 API（ctx.agents 等，配方见 autoloop 仓库 docs/dsh-api-mapping.md，钉版 0.2.2-rc.1）。

## Considered Options

- 骑在 autoloop 上做纯客户端：能力复用最大，但须先完成并长期维护其 DSH 适配层——已被所有者否决的重负。
- 完全独立、不参考 autoloop：失去其宿主 API 审计文档与飞书双向通道参考代码，无谓。

## Consequences

- 任务包（Task Package）schema 设计时对齐 autoloop 的事件/派发语义：autoloop 日后若复活，dsh-l 可把执行层换成驱动 autoloop，工作台层不重写。
- autoloop 的 docs/dsh-api-mapping.md 是两条路线共享的宿主 API 配方书；DSH 升级时两仓都对照它复核。
- autoloop plugins/feishu/channel.ts（lark-cli 双向卡片）留作 v2+ IM 双向控制的参考实现。
