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

<!-- impeccable:design-map -->
Name: DSH Loop Forge (dsh-l)
Colors: primary: gate-indigo #324DE2; tertiary: signal-ok #2da44e; tertiary: signal-warn #d29922; tertiary: signal-err #d1242f
Fonts: ui-monospace (code, display-code)
Spacing: sm 6px, md 14px, lg 18px, xl 24px
Radius: chip 5px, sm 8px, md 10px, lg 12px, card 14px, pill 999px
North Star: "瓷面工作台"
Rules:
- The Host-Theme Rule. 禁止硬编码任何浅色底值——主题由宿主切换，写死底色必在另一主题翻车（2026-11-19 实录：color-scheme 只挂面板层导致深底黑字）。语义色固定值只允许出现在点、片段、横幅的小面积上；文...
- The One Voice Rule. 主 CTA 是唯一反色元素（`canvastext` 底 + `canvas` 字，hover 混 84%）；一屏之内反色只出现一次。
- The Inherited Voice Rule. 不声明 font-family（mono 除外）——字体是宿主的，插件只定尺寸与字重。
Elevation:
- Gate card（0 32px 64px -24px rgb(0 0 0/.4), 0 4px 16px rgb(0 0 0/.14)）：登录卡与浮层级面板。
- Work surface（0 18px 40px -20px rgb(0 0 0/.35)）：工作台内统一可读表面。
- Brand plate（0 2px 6px rgb(50 77 226/.16), 0 8px 20px -8px rgb(50 77 226/.28)）：品牌标衬底的柔影，取图标主蓝染色。
Don't:
- Don't 硬编码浅色底值（The Host-Theme Rule）。
- Don't 卡片内嵌子卡；门禁行内嵌动作按钮。
- Don't 动态拼接 i18n 键名（动态前缀白名单守护会红，注释里出现该字面模式都会误红）。
- Don't 一个状态出现两个主 CTA；mono 字体用于非代码/数据内容。
- Don't 忘记 reduced-motion 降级（gate-in、dot-breathe 必须成对给 `@media (prefers-reduced-motion:reduce)` 关闭）。
Do:
- Do 全部 UI 文案走 zh-CN / en 双字典（i18n + locale-parity 守护）；`cred.*` 键在组件内静态字面量引用。
- Do 错误文案同时命名问题与恢复动作；限流文案必须声明「不影响凭据有效性，无需重新授权」。
- Do 修改任何 UI 前先 `npm run build` + 跑 i18n/locale-parity 守护。
- Do 大标题用产品金句「连接代码库，让 Agent 自主交付」；品牌区只留大标题。
Full: .impeccable/design-full.md (read a section when you need its detail)
