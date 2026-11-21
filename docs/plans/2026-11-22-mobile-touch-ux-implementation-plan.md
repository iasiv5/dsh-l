# 移动端触控与编排重构（Mobile Touch UX）实施计划

> 方法：/impeccable（Operate 模式）。R2 修订版：并入对抗评审 Round 1 全部 11 项（R1-1…R1-12，含两类编号合并）。证据与评审台账：`.dsh-research/ux-plan-review-scratch/`（ledger.md + r1–r8 实测取证）；现状截图证据：`.dsh-research/dsh-l-t8-debug/`（ev1/ev2/m5；**ev3 与 ev2 sha256 相同属无效取证——第三状态截图在执行期补拍**）。

## 目标

手机端（coarse pointer / 窄视口）把「按钮样式与功能编排」从「桌面布局的挤压版」重构为触控优先：44px 触控目标、状态→主动作映射（一屏主动作 ≤4 且唯一反色 CTA 有明确归属）、修复 P0 滚动不可达与悬浮胶囊遮挡、补触压反馈。**桌面（宽视口 + fine pointer）渲染零变化（像素级，判据见 Task 6）**。

## 证据与痛点（P0–P7，全部实测）

| # | 痛点 | 证据 |
|---|---|---|
| P0 | **面板内容不可达**：shadow host `overflow:hidden` 裁掉 230px 溢出；touch 上滑无滚动；`:host{overflow-y:auto}` 注入后 scrollTop=230 可达（r4/r5/r7 取证） | ux-plan-review-scratch |
| P1 | 头部按钮竖排单字堆叠（刷/新、设/置、退/出） | ev1-top.png |
| P2 | 动作按钮 h=28px；移到 系列节距 34px 误触 | 触控测量 JSON |
| P3 | 展开详情 = 单列 14 控件（3 select + 1 input + 10 按钮，5 disabled；building 行另有 重试/取消；workRow 我来开/打开会话）无主次分组 | r2-detail.json + ev2 |
| P4 | 底部悬浮胶囊遮挡（实测紧凑态 h26 top805；遮挡强依赖胶囊状态） | r1-measure.json |
| P5 | 行展开无可见状态（无 chevron/高亮） | m5 对比 ev1 |
| P6 | 无触压反馈（仅 :hover） | CSS 审计 |
| P7 | input/select font-size 14px → iOS 聚焦自动放大；双击缩放未防 | R1-12 实测口径 |

## 设计方向（DESIGN.md 规则逐条继承）

- Host-Theme / One Voice / 无 font-family 声明 / reduced-motion 降级照旧。
- **断点矩阵（R1-8 修正）**：复用仓库既定断点——窄视口布局层 = `(max-width: 560px)`（不再新立 480）；触控层 = `(pointer: coarse)`。正交矩阵：**fine+宽 = 桌面（零变化红线）；coarse+任意宽 = 触控层（44px/active/16px 表单）；窄视口（≤560）= 布局层（:host 滚动/胶囊避让/header 单字态/底部预留）**——两层可叠加（coarse+窄 = 全量）；平板（coarse+宽 768+）拿触控层 + P0 滚动修复（不拿布局层其余项）。桌面窄窗（fine+窄）拿布局层不拿触控层——与现状 560/380 行为连续。
- **状态→主动作映射（R1-6 修正，One Voice 合规）**：不新增反色——主动作行用全宽 44px 强调边框形态，每状态唯一主 CTA 归属如下：

| 候选状态 | 主动作行内容（全宽 44px） | 说明 |
|---|---|---|
| 待拍板（gating，无活跃行） | **我来开**（唯一反色 CTA）＋ G1 放行/驳回 成对（原位保留，驳回不消失） | 打开会话不出现（无活跃行） |
| building + G1 已过（重试态） | **我来开**（反色） | 打开会话互斥替代（无活跃行时）；gating=首开工未放行态，勿混 |
| 有活跃行（任意 stage） | **打开会话**（唯一动作，我来开互斥不渲染） | 既有互斥逻辑 |
| building/verifying（runRow 在） | 打开会话 ＋ 重试/取消（原位） | 交付入口保持在「会话」板块（impl-review O1 决议），行级不重复 |
| 其它阶段 | 复制任务包（有包时）居次位 | |

- **编排分层**：主动作行（上表）→ 阶段迁移 chip 组（移到×4，横向滑动）→ `<details>` 折叠「人工推翻」（sel×3+理由+提交）→ G2/G3 状态门控原位（disabled 可见）。首屏可见 enabled 按钮：待拍板态 = G1×2 + 我来开 + 复制 = **4**（≤5 达标）；building 态 ≤4。

## 全局约束

- 桌面红线判据（R1-10 落地）：**实现前重采桌面基线截图**（评审基线与复核日 HEAD 同源；实现期间 HEAD 可能前进，防御性重采）+ 实现后同视口截图**逐像素 diff == 0**（playwright 截图比对脚本，落盘 scratch）+ ui-probe exit 0。
- 触控下限判据（R1-7 口径钉死）：**「可见（getClientRects 非空）∧ 未 disabled ∧ tag∈{button,select} 的元素盒高 ≥44」**；chip 组显式纳入 44（统一，不豁免）；文本 input 豁免 44（文本录入非点选目标）但 ≥36 且 font-size ≥16（P7）；**0×0 隐藏元素过滤**（连接卡隐藏按钮不假红）。
- 遮挡判据（R1-3 落地）：探针运行时扫描 fixed/sticky 底部元素取最小 top = capTop，断言最深可交互元素 bottom ≤ capTop − 8；CSS 预留 = `calc(56px + env(safe-area-inset-bottom))`（胶囊实测 26px + 余量 30px；iOS 底部安全区由 env 承担）。
- 双语键：新增 1 键 `actions.overrideGroup`（人工推翻折叠摘要）+ chevron 用字面量 ▾/▸（无新键）。
- TDD + 探针输出落盘 `.dsh-research/dsh-l-touchux/`。

