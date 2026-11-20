# gh-as-single-source 授权架构收敛 实施计划

## 目标

- token 存储收敛：store.json 的 `credential` 块不再保存 token 材料，只保留元数据与簿记（`source / scopes / verifiedAt / healthy / ghWrittenAt`）；token 解析链从三级收敛为两级——`config.githubTokenRef`（credentials 引用覆写）→ `gh auth token`。
- 双授权路径（设备流 / 访问令牌）都必须终结于 gh 凭据库：gh 未装时设备流拒绝发起（409 `gh-not-installed`）、PAT 拒绝保存（409 `gh-not-installed`）；移交 gh 失败时不落任何凭据元数据（502 `gh-handoff-failed:*`）。
- 门禁 gate1 带版本：`gates.ghVersion`（probe 解析 `gh version X.Y.Z`），UI 显示「gh CLI · 已安装 v2.105.0」。
- 连带 UI round-2（用户拍板与架构同轮）：删除双方法区（设备流重复入口与 PAT 重复入口消灭，对齐 loopforge 单主行动模式）；CTA 分派精确化（「重新授权」只给曾就绪后失效态）。
- 文档同步：design.md API/语义节、PRODUCT.md durable facts 翻案句、mock 基线。

## 架构快照

- **新 token 解析链**（`resolveToken`）：`tokenRef`（credentials 引用覆写，显式配置优先）→ 逐候选 spawn `gh auth token`（系统 `gh` → 插件私有 `bin/gh`）。原第二级「工作台自存 token」删除；`storedToken` 参数及 host 装配闭包删除。
- **credential 块**（store.json version 3）：`{ source, scopes, verifiedAt, healthy, ghWrittenAt }`。`healthy=false`（401 被动失效）语义不变——含义变为「gh 当前令牌失效，需重新授权」；verify 循环（挂载静默补验 / 重新校验按钮）不变，token 实时取自 gh。限流簿记（`rateLimitedUntil`，进程内存）不变。
- **PAT 路径**：PUT `/dsh-l/credential` = 格式守卫 → gh 在场守卫 → verify-before-handoff（校验不过不落库、不动 gh）→ `gh auth login --with-token` 强制移交（失败 502，不落库）→ 落元数据 `{source:"manual-pat", scopes, verifiedAt, healthy:true, ghWrittenAt}`。
- **设备流路径**：POST `/dsh-l/auth/device` 在「未就绪可重授权」判定后加 gh 在场守卫；授权成功 → 移交 → verifyToken → 落元数据（无 token）。
- **存量迁移**：store version 2 → 3；打开旧档时若 `credential.token` 在场则将 credential 块整体复位为 `{ ...EMPTY_CREDENTIAL }`（token 删除，source/scopes/verifiedAt/ghWrittenAt 一并清零、healthy 复位 true——token 既弃，全部来源簿记同属不可信；保留 ghWrittenAt 会让删除框预勾「同时 gh auth logout」，而 gh 凭据库中该令牌可能已不存在/已换账号，误登出风险不可接受）。迁移后 configured=false（未配置态）；挂载静默补验（gh 登录在场 + 从未校验路径，loginGate 既有逻辑）经 gh 重建元数据（source 重建为 null → kv 显示「本机 gh 登录态」，语义正确）。
- **UI round-2**：`connectionCard.mjs` 删除 connectZone 骨架（`两种方式任选其一` + 双 method 按钮 + methodHint）；CTA 为唯一设备流入口（未就绪 →「连接 GitHub」，曾就绪失效 →「重新授权 · 连接 GitHub」）；PAT 唯一入口 = aux「使用访问令牌」（表单保留，`改用设备流授权` 互切保留）；gate1 ok 文案追加 ` · v<version>`；新增 `gh-not-installed` / `gh-handoff-failed` 错误映射（就地呈现通道已就绪）。

## 全局约束

