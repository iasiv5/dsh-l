# dsh-l v2 M6（交付完整性：MR 闭环三件套 + 回收防丢）实施计划

## 目标

- MR 闭环三件套（Q3-B）：两内置模板插入 mr-open(agent) / mr-push-check(script) / mr-open-check(script)，deliver 收窄为交付汇总——run 不再可能「成功而变更未提交/未推送/无 MR」。
- commit 责任归角色（Q2-A）：loop-builder / devflow-developer prompt 增 commit 约束（golden 逐字锁原子同步）。
- MR 落痕（Q5-A）：模板字段 deliverEvidence + 引擎 onNodeDone 落 deliver.mr 事件（G3 证据源）。
- sweep 脏检查（Q6-A）：rmSync 前本地双查（未提交/未推送），fail-closed 跳过 + skipped[] 留痕；sweep async 化。
- 脱密守护（上游吸收项折叠——非 §16 编号项）：executor script env 白名单测试。
- 不含：发版 publish（Q7-A 属产出评审通过后动作）；G1/G2/G3 闸门语义（不变式）；新节点类型（全部用既有 agent/script 表达）。

## 架构快照

- 模板形状（两内置同构）：`g1 → build → verify → g2 → mr-open(agent) → mr-push-check → mr-open-check → deliver`（devflow：requirement → design → implement → review → test → g2 → 同尾三件）；rework 边：verify→build（既有）+ mr-open/mr-push-check/mr-open-check → build/implement（新增，检查节点 maxReworks:2）。
- mr-opener 新内置角色（auto）：推送/幂等建 MR/mr-body.md 落痕/禁合并禁主分支禁强推/失败明报。
- 信任模型（上游等价）：agent 可谎报 → 两个 script 检查节点由引擎执行 exit 码定真相；检查失败 rework 回实现节点带错误文本反馈，封顶后 run failed → held → 人。
- 落痕链：deliver（交付汇总）stdout 末行 = MR 行 → run.snapshot.deliverEvidence 命中 → appendRunHistory("deliver.mr")。
- sweep：execFile 注入式 `git status --porcelain` + `git rev-list --count HEAD --not --remotes`；任一非空或命令异常 → 跳过；返回 { removed, skipped }。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json（**version 已 0.1.0 不再动**——publish 属验收后动作）。
- 测试桩纪律：fetch/execFile/spawn/io/world 全注入；单测不真实出网/spawn/clone（sweep 脏检查的 git 查询走 execFile 注入桩）；禁 jsdom。
- 闸门不变式（§17.8）：G1/G2/G3 人工放行语义零变化；MR 环节全部在 G2 后、G3 前。
- roles golden 逐字锁（M5 T5）：builtin.mjs build.prefix 与 roles.mjs loop-builder prompt **必须同一 commit 内同步改**。
- 先红后绿再 commit（硬纪律）；docs 独立 commit；回应前 grep 实文验证。
- 命令环境：Linux bash，`/home/ubuntu/workspace/dsh-l`；管道验证 `set -o pipefail`。

## 输入工件

- 设计：docs/design-v2.md §17（M6 补钉全条）；上游参照 /home/ubuntu/workspace/.dsh-research/loopforge（v0.4.0，migrations/033 MR 节点 prompt/验证脚本原文——dsh-l 单仓库 gh 单平台精简）。
- 参照实现：src/workflows/builtin.mjs（模板范式）、roles.mjs（角色范式+逐字锁）、src/engine/executor.mjs（runScriptNode 成功路径 artifacts[0]=tail(stdout) 已捕获）、engine.mjs onNodeDone（落痕挂点）、workspace.mjs sweep（:41-52 mtime 口径）、host.mjs :149-153（sweeper try/catch——async 化需补 .catch）、validate.mjs（F2 闸门 rejectTarget/F3 success 环检测——rework 边不参与环检测）。

## 文件结构与职责

