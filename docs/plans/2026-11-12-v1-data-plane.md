# 实施计划 — v1 数据面 + 分诊（2026-11-12）

输入：docs/design.md（已定稿）+ PRODUCT.md + ADR-0001。执行环境：bash（Host A，/home/ubuntu/workspace/dsh-l）。联网 npm 一律带 npm_config_cache=/home/ubuntu/workspace/.npm-cache。

## 全局约束

- 零运行时 dependencies；devDependencies 仅 esbuild。Node ≥24，ESM（.mjs）。
- engines.dsh 固定 >=0.2.2-rc.1；不引 @deepseek-ai/* 运行时依赖（know-how 041 红线）。
- GitHub token 不落存储、不打日志、只进 Authorization 头。
- UI 文案只出自 src/client/locale/zh-CN.mjs 与 en.mjs，两文件键集始终同步。
- Task 6/7 动 UI 前：读 impeccable reference/craft-floor.md；完成后跑 impeccable detect。
- 装机验证一律隔离 scratch profile（know-how 049 runbook），不触在役宿主。

## 文件结构与职责

```
dsh-l/
├─ package.json / cordis.patch.yml      # 已建（骨架）
├─ scripts/build-host.mjs               # esbuild src/host.mjs → lib/host.js（platform=node, external @deepseek-ai/* 与 cordis）
├─ scripts/build-client.mjs             # esbuild src/client/index.mjs → lib/client.js（iife, browser）
├─ src/host.mjs                         # 宿主入口：inject + 路由挂载 + timer 装配 + ctx.effect 卸载清理
├─ src/handlers.mjs                     # makeHandlers({store,provider,triage,now}) 纯函数
├─ src/store.mjs                        # createStore({filePath,now,initial})：JSON 文档 + design §2 全部 API
├─ src/github.mjs                       # resolveToken/listOpenIssues/listOpenPulls/discoverRepos
├─ src/triage.mjs                       # parseTriageOutput(text) + runTriage(注入桩可测)
├─ src/client/index.mjs                 # 入口：slots 注册（main + sidebar.panellist order:7）
├─ src/client/i18n.mjs                  # 宿主 locale → t() 解析
├─ src/client/logic.mjs                 # 纯逻辑：groupCandidates/filterCandidates（无头可测）
├─ src/client/components/workbench.mjs / repoPicker.mjs / candidateRow.mjs / pipelineStrip.mjs
├─ test/package-shape / store / github / handlers / triage / logic 六个 .test.mjs
└─ scripts/install-smoke.sh             # 隔离 profile 装机冒烟（Task 9）
```

接口依赖：host.mjs 消费 handlers；handlers 消费 store/provider/triage 的全部 API；client 消费 host 路由的 JSON 契约（design §4）与 logic.mjs。

---

### Task 1: 构建链 + 包形状测试 + 最小可挂载实体

目标：esbuild 双构建跑通，包形状测试锁死 manifest，client 能注册面板（空态页）。

Files:
- Create: scripts/build-host.mjs, scripts/build-client.mjs, test/package-shape.test.mjs, src/host.mjs, src/client/index.mjs, src/client/i18n.mjs

验证范围: npm run build && npm test 全绿；lib/host.js 与 lib/client.js 存在。

接口契约:
- Consumes: package.json（已建）、src/client/locale/ 两字典（已建）
- Produces: 两个构建脚本；lib/host.js 导出 name=dsh-l、inject、apply(ctx)；lib/client.js 注册 main 面板（key dsh-l.workbench）与 sidebar.panellist（order 7）

Step 1: 当前状态检查（先写 test/package-shape.test.mjs：断言 pkg.name=dsh-l、exports 键集 [., ./client]、dsh.engines.dsh、dsh.bundle.patch、dsh.client.inject 深等 [slots, @deepseek-ai/dsh-client-locale]、dependencies 为 undefined、lib/host.js 与 lib/client.js 存在、lib/client.js 文本含 sidebar.panellist）。
- Run: npm install && npm test
- Expected: 红——lib/ 不存在（构建脚本未建）。

Step 2: 确认失败信号（exit code 非 0，existsSync 断言失败）。

Step 3: 最小实现——build-host.mjs/build-client.mjs 用 esbuild bundle（host: format esm/platform node/external @deepseek-ai/* 与 cordis；client: format iife/platform browser/target es2022）；src/host.mjs 最小版 inject=[webServer]、注册 /dsh-l/health 返回 {ok:true}、ctx.effect 收尾；src/client/index.mjs 的 apply(ctx) 内 ctx.slots.inject 为 main 与 sidebar.panellist（order 7、label 解析式取 t(panelLabel)），Workbench 空态页用 emptyStates.backlog 文案挂 Shadow DOM；src/client/i18n.mjs 从宿主 locale 服务取 lang 映射两份字典出 t()。
- Change: 新增两构建脚本与最小 host/client/i18n。

Step 4: npm run build && npm test → exit 0。

Step 5: git add -A && git commit -m "feat(build): esbuild 构建链 + 包形状测试 + 最小面板挂载"

---

### Task 2: store.mjs 存储层

目标：design §2 的 JSON 文档与全部 store API 落地，首跑默认值内置。

Files: Create src/store.mjs, test/store.test.mjs

验证范围: store 用例全绿（首跑默认 12 仓；upsert 对已存在候选保留 stage/triage/gates/history 仅刷新可变字段；所有变更追加 history 且每候选上限 50 条）。

接口契约:
- Consumes: design §2 schema
- Produces: createStore({filePath,now,initial}) 返回 { getWatch, setWatch, upsertCandidates, listCandidates, getCandidate, setStage, setTriage, setGate, getSettings, setSettings, getSnapshots, setSnapshots }；候选 key 规则 repo#type#number

Step 1: 失败检查——test/store.test.mjs import createStore 模块不存在，npm test 报 ERR_MODULE_NOT_FOUND。
Step 2: 确认失败信号。
Step 3: 实现：读文件→无则 initial()（watch=PRODUCT.md 的 12 默认仓；settings={intervalMinutes:0,triageModel:null}）；变更整体写回用 tmp+rename 原子写；setGate 的 G1+pass 时写入 taskPackage 字段（内容按 design §6 由 handlers 组装传入）。
Step 4: npm test 全绿。
Step 5: git commit -m "feat(store): 候选/监看/快照/设置存储层 + 首跑默认"

---

### Task 3: github.mjs provider

目标：REST 摄取与 token 解析，全部依赖注入可测。

Files: Create src/github.mjs, test/github.test.mjs

验证范围: github 用例全绿（分页拼接；issues 端点剔除含 pull_request 的行；token 三级解析顺序 credentials→gh→匿名；无 token 时无 Authorization 头；错误信息带仓名）。

接口契约:
- Consumes: design §3
- Produces: resolveToken({credentials,execFile})、listOpenIssues({repo,token,fetch})、listOpenPulls({repo,token,fetch})、discoverRepos({token,fetch})，返回 design §2 候选原始字段形状

Step 1: 失败检查——test/github.test.mjs 模块不存在，npm test 红。
Step 2: 确认。
Step 3: 实现：API_BASE 常量白名单；fetch 注入默认 globalThis.fetch；issues 过滤 x.pull_request；分页循环至页长 <100。
Step 4: npm test 绿。
Step 5: git commit -m "feat(provider): GitHub REST 摄取 + token 三级解析"

---

### Task 4: handlers.mjs 纯函数路由层 + host 接线

目标：design §4 全部端点处理器；host.mjs 真实装配（inject 扩为 webServer/storage/credentials/timer/agents）。

Files: Create src/handlers.mjs, test/handlers.test.mjs; Modify src/host.mjs

验证范围: handlers 用例全绿（state 摘要形状；refresh 逐仓容错单仓失败记 perRepo.error 不中断且返回 200；watch PUT 校验 owner/repo 形状；triage keys>10 拒 400；stage/gate 迁移写 history；build 后 health 路由仍在）。

接口契约:
- Consumes: Task 2 store API、Task 3 provider API、design §4 路由表
- Produces: makeHandlers({store,provider,triage,now}) 返回 { getState, postRefresh, getWatch, putWatch, getDiscover, postTriage, postStage, postGate }；host.mjs 挂 /dsh-l/* 前缀路由并全部纳入 ctx.effect 清理

Step 1: 失败检查——test/handlers.test.mjs 红（模块不存在）。
Step 2: 确认。
Step 3: 实现 handlers；host 接线：storage 域路径传 createStore、credentials+execFile 传 provider、agents/sessionPersistence/agentDefaultModel 传 triage（timer 留 Task 8）。
Step 4: npm run build && npm test 绿。
Step 5: git commit -m "feat(routes): /dsh-l/* 处理器纯函数化 + host 接线"

---

### Task 5: triage.mjs 分诊

目标：parseTriageOutput golden 稳定；runTriage 注入桩可测；真实路径按 autoloop docs/dsh-api-mapping.md §3–§6（钉 0.2.2-rc.1）。

Files: Create src/triage.mjs, test/triage.test.mjs

验证范围: triage 用例全绿（json 围栏/尾随杂文/多数组取最后一个/非法输出返回 null；batch>10 抛错；结果逐条 setTriage 且 by=llm、lang 透传；agents 异常时整批 failed 并返回错误串）。

接口契约:
- Consumes: Task 2 setTriage、design §5
- Produces: parseTriageOutput(text)；runTriage({agents,sessionPersistence,agentDefaultModel,settings,candidates,lang,now}) 返回 { updated: [key], failed?: string }

Step 1: 失败检查——test/triage.test.mjs 红。
Step 2: 确认。
Step 3: 实现：zh/en 双语 prompt 模板（输出语言=lang）；agents.create→send→whenIdle→sessionPersistence 读末条 assistant→parse→逐条写回。
Step 4: npm test 绿。
Step 5: git commit -m "feat(triage): 批量 LLM 分诊 + 回执解析"

---

### Task 6: client 基础工作台（列表 + 过滤 + 刷新）

目标：主栏页呈现分组候选列表、过滤条、刷新按钮；纯逻辑无头可测。

Files: Create src/client/logic.mjs, test/logic.test.mjs, src/client/components/workbench.mjs, src/client/components/candidateRow.mjs; Modify src/client/index.mjs

验证范围: logic 用例全绿（分组顺序 inbox→triaged→gating→building→verifying→shipped→closed/held 折叠区；过滤 type×repo×urgency 组合）；npm run build 后待 Task 9 冒烟手查。

接口契约:
- Consumes: design §4 路由 JSON、locale 字典、impeccable craft-floor（动手前必读一次）
- Produces: groupCandidates(list,t)、filterCandidates(list,{type,repo,urgency})；组件 props 契约写在 workbench.mjs 头注释

Step 1: 失败检查——test/logic.test.mjs 红；同时读 impeccable reference/craft-floor.md（UI 编辑前置）。
Step 2: 确认。
Step 3: 实现 logic + workbench（页头/过滤条/分组列表/空态全 i18n；GET /dsh-l/state + POST /dsh-l/refresh；样式走宿主 alias 令牌，按 01_docs/research/dsw-alias-tokens.md 白名单取值，禁引不存在 alias）。
Step 4: npm run build && npm test 绿。
Step 5: git commit -m "feat(ui): 工作台分组列表 + 过滤 + 刷新"

---

### Task 7: repo 选择器 + 批量分诊 + 候选操作 + 管线条

目标：选择器（账号发现+手填+勾选持久化）、批量分诊按钮、行操作（改阶段 / G1 放行→复制任务包 JSON）、七段管线灰显条。

Files: Create src/client/components/repoPicker.mjs, src/client/components/pipelineStrip.mjs; Modify src/client/components/workbench.mjs, src/client/components/candidateRow.mjs

验证范围: npm run build 绿；Task 9 冒烟走通「刷新→过滤→分诊→G1 放行→复制任务包」全路径。

接口契约:
- Consumes: Task 6 组件 props 契约；路由 /dsh-l/discover、/dsh-l/triage、/dsh-l/candidates/{key}/stage、/dsh-l/candidates/{key}/gate
- Produces: 完整 v1 UI；G1 pass 后 candidate.taskPackage JSON 入剪贴板

Step 1: 失败检查——三组件缺失，冒烟清单相应入口不可达。
Step 2: 确认（build 绿但功能缺失）。
Step 3: 实现 repoPicker（discover 拉取+勾选+PUT watch+手添 owner/repo）、pipelineStrip（7 段计数，build/verify/ship 灰显）、candidateRow 操作区；G1 pass 调 gate 路由后本地刷新。
Step 4: npm run build && npm test 绿。
Step 5: git commit -m "feat(ui): repo 选择器 + 批量分诊 + 闸门操作 + 管线条"

---

### Task 8: 定时轮询（默认关）+ 设置项

目标：settings.intervalMinutes>0 时 ctx.interval 定时 refresh；UI 设置入口。

Files: Modify src/host.mjs, src/client/components/workbench.mjs

验证范围: handlers 测试补 interval 边界（0=不注册 interval；运行中改值即时重 arm）；npm run build 绿。

接口契约:
- Consumes: Task 4 host 接线、store getSettings/setSettings
- Produces: armInterval(ctx,store,handlers)（返回 dispose，纳入 ctx.effect）

Step 1: 失败检查——host.mjs 中无 ctx.interval 装配（grep 计数 0）。
Step 2: 确认。
Step 3: 实现 armInterval + 设置弹层（intervalMinutes 数字输入 + 保存走 setSettings）。
Step 4: npm run build && npm test 绿。
Step 5: git commit -m "feat(poll): 可选定时摄取（默认关）"

---

### Task 9: 隔离 profile 装机冒烟

目标：know-how 049 runbook 全链路验证，覆盖「装包≠挂载」坑位。

Files: Create scripts/install-smoke.sh

验证范围: 脚本 exit 0：scratch profile 建成 → pnpm add 本地 link → bundles 追加 dsh-l → 3095 端口启动 → /dsh-l/health 200 → /dsh-l/state 200 且含 12 默认仓 → dump-config 含 dsh-l → 面板注册出现在启动日志 → 清理 scratch profile。

接口契约:
- Consumes: 01_docs/dsh-intall-know-how/049 runbook、宿主 dsh --profile CLI
- Produces: scripts/install-smoke.sh（可重复执行；中途失败也清理）

Step 1: 失败检查——bash scripts/install-smoke.sh 报 No such file。
Step 2: 确认。
Step 3: 按 049 六步实现（token 提取正则 [A-Za-z0-9_-]+；POST 驱动带 origin/host；trap 清理）。
Step 4: bash scripts/install-smoke.sh; echo $? → 0。
Step 5: git commit -m "chore(smoke): 隔离 profile 装机冒烟脚本"。

---

## 交接终点

Task 9 通过后：v1 交付物 = 隔离宿主里可用的数据面工作台（面板在侧栏官方条目下方）。发 npm 0.1.0、在役 profile 挂载、README 截图为下一批次，需主人点头另开计划。
