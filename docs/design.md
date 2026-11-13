# dsh-l 设计文档 — v1 数据面 + 分诊

共识来源：2026-11-12 grill 定稿（对话实录）；ADR-0001；GLOSSARY.md。本文落「当时明确延后」的三项设计：任务包 schema、分诊输出格式、存储结构，外加接口与验证策略。

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

store API（后续任务的接口契约）：getWatch()/setWatch(repos)、upsertCandidates(list)（摄取合并：已存在者仅刷新可变字段并保留 stage/triage/gates/history）、listCandidates()、getCandidate(key)、setStage(key, stage, note)、setTriage(key, result, by)、setGate(key, gate, decision, note, taskPackage?, via?)、getSettings()/setSettings(patch)、getSnapshots()/setSnapshots(perRepo)、appendIngestLog(entry)/getIngestLog()、recordHistory(key, event, detail)、setRepoFacts(repo, facts)/getRepoFacts(repo)、sweepUpstream(repo, liveKeys)、getAuth()/setAuth({account, login})/clearAuth()（收活绑定与退出；退出只清 auth 块）。所有候选变更追加 history（含分诊失败 triage.error 与上游回收 upstream-closed/upstream-gone）。

## 3. GitHub provider（github.mjs）

- resolveToken({ credentials, execFile })：① credentials 记录 dsh-l.github-token（若配置）→ ② gh auth token（execFile，本机登录态）→ ③ null（匿名，仅公开仓，速率低）。
- listOpenIssues({ repo, token, fetch })：GET /repos/{repo}/issues?state=open&per_page=100（分页至 <100；剔除含 pull_request 字段的行——REST issues 会混入 PR）。
- listOpenPulls({ repo, token, fetch })：GET /repos/{repo}/pulls?state=open&per_page=100。
- discoverRepos({ token, fetch })：GET /user/repos?affiliation=owner&sort=pushed&per_page=100，供选择器。
- getRepo({ repo, token, fetch })：GET /repos/{repo}，取 defaultBranch（default_branch）与 cloneUrl（ssh_url）——任务包 repo 块的数据源；字段缺失回退 main + SSH 惯例地址。
- getViewer({ token, fetch })：GET /user，取 token 真实身份（login）——收活绑定校验的数据源；失效/无权 401 抛错。
- ghAvailable({ execFile })：execFile gh --version 探测本机 gh CLI 是否安装，登录闸状态展示用（不触网络）。
- 域名白名单硬编码 https://api.github.com；token 只进 Authorization 头，不落日志、不进存储。
- 速率账：12 仓 × 3 端点 = 36 请求/刷新（issues/pulls/repos）；token 上限 5000/h，5 分钟一刷也仅 432/h。

## 4. Host 路由

| 方法 | 路径 | 请求体 | 语义 |
|---|---|---|---|
| GET | /dsh-l/health | — | 健康与构建指纹（ok / name / build / dataDir） |
| GET | /dsh-l/state | — | watch + snapshots + candidates 摘要 + settings + ingestLog + auth 绑定（回溯入口） |
| GET | /dsh-l/auth | — | 收活连接状态：gh CLI 是否安装（ghAvailable）、凭据是否可得（tokenAvailable）与当前绑定（account/login/verifiedAt，未绑定为 null）；不打 GitHub 网络 |
| POST | /dsh-l/auth/bind | {account} | 绑定校验：token 就绪 → GET /user 比对身份（大小写不敏感）→ 成功落 auth 并回显；失败 409 区分 gh-not-installed / gh-not-authorized / token-invalid (…) / account-mismatch: <login>；非法用户名 400 |
| POST | /dsh-l/auth/logout | — | 工作台级退出：只清 auth 绑定（watch/候选/设置全保留），不动本机 gh 登录态 |
| POST | /dsh-l/refresh | — | **须先绑定账号，否则 401 auth-required**；摄取全部监看仓（逐仓容错，单仓失败记 perRepo.error 不中断；返回 authenticated）；成功仓同步仓库事实并做上游回收（见 §8），每次摄取追加一条 ingestLog |
| GET/PUT | /dsh-l/watch | {repos:[]} | **须先绑定账号**；监看列表 CRUD（PUT 校验 owner/repo 形状） |
| GET | /dsh-l/discover | — | **须先绑定账号**；账号仓列表（选择器数据源） |
| POST | /dsh-l/triage | {keys:[…≤10], lang} | 批量分诊，结果写回候选（by=llm）；失败 502 |
| POST | /dsh-l/candidate/override | {key, validity, urgency, action, reason, lang} | 人工推翻分诊（by=human） |
| POST | /dsh-l/candidate/stage | {key, stage, note} | 人工改阶段（仅 inbox/triaged/gating/shipped/closed/held；building 只能经 G1） |
| POST | /dsh-l/candidate/gate | {key, gate, decision, note} | 闸门放行/驳回：G1 仅 gating 可操作（否则 409 gate-requires-gating），pass→building+任务包、reject→triaged；G2/G3 v1 返回 409 |
| GET/PUT | /dsh-l/settings | {intervalMinutes?, triageModel?} | 设置读写（可只改其中一项；triageModel 须在目录内或 null）；intervalMinutes 变更即时重 arm 定时器 |
| GET | /dsh-l/models | — | 宿主模型目录 + 宿主默认（分诊模型设置数据源） |

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

