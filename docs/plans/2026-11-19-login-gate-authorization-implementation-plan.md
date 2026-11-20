# 登录门禁与 GitHub 仓库授权改造 实施计划

## 目标

- 把 dsh-l 登录界面从「gh CLI 检测 + 单 CTA 居中卡片」改造为「三关强制门禁 + loopforge 式凭据卡」的全面板三段式登录面板。
- token 归属翻案：dsh-l 自存凭据（数据目录 store.json，0600 原子写已有），resolveToken 链变为 credentials 引用 → dsh-l 自存 → `gh auth token` 兜底；设备流成功且 gh 可用时副本移交 gh 凭据库并打 `ghWrittenAt` 标记。
- 新增凭据管理闭环：重新校验（`X-OAuth-Scopes` 实读）、手动更换令牌（verify-before-save）、删除凭证（含「同时 gh auth logout」可选，gh 登录态永不默默代作主）。
- 额度卫生（R3Q1 a+b+c）：摄取与校验路径 ETag 条件请求（304 免计费）、限流（403 abuse/429）与鉴权（401）错误分型（限流不误伤凭据健康）、刷新单飞互斥 + 每次刷新请求预算硬上限。
- 文档同步：PRODUCT.md durable facts 翻案、design.md 过时段落更新、新增轻量 DESIGN.md。

## 架构快照

- **门禁模型**：`G1 gh CLI 已安装` / `G2 gh 已登录`（`gh auth token` 任一候选产出 token）/ `G3 凭据校验通过`（token 可解析 + `GET /user` 200 + scope 规则通过）。三关全绿才亮「进入工作台」CTA；绑定动作（`store.auth.account`）仍是工作台唯一闸门字段，收活语义不变。
- **凭据块**：store.json 新增顶层 `credential` 记录：`{ token, source('device-flow'|'manual-pat'|null), scopes(string[]|null), verifiedAt, healthy, ghWrittenAt }`。token 首次落 dsh-l 数据目录（复用 store 现成原子写），gh 凭据库副本只是执行环镜像。
- **scope 规则（G3）**：classic token 以 `X-OAuth-Scopes` 为准（须含 `repo`）；`X-OAuth-Scopes` 为空按细粒度 PAT 处理（放行，界面标注「细粒度令牌 · 权限按仓库判定」）；缺 `read:org` 不挡 G3（对仓库发现的降级经查证对 affiliation 列表不适用，见 Task 4）。
- **额度卫生**：`GET /user` 校验与 issue/PR 列表请求带 `If-None-Match`（进程内 ETag 缓存，304 = 跳过该仓处理；契约见 Task 3/4）。【执行期追认备注（2026-11-20 主人签认）：实现改为**回放式**——304 时回放该页上轮内容（items 恒为该仓当前 open 集），调用方零分支；语义等价（免计费 ✓、该仓不做 GitHub 语义动作 ✓）且消除了「跳过」语义靠调用方配合、漏配即误回收的事故面（执行评审问题 1 的根因）；详见 design.md §3】；每次刷新带总请求预算（60 次硬上限，超出置 `partial`）；刷新单飞（进行中新触发 409）；401 → `credential.healthy=false`（被动失效，不清 token），403/429 → `rate-limited` 分型（带恢复时间，不影响凭据健康）。
- **UI**：登录面板 = 全面板三段式（品牌区 / 授权卡 / 脚注区），授权卡结构复刻 loopforge 信息架构（四态徽章 + 三关门禁行 + 来源/权限/最近校验/用于 kv + 主 CTA + 辅助操作）；授权方式为**并列双方法**（连接 GitHub 设备流 / 使用访问令牌，任选其一、可随时互切，对齐 loopforge 向导双 tab 的「GitHub 授权 / 访问令牌」并列结构），皮肤用 dsh-l 现有视觉语言（canvas/canvastext 主题自适应、单色反色 CTA、双弧品牌标、gate-in 唯一动效）。组件两形态：登录页完整版 + 收活紧凑版。视觉参照 `docs/mock/login-panel-mock.html`（2026-11-19 按用户意见修订：暗色主题全局 color-scheme、双方法并列、文案精简）。
- **衔接现状**：`GET /dsh-l/auth` 重塑返回门禁与凭据状态；设备流五端点中 `/auth/device`（start/status）与 `/auth/install-gh` 行为不变；`POST /dsh-l/auth/bind` 升级为「校验 + 持久化 scopes/verifiedAt + 绑定」；`/auth/logout` 语义不变（仅解绑）。工作台运行中受损不踢出：页头与收活出「连接受损」横幅 + 修复入口。

## 全局约束

- Node ≥24 ESM（.mjs），host 零运行时 dependencies；client 原生 DOM + Shadow DOM 零框架（PRODUCT.md Stack，逐字继承）。
- 三道工作流闸门（G1/G2/G3）是既有词汇，登录三关用「门禁（Login Gate）」避免混用（GLOSSARY.md 已定）。
- 双语：zh-CN / en 双字典键必须同步（test/i18n.test.mjs + test/locale-parity.test.mjs 守护）；文案语言风格沿用现有 auth.* 键的简体中文语气。
- 出网白名单：api.github.com + github.com（design.md §9）；GitHub CLI 官方 OAuth App client_id `178c6fc778ccc68e1d6a` 为兜底常量，`config.githubClientId` 可覆写。
- gh 登录态纪律：插件永远不主动 `gh auth logout`，除非用户在删除凭证确认框中显式勾选且 `ghWrittenAt` 标记存在。
- 测试纪律：红绿判读遵守 `01_docs/agent-ops/README.md`「测试注入形态与红确认」；每个任务先跑出真实失败信号再实现。
- 无额外全局约束（除上述外）。