- Node ≥24 ESM（.mjs），host 零运行时 dependencies；client 原生 DOM + Shadow DOM 零框架（PRODUCT.md Stack，逐字继承）。
- 双语：zh-CN / en 双字典键必须同步（test/i18n.test.mjs + test/locale-parity.test.mjs 守护）；`cred.*` 组件内静态字面量键，禁动态拼接键名。
- gh 登录态纪律：插件永远不主动 `gh auth logout`，除非用户在删除凭证确认框显式勾选且 `ghWrittenAt` 标记存在。
- 出网白名单：api.github.com + github.com；设备流 client_id 兜底 `GH_CLIENT_ID`（本轮已修 null 兜底），`config.githubClientId` 可覆写。
- store.json 0600 原子写不变；仓库在 main 直改（历批先例，主人已多轮确认此工作流）。
- 测试纪律：红绿判读遵守 `01_docs/agent-ops/README.md`「测试注入形态与红确认」——先跑出真实失败信号再实现。
- 无额外全局约束。

## 输入工件

- 设计共识：2026-11-20 本会话钢人分析（gh-as-source 正反方论证）+ 主人拍板「先做架构收敛」（ask_user_question 留痕）。
- 参考实现：`.dsh-research/loopforge/web/app/github-connect.js`（已拉最新；单主行动 + status 行原位变形 + PAT 不进连接卡的 IA）。
- 现状锚点：`src/store.mjs` normalizeCredential/EMPTY_CREDENTIAL/version 迁移块；`src/github.mjs` resolveToken(194)/ghAvailable(187)；`src/handlers.mjs` ghProbeCache(78)/getAuth(111)/postAuthDeviceStart(175)/putCredential(229)/deleteCredential(256)；`src/host.mjs` 装配(88-100)；`src/client/components/connectionCard.mjs` deriveView(59)/CTA(100-108)/骨架(290-297)。

## 文件结构与职责

- Modify: `src/store.mjs` — EMPTY_CREDENTIAL 去 token；normalizeCredential 去 token 分支（防御性 `delete c.token`）；version 2→3 迁移块（strip legacy token + 复位校验痕 + persist）。
- Modify: `src/github.mjs` — resolveToken 删 storedToken 分支；ghAvailable 返回 `{ installed, version }`（解析 `gh version X.Y.Z` 首行）。
- Modify: `src/host.mjs` — 装配删除 `storedToken` 闭包及注释行（githubClientId 注入保留）。
- Modify: `src/handlers.mjs` — makeHandlers 签名去 `storedToken`；`token()` 两级链；ghProbeCache 缓存对象化 + `ghProbe()`/`ghInstalled()`；getAuth gates 增 `ghVersion`；:142 调用点改 `.installed`；putCredential 守卫 + 强制移交 + 元数据落库；postAuthDeviceStart gh 守卫；设备流成功落库去 token。
- Modify: `src/client/components/connectionCard.mjs` — 删 connectZone 骨架/toggle/onclick；gate1 版本文案；CTA 分派精确化。
- Modify: `src/client/locale/zh-CN.mjs`、`en.mjs` — 删 `connectLine/methodHint`；更新 `srcDeviceFlow/srcPat/patHint`；新增 `errGhMissing/errHandoff`。
- Modify: `test/store.test.mjs`、`test/github.test.mjs`、`test/handlers.test.mjs`、`test/client-render.test.mjs` — 各任务内同步（红→绿）。
- Modify: `docs/mock/login-panel-mock.html` — 删连接区/方法钮/handler，patHint 文案同步。
- Modify: `docs/design.md`、`PRODUCT.md` — API 表、解析链、凭据块语义、durable facts 翻案句。

边界保持：`requireAuth()`（store.auth.account）不动；设备流轮询节奏（install 2s / device 4s / authorizing 1.5s）不动；compact 卡、工作台数据面、executor `gh repo clone` 路径不动；`article.gate > button.cta` ui-probe 锚不动。

## 接口契约（跨任务 Consumes / Produces）

