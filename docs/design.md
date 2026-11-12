# dsh-l 设计文档 — v1 数据面 + 分诊

共识来源：2026-11-12 grill 定稿（对话实录）；ADR-0001；GLOSSARY.md。本文落「当时明确延后」的三项设计：任务包 schema、分诊输出格式、存储结构，外加接口与验证策略。

## 1. 架构总览

```
client (src/client/, Shadow DOM)
  ├─ slots: "main" 整页工作台 + "sidebar.panellist" (order:7, label 解析式)
  ├─ i18n: 宿主 locale 服务 → zh-CN / en 字典
  └─ fetch → host 路由（同源）
host (src/host.mjs, inject: webServer, storage, credentials, timer, agents)
  ├─ 路由 /dsh-l/*  →  store + provider + triage
  ├─ store (src/store.mjs)   → ctx.storage 域 dsh-l（~/.dsh/storages/dsh-l.json）
  ├─ provider (src/github.mjs) → api.github.com REST（token: credentials 覆写 → gh 登录态 → 匿名）
  ├─ triage (src/triage.mjs)   → ctx.agents 短命会话批量分诊
  └─ timer (ctx.interval)     → 定时摄取，默认关
```

## 2. 存储结构（store.mjs）

单一 JSON 文档（ctx.storage 域 dsh-l），结构版本字段 version；不写迁移，格式指纹变化时重建投影。

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
      pull: { draft, additions, deletions, headRef },       // 仅 PR
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
  settings: { intervalMinutes: 0, triageModel: null }        // 0=关；null=宿主默认模型
}
```

store API（后续任务的接口契约）：getWatch()/setWatch(repos)、upsertCandidates(list)（摄取合并：已存在者仅刷新可变字段并保留 stage/triage/gates/history）、listCandidates()、getCandidate(key)、setStage(key, stage, note)、setTriage(key, result, by)、setGate(key, gate, decision, note)、getSettings()/setSettings(patch)、getSnapshots()。所有变更追加 history。

## 3. GitHub provider（github.mjs）

- resolveToken({ credentials, execFile })：① credentials 记录 dsh-l.github-token（若配置）→ ② gh auth token（execFile，本机登录态）→ ③ null（匿名，仅公开仓，速率低）。
- listOpenIssues({ repo, token, fetch })：GET /repos/{repo}/issues?state=open&per_page=100（分页至 <100；剔除含 pull_request 字段的行——REST issues 会混入 PR）。
- listOpenPulls({ repo, token, fetch })：GET /repos/{repo}/pulls?state=open&per_page=100。
- discoverRepos({ token, fetch })：GET /user/repos?affiliation=owner&sort=pushed&per_page=100，供选择器。
- 域名白名单硬编码 https://api.github.com；token 只进 Authorization 头，不落日志、不进存储。
- 速率账：12 仓 × 2 端点 = 24 请求/刷新；token 上限 5000/h，5 分钟一刷也仅 288/h。

## 4. Host 路由

| 方法 | 路径 | 请求体 | 语义 |
|---|---|---|---|
| GET | /dsh-l/state | — | watch + snapshots + candidates 摘要 + settings |
| POST | /dsh-l/refresh | — | 摄取全部监看仓（逐仓容错，单仓失败记 perRepo.error 不中断） |
| GET/PUT | /dsh-l/watch | {repos:[]} | 监看列表 CRUD |
| GET | /dsh-l/discover | — | 账号仓列表（选择器数据源） |
| POST | /dsh-l/triage | {keys:[…≤10]} | 批量分诊，结果写回候选 |
| POST | /dsh-l/candidates/{key}/stage | {stage, note} | 人工改阶段（含关闭/挂起/推翻分诊） |
| POST | /dsh-l/candidates/{key}/gate | {gate:"G1", decision:"pass"|"reject", note} | 闸门放行/驳回（v1 仅 G1 有语义，pass 时生成任务包） |

处理器写成纯函数 makeHandlers({ store, provider, triage, now })，路由层只做 JSON 编解码——单测不打真 HTTP。

## 5. 分诊（triage.mjs）

- 触发：手动「分诊」批量按钮，一批 ≤10 条候选。
- 执行：ctx.agents.create 短命会话（不设工作目录；approval 策略 never——纯推理轮，无工具需求）；模型 = settings.triageModel ?? 宿主当前默认（agentDefaultModel.currentSelection()）。
- Prompt：候选摘要（title / bodyExcerpt / labels / ageDays / comments / reactions / PR: draft+diff 规模），要求唯一输出一个 json 围栏数组：

```json
[{ "key": "…", "validity": "high|medium|low", "urgency": "P0|P1|P2|P3",
   "action": "start|feedback|close|hold", "reason": "≤80字，界面语言" }]
