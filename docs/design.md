# dsh-l 设计文档 — v1 数据面 + 分诊

共识来源：2026-11-12 grill 定稿（对话实录）；ADR-0001；GLOSSARY.md。本文落「当时明确延后」的三项设计：任务包 schema、分诊输出格式、存储结构，外加接口与验证策略。

> 2026-11-16：v2 起设计移交 docs/design-v2.md（ADR-0002），本文冻结为 v1 数据面与分诊的设计记录；§10 接缝由 design-v2 兑现。基线 tag v0.0.1。

## 1. 架构总览

```
client (src/client/, Shadow DOM)
  ├─ slots: "main" 整页工作台 + "sidebar.panellist" (order:30, label 解析式；组件为 React 组件)
  ├─ i18n: 宿主 locale 服务 → zh-CN / en 字典
  └─ fetch → host 路由（同源）
host (src/host.mjs, inject: webServer, credentials, agents, agentDefaultModel, timer, llm)
  ├─ 路由 /dsh-l/*  →  store + provider + triage
  ├─ store (src/store.mjs)   → <profile>/data/dsh-l/store.json（profile 私有，见 §2）
  ├─ provider (src/github.mjs) → api.github.com REST（token: credentials 覆写 → gh 登录态 → 匿名）
  ├─ triage (src/triage.mjs)   → ctx.agents 短命会话批量分诊
  └─ timer (ctx.interval)     → 定时摄取，默认关
```

## 2. 存储结构（store.mjs）

单一 JSON 文档，落 <profile>/data/dsh-l/store.json（所属 profile 由模块位置上溯 dsh.profile 声明确定，DSH_L_DATA 可覆盖；两个 profile 互不共享）；结构版本字段 version。