## 输入工件

- 设计共识：2026-11-19 grill 两轮 + R3Q1 收尾（对话记录；总览表 12 项已获用户确认）。
- 视觉参照：`docs/mock/login-panel-mock.html`（7 状态 × 明暗主题，审阅中；实现以其信息架构为准，像素级细节允许实现期微调）。
- 术语表：`GLOSSARY.md`（凭据 / 仓库授权 / 门禁 / 收活，grill 期已落盘）。
- 现状调查：`explore-dshl` / `explore-loopforge` / `explore-loopforge-quota` 三份报告（对话内）；关键锚点：handlers.mjs auth 状态机（ghInstallState/deviceState/viewerCache 进程内存）、github.mjs resolveToken（credentials ref → gh → null）、store.mjs auth 块（`doc.auth ??=` 迁移模式）、workbench.mjs 样式块（.gate* 类）。

## 文件结构与职责

- Modify: `src/store.mjs` — 新增顶层 `credential` 块：emptyDoc、`doc.credential ??=` 迁移、getCredential/setCredential(patch 合并)/clearCredential。
- Modify: `src/github.mjs` — provider 函数签名扩展（不引入工厂）：`resolveToken` 增可选 `storedToken`、`deviceCodeStart` 增可选 `clientId`；resolveToken 三级链；新增 `verifyToken`/`ghLogout`；`pagedGet` ETag + 预算；`listUserRepos` affiliation 扩展；403/429 分型。
- Modify: `src/handlers.mjs` — getAuth 门禁重塑；新增 PUT/DELETE `/dsh-l/credential`、POST `/dsh-l/credential/verify`；bind 持久化 scopes/verifiedAt；设备流成功打 `ghWrittenAt`；刷新单飞 + 预算 + 被动失效 + 摄取前静默校验；`GET /dsh-l/state` auth 载荷补凭据健康摘要。
- Modify: `src/host.mjs` — 路由装配（3 条新端点）、makeHandlers 注入面扩展（storedToken 闭包、`config?.githubClientId`）。
- Create: `src/client/components/connectionCard.mjs` — 凭据卡渲染器（full/compact 两形态），登录面板与收活共用。
- Modify: `src/client/components/loginGate.mjs` — 重写为全面板三段式（品牌区/授权卡/脚注），轮询节奏保留（install 2s / device 4s / authorizing 1.5s）。
- Modify: `src/client/components/workbench.mjs` — 样式块新增（cardHead/gates/gateRow/kv/chips/badge/aux），收活紧凑卡挂载、连接受损横幅、页头健康点。
- Modify: `src/client/api.mjs` — putCredential/deleteCredential/verifyCredential。
- Modify: `src/client/locale/zh-CN.mjs`、`src/client/locale/en.mjs` — 新增 `cred.*` 键组（两文件同步）。
- Modify: `scripts/ui-probe.cjs` — 仅当新 DOM 不再保留 `article.gate button.cta` 形态时适配（实现采用保留 `.gate/.cta` 类名的策略，预期零改动；若改动则同步选择器）。
- Modify: `docs/design.md`（§3/§4/§7/§9）、`docs/design-v2.md`（L26/L134 auth 备注）、`README.md`（授权与额度章节）、`PRODUCT.md`（durable facts 翻案）。
- Create: `DESIGN.md` — 轻量设计系统（Operate 模式、主题自适应 token、卡片/徽章/门禁行/CTA 规范、mock 引用）。
- Test: `test/store.test.mjs`、`test/github.test.mjs`、`test/handlers.test.mjs`、`test/i18n.test.mjs`、`test/locale-parity.test.mjs`（键守护自动覆盖）、`test/http.test.mjs`（新端点路由）、`test/host-smoke.test.mjs`（装配冒烟）。

边界保持：`requireAuth()` 判定（`store.auth.account`）不动；摄取/清单/分诊/看板数据面不动；executor `gh repo clone` 路径不动；`docs/mock/` 只读参照不进构建。

## 任务清单

### Task 1: store 凭据块

- 目标：store 层为凭据提供持久化与迁移。
- 涉及文件：`src/store.mjs`、`test/store.test.mjs`
- 接口契约：
  - Produces: `getCredential()` → `{ token, source, scopes, verifiedAt, healthy, ghWrittenAt }`（未初始化返回空档）；`setCredential(patch)` 部分合并并规整字段（scopes 必为数组或 null，verifiedAt/ghWrittenAt 为 **ISO 8601 字符串**或 null——与 auth 块 store.mjs:75 的 toISOString 同构，全仓时间字段单一格式，杜绝客户端拿错单位）；`clearCredential()` 全字段复位；常量 `EMPTY_CREDENTIAL`。
- 验证范围：默认档、set 合并、clear 往返、旧档（无 credential 字段）打开后自动迁移且不破坏既有 auth/watch 数据。