```

输出语言 = 工作台当前界面语言（prompt 内约束）。
- 回执读取：会话静止（whenIdle）后经 sessionPersistence 读最后一条 assistant 消息，抽出最后一个合法 JSON 数组；解析失败 → 该批标记失败（history 记 error），候选留 inbox，可重跑。API 用法以 autoloop docs/dsh-api-mapping.md §3–§6 为准（钉 0.2.2-rc.1）。
- 解析器独立纯函数 parseTriageOutput(text)，golden 用例单测。

## 6. 任务包 schema（交接契约，ADR-0001）

G1 放行时生成并挂到候选（v1 即生效——契约先于执行器落地；UI 提供「复制任务包 JSON」）：

```js
{
  version: 1,
  kind: "dsh-l.task-package",
  candidate: { key, repo, type, number, title, url },
  triage: { validity, urgency, action, reason },
  gate: { gate: "G1", passedBy: "human", at: "iso" },
  instructions: { goal: "一句话目标", constraints: [], definitionOfDone: [] },
  repo: { defaultBranch: "main", cloneUrl: "git@github.com:….git", localPath: null },
  emit: { source: "dsh-l", type: "build.requested", at: "iso" }   // 对齐 autoloop 事件信封字段
}
```

## 7. UI 结构（Operate 模式）

- 页头：标题 + 上次刷新时间 + 刷新按钮 + 监看仓库选择器入口 + 批量分诊按钮。
- 过滤条：类型（全部/Issue/PR）× 仓 × 紧急度。
- 主体：按阶段分组的列表（待分诊 / 已分诊 / 待拍板 + 折叠的 进行中/已交付/已关闭），行内：类型徽标、repo#number、标题、年龄、紧急度 chip、真实性 chip、建议动作；展开：分诊理由 + 操作（改阶段 / G1 放行 → 任务包）。
- 管线条：7 段横向指示（各段计数），build/verify/ship 在 v1 灰显。
- 视觉：Shadow DOM 隔离；色板/间距对齐宿主主题 alias 令牌（参照 01_docs/research/dsw-alias-tokens.md，禁引不存在的 alias）；实现前读 impeccable craft-floor，完成后跑 impeccable detect。
- 空态/错误态文案只用 i18n 字典；首跑预勾选 12 仓（PRODUCT.md）。

## 8. 阶段状态机

inbox →（分诊）→ triaged →（人工安排）→ gating →（G1 放行）→ building（v2）→ verifying（v2）→ shipped；任意阶段可 closed / held；verifying 失败 → 回炉 building（限 3 次，v2 生效）。v1 仅落地 inbox/triaged/gating/closed/held/shipped 的展示与人工迁移，building/verifying 只读灰显。每次迁移记 history。

## 9. 安全

- 凭据：token 经 ctx.credentials 记录（可选覆写）或 gh 进程读取；不落存储、不打日志。
- 出网：仅 api.github.com；未来飞书通道仅 open.feishu.cn webhook。
- 写操作全部经人工手势（按钮），无自动写 GitHub。

## 10. v2/v3 接缝

- 执行器接缝：executeTaskPackage(pkg)（v2 实现：ctx.agents + workingDirectory + turn/end 监听 + 状态回流）；包 schema 稳定，v1 UI 不因执行器引入而重写。
- 飞书发送器接口 sendNotice(text, meta)（v2，自定义机器人 webhook，约 50 行；双向参考 autoloop plugins/feishu/channel.ts）。
- 角标 sidebar.toggle.badge、看板视图、GitLab provider（实现 §3 同名接口）均 v2/v3。

## 11. 验证策略

- 单测（node --test）：store 全 API、provider（注入 fetch/execFile 桩）、parseTriageOutput golden、handlers 纯函数、client 纯逻辑（分组/过滤）。
- 包形状测试：断言 package.json 的 exports/dsh 元数据与 cordis.patch.yml（quota-watch package-shape 先例）。
- 装机冒烟：隔离 scratch profile（049 runbook）+ GET /dsh-l/state 200 + 面板出现。
