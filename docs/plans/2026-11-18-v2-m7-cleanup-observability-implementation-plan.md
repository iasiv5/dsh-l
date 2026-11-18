# dsh-l v2 M7（清账 + 可观测性）实施计划

## 目标

- 守护收紧四小项：host-smoke ③ 注入表达式锚（engine 侧 rolePrompt）、feishu 合法 token trim 入库、路由断言扩集、两 check script 字节锁。
- 可观测性四小项：onNodeDone 成功清 stale error、cancelledNodeIds + 行内重试入口、resume 痕迹落 history、sweeper skipped 计数 logger。
- 多模板渲染（§16-8 最小形）：管线 strip 按候选 currentRun 的 templateId 匹配模板。
- **backlog 大扫除**：§16-1/3/4/7/8/9/12/13 全清（维持不做项 5/6/10 与 publish 相关 11 留档）。
- 不含：publish（Q6-A 维持挂起）、设置面板深化（§16-5 留档）、模板名徽标（§18.6 明示不做）、新 i18n 键（可观测组走 history/既有通道）。

## 架构快照

- 注入表达式锚：host-smoke ③ 升格——stub ctx.agents.create 捕获 world 传参，startRun(devflow-lite) 同步建跑后异步等待 agents.create 被调（tmp env 下 ensure 异步失败不阻断 design→implement 前的首次 agent 调用? **实现时以实际时序为准**：若 ensure 失败先于 agent 调用，则改断言经真实 makeExecWorld 的 world.createAgent 被调前的 listRoles 闭包行为——最稳锚点为 stub world 内捕获，host.buildRuntime 的 makeExecWorld(ctx, dir) 用 stub ctx.agents 组装，rolePrompt 经 world.createAgent 的 initMessage 传入）。实现细节见 T1。
- stale error：onNodeDone 成功分支 `[nodeId]: { ..., error: null }`（skipped 态 error 不动）。
- cancelledNodeIds：summarizeRun 与 failedNodeIds 同构（status==="cancelled"）；actions 行内重试按钮数据源 failed∪cancelled（按钮文案同 retry）。
- resume 痕迹：dispatch({resume}) 分支 appendRunHistory("node.resumed", `${nodeId} seq=${resumeSeq}`)。
- 多模板渲染：stripCells 增第二参来源——candidates 的 currentRun templateId 集合 → 按 run.templateId 分组渲染各自管线（loop 段输出多组，组头=templateId）；无 run 候选仍按 templates[0]。**实现前先读 actions.mjs/workbench.mjs 的 strip 渲染调用侧确认改动面**（若调用侧面积超 1 文件，本项降级为「stripCells 支持按 templateId 取管线」纯函数 + 调用侧最小适配）。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json（version 0.1.0 不动——publish 属验收后动作且 auth 阻塞）。
- 测试桩纪律：fetch/execFile/spawn/io/world 全注入；单测不真实出网/spawn/clone；禁 jsdom。
- 闸门不变式：G1/G2/G3 语义零变化；模板两内置形状零变化（M7 无模板改动——check-script 字节锁正是防漂移）。
- 先红后绿再 commit（硬纪律）；绿基线任务红证=一次性变异（不保留）；docs 独立 commit；回应前 grep 实文验证。
- 命令环境：Linux bash，`/home/ubuntu/workspace/dsh-l`；管道验证 `set -o pipefail`。

## 输入工件

- 设计：docs/design-v2.md §18（M7 补钉全条）、§16（清账来源池）。
- 参照实现：src/client/logic.mjs stripCells（多模板渲染改造对象）、src/handlers.mjs putFeishuWebhook（trim 对象）、test/host-smoke.test.mjs（③升格对象）、src/engine/engine.mjs onNodeDone/dispatch、scheduler.mjs summarizeRun/cancelRun、src/client/components/actions.mjs（重试按钮数据源）、host.mjs sweeper。

## 文件结构与职责