- [ ] Step 1: 写失败测试（store.test.mjs 追加：credential 默认值、patch 合并、clear、旧档迁移四用例）
- Run: `cd /home/ubuntu/workspace/dsh-l && node --test test/store.test.mjs`
- Expected: 新用例全部失败（getCredential is not a function / 字段缺失）
- [ ] Step 2: 确认失败信号
- Run: `node --test test/store.test.mjs`
- Expected: fail 数 ≥4，既有用例全绿（红确认只针对新用例）
- [ ] Step 3: 最小实现（emptyDoc 加 `credential: EMPTY_CREDENTIAL`；doc 打开时 `doc.credential ??= structuredClone(EMPTY_CREDENTIAL)`；三个 API 函数）
- [ ] Step 4: 跑通过
- Run: `node --test test/store.test.mjs`
- Expected: 全绿（含既有 auth 往返用例）

### Task 2: provider 三级 token 链 + client_id 注入

- 目标：resolveToken 变为 credentials 引用 → storedToken → gh 兜底；设备流 client_id 可配置。
- 涉及文件：`src/github.mjs`、`test/github.test.mjs`
- 接口契约：
  - Consumes: Task 1 的 store（经 host 闭包注入，provider 不直接 import store）。
  - Produces: provider 保持现有形态（`import * as github` 命名空间经 makeHandlers 注入，host.mjs:14/:88-89），**不引入工厂**：`resolveToken(opts)` 新增可选入参 `storedToken`（`async () => string|null`，与现有 credentials/tokenRef/execFile/ghPath 并列），顺序恒为 tokenRef → storedToken() → gh 兜底；`deviceCodeStart(opts)` 新增可选入参 `clientId`，缺省 `GH_CLIENT_ID`。新参数全部可选——既有调用点结构与 github.test.mjs 既有用例零改动（B14）。
- 验证范围：三级顺序与短路（ref 命中不查 stored；stored 命中不跑 gh）；非法 ref 跳过；stored 返回 null 时落 gh；client_id 覆写与兜底。

- [ ] Step 1: 写失败测试（github.test.mjs 追加：顺序用例 3 个 + client_id 用例 2 个；现有「ref→gh→null」用例改写为「ref→stored→gh→null」）
- Run: `node --test test/github.test.mjs`
- Expected: 新用例失败（storedToken 未被消费 / 顺序断言失败）
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现（resolveToken 在 tokenRef 段之后插入 storedToken 段；deviceCodeStart 的 client_id 取 `opts.clientId || GH_CLIENT_ID`）
- [ ] Step 4: 通过
- Run: `node --test test/github.test.mjs`
- Expected: 全绿

### Task 3: verifyToken（scopes / ETag / 限流分型）

- 目标：统一的凭据校验原语，供 bind / verify 端点 / 摄取前校验复用。
- 涉及文件：`src/github.mjs`、`test/github.test.mjs`
- 接口契约：
  - Consumes: Task 2 的三级 token 链与出网封装。
  - Produces: `verifyToken(token)` → 200 时 `{ login, scopes: string[], fineGrained: boolean, verifiedAt: Date.now() }`（scopes 解析自 `X-OAuth-Scopes` 头，逗号分割去空白；空数组 = fineGrained:true）【执行期追认备注（2026-11-20 主人签认）：verifiedAt 落地为 ISO 8601 字符串而非本句字面的 Date.now() epoch——与 Task 1「credential 块时间字段统一 ISO 8601」纪律自洽，取计划的唯一自洽解】；缓存命中且 304 时返回缓存内容 + `{ notModified: true }`；401 → throw `Error("token-invalid")`；**主/二级限流统一分型**：403 且（`X-RateLimit-Remaining: 0` 或 body 含 `/abuse detection|secondary rate limit/i` 特征或带 `Retry-After` 头）、或 429 → throw `Error("rate-limited:" + retryAfterSec)`（retryAfterSec 取 `Retry-After`，否则 `X-RateLimit-Reset - now` 下限 60；二级限流的事实形态是 403 且 Remaining>0、body 特征或仅 Retry-After，故三判据取或，body 在错误路径 `res.text()` 读取）；其余非 2xx/网络异常 → 现有错误风格上抛。`scopesOk(scopes)` → `scopes.includes("repo") || scopes.length === 0`。ETag 缓存为进程内 Map（key = token 的 SHA-256 hex 前 16 位），上限 8 条 LRU 淘汰。
- 验证范围：头解析（多 scope、空白、空）、401/403/429 分型与 retryAfter 解析、403-abuse（Remaining>0 + body 特征或 Retry-After）识别为限流、304 走缓存、无缓存 304 不发生、scopesOk 三分支。

- [ ] Step 1: 写失败测试（github.test.mjs 追加 6 用例，stub fetch 返回可控头）
- Run: `node --test test/github.test.mjs`
- Expected: verifyToken 未定义 / 分型断言失败
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现 verifyToken + scopesOk + ETag LRU
- [ ] Step 4: 通过
- Run: `node --test test/github.test.mjs`
- Expected: 全绿

### Task 4: 摄取 ETag + 请求预算 + 仓库发现扩展

