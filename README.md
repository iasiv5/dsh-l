# L♾️p Engineering 工作台（dsh-l）

**把你的 GitHub 仓库变成一条看得见的环：候选进来、分诊排序、拍板开工、编码验证、交付落地——交付产生的新候选再回到清单，环继续转。**

**中文** | [English](README.en.md)

状态：设计定稿（2026-11-12 grill 共识），v1 实施中。

## 它是什么

DeepSeek Harness 的侧栏工作台插件：监看你指定的 GitHub 仓库，把所有 open issue 与 open PR 摄取成候选清单，用 LLM 分诊给出真实性 / 紧急度 / 建议动作；三道闸门（开工前 / 交付前 / 发版前）全部人工放行。

- **v1**：数据面（摄取 + 清单 + 分诊建议）+ 监看仓库选择器 + 手动刷新
- **v2**：飞书单向通知 + 执行环（任务包 → agent 会话 → 状态回流）
- **v3**：G1 高置信自动放行、IM 双向拍板、交付 Ship、GitLab provider

领域词汇见 [GLOSSARY.md](GLOSSARY.md)；架构取舍见 [ADR-0001](docs/adr/0001-park-autoloop-build-thin-layer.md)；详细设计见 [docs/design.md](docs/design.md)；实施计划见 [docs/plans/](docs/plans/)。

## 开发

```bash
npm install
npm run build   # 产出 lib/host.js + lib/client.js
npm test
```