```js
{
  version: 1,
  watch: { repos: ["iasiv5/dsh-skins" /* …12 个默认，见 PRODUCT.md */], updatedAt: "iso" },
  candidates: {
    // key = `${owner}/${repo}#${type}#${number}`，type ∈ issue|pull
    "iasiv5/dsh-skins#issue#123": {
      key, repo, type, number, title, author, labels: [],
      createdAt, updatedAt, url,
      meta: { comments, reactionsTotal, ageDays },          // issue 侧
      pull: { draft, headRef },                              // 仅 PR（列表端点不含 diff 规模）
      bodyExcerpt: "≤600 字符",
      stage: "inbox|triaged|gating|building|verifying|shipped|closed|held",
      triage: { validity: "high|medium|low", urgency: "P0|P1|P2|P3",
                action: "start|feedback|close|hold", reason: "≤80字",
                by: "llm|human", lang: "zh-CN|en", at: "iso" },
      gates: { G1: null, G2: null, G3: null },              // 放行后为 gateRecord
      taskPackage: null,                                     // G1 放行时填充，见 §6
      history: [ { at, event, detail } ]
    }
  },
  snapshots: { lastIngestAt: "iso", perRepo: { "owner/repo": { issues, pulls, fetchedAt, error } } },
  repos: { "owner/repo": { defaultBranch, cloneUrl, fetchedAt } },  // 仓库事实，任务包 repo 块数据源
  ingestLog: [ { at, total, authenticated, failedRepos, closed, flagged } ],  // 每次摄取一条，上限 50（FIFO）
  settings: { intervalMinutes: 0, triageModel: null },       // 0=关；null=宿主默认模型
  auth: { account, login, verifiedAt }                        // 收活绑定；account=null 即未连接（2026-11-13 板块划分引入）
}
```

候选 history 每条上限 50（FIFO 截断——有意为之的界，换取 store.json 常量级体积；截断会丢最老记录，此取舍记录在案）。

store API（后续任务的接口契约）：getWatch()/setWatch(repos)、upsertCandidates(list)（摄取合并：已存在者仅刷新可变字段并保留 stage/triage/gates/history）、listCandidates()、getCandidate(key)、setStage(key, stage, note)、setTriage(key, result, by)、setGate(key, gate, decision, note, taskPackage?, via?)、getSettings()/setSettings(patch)、getSnapshots()/setSnapshots(perRepo)、appendIngestLog(entry)/getIngestLog()、recordHistory(key, event, detail)、setRepoFacts(repo, facts)/getRepoFacts(repo)、sweepUpstream(repo, liveKeys)、getAuth()/setAuth({account, login})/clearAuth()（收活绑定与退出；退出只清 auth 块）、getCredential()/setCredential(patch)/clearCredential()（凭据块，登录门禁改造引入：EMPTY_CREDENTIAL 空档 + patch 部分合并 + 字段规整，scopes 数组|null、时间字段 ISO 8601 与 auth 块同构）。所有候选变更追加 history（含分诊失败 triage.error 与上游回收 upstream-closed/upstream-gone）。

## 3. GitHub provider（github.mjs）

- resolveToken({ credentials, tokenRef, execFile, ghPath })：两级链（gh-as-source，2026-11-20）——① credentials 引用覆写（config.githubTokenRef，若配置）→ ② gh auth token（execFile，本机登录态）→ null。工作台不存 token 材料（store 版本 3 迁移剥离）。
- verifyToken(token, { fetch })：GET /user 一次同时取身份与 X-OAuth-Scopes（scopes 逗号分割去空白；空数组 = 细粒度 PAT，fineGrained:true）；ETag 条件请求（If-None-Match，304 免计费），缓存 key=token sha256 前 16 位、LRU 8；限流分型——403 且（Remaining:0 ∨ body abuse/secondary 特征 ∨ Retry-After）或 429 → throw `rate-limited:<秒>`（Retry-After 优先，否则 X-RateLimit-Reset-now 下限 60），仅 401 → throw `token-invalid`；scopesOk(scopes) = 含 repo ∨ 空数组（细粒度）。
- listOpenIssues({ repo, token, fetch, budget }) / listOpenPulls({…})：GET issues/pulls?state=open&per_page=100（分页至 <100；issues 剔除含 pull_request 字段的行）。pagedGet 底座（Task 4，评审执行期 R1-1 回放式修复）：ETag 键=完整请求 URL（path+query+page，禁单页键防末页覆写），缓存条目 {etag, page}、LRU 64；304 时**回放该页上轮内容**（items 恒为该仓当前 open 集——liveKeys/perRepo/discover 全链零分支自然正确，无误回收面），回放页按页长 <100 终止翻页；unchanged 置位=全部页均 304（供上层标记）；budget={remaining} 跨仓共享、逐页扣减、耗尽置 partial；错误对象挂 err.status（401 判据禁字符串匹配）。
- listUserRepos({ token, fetch, budget })：GET /user/repos?affiliation=owner,collaborator,organization_member&sort=pushed（原 discoverRepos 改名扩面；read:org 分句经查证对本端点不适用）。
- getRepo({ repo, token, fetch })：GET /repos/{repo}，取 defaultBranch（default_branch）与 cloneUrl（ssh_url）——任务包 repo 块的数据源；字段缺失回退 main + SSH 惯例地址。
- getViewer({ token, fetch })：GET /user 取 login——bind 身份比对仍用（锚定错误消息形状）；凭据校验统一走 verifyToken。
- ghAvailable({ execFile, ghPath }) / resolveToken({…, ghPath })：gh 探测与调用走候选序列——系统 PATH 的 gh 优先，插件私有安装（数据目录 bin/gh）兜底。ghAvailable 返回 { installed, version }（`gh version X.Y.Z` 解析），版本进 gates.ghVersion 供门禁行展示。
- deviceCodeStart({ fetch, clientId }) / deviceCodePoll({ deviceCode, fetch, clientId })：GitHub OAuth 设备流（clientId 缺省 GitHub CLI 官方公开常量，config.githubClientId 可覆写；scope=repo read:org）——pending/slow_down 的节奏由 handlers 控制。
- ghLoginWithToken({ token, spawn, candidates })：设备流/手动令牌成果经 stdin 管道移交 gh 自身凭据库（gh auth login --with-token），不进参数与日志；gh 是唯一令牌居所，工作台 credential 块只落元数据（source/scopes/verifiedAt/ghWrittenAt，见 §9）。spawn ENOENT 换下一候选，非零退出即真实失败（PAT 路径 502 gh-handoff-failed，不落库）。
- ghLogout({ spawn, candidates })：gh auth logout --hostname github.com——删除凭证的显式选项专用；非零退出上抛，调用方记录不回滚。
- ghInstall({ fetch, execFile, destFile, tmpDir })：gh CLI 一键后台安装——取 cli/cli latest release 的 linux 二进制（amd64/arm64），下载解包装入插件数据目录 bin/gh（无 root、不动系统 PATH）。
- 域名白名单硬编码 https://api.github.com；token 只进 Authorization 头，不落日志。
- 额度账：凭据在 gh 后摄取路径全量 ETag 化（304 免计费）+ 每次刷新预算 60 请求硬上限；git 数据面（clone/push）走 gh 凭据 helper 不占 REST 额度。

## 4. Host 路由

| 方法 | 路径 | 请求体 | 语义 |
|---|---|---|---|
| GET | /dsh-l/health | — | 健康与构建指纹（ok / name / build / dataDir） |
| GET | /dsh-l/state | — | watch + snapshots + candidates 摘要 + settings + ingestLog + auth 绑定 + credential 健康摘要（configured/healthy/verifiedAt/rateLimitedUntil，无网络探测） |
| GET | /dsh-l/auth | — | 门禁状态（Task 5 重塑）：gates {ghInstalled, ghLogin, credentialOk, ghVersion} + viewerLogin + credential {configured, source, scopes, verifiedAt, healthy, ghWrittenByUs, rateLimitedUntil} + install/device 进行时；gh/token 探测有进程内缓存，2s 轮询零额外 GitHub 请求 |
| POST | /dsh-l/auth/bind | {account} | 绑定校验：token 就绪 → GET /user 比对身份（大小写不敏感）→ 成功落 auth 并回显，同时凭据块持久化实读 scopes/verifiedAt（401 时 healthy=false）；失败 409 区分 gh-not-installed / gh-not-authorized / token-invalid (…) / account-mismatch: <login>；非法用户名 400 |
| POST | /dsh-l/auth/logout | — | 工作台级退出：只清 auth 绑定（watch/候选/设置/凭据全保留），不动本机 gh 登录态 |
| POST | /dsh-l/auth/install-gh | — | 一键后台安装 gh CLI（官方 release → 插件数据目录 bin/gh）；立即返回，进度经 GET /dsh-l/auth 轮询（install.phase: idle/installing/done/failed） |
| GET/POST | /dsh-l/auth/device | — | 设备流授权：POST 出 user_code + verification_uri 并后台轮询（authorizing→authorized：verifyToken 一次取 login+实读 scopes，元数据落库含 ghWrittenAt 并自动绑定；expired/failed 带原因）；守卫：gh 未装 409 gh-not-installed（gh-as-source，token 终点站在场才发起）；仅「token 可解析 ∧ credentialOk」409 already-authorized（R1-4 主人签核），非就绪态可发起（重授权即同槽覆盖） |
| PUT | /dsh-l/credential | {token} | 手动令牌（verify-before-handoff，gh-as-source）：长度/空白守卫 → gh 未装 409 gh-not-installed → verifyToken 校验 → 强制移交 gh 凭据库（失败 502 gh-handoff-failed:*，不落库）→ 元数据落库（source=manual-pat，scopes/verifiedAt 同写，ghWrittenAt 打标，viewerCache 失效；**token 不落 store**）→ 200 {login, scopes, fineGrained}；失败 409 credential-format / credential-invalid / rate-limited:* / credential-verify-failed:*（不落库） |
| POST | /dsh-l/credential/verify | — | 重新校验当前凭据：无凭据 409 credential-missing；成功刷新 scopes/verifiedAt/healthy；token-invalid 409 并置 healthy=false；rate-limited:* 409 置 rateLimitedUntil（不伤健康）；其余 409 credential-verify-failed:* |
| DELETE | /dsh-l/credential | {ghLogout} | 删除凭证：清凭据块 + 解绑 + viewerCache 失效；ghLogout=true 且 ghWrittenAt 在场 → gh auth logout（gh-not-ours 409 当 gh 登录非工作台所建，清除仍执行） |
| POST | /dsh-l/refresh | — | **须先绑定账号，否则 401 auth-required**；单飞互斥（进行中 409 refresh-in-progress）；摄取前 verifiedAt 超 VERIFY_TTL_MS=30min 静默校验（token-invalid → 409 credential-unhealthy）；跨仓共享 60 请求预算（耗尽置 partial）；任一仓/discover 401 → healthy=false + 409 credential-unhealthy（已获取仓照常入库）；每次摄取追加 ingestLog（含 partial） |
| GET | /dsh-l/discover | — | **须先绑定账号**；账号仓列表（选择器数据源）；401 → 被动失效同 refresh |
| POST | /dsh-l/triage | {keys:[…≤10], lang} | 批量分诊，结果写回候选（by=llm）；失败 502 |
| POST | /dsh-l/candidate/override | {key, validity, urgency, action, reason, lang} | 人工推翻分诊（by=human） |
| POST | /dsh-l/candidate/stage | {key, stage, note} | 人工改阶段（仅 inbox/triaged/gating/shipped/closed/held；building 只能经 G1） |
| POST | /dsh-l/candidate/gate | {key, gate, decision, note} | 闸门放行/驳回：G1 仅 gating 可操作（否则 409 gate-requires-gating），pass→building+任务包、reject→triaged；G2/G3 v1 返回 409 |
| GET/PUT | /dsh-l/settings | {intervalMinutes?, triageModel?, workSessionModel?, workSessionPreset?, workSessionApprovalPolicy?} | 设置读写（逐键白名单，可只改其中一项；triageModel/workSessionModel 须在目录内或 null；workSessionPreset ∈ presets 名册或 null；workSessionApprovalPolicy ∈ null/ask/never）；intervalMinutes 变更即时重 arm 定时器 |
| GET | /dsh-l/models | — | 宿主模型目录 + 宿主默认 + presets 名册（agentPresets.list 规整为 id 串；分诊与开工会话设置数据源） |
| POST | /dsh-l/work/start | {key, cwd?, another?, lang?, workspace?} | **开工会话创建**（G1 第二出口，见 §4a）：复用快路径零记账；错误码 workspace-not-found(422) / work-cwd-conflict(409) / run-already-active(409，fresh 与 another+managed) / gate-requires-gating(409) / managed-clone-failed(502) / kickoff-failed(500) |
| GET | /dsh-l/work/workspace-status?cwd= | — | 工作区探测 `{exists, isRepo, dirty, branch}`（选择器脏态警示数据源）；相对路径 400 invalid-path |
| GET | /dsh-l/work/sessions | — | 会话板块聚合：work 行（含另开历史）∪ run 行（sessionId = currentNodeIds 序首个 nodeStates[].sessionId 非空，缺省 null） |
| POST | /dsh-l/work/deliver | {key, note} | 确认交付（人工 G2 等价）：活跃开工会话在场(404 no-work-session) + stage ∈ building/verifying(409 deliver-requires-building) → G2 留痕(via workbench-ui) + shipped + history work-session.delivered |

### §4a. 开工会话（Work Session）

G1 放行的第二出口（与引擎执行并列）：把候选交给**用户亲自开工的普通 DSH 会话**。会话由官方会话系统全权承载（原生模型切换 / 审批 / 归档 / fork），dsh-l 只留索引与导航。

- **七步守卫序**（postWorkStart）：①requireAuth → ②候选存在(404) → ③活跃行复用快路径（同 cwd 或无 cwd → 200 `{sessionId, reused:true, taskPackage:null}`，零记账零 world 调用）→ ④异 cwd → 409 work-cwd-conflict（早守卫零记账）→ ⑤fresh：引擎活跃 run 409（先于闸门）→ stage≠gating 409 → 工作区解析（422/502 早守卫先于 setGate）→ setGate(G1 pass)+setStage(building) → ⑥another：要求 G1 pass 记录；workspace:"managed" 时先查引擎互斥（托管目录与引擎 run 共享 dirOf(key) 同一工作树，活跃 run 期间同树 checkout 会打断引擎节点——R3-1）；不重复记账不动 stage → ⑦工作区解析：managed = makeWorkspace.ensure（分支 `work-<type>-<number>`）/ local = 显式 cwd 或 `~/workspace/<仓目录>` 目录命中。
- **创建事务**（startWorkSession）：create → send(kickoff) → appendWorkSession 索引 + history `work-session.opened`；send 失败 → **回滚 dispose（rollback-only，红线②唯一例外）** + history `work-session.kickoff-failed` → 500 kickoff-failed；恢复出口 = 「我来开」重试态（G1 pass + building 且无活跃行 → another 重建，文案中性）。
- **kickoff 首条消息**：锚行 `[dsh-l] {repo}#{number} {issue|PR} · {title}`（固定 ASCII 前缀自动取题，>72 字符截断保前缀；issue|PR 为同号消歧的有意扩展）+ 可读块（链接/分诊/目标/默认分支/工作区）+ 任务包 JSON 围栏；语言跟随界面。
- **三分支模型解析**（composeWorkWorld）：显式 workSessionModel（validity 判定，effort 在场即透传）→ agentOptions + setup select；preset 在场且无显式 → agentOptions 不传不 select（preset 自带组合生效）；皆无 → 部署默认。`meta.cwd` 只落会话头，`workingDirectory.set` 二跳设置，二者必须先于 send（红线①时序）；审批策略未显式配置零 setPolicy（红线③）；**已登记（索引内）会话零 dispose**（红线②，handle 不逃逸 worksession.mjs）。
- **sweeper 保全与取舍**：每日清扫活跃集 = `sweepActiveKeys({runs, workSessions})`（running/waiting run ∪ work 索引全键）。取舍：曾有开工会话的候选其托管目录**永不自动清扫**（Q9 冷会话亦活跃的保守取舍），磁盘回收转手动。
- 注记（2026-11-23）：开工会话的会话头目录、标题与宿主工作区归属见 docs/design-v2.md §20 第 14–15 条；托管开工时会话头目录取会话根目录，工具目录仍为执行目录。

