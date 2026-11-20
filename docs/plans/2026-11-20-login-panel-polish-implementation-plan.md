# 登录门禁面板 polish 批次（critique 四方向全修）实施计划

## 目标

- D1 对比度：次级文字阶按双主题实测校准至 AA（正文 ≥4.5:1、大字号 ≥3:1），层级保序，detect 双主题零 low-contrast。
- D2 失败态 + 成功峰值：mock 补 4 个失败样例；真实客户端新增授权成功序列（第二作者化动效 `success-turn`，主人已拍板破例）+ aria-live + PAT 可见性切换 + 设备码过期倒计时；mock 授权成功样例。
- D3 响应式：mock 补齐两档宽度断点（≤560/≤380）与矮屏压缩，标题降档映射 17px（≤560）/16px（≤380）；client chip 换行语义统一（inline-block + overflow-wrap:anywhere，治窄屏横向溢出）。
- D4 决策点精简：ready/ratelimit 决策点 5→4（口径=可交互控件：CTA+头部图标钮+aux 3 项；critique 的 6 系 recheck 双形态重复计数；aux 移除「重新校验」、头部图标钮保留）；删除凭证间距分离；bad 行点色改红；scopemiss 长句精简；patSave 高度对齐 40px；方言白话化。
- D5 基准卫生：mock 五连（来源矛盾 / fresh recheck 瞬移 / PAT 取消落点 / 复制反馈 / 金句定稿同步）。
- D6 规范同步：DESIGN.md + design-full.md + sidecar（文字阶新数字、success-turn 动效词汇、回归快路径不做之明文取舍）。
- 回归快路径：**不做**（主人拍板：保持每次三关）——此取舍写入 DESIGN.md 动效/门禁节明文。

## 架构快照

- 全部改动在 **client + mock + docs 层**（免重启：client-only 经页面刷新/HMR 生效）。host/handlers 零改动。
- 文字阶现状：client 用 `color-mix(in srgb, currentColor N%, transparent)`，实际分布 ≥7 档——40（placeholder）/45（chip.muted）/52（注脚·标签·状态值等 7 处）/55（meta·empty·switchLink·patCancel）/60（group·intake h3）/62（intro·auxAct）/75（detail reason）；mock 用自有 `--text-2/3` 变量（44% 等）。两套都按本计划校准，**校准数值以双主题 blend 实测为准，不预设**（验收：≥4.5:1 正文级、≥3:1 大字号、层级全序保序 主>次>弱，覆盖全部归并后档位）。
- 成功序列（`success-turn`）：设备流后台轮询发现 authorized（schedule 非 initial 路径）→ 不再立即 onConnected，改为客户端编排：gate2 转绿（~150ms）→ gate3 转绿（~150ms）→ badge 翻「已配置」（~150ms）→ 卡片 `success-in` 一次性定影（200ms，边框 signal-ok keyline + settle 位移）→ `onConnected()`（总计新增 ≤650ms）。reduced-motion：跳过编排与动画，瞬切。挂载残留 authorized（initial 路径）维持 5240f7f 防线：本地按 idle、永不触发。
- 决策点精简后的 ready 态动作面：CTA「{login} · 进入工作台」+ 头部 recheck 图标钮 + aux「更换访问令牌」「删除凭证（间距分离）」= 4 个；限流态同构（warnBox 仅展示限流文案与自动恢复预期，无重复重试钮——头部图标钮即重试入口；绑定态 degradedBanner 自带重试钮不在门禁内）。

## 全局约束

- Node ≥24 ESM；client 原生 DOM + Shadow DOM 零框架（PRODUCT.md Stack，逐字继承）。
- 双语 zh-CN / en 双字典同步（i18n + locale-parity 守护）；`cred.*` 静态字面量键。
- gh 登录态纪律、出网白名单、`article.gate > button.cta` ui-probe 锚、compact 卡/数据面/executor 路径不动（B6/B7 冻结延续）。
- reduced-motion：新增/既有动画必须成对给出关闭规则。
- mock 是视觉基准：本批完成后 mock 与 design-full.md 数字必须一致（文字阶、断点、动效词汇）；检测器对 mock 的 low-contrast/dark-glow/icon-tile-stack 应清零或登记豁免。
- 测试红绿纪律；无额外全局约束。

## 文件结构与职责