- `ghAvailable({ execFile, ghPath })` → `{ installed: boolean, version: string|null }`（Task 2 Produces；Task 3/4 Consumes）。
- `resolveToken({ credentials, tokenRef, execFile, ghPath })` → `string|null`（Task 2 Produces；Task 3 Consumes——handlers `token()` 签名同步收缩）。
- store schema version 3；`credential` 无 `token` 字段；`getCredential()` 返回不含 token（Task 1 Produces；Task 3/4 Consumes）。
- `GET /dsh-l/auth` gates 增 `ghVersion: string|null`（Task 3 Produces；Task 5 Consumes）。
- 错误前缀 `gh-not-installed`（409）与 `gh-handoff-failed:`（502）（Task 4 Produces；Task 5 errKeyFor + locale Consumes）。

## 任务清单

### Task 1: store 凭据块去 token 材料（version 3 迁移）

- 文件：`src/store.mjs`、`test/store.test.mjs`。
- 动作：①`EMPTY_CREDENTIAL` 删 `token` 字段；②`normalizeCredential` 删 token 分支（未知键本就不透传；**不写**防御性 `delete c.token`——保持最终验证的 `c\.token` grep 断言面干净）；③createStore 迁移块改 `if (doc.version !== 3)`：置 `doc.version = 3`；**v2 块内既有回填原样搬入 v3 块**（`doc.runs ??= {}` + candidates 的 `currentRunId/release/delivery` 回填——v1 旧档直跳 v3 仍获同等回填，不得丢失）；`doc.credential?.token != null` 时 credential 整体复位 `{ ...EMPTY_CREDENTIAL }`（语义见架构快照·存量迁移），`persist()`；`emptyDoc` 的 version 置 3；④删各处「token + 来源」旧注释措辞。
- 验证（先红后绿）：`node --test test/store.test.mjs`——先加迁移用例（旧档 v2 含 `credential.token:"gho_x", verifiedAt:"..."` → `getCredential()` 无 token、verifiedAt null、persist 后文件无 token 字段）与 normalize 忽略 token patch 用例，跑出真实失败；实现后全绿。

### Task 2: resolveToken 收敛 + ghAvailable 版本

- 文件：`src/github.mjs`、`test/github.test.mjs`。
- 动作：①resolveToken 删 `storedToken` 参数与第二级分支（tokenRef → gh 两级）；②ghAvailable 改 spawn `gh --version` 一次，`/gh version (\S+)/` 解析，返回 `{ installed:true, version }`，全候选失败返回 `{ installed:false, version:null }`。
- 验证：`node --test test/github.test.mjs`——删除 resolveToken「自存凭据第二级」用例；ghAvailable 用例改断言返回对象形状（含 stdout 含 `gh version 2.105.0` 的 stub → version "2.105.0"；全失败 → `{installed:false,version:null}`）。

### Task 3: handlers 解析链与 probe 对象化

- 文件：`src/handlers.mjs`、`src/host.mjs`、`test/handlers.test.mjs`。
- 动作：①makeHandlers 签名删 `storedToken = null`；`token()` 调用改两级；②ghProbeCache 缓存 `{at, val:{installed,version}}`，`ghProbe()` 新增，`ghInstalled()` 改读 `.installed`；③:142 `provider.ghAvailable(...)` 真值判断改 `.installed === true`；④getAuth 改用 `ghProbe()`，gates 增 `ghVersion: probe.version ?? null`；⑤host.mjs 装配删 `storedToken` 闭包（src/host.mjs:93）与 Task 7 注释旧措辞，test/handlers.test.mjs:392 附近的 host 同款注入用例同步删 storedToken 桩；⑥getState（src/handlers.mjs:108）与 getAuth（:124）两处 `configured: Boolean(c.token || c.source || c.verifiedAt)` 显式改写为 `Boolean(c.source || c.verifiedAt)`（去死引用的清点决策，非侥幸放行；消费面 workbench.mjs:255/:299 的 configured 随迁移复位转 false、静默补验后重建；host-smoke.test.mjs⑤ 用例因 source 在场不断言破）。
- 验证：`node --test test/handlers.test.mjs`——适配受影响用例（provider.ghAvailable stub 返回对象；storedToken 注入用例删除）；新增 getAuth gates.ghVersion 断言；`grep -rn "c\.token" src/` 无输出（⑥改写后归零）。全绿。