处理器写成纯函数 makeHandlers({ store, provider, triage, now })，路由层只做 JSON 编解码——单测不打真 HTTP。

## 5. 分诊（triage.mjs）

- 触发：手动「分诊」批量按钮，一批 ≤10 条候选。
- 执行：ctx.agents.create 短命会话（sessionId 自生成、meta.cwd = 插件数据目录、agentOptions 与 setup 选模按 autoloop host.ts 判例）；不设置 approval 策略、保持宿主默认 ask：提示词含不可信的 issue/PR 正文，若被注入诱导调用工具，调用会阻塞至超时并判失败（fail-closed）；模型 = 设置 settings.triageModel（须在宿主模型目录内）；未设置则跟随宿主默认（agentDefaultModel.currentSelection()）。
- Prompt：候选摘要（title / bodyExcerpt / labels / ageDays / comments / reactions / PR: draft+diff 规模），要求唯一输出一个 json 围栏数组：

```json
[{ "key": "…", "validity": "high|medium|low", "urgency": "P0|P1|P2|P3",
   "action": "start|feedback|close|hold", "reason": "≤80字，界面语言" }]
```

输出语言 = 工作台当前界面语言（prompt 内约束）。
- 回执读取：订阅宿主 session/event 事件流（autoloop dsh/src/bridge.ts 同款窄接口），以该会话 turn/end（reason.kind=completed）为完成证据、取末条 assistant/message 文本——不用 whenIdle 猜测结果（api-mapping §4 纪律）；解析失败 → 该批标记失败（history 对每条候选记 `triage.error` 事件后 502 返回），候选留原阶段，可重跑。
- 解析器独立纯函数 parseTriageOutput(text)，golden 用例单测。