- Modify: `src/client/components/workbench.mjs` — 文字阶全档归并校准（CSS 数组 ≥7 档 alpha + 媒体块 gateTitle 重复声明修复）；`.chip` 换行语义统一（inline-block + overflow-wrap:anywhere）；patSave 高度 40px；删除凭证间距分离；gates 区 aria-live + 同值不写守卫；patInput 显示/隐藏切换；设备码过期倒计时（deviceLine）；recheck transition reduced-motion 成对。
- Modify: `src/client/components/connectionCard.mjs` — aux 移除 recheck 项 + 删除凭证间距分离；scopemiss 长句键改短句；**stCls bad 行 dot 色 err 化（:405）**；成功序列编排在 loginGate（见下）。
- Modify: `src/client/components/loginGate.mjs` — `finishAuthorized(initial)` 统一两处 authorized 出口（schedule 顶层 + 轮询回调）+ `success-turn` 编排与生命周期协议；reduced-motion 分支。
- Modify: `src/client/locale/zh-CN.mjs`、`en.mjs` — 新增 `auth.deviceExpiresIn`、`cred.patShow/patHide`、scopemiss 短句键、成功文案（如需）；`patHint` 方言白话化（「会覆盖现有凭据」）。**无新增错误键**：`errHandoff/errGhMissing` 已在场并已映射（connectionCard errKeyFor），不引入新 host 错误前缀（免重启保持）。
- Modify: `docs/mock/login-panel-mock.html` — 文字阶变量校准；两档宽度断点 + 矮屏压缩 + 标题降档映射；4 个失败样例 + 授权成功样例 + 工具栏接线；来源矛盾修正；fresh recheck 去瞬移；PAT 取消回退来路；复制反馈；金句候选 0「链接」改「连接」+ 默认金句删「你的」；patHint 同步；bad 行 dot-err 与 .save 高度同步；chip 换行语义统一；recheck transition reduced-motion 成对。
- Modify: `.impeccable/design-full.md`、`.impeccable/design.json` — motion 增 `success-turn`；文字阶 token 数字更新；「回归快路径不做」取舍入册。
- Modify: `DESIGN.md`（地图随 write 刷新由工具处理；motion 节句子在 design-full 中）。
- Modify: `docs/design.md` — 门禁/凭据节文案与对比度纪律句。
- Test: `test/client-render.test.mjs`（aux 无 recheck、success 编排、倒计时、可见性切换）、`test/i18n.test.mjs`、`test/locale-parity.test.mjs`。
- 核证工具（只读+scratch）：critique-a 的 blend 诊断法 + critique-b 的 detect URL 扫描配方（IMPECCABLE_BROWSER + --no-sandbox wrapper）。

边界保持：host/handlers/store 零改动（免重启）；`article.gate > button.cta` 锚；双 recheck 的**头部图标钮**保留（删的是 aux 文字项）。

## 任务清单

### Task 1: 文字阶对比度校准（D1，全档归并）

- 文件：`src/client/components/workbench.mjs`（CSS 数组全档 alpha）、`docs/mock/login-panel-mock.html`（--text-2/--text-3 与相关变量）、`.impeccable/design-full.md`（token 数字）、`.impeccable/design.json`（colorMeta/typographyMeta 如涉及）。
- 步骤：①grep 全档盘点（评审 Q9 实测 40/45/52/55/60/62/75 七档，含出现位置清单落盘 scratch）；②blend 计量脚本（复用 critique-a 诊断法）建基线读数表（全档 × 双主题实测，落盘 scratch）；③定映射表（如：40+45→新 placeholder/弱阶、52+55→新注脚阶、60+62→新次阶、75→新强调阶——具体数值按实测迭代，验收 ≥4.5:1 正文级 / ≥3:1 大字号、全序严格递增 主>次>弱）；④按映射归并全部出现位置（client ≥7 处 + mock 变量）；⑤placeholder 阶一并校准；⑥检查升档不破版（.pill/.badge 小字、gates 行高）。
- 验证：①`impeccable detect --json <mock-url>` 双主题（light/dark，critique-b 配方）low-contrast 发现 = 0；②blend 脚本报告归并后全部档位 ≥4.5:1（正文级）/≥3:1（大字号）且全序严格递增；③`node --test test/client-render.test.mjs` 全绿。
- 预期：detect 退出码 0（mock URL 双主题）；读数表 + 映射表落盘 scratch。

### Task 2: mock 失败态样例 ×4 + 成功样例 + 接线（D2 mock 侧）