### Task 4: 授权端点守卫与元数据落库

- 文件：`src/handlers.mjs`、`test/handlers.test.mjs`。
- 动作：①postAuthDeviceStart 在「pending/authorizing 幂等返回」之后、deviceCodeStart 之前加 `if (!(await ghInstalled())) return fail("gh-not-installed", 409);`；②设备流成功落库：`store.setCredential({ source:"device-flow", scopes: v.scopes, verifiedAt: v.verifiedAt, healthy:true, ghWrittenAt: now().toISOString() })`（去 `token: tk2`）；③putCredential：格式守卫后加 gh 在场守卫（409 gh-not-installed）；verifyToken 通过后 `ghLoginWithToken` 改为强制步骤（try/catch → `fail("gh-handoff-failed: "+err, 502)`，不落库）；成功后单次 `store.setCredential({ source:"manual-pat", scopes, verifiedAt, healthy:true, ghWrittenAt })`（去 `token: tk`）；viewerCache 失效与限流清零保持。
- 验证：`node --test test/handlers.test.mjs`——新增用例：gh 未装 → 两端点 409 `gh-not-installed`；putCredential 移交抛错 → 502 `gh-handoff-failed` 且 `getCredential()` 保持 EMPTY（无 source/scopes）；putCredential happy → store 无 token 字段、ghWrittenAt 在场；设备流成功 mock → 同断言。

### Task 5: 客户端卡片 round-2 + 双语键

- 文件：`src/client/components/connectionCard.mjs`、`src/client/locale/zh-CN.mjs`、`en.mjs`、`test/client-render.test.mjs`、（守护自动）`test/i18n.test.mjs`、`test/locale-parity.test.mjs`。
- 动作：①骨架删 connectZone（`两种方式任选其一…` p + methodRow 双钮 + methodHint）与 apply() 的 connectZone toggle、`mDevice/mPat` onclick；同步清理 workbench.mjs 样式块中只服务双方法区的死规则（`.connectZone/.methodRow/.method/.methodHint` 主样式约 L109-114 与 ≤560px 媒体块内 `.methodRow/.method` 约 L156-157；已核实这些类在 client 内仅 connectionCard 骨架消费，删后无消费）；②deriveView CTA 分派改：`else if (hasToken && c.healthy === false)` → reauthCta（「重新授权」仅限曾就绪后失效——healthy=false 即 401 被动失效；scope 未达（verified && !ok）与幽灵态均属从未就绪，归末位兜底 connectBtn，与验证断言两侧一致）；③gate1 ok 文案追加版本（`gates.ghVersion` 读入，`t("cred.g1Ok") + (ghVersion ? " · v" + ghVersion : "")`）；④errKeyFor 增 `gh-not-installed` / `gh-handoff-failed` 前缀映射；⑤locale：删 `connectLine/methodHint`，更新 `srcDeviceFlow/srcPat/patHint`（令牌存于 gh 凭据库；gh 未装无法保存），新增 `errGhMissing/errHandoff`（zh/en 同步）。
- 验证：`node --test test/client-render.test.mjs test/i18n.test.mjs test/locale-parity.test.mjs`——fresh 态与 ghost 态**两处**用例同步改断言（骨架删除后 `byClass(mount,"connectZone")` 与 `byClass(mount,"method")` 均长度 0——ghost 用例原读 `connectZone[0].style.display` 会 TypeError，一并改长度断言）；新增 gate 版本断言（gates.ghVersion="2.105.0" → g1 行含 `v2.105.0`）；新增 CTA 分派断言（hasGh+hasToken+verified+!ok → 「连接 GitHub」；hasGh+hasToken+verified+healthy:false → 「重新授权 · 连接 GitHub」）；`grep -n "methodRow" src/client/components/workbench.mjs` 无输出。

### Task 6: mock 与文档同步