- Modify: `test/host-smoke.test.mjs` — ③升格（rolePrompt 端到端锚）+ ①路由断言扩集（§16-1/4）
- Modify: `src/handlers.mjs` — putFeishuWebhook token trim（§16-3）
- Modify: `test/handlers.test.mjs` — trim 用例
- Modify: `test/workflows.test.mjs` — 两 check script deepEqual 字节锁（§16-12）
- Modify: `src/engine/engine.mjs` — onNodeDone 成功清 error + dispatch resume 落痕（§18.2/18.4）
- Modify: `src/engine/scheduler.mjs` — summarizeRun 增 cancelledNodeIds
- Modify: `test/scheduler.test.mjs` — cancelledNodeIds 断言（deepEqual 同步）
- Modify: `test/engine.test.mjs` — 清 error 钉例 + resume 痕迹钉例
- Modify: `src/client/logic.mjs` — stripCells 多模板渲染
- Modify: `test/logic.test.mjs` — 多模板渲染钉例
- Modify: `src/client/components/actions.mjs` — 重试按钮数据源 failed∪cancelled（如渲染侧需扩）
- Modify: `src/host.mjs` — sweeper 计数 logger（§16-13a）
- 不动：src/workflows/builtin.mjs（模板零变化——字节锁正是保护它）、review.mjs、kanban.mjs、locale 双字典（可观测组零新键——history/既有通道承载）

任务依赖：T1（host-smoke 升格，含 §16-1/4）→ T2（feishu trim）→ T3（字节锁）→ T4（stale error）→ T5（cancelledNodeIds+按钮）→ T6（resume 痕迹）→ T7（多模板渲染）→ T8（sweeper 计数）→ T9（终验）。小项多，按编号顺序快速推进；每任务独立红绿（或绿基线+变异红证）。

## 任务清单

### Task 1: host-smoke 升格（§16-1 注入锚 + §16-4 路由扩集）

- 目标：③升格 engine 侧 rolePrompt 端到端锚；①路由断言增 models/triage/settings/watch。
- 涉及文件：Modify `test/host-smoke.test.mjs`
- 接口契约（评审问题2 修正——prompt 不经 create 参数，走 handle.agent.send 通道）：
  - Consumes: buildRuntime 返回 {dir, store, handlers, table, workspace, engine}；makeExecWorld(ctx, dir)（host.mjs:48）——world.createAgent(sessionId, {model}) 调 **ctx.agents.create({sessionId, meta:{cwd}, agentOptions, setup})**（无 prompt 字段），返回 handle 后 executor 经 **handle.agent.send(world.userMessage(prompt), ...)** 送 prompt（executor.mjs:53）；stub ctx.agents.create 须返回假 handle `{ agent: { send: (msg) => { captured.push(msg); } } }` 形态（否则 executor send 处 TypeError）
  - Produces: ①table 断言增 `/dsh-l/models`、`/dsh-l/triage`、`/dsh-l/settings`、`/dsh-l/watch`；③新增探针：stub ctx.agents.create 捕获调用 + 返回假 handle → seed 候选 → upsertRole 覆盖 devflow-architect → startRun(devflow-lite) → **三层轮候（评审问题3 探针实证）**：①轮候 run.status==="waiting"（ensure 收敛；失败态=clone 挂）→ ②applyGateDecision(runId, "requirement", "pass")（devflow-lite 无 entryPresucceeded——requirement(G1) 首个 pending gate 卡 waiting 等人工，不过闸 agent 调用永不达）→ ③轮候 handle.agent.send 被调 → 断言 send 首参 message 的 text 含用户覆盖角色 prompt 标记（store 优先端到端——评审探针 B2 已实证 USER-OVERRIDE-MARKER 全链可达）；顺带断言 create 的 agentOptions 为**空串形态**（{provider:"",model:""}——stubCtx 无 agentDefaultModel，resolveTriageSelection 兜底；评审建议5 二选一取零成本侧，model 通道正向解析不属本锚目标）
- 验证范围：`npm test`（host-smoke 段）

- [ ] Step 1: 读实文（host.mjs makeExecWorld + executor runAgentNode 的 world 调用序）→ 失败测试（覆盖角色 prompt 断言）。**spawn 豁免口径（评审问题4）**：③探针 spawn 边界 = tmp dataDir 内自建假 gh 脚本与本地 git 目录操作（clone/checkout），无网络出网、无远端 clone——属 world 桩形态的扩展而非破桩纪律（buildRuntime 的 execFile 无注入口，host.mjs:19 promisify 全局；现有 20 测试文件零真 spawn，③为首个，豁免显式声明于此）。
- [ ] Step 2: 实现探针（stub 捕获 + 轮候姿势）。
- [ ] Step 3: Run: 全绿 → **变异红证**（host.mjs 断开 listRoles 注入 → ③红 → 还原）。
- [ ] Step 4: checkpoint commit。