## 文件结构与职责

- Modify: `src/client/components/workbench.mjs` — style 表断点矩阵段（coarse 层 + ≤560 层 + :host 滚动 + 底部预留 + :active + 16px 表单 + touch-action:manipulation）；header 刷新/退出按钮包 `span.btn-label`；tabs 触控高度。
- Modify: `src/client/components/actions.mjs` — header 设置按钮同包裹；rowActions 重排（状态→主动作行 / stage-chips 组 / details 折叠人工推翻）；复制任务包次位。
- Modify: `src/client/components/candidateRow.mjs` — 行 chevron（aria-expanded 已有，R1-5）+ 展开高亮 + `role="region" aria-labelledby`（R1-12）。
- Modify: `src/client/locale/zh-CN.mjs` + `en.mjs` — `actions.overrideGroup` 键。
- Test: `test/client-render.test.mjs` — 主动作映射断言 / details 结构 / btn-label 包裹 / chevron / **style 表含 `:active{opacity:.72}` 文本断言**。
- Verify: `.dsh-research/dsh-l-touchux/` — 移动/平板/桌面三探针 + 基线与验收截图 + 像素 diff 脚本输出（不入库）。

## 任务清单

### Task 1: 断点矩阵基座（CSS）+ P0 滚动修复

- style 表新增三段：
  - `(pointer: coarse)`：button/select `min-height:44px`；chip 同 44（R1-7 统一）；`:active { opacity:.72 }`；候选行 `min-height:48px`；`input,select { font-size:16px }`（P7）；全局 `touch-action: manipulation`（P7）；**:host { overflow-y: auto !important; }（P0 与宽度无关——平板 coarse+宽 同样成立；fine pointer 永不命中 coarse，桌面零风险）**。
  - `(max-width: 560px)`：**`:host { overflow-y: auto !important; }`（P0。!important 必要：挂载 div 为 React 内联 `overflow:hidden`（index.mjs），shadow 普通级联压不过内联——评审 r9 实证；!important 只越权 Y 轴，X 轴仍内联 hidden 正合意）**；滚动区 `padding-bottom: calc(56px + env(safe-area-inset-bottom))`（R1-3）；tabs `overflow-x:auto`；header 单字态样式钩子（`.btn-label { display:none }`）。
  - 既有 380px 二级收紧不动。
- 验证：桌面探针 exit 0 + 像素 diff==0；移动探针 P0 断言（touch 上滑 → shadow host scrollTop>0 且最深可交互元素 bottom ≤ capTop−8）。

### Task 2: header 窄视口单字态（落点：workbench.mjs 刷新/退出 + actions.mjs 设置）

- 三按钮文案包 `<span class="btn-label">`（aria-label 保留全文）；窄视口段隐藏 span、44px 定宽居中单字（刷/设/退）——消除竖排堆叠。
- 验证：DOM 断言三按钮 btn-label + aria-label；移动截图头部单行。

### Task 3: 展开详情状态→主动作编排（核心，R1-6 重写）

- rowActions 按上文映射表重排：
  1. `.primary-actions`（全宽 44px，反色唯一 = 我来开当其为主 CTA 时）：按状态映射渲染；G1 放行/驳回成对原位保留；
  2. `.stage-chips`（横向滑动，44px）：移到×4；
  3. `<details class="override-box">` summary=`actions.overrideGroup`：sel×3 + 理由 input + 提交；
  4. G2/G3 门控原位（disabled 可见）；复制任务包次位。
- 验证（client-render）：四状态映射断言（待拍板=我来开+G1对+无打开会话；活跃行=打开会话+无我来开；重试态=我来开；building=打开会话+重试取消）；details 内 sel×3+input；chips 4 键。

### Task 4: 行展开可见性（落点：candidateRow.mjs，R1-5 修正）

- renderRow：chevron ▾/▸ 随 aria-expanded 切换（既有属性，无新键）；展开行 `color-mix(currentColor 6%, transparent)` 底（reduced-motion 无 transition）；`.detail` 加 `role="region"` + `aria-labelledby` 指向行标题 id（R1-12）。
- 验证：client-render 断言 chevron 切换 + region/labelledby；移动截图展开态。

### Task 5: tabs 与过滤条触控

- tabs（coarse）min-height 44、`overflow-x:auto`；过滤条 select 44 + 16px。
- 验证：移动探针 tabs h ≥ 44 测量落盘。

### Task 6: 验收（三探针 + 像素 diff + 口径断言）

- **基线重采**：实现前桌面基线截图（当前 HEAD，非评审旧基线）。
- 移动探针（Pixel 7 coarse）：口径断言（可见∧enabled∧button/select 盒高 ≥44；0×0 过滤；chip 纳入 44）输出落盘；P0 滚动断言；遮挡断言（capTop 运行时实测）；**:active 判据：mouse.down 按住任一按钮 250ms → matches(':active')=true 且 computed opacity==0.72**；状态截图含补拍 ev3。
- 平板探针（768×1024 coarse）：触控层断言。
- 桌面探针：exit 0 + 像素 diff==0。
- `npm test` + `npm run build`。
- 实机：主人手机目视（最终）。

## 执行纪律

- 按 Task 顺序；每任务跑对应验证；桌面像素 diff 每次改 CSS 后即跑（红线即时发现）。
- 探针/截图/diff 输出落盘 `.dsh-research/dsh-l-touchux/`；真实仓库只落代码与测试。
- 计划外发现只记录不扩 scope。