- 文件：`docs/mock/login-panel-mock.html`、`docs/design.md`、`PRODUCT.md`。
- 动作：①mock 删 connect 区块（connectZone/methodRow HTML 与 `s.connect`/`mDevice/mPat` JS 接线）、patHint 文案、设备流态按钮布局对齐单主行动；同步清理 mock 内部同类死 CSS（`.methodRow/.method/.methodHint` 规则，约 L142-152——评审 round-2 计划外建议，随本任务顺手清理）；②design.md：§API 表（PUT credential 409 gh-not-installed / gh-handoff-failed 502；POST auth/device 409 gh-not-installed）、resolveToken 链两级、credential 块语义（无 token 材料）、门禁 ghVersion、§159 删除语义保持；③PRODUCT.md：durable facts 翻案句改为 gh-as-source 语义（token 只存 gh 凭据库，工作台只存元数据）+ Operating Context「装完双方法任选——设备流 / 访问令牌」句改单主行动语义 + 「工作台自存副本 0600 + gh 凭据库副本」句改「token 只存 gh 凭据库（0600），工作台 store 仅元数据」。
- 验证：mock 为静态 HTML 改动，人工核对 + 最终验证截图步覆盖；文档为说明性改动，以 grep 断言：`grep -rn "storedToken" src/` 无输出、`grep -rn "token + 来源" src/` 无输出（grep 无匹配 = exit 1，两条独立散文断言、禁入 && 链；基线：storedToken 现 7 行、「token + 来源」现仅 store.mjs:48——均已复跑留痕）。

### Task 7: 全量收口

- 动作：`npm test`（全量）；`npm run build`；git add -A && commit。
- 验证：全量测试 0 fail；build 成功并输出新指纹；commit 落盘。

### Task 8: 真宿主验证（需重启）

- 动作：征得主人同意后 `dshm_restart`（本轮最后动作）；下一轮真宿主探针：`curl GET /dsh-l/auth` gates.ghVersion === "2.105.0"（本机私有 gh 实测版本读数）、POST `/dsh-l/auth/device` 200 返回 user_code；UI 截图指名机制：dsh-m node_modules 的 playwright-core + 本机 chromium（`~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`，`--no-sandbox`），复用本会话已验证配方 `.dsh-research/dshl-login-gate-batch1/probe-real-host.cjs`（getByText 真鼠标点击侧栏入口 → 深穿透 shadowRoot 轮询 article.gate → 元素截图），截图断言：未登录态单 CTA + aux 行含「使用访问令牌」+ 门禁行含 `v2.105.0`；构建指纹以 `npm run build` 输出的 build=<hash> 与 ui-probe 的 data-dsh-l-build 比对（scripts/ui-probe.cjs:35 锚）双证生效。
- 验证：curl 断言 + 截图目检；residual：PUT credential 的 409 场景以 curl 断言（gh 已装时无法直接造 gh 未装环境，用 handlers 测试覆盖为准，声明即可）。

## 执行纪律

- 开始实现前先批判性复查本计划；发现缺项/矛盾/命名不一致先修计划再动手。
- 按任务顺序执行；每任务完成即跑其验证；TDD 适用处先红后绿。
- 阻塞、重复失败或计划与仓库现实不符 → 停下说明，不猜。
- 全部任务完成后跑最终验证并输出修改摘要。

## 最终验证

- `npm test` 全量 0 fail；`npm run build` 成功。
- `grep -rn "storedToken" src/`、`grep -rn "getCredential()?.token" src/`、`grep -rn "c\.token" src/` 均无输出；`grep -n "token: tk" src/handlers.mjs` 为空（grep 无匹配 = exit 1：四条独立断言，禁入 && 链）。
- 真宿主：gates.ghVersion 正确、设备流 200、UI 截图目检（单 CTA、aux 行、版本门禁行）。
- 提交：单 commit（架构收敛 + UI round-2），信息 `feat(host+client): gh-as-source authorization convergence — token never persisted, two-level resolve chain, device/PAT guards, single-action card + ghVersion`。