### Task 2: feishu token trim 入库（§16-3）

- 目标：putFeishuWebhook 合法 token 尾随空白 trim 后入库。
- 涉及文件：Modify `src/handlers.mjs`；Test `test/handlers.test.mjs`
- 接口契约：合法 URL（PREFIX + token 带尾空白）→ 入库值为 trim 后形态；空/纯空白仍拒（M5 T3 语义不变）。
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: 失败测试两例（评审建议11 粒度）：①trim 正例 `putFeishuWebhook({url: PREFIX + "tok  "})` → store 凭据值为 PREFIX + "tok"；②纯空白仍拒回归 `{url: PREFIX + "   "}` → invalid webhook（M5 T3 语义锁定）。
- [ ] Step 2: 实现（入库前 trim slice 段）。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 3: check-script 字节锁（§16-12）

- 目标：mr-push-check / mr-open-check script deepEqual 字节锁（同 deliver 范式）；revision 常量值锁不做（理由：computeRevision 内容哈希已被 script 字节锁传递锁定）。
- 涉及文件：Modify `test/workflows.test.mjs`
- 接口契约：两 golden 各增 `assert.equal(byId["mr-push-check"].script, "<字节级全串>")` / mr-open-check 同款（从 builtin.mjs 实文复制 runtime 值）。

- [ ] Step 1: 绿基线测试（直接写断言；红证=一次性变异 builtin script 一字符 → 红 → 还原）。
- [ ] Step 2: Run: 全绿 → checkpoint commit。

### Task 4: stale error 清理（§18.2）

- 目标：onNodeDone 成功分支清 error（skipped 态不动）。
- 涉及文件：Modify `src/engine/engine.mjs`；Test `test/engine.test.mjs`
- 接口契约：成功分支 nodeStates[nodeId] 增 `error: null`；钉例：verify 回炉成功后 error=null（现状残留旧 error）；skipped 态 error 保留由钉例(a) 既有断言覆盖（mr-push-check skipped 后 error 字段仍在——**确认现有断言或补一条**）。
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 失败测试两断言（评审建议9：钉例(a) 现仅断 status 无 error 字段——补字段级回归锚）：①回炉成功后 error=null（现状旧 error 残留）；②skipped 态 mr-push-check 的 error 不为 null（M6 R3 反馈通道字段级锁定）。
- [ ] Step 2: 实现成功分支 error: null。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 5: cancelledNodeIds + 重试入口（§18.3/§16-7）

- 目标：summarizeRun 增 cancelledNodeIds **与 templateId 一键（评审问题6：runs 投影断裂——T7 多模板渲染的数据源）**；行内重试按钮数据源扩 failed∪cancelled。
- 涉及文件：Modify `src/engine/scheduler.mjs`、`test/scheduler.test.mjs`、`src/client/components/actions.mjs`
- 接口契约：
  - Produces: summarizeRun 增 `cancelledNodeIds`（与 failedNodeIds 同构）**与 `templateId`**（run 快照既有字段；client 唯一 runs 来源=handlers summarizeRun 投影，缺此键则 T7 拿不到数据）；既有 deepEqual 断言同步补两字段（scheduler.test :86/:93 全形状恰两处）；actions.mjs 重试按钮 nodeId 数据源 `[...failedNodeIds, ...cancelledNodeIds][0]` + 按钮启用条件含 cancelled run（retryNode 已支持 cancelled run——M2 R1-9）
- 验证范围：`npm test`（scheduler 段）+ build（client 变更）

- [ ] Step 1: 失败测试：scheduler.test 增 cancelled 场景（cancelRun 后 cancelledNodeIds 非空）+ 既有 summarizeRun deepEqual 补 `cancelledNodeIds: []` 与 `templateId`。
- [ ] Step 2: 实现 summarizeRun 字段 + actions.mjs 数据源。
- [ ] Step 3: Run: 全绿 + build → checkpoint commit。

### Task 6: resume 痕迹（§18.4）

- 目标：dispatch resume 分支落 history。
- 涉及文件：Modify `src/engine/engine.mjs`；Test `test/engine.test.mjs`
- 接口契约：dispatch({resume:true, resumeSeq}) **循环内每 ready 节点各落一条**（评审建议10 钉死：与 detail 带 nodeId 自洽）`store.appendRunHistory(runId, "node.resumed", `${nodeId} seq=${resumeSeq}`)`；**连带点名**：engine.test :212 既有断言 history.at(-1).event === "resume.interrupted" 落 node.resumed 后变位必红——同步改判（find 替代 at(-1)）；窄窗用例口径同核。钉例：M2 R1-11 resume 用例断言 history 含 node.resumed。