- 目标：摄取路径 304 免计费与预算硬上限；仓库发现对齐 loopforge 口径。
- 涉及文件：`src/github.mjs`、`test/github.test.mjs`
- 接口契约：
  - Consumes: Task 3 的 ETag 缓存封装；新增独立的 path→etag Map——**键 = 完整请求 URL（path+query+page）**：pagedGet 内部自拼分页参数（github.mjs:22），仅按 path 建键会被末页 etag 覆写、下轮 page1 拿着末页 etag 必不 304，多页仓的免计费收益静默归零；LRU 上限 64；与 Task 3 verifyToken 的 /user 缓存（token hash 键）为两个独立 Map，不混用。
  - Produces: `pagedGet(path, { token, budget })` → `{ items, partial }`；`budget = { remaining: number }`（调用方创建并跨调用共享），每次请求前 `remaining <= 0` 则停止翻页并置 `partial: true`；304 → `{ items: [], unchanged: true, partial: false }`（调用方跳过该仓）；错误对象挂 `err.status = res.status`（Object.assign 一行，消息串保持现状、向后兼容）——Task 6 被动失效按 `err.status === 401` 判，禁字符串匹配；`listUserRepos({ token, budget })` 查询串 `affiliation=owner,collaborator,organization_member&sort=pushed&per_page=100`。read:org 降级语义（B3 分句）经查证对 `/user/repos?affiliation` 列表**不适用**：该端点 repo scope 即可用，read:org 服务 `/user/orgs` 类端点、本期不涉——基线该分句空转、无实现落点（防执行者翻旧账）；org 仓若意外 403，走 Task 5/6 通用错误映射呈现。
- 验证范围：304 跳过、同 path 两 page 各自 304（键含 page 的回归锚）、预算截断 partial 标记、affiliation 参数进入请求 URL、既有分页行为回归。

- [ ] Step 1: 写失败测试（github.test.mjs 追加 4 用例）
- Run: `node --test test/github.test.mjs`
- Expected: 新用例失败
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现（pagedGet 签名扩展保持旧调用兼容：budget 缺省视为无限）
- [ ] Step 4: 通过
- Run: `node --test test/github.test.mjs`
- Expected: 全绿（含既有 pagedGet 分页用例）

### Task 5: 门禁 getAuth 重塑 + 凭据端点