- 文件：`docs/mock/login-panel-mock.html`。
- 动作：①STATES 增 4 个失败样例：`verify401`（令牌失效：err 横幅 + 门禁第三行红 + CTA「重新授权 · 连接 GitHub」）、`deviceExpired`（码过期：门禁行红「授权已过期」+ CTA 回「连接 GitHub」）、`installFailed`（安装失败：注脚错误 + 单行回「未安装」）、`handoff502`（移交失败：errForm 呈现 502 文案 + 表单保持开）；②`authorized`（成功样例：三行全绿 + badge 已配置 + kv 在场 + CTA「iasiv5 · 进入工作台」）；③工具栏接线（data-s 按钮）；④aux 项同步 Task 5 的精简形态（无 recheck 文字项）。
- 验证：playwright 逐态点击截图（11+4 张落盘 critique-b 同级目录）人工目检；grep 断言 `data-s="verify401"` 等 4 个新值在工具栏在场；mock 文件 `node --check` 不可用——用 playwright 打开无 console error 作为冒烟。

### Task 3: 真实客户端失败/辅助体验补全（D2 client 侧）

- 文件：`src/client/components/workbench.mjs`、`src/client/components/loginGate.mjs`、`src/client/components/connectionCard.mjs`、locale 双文件、`test/client-render.test.mjs`。
- 动作：①gates 容器增 `role="status" aria-live="polite"` + **同值不写守卫**（评审 Q10：apply() 对 textContent 无条件赋值会令读屏周期性全量播报——逐字段 diff，值不变不写；覆盖 gate 行/badge/sub/cta）；②deviceLine 增过期倒计时（status.device.expiresAt → locale 键 `auth.deviceExpiresIn`：「· N 分钟后过期」；无 expiresAt 不显示；键归 auth 段与既有 auth.deviceExpired 同列——评审 Q13）；③patInput 增显示/隐藏切换钮（locale 键 `cred.patShow/patHide`，切换 type password↔text；**风险留痕（评审 Q11）**：输入框在 shadow DOM 内 PM 主路径不触达，切换仅用户主动点击后发生，autocomplete=new-password 保留——防自动填充三件套的回归敏感区结论不变）；④四条失败路径 UI 覆盖**加测试断言固化现状**（评审 Q16：expired=deriveView deviceExpired 分支、failed=auth.deviceExpired 分支、install-failed=notes installFailed、502=errKeyFor gh-handoff-failed——均已核实在场，预期零改动，用例防回归）。
- 验证：`node --test test/client-render.test.mjs` 新增用例：倒计时文本（expiresAt 注入）、可见性切换 type 翻转、gates aria-live 在场、**同值二次 update 无文本节点变更**（FakeElement children 哨兵断言）、四失败路径现状固化；全绿。

### Task 4: 成功序列 `success-turn`（D2 峰值，主人已拍板破例）

- 文件：`src/client/components/loginGate.mjs`、`src/client/components/workbench.mjs`（keyframes + reduced-motion）、locale（如需成功文案）、`.impeccable/design-full.md` + `design.json`（动效词汇）。
- 动作：①抽公共 `finishAuthorized(initial)` 统一两处 authorized 出口（schedule 顶层非 initial 分支 + pending/authorizing 轮询回调内 authorized 分支——评审 Q1：设备流主路径走轮询回调，只改一处即行为分叉）；非 initial 时执行编排：置 gate2/gate3/badge 依次转绿的本地状态（150ms 步进 setTimeout 链）→ `success-in` 200ms 定影 → `onConnected()`；②workbench CSS 增 `@keyframes success-in`（border keyline signal-ok + settle）与 `.gate.success-turn` 类；③编排生命周期协议（评审 Q2）：编排链收进 `successTimers[]` 挂接现有 `stop()` 清理；每步前置 `if (dead || !shadow.isConnected) return`（`dead` 从历史摆设转为真实参与判断）；编排期间收到非 authorized 状态立即中止并按最新真实状态 sync；**真实 gates 未全绿禁编排退瞬切**（伪造绿会在 onConnected→reload 后被打回）；reduced-motion 跳过全部中间态瞬切；④挂载残留（initial）路径维持 5240f7f 防线不变；⑤规范三处同步：design-full.md 动效节（第二作者化时刻，**触发面=仅设备流轮询发现 authorized**——PAT 保存成功与安装完成自动续走路径直 enter 不编排，边界明文防下轮 critique 挑「PAT 成功零表达」（评审 Q14）；残留永不触发）、design.json motion 数组、「回归快路径不做」取舍句；⑥顺带补既有动画 reduced-motion 成对：`.recheck svg` transition（workbench 与 mock 两处，评审 Q12）。
- 验证：`node --test test/client-render.test.mjs` 新增用例：①轮询发现 authorized → 编排被调度（timer 序列断言）→ onConnected 在编排尾触发；②编排中途登出（api.logout 后 refresh 翻转非 authorized）→ onConnected 不触发、卡面回落真实状态；③reduced-motion 瞬切；④挂载残留用例（round-2 已有）保持绿；⑤`dead` 在 loginGate.mjs 存在读取点（grep ≥1，纠正历史摆设）。**前置（评审 N1）**：test/client-render.test.mjs 的 FakeElement stub（:9-42）增 `isConnected` 属性（默认 true；用例②编排中途登出场景置 false 驱动卸载语义，与 api.logout 翻转非 authorized 双保险）——否则每步 `!shadow.isConnected` 检查在 stub 下恒真 return，用例①必红且会诱导实现者删除检查=协议在真实 DOM 失效（假绿雷区）。全绿后本轮 host 零改动确认（`git diff --stat src/host.mjs src/handlers.mjs src/store.mjs src/github.mjs` 为空）。

