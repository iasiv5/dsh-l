# dsh-l Coding Standards（评审时读；实现时由 design-lint/测试机械兜底）

导航：`PRODUCT.md`（产品契约）· `DESIGN.md`（瓷面纪律与 Do/Don't）· `GLOSSARY.md`（词汇）· `docs/plans/`（P0–P2 计划 = 判例库，每条规则标注来源判例）· `test/design-lint.test.mjs`（机械守护清单）。

## R1 Shadow DOM 事件重定向

树内派发的事件冒泡到 **host 级**监听时，`e.target` 被 Shadow DOM 改写为宿主元素——typing 守卫（INPUT/TEXTAREA/SELECT/contentEditable 检查）永不命中，输入框打字会被快捷键劫持吞字。事件监听一律挂 **shadow 根**，typing 判定取 `e.composedPath?.()[0] ?? e.target`，双保险缺一不可。

（判例：P1 B1「typing 劫持」——测试桩结构性测不出，只有真实 DOM 复现；见 docs/plans/2026-11-22-p1 §10 注记。）

## R2 注入句柄命名

deps seam 统一命名 `a`（`const a = deps.api ?? api`）；组件内其它局部变量禁用单字母 `a`。遮蔽 seam 会把动作静默路由到错误对象（判例：P2 Task 1 `const a = sel(...)` 遮蔽，actions.mjs）。机械守护：design-lint 断言 `const a = ` 仅允许 `deps.api ?? api` 形态。

## R3 内联样式压过 coarse 层

coarse 层（触屏 44px 触点/16px 输入字号）靠媒体查询实现，**元素内联 style 会压过它**。组件禁止内联 `min-height:`（workbench.mjs 的共享 CSS 数组除外）与 `font-size:14px` 判例值；触点尺寸一律交给 coarse 层接管。机械守护：design-lint R2/R3。