- 目标：门禁状态聚合与凭据管理闭环的服务端实现。
- 涉及文件：`src/handlers.mjs`、`test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 1 store API、Task 2 storedToken 链、Task 3 verifyToken/scopesOk、Task 4 listUserRepos。
  - Produces:
    - `GET /dsh-l/auth` → `{ gates: { ghInstalled, ghLogin, credentialOk }, viewerLogin, credential: { configured, source, scopes, verifiedAt, healthy, ghWrittenByUs, rateLimitedUntil }, install: { phase }, device: { phase, userCode, verificationUri, login, error } }`。`ghLogin` = gh 候选产出 token；`credentialOk` = token 可解析 && `healthy !== false` && `verifiedAt != null` && `scopesOk(scopes)`；`rateLimitedUntil` = 最近一次 `rate-limited` 错误的恢复时刻（进程内存，ISO 8601 输出，与 credential 块时间字段同构）。探测结果进程内缓存（gh 探测 30s、viewer 探测沿用现有 viewerCache），2s 轮询零额外 GitHub 请求。
    - `POST /dsh-l/credential/verify` → resolveToken；无 token 409 `credential-missing`；verifyToken 成功 → `setCredential({ scopes, verifiedAt, healthy: true })` 返回 `{ login, scopes, fineGrained, verifiedAt }`；`token-invalid` → 409 并 `setCredential({ healthy: false })`；`rate-limited:*` → 409 + `rateLimitedUntil`（不改 healthy）；其余上抛错误（非限流的网络/HTTP 失败）→ 409 `credential-verify-failed`（不改 healthy、不暗示令牌坏、可重试）。
    - `PUT /dsh-l/credential` body `{ token }` → 长度 1..4096 且无空白校验，失败 409 `credential-format`；verifyToken(token)（绕 ETag）成功 → `setCredential({ token, source: "manual-pat", scopes, verifiedAt, healthy: true })` + 置 `viewerCache = null`（换账号后下次 getAuth 重探，viewerLogin 即时刷新）+ 尝试 `ghLoginWithToken`（gh 可用时移交并打 `ghWrittenAt`，失败不打不报错）→ 200 `{ login, scopes, fineGrained }`；校验失败 → 409 `credential-invalid|rate-limited:*|credential-verify-failed`（**不落库**；credential-verify-failed = verifyToken 上抛的非限流网络/HTTP 错误，区别于 credential-invalid、不暗示令牌坏、可重试）。
    - `DELETE /dsh-l/credential` body `{ ghLogout: boolean }` → `clearCredential()` + `clearAuth()` + 置 `viewerCache = null`；`ghLogout === true` 时：`ghWrittenAt != null` 且 gh 可用 → 调 provider `ghLogout()`（spawn `gh auth logout --hostname github.com`，stdin 关闭，非零退出仅记录不回滚）；`ghWrittenAt == null` → 409 `gh-not-ours`（清除已执行，响应说明 gh 未动）。任一情况返回 `{ cleared: true, ghLogoutDone: boolean }`。
    - `POST /dsh-l/auth/device` 成功路径（handlers.mjs:138-150 调用链）：`ghLoginWithToken` 后，将既有 `getViewer` 探测**替换**为 `verifyToken(token)`——同为 GET /user，一次请求同时取 login 与 `X-OAuth-Scopes`；成功 → `store.setAuth(...)`（既有服务端自动绑定保持，不经 /auth/bind）+ `setCredential({ token, source: "device-flow", scopes: 实读, verifiedAt: now, healthy: true, ghWrittenAt: now })`（now = ISO 8601 时刻，字段规整见 Task 1）；verifyToken 失败 → 走既有 `failed` 分支（不落凭据、不绑定）。
    - `POST /dsh-l/auth/device` 的 `already-authorized` 守卫收窄（handlers.mjs:121-122）：`token()` 可解析 **且** credentialOk（healthy && verifiedAt && scopesOk）才 409——非就绪态（未配置/校验失败/缺权限）均允许发起设备流，重授权即凭据替换、成功后同槽覆盖（对齐 loopforge「已存在则覆盖」语义，支撑 B6 双方法随时互切与 scopemiss 重新授权 CTA）；配套 test/handlers.test.mjs:243 锚用例的桩升级为「store 预置健康凭据」——断言 `status === 409` 不变，B14 锚语义保留、夹具随凭据模型现代化（此项属基线澄清，评审终局报告第④节列示后，2026-11-19 主人已签核通过：收窄版——非就绪态可重授权、健康态仍拒绝，与 loopforge 界面行为一致且多一道健康态保险丝）。
    - `POST /dsh-l/auth/bind`：现行为保留（`GET /user` 校验 + 大小写比对 + setAuth），新增：成功时 `setCredential({ scopes: 实读, verifiedAt: now, healthy: true })`。
    - provider 新增 `ghLogout()`（github.mjs，spawn 候选序列同 ghLoginWithToken 纪律）。
- 验证范围：gates 三关组合（装/登录/校验各布尔交叉）、verify 三分支、设备流成功路径落 verifiedAt + 实读 scopes（对 getViewer→verifyToken 替换的 stub 断言）、409 守卫两分支（非就绪态可发起 / 就绪态 409）、PUT verify-before-save（失败不落库 + 成功落库 + 移交标记）、PUT 换令牌后 viewerLogin 刷新（viewerCache 失效断言）、DELETE 双形态（ours / not-ours）、bind 持久化 scopes、既有 401 闸门与 logout 用例回归。

- [ ] Step 1: 写失败测试（handlers.test.mjs 追加约 10 用例；stub provider 注入可控 verifyToken/ghLogout；既有 :222-225 的 installed/tokenAvailable 两断言随新形状同步改写为 gates.ghInstalled / gates.credentialOk 等令断言——属红的预期组成部分，明示改锚）
- Run: `node --test test/handlers.test.mjs`
- Expected: 新用例失败（端点 404 / 字段缺失）
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现（getAuth 重塑 + 三端点 + bind/device 改造 + ghLogout）
- [ ] Step 4: 通过
- Run: `node --test test/handlers.test.mjs`
- Expected: 全绿（含既有 bind 五错误、logout 保留 watch、device 409 用例——错误码与文案不回退；:222-225 已按 Step 1 改写为 gates.* 等令断言）
- [ ] Step 5: checkpoint commit（`git commit -m "feat(auth): gate-based auth status + credential endpoints"`）

### Task 6: 刷新配额卫生（单飞 / 预算 / 被动失效 / 摄取前校验）

- 目标：refresh 端点防重入、请求预算、401 被动失效、stale 摄取前静默校验。
- 涉及文件：`src/handlers.mjs`、`test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 3 verifyToken（ETag）、Task 4 budget、Task 5 credential 块。
  - Produces: 常量 `REFRESH_BUDGET = 60`、`VERIFY_TTL_MS = 30 * 60 * 1000`；`POST /dsh-l/refresh` 行为：进行中再触发 → 409 `refresh-in-progress`；入口先做「`verifiedAt` 距今 > VERIFY_TTL_MS 则 verifyToken（ETag 生效，未变 304 免计费）」，不健康（token-invalid）→ 409 `credential-unhealthy` 且不清空候选；rate-limited → 409 `rate-limited:*`；通过后按仓摄取，跨仓共享 `{ remaining: REFRESH_BUDGET }`，`partial: true` 时响应带 `partial` 并写 ingestLog；任一仓 401（判据 `err.status === 401`，Task 4 契约；禁字符串匹配）→ `setCredential({ healthy: false })` + 409 `credential-unhealthy`（已获取的仓照常入库）；被动失效同样覆盖 `getDiscover` 独立出网路径（handlers.mjs:206-209，401 同置 healthy=false）——B10「任何 GitHub API 401」的落点即 refresh + discover 两条带 token 路径（bind/device 路径各自已有 401 语义，不在本条重复）。`GET /dsh-l/state` 的 auth 载荷追加 `credential: { healthy, verifiedAt, rateLimitedUntil, configured }`（无网络探测）。
- 验证范围：单飞 409、预算耗尽 partial、401 失效置位不清 token、TTL 内不重复 verify（stub 计数）、state 载荷新字段、既有 refresh 用例回归。

- [ ] Step 1: 写失败测试（handlers.test.mjs 追加 6 用例）
- Run: `node --test test/handlers.test.mjs`
- Expected: 新用例失败
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现（try/finally 恢复单飞标志；verify 段与预算段插入现有 postRefresh 前部）
- [ ] Step 4: 通过
- Run: `node --test test/handlers.test.mjs`
- Expected: 全绿
- [ ] Step 5: checkpoint commit（`git commit -m "feat(auth): refresh quota hygiene + passive invalidation"`）