### Task 5: mock 响应式断点补齐（D3，映射先定）

- 文件：`docs/mock/login-panel-mock.html`、`src/client/components/workbench.mjs`（≤380 重复声明修复）、`.impeccable/design-full.md`（映射表补录）。
- 动作：①**先定映射表（评审 Q4）**：标题降档两档——≤560 → 17px、≤380 → 16px（design-full 原「17/16/15.5px」中的 15.5 系 client ≤380 块内 16px 与 15.5px 重复声明的遗留值被规范误收——已核实现 workbench ≤380 块内两行同键后者覆盖前者；16px（≤380）+ max-height:640 矮屏压缩为第三维度，宽度断点实为两档）；design-full 文字阶句改「窄屏降至 17px（≤560）、16px（≤380）」；client ≤380 块删除 15.5px 重复行（保留 16px）；②mock 补两档宽度断点 + 矮屏压缩（数字与 client/规范一致）；③金句 `text-wrap:balance`（修「让 Agent 自/主交付」断点）；④**chip 换行语义双端统一（评审 N2 修正版·作用域覆写）**：client 侧**不动全局 `.chip`（workbench:30，服务候选行/数据面 chip，B6 冻结）**，也不在 :105 直接加 white-space（同特异性 0-1-0 后源码者胜，会连带覆盖数据面 nowrap）——以更高特异性作用域覆写：CSS 数组 :105 后新增 `.gate .chip{white-space:normal;display:inline-block;overflow-wrap:anywhere}`（0-2-0，仅作用登录卡/凭据卡子树；client scope chip 现状继承 :30 的 nowrap、压制 anywhere，故必须覆写）；mock `.chip`（约 L135）直接同改 `display:inline-block; overflow-wrap:anywhere`（mock 无 nowrap 病，症状是内联断框）。
- 验证：playwright 390/320 视口截图落盘；金句单行或均衡两行、chip 边框不断裂（目检 + 断言脚本：`getBoundingClientRect` 高度单行化检查 title）；**chip 断言两条（评审 N2 修正）**：320 视口凭据卡 scope chip 无横向溢出（`getBoundingClientRect().right` ≤ 卡右缘）+ 候选行 chip 仍 nowrap（数据面回归守卫——grep 断言 workbench:30 全局 `.chip` 行的 white-space:nowrap 原样在场，源码级冻结守卫）；`grep -c "gateTitle{font-size:15.5" src/client/components/workbench.mjs` 为 0（exit 1=无匹配，独立断言）。

### Task 6: 决策点精简 + 细节打磨（D4/D5 杂项）

