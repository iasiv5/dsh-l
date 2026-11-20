# DESIGN.md — DSH Loop Forge（dsh-l）

登录门禁改造（2026-11-19）期间沉淀的设计系统记录。轻量起步：只记本次改造触及且必须长期一致的规范。

## 定位与模式

- 工作台是 **Operate 模式**界面：可扫读性、一致性、平台惯例优先于表达；品牌感收在精确细节（品牌标、门禁行、健康点）。
- 登录门禁面板是唯一的品牌表达场（全面板三段式），进入工作台后回归朴素 Operate 语言。

## 主题与色彩纪律

- **主题自适应**：颜色一律走 `canvas` / `canvastext` 系统关键字 + `color-mix()` 派生（表面/边框/文字三阶：52%、62% 透明度文字阶），**禁止硬编码浅色值**——主题由宿主切换，任何写死底色都会在另一主题下失效（2026-11-19 实录：color-scheme 只挂面板层导致深底黑字）。
- 语义色允许少量固定值：ok `#2da44e`、warn `#d29922`、err `#d1242f`（点/片段）；文字级语义色用 `color-mix(in srgb, <语义色> 85%, currentColor)` 混入前景防主题翻车。
- 主按钮（CTA）：单色反色（`canvastext` 底 + `canvas` 字），hover 混 84%；品牌蓝 `#324DE2` 只用于 focus ring、品牌标衬底与品牌标本身。

## 组件规范

- **卡片**：`.gate`（radius 14、1px 10% 边、深投影、gate-in 入场 220ms 为唯一动效时刻；reduced-motion 关闭）。卡片内不放子卡——门禁行/kv/表单都是卡内行。
- **状态徽章**：pill 形，点色表意（ok 绿 / wait·warn 琥珀 / err 红），四态 + 限流态；琥珀点带呼吸动画（reduced-motion 关闭）。
- **门禁行**：点 + 名称（550 字重）+ 状态文本（52% 阶；bad 用红混入）。行是纯状态，不内嵌动作按钮——每个状态只有一个主 CTA（ 单一主行动纪律）。
- **凭据 kv**：dl 网格 64px 标签列；scope 用 mono chip（11.5px），缺失权限 chip 红框红字。
- **辅助操作**：右对齐文字按钮（62% 阶），危险动作用红混入；破坏性操作（删除凭证）必须经确认浮层，gh auth logout 复选框按 `ghWrittenByUs` 门控。
- **连接卡双形态**：登录面板 full / 收活 compact（徽章 + 最近校验 + 内联展开的表单与确认）。同一组件（connectionCard.mjs），状态→文案键映射集中在 deriveView。

## 文案纪律

- 全部 UI 文案走 zh-CN / en 双字典（i18n + locale-parity 守护）；`cred.*` 键在组件内**静态字面量引用**，禁动态拼接键名（i18n 动态前缀 WHITELIST 守护会红——连注释里出现该字面模式都会误红，注释措辞要避开）。
- 大标题为产品金句：「连接代码库，让 Agent 自主交付」（用户选定，2026-11-20 删「你的」）；品牌区**只留大标题**，不加副标题/脚标。
- 错误文案必须同时命名问题与恢复动作；限流文案必须声明「不影响凭据有效性，无需重新授权」。

## 登录面板信息架构（视觉基准 docs/mock/login-panel-mock.html v3）

1. 品牌区：`.gateMark` 蓝调衬底 + 双弧标 + `gateTitle`。
2. 授权卡 `.gate`：卡头（ghMark + GitHub 仓库授权 + 徽章 + 重新校验圆钮）→ 三关门禁行 → 凭据 kv（已校验态）→ 双方法连接区（未配置态）→ 设备流码框 / PAT 表单 / 错误提示 → 主 CTA → 辅助操作 → 状态注脚。
3. 脚注区：一句话安全说明（常显）。

## 工程锚

- `article.gate > button.cta` 是 ui-probe 视图判定锚，重构不得移除该类名链。
- loginGate 只清理自己拥有的 `.gateWrap`；shadow `<style>` 归 workbench 所有。
- 修改任何 UI 前先跑 `npm run build` + i18n/locale-parity 守护。