### Task 7: host 路由装配与 provider 注入

- 目标：新端点上线、makeHandlers 注入面供给 storedToken 与 githubClientId。
- 涉及文件：`src/host.mjs`、`test/http.test.mjs`、`test/host-smoke.test.mjs`
- 接口契约：
  - Consumes: Task 5/6 的 handler 函数与其签名。
  - Produces: 路由 `PUT /dsh-l/credential`、`POST /dsh-l/credential/verify`、`DELETE /dsh-l/credential` 注册；makeHandlers 注入面（host.mjs:88-99）追加 `storedToken: async () => store.getCredential()?.token ?? null` 与 `githubClientId: config?.githubClientId ?? null`；handlers 侧 token() 闭包（handlers.mjs:54）将 storedToken 透传给 provider.resolveToken，postAuthDeviceStart 将 githubClientId 透传给 provider.deviceCodeStart。无新配置文件改动（cordis.patch.yml 仅注册入口，config 键经 host config 直读）。
- 验证范围：三端点方法路由与状态码（http.test.mjs 风格的 stub 装配）、host 冒烟启动无异常、`GET /dsh-l/auth` 响应形状冒烟断言。

- [ ] Step 1: 写失败测试（http.test.mjs 追加三端点路由用例；host-smoke.test.mjs 追加 auth 形状断言）
- Run: `node --test test/http.test.mjs test/host-smoke.test.mjs`
- Expected: 新用例失败（404 / 形状不符）
- [ ] Step 2: 确认失败
- [ ] Step 3: 实现（host.mjs 路由注册 + makeHandlers 注入面参数）
- [ ] Step 4: 通过
- Run: `node --test test/http.test.mjs test/host-smoke.test.mjs`
- Expected: 全绿

### Task 8: client API 与双语词典

- 目标：客户端调用面与文案就位。
- 涉及文件：`src/client/api.mjs`、`src/client/locale/zh-CN.mjs`、`src/client/locale/en.mjs`
- 接口契约：
  - Consumes: Task 7 的端点路径（同一仓库内联消费）。
  - Produces: `api.putCredential(token)`、`api.deleteCredential(ghLogout)`、`api.verifyCredential()`；词典新增键组（两文件同构，英文照语义翻译）：
    - `auth.loginTitle` 文案定稿：「连接你的代码库，让 Agent 自主交付」（金句 B，2026-11-19 用户选定；en.mjs 语义对译 "Connect your code repositories and let agents deliver autonomously"），品牌区只保留大标题、无副标题行；
    - `cred.cardTitle`（GitHub 仓库授权）、`cred.badgeUnset/Ok/Busy/Err/Limited`（未配置/已配置/校验中/有错误/限流中）、
    - `cred.gate1Name/gate2Name/gate3Name`（gh CLI 已安装/gh 已登录/凭据校验通过）、`cred.gateWait/bad*` 状态词、
    - `cred.kvSource/kvScopes/kvChecked/kvUsed` 及值词（`cred.srcDeviceFlow/srcPat/srcGh`、`cred.fineGrained`、`cred.checkedNow/checkedAgo/never/limited`）、
    - `cred.connectBtn`（连接 GitHub）、`cred.patBtn`（使用访问令牌）、`cred.patReplace`（更换访问令牌）、`cred.methodHint`（设备流免复制令牌 · 访问令牌适合无浏览器环境）、`cred.switchPat/switchDevice`（改用访问令牌 / 改用设备流授权）、`cred.recheck`、`cred.deleteBtn`、`cred.enterBtn`（沿用 `auth.enterBtn`）、
    - `cred.patTitle/patPlaceholder/patSave/patCancel/patHint`、`cred.deleteConfirmTitle/deleteGhLogout/deleteGhLogoutLocked/deleteConfirm`、
    - `cred.errInvalid/errRateLimited/errMissing/errFormat/errUnhealthy`、`cred.bannerUnhealthy/bannerLimited/bannerRecheck`、`cred.compactTitle`、
    - `cred.footNote`（「凭据仅存本机；退出只解除绑定，不影响 gh 登录态。」mock v3 定稿文案，面板级静态脚注、常显）、`cred.installHint`（手动安装命令行）。
- 约束：全部 `cred.*` 键在组件内**静态字面量引用**（状态→键映射写在组件内，禁 `t("cred." + x)` 组合键）——test/i18n.test.mjs 的动态前缀 WHITELIST 守护会对未知前缀红；确需动态前缀时同步扩 WHITELIST 表并明示。
- 验证范围：键守护与双语同构（既有 i18n / locale-parity 测试自动覆盖新键）。

- [ ] Step 1: 先在 zh-CN.mjs 与 en.mjs 同步加键（无逻辑改动），跑键守护
- Run: `node --test test/i18n.test.mjs test/locale-parity.test.mjs`
- Expected: 两侧同时加键则全绿；漏一侧则红（先故意只加 zh 侧跑出红，确认守护有效，再补 en 侧转绿）
- [ ] Step 2: api.mjs 三个函数（沿用现有 `api` 封装风格，DELETE 带 JSON body）
- [ ] Step 3: 全量回归
- Run: `npm test`
- Expected: 全绿

