---
name: DSH Loop Forge (dsh-l)
description: DSH 侧栏工作台插件——瓷面工作台：釉色随宿主主题的玻璃瓷面语言
colors:
  gate-indigo: "#324DE2"
  arc-sky: "#69B9FF"
  arc-mint: "#45E7A4"
  arc-teal: "#05909D"
  signal-ok: "#2da44e"
  signal-warn: "#d29922"
  signal-err: "#d1242f"
  canvas: "canvas"
  canvastext: "canvastext"
typography:
  title:
    fontSize: "19px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  heading:
    fontSize: "16px"
    fontWeight: 650
    letterSpacing: "-0.01em"
  body:
    fontSize: "13px"
  label:
    fontSize: "12px"
    fontWeight: 500
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11.5px"
  display-code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "26px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  chip: "5px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  card: "14px"
  pill: "999px"
spacing:
  sm: "6px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  cta-primary:
    backgroundColor: "{colors.canvastext}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 18px"
  badge-pill:
    backgroundColor: "color-mix(in srgb, currentColor 4%, transparent)"
    textColor: "{colors.canvastext}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-mono:
    backgroundColor: "color-mix(in srgb, currentColor 5%, transparent)"
    textColor: "{colors.canvastext}"
    rounded: "{rounded.chip}"
    padding: "1px 8px"
  gate-card:
    backgroundColor: "color-mix(in srgb, canvas 96%, transparent)"
    textColor: "{colors.canvastext}"
    rounded: "{rounded.card}"
    padding: "22px 24px 18px"
---

# Design System: DSH Loop Forge（dsh-l）

设计系统记录（2026-11-19 登录门禁改造沉淀，2026-11-20 按 document 规范节重排）。轻量起步：只记已实现且必须长期一致的规范。

## Overview

**Creative North Star: "瓷面工作台"**

面板如瓷：半透 `canvas` 釉面（96% 混透明）+ `backdrop-filter` 玻璃底 + 深影托起，自成温润体感；釉色不私有——颜色一律走宿主系统关键字 `canvas` / `canvastext` 经 `color-mix()` 派生，宿主换主题即整器换釉。门禁靛蓝 `#324DE2` 是唯一的印款色，只出现在品牌标、品牌衬底与 focus ring 上，占比极低，稀缺即识别。

工作台是 **Operate 模式**界面：可扫读性、一致性、平台惯例优先于表达；品牌感收在精确细节（品牌标、门禁行、健康点）。登录门禁面板是唯一的品牌表达场，进入工作台后回归朴素 Operate 语言，但材质语言（瓷面玻璃）全线贯通。

**Key Characteristics:**
- 主题自适应釉面：无任何硬编码浅色底，主题由宿主切换
- 每个状态只有一个主 CTA（单一主行动纪律）
- 状态语义三点色：ok 绿 / wait·warn 琥珀（呼吸）/ err 红
- 玻璃瓷面 + 深影浮起的混合深度语言
- 动效两次作者化时刻（2026-11-20 主人拍板破例）：① gate-in 入场 220ms；② `success-turn` 授权成功定影 200ms（触发面=仅设备流轮询发现 authorized；PAT 保存/安装完成路径直 enter 不编排；挂载残留永不触发）。reduced-motion 全关。回归快路径**不做**（保持每次三关，主人拍板取舍）。

## Colors

釉色借宿主：中性色全部由 `canvas` / `canvastext` 系统关键字经 `color-mix(in srgb, …)` 派生，不设自有中性色盘。文字四阶（2026-11-20 对比度校准，双主题实测 AA：正文 ≥4.5:1，light 为绑定约束侧）：`currentColor 72%`（次级正文，light 6.02:1 / dark 8.55:1）、`currentColor 68%`（注脚/标签/门禁状态值，light 5.26:1 / dark 7.79:1）、`currentColor 65%`（placeholder/弱提示，light 4.80:1 / dark 7.17:1）、`currentColor 75%`（强调片段）。同百分比 ≠ 同可达性——校准以 light 侧为准，dark 侧超额达标；层级全序 65 < 68 < 72 < 75 < 100 严格递增。表面阶：`canvas 96%`（卡面）、`canvas 90%`（工作面）、`canvas 78%`（遮罩）、`currentColor 3–6%`（chip/输入底/hover）。边框阶：`currentColor 8–20%`（卡 10%、pill 12%、chip 16%、按钮 20%）。