- **未绑定（登录闸，2026-11-13 板块划分）**：整页登录界面——GitHub 用户名输入 + gh CLI 安装/凭据状态 chip + 三步引导（安装 gh → `gh auth login` → 填用户名连接校验）；连接成功进入工作台，退出账号即回到此界面。
- **已绑定（工作台）**分两大板块：**收活**（页头账号 chip + 退出按钮；监看仓数量 / Issue / PR 概况 chip + 仓库勾选入口）与**分诊与拍板**（管线条 + 过滤条 + 分组列表）。
- 页头：标题 + 刷新按钮 + 设置 + 账号 chip + 退出按钮 + 上次刷新时间；批量分诊按钮在过滤条。
- 过滤条：类型（全部/Issue/PR）× 仓 × 紧急度。
- 主体：按阶段分组的列表（待分诊 / 已分诊 / 待拍板 + 折叠的 进行中/已交付/已关闭），行内：类型徽标、repo#number、标题、年龄、紧急度 chip、真实性 chip、建议动作；展开：分诊理由 + 操作（改阶段 / G1 放行 → 任务包）。
- 管线条：7 段横向指示（各段计数），build/verify/ship 在 v1 灰显。
- 视觉：Shadow DOM 隔离；色板/间距对齐宿主主题 alias 令牌（参照 01_docs/research/dsw-alias-tokens.md，禁引不存在的 alias）；实现前读 impeccable craft-floor，完成后跑 impeccable detect。
- 空态/错误态文案只用 i18n 字典；首跑预勾选 12 仓（PRODUCT.md）。

## 8. 阶段状态机

inbox →（分诊）→ triaged →（人工安排）→ gating →（G1 放行）→ building（v2）→ verifying（v2）→ shipped；任意阶段可 closed / held；verifying 失败 → 回炉 building（限 3 次，v2 生效）。v1 仅落地 inbox/triaged/gating/closed/held/shipped 的展示与人工迁移，building/verifying 只读灰显。每次迁移记 history。

上游关闭（sweepUpstream）：摄取某仓成功后，该仓已不在 open 集合里的候选——未拍板阶段（inbox/triaged）自动转 closed（event=`upstream-closed`）；在途阶段（gating/held/building/verifying）不代作主，记一次 `upstream-gone` 提示（连续刷新去重）待人工处理；closed/shipped 消失上游属预期，不动。只对摄取成功的仓执行（失败仓 open 集合未知，回收会误伤）；移出监看的仓不回收，候选保留至重新监看或人工关闭。

## 9. 安全

- 凭据：token 经 ctx.credentials 记录（可选覆写）或 gh 进程读取；不落存储、不打日志。auth 绑定块只存用户名与校验时间，不含任何凭据材料。
- 退出语义：logout 只清工作台绑定，绝不调用 gh auth logout、不撤销本机凭据；收活闸门（refresh/watch/discover 未绑定一律 401）在服务端强制，UI 只是呈现。
- 出网：仅 api.github.com；未来飞书通道仅 open.feishu.cn webhook。
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