## 6. 任务包 schema（交接契约，ADR-0001）

G1 放行时生成并挂到候选（v1 即生效——契约先于执行器落地；UI 提供「复制任务包 JSON」）。2026-11-12 契约对表审核后定稿如下（与实现一字不差，golden 守卫见 test/task-package.test.mjs）：

```js
{
  version: 1,
  kind: "dsh-l.task-package",
  candidate: { key, repo, type, number, title, url },
  triage: { validity, urgency, action, reason },          // 无分诊放行时为 null
  gate: { gate: "G1", decision: "pass", via: "workbench-ui", at: "iso" },
  instructions: { goal: "一句话目标", constraints: [], definitionOfDone: [] },
  repo: { defaultBranch: "main", cloneUrl: "git@github.com:….git", localPath: null },
  emit: { id, type, subject, summary, link }              // 对齐 autoloop 事件信封，见下
}
```

裁决记录（对表审核，逐字段）：

- **gate 块取实现形**（`decision`+`via`，弃原稿 `passedBy`）：与 store 的闸门记录（setGate）同构，一处形状跨存储与任务包复用；包只在 pass 时产生，`decision:"pass"` 冗余但显式。
- **emit 块对齐 autoloop 真实信封**（原稿 `{source,type,at}` 作废）：实测 dsh-agent-autoloop `protocol/validate.ts` 的 FIELDS 白名单为 `id/type/subject/summary/detail/link/hops`，**未知字段直接拒收**，`id`、`type` 必填——原稿的 `source`、`at` 均在信封外且缺必填 `id`，发给 autoloop 会被打回。定稿：`id = "dsh-l:{candidate.key}:G1:{at}"`（确定性 → autoloop 按 (source,id) 幂等去重）、`type = "build.requested"`、`subject = candidate.key`（autoloop 按 subject 分 lane）、`summary = title`、`link = url`。`source` 是摄入方密钥身份，不在信封内；时间戳由 autoloop 侧记 received_at。
- **repo 块取真实事实**：defaultBranch/cloneUrl 来自刷新时 GET /repos/{repo}（§3）；失败回退 `main` + SSH 惯例地址并保留旧事实——替代早期硬编码 "main"。
- **instructions 是 v1 floor**：goal 复用候选标题、constraints/DoD 空数组，由执行器侧（v2）补全；分诊理由已在 triage 块内。