### Primary
- **门禁靛蓝** (#324DE2)：品牌印款——focus ring（60–70% 混透明）、品牌标衬底（9% tint + 20% 边）、图标渐变深端；不参与任何功能语义。

### Secondary
- **弧线渐变对** (#69B9FF→#324DE2 / #45E7A4→#05909D)：仅存在于品牌双弧标 SVG 内部，不作 UI 用色。

### Semantic（信号语义系）
- **信号绿** (#2da44e)：ok 点、令牌有效片段（文字级 `color-mix(in srgb,#2da44e 80%,currentColor)`）。
- **琥珀待办** (#d29922)：warn 点、wait 呼吸点、限流横幅（边 40% / 底 10% 混 canvas）。
- **警报红** (#d1242f)：err 点、错误横幅与表单错误（边 32–35% / 底 8–9%）、危险按钮与删除动作（文字 `color-mix(in srgb,#d1242f 78–85%,currentColor)`）。

### Named Rules
**The Host-Theme Rule.** 禁止硬编码任何浅色底值——主题由宿主切换，写死底色必在另一主题翻车（2026-11-19 实录：color-scheme 只挂面板层导致深底黑字）。语义色固定值只允许出现在点、片段、横幅的小面积上；文字级语义色必须 `color-mix(in srgb, <语义色> 85%, currentColor)` 混入前景。
**The One Voice Rule.** 主 CTA 是唯一反色元素（`canvastext` 底 + `canvas` 字，hover 混 84%）；一屏之内反色只出现一次。
**The Same-Rule-Different-Readability Rule.**（2026-11-20 critique）同一 alpha 比例在深浅主题下可达性不同（light 52%≈4.27:1 不达标、dark 同档≈4.95:1 达标）——文字阶校准以 light 为绑定约束侧实测，dark 侧超额达标即接受；校准后四阶 65/68/72/75 全线 ≥4.5:1。

## Typography

**Body Font:** 宿主系统字体栈（插件不自带字族，继承宿主）
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

**Character:** 系统字体 + 紧字距标题，克制的工程感；mono 只服务代码与数据（scope chip、设备码、令牌输入框），绝不当「技术感」装饰。

### Hierarchy
- **Title**（700, 19px, -0.01em）：面板大标题（金句）；窄屏降至 17px（≤560）、16px（≤380）——原「15.5px」系 client ≤380 块内重复声明（16px 与 15.5px 同键后者覆盖前者）被误收为第三档，2026-11-20 评审勘误为两档映射；另有 max-height:640 矮屏压缩维度（非标题档）。
- **Heading**（650, 16px）：卡片级标题（gate h3）。
- **Card-label**（600, 14px）：卡头条目名（凭据卡标题、门禁行名称 550）。
- **Body**（400, 13px, 行高 1.5–1.55）：门禁行、kv、intro 13.5px。
- **Label**（500, 12px）：徽章、pill、注脚、hint。
- **Mono-chip**（mono, 11.5px）：scope chip。
- **Display-code**（mono 700, 26px, 0.08em）：设备流码框唯一大字。

### Named Rules
**The Inherited Voice Rule.** 不声明 font-family（mono 除外）——字体是宿主的，插件只定尺寸与字重。

## Layout

登录遮罩 `.gateWrap`：`absolute inset:0` 只盖插件主区（侧栏始终可退回），flex 列 + `margin:auto`——空间够则居中，不够则顶对齐随容器自然滚动（手机不出现内层拖动条）；padding 24px 并吃 `env(safe-area-inset-*)`。面板容器 `.gatePanel` `min(560px,100%)`；凭据卡 `.gate` 满宽。断点：≤560px 主断点（padding 收敛、双方法竖排、kv 标签列 64→56px）、≤380px 二级收紧、`max-height:640px` 矮屏压缩纵向节奏。间距节奏：卡内节与节用 `border-top + 14–18px` 分隔，组内 gap 6–12px。

## Elevation & Depth

混合深度：玻璃（backdrop blur 12–14px）承担面，深投影承担浮。影是结构性的（浮起的面板），不是状态反馈。

### Shadow Vocabulary
- **Gate card**（`0 32px 64px -24px rgb(0 0 0/.4), 0 4px 16px rgb(0 0 0/.14)`）：登录卡与浮层级面板。
- **Work surface**（`0 18px 40px -20px rgb(0 0 0/.35)`）：工作台内统一可读表面。
- **Brand plate**（`0 2px 6px rgb(50 77 226/.16), 0 8px 20px -8px rgb(50 77 226/.28)`）：品牌标衬底的柔影，取图标主蓝染色。

## Shapes

圆角阶梯：chip 5px → 表单/横幅/小钮 8px → CTA/码框/方法钮/ghMark 10px → 图标衬底/窄屏卡 12px → 卡 14px → pill 999px。边框一律 1px `currentColor 8–20%` 混透明；**虚线边（dashed）专属临时表单**（PAT 输入浮层）——实线=稳定结构，虚线=暂态。

## Components

### Buttons
- **Shape:** CTA/方法钮 10px；小钮 8px；文字钮 6px。
- **Primary（单一主行动）:** `canvastext` 底 `canvas` 字（反色），高 44px、padding 0 18px、600 字重；hover 混 84%；disabled opacity .6。每状态全卡仅一枚。
- **Secondary（双方法钮）:** 透明底 1px 20% 边，hover 6% 混底；flex:1 等分，窄屏竖排满宽。
- **Danger:** 警报红 85% 底 `canvas` 字（破坏性确认按钮）；文字级危险动作用红混字。
- **Focus:** 统一 `outline: 2px solid color-mix(#324DE2 60–70%, transparent)` + 2px offset。

### Badge / Pill（状态徽章）
- **Style:** pill 999px，4% 混底 + 12% 边，12px/500；7px 点色表意（ok 绿 / warn·wait 琥珀 / err 红），wait 点 1.6s 呼吸动画（reduced-motion 关）。

### Cards / Containers
- **Gate card:** 14px 圆角、96% canvas 釉面 + blur 14px、10% 边、深影、gate-in 入场 220ms `cubic-bezier(.22,1,.36,1)`（唯一动效时刻）。卡内不放子卡——门禁行/kv/表单都是卡内行。
- **Work surface:** 14px 圆角、90% canvas 釉面 + blur 12px，工作台统一可读表面。
- **Compact 卡:** 收活态迷你卡（徽章 + 最近校验 + 内联表单），同一组件 connectionCard.mjs 双形态。

### Inputs
- **Mono input:** 8px 圆角、36px 高、mono 13px、4% 混底 18% 边；placeholder 40% 阶；focus 靛蓝 ring。防自动填充三件套（懒挂载 + new-password + readonly 首交互解锢）。

### Signature: 门禁行 + 凭据 kv
- **门禁行:** 点 + 名称（550 字重）+ 状态值（68% 阶；bad 红混）。行是纯状态，不内嵌动作——动作归 CTA 区。
- **凭据 kv:** dl 网格 64px 标签列（68% 阶），scope 用 mono chip，缺失权限 chip 红框红字（35% 边 / 9% 底）。
- **辅助操作:** 右对齐文字按钮（72% 阶），hover 归位；破坏性动作必须经确认浮层。

## Do's and Don'ts

### Do:
- **Do** 全部 UI 文案走 zh-CN / en 双字典（i18n + locale-parity 守护）；`cred.*` 键在组件内静态字面量引用。
- **Do** 错误文案同时命名问题与恢复动作；限流文案必须声明「不影响凭据有效性，无需重新授权」。
- **Do** 修改任何 UI 前先 `npm run build` + 跑 i18n/locale-parity 守护。
- **Do** 大标题用产品金句「连接代码库，让 Agent 自主交付」；品牌区只留大标题。

### Don't:
- **Don't** 硬编码浅色底值（The Host-Theme Rule）。
- **Don't** 卡片内嵌子卡；门禁行内嵌动作按钮。
- **Don't** 动态拼接 i18n 键名（动态前缀白名单守护会红，注释里出现该字面模式都会误红）。
- **Don't** 一个状态出现两个主 CTA；mono 字体用于非代码/数据内容。
- **Don't** 忘记 reduced-motion 降级（gate-in、dot-breathe 必须成对给 `@media (prefers-reduced-motion:reduce)` 关闭）。

## 工程锚

- `article.gate > button.cta` 是 ui-probe 视图判定锚，重构不得移除该类名链。
- loginGate 只清理自己拥有的 `.gateWrap`；shadow `<style>` 归 workbench 所有。
- 视觉基准：docs/mock/login-panel-mock.html（v3）。