### Task 9: connectionCard 组件 + 登录面板重写

- 目标：凭据卡双形态组件与全面板登录页，视觉对齐 mock。
- 涉及文件：`src/client/components/connectionCard.mjs`（新建）、`src/client/components/loginGate.mjs`（重写）、`src/client/components/workbench.mjs`（样式块追加）、`docs/mock/login-panel-mock.html`（只读参照）
- 接口契约：
  - Consumes: Task 8 的 api 函数与 `cred.*` 键；workbench 样式注入机制（loginGate 只清自己的 `.gateWrap`，shadow `<style>` 归 workbench 所有——现有注释纪律）。
  - Produces: `renderConnectionCard(parent, { t, status, mode: "full"|"compact", on: { install, connect, verify, patSave, patOpen/patClose, delete, enter } })`（渲染门禁行 + kv + 徽章 + 辅助区；无网络逻辑，纯渲染 + 受控回调）；`renderLoginGate(shadow, { t, status, onConnected })` 签名不变（workbench 调用点零改动），内部改全面板三段式；轮询节奏不变（install 2s / device 4s / authorizing 1.5s / authorized → onConnected）；PAT 表单保存成功（PUT 200）后客户端拉 `GET /dsh-l/auth` 判定三关：**全绿才**自动 `api.bind()` + `onConnected`（B7）；未全绿（如 G1 红）→ 停留登录面板、主 CTA 切换为缺失门禁动作（如一键安装 gh CLI），复用既有 installing 2s 轮询（loginGate.mjs schedule），轮询中检测到三关全绿即自动续走 bind + onConnected；删除确认浮层含「同时退出本机 gh 登录」复选框（`ghWrittenByUs === true` 预勾，否则禁用置灰 + 说明）。脚注两层勿混：**卡片内状态注脚**（note1/note2）按状态显示、就绪态为空（B6「就绪态无注脚」所指，mock ready notes:[]）；**面板级脚注**（`cred.footNote`）为静态常显（mock v3 footer.foot，三关全绿也不消失）。DOM 保留 `gateWrap > article.gate > button.cta` 类名链（ui-probe 兼容）。
- 验证范围：`npm run build` 产出 lib/client.js 无错；`node --test test/host-smoke.test.mjs` 装载冒烟；i18n 键引用无缺失（构建期引用不存在的键不会报错，靠 Step 4 词典 grep 核对）。

- [ ] Step 1: 样式追加（workbench.mjs 样式数组末尾追加 `.cred*` 段：cardHead/gates/gateRow/kv/chips/badge/aux/patForm；复用既有 `.gate` 卡底、`.gateCode`、`.err`、`.note` 变量与 color-mix 主题化写法）
- [ ] Step 2: connectionCard.mjs 实现（纯函数组件，mock 的 7 状态映射为 status 驱动）
- [ ] Step 3: loginGate.mjs 重写（品牌区 + 卡区 + 脚注区；连接区为并列双方法按钮「连接 GitHub / 使用访问令牌」，方法间经 `cred.switchPat/switchDevice` 随时互切，对应 mock 的 mDevice/mPat/switchToPat/switchToDevice 交互；`auth.*` 旧键中 pills/deviceNote 等被 `cred.*` 替换者同步删除词典键）；挂载时若 `credentialOk === true` 且 `verifiedAt` 距今超 `VERIFY_TTL_MS` → 静默调 `api.verifyCredential()` 刷新状态后重绘（R2Q3 主动校验之「打开面板时」，失败静默不阻塞渲染）
- [ ] Step 4: 引用核对
- Run: `grep -n "cred\." src/client/components/connectionCard.mjs src/client/components/loginGate.mjs | grep -o "cred\.[A-Za-z0-9]*" | sort -u` 与词典键对照；`npm run build`
- Expected: 引用键 ⊆ 词典键；build 零错误
- [ ] Step 5: 冒烟
- Run: `node --test test/host-smoke.test.mjs && npm test`
- Expected: 全绿

### Task 10: 工作台集成（收活紧凑卡 / 受损横幅 / 页头健康点）

- 目标：绑定态内呈现连接健康与修复入口。
- 涉及文件：`src/client/components/workbench.mjs`、`src/client/logic.mjs`（如 state 归一化在此则同步）
- 接口契约：
  - Consumes: Task 9 connectionCard（compact 形态）、Task 6 的 state 载荷 `credential.{healthy,rateLimitedUntil,configured}`、Task 8 `cred.banner*` 与 `cred.compactTitle` 键；紧凑卡挂载时同样适用「verifiedAt 超时静默校验」规则（Task 9 Step 3 同款）。
  - Produces: paint 分支：`!account` → 登录面板（现状条件不变）；`account && credential.configured && (!healthy || rateLimitedUntil > now)` → 收活顶部横幅（文案 + 「重新校验」按钮 → `api.verifyCredential()` 成功后重拉 state）；收活 `section.intake` 顶部挂 `renderConnectionCard(mode:"compact")`（徽章 + 最近校验 + 重新校验/换令牌/删除入口，紧凑行高）；页头「已连接 {account}」chip 加健康点（绿/黄/红）。受损不踢出：不改变任何既有渲染条件。