## 7. UI 结构（Operate 模式）

- **未绑定（登录门禁面板，2026-11-19 全面板三段式重造）**：整栏三段——顶部品牌区（双弧品牌标 + 大标题金句「连接代码库，让 Agent 自主交付」（2026-11-20 定稿删「你的」），无副标题）；中部授权卡（复刻 loopforge 凭证卡信息架构并按状态收敛，2026-11-20 简报；2026-11-21 polish 批次文字阶 AA 校准 + 决策点精简 + 失败/成功态补全）：四态徽章 未配置/已配置/校验中/有错误/限流中 + 三关门禁行「gh CLI / gh 登录 / 凭据校验」中性标签+状态值（bad 行红点红字）+ 来源/权限/最近校验/用于 kv + 主 CTA + 辅助操作（决策点精简 5→4：重新校验归头部图标钮，aux 保留更换令牌/删除凭证并间距分离）；**gh 未装态只留「gh CLI · 未安装」单行 + 一键安装 CTA + 安装注，kv/辅助区全隐藏**——装完 gh 后 CTA「连接 GitHub」为唯一设备流入口（gh 未装 409 拒绝发起），PAT「使用访问令牌」唯一入口在辅助行（verify-before-handoff，gh 未装 409），两者随时互切；kv 仅凭据有效/限流中显示；对比度纪律（2026-11-21 critique 校准）：文字阶 65/68/72/75 双主题实测 AA ≥4.5:1，同一比例 ≠ 同一可读性，校准以 light 侧为绑定约束，规范读数口径见 .impeccable/design-full.md；授权成功 = 第二作者化动效 success-turn（触发面=仅设备流轮询发现 authorized，PAT/安装完成直 enter 不编排，reduced-motion 瞬切）；底部脚注区（一句话安全说明，随凭据在场显隐 + 手动安装指引）。三关全绿才亮「{login} · 进入工作台」。视觉基准 docs/mock/login-panel-mock.html（v3），规范见 DESIGN.md。
- **已绑定（工作台）**分两大板块：**收活**（页头账号 chip + 健康点 + 退出按钮；顶部紧凑连接卡——徽章/最近校验/重新校验/更换令牌/删除凭证，换令牌与删除经内联表单与确认浮层完成；连接受损横幅——healthy=false 或限流中呈现，就地重新校验，不整台踢出；监看仓 / Issue / PR 概况 chip + 仓库勾选入口）与**分诊与拍板**（工作流条 + 过滤条 + 分组列表）。
- 页头：标题 + 刷新按钮 + 设置 + 账号 chip（含凭据健康点 绿/黄/红）+ 退出按钮 + 上次刷新时间；批量分诊按钮在过滤条。
- 过滤条：类型（全部/Issue/PR）× 仓 × 紧急度。
- 主体：按阶段分组的列表（待分诊 / 已分诊 / 待拍板 + 折叠的 进行中/已交付/已关闭），行内：类型徽标、repo#number、标题、年龄、紧急度 chip、真实性 chip、建议动作；展开：分诊理由 + 操作（改阶段 / G1 放行 → 任务包）。
- 管线条：7 段横向指示（各段计数），build/verify/ship 在 v1 灰显。
- 视觉：Shadow DOM 隔离；色板/间距对齐宿主主题 alias 令牌（参照 01_docs/research/dsw-alias-tokens.md，禁引不存在的 alias）；实现前读 impeccable craft-floor，完成后跑 impeccable detect。
- 空态/错误态文案只用 i18n 字典；首跑预勾选 12 仓（PRODUCT.md）。