- 文件：`src/client/components/connectionCard.mjs`、workbench.mjs、locale、mock。
- 动作：①deriveView aux 列表移除 recheck 项（ready/ratelimit 头部图标钮保留=重试入口；门禁内限流为 warnBox 展示，无重复重试钮——原「限流横幅自带重试钮」句系绑定态元素误引，已删，评审 Q5）；②aux 内删除凭证项前加间距分离（`margin-left:8px` 或分隔符）；③bad 行 dot 色改 err（**connectionCard.mjs:405 stCls**：bad → "err"；**mock renderGates 约 L491 同步 dot-err**——两处基线一致，评审 Q6）；④mock scopemiss 第三行 40 字括号长句换短句（「令牌有效 · 缺 read:org（组织仓库发现降级）」）；client 侧 `cred.g3BadScope` 如同步超长一并精简；⑤patSave 高度 34→40px（**mock .save 约 L177 同步**，评审 Q6）；⑥patHint/文案白话化（「同槽覆盖」→「会覆盖现有凭据」等）；⑦mock 五连：scopemiss/ready kv 来源改 srcPat、fresh recheck 改无副作用刷新、PAT 取消回退来路态、复制按钮接剪贴板 + 「已复制」反馈、**金句候选 0「链接你的代码库」改「连接」（mock:363）+ 默认金句删「你的」（mock:268，对齐 design-full Do 定稿）**（评审 Q8：评估 A 的「链接错别字」靶点实证在候选 0 而非标题；标题真实差异=多「你的」）。
- 验证：`node --test test/client-render.test.mjs` 新增：ready 态 auxAct 无「重新校验」文字项且可交互控件计 4（CTA+头部图标+更换令牌+删除凭证）、删除凭证与相邻钮有间距（style 断言）、ratelimit 态同构计 4；mock playwright 冒烟无 console error；i18n/locale-parity 全绿；**compact 形态目检截图**（patSave 40px 与 compact 共类，评审 Q15）。

### Task 7: 文档同步 + 收口

- 文件：`.impeccable/design-full.md`、`design.json`、`docs/design.md`、`docs/mock/login-panel-mock.html`（已含于前任务）。
- 动作：①design-full.md：文字阶 token 新数字（双主题分列）、motion 节 success-turn 词条、决策点精简后的 ready 动作面、回归快路径不做之取舍句；②design.json motion 数组 + narrative.dos（如涉及）；③design.md 对比度纪律句（「同一比例 ≠ 同一可读性，按主题实测」）；④全量 `npm test` + `npm run build` + commit。
- 验证：全量测试 0 fail；build 指纹更新；commit 落盘（单 commit：`feat(client+mock): login panel polish — AA contrast calibration, failure/success states, responsive breakpoints, decision-point diet (critique round: 26/40)`）。

### Task 8: 终验（免重启批次）

- 动作：①detect 双主题双视口复扫 mock：low-contrast/icon-tile-stack/dark-glow = 0（icon-tile-stack 若保留头部结构，登记 ignore.md 豁免并注明主人批准）；②playwright 全状态截图落盘 + 目检（**含 compact 态**，评审 Q15）；③ui-probe 构建指纹探针确认 client 生效；④向主人报告 polish 前后对照（critique 26/40 → 复评预期）。
- 验证：detect 退出码 0（或仅登记豁免项）；截图目检记录；`git status` 干净。

## 任务间接口契约

- Task 1 Produces：文字阶百分比（client CSS 数组 + mock 变量 + design-full token 同一数值）→ Task 2/3/5/6 的样式基线。
- Task 2 Produces：mock STATES 新样例名（verify401/deviceExpired/installFailed/handoff502/authorized）与工具栏接线 → Task 5 断点验证在这些态上跑。
- Task 3 Produces：locale 键 `deviceExpiresIn/patShow/patHide` + gates aria-live 结构 → Task 6 白话化复用 locale。
- Task 4 Consumes：schedule 非 initial authorized 路径 + 轮询回调 authorized 路径（两处出口由 finishAuthorized 统一）；Produces：`finishAuthorized`/`success-turn`/`success-in` 与编排时序（≤650ms）+ 生命周期协议（successTimers/dead 检查/中止语义）。
- Task 5/6 均只触 mock+client，互不依赖，可并行。

## 执行纪律

- 开始前批判性复查本计划；按任务顺序执行，每任务跑其验证；TDD 处先红后绿（样式类任务以「改动前可观察状态」替代：Task 1 红=当前 detect 3 条 low-contrast、Task 3 红=无 aria-live/倒计时不显示、Task 4 红=authorized 两处出口均瞬移 onConnected 无编排、Task 6 红=aux 含重新校验）。
- 阻塞/计划与现实不符 → 停下说明。
- 全部任务完成后跑最终验证并输出修改摘要。
- 免重启批次：完成后主人刷新页面即生效（client-only）。

## 最终验证

- `npm test` 全量 0 fail；`npm run build` 指纹更新。
- `impeccable detect` mock URL 双主题 low-contrast = 0；icon-tile-stack 清零或登记豁免。
- playwright 全状态截图目检 + 记录；`git status` 干净；向主人输出 polish 前后对照摘要。
