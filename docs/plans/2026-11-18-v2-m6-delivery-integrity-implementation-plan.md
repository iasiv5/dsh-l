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
- 不动：handlers.mjs（v2 接线不受影响——firstAgent 仍 build/design）、scheduler.mjs、client/*（i18n 无新键——节点名走模板数据非词典）。

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
- [ ] Step 4: checkpoint commit。

### Task 2: 内置模板三件套 golden

- 目标：LOOP_V1 / DEVFLOW_LITE 插入 mr-open/mr-push-check/mr-open-check + rework 边 + deliverEvidence + deliver 收窄。
- 涉及文件：Modify `src/workflows/builtin.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Produces: 两模板节点序列（loop-v1：g1,build,verify,g2,**mr-open,mr-push-check,mr-open-check**,deliver；devflow：…,test,g2,**三件**,deliver）；mr-open={type:agent,roleId:"mr-opener",executionPolicy:"auto",maxAttempts:2}；mr-push-check={type:script,maxReworks:2,script:三查 shell}；mr-open-check={type:script,maxReworks:2,script:gh pr view 校验}；deliver.script 收窄为 `gh pr view --json url,title,state --jq '"\\(.url) \\(.title) [\\(.state)]"'`；edges 增 g2→mr-open→mr-push-check→mr-open-check→deliver（success）+ 三 rework 边（mr-open/mr-push-check/mr-open-check → build|implement, kind:"rework"）；`deliverEvidence: "deliver"` 字段；revision 重算
- 验证范围：`npm test`（workflows golden + validate 通过——F3 success 链无环、rework 不参与环检测）

- [ ] Step 1: 失败测试：workflows.test 两 golden 用例改锁新形状（节点 id 序列/边三元组/mr-open roleId/检查节点 maxReworks/deliverEvidence 字段）。
- [ ] Step 2: 实现 builtin.mjs（三查 shell：`[ -z "$(git status --porcelain)" ] || { echo "存在未提交改动"; exit 1; }; [ "$(git rev-list --count HEAD --not --remotes)" = "0" ] || { echo "存在未推送提交"; exit 1; }`；mr-open-check：`url=$(gh pr view --json url -q .url 2>/dev/null) && state=$(gh pr view --json state -q .state) && [ "$state" = "OPEN" ] && echo "$url"`）。
- [ ] Step 3: Run: 全绿（engine 全链测试会因新节点红——engine.test 夹具在 T3 扩步进；本步允许 engine 段红，T3 后统一验绿）。
- [ ] Step 4: checkpoint commit（与 T1 若分段则顺序提交）。

### Task 3: 引擎 deliver.mr 落痕 + 全链钉例扩步

- 目标：onNodeDone 对 deliverEvidence 命中节点成功落 run history；engine 全链钉例扩三节点步进；rework 反馈钉例。
- 涉及文件：Modify `src/engine/engine.mjs`；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: executor runScriptNode 成功 result.artifacts[0]=tail(stdout)
  - Produces: onNodeDone 成功分支：`if (run.snapshot?.deliverEvidence === nodeId && result.ok) store.appendRunHistory(runId, "deliver.mr", String(result.artifacts?.[0] ?? "").trim().split("\\n").pop() ?? "")`；全链钉例步进序列增 mr-open(resolve ok)/mr-push-check(ok)/mr-open-check(ok)→deliver；新钉例：mr-push-check 失败一次（error 文本）→ build 重臂 running（upstream 反馈可见）
- 验证范围：`npm test`（engine 段全绿——T1/T2/T3 合并验绿点）

- [ ] Step 1: 失败测试：deliver.mr 落痕断言（全链跑完后 run.history 含 deliver.mr 且 value 含 url）+ rework 反馈钉例。
- [ ] Step 2: 实现引擎落痕一行 + 夹具扩步。
- [ ] Step 3: Run: `set -o pipefail; npm test 2>&1 | tail -3` — **全绿（T1+T2+T3 统一验绿点）**。
- [ ] Step 4: checkpoint commit。

### Task 4: sweep 脏检查（async 化）

- 目标：rmSync 前本地双查；fail-closed 跳过；skipped[] 返回；host 补 .catch。
- 涉及文件：Modify `src/engine/workspace.mjs`、`src/host.mjs`；Test `test/workspace.test.mjs`
- 接口契约：
  - Consumes: makeWorkspace 构造参 execFile（已注入）
  - Produces: `async sweep({activeKeys, retentionDays, now})` → `{removed, skipped}`；逐目录：`git -C <dir> status --porcelain`（stdout 非空→跳）+ `git -C <dir> rev-list --count HEAD --not --remotes`（stdout.trim() !== "0"→跳）；任一 execFile reject → 跳过（fail-closed）；host :152 改 `runtime.workspace.sweep({...}).catch((e)=>…)`（try/catch 保留同步面）
- 验证范围：`npm test`（workspace 段）

- [ ] Step 1: 失败测试（三态+计数）：净目录（两查干净）→ 删除入 removed；脏目录（porcelain 非空）→ skipped；命令失败（execFile reject）→ skipped；既有「非活跃超期清除/活跃保留」用例改 await。
- Run: 红。
- [ ] Step 2: 实现 sweep async 化 + host .catch。
- [ ] Step 3: Run: 全绿 → checkpoint commit。

### Task 5: 脱密守护（executor env 白名单）

- 目标：固化 script env 卫生——注入 env 键集不含敏感后缀键（上游 v0.4.0 泄密同型防线）。
- 涉及文件：Test `test/executor.test.mjs`
- 接口契约：makeExecutor({spawn: 捕获 env 的 fake}) → runScriptNode 成功 → 断言捕获 env 的键集 ∩ /(_TOKEN|_KEY|_SECRET|_PASSWORD)$/ 后缀键 = 空。
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