- Modify: `src/workflows/roles.mjs` — 新增 mr-opener 角色；loop-builder / devflow-developer prompt 增 commit 约束
- Modify: `src/workflows/builtin.mjs` — LOOP_V1 / DEVFLOW_LITE 增三节点 + rework 边 + deliverEvidence 字段 + deliver script 收窄 + build.prefix 同步 commit 约束 + revision 重算
- Modify: `src/engine/engine.mjs` — onNodeDone 增 deliverEvidence 落痕（deliver.mr 事件）
- Modify: `src/engine/workspace.mjs` — sweep async 化 + 脏检查（execFile 注入）+ skipped[] 返回
- Modify: `src/host.mjs` — sweeper 调用补 async .catch
- Test: roles.test（mr-opener golden + 逐字锁迁移）/ workflows.test（两模板 golden 重锁 + loader defs 含新节点）/ engine.test（deliver.mr 落痕 + 全链钉例扩三节点 + rework 反馈）/ workspace.test（sweep 脏检查三态：净/脏/命令失败）/ executor.test（脱密守护）
- Modify: `src/engine/scheduler.mjs` — applyFailure rework 分支增后代失效（评审 R3）
- 不动：handlers.mjs（v2 接线不受影响——firstAgent 仍 build/design）、client/*（i18n 无新键——节点名走模板数据非词典）。

任务依赖：T1（角色）→ T2（模板 golden）→ T3（落痕）→ T4（sweep）→ T5（脱密）→ T6（终验）。按编号执行。

## 任务清单

### Task 1: 内置角色——mr-opener + commit 约束

- 目标：mr-opener 新角色（auto，推送/幂等 MR/mr-body.md/禁合并禁主分支/失败明报）；loop-builder 与 devflow-developer prompt 增 commit 约束；builtin build.prefix 原子同步。
- 涉及文件：Modify `src/workflows/roles.mjs`、`src/workflows/builtin.mjs`（仅 build.prefix 行）；Test `test/roles.test.mjs`
- 接口契约：
  - Produces: BUILTIN_ROLES 增 `mr-opener`（{id,name,description,executionPolicy:"auto",builtin:true,prompt}，prompt 中文自写：推送当前工作分支→`gh pr create/view` 幂等复用→mr-body.md 记链接/分支/SHA→禁合并/禁主分支/禁强推→失败明报不谎报）；loop-builder.prompt 末尾增「完成后把本轮改动 commit 到当前分支（不推送、不碰主分支）。」；devflow-developer 同款；builtin.mjs build.prefix 与 loop-builder.prompt **逐字相等**（逐字锁维持）
- 验证范围：`npm test`（roles 段）

- [ ] Step 1: 失败测试：roles.test 增 mr-opener golden（字段完整 + prompt 含「不得合并」「gh pr」关键词）+ 逐字锁断言更新（新 prompt 文本两侧相等）。
- Run: 红。
- [ ] Step 2: 实现 roles.mjs + builtin.mjs prefix 同步。
- [ ] Step 3: Run: `set -o pipefail; npm test 2>&1 | tail -3` — 全绿（workflows golden 因 revision/prefix 变化会红——T2 一并处理，本步允许 workflows 段红、其余全绿，或 T1/T2 合并执行后统一验绿）。
- [ ] Step 4: checkpoint commit（**于 T1–T3 共享验绿点达成后执行**——评审 R9：与「先红后绿再 commit」硬纪律对齐）。

### Task 2: 内置模板三件套 golden

- 目标：LOOP_V1 / DEVFLOW_LITE 插入 mr-open/mr-push-check/mr-open-check + rework 边 + deliverEvidence + deliver 收窄。
- 涉及文件：Modify `src/workflows/builtin.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Produces: 两模板节点序列（loop-v1：g1,build,verify,g2,**mr-open,mr-push-check,mr-open-check**,deliver；devflow：…,test,g2,**三件**,deliver）；mr-open={type:agent,roleId:"mr-opener",executionPolicy:"auto",maxAttempts:2,**maxReworks:2（评审 R2：applyFailure exhausted=无出边||reworkCount>(maxReworks??0)——缺此字段首败即 run failed，rework 边死）**}；mr-push-check={type:script,maxReworks:2,script:**三查** shell（评审 R5：第三查=当前分支非空且 ≠ 默认分支，参照值由 T4 工作分支策略供给）}；mr-open-check={type:script,maxReworks:2,script:gh pr view 校验（评审 R6：增第四验 head=本地 HEAD——headRefOid 与 git rev-parse HEAD 比对，防旧 MR/旧 head 假绿）}；deliver.script 收窄——**契约锁 runtime 字符串值（评审 R4：golden 断言锁值，源码转义是实现细节但须自证）**： `gh pr view --json url,title,state --jq '"\\(.url) \\(.title) [\\(.state)]"'`；edges 增 g2→mr-open→mr-push-check→mr-open-check→deliver（success）+ 三 rework 边（mr-open/mr-push-check/mr-open-check → build|implement, kind:"rework"）；`deliverEvidence: "deliver"` 字段；revision 重算。deliver script 的 runtime 值（单反斜杠）＝ `gh pr view --json url,title,state --jq '<jq 程序>'`，其中 jq 程序 runtime 值为：双引号内 `\(` 插值形——**builtin.mjs 的 JS 字符串字面量中每个 \ 须双写为 \\**（评审 R4 探针 P3：源码四反斜杠→jq 收字面不插值；源码正确形即双反斜杠）；T2 golden 直接 deepEqual 断言 script 字符串值，字节级锁死
- 验证范围：`npm test`（workflows golden + validate 通过——F3 success 链无环、rework 不参与环检测）

- [ ] Step 1: 失败测试：workflows.test 两 golden 用例改锁新形状（节点 id 序列/边三元组/mr-open roleId/检查节点 maxReworks/deliverEvidence 字段）。
- [ ] Step 2: 实现 builtin.mjs。三段 script（**runtime 值**；JS 字面量中 \ 双写）：
  - mr-push-check：`[ -z "$(git status --porcelain)" ] || { echo "存在未提交改动"; exit 1; }; [ "$(git rev-list --count HEAD --not --remotes)" = "0" ] || { echo "存在未推送提交"; exit 1; }; branch=$(git branch --show-current); [ -n "$branch" ] || { echo "分离 HEAD，不在工作分支"; exit 1; }; def=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); [ "${def:-main}" != "$branch" ] || { echo "当前在默认分支 $branch，不在本轮工作分支"; exit 1; }`（评审 R5 第三查）
  - mr-open-check：`url=$(gh pr view --json url -q .url 2>/dev/null) && state=$(gh pr view --json state -q .state) && [ "$state" = "OPEN" ] && head=$(gh pr view --json headRefOid -q .headRefOid) && [ "$head" = "$(git rev-parse HEAD)" ] && echo "$url"`（评审 R6 head=tip）
  - deliver（评审 R11 修正——jq 插值必须发生在 jq 字符串内，顶层 \( 非法、\[ 非法转义）：runtime 值 = `gh pr view --json url,title,state --jq '"\(.url) \(.title) [\(.state)]"'`（shell 单引号内含 jq 双引号；方括号在 jq 字符串内无特殊义不转义）；golden deepEqual 锁值；**实现后须以 node -e 打印 script 值 + jq 实跑探针双证**（评审教的方法，防转义层再翻车）。
- [ ] Step 3: Run: 全绿（engine 全链测试会因新节点红——engine.test 夹具在 T3 扩步进；本步允许 engine 段红，T3 后统一验绿）。
- [ ] Step 4: checkpoint commit（**于 T1–T3 共享验绿点达成后执行**——评审 R9）。

### Task 3: 引擎落痕 + rework 后代失效 + 全链恢复钉例

- 目标：deliver.mr 落痕；**applyFailure rework 分支增后代失效（评审 R3）**；upstreamOf 反馈通道保真；全链恢复钉例。
- 涉及文件：Modify `src/engine/engine.mjs`、**`src/engine/scheduler.mjs`（评审 R3：文件清单自「不动」移入）**；Test `test/engine.test.mjs`、`test/scheduler.test.mjs`
- 接口契约：
  - Consumes: executor 成功 result.artifacts[0]=tail(stdout)；scheduler 已导出 descendantsOf；驳回路径先例（applyGateDecision：target ready + 后代非 pending → skipped 待重跑）
  - Produces:
    ① 落痕：onNodeDone 成功分支——`if (run.snapshot?.deliverEvidence === nodeId && result.ok) store.appendRunHistory(runId, "deliver.mr", String(result.artifacts?.[0] ?? "").trim().split("\n").pop())`（评审 R4/R10：`\n` 为 JS 源码单反斜杠形=切真换行；pop() 无 `?? ""` 死代码）；
    ② scheduler（评审 R3）：applyFailure 的 rework 分支（未耗尽时）对齐驳回语义——对每条 rework 边：target → ready，且 descendantsOf(target) 中非 pending 者 → skipped（error 字段经 spread 保留；advanceRun 既有 skipped 重激活机制令其在 target 重跑成功后逐个重走）。向后兼容：loop-v1 verify→build 与 devflow review→implement 场景下中间节点本就 pending/未达，行为不变；
    ③ engine（评审 R3 连带）：upstreamOf 改 error 优先、状态无关——`const text = s.error ?? s.artifacts?.[0] ?? ""`（原实现仅 failed 态读 error；skipped 化的检查节点反馈文本会静默丢失，断裂「带反馈重试」语义）；
    ④ 钉例四枚：(a) mr-push-check 失败 → run 未 failed + build=running + verify/g2/mr-open（及下游）=skipped；(b) 全链恢复——build 重跑成功 → skipped 依次重激活 → verify 重走 → **g2=waiting（人工重放行——新交付物重新拍板，语义明示）** → mr-open 重推 → checks 过 → deliver → run succeeded + deliver.mr 落痕；(c) mr-open 失败（R2 钉例）→ rework 回 build 非 run failed；(d) rework 反馈文本进 build prompt（dispatch 时 executor 收到含 check error 的 upstream）。
- 验证范围：`npm test`（engine+scheduler 段全绿——T1/T2/T3 合并验绿点；既有 scheduler 用例若断言旧 stale 语义须同步改判并注明依据）

- [ ] Step 1: 失败测试：钉例 (a)–(d) + 落痕断言。
- [ ] Step 2: 实现 ①②③ + 夹具扩步。
- [ ] Step 3: Run: `set -o pipefail; npm test 2>&1 | tail -3` — **全绿（T1+T2+T3 统一验绿点）**。
- [ ] Step 4: checkpoint commit（共享验绿点达成后）。

### Task 4: workspace 工作分支 + sweep 脏检查（async 化）

- 目标：**工作分支落地（评审 R7——「工作分支」全仓无定义，三处语义悬空）**：ensure 后置 checkout；rmSync 前双查；skipped[]；host 补 .catch。
- 涉及文件：Modify `src/engine/workspace.mjs`、`src/host.mjs`、`src/engine/engine.mjs`（ensure 调用点传 branch）；Test `test/workspace.test.mjs`
- 接口契约：
  - Consumes: makeWorkspace 构造参 execFile（已注入）；engine.startRun 的 rid
  - Produces:
    ① **工作分支（评审 R7，引擎侧方案——与评审建议的 role 侧偏离，理由附后）**：`ensure({key, repo, branch})` 两条路径都落分支（评审 R12 方案 i）——clone 成功后 `git -C <dir> checkout -b <branch>`；**目录复用路径**执行 `git -C <dir> checkout <branch> || git -C <dir> checkout -b <branch>`（跨 run 复用目录时新 rid 从当前 HEAD 起枝，runId↔分支溯源不断裂；同分支已存在则纯 checkout 幂等）；engine.startRun 调用改 `workspace.ensure({ key, repo, branch: "dsh-l/" + rid })`——分支名确定性，「工作区永不落默认分支」由引擎保证而非角色自觉；mr-opener 角色无需建分支逻辑（推送当前分支即可），mr-push-check 第三查（T2）与本策略闭合；
    ② sweep：`async sweep({activeKeys, retentionDays, now})` → `{removed, skipped}`；逐目录：`git -C <dir> status --porcelain`（stdout 非空→跳）+ `git -C <dir> rev-list --count HEAD --not --remotes`（stdout.trim() !== "0"→跳）；任一 execFile reject → 跳过（fail-closed）；host :152 改 `runtime.workspace.sweep({...}).catch((e)=>…)`（try/catch 保留同步面）
  - 偏离说明（供评审复核）：评审建议 mr-opener 角色侧建分支（若在默认分支则 dsh-l/<runId>）——但 build/implement **先于** mr-open 提交，role 侧建分支时提交已落在默认分支上；引擎侧 ensure 后置 checkout 使首个 commit 即落工作分支，不变式由构造保证。若评审坚持 role 侧，此分歧列「待主人决策」。
- 验证范围：`npm test`（workspace 段）

- [ ] Step 1: 失败测试：ensure 传 branch → clone 后收到 checkout -b 调用（execFile 桩断言参数）；**目录已存在（复用路径，评审 R12-i）→ 收到 checkout <branch>（已存在分支）或 checkout -b <branch>（新 rid 起枝）**；sweep 三态（净→removed；脏→skipped；命令失败→skipped）+ 既有用例改 await。
- Run: 红。
- [ ] Step 2: 实现 ensure 分支 + sweep async 化 + host .catch + engine 调用点。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 5: 脱密守护（executor env 白名单）

- 目标：固化 script env 卫生——注入 env 键集不含敏感后缀键（上游 v0.4.0 泄密同型防线）。
- 涉及文件：Test `test/executor.test.mjs`
- 接口契约（评审 R8 修正断言②——钉 executor 注入面而非机器巧合）：makeExecutor({spawn: 捕获 env 的 fake}) → runScriptNode → 断言 **捕获 env 键集 − 测试启动前 process.env 键集 ⊆ {PATH, GIT_TERMINAL_PROMPT}**，且该差集无 /(_TOKEN|_KEY|_SECRET|_PASSWORD)$/ 后缀键——executor 只新增两键的注入面契约（原稿断言 {...process.env} 全集，在带 GH_TOKEN 的机器/CI 上必红且无源码可修）。
- 验证范围：`npm test`（executor 段）

- [ ] Step 1: 失败测试（绿基线：现状应绿；红证=一次性变异——fake env 加 _TOKEN 键→红→还原）。
- [ ] Step 2: 确认两向有效 → checkpoint commit。

### Task 6: 最终验证与收口

- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -8`
  Expected: 双包成功；**新指纹 ≠ a7a9beac4fb7**（评审 R1 修正：基线重建实测值——0442c1d 改 src 未重建 lib，原稿「≠ d6eeeb5e45ac」在基线即满足属永真判据）；全量绿（175 存量 + 新增 ≥7；测试文件 20 不变）；提交序列 T1–T5。
- [ ] Step 2: lib 重建产物入库（独立 build commit）——**顺带补齐 0442c1d 的 lib 滞后**（评审 R1 计划外发现：v2 接线改 src 未重建 lib，已提交产物落后一个 commit；本步重建后产物同步恢复）。
- [ ] Step 3: 停下交产出评审（章程同 M1–M5）。评审通过后按 §17.7 执行 publish 0.1.0（验收后动作）。

## 执行纪律

- 开始实现前批判性复查整份计划；缺项/矛盾/无效判据先修计划。
- 按编号执行；**T1–T3 共享验绿点**（golden 逐字锁与模板 revision 联动，允许分段提交但统一在全绿后）。
- 先红后绿再 commit；绿基线任务红证=一次性变异（不保留）。
- 测试桩全注入；sweep 脏检查不真实出网。
- 回应前 grep 实文验证；遇阻即停不猜。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -6 && git log --oneline -8`
- Expected: 新指纹 ≠ a7a9beac4fb7（R1 修正基线值；src 变更必动指纹——buildId 只哈希 src/ 树）；175 存量 + 新增 ≥7 全绿；测试文件 20；version 0.1.0 不变；工作树干净。
- 生效探针：构建指纹变化；全链钉例含三件套步进与 deliver.mr 落痕；sweep skipped 三态（装机可选）。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。publish 0.1.0 在产出评审通过后执行（§17.7）。