## 8. 阶段状态机

inbox →（分诊）→ triaged →（人工安排）→ gating →（G1 放行）→ building（v2）→ verifying（v2）→ shipped；任意阶段可 closed / held；verifying 失败 → 回炉 building（限 3 次，v2 生效）。v1 仅落地 inbox/triaged/gating/closed/held/shipped 的展示与人工迁移，building/verifying 只读灰显。每次迁移记 history。

上游关闭（sweepUpstream）：摄取某仓成功后，该仓已不在 open 集合里的候选——未拍板阶段（inbox/triaged）自动转 closed（event=`upstream-closed`）；在途阶段（gating/held/building/verifying）不代作主，记一次 `upstream-gone` 提示（连续刷新去重）待人工处理；closed/shipped 消失上游属预期，不动。只对摄取成功的仓执行（失败仓 open 集合未知，回收会误伤）；移出监看的仓不回收，候选保留至重新监看或人工关闭。

## 9. 安全

- 凭据（gh-as-source，2026-11-20 翻案）：token 只存 gh 凭据库；工作台 store.json credential 块（0600 原子写）只落元数据 source/scopes/verifiedAt/healthy/ghWrittenAt，永不落 token 材料（store 版本 3 迁移剥离旧档 token 并整体复位）。resolveToken 两级链保证 credentials 引用覆写优先。除 credential 块外任何结构不含凭据材料。
- 退出语义：logout 只清工作台绑定（凭据块保留），绝不调用 gh auth logout；删除凭证是独立显式动作——清凭据块 + 解绑，「同时退出本机 gh 登录」复选框仅在 ghWrittenAt 标记（gh 登录为工作台设备流所建）存在时可勾，否则置灰；gh 登录态永不默默代作主。收活闸门（refresh/watch/discover 未绑定一律 401）在服务端强制，UI 只是呈现。
- 出网：api.github.com（API 与 gh release 查询）+ github.com（设备流 /login/device/code、/login/oauth/access_token 与 gh 安装包下载）；未来飞书通道仅 open.feishu.cn webhook。
- 设备流 token：经 stdin 管道移交 gh 凭据库（唯一居所）；工作台 credential 块只落元数据。登录状态机的安装/授权进行时状态在进程内存，宿主重启自动回到 idle（登录门禁按 getAuth 重新判定，无残留半态）。
- 限流纪律：403 abuse/429 分型为 rate-limited（带恢复时刻，UI 呈现「限流中」），不误伤凭据健康；仅 401 置 healthy=false（被动失效，凭据材料保留待重校验）。
- 写操作全部经人工手势（按钮），无自动写 GitHub。

