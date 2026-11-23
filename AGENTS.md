# dsh-l（DSH Loop Forge）

单人交付工作台侧栏插件：GitHub issue/PR 分诊 + 三道人工闸门 + 轻工作流引擎。开始前读：

1. `PRODUCT.md`（产品契约）→ `DESIGN.md`（瓷面设计纪律 + Do/Don't）→ `GLOSSARY.md`（领域词汇）
2. 领域细节：`docs/design.md`（v1 冻结）· `docs/design-v2.md`（v2 现行）· `docs/plans/`（P0–P2 升级计划 = 实施判例库，含对抗评审修订）
3. 评审时读 `CODING_STANDARDS.md`（Shadow DOM 事件重定向 / 注入句柄命名两条判例规则）

仓约：零运行时依赖（devDeps 仅 esbuild）；UI 改动先 `npm run build` 再全量 `npm test`；提交前显式退出码双 0；`lib/client.js` + `lib/host.js` 随源码同 commit 入库。pre-commit 钩子跑全量测试（hooksPath 已配 `.githooks`，换机 clone 后重跑 `git config core.hooksPath .githooks`）。