- [ ] Step 1: 失败测试（既有 resume 钉例补 node.resumed 断言 + resume.interrupted 断言改判）。
- [ ] Step 2: 实现 1 行。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 7: 多模板渲染（§18.6 最小形）

- 目标：stripCells 按候选 currentRun templateId 匹配管线渲染。
- 涉及文件：Modify `src/client/logic.mjs`、**`src/client/components/pipelineStrip.mjs`（评审问题7：renderStrip 签名未接 runs、stripCells({candidates, workflow}) 丢弃——不补则多模板渲染 UI 不可达，且 M2 时代「环内 chip 在途着色」陈年残留一并修复；此步是硬前提不属 D6 形状分叉）**；Test `test/logic.test.mjs`
- 接口契约：
  - Consumes: runs 摘要含 templateId（T5 补键后可达）；workflow.templates meta 数组
  - Produces: `stripCells({candidates, workflow, runs})` — loop 段改多组：按「在途候选 currentRun 的 templateId」取模板渲染（`templates.find(t => t.id === run.templateId) ?? templates[0]`）；输出形状 **保持 `{pre, loop, fallback}` 但 loop 改为数组套数组?** ——**实现前先读渲染调用侧（workbench.mjs/actions.mjs 的 strip 绘制）再定形状**：最小形=loop 仍单组但取「当前活跃 run 的模板」（单活跃 run 场景下正确；多模板并发场景降级 templates[0] 并在注释标明 M8+ 演进）——**若调用侧单组渲染硬编码，取最小形；若易扩，取多组形**。此分叉由执行者按实文裁决并在 commit message 声明。
- 验证范围：`npm test`（logic 段）+ build。**覆盖度声明（评审问题7 附带）**：pipelineStrip 渲染层无单测（沿 M5/M6/T8 先例）——纯函数由 logic.test 钉、渲染面由 build 指纹兜底。

- [ ] Step 1: 读实文定形状 → 失败测试（devflow run 在途 → loop 渲染 devflow 节点序列）。
- [ ] Step 2: 实现。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 8: sweeper 计数 logger（§16-13a）

- 目标：host sweeper 记录 removed/skipped 计数。
- 涉及文件：Modify `src/host.mjs`
- 接口契约：`.then((out) => { (ctx.logger ?? console).info?.(`[dsh-l] sweep done: removed=${out.removed.length} skipped=${out.skipped?.length ?? 0}`); })` 形态（与 .catch 并存）。

- [ ] Step 1: 实现（1 行；绿基线——红证可省：host.mjs 无单测，覆盖度声明沿 M5/M6 先例）。
- [ ] Step 2: Run: `npm run build` + 全绿 → checkpoint commit。

### Task 9: 最终验证与收口

- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -12`
  Expected: 双包成功（新指纹 ≠ 6b4871fc64dc）；全量绿（183 存量 + 新增 ≥6；测试文件 20 不变）；提交序列 T1–T8；version 0.1.0 不变；**lib/* 出现工作树变更属预期（评审问题1 修正：本步不判干净——lib 是 git 跟踪文件，build 必然重写）**。
- [ ] Step 2: lib 重建产物入库（独立 build commit）→ 复跑 `git status --short` 判**工作树干净**。
- [ ] Step 3: 停下交产出评审（章程同 M1–M6）。publish 维持挂起（auth 阻塞，§18.8）。

## 执行纪律

- 开始实现前批判性复查整份计划；缺项/矛盾先修计划。
- 按编号执行；每任务红绿（或绿基线+变异红证）独立验证。
- 先红后绿再 commit；测试桩全注入；禁 jsdom。
- 回应前 grep 实文验证；遇阻即停不猜。
- 全部任务完成后运行最终验证并输出修改摘要，然后停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -12`
- Expected: 新指纹 ≠ 6b4871fc64dc；183 存量 + 新增 ≥6 全绿；测试文件 20；version 0.1.0 不变；工作树干净。
- 生效探针：构建指纹变化；host-smoke ③ rolePrompt 锚（变异红证已验）；stripCells 多模板钉例。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。publish 维持挂起（auth 阻塞，§18.8）。