## 10. v2/v3 接缝

- 执行器接缝：executeTaskPackage(pkg)（v2 实现：ctx.agents + workingDirectory + turn/end 监听 + 状态回流）；包 schema 稳定，v1 UI 不因执行器引入而重写。
- 飞书发送器接口 sendNotice(text, meta)（v2，自定义机器人 webhook，约 50 行；双向参考 autoloop plugins/feishu/channel.ts）。
- 角标 sidebar.toggle.badge、看板视图、GitLab provider（实现 §3 同名接口）均 v2/v3。

## 11. 验证策略

- 单测（node --test）：store 全 API、provider（注入 fetch/execFile 桩）、parseTriageOutput golden、handlers 纯函数、client 纯逻辑（分组/过滤）。
- 包形状测试：断言 package.json 的 exports/dsh 元数据与 cordis.patch.yml（quota-watch package-shape 先例）。
- 装机冒烟：隔离 scratch profile（049 runbook）+ GET /dsh-l/state 200 + 面板出现。全环探针含 override→stage→G1 任务包 golden→state 回溯→设置往返→真 agent 分诊双裁决（PASS-happy=updated+by=llm / PASS-fail-closed=502+triage.error 落痕）。
- 隔离环境的 LLM 预期（2026-11-13 实录）：scratch 宿主无 LLM 凭据时 llm-deepseek 报 `MISSING_CREDENTIAL`，分诊走 fail-closed 裁决——这是**预期**而非插件缺陷；happy path 需 `DEEPSEEK_API_KEY`（宿主凭据服务或启动 env，错误信息明示）。真机实录：2026-11-13 冒烟 10/10 PASS，分诊 PASS-fail-closed，任务包 golden 在真实仓（iasiv5/dsh-m）现场验证通过。