- 验证范围：`npm run build` + `npm test` 回归；mock 状态 `ratelimit`/`scopemiss` 的横幅形态人工比对（evidence 截图可选）。

- [ ] Step 1: 横幅与健康点实现
- [ ] Step 2: 收活紧凑卡挂载（复用 connectionCard，compact 分支）
- [ ] Step 3: 构建与回归
- Run: `npm run build && npm test`
- Expected: build 零错误、测试全绿
- [ ] Step 4: checkpoint commit（`git commit -m "feat(client): connection card + degraded banner"`）

### Task 11: 端到端探针适配（条件任务）

- 目标：ui-probe 对新 DOM 的兼容确认。
- 涉及文件：`scripts/ui-probe.cjs`
- 接口契约：
  - Consumes: Task 9 保留的 `.gate > .cta` 类名链（预期零改动）。
  - Produces: 探针在 `https://127.0.0.1:3080` 活宿主上对未绑定账号仍判 `view=gate`。
- 验证范围：探针依赖 `dsh-m/node_modules/playwright-core` 与 `/home/ubuntu/.cache/ms-playwright/chromium-1234/`，环境缺失则本任务记为「不适用·环境缺失」并在最终摘要说明，不阻塞交付。

- [ ] Step 1: 选择器核对
- Run: `grep -n "article.gate" scripts/ui-probe.cjs && grep -n "class=\"gate\"\|className = \"gate" src/client/components/loginGate.mjs`
- Expected: 两侧命中同一形态则跳过改动
- [ ] Step 2: （仅当 Step 1 不匹配）改选择器并在活宿主跑 `node scripts/ui-probe.cjs <url> <evidenceDir> <buildId>`，Expected: `PASS view=gate`

### Task 12: 文档与设计系统沉淀

- 目标：文档与实态一致，补 DESIGN.md。
- 涉及文件：`docs/design.md`、`docs/design-v2.md`、`README.md`、`PRODUCT.md`、`DESIGN.md`（新建）
- 接口契约：
  - Consumes: 全部前序任务的最终行为（以下述为准写文档，不写计划稿）。
  - Produces:
    - design.md §3：resolveToken 三级链、verifyToken 契约、ghLogout 纪律、ETag/预算参数；§4：新端点逐条语义；§7：全面板 + 收活紧凑卡 + 横幅（替换「输入用户名」过时段落）；§9：凭据落盘 0600、删除语义（ghWrittenAt 门控）、限流不误伤、gh 登录态不代作主。
    - design-v2.md：L26 auth 块形状描述、§8「登录闸/收活板块不变」更新为「门禁面板/收活紧凑卡」。
    - README.md：授权章节（三关门禁、连接/换令牌/删除、额度卫生三点）。
    - PRODUCT.md：durable facts 翻案——「token 由工作台自存（0600），gh 凭据库副本为执行环镜像；登录页三关强制门禁；限流不误伤凭据健康」；First run 段同步（免填用户名一键进入保留，前置为门禁）。
    - DESIGN.md：Operate 模式定位、主题自适应 token（canvas/canvastext + color-mix 纪律）、单色反色 CTA、品牌 mark 用法、卡片/徽章/门禁行/kv/辅助操作规范、`docs/mock/login-panel-mock.html` 作为登录面板视觉基准。
- 验证范围：文档内部交叉引用路径存在；无残留「输入 GitHub 用户名」「token 不落工作台」旧表述。

- [ ] Step 1: design.md 四节更新
- [ ] Step 2: design-v2 / README / PRODUCT 更新
- [ ] Step 3: 旧表述清扫核对
- Run: `grep -rn "输入 GitHub 用户名\|插件不存副本\|token 移交 gh 凭据库，插件不存" docs/ README.md PRODUCT.md`
- Expected: 零命中（GLOSSARY.md 的历史词条不在清扫范围）
- [ ] Step 4: DESIGN.md 创建
- [ ] Step 5: checkpoint commit（`git commit -m "docs: gate-based authorization + quota hygiene"`）

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务顺序执行（1→12），不无声跳步、合并步或改变任务目标；Task 5/6/9/10 之间的接口契约（Produces 字段名与错误码前缀）是跨任务硬契约，改契约必须回改本文档。
- 每完成一个任务运行该任务定义的验证；测试红确认遵守「先见真红再实现」。
- 遇阻、重复失败或计划与仓库现实不符，立即停下说明，不猜。
- 当前分支为 `main`：开始实现前向用户确认是否切功能分支（如 `feat/login-gate-authorization`）。
- 全部任务完成后运行最终验证并输出修改摘要。

## 最终验证

- Run: `cd /home/ubuntu/workspace/dsh-l && npm test && npm run build`
- Expected: 全部测试绿（store/github/handlers/http/host-smoke/i18n/locale-parity 及既有全套）；host.js 与 client.js 构建产物无错误。
- 补充核对：`git status` 干净（除计划外无意外文件）；`grep -rn "token-invalid\|rate-limited\|credential-unhealthy\|refresh-in-progress\|credential-verify-failed" src/handlers.mjs` 错误码族齐全。
- 交付说明包含：与 mock 的像素差异清单（如有）、Task 11 是否适用的环境结论。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。
- 同时等待两项确认：① 本计划；② `docs/mock/login-panel-mock.html` 的界面形态（含 7 状态与双主题）。
