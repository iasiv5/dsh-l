# 收敛里程碑 1「止血与可见」实施计划

## 目标

落地 `docs/design-v2.md` §20 的六个条目：

- **P0（第 17 条③、第 35 条）**：取消 mr-opener 写 `mr-body.md` 的要求；脚本节点的失败记录并入 stdout；run 历史补记闸门、节点、回炉与终态。
- **第 14 条**：在 dsh-l 执行目录里干活的会话归入宿主工作区「DSH Loop Forge」；在本地检出里开的会话挂到该目录已登记的工作区。
- **第 15 条**：dsh-l 创建的会话在创建时设标题。
- **第 16 条**：分诊会话用完归档。
- **第 23 条的行内部分**：候选行能打开该候选的全部引擎会话。

不在本计划：§20 其余条目（里程碑 2 入口收敛、里程碑 3 界面收敛）；第 14 条里「未登记则如实提示『会出现在未分组』」的提示（选择器文案由 §20 第 28 条即里程碑 2 承载，本计划只做挂接行为）；`getWorkSessions` 与「会话」页不动；`src/workflows/builtin.mjs`、`src/engine/scheduler.mjs` 的状态函数、登录门禁、分诊提示词不动。

## 架构快照

1. **会话根目录**：`sessionRoot = <数据目录>/workspaces`，在 `src/host.mjs` 的 `buildRuntime` 开头 `mkdirSync(…, { recursive: true, mode: 0o700 })`。引擎节点、托管开工、分诊三类会话的会话头目录（`meta.cwd`）统一取它；工具目录仍是各自的执行目录（`workingDirectory.set` 二跳不变）。副作用两点：沙箱可写根（＝会话头目录）发生变化——引擎与分诊会话从 `<数据目录>` 收窄到 `sessionRoot`（不再覆盖 `store.json`、`bin/`、`tmp/`），托管开工会话从它自己的克隆目录放宽到 `sessionRoot`（即全部克隆目录）；新建的宿主工作区会排在宿主侧栏工作区列表最前。存量会话的会话头目录不可改，仍在「未分组」，不迁移。
2. **宿主可选服务**：只经 `ctx.get(name)` 取，服务缺席或方法不是函数时跳过（先例 `dsh-schedule/src/runtime.ts:482-502`，rc.5 源码实证）。用到 `workspaceRegistry` 的 `create(path, title)`（同路径幂等）、`resolveByPath(path)` → `attachSession(id)`、`archiveSession(id, { stopActivity: true })`，以及 `sessionTitle` 的 `get(session)`、`rename(session, title)`。`src/host.mjs` 出五个模块级 helper：`getRegistry(ctx)`、`attachToLoopWorkspace(ctx, sessionId, sessionRoot)`、`joinWorkspace(ctx, sessionId, cwd)`、`nameSession(ctx, agent, title)`、`archiveSession(ctx, sessionId)`。任何失败只 `ctx.logger.warn`，不阻断开工或执行。
3. **world 钩子**（调用方一律可选链）：
   - 执行 world（`makeExecWorld`）：`attach(sessionId)`、`setTitle(agent, title)`。
   - 分诊 world（`makeTriage`）：`attach(sessionId)`、`setTitle(agent, title)`、`archiveSession(sessionId)`。
   - 开工 world（`composeWorkWorld`）：services 增 `attachHost(sessionId, cwd)` 与 `setTitle(agent, title)`；`createAgent` 增可选参 `headerCwd`（会话头目录），缺省等于 `cwd`。
4. **标题格式**（创建后、首次 send 前设定；仅当会话尚无标题）：
   - 引擎节点：`<仓库名>#<号> · <节点名> <圈号>`，例 `dsh-m#80 · build ②`。仓库名取候选键 `owner/repo#issue|pull#号` 的 repo 段；圈号为 ①–⑩，attempt 超过 10 写 `#11`，小于 1 按 1。
   - 分诊：zh `分诊 · <n> 条`，en `Triage · <n>`（跟随批次 `lang`）。
   - 开工会话：`<仓库名>#<号> <issue|PR> · <标题>`。类型词 `issue|PR` 沿用既有开工锚行的约定（同仓 issue / PR 同号消歧；出处 `docs/plans/2026-11-21-work-session-implementation-plan.md` 架构快照「kickoff 首条消息」与 `docs/design.md` §4a；`sessionsView.mjs` 的 `parseWorkAnchor` 依赖它）——§20 第 15 条的写法是示意。截断沿用锚行规则：前缀加标题超过 72 字符时截断标题并加 `…`。
5. **失败记录**：脚本节点非零退出时 `error = "exit <code>: " + stderr 尾部 2048 + stdout 尾部 2048`（空段省略）。回炉反馈取前 500 字符，stderr 在前。
6. **run 历史**：新增事件 `run.started`、`gate.arrive`、`gate.pass`、`gate.reject`、`node.start`、`node.done`、`node.rework`、`run.terminal`（落点与明细见 Task 3；G1 驳回经 `applyGateDecision` 取消 run 的路径同样落 `run.terminal`）。`RUN_HISTORY_LIMIT = 100` FIFO 不变。
7. **run 会话登记**：`store.appendRunSession(runId, nodeId, sessionId)` 追加 `run.sessionLog[] = { nodeId, sessionId, at }`；`summarizeRun` 增 `sessions[] = { nodeId, nodeName, sessionId, at }`（最近在前；`at` 取自 `sessionLog`，回退条目为 `null`）。没有 `sessionLog` 的旧 run 回退到各节点 `nodeStates[*].sessionId`。
8. **行内会话入口**：候选展开区的 run 行，按候选汇总它的全部 run（run 号新到旧），每个会话一个按钮「打开 · <节点名>」，同一会话只列一次，点击走既有 `openWorkSession`。

## 全局约束（逐字继承）

- 零运行时 dependencies（devDeps 仅 esbuild）；host Node ≥24 ESM（.mjs）；client 原生 DOM + Shadow DOM 零框架。
- 仓约：UI 改动先 `npm run build` 再全量 `npm test`；提交前显式退出码双 0；`lib/client.js` + `lib/host.js` 随源码同 commit 入库；pre-commit 钩子跑全量测试。
- 开工会话三红线：①`meta.cwd` 与 `workingDirectory.set` 成对设置且 send 晚于二者（本计划后 `meta.cwd` 可为 `headerCwd`，缺省二者相同）；②已登记会话零 dispose，`src/worksession.mjs` 中 `.dispose(` 恰出现 1 次且位于 rollback-only 分支；③审批策略未显式配置零 `setPolicy`。
- 双语：全部 UI 文案走 `zh-CN` / `en` 双字典（`test/i18n.test.mjs` + `test/locale-parity.test.mjs` 守护）；组件内静态字面量键。本计划不新增 i18n 键；会话标题是数据串，不入字典。
- DESIGN.md：Host-Theme（禁硬编码浅色底）、One Voice（一屏一个反色主 CTA）、不声明 font-family（mono 除外）、状态语义复用 `st-*` 六态 token、reduced-motion 成对降级。
- 宿主服务只经 `ctx.get()` 可选获取（兼容 `engines.dsh >=0.2.2-rc.1`；rc.5 实证在场）。
- impeccable（Operate 模式，既有「瓷面工作台」世界内的窄改动）：动 UI 前读 `/home/ubuntu/.dsh/profiles/web/node_modules/@iasiv5/dsh-skills/skills/impeccable/reference/craft-floor.md`；交互组件六态齐全（default / hover / focus / active / disabled / loading）；不用浮层（行内按钮，无 overflow 裁切面）；UI 改动后在仓根做逐文件 detector 集合比对（命令见第二部分「最终验证（两部分合并）」）：对每个改动的 UI 源文件与 `lib/client.js`，取基线版与当前版的条目，去行号后（`antipattern|snippet`）当前版的集合不得出现基线版没有的条目。`workbench.mjs`（基线 11 条）与 `lib/client.js`（基线 12 条）本就有既有 advisory，所以不要求输出 `[]`；只比条数也不够——会掩盖一减一加的换血（执行期勘正 2026-11-24，评审实施 I2）；不重写 DESIGN.md。
- 测试判据：`node --test` 的选项必须写在文件参数前；判据看「精确用例名 + `ℹ tests/pass/fail` 计数」，计数不符即停；字符串核对用 `grep -F`；管道一律 `set -o pipefail`；红灯必须落在目标断言行。
- 仓库在 `main` 直改（历批先例，主人已确认）；docs 类变更独立 commit。
- 实机生效：host 行为变更需重启 DSH 服务；重启只用 `dshm_restart` 且须主人同意，放在本轮最后一个动作，核验放下一轮。
- 无额外全局约束。

## 输入工件

- 设计：`docs/design-v2.md` §20 第 14–17、23、35 条；`docs/adr/0003-split-pr-and-issue-delivery-semantics.md`；设计简报（2026-11-23 `/impeccable shape` 七条，主人已确认）。
- 宿主事实：`@deepseek-ai/dsh-workspace` `lib/types/index.d.ts`（`create` / `resolveByPath` / `attachSession` / `archiveSession`）；`@deepseek-ai/dsh-session-title` `lib/types/index.d.ts:143`（`rename(session: Session, title: string)`）；先例 `dsh-schedule/src/runtime.ts:482-502`。
- 现状锚（路径 + 符号）：`src/host.mjs` 的 `makeTriage`、`makeExecWorld`、`buildRuntime`、`onSessionBound`；`src/engine/executor.mjs` 的 `runAgentNode`、`runScriptNode`；`src/engine/engine.mjs` 的 `startRun`、`dispatch`、`onNodeDone`、`applyGateDecision`、`cancelRun`；`src/engine/scheduler.mjs` 的 `summarizeRun`；`src/store.mjs` 的 `appendRunHistory`；`src/triage.mjs` 的 `runTriage`；`src/worksession.mjs` 的 `composeWorkWorld`、`startWorkSession`；`src/handlers.mjs` 的 `postWorkStart`；`src/client/components/actions.mjs` 的 `rowActions` 内 runRow；`src/client/components/sessionsView.mjs` 的 `parseWorkAnchor`。

## 测试基线（2026-11-23 20:00 实测，日志 `.dsh-research/dsh-l-workstart-review/m1-baseline.txt`）

| 文件 | 基线 | 本计划后 | 增量来源 |
|---|---|---|---|
| roles | 3 | 3 | Task 1 改 1 条断言 |
| executor | 12 | 15 | Task 2、Task 5、Task 6 各 +1 |
| engine | 25 | 28 | Task 3 |
| store | 25 | 26 | Task 4 |
| scheduler | 17 | 18 | Task 4 |
| host-smoke | 5 | 7 | Task 5、Task 7 |
| worksession | 14 | 16 | Task 5、Task 6 |
| triage | 10 | 12 | Task 6、Task 7 |
| handlers | 66 | 67 | Task 5 |
| sessions-view | 2 | 3 | Task 6 |
| client-render | 67 | 68 | Task 8 |
| 其余测试文件 | 不变 | 不变 | — |
| 全量 `npm test` | 367 | 384 | +17 |

逐任务完成后的全量计数：Task 1 → 367；Task 2 → 368；Task 3 → 371；Task 4 → 373；Task 5 → 377；Task 6 → 381；Task 7 → 383；Task 8 → 384。

## 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/workflows/roles.mjs` | 改 | mr-opener 提示词去掉 mr-body.md |
| `src/engine/executor.mjs` | 改 | 失败记录并入 stdout；导出 `nodeSessionTitle`；创建后 `attach`、`setTitle` |
| `src/engine/engine.mjs` | 改 | run 历史事件 |
| `src/store.mjs` | 改 | `appendRunSession` |
| `src/engine/scheduler.mjs` | 改 | `summarizeRun` 增 `sessions` |
| `src/host.mjs` | 改 | `sessionRoot`、五个 helper、world 钩子、`onSessionBound` 登记、`sessionRoot` 透传 handlers、导出 `makeTriage`（Task 7） |
| `src/handlers.mjs` | 改 | `postWorkStart` 托管通道传 `headerCwd` |
| `src/worksession.mjs` | 改 | `createAgent` 增 `headerCwd` 与 `attachHost`；导出 `workSessionTitle`；创建后 `setTitle` |
| `src/triage.mjs` | 改 | 创建后 `setTitle`、`attach`；finally 归档 |
| `src/client/components/actions.mjs` | 改 | run 行会话按钮 |
| `src/client/components/sessionsView.mjs` | 改 | `parseWorkAnchor` 兼容新标题 |
| `test/roles.test.mjs`、`test/executor.test.mjs`、`test/engine.test.mjs`、`test/store.test.mjs`、`test/scheduler.test.mjs`、`test/host-smoke.test.mjs`、`test/worksession.test.mjs`、`test/triage.test.mjs`、`test/handlers.test.mjs`、`test/sessions-view.test.mjs`、`test/client-render.test.mjs` | 改 | 红绿用例 |
| `README.md`、`README.en.md` | 改 | 会话归属与标题说明 |
| `docs/design-v2.md` | 改 | §20 末尾追加 M1 落地注记 |
| `docs/design.md` | 改 | §4a 末尾加一行指向 v2 的注记 |
| `lib/client.js`、`lib/host.js` | 构建 | 随源码同 commit |

一起变化的边界：`src/host.mjs` 的 helper 与三个 world 的钩子必须同一任务内对齐（Task 5 定挂接、Task 6 定标题、Task 7 定归档）；`store.appendRunSession` 与 `summarizeRun.sessions` 必须同一任务（Task 4）。保持稳定的边界：`scheduler.mjs` 的纯函数、`builtin.mjs`、`sessionsView.mjs` 的渲染逻辑、`getWorkSessions`。

冻结面清点（执行时须保持绿；评审 R2-04 已逐条实测，无漏网）：

1. `summarizeRun` 整形状断言全仓 2 处（`test/scheduler.test.mjs` 第 86、93 行）——Task 4 已处理；第 181 行是字段级断言。
2. `parseWorkAnchor` 既有 5 条断言（`test/sessions-view.test.mjs` 第 17–22 行）——新正则对它们全部同值；引擎与分诊标题仍返回 `null`。
3. `mr-opener` 提示词只在 `test/roles.test.mjs` 第 24–31 行被断言；`LOOP_V1.revision` 不含角色。
4. `.dispose(` 源扫描（`test/worksession.test.mjs` 第 264–268 行）——Task 5、6 新增的行不含 `.dispose(`。
5. `test/host-smoke.test.mjs` 既有 5 例不断言 `meta.cwd`（只取 `sessionId.agentOptions`）——改传 `sessionRoot` 不影响。
6. `test/handlers.test.mjs` 第 868–950 行对 `startWork` 参数是字段级断言（`params.key` / `cwd` / `another`）——条件展开 `headerCwd` 不影响。

## 任务清单

判据命令统一写法（下文简称「单文件判据」）：

```bash
set -o pipefail; cd /home/ubuntu/workspace/dsh-l; node --test test/<文件>.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)|^not ok"
```

### Task 0: 基线核对

- Step 1：跑 `set -o pipefail; cd /home/ubuntu/workspace/dsh-l; npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`。
  - Expected：`ℹ tests 367`、`ℹ pass 367`、`ℹ fail 0`。计数不符即停，先对齐基线。
- Step 2：跑 `git status --short`。
  - Expected：只有 ` M GLOSSARY.md`、` M docs/design-v2.md`、`?? docs/adr/0003-split-pr-and-issue-delivery-semantics.md`、`?? docs/plans/2026-11-23-convergence-m1-stop-bleed-visibility-implementation-plan.md`。出现其它改动即停。
- Consumes：无。Produces：可开工的干净基线。

### Task 1: 取消 mr-opener 的 mr-body.md 要求

- Consumes：无。Produces：mr-opener 新提示词；`LOOP_V1.revision` 不变。
- Step 1（红）：`test/roles.test.mjs` 用例「mr-opener 角色 golden（M6 T1/D3）：幂等 MR/禁合并禁主分支/失败明报」里的 `assert.ok(r.prompt.includes("mr-body.md"));` 改为 `assert.equal(r.prompt.includes("mr-body.md"), false, "mr-body.md 要求已取消（design-v2 §20 第 35 条）");`，并在同一用例末尾加 `assert.ok(r.prompt.includes("在最终回复里写明"), "汇报要求改为写在最终回复，不再写文件");`。单文件判据 `roles`。
  - Expected：`ℹ tests 3`、`ℹ pass 2`、`ℹ fail 1`；`not ok` 行对应用例「mr-opener 角色 golden（M6 T1/D3）：幂等 MR/禁合并禁主分支/失败明报」。
- Step 2（绿）：`src/workflows/roles.mjs` 里 `mr-opener` 的 `prompt` 整串替换为下面的文本（原第 3 步「写到 mr-body.md」改为「在最终回复里写明」：B6 只取消写文件，机器证据仍由 deliver 脚本自采，汇报留在会话末条供人读）：

  ```text
  你是交付工程师：人工验收已通过，本节点把工作分支推送到远端并发起 MR/PR，不再修改业务逻辑。1. 推送当前工作分支（git push -u origin 当前分支）；不得合并 MR/PR，不得推送主分支，不得强推。2. 以仓库上下文的目标分支为 base 创建 MR/PR：优先 gh pr create；本轮分支已有指向同一 base 的 MR/PR 时复用更新，不重复创建。3. 在最终回复里写明 MR/PR 链接、源分支、目标分支和提交 SHA。4. 推送或创建失败（缺少凭据、无权限、网络错误等）时不得谎报成功：明确报告失败原因与需要人工处理的事项。
  ```

- Step 3（验）：单文件判据 `roles` → `ℹ tests 3`、`ℹ pass 3`、`ℹ fail 0`。跑 `rg -n -F "mr-body" src` → 无输出（rg 退出码 1 是预期）；再跑 `rg -n -F "mr-body" test` → 恰 1 行输出，且是 `test/roles.test.mjs:30` 的反向断言（断言消息里含该字面量，rg 退出码 0 是预期）。跑 `node -e 'import("./src/workflows/builtin.mjs").then(m=>console.log(m.LOOP_V1.revision))'` → 输出 `e443eb54733d57f62ce7f27b5bc179289d2a0c6f`（与 PR80 run 任务包里的 `templateRevision` 相同，在途 run 不受影响）。全量 `npm test` → 367 / 367 / 0。

### Task 2: 执行器失败记录并入 stdout

- Consumes：无。Produces：失败记录契约（架构快照第 5 条）。
- Step 1（红）：`test/executor.test.mjs` 末尾新增用例：

  ```js
  test("runScriptNode：非零退出的失败记录含 stdout 尾部（检查脚本诊断不再丢失）", async () => {
    let c1 = null;
    const ex = makeExecutor({ spawn: () => { c1 = fakeChild({ code: 1 }); return c1; } });
    const p1 = ex.runScriptNode({ node: { id: "s", script: "check" }, cwd: "/w" }).promise;
    c1.emitOut("存在未提交改动\n"); c1.emitExit(1);
    assert.equal((await p1).error, "exit 1: 存在未提交改动\n");
    let c2 = null;
    const ex2 = makeExecutor({ spawn: () => { c2 = fakeChild({ code: 1 }); return c2; } });
    const p2 = ex2.runScriptNode({ node: { id: "s", script: "check" }, cwd: "/w" }).promise;
    c2.emitErr("E\n"); c2.emitOut("O"); c2.emitExit(1);
    assert.equal((await p2).error, "exit 1: E\nO");
  });
  ```

  单文件判据 `executor`。Expected：`ℹ tests 13`、`ℹ pass 12`、`ℹ fail 1`；红落在第一个 `assert.equal`（现值 `"exit 1: "`）。
- Step 2（绿）：`src/engine/executor.mjs` 的 `runScriptNode` 里 `child.on("close", …)` 的非零分支改为先拼接文本再取尾：

  ```js
  child.on("close", (code) => {
    const outText = Buffer.concat(outBuf).toString();
    const errText = Buffer.concat(errBuf).toString();
    finish(code === 0
      ? { ok: true, error: null, artifacts: [tail(outText), tail(errText)] }
      : { ok: false, error: "exit " + code + ": " + tail(errText) + tail(outText), artifacts: [] });
  });
  ```

- Step 3（验）：单文件判据 `executor` → `ℹ tests 13`、`ℹ pass 13`、`ℹ fail 0`；单文件判据 `engine` → 25 / 25 / 0（回炉反馈用例「M6 钉例(d)」仍绿）。全量 → 368 / 368 / 0。

### Task 3: run.history 补记

- Consumes：`store.appendRunHistory(runId, event, detail)`（既有）。Produces：架构快照第 6 条的事件流。
- Step 1（红）：`test/engine.test.mjs` 新增三个用例（沿用文件内 `setup`、`drain`、`executor.inflight.get(...).resolve(...)` 夹具）：

  ```js
  test("run.history：run.started / node.start / node.done / gate.arrive / gate.pass / run.terminal 落痕（全链）", async () => {
    const { store, engine, executor } = setup();
    const { runId } = engine.startRun("o/r#issue#1", {});
    const ev = (name) => store.getRun(runId).history.filter((h) => h.event === name);
    await drain();
    for (const node of ["build", "verify"]) { executor.inflight.get(runId + ":" + node).resolve({ ok: true, error: null, artifacts: [] }); await drain(); }
    assert.equal(ev("gate.arrive").length, 1); assert.equal(ev("gate.arrive")[0].detail, "g2");
    engine.applyGateDecision(runId, "g2", "pass"); await drain();
    for (const node of ["mr-open", "mr-push-check", "mr-open-check", "deliver"]) { executor.inflight.get(runId + ":" + node).resolve({ ok: true, error: null, artifacts: [] }); await drain(); }
    assert.equal(ev("run.started").length, 1); assert.ok(ev("run.started")[0].detail.startsWith("loop-v1 " + runId));
    assert.equal(ev("node.start").length, 6); assert.equal(ev("node.start")[0].detail, "build attempt=1");
    assert.equal(ev("node.done").length, 6); assert.equal(ev("node.done")[0].detail, "build ok");
    assert.equal(ev("gate.pass")[0].detail, "g2"); assert.equal(ev("node.rework").length, 0);
    assert.equal(ev("run.terminal").length, 1); assert.equal(ev("run.terminal")[0].detail, "succeeded");
  });

  test("run.history：回炉 node.done 带失败文本、node.rework 记回退目标；取消 run.terminal 带原因", async () => {
    const { store, engine, executor } = setup();
    const { runId } = engine.startRun("o/r#issue#1", {});
    const ev = (name) => store.getRun(runId).history.filter((h) => h.event === name);
    await drain();
    executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
    executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "exit 1: 存在未提交改动", artifacts: [] }); await drain();
    assert.equal(ev("node.done").some((h) => h.detail === "verify failed: exit 1: 存在未提交改动"), true);
    assert.equal(ev("node.rework").length, 1); assert.equal(ev("node.rework")[0].detail, "verify -> build");
    assert.equal(ev("node.start").at(-1).detail, "build attempt=2");
    engine.cancelRun(runId, "user");
    assert.equal(ev("run.terminal").length, 1); assert.equal(ev("run.terminal")[0].detail, "cancelled (user)");
  });

  test("run.history：G1 驳回经 applyGateDecision 取消 run → gate.reject 与 run.terminal 落痕", async () => {
    const { store, engine } = setup();
    const { runId } = engine.startRun("o/r#issue#1", {});
    const ev = (name) => store.getRun(runId).history.filter((h) => h.event === name);
    await drain();
    engine.applyGateDecision(runId, "g1", "reject");
    assert.equal(store.getRun(runId).status, "cancelled");
    assert.equal(ev("gate.reject").length, 1); assert.equal(ev("gate.reject")[0].detail, "g1");
    assert.equal(ev("run.terminal").length, 1); assert.equal(ev("run.terminal")[0].detail, "cancelled (g1-rejected)");
  });
  ```

  单文件判据 `engine`。Expected：`ℹ tests 28`、`ℹ pass 25`、`ℹ fail 3`；红分别落在第一个用例的 `gate.arrive` 计数行、第二个用例的 `node.done` 失败文本行、第三个用例的 `gate.reject` 计数行。
- Step 2（绿）：`src/engine/engine.mjs` 按下表加 `store.appendRunHistory`（全部放在对应 `store.saveRun` 之后）：

  | 事件 | 落点 | detail |
  |---|---|---|
  | `run.started` | `startRun`，紧随 `store.createRun` | `tpl.id + " " + rid` |
  | `gate.arrive` | `dispatch` 的 gate 分支，紧随 `store.saveRun` | `nodeId` |
  | `node.start` | `dispatch` 派发非 gate 节点处，紧随 `store.saveRun` | `nodeId + " attempt=" + ns[nodeId].attempt` |
  | `node.done` | `onNodeDone`，紧随首个 `store.saveRun` | `nodeId + " " + (result.ok ? "ok" : "failed: " + String(result.error ?? "").slice(0, 200))` |
  | `node.rework` | `onNodeDone`，当 `!result.ok`、`run.status` 未进终态、且快照里存在以 `nodeId` 为源的 rework 边 | `nodeId + " -> " + targets.join(",")` |
  | `run.terminal` | `onNodeDone` 末尾，当 `run.status` 进入 `succeeded / failed / cancelled` 且不同于入口处的 `run0.status` | `run.status` |
  | `run.terminal` | `cancelRun`，紧随 `store.saveRun(next)` | `"cancelled (" + reason + ")"` |
  | `run.terminal` | `applyGateDecision`，紧随 `store.saveRun(next)`，当 `next.status` 为终态且不同于入口处的 `run.status`（G1 驳回走这里：`scheduler.mjs:61` 直接 `cancelRun`） | `"cancelled (" + next.cancelReason + ")"`，其余写 `next.status` |
  | `run.terminal` | `startRun` 的 clone 失败分支，紧随 `store.appendRunHistory(rid, "workspace.clone-failed", msg)` | `"failed"` |
  | `gate.pass` / `gate.reject` | `applyGateDecision`，紧随 `store.saveRun(next)` | 通过：`nodeId`；驳回有回退目标：`nodeId + " -> " + (overrideTarget ?? 该 gate 节点的 rejectTarget)`；驳回无目标（G1）：只写 `nodeId` |

- Step 3（验）：单文件判据 `engine` → `ℹ tests 28`、`ℹ pass 28`、`ℹ fail 0`；单文件判据 `host-smoke` → 5 / 5 / 0。全量 → 371 / 371 / 0。
- 收口：先 `npm run build`（退出码 0），再做一次 checkpoint commit：`fix(engine): 收敛 M1-P0——取消 mr-body.md 要求、失败记录并入 stdout、run 历史补记`（含 Task 1–3 的源码、测试与重建的 `lib/host.js`——仓约要求 lib 随源码同 commit，`roles.mjs` / `executor.mjs` / `engine.mjs` 都在 `lib/host.js` 打包范围内）。

### Task 4: run 会话登记与摘要

- Consumes：`store.appendRunHistory` 的同款写法。Produces：`store.appendRunSession(runId, nodeId, sessionId)`、`run.sessionLog[]`、`summarizeRun(...).sessions[]`。
- Step 1（红）：
  - `test/store.test.mjs` 新增用例「appendRunSession：sessionLog 追加 { nodeId, sessionId, at } 并持久化」：用文件内 `open()` 建临时 store，候选与 `createRun` 的构造沿用该文件第 222 行用例；对同一 run 调 `appendRunSession` 两次（注入 `now` 固定时间），断言 `getRun(id).sessionLog` deepEqual 两条；用同一 `filePath` 再 `createStore` 读回，断言仍在。
  - `test/scheduler.test.mjs`：整形状断言按旧值清点（`cancelledNodeIds: []` 全仓 grep）只有第 86、93 行两处 `assert.deepEqual(sum, { … })`，各加一键 `sessions: []`；第 181 行是字段级断言 `assert.deepEqual(bare.history, [])`，在其后新增一行 `assert.deepEqual(bare.sessions, [], "无 sessionLog 且无节点会话 → 空数组");`（现值 `undefined`，必红）；并新增用例：

    ```js
    test("summarizeRun：sessions 取 sessionLog 倒序并补节点名；无 sessionLog 回退 nodeStates.sessionId", () => {
      const run = { id: "r1", candidateKey: "k", status: "running", history: [],
        snapshot: { nodes: [{ id: "build", name: "build", type: "agent" }, { id: "mr-open", name: "发起 MR", type: "agent" }] },
        nodeStates: { build: { status: "succeeded", sessionId: "dsh-l:run:r1:build:2" }, "mr-open": { status: "succeeded", sessionId: "dsh-l:run:r1:mr-open:2" } },
        sessionLog: [{ nodeId: "build", sessionId: "dsh-l:run:r1:build:2", at: "t1" }, { nodeId: "mr-open", sessionId: "dsh-l:run:r1:mr-open:2", at: "t2" }] };
      assert.deepEqual(summarizeRun(run).sessions, [{ nodeId: "mr-open", nodeName: "发起 MR", sessionId: "dsh-l:run:r1:mr-open:2", at: "t2" }, { nodeId: "build", nodeName: "build", sessionId: "dsh-l:run:r1:build:2", at: "t1" }]);
      const { sessionLog, ...legacy } = run;
      assert.deepEqual(summarizeRun(legacy).sessions.map((s) => s.sessionId), ["dsh-l:run:r1:mr-open:2", "dsh-l:run:r1:build:2"]);
    });
    ```

  - 单文件判据 `store` → Expected `ℹ tests 26`、`ℹ pass 25`、`ℹ fail 1`（红：`s.appendRunSession is not a function`）。单文件判据 `scheduler` → Expected `ℹ tests 18`、`ℹ pass 14`、`ℹ fail 4`。
- Step 2（绿）：
  - `src/store.mjs` 在 `appendRunHistory` 之后加：

    ```js
    appendRunSession(id, nodeId, sessionId) {
      const run = doc.runs[id];
      if (!run) throw Object.assign(new Error("run not found: " + id), { status: 404 });
      (run.sessionLog ??= []).push({ nodeId, sessionId, at: now().toISOString() });
      persist();
    },
    ```

  - `src/engine/scheduler.mjs` 的 `summarizeRun` 在返回对象里加 `sessions`：

    ```js
    const nameOf = Object.fromEntries((run.snapshot?.nodes ?? []).map((n) => [n.id, n.name]));
    const log = run.sessionLog ?? Object.entries(run.nodeStates ?? {}).filter(([, s]) => s?.sessionId).map(([nodeId, s]) => ({ nodeId, sessionId: s.sessionId }));
    const sessions = log.map((e) => ({ nodeId: e.nodeId, nodeName: nameOf[e.nodeId] ?? e.nodeId, sessionId: e.sessionId, at: e.at ?? null })).reverse();
    ```

  - `src/host.mjs` 的 `onSessionBound` 在 `store.saveRun({ ...cur, nodeStates: ns })` 之后同一 `try` 内加 `store.appendRunSession(run.id, nodeId, sessionId);`。
- Step 3（验）：单文件判据 `store` → 26 / 26 / 0；`scheduler` → 18 / 18 / 0；`handlers` → 66 / 66 / 0；`client-render` → 67 / 67 / 0（run 夹具无 `sessions`，客户端按空数组处理）。全量 → 373 / 373 / 0。

### Task 5: 会话根目录与宿主工作区挂接

- Consumes：`store.appendRunSession`（Task 4）。Produces：`sessionRoot`、`getRegistry`、`attachToLoopWorkspace`、`joinWorkspace`、world 钩子 `attach` / `attachHost`、`createAgent` 的 `headerCwd`、handlers 的 `sessionRoot` 依赖与 `headerCwd` 参数。
- Step 1（红）：四个测试文件各加一个用例。
  - `test/host-smoke.test.mjs`：import 行加 `existsSync`；在 `stubCtxCapture` 之后加夹具与新用例：

    ```js
    const hostFakes = () => {
      const calls = { create: [], attach: [], archive: [], rename: [] };
      const registry = {
        create: async (p, t) => { calls.create.push([p, t]); },
        resolveByPath: async (p) => ({ attachSession: async (id) => { calls.attach.push([p, id]); } }),
        archiveSession: async (id, o) => { calls.archive.push([id, o]); },
      };
      const titles = { get: () => undefined, rename: (_s, title) => { calls.rename.push(title); return {}; } };
      return { calls, get: (name) => ({ workspaceRegistry: registry, sessionTitle: titles })[name] };
    };
    test("host 冒烟⑥：引擎节点会话的会话头目录是 <数据目录>/workspaces，并挂接到「DSH Loop Forge」", async () => {
      const restore = setupEnv();
      try {
        const { ctx, captured } = stubCtxCapture();
        const f = hostFakes();
        ctx.get = f.get;
        const rt = buildRuntime(ctx, {});
        const binDir = join(rt.dir, "bin");
        mkdirSync(binDir, { recursive: true });
        writeFileSync(join(binDir, "gh"), FAKE_GH);
        chmodSync(join(binDir, "gh"), 0o755);
        seed(rt.store);
        const sessionRoot = join(rt.dir, "workspaces");
        assert.equal(existsSync(sessionRoot), true, "会话根目录已建");
        const { runId } = rt.engine.startRun("o/r#issue#1", {});
        await waitFor(() => captured.send.length > 0);
        assert.equal(captured.create[0].sessionId.meta.cwd, sessionRoot);
        assert.deepEqual(f.calls.create, [[sessionRoot, "DSH Loop Forge"]]);
        assert.deepEqual(f.calls.attach[0][1], "dsh-l:run:" + runId + ":build:2");
        rt.engine.cancelRun(runId, "smoke-end");
        await new Promise((r) => setTimeout(r, 20));
      } finally { restore(); }
    });
    ```

  - `test/worksession.test.mjs` 新增用例「composeWorkWorld.createAgent：headerCwd 定会话头目录、cwd 仍是工具目录；attachHost 收会话头目录」：夹具沿用 `makeServices`（`svc._ops.find((o) => o[0] === "create")[1]` 即 `agents.create` 收到的选项对象，见该文件第 134 行），另给 services 加 `attachHost: async (sid, dir) => { ops.push(["attach", sid, dir]); }` 与 `ops` 数组；调 `createAgent("s9", { cwd: "/ws/clone", headerCwd: "/ws" })` 与 `createAgent("s10", { cwd: "/w" })`；断言两次 `meta.cwd` 分别为 `"/ws"`、`"/w"`，两次 `workingDirectory.set` 的目录分别为 `"/ws/clone"`、`"/w"`，`ops` deepEqual `[["attach", "s9", "/ws"], ["attach", "s10", "/w"]]`。
  - `test/executor.test.mjs` 新增用例「runAgentNode：创建后先 attach(sessionId) 再 send」：夹具 `const run = { ...agentRun(1), candidateKey: "o/r#issue#1" }`（`agentRun` 默认 attempt 0 → 会话号 `:1`；真实引擎首试 attempt=1 → `:2`，见该文件的 `agentRun` 与 `engine.mjs` 的 `dispatch`），`node: { id: "build" }`；fake world 形态沿用该文件既有 `runAgentNode` 用例，加 `order` 数组与 `attach: async (sid) => { order.push("attach:" + sid); }`，并包一层 `createAgent` 给 `agent.send` 记 `order.push("send")`；断言 `order[0] === "attach:dsh-l:run:r1:build:2"` 且 `order.at(-1) === "send"`（Task 6 会在二者之间插入 title，故不断言第二项）。
  - `test/handlers.test.mjs` 新增用例「postWorkStart：managed 通道 → startWork 收 headerCwd = sessionRoot；local 通道不传」：夹具同第 921 行用例，`makeHandlers` 增 `sessionRoot: "/data/workspaces"`；断言 `sw._calls[0].params.headerCwd === "/data/workspaces"`；再按第 868 行用例的 local fresh 路径断言 `"headerCwd" in sw._calls[0].params === false`。
  - 单文件判据：`host-smoke` → Expected `ℹ tests 6`、`ℹ pass 5`、`ℹ fail 1`；`worksession` → 15 / 14 / 1；`executor` → 14 / 13 / 1；`handlers` → 67 / 66 / 1。
- Step 2（绿）：
  - `src/host.mjs`：
    - `import { mkdirSync, statSync } from "node:fs";`；`buildRuntime` 里 `const dir = dataDir();` 之后加 `const sessionRoot = join(dir, "workspaces"); try { mkdirSync(sessionRoot, { recursive: true, mode: 0o700 }); } catch {}`。
    - 模块级常量 `const LOOP_WORKSPACE_TITLE = "DSH Loop Forge";` 与五个 helper：

      ```js
      const warnOf = (ctx, what) => (err) => (ctx.logger ?? console).warn?.("[dsh-l] " + what + ":", err);
      const getRegistry = (ctx) => {
        const registry = ctx.get?.("workspaceRegistry");
        return registry && typeof registry === "object" ? registry : null;
      };
      // 先例 dsh-schedule/src/runtime.ts:482-489：只挂接 cwd 对应的已登记工作区，失败只告警。
      async function joinWorkspace(ctx, sessionId, cwd) {
        const registry = getRegistry(ctx);
        if (registry === null || cwd === undefined || typeof registry.resolveByPath !== "function") return;
        try { await (await registry.resolveByPath(cwd))?.attachSession(sessionId); } catch (err) { warnOf(ctx, "workspace join")(err); }
      }
      // 「DSH Loop Forge」：同路径 create 幂等（返回既有实体），再挂接。
      async function attachToLoopWorkspace(ctx, sessionId, sessionRoot) {
        const registry = getRegistry(ctx);
        if (registry === null || typeof registry.create !== "function") return;
        try { await registry.create(sessionRoot, LOOP_WORKSPACE_TITLE); await joinWorkspace(ctx, sessionId, sessionRoot); } catch (err) { warnOf(ctx, "loop workspace")(err); }
      }
      // 先例 dsh-schedule/src/runtime.ts:493-502：仅当会话尚无标题时改名。
      function nameSession(ctx, agent, title) {
        const titles = ctx.get?.("sessionTitle");
        if (!titles || typeof titles.rename !== "function") return;
        try { if (titles.get?.(agent?.session) === undefined) titles.rename(agent.session, title); } catch (err) { warnOf(ctx, "session title")(err); }
      }
      async function archiveSession(ctx, sessionId) {
        const registry = getRegistry(ctx);
        if (registry === null || typeof registry.archiveSession !== "function") return;
        try { await registry.archiveSession(sessionId, { stopActivity: true }); } catch (err) { warnOf(ctx, "session archive")(err); }
      }
      ```

    - `makeTriage(ctx, dir)` 与 `makeExecWorld(ctx, dir)` 的调用处改传 `sessionRoot`；两个 world 各加 `attach: (sessionId) => attachToLoopWorkspace(ctx, sessionId, sessionRoot)`（函数签名改 `(ctx, sessionRoot)`，`meta: { cwd: sessionRoot }`）。
    - `composeWorkWorld({...})` 的 services 增 `attachHost: (sessionId, cwd) => (cwd === sessionRoot ? attachToLoopWorkspace(ctx, sessionId, sessionRoot) : joinWorkspace(ctx, sessionId, cwd))`。
    - `makeHandlers({...})` 增 `sessionRoot`。
  - `src/engine/executor.mjs` 的 `runAgentNode`：`onSessionBound` 之后、`world.setPolicy` 之前加 `try { await world.attach?.(sessionId); } catch {}`。
  - `src/worksession.mjs`：
    - `composeWorkWorld` 返回对象的 `createAgent` 签名改为 `async createAgent(sessionId, { cwd, headerCwd = cwd, agentPreset, model, approvalPolicy } = {})`；`agents.create({ sessionId, meta: { cwd: headerCwd, agentPreset: preset }, … })`；`workingDirectory.set(handle.agent, cwd)` 不变；在其后加 `await attachHost?.(sessionId, headerCwd);`（services 解构出 `attachHost`）。
    - `startWorkSession(world, deps, { key, cwd, another, pkg, headerCwd })`：`world.createAgent(sessionId, { cwd, ...(headerCwd ? { headerCwd } : {}) })`。
    - 文件头红线①注释补一句：会话头目录（`meta.cwd`）与工具目录成对设置，托管开工时会话头目录取会话根目录。
  - `src/handlers.mjs` 的 `postWorkStart`：在调用 `startWork` 前算 `const headerCwd = managed && !cwdIn ? sessionRoot : undefined;`，参数改为 `{ key, cwd, another, pkg, ...(headerCwd ? { headerCwd } : {}) }`；`makeHandlers` 解构出 `sessionRoot = null`。
- Step 3（验）：单文件判据 `host-smoke` → 6 / 6 / 0；`worksession` → 15 / 15 / 0（含「红线②」源扫描用例仍绿）；`executor` → 14 / 14 / 0；`handlers` → 67 / 67 / 0。全量 → 377 / 377 / 0。

### Task 6: 会话标题创建时设定

- Consumes：`nameSession(ctx, agent, title)`（Task 5）、world 钩子 `setTitle`。Produces：`nodeSessionTitle`（`executor.mjs` 导出）、`workSessionTitle`（`worksession.mjs` 导出）、`triageTitle(n, lang)`（`triage.mjs` 导出）、`parseWorkAnchor` 新正则。
- Step 1（红）：四个测试文件各加一个用例，外加 `host-smoke` 冒烟⑥ 加一行断言。新符号一律在测试文件顶层用动态导入引入：`const { nodeSessionTitle } = await import("../src/engine/executor.mjs");`、`const { workSessionTitle } = await import("../src/worksession.mjs");`，不得加进文件顶部的静态 `import` 行——静态命名导入不存在的导出会让整个文件加载失败（输出 `SyntaxError: … does not provide an export named …`、`ℹ tests 1 / pass 0 / fail 1`，没有逐用例的 `not ok`），下面的逐文件红计数就不成立；动态导入下文件正常加载、符号为 `undefined`，红落在调用行。`triageTitle` 不需要导入（triage 用例只断言字面量）。
  - `test/executor.test.mjs` 新增用例「nodeSessionTitle：仓库名#号 · 节点名 圈号；runAgentNode 创建后 setTitle 先于 send」：断言 `nodeSessionTitle({ candidateKey: "iasiv5/dsh-m#pull#80" }, { name: "build" }, 2) === "dsh-m#80 · build ②"`、attempt `0` 得 `①`、attempt `11` 得 `#11`；fake world 加 `setTitle: (agent, title) => order.push("title:" + title)`，断言 `order` 前三项为 `["attach:dsh-l:run:r1:build:2", "title:r#1 · build ①", "send"]`（夹具同 Task 5：`{ ...agentRun(1), candidateKey: "o/r#issue#1" }`）。
  - `test/worksession.test.mjs` 新增用例「workSessionTitle + startWorkSession：创建后先 setTitle 再 send」：`workSessionTitle({ repo: "iasiv5/dsh-m", number: 80, type: "pull", title: "docs: add SECURITY_MODEL.md threat model" }) === "dsh-m#80 PR · docs: add SECURITY_MODEL.md threat model"`；标题为 70 个 `x` 时输出以 `…` 结尾、标题段是 58 个 `x` 加 `…`（前缀 `dsh-m#80 PR · ` 14 字符，72 − 14 = 58）；`startWorkSession` 路径里 services 加 `setTitle: (agent, title) => ops.push(["title", title])`，断言 `ops` 中首个 `["title", …]` 项的标题等于 `workSessionTitle(该夹具候选)`，且其下标小于 `["send"]` 的下标（夹具候选字段以文件内 `candidate()` 为准）。
  - `test/triage.test.mjs` 新增用例「runTriage：创建后设标题（zh / en），且早于 send」：`fakeWorld` 增 `ops` 数组并在返回对象里暴露，加 `setTitle: (agent, title) => ops.push(["title", title])`、`send` 里 `ops.push(["send"])`；zh 批次 1 条 → `["title", "分诊 · 1 条"]`；en → `["title", "Triage · 1"]`；两者 `title` 下标小于 `send` 下标。
  - `test/sessions-view.test.mjs` 新增用例「parseWorkAnchor：兼容新标题 `<仓库名>#<号> <issue|PR> · ` 与旧锚行」：`parseWorkAnchor("dsh-m#80 PR · docs: add")` deepEqual `{ repo: "dsh-m", number: 80, type: "PR" }`；`parseWorkAnchor("[dsh-l] o/r#2 issue · T2")` deepEqual `{ repo: "o/r", number: 2, type: "issue" }`。
  - `test/host-smoke.test.mjs` 冒烟⑥ 在 `assert.deepEqual(f.calls.attach[0][1], …)` 之后加 `assert.deepEqual(f.calls.rename, ["r#1 · build ①"]);`。
  - 单文件判据：`executor` → Expected `ℹ tests 15`、`ℹ pass 14`、`ℹ fail 1`；`worksession` → 16 / 15 / 1；`triage` → 11 / 10 / 1；`sessions-view` → 3 / 2 / 1；`host-smoke` → 6 / 5 / 1。
- Step 2（绿）：
  - `src/engine/executor.mjs`：导出 `nodeSessionTitle`；`runAgentNode` 在 `world.attach` 之后加 `try { world.setTitle?.(handle.agent, nodeSessionTitle(run, node, attempt)); } catch {}`。
  - `src/worksession.mjs`：导出 `workSessionTitle(c)`；`startWorkSession` 在 `world.createAgent` 之后、`world.send` 之前加 `try { world.setTitle?.(handle.agent, workSessionTitle(c)); } catch {}`；`composeWorkWorld` 返回对象加 `setTitle: (agent, title) => setTitle?.(agent, title)`（services 解构出 `setTitle`）。
  - `src/triage.mjs`：导出 `triageTitle(n, lang)`；`runTriage` 在 `createAgent` 之后、`send` 之前加 `try { world.setTitle?.(handle.agent, triageTitle(candidates.length, lang)); } catch {}` 与 `try { await world.attach?.(sessionId); } catch {}`。
  - `src/host.mjs`：三个 world 各加 `setTitle: (agent, title) => nameSession(ctx, agent, title)`；`composeWorkWorld` 的 services 增 `setTitle: (agent, title) => nameSession(ctx, agent, title)`。

    ```js
    // executor.mjs
    const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
    export function nodeSessionTitle(run, node, attempt) {
      const m = /^(.+)#(?:issue|pull)#(\d+)$/.exec(String(run?.candidateKey ?? ""));
      const name = m ? m[1].split("/").pop() : "run";
      const n = Math.max(1, Number(attempt) || 1);
      return name + "#" + (m ? m[2] : "?") + " · " + (node?.name ?? node?.id ?? "node") + " " + (n <= 10 ? CIRCLED[n - 1] : "#" + n);
    }
    // worksession.mjs
    export function workSessionTitle(c) {
      const word = c?.type === "issue" ? "issue" : "PR";
      const prefix = String(c?.repo ?? "").split("/").pop() + "#" + c?.number + " " + word + " · ";
      let title = String(c?.title ?? "");
      if (prefix.length + title.length > 72) title = title.slice(0, Math.max(1, 72 - prefix.length)) + "…";
      return prefix + title;
    }
    // triage.mjs
    export const triageTitle = (n, lang) => (lang === "en" ? "Triage · " + n : "分诊 · " + n + " 条");
    ```

  - `src/client/components/sessionsView.mjs` 的 `parseWorkAnchor` 正则改为 `/^(?:\[dsh-l\] )?(\S+)#(\d+) (issue|PR) · /`。
- Step 3（验）：单文件判据 `executor` → 15 / 15 / 0；`worksession` → 16 / 16 / 0；`triage` → 11 / 11 / 0；`sessions-view` → 3 / 3 / 0；`host-smoke` → 6 / 6 / 0；`client-render` → 67 / 67 / 0。全量 → 381 / 381 / 0。

### Task 7: 分诊会话用完归档

- Consumes：`archiveSession(ctx, sessionId)`（Task 5）。Produces：分诊 world 钩子 `archiveSession`；`runTriage` 的 finally 归档；`makeTriage` 改为导出（供冒烟⑦注入）。
- Step 1（红）：
  - `test/triage.test.mjs` 新增用例「runTriage：结束即归档（先归档后 dispose），超时路径同样归档」：`fakeWorld` 加 `archiveSession: async (id) => { ops.push(["archive", id]); }`、`dispose` 里 `ops.push(["dispose"])`；completed 批次断言 `ops` 中 `archive` 的下标小于 `dispose` 的下标且 `id` 以 `dsh-l-triage-` 开头；`timeoutMs: 0` 的静默 world 同样断言 `archive` 出现。
  - `test/host-smoke.test.mjs` 新增用例「host 冒烟⑦：分诊会话端到端——标题「分诊 · 1 条」→ 挂接 → 用完归档 { stopActivity: true }」：用 `buildRuntime(ctx, {}, { makeTriage })` 装配，`makeTriage` 从 `../src/host.mjs` 导入（本任务把它改为导出）——第三参不传时 triage 是 `UNWIRED`，`postTriage` 返回 502 `triage-not-wired`；`stubCtxCapture` 的 `ctx.on` 改为把 `"session/event"` 的处理器收进 `captured.handlers`；`agents.create` 返回的 `agent.send` 用 `queueMicrotask` 向全部处理器依次投递 `assistant/message`（正文为一条合法分诊围栏 JSON，行形如 `{"key":"o/r#issue#1","validity":"high","urgency":"P1","action":"start","reason":"r"}`）与 `turn/end`（`reason.kind === "completed"`），sid 取 `captured.create[0].sessionId.sessionId`；`ctx.get = hostFakes().get`；`seed(rt.store)` 后把候选置回 `inbox`（`store.setStage("o/r#issue#1", "inbox", "")`）；`const r = await rt.handlers.postTriage({ keys: ["o/r#issue#1"], lang: "zh-CN" })`；断言 `r.updated.length === 1`、`calls.rename` deepEqual `["分诊 · 1 条"]`、`calls.attach.at(-1)[1]` 以 `dsh-l-triage-` 开头、`calls.archive` deepEqual `[[<该 sessionId>, { stopActivity: true }]]`。
  - 单文件判据：`triage` → Expected `ℹ tests 12`、`ℹ pass 11`、`ℹ fail 1`；`host-smoke` → 7 / 6 / 1。
- Step 2（绿）：
  - `src/host.mjs`：第 32 行 `const makeTriage` 改为 `export const makeTriage`（其余不变）；`makeTriage` world 加 `archiveSession: (sessionId) => archiveSession(ctx, sessionId)`。
  - `src/triage.mjs` 的 `runTriage` 的 `finally` 改为：`off?.(); try { await world.archiveSession?.(sessionId); } catch {} try { await handle?.dispose?.(); } catch {}`（先归档后 dispose——归档要求会话在场）。
- Step 3（验）：单文件判据 `triage` → 12 / 12 / 0；`host-smoke` → 7 / 7 / 0。全量 → 383 / 383 / 0。

### Task 8: 候选行会话入口（UI）

- Consumes：`state.runs[*].sessions`（Task 4）、`openWorkSession`（`installActions` 既有闭包）。Produces：run 行的会话按钮。
- Step 1（impeccable 前置）：读 `/home/ubuntu/.dsh/profiles/web/node_modules/@iasiv5/dsh-skills/skills/impeccable/reference/craft-floor.md`。本任务属既有世界内的窄 refinement：不重跑世界工作坊，不重写 DESIGN.md。按 `reference/new-work.md` §5 判定是否落 surface brief：落则用 `/home/ubuntu/.dsh/profiles/web/node_modules/@iasiv5/dsh-skills/skills/impeccable/scripts/impeccable surface-brief write src/client/components/workbench.mjs /home/ubuntu/workspace/.dsh-research/dsh-l-workstart-review/m1-surface-brief.md`（正文文件放 gitignore 区，不入库），正文只写设计简报的压缩版（范围与访客模式、受众与任务、证据与范围、选定方向、未决项）；若要求 Direction contract 六块，FORM 的 seed 按工具实跑输出填写，取不到写 `seed: none (unavailable)`，不得编造。设计简报不写入源码与 `lib/`。
- Step 2（红）：`test/client-render.test.mjs` 在用例「actions runRow 详情 toggle 展开/收起（P1-5）」之后新增：

  ```js
  test("rowActions run 行：按候选汇总全部 run 的会话（run 新→旧），逐个成「打开 · 节点名」按钮，点击走 openWorkSession", async () => {
    const opened = [];
    const { installActions } = await import("../src/client/components/actions.mjs");
    const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: (id) => { opened.push(id); return true; }, pickDirectory: null, sessionsFeed: () => [] });
    const run = { id: "run-1", candidateKey: "o/r#issue#1", status: "waiting", waitingGate: "g2", waitingGateId: "G2", currentNodeIds: ["g2"], failedNodeIds: [], cancelledNodeIds: [], models: {}, templateId: "loop-v1", error: null, waitingSince: null, history: [], nodeStatuses: [],
      sessions: [{ nodeId: "mr-open", nodeName: "发起 MR", sessionId: "dsh-l:run-1:mr-open:2" }, { nodeId: "build", nodeName: "build", sessionId: "dsh-l:run-1:build:2" }] };
    const runOld = { ...run, id: "run-0", status: "failed", sessions: [{ nodeId: "verify", nodeName: "verify", sessionId: "dsh-l:run-0:verify:2" }, { nodeId: "build", nodeName: "build", sessionId: "dsh-l:run-1:build:2" }] };   // 末项与 run 重复，钉去重
    hooks.strip(new FakeElement("div"), { t, state: { candidates: [], runs: [runOld, run], workflow: { templates: [] } } });
    const d = new FakeElement("div");
    hooks.rowActions(d, { ...mkCandidate("gating"), currentRunId: "run-1" }, { t, view: { reload: async () => {} }, lang: "zh-CN" });
    const btns = find(d, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.startsWith(t("sessions.open") + " · "));
    assert.deepEqual(btns.map((b) => b.textContent), ["打开 · 发起 MR", "打开 · build", "打开 · verify"]);
    btns[1].onclick();
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(opened, ["dsh-l:run-1:build:2"]);
  });
  ```

  单文件判据 `client-render`。Expected：`ℹ tests 68`、`ℹ pass 67`、`ℹ fail 1`；红落在 `assert.deepEqual(btns.map(…), ["打开 · 发起 MR", "打开 · build", "打开 · verify"])`。
- Step 3（绿）：`src/client/components/actions.mjs` 的 `rowActions` 里，runRow 在状态 chip（`st`）之后追加：

  ```js
  const runsOf = lastRuns.filter((r) => r.candidateKey === c.key).sort((a, b) => (a.id < b.id ? 1 : -1));   // run-<epochMs>-…：id 字典序即时间序
  const seen = new Set();
  for (const s of runsOf.flatMap((r) => r.sessions ?? [])) {
    if (!s?.sessionId || seen.has(s.sessionId)) continue;
    seen.add(s.sessionId);
    runRow.append(btn(t("sessions.open") + " · " + (s.nodeName ?? s.nodeId), () => {
      if (!openWorkSession(s.sessionId)) workChip(runRow, t("sessions.badgeMissing"));
    }));
  }
  ```

  复用既有 `btn`（自带 pending 态）与 `workChip`；不加内联尺寸，不加浮层。回退文案改用既有键 `sessions.badgeMissing`（「不在会话列表」），对「尚未同步」与「已归档或删除」两种情况都如实；「另开」随 §20 第 19 条（里程碑 2），本计划不做。
- Step 4（验）：`npm run build` 退出码 0；单文件判据 `client-render` → 68 / 68 / 0；`design-lint` → 1 / 1 / 0；`i18n` → 6 / 6 / 0；`locale-parity` → 1 / 1 / 0。在仓根按第二部分「最终验证」的逐文件集合比对命令核 `actions.mjs`、`sessionsView.mjs`、`lib/client.js`：新增条目均为 0（实测 0 = 0、0 = 0、12 = 12 且集合相同）。全量 → 384 / 384 / 0。

### Task 9: 构建、文档与收口

- Consumes：Task 1–8 全部产物。Produces：README 双语说明、§20 落地注记、三笔提交。
- Step 1：`npm run build`（退出码 0），`npm test` → `ℹ tests 384`、`ℹ pass 384`、`ℹ fail 0`。
- Step 2：`README.md` 第 25 行「会话板块」条目末尾追加一句：

  ```text
  dsh-l 创建的会话标题带候选号（如「dsh-m#80 · build ②」）；引擎节点、托管开工与分诊会话统一归入宿主侧栏的「DSH Loop Forge」工作区，本地检出里开的会话，目录已登记为宿主工作区的归入其中，未登记的出现在「未分组」；分诊会话用完即归档，候选行内可直接打开该候选的全部会话。
  ```

  `README.en.md` 第 23 行「Three human gates」条目之后新增一条：

  ```text
  - **Sessions created by dsh-l**: titled with the candidate (`dsh-m#80 · build ②` style); engine-node, managed-clone and triage sessions join the **DSH Loop Forge** workspace in the host sidebar, while sessions opened in your own checkout join that directory's workspace when it is registered and otherwise appear under Ungrouped; triage sessions are archived after use, and every candidate row lists its sessions.
  ```

- Step 2b：`docs/design.md` §4a 小节末尾（「sweeper 保全与取舍」条之后、「处理器写成纯函数」段之前）追加一行：

  ```text
  注记（2026-11-23）：开工会话的会话头目录、标题与宿主工作区归属见 docs/design-v2.md §20 第 14–15 条；托管开工时会话头目录取会话根目录，工具目录仍为执行目录。
  ```

  §8 的注记随里程碑 3（阶段词表收敛）一起加，本计划不动 §8。
- Step 3：`docs/design-v2.md` §20 末尾追加一行「M1 落地注记（<落地日期>，commit <sha>）：第 14–17 条与第 23 条的行内部分、第 35 条已实现；存量会话（含 PR80 run 的 3 个）的会话头目录不可改，仍在「未分组」，不迁移。」——日期与 sha 取提交后的真实值。
- Step 4：提交（docs 独立）：
  - `docs(plans): 收敛 grill 定稿（GLOSSARY / design-v2 §20 / ADR-0003）+ 里程碑 1 实施计划入库`（`GLOSSARY.md`、`docs/design-v2.md`、`docs/adr/0003-split-pr-and-issue-delivery-semantics.md`、本计划）。
  - Task 3 末的 `fix(engine)` checkpoint（含重建的 `lib/host.js`，见 Task 3）。
  - `feat(sessions): 收敛 M1——会话归「DSH Loop Forge」、创建时设标题、分诊会话归档、候选行会话入口`（源码、测试、`README.md`、`README.en.md`、`docs/design.md`、`lib/client.js`、`lib/host.js` 同 commit）。
  - 实机核验后：`docs(design): §20 M1 落地注记`。
- Step 5（实机核验，须主人同意后执行 `dshm_restart`，且为当轮最后一个动作；核验放下一轮）：
  - 构建指纹：`grep -c -F "DSH Loop Forge" lib/host.js` → 不小于 1（单独执行、读输出；计数 0 时 grep 退出码为 1，不入 `&&` 链）。
  - 服务时间戳：跑 `[ "$(systemctl show deepseek-harness.service -p ActiveEnterTimestamp --value --timestamp=unix | tr -d '@' | cut -d. -f1)" -gt "$(stat -c %Y lib/host.js)" ]`，退出码 0 即「重启晚于构建」（本机实测该选项输出形如 `@1795412998`；人类可读格式带时区缩写，跨机有歧义，不作判据）。`curl` 返回 200 与 `workspaces` 目录存在都是恒真信号，不作判据。（2026-11-24 勘正，评审 K21 I7：本机重启后又构建过，该判据因此不成立；以 `GET /dsh-l/health` 的构建标识为主证据，见 design-v2 §20 落地注记。）
  - 在工作台点一次「分诊待分诊」或让任一 run 派发节点后：`ls /home/ubuntu/.dsh/sessions | grep -F "dsh-l-workspaces"` 出现新桶；宿主侧栏出现分组「DSH Loop Forge」，其下会话标题形如「分诊 · N 条」或「<仓库名>#<号> · <节点> ①」；分诊会话随即从侧栏消失（已归档）。
  - 新桶内标题读数：对新桶里最新的 `session.v4.jsonl.zstd` 跑 `zstd -dc <文件> | jq -r 'select(.type=="session/title") | .data.title' | tail -1`，输出形如 `分诊 · N 条` 或 `<仓库名>#<号> · <节点> ①`。
  - 人读核验（B7③）：在工作台展开候选，点「打开 · <节点名>」落到该会话；分诊会话归档后从侧栏消失。这一条同时是 `lib/client.js` 生效的证据：浏览器可能缓存旧 bundle，按钮不出现时先硬刷新再判失败。
  - 把核验结果写进 Step 3 的落地注记后再提交。

## 执行纪律

- 开始实现前，先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划。
- 按任务顺序执行（0 → 9），不无声跳步、合并步或改变任务目标。
- 每完成一个任务，运行该任务定义的验证；单文件计数与全量计数都要对上，对不上即停。
- 每合并一步，重查后续任务的红灯是否仍以当前代码成立；不可能红时改用新标记的字符串断言，不硬凑红灯。
- 夹具三件事写明：桩了什么（`ctx.get` 返回的 `hostFakes`）、没桩什么（真实 `buildRuntime`、真实 store、真实 engine）、不许桩什么（`FAKE_GH` 之外的任何出网路径一律不许）。
- 用户可见字符串以本计划逐字为准（mr-opener 提示词、三类标题格式、README 双语两句）；要改先改计划。
- 遇到阻塞、重复失败或计划与仓库现实不符，立即停下来说明，不猜。
- 仓库在 `main` 直改是既定工作流；若主人另有指示以其为准。
- 全部任务完成后，运行最终验证并输出修改摘要。

## 最终验证

```bash
set -o pipefail; cd /home/ubuntu/workspace/dsh-l
npm run build; echo "build exit=$?"
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
# detector 逐文件集合比对：命令见第二部分「最终验证（两部分合并）」（本部分单独验时基线仍是 a859af6）
git status --short
```

- `build exit=0`。
- `ℹ tests 384`、`ℹ pass 384`、`ℹ fail 0`。
- detector 逐文件集合比对：`actions.mjs`、`sessionsView.mjs` 新增条目 0；`lib/client.js` 12 = 12 且集合相同。
- `git status --short` 无未提交改动（除实机核验后才写的落地注记）。
- 修改摘要须列出：三笔提交的 sha、新增事件名清单、三类标题格式、宿主工作区名「DSH Loop Forge」、未迁移的存量会话数量。

---

# 第二部分：收敛里程碑 2「入口收敛」实施计划

## 两部分的关系

- 本文件含两部分。第一部分（到上方分隔线为止，现第 1–531 行）是里程碑 1，已过两轮评审（台账 `.dsh-research/dsh-l-m1-plan-review-scratch/ledger.md`）；除第三轮评审对 Task 7 的三处事实更正（分诊会话号前缀、`makeTriage` 改导出并注入）外，与其终稿一致；第二部分是里程碑 2，从本行起。
- 两部分**同一次执行、同一次重启、同一轮实机核验**。执行顺序：第一部分 Task 0–8 → Task 9 的 Step 1–4 → 第二部分 Task 10–17 → 实机核验（合并做一次）→ 落地注记提交。即第一部分 Task 9 的 Step 5 与其后的 `docs(design)` 提交推迟到 Task 17 之后；第二部分开始前第一部分全量须为 384 / 384 / 0。
- 第二部分的基线是 `docs/design-v2.md` §20 第 13、19、28、29、30 条，以及第 14 条里「未登记则如实提示『会出现在未分组』」一句（第一部分把它归到这里）。

## 目标（里程碑 2）

- **开工入口改两按钮**（§20-28）：「开工」是主动作，等于我来开；「自动执行」是并列的次级按钮，点击后行内确认一次。行内并列的「G1 放行 / 驳回」按钮删除。
- **目录记忆**（§20-13、§20-28）：按仓库记住上次目录，之后一键直达；首次点击才弹选择器；选择器写明会话将出现在哪个宿主工作区。
- **引擎只服务 issue**（§20-29）：PR 候选不提供自动执行，服务端也拒绝；PR 候选的开工消息写明分支与 `gh pr checkout`。
- **有存活执行时的入口**（§20-19）：只给「打开会话」与「取消执行」；「另开」进「更多」；取消后候选回「已分诊」，可再次开工。
- **引擎开的 PR 不成为候选**（§20-30）：记在来源候选上，卡片显示「PR #n · 待合并 / 已合并」；摄取跳过；合并后回填。

不在本计划：§20 第 3 条的列与按钮删除、第 6–12 条的列语义与标签页收敛、第 31–33 条（里程碑 3）。

## 架构快照（里程碑 2 增量）

1. **可见性规则**（`src/client/logic.mjs` 新导出 `startable(candidate)`）：`stage ∈ {gating, triaged}` 即可开工。行内：`canStart = (startable(c) || retry) && !c.work?.sessionId && !runAlive`，其中 `retry = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work`（开工失败后的恢复出口，既有语义），`runAlive = runInfo && ["running","waiting"].includes(runInfo.status)`。「开工」在 `canStart` 时出现；「自动执行」在 `startable(c) && canStart && c.type === "issue"` 时出现（重试态不出）；`runAlive` 时两者都不出现。
2. **行内确认条**：点「自动执行」后，在该候选展开区的工作行下方插入一条确认块（类名 `autorun`），四行事实加「确认执行」「取消」。「确认执行」用普通按钮样式，不做反色（One Voice）。确认即调 `POST /dsh-l/run/start`。执行目录路径 = `state.paths.workspacesDir + "/" + runDirName(key)`；`runDirName` 是 `src/engine/workspace.mjs` 里 `sanitizeKey` 的客户端镜像（非 `A-Za-z0-9._-` 一律换 `_`）。
3. **目录记忆**（服务端为准，手机与桌面共用）：`settings.workDirs` 是「仓库名 → 目录」映射；`postWorkStart` 在非复用路径成功后自动写入（托管克隆写 `"managed"`）。客户端「开工」：有记忆且非 `"managed"` → 直接带目录调用；记忆为 `"managed"` → 带 `workspace: "managed"` 调用；无记忆 → 弹选择器。三条路径都带现行 `mkStart` 的重试态标志 `anotherFlag`（`G1 pass && stage building` → `another: true`），否则重试态点「开工」会被 stage 守卫 409。选择器返回值用两个哨兵：`undefined`＝取消或点遮罩，什么都不做；`null`＝「本地默认检出」，调 `workStart(key, null, anotherFlag, lang)`，由服务端解析目录并写入记忆。现行代码里两者都返回 `null`、`mkStart` 遇 `null` 直接返回，「本地默认检出」是空操作——这是既有缺陷，本任务修掉。服务端对显式目录做存在性早守卫（422 `workspace-not-found`，零记账），客户端收到后回落到选择器并说明原因。
4. **选择器去向提示**：新路由 `GET /dsh-l/work/default-dir?repo=` 返回本地默认检出是否命中及其宿主工作区名；`GET /dsh-l/work/workspace-status` 响应增 `workspaceTitle`。两者都由宿主工作区注册表解析，未登记返回 `null`，界面显示「未分组」。不替用户新建工作区。
5. **引擎只服务 issue**：`postRunStart` 与 `postGate` 的 G1 pass 分支在候选存在之后、任何记账之前，对 `type !== "issue"` 返回 409 `engine-issue-only`。`engine.startRun` 本身不改。
6. **取消后回已分诊**：`src/engine/engine.mjs` 的 `stageOf` 把 `cancelled` 映射为 `triaged`（原为 `gating`）。配套放开开工守卫：三条路由的 stage 守卫从「仅 gating」改为「gating 或 triaged」，错误码不变。
7. **交付记在来源候选**：`store.setDelivery(key, patch, event)` 合并写 `candidate.delivery`（字段 `prNumber`、`prUrl`、`merged`、`mergedAt`）并留痕。引擎在 `deliverEvidence` 节点成功时，从产物末行解析 PR 链接，仓库名与候选一致才记。摄取时：该仓已记交付的 PR 号不并入候选；对未合并的交付逐个调 `provider.getPr`，已合并即回填。
8. **开工消息**：PR 候选的 kickoff 增一行「PR 分支：`<head>`（在本仓执行 `gh pr checkout <n>`；工作台不会替你切换分支）」。
9. **「更多」折叠**（本里程碑的最小形，里程碑 3 再收敛）：行内 `<details>`，含「换个目录开工…」与「另开会话」。另开沿用既有 `another + local` 守卫；目录取记住的非托管目录，没有则本地默认。

## 全局约束（里程碑 2 追加；其余逐字继承第一部分）

- 第一部分的全部全局约束继续有效，尤其：零依赖、双语 parity、design-lint、impeccable（动 UI 前读 `craft-floor.md`；改动后 detector 逐文件集合比对不新增条目，见第一部分全局约束）、测试判据纪律、新符号动态导入。
- 第一部分的产物按原样消费，不回改：`sessionRoot`、`headerCwd`、`attachHost`、`workSessionTitle`、`state.runs[*].sessions`、`paths` 之外的钩子。
- One Voice：确认块的「确认执行」不做反色；「开工」仍是该行唯一的反色主 CTA。
- 新增 i18n 键全部静态字面量引用；模板参数用 `.replace("{x}", …)`，与 `sessions.ago` 同款。键与双语文案见各任务，逐字为准。
- 无额外全局约束。

## 测试基线（里程碑 2 起点 = 第一部分终点，2026-11-23 推演）

| 文件 | M2 起点 | M2 终点 | 增量来源 |
|---|---|---|---|
| handlers | 67 | 75 | Task 10 +1、Task 12 +2、Task 13 +5 |
| store | 26 | 28 | Task 12 +1、Task 13 +1 |
| engine | 28 | 29 | Task 12 +1（Task 11 改 1 条既有断言） |
| github | 34 | 35 | Task 12 +1 |
| client-render | 68 | 75 | Task 12 +1、Task 13 +2、Task 14 +3、Task 15 +1 |
| host-smoke | 7 | 8 | Task 13 +1 |
| worksession | 16 | 18 | Task 16 +1、Task 18 +1（执行期增补） |
| logic | 31 | 32 | Task 11 −1 +1、Task 14 +1 |
| 其余 | 不变 | 不变 | — |
| 全量 | 384 | 407 | +22、Task 18 +1（执行期增补） |

逐任务完成后的全量计数：Task 10 → 385；Task 11 → 385；Task 12 → 391；Task 13 → 400；Task 14 → 404；Task 15 → 405；Task 16 → 406；Task 17 → 406；Task 18（执行期增补）→ 407。

## 文件结构与职责（增量）

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/handlers.mjs` | 改 | `engine-issue-only` 守卫；stage 守卫放开；显式 cwd 存在性早守卫；目录记忆写入；`getWorkDefaultDir`；`workspaceTitle`；摄取跳过与合并回填；`getState` 增 `paths` |
| `src/engine/engine.mjs` | 改 | `stageOf` 取消映射；deliver 成功记交付 |
| `src/store.mjs` | 改 | `settings.workDirs` 回填、`setWorkDir`、`setDelivery` |
| `src/github.mjs` | 改 | `getPr` |
| `src/host.mjs` | 改 | 路由 `work/default-dir`；向 handlers 注入 `paths`、`resolveLocalDir`、`workspaceTitleOf` |
| `src/worksession.mjs` | 改 | PR 候选 kickoff 增分支行 |
| `src/client/logic.mjs` | 改 | `startable`、`runDirName`；删 `shouldShowStartHint` |
| `src/client/api.mjs` | 改 | `workDefaultDir` |
| `src/client/components/actions.mjs` | 改 | 两按钮、确认条、目录记忆流程、选择器去向提示、「更多」折叠、删 G1 按钮对 |
| `src/client/components/candidateRow.mjs` | 改 | 脚注里的交付 PR 标记 |
| `src/client/components/workbench.mjs` | 改 | 删 start-hint 渲染与样式；加 `autorun`、`wtip` 样式 |
| `src/client/locale/zh-CN.mjs`、`en.mjs` | 改 | 新键、改键、删键（见各任务） |
| 测试（见各任务） | 改 | 红绿用例 |
| `README.md`、`README.en.md`、`PRODUCT.md`、`docs/design-v2.md` | 改 | Task 17 |

一起变化的边界：`startable` 与三条路由的 stage 守卫必须同一任务（Task 11）；`settings.workDirs` 的写入口与读出口必须同一任务（Task 13）。保持稳定：`getWorkSessions` 与「会话」页、`builtin.mjs`、`scheduler.mjs` 的状态函数、看板、标签页。

冻结面清点（第二部分；评审在副本实跑中逐条抓出，执行时须保持绿）：

1. `test/handlers.test.mjs` 第 732 行：取消后的 stage 断言——Task 11 改为 `"triaged"`。
2. `test/handlers.test.mjs` 第 1027、1031 行：`getWorkspaceStatus` 整形状断言——Task 13 各加 `workspaceTitle: null`。
3. `test/client-render.test.mjs` 第 650 行：整行文本断言——Task 14 改为按钮域断言（人工推翻的下拉里有「开工」选项）。
4. `src/client/components/workbench.mjs` 第 2 行的静态 import 含 `shouldShowStartHint`——必须随导出同删，否则 workbench 加载失败、client-render 全红；`test/logic.test.mjs` 第 151–161 行整块随删。
5. i18n「消费键 ⊆ 双字典」守护覆盖第二部分全部新 `t("…")` 键；新增键先入字典再消费。
6. `.dispose(` 源扫描不受第二部分影响；Task 16 改的是 `worksession.mjs` 的 `T` 表，`LOOP_V1.revision` 不变。
7. `test/client-render.test.mjs` 第 489、493、525 行钉死了「本地默认检出」与两处「取消」同为 `null`——Task 13 把第 493、525 行的期望改为 `undefined`（第 489 行不变），`pickWorkspace` 与 `mkStart` 的哨兵语义同步；这是在修一个既有缺陷：「本地默认检出」此前是空操作。

## 任务清单

判据命令写法同第一部分（单文件判据）。

### Task 10: 引擎只服务 issue（服务端守卫）

- Consumes：无。Produces：409 `engine-issue-only`。
- Step 1（红）：`test/handlers.test.mjs` 新增用例「postRunStart / postGate：PR 候选 G1 pass → 409 engine-issue-only，零记账零 run」：建一条 `type: "pull"` 候选并置 `gating`；`makeHandlers` 的 `engine` 用 `{ hasAliveRun: () => false, startRun: 计数桩 }`（`postRunStart` 在守卫之前先调 `hasAliveRun`，缺它会先抛 TypeError）；两个路由各断言 `error === "engine-issue-only"`、`status === 409`，候选 `stage` 仍为 `gating`、`gates.G1` 为 `null`、`startRun` 计数为 0。单文件判据 `handlers` → Expected `ℹ tests 68`、`ℹ pass 67`、`ℹ fail 1`。
- Step 2（绿）：`src/handlers.mjs` 的 `postGate`（G1 pass 分支，候选存在判断之后）与 `postRunStart`（`engine.hasAliveRun` 判断之后、stage 守卫之前）各加 `if (c.type !== "issue") return fail("engine-issue-only", 409);`。
- Step 3（验）：`handlers` → 68 / 68 / 0。全量 → 385 / 385 / 0。

### Task 11: 取消后回已分诊，开工守卫放开到已分诊

- Consumes：无。Produces：`startable(candidate)`（`src/client/logic.mjs` 导出）；`stageOf(cancelled) = "triaged"`；三路由守卫接受 `triaged`。
- Step 1（红）：
  - `test/logic.test.mjs`：删除用例「shouldShowStartHint：绑定+有候选+无gating → true；有gating → false；未绑定/空清单 → false」（函数随之删除）；新增用例「startable：gating 与 triaged 为真，其余为假」（`startable` 是新导出：按第一部分 Task 6 的硬规则，在文件顶层用动态导入 `const { startable } = await import("../src/client/logic.mjs");`，不得加进静态 `import` 行——静态引入不存在的导出会让整文件加载失败，红计数就不成立）。
  - `test/engine.test.mjs` 用例「钉例①取消：…+ 候选 gating」改名为「…+ 候选回已分诊」，末行断言改为 `assert.equal(store.getCandidate(key).stage, "triaged");`。
  - `test/handlers.test.mjs` 用例「闸门：G1 仅 gating 可放行；pass→building+任务包；reject→triaged；G2/G3 409」改名为「闸门：G1 在 gating 或 triaged 可放行；…」，并在原放行断言之后追加：另一条候选不经迁移、直接在 `triaged` 调 `postGate` G1 pass → `taskPackage.kind === "dsh-l.task-package"`、stage 变 `building`。同文件用例「run 路由：start 链/409/gate/cancel/retry/engine 缺省 503」里 `postRunCancel` 之后的 `stage === "gating"` 断言改为 `"triaged"`（取消后回已分诊）。
  - 单文件判据：`logic` → Expected `ℹ tests 31`、`ℹ pass 30`、`ℹ fail 1`（红：`startable is not a function`）；`engine` → 28 / 27 / 1；`handlers` → 68 / 66 / 2。
- Step 2（绿）：
  - `src/client/logic.mjs`：导出 `export const startable = (c) => c?.stage === "gating" || c?.stage === "triaged";`；删除 `shouldShowStartHint`。
  - `src/engine/engine.mjs` 的 `stageOf`：`run.status === "cancelled" ? "triaged"`。
  - `src/handlers.mjs`：`postGate`、`postRunStart`、`postWorkStart`（fresh 分支）三处 `c.stage !== "gating"` 改为 `!["gating", "triaged"].includes(c.stage)`，错误码保持 `gate-requires-gating`。
  - `src/client/components/workbench.mjs`：删第 2 行 import 列表里的 `shouldShowStartHint`、删 `shouldShowStartHint(state ?? {})` 那一行渲染、删样式规则 `.start-hint{…}`；`src/client/locale/zh-CN.mjs` 与 `en.mjs` 删键 `work.startHint`。
- Step 3（验）：`logic` → 31 / 31 / 0；`engine` → 28 / 28 / 0；`handlers` → 68 / 68 / 0；`client-render` → 68 / 68 / 0；`i18n` → 6 / 6 / 0；`locale-parity` → 1 / 1 / 0。全量 → 385 / 385 / 0（本任务计数净零）。

### Task 12: 引擎开的 PR 记在来源候选

- Consumes：`store.appendRunHistory` 同款写法；`provider.getRepo` 的实现形态（`src/github.mjs` 第 87–95 行）。Produces：`store.setDelivery(key, patch, event)`、`provider.getPr`、`candidate.delivery` 四字段、行内交付标记。
- Step 1（红）：
  - `test/store.test.mjs` 新增「setDelivery：合并写入、留痕、持久化」（夹具沿用第 222 行用例的候选与 run 构造）。
  - `test/engine.test.mjs` 新增「deliver 成功 → 来源候选 delivery 记 PR 号与链接；链接仓库名不符则不记」：全链走到 `deliver`，resolve 的 `artifacts[0]` 末行为 `"https://github.com/o/r/pull/81 T [OPEN]"` → `delivery` deepEqual `{ prNumber: 81, prUrl: "https://github.com/o/r/pull/81", merged: false, mergedAt: null }`；另一轮用 `"https://github.com/other/r/pull/9 x [OPEN]"` → `delivery` 仍为 `null`。
  - `test/github.test.mjs` 新增「getPr：映射 number/state/mergedAt/htmlUrl/headRef；非 2xx 抛带路径的错误」（夹具沿用文件内 `fetchPages`）。
  - `test/handlers.test.mjs` 新增两例：「postRefresh：该仓已记交付的 PR 不并入候选，total 不含它」；「postRefresh：未合并的交付 PR 已合并 → delivery.merged 回填」（PROVIDER 夹具沿用第 145 行用例，增补 `getPr` 桩）。
  - `test/client-render.test.mjs` 新增「candidateRow：delivery.prNumber → 脚注出『PR #n · 待合并』链接；merged → 已合并」（夹具沿用第 811 行用例的 `mk` 与 `renderRow` 读法）。
  - 单文件判据：`store` → 27 / 26 / 1；`engine` → 29 / 28 / 1；`github` → 35 / 34 / 1；`handlers` → 70 / 68 / 2；`client-render` → 69 / 68 / 1。
- Step 2（绿）：
  - `src/store.mjs`：
    ```js
    setDelivery(key, patch, event = "delivery") {
      const c = need(key);
      c.delivery = { ...(c.delivery ?? {}), ...patch };
      touch(c, event, JSON.stringify(patch).slice(0, 120));
      persist();
    },
    ```
  - `src/github.mjs`：`export async function getPr({ repo, number, token, fetch: f = globalThis.fetch })`——单次 `GET /repos/<repo>/pulls/<number>`（带 `Authorization`，与 `getRepo` 同款），返回 `{ number, state, mergedAt, htmlUrl, headRef }`。
  - `src/engine/engine.mjs` 的 `onNodeDone`，在 `deliver.mr` 落痕之后：
    ```js
    const line = String(result.artifacts?.[0] ?? "").trim().split("\n").pop();
    const m = /https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)/.exec(line);
    const src = store.getCandidate(run0.candidateKey);
    if (m && src && m[1].toLowerCase() === String(src.repo).toLowerCase()) store.setDelivery(run0.candidateKey, { prNumber: Number(m[2]), prUrl: m[0], merged: false, mergedAt: null }, "delivery.pr");
    ```
  - `src/handlers.mjs` 的 `postRefresh`，在每仓取回 `issues`、`pulls` 之后、`merged.push` 之前：
    ```js
    const delivered = store.listCandidates().filter((c) => c.repo === repo && c.delivery?.prNumber);
    const own = new Set(delivered.map((c) => c.delivery.prNumber));
    const pullsKept = pulls.filter((p) => !own.has(p.number));
    for (const c of delivered) {
      if (c.delivery.merged) continue;
      try {
        const pr = await provider.getPr({ repo, number: c.delivery.prNumber, token: tk, fetch });
        if (pr?.mergedAt) store.setDelivery(c.key, { merged: true, mergedAt: pr.mergedAt }, "delivery.merged");
      } catch {}
    }
    ```
    `merged.push(...issues, ...pullsKept)`；`perRepo[repo].pulls` 仍记取回数；`liveKeys` 仍用取回全集。
  - `src/client/components/candidateRow.mjs` 的 `metaFootnote`：当 `c.delivery?.prNumber` 时追加一个链接 chip，文本 `"PR #" + prNumber + " · " + t(merged ? "delivery.merged" : "delivery.pending")`，`href` 为 `prUrl`，`target="_blank"`、`rel="noopener"`；链接元素变量名用 `link`，不得用 `a`（design-lint 的 seam 遮蔽规则会红）。
  - 双字典新命名空间：zh `delivery: { pending: "待合并", merged: "已合并" }`；en `delivery: { pending: "Awaiting merge", merged: "Merged" }`。
- Step 3（验）：五个文件各按 Step 1 的绿值；`design-lint` → 1 / 1 / 0；`i18n`、`locale-parity` 不变。全量 → 391 / 391 / 0。

### Task 13: 目录记忆与选择器去向提示

- Consumes：`resolveLocalWorkspace`（`src/worksession.mjs`）、第一部分的 `getRegistry`。Produces：`settings.workDirs`、`store.setWorkDir(repo, cwd)`、422 `workspace-not-found` 早守卫、`getWorkDefaultDir`、`getWorkspaceStatus.workspaceTitle`、handlers 依赖 `paths` / `resolveLocalDir` / `workspaceTitleOf`、`api.workDefaultDir(repo)`、客户端记忆流程与去向提示。
- Step 1（红）：
  - `test/store.test.mjs` 新增「workDirs：新档缺省空对象；setWorkDir 写入并持久化；旧档回填」。
  - `test/handlers.test.mjs` 新增五例：「postWorkStart：显式 cwd 不存在 → 422 workspace-not-found，零记账（stat 抛错或非目录）；stat 返回 null 照旧放行」（`stat: () => { throw new Error("ENOENT"); }`；另断言 `stat: () => null` 时照旧放行）；「postWorkStart：fresh 成功后按仓库记住目录（本地默认记解析后的真实目录；显式目录记该目录）」；「postWorkStart：managed 成功后记住 "managed"」；「getWorkDefaultDir：命中 → cwd 与 workspaceTitle；未命中 → cwd null；非法 repo → 400；未登录 401」；「getWorkspaceStatus：响应带 workspaceTitle（注入 workspaceTitleOf；未注入为 null）」。夹具分别沿用第 868、921 行用例。
  - `test/handlers.test.mjs` 第 1027、1031 行两处 `assert.deepEqual` 的期望对象各加一键 `workspaceTitle: null`（`getWorkspaceStatus` 响应新增该字段，不加必红）。
  - `test/host-smoke.test.mjs` 新增「host 冒烟⑧：work/default-dir 路由在位；getState.paths；workspaceTitleOf 与 resolveLocalDir 装配（ctx.get 桩）」——夹具沿用冒烟⑥的 `hostFakes`（注册表桩加 `title: "dsh-m"`）。
  - `test/client-render.test.mjs` 新增两例：「mkStart：有记忆目录 → 不弹选择器直接 workStart；managed → workspace:managed；重试态 → another:true；422 → 回落选择器；选择器 null → 本地默认，undefined → 不调用」（`deps.api` 桩记录调用）；「pickWorkspace：去向提示三行（defaultDir 注入；未命中显示未命中；托管克隆显示 DSH Loop Forge；取消收尾返回 undefined）」（夹具沿用第 475 行用例）。同一用例第 493 行「取消」的期望由 `null` 改为 `undefined`，第 489 行「本地默认检出」仍为 `null`；第 525 行（脏态确认框 `confirm(false)`）的期望同样改为 `undefined`，注释同步；`mkStart` 新用例再加两条：「选择器返回 `null`（本地默认检出）→ 调 `workStart(key, null, anotherFlag, lang)`」「返回 `undefined`（取消）→ 不调用」。
  - 单文件判据：`store` → 28 / 27 / 1；`handlers` → 75 / 69 / 6（5 条新增转红，加上既有 `getWorkspaceStatus` 用例——两条整形状断言在同一用例里；执行期勘正 2026-11-24）；`host-smoke` → 8 / 7 / 1；`client-render` → 71 / 67 / 4（两条新增转红，加上第 493 行与第 525 行改写后的「取消」期望）。
- Step 2（绿）：
  - `src/store.mjs`：打开路径回填 `doc.settings.workDirs ??= {}`；`setWorkDir(repo, cwd) { doc.settings.workDirs[repo] = cwd; persist(); }`。
  - `src/host.mjs`：
    - `makeHandlers` 增注三项：`paths: { dataDir: dir, workspacesDir: sessionRoot }`、`resolveLocalDir: (repo) => resolveLocalWorkspace(repo, { home, stat })`、`workspaceTitleOf: async (cwd) => { const registry = getRegistry(ctx); if (!registry || typeof registry.resolveByPath !== "function") return null; try { return (await registry.resolveByPath(cwd))?.title ?? null; } catch { return null; } }`。
    - 路由表加 `"/dsh-l/work/default-dir": { GET: handlers.getWorkDefaultDir }`。
  - `src/handlers.mjs`（新依赖缺省：`paths = null`、`resolveLocalDir = null`、`workspaceTitleOf = async () => null`）：
    - `getState` 响应增 `paths`。
    - `postWorkStart`：复用快路径与冲突守卫之后、工作区解析之前，加存在性早守卫——`let cwdOk = true; if (cwdIn) { try { const st = stat?.(cwdIn); cwdOk = st ? Boolean(st.isDirectory?.()) : true; } catch { cwdOk = false; } } if (!cwdOk) return fail("workspace-not-found", 422);`（`stat` 抛错＝目录不存在；返回对象但不是目录＝拒绝；返回 `null`＝未知，照旧放行——既有用例的 `stat: () => null` 夹具因此不受影响）；`startWork` 成功且 `!out.reused` 时 `store.setWorkDir(c.repo, managed && !cwdIn ? "managed" : cwd)`。
    - `getWorkspaceStatus` 响应增 `workspaceTitle`。
    - 新增 `getWorkDefaultDir(_body, req)`：`requireAuth`；读查询串 `repo`，不匹配仓库正则（`src/handlers.mjs` 既有常量 `REPO_RE`，与 `putWatch` 同口径）→ 400 `invalid repo`；`cwd = resolveLocalDir?.(repo) ?? null`；返回 `{ repo, cwd, exists: Boolean(cwd && stat?.(cwd)?.isDirectory?.()), workspaceTitle: cwd ? await workspaceTitleOf(cwd) : null }`。
  - `src/client/api.mjs`：`workDefaultDir: (repo) => get("dsh-l/work/default-dir?repo=" + encodeURIComponent(repo))`。
  - `src/client/components/actions.mjs`：
    - `installActions` 增闭包 `lastState`（`strip` 钩子里随 `lastRuns` 一起记）；`mkStart` 改为：读 `lastState?.settings?.workDirs?.[c.repo]`；先算 `anotherFlag = c.gates?.G1?.decision === "pass" && c.stage === "building"`（重试态，三条路径都带）；`"managed"` → `a.workStart(c.key, null, anotherFlag, lang, "managed")`；有目录 → `a.workStart(c.key, dir, anotherFlag, lang)`，捕获消息为 `workspace-not-found` 的错误则弹选择器并显示 `t("work.dirGone")`；无记忆 → 弹选择器，返回 `undefined`（取消或点遮罩）直接返回；返回 `null`（本地默认检出）→ `a.workStart(c.key, null, anotherFlag, lang)`；返回 `"managed"` 或目录字符串 → 对应分支，均带 `anotherFlag`。`pickWorkspace` 同步改：「取消」与点遮罩 `finish(undefined)`；脏态确认框的「否」改 `finish(ok ? cwd : undefined)`、脏态下的「取消」改 `finish(undefined)`（现行两处都是 `finish(null)`，新语义下会把明确的取消变成「开工到本地默认检出」）；「本地默认检出」保持 `finish(null)`。选择器新参 `defaultDir: (repo) => api.workDefaultDir(repo)`。
    - 「开工」按钮下方加一行小字（类名 `wtip`）：有目录 → `t("work.dirMemory").replace("{dir}", dir)`；`"managed"` → `t("work.dirManaged")`；无 → `t("work.dirFirst")`。
    - `pickWorkspace`：`sub` 行之后渲染三行去向提示（类名 `wtip`）：本地默认（`defaultDir` 结果：命中 → `t("work.appearsDefault")`，`.replace("{dir}", cwd).replace("{where}", workspaceTitle ?? t("work.ungrouped"))`；未命中 → `t("work.dirGone")` 占位行写「本地默认检出未命中」用 `t("work.pickLocalFailed")`）；选择目录 → `t("work.appearsPick")`；托管克隆 → `t("work.appearsManaged")`。选完目录后的 `note` 行改为 `t("work.appearsAt").replace("{where}", st?.workspaceTitle ?? t("work.ungrouped"))`，脏态警示仍另起一行。
  - 双字典新键（zh / en，逐字）：
    - `work.dirMemory`：「开工目录：{dir}」/「Starts in: {dir}」
    - `work.dirFirst`：「首次开工，先选目录」/「First start: pick a directory」
    - `work.dirManaged`：「托管克隆」/「Managed clone」
    - `work.dirGone`：「记住的目录已不存在，请重新选择」/「The remembered directory no longer exists — pick again」
    - `work.pickLocalFailed`：「本地默认检出未命中（~/workspace/<仓名> 不存在）」/「Local default checkout not found (~/workspace/<repo> does not exist)」
    - `work.appearsDefault`：「本地默认检出 {dir}：会话将出现在 {where}」/「Local default checkout {dir}: the session appears under {where}」
    - `work.appearsPick`：「选择目录…：选好后显示会话将出现在哪」/「Pick a directory…: its workspace shows after you pick」
    - `work.appearsManaged`：「托管克隆：会话将出现在 DSH Loop Forge」/「Managed clone: the session appears under DSH Loop Forge」
    - `work.appearsAt`：「会话将出现在 {where}」/「The session appears under {where}」
    - `work.ungrouped`：「未分组」/「Ungrouped」
  - `src/client/components/workbench.mjs` 样式块加 `.wtip{font-size:12px;opacity:.75}`。
- Step 3（验）：`store` → 28 / 28 / 0；`handlers` → 75 / 75 / 0；`host-smoke` → 8 / 8 / 0；`client-render` → 71 / 71 / 0；`i18n`、`locale-parity` 不变。全量 → 400 / 400 / 0。

### Task 14: 两按钮、行内确认条、删 G1 按钮对

- Consumes：`startable`（Task 11）、`settings.workDirs`（Task 13）、`state.paths`（本任务产出后由确认条消费）。Produces：`runDirName`（`src/client/logic.mjs` 导出）、两按钮可见性、确认块 `autorun`。
- Step 1（红）：
  - `test/logic.test.mjs` 新增「runDirName：与 workspace.sanitizeKey 同构（o/r#issue#1 → o_r_issue_1）」（`runDirName` 同样走顶层动态导入，不得加进静态 `import` 行；Task 11 已为 `startable` 加过动态导入行时，在同一行解构里并列即可）。
  - `test/host-smoke.test.mjs` 冒烟⑧已断言 `paths`；本任务不新增。
  - `test/client-render.test.mjs` 改四条既有、新增三条：
    - 「rowActions 状态映射：待拍板=开工（issue 另有自动执行）；活跃行=打开会话唯一；重试态=开工」——原「G1 放行在主动作行」「G1 驳回不消失」两条断言替换为：`btns.some(x => x.includes("G1 ")) === false`，且 issue 行 `btns` 含 `t("work.autoRun")`；重试态保留「有开工」断言，并加一条「重试态无 `t("work.autoRun")`」。
    - 「rowActions 开工路径映射（disc Task 1）：inbox/held/closed/shipped 首位=移到 待拍板；triaged 首位=开工；building/gating 不含」——循环去掉 `triaged`，另断言 `firstBtn("triaged").first === t("work.startBtn")`。
    - 「rowActions：gating 无活跃行 → 开工在」（改名，断言不变，仍用 `t("work.startBtn")`）。
    - 「rowActions：gating 且已有活跃 work 行 → …我来开不渲染」第 650 行的 `assert.ok(!text.includes(t("work.startBtn")), …)` 改为按钮域断言 `assert.equal(find(detail, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent.includes(t("work.startBtn"))).length, 0)`——行内「人工推翻」的下拉选项里有「开工」（`recommendedActions.start`），`work.startBtn` 改值后整行文本恒含该词（改写后现即绿，不变量用例）。
    - 新增「rowActions：可开工行出「开工」，issue 行另有「自动执行」，PR 行无；G1 放行与驳回按钮不再渲染」（用 `mkCandidate("triaged")` 与 `type: "pull"` 变体）。
    - 新增「自动执行确认条：四行事实（含执行目录路径）+ 确认调 runStart + 取消收起」（`hooks.strip` 注入 `state.paths = { workspacesDir: "/data/workspaces" }` 与 `runs: []`；断言确认块文本含 `/data/workspaces/o_r_issue_1`、四行文案（`t("work.autoFactMode")`、`t("work.autoFactPath")` 替换后的结果、`t("work.autoFactSession")`、`t("work.autoFactShip")`）、点「确认执行」后桩收到 `runStart("o/r#issue#1")`，点「取消」后确认块移除）。
    - 新增「存活执行行：无开工与自动执行，只有打开会话与取消执行，无 G1 按钮对」（`lastRuns` 含 `status: "waiting"` 的 run 与一条 `sessions`）。
  - 单文件判据：`logic` → 32 / 31 / 1；`client-render` → Expected `ℹ tests 74`、`ℹ pass 69`、`ℹ fail 5`（红 5＝两条改写「状态映射」「开工路径映射」＋三条新增；另两条改写——第 653 行改名、第 650 行改按钮域断言——现即绿，属不变量用例，点名单列。新增的「存活执行行」现为红：现状下 run 等待中的 gating 行仍渲染「我来开」）。
- Step 2（绿）：
  - `src/client/logic.mjs`：`export const runDirName = (key) => String(key ?? "").replace(/[^A-Za-z0-9._-]/g, "_");`
  - `src/client/components/actions.mjs` 的 `rowActions`：
    - 删除 `mkG1Pair` 及其在 `uxPrimary`、`gates` 两处的 append。
    - `const runAlive = Boolean(runInfo && ["running", "waiting"].includes(runInfo.status)); const retry = c.gates?.G1?.decision === "pass" && c.stage === "building" && !c.work; const canStart = (startable(c) || retry) && !c.work?.sessionId && !runAlive;`；`mkStart`（文案改用 `work.startBtn`，值见下）与「自动执行」按钮按架构快照第 1 条的规则挂到 `workRow` 与 `uxPrimary`（重试态只出「开工」，不出「自动执行」）。
    - 「自动执行」点击：在 `workRow` 之后插入确认块（`document.createElement`，类名 `autorun`）：标题 `t("work.autoConfirmTitle")`；四行 `wtip`：`t("work.autoFactMode")`、`t("work.autoFactPath").replace("{dir}", runDir)`、`t("work.autoFactSession")`、`t("work.autoFactShip")`；按钮 `btn(t("work.autoGo"), …)` 调 `a.runStart(c.key, "")`，`btn(t("work.pickCancel"), …)` 移除确认块。`runDir = (lastState?.paths?.workspacesDir ?? "…/workspaces") + "/" + runDirName(c.key)`。
    - 白名单「移到 待拍板」首位按钮的源阶段去掉 `triaged`。
  - 双字典：`work.startBtn` 值改为「开工」/「Start work」；新键 `work.autoRun`「自动执行」/「Run automatically」、`work.autoConfirmTitle`「确认自动执行」/「Confirm the automatic run」、`work.autoFactMode`「走哪条路：引擎跑完构建与验证，停在 G2 等你放行」/「Path: the engine builds and verifies, then stops at G2 for your decision」、`work.autoFactPath`「在哪干活：执行目录 {dir}（从默认分支新起工作分支，不碰你的本地检出）」/「Where: run directory {dir} (a new branch off the default branch; your local checkout is untouched)」、`work.autoFactSession`「会话在哪：宿主侧栏的「DSH Loop Forge」分组」/「Sessions: under the "DSH Loop Forge" group in the host sidebar」、`work.autoFactShip`「谁交付：G2 放行后自动推送并开 PR，记在来源候选上」/「Who ships: after you pass G2, the engine pushes and opens the PR, recorded on this candidate」、`work.autoGo`「确认执行」/「Confirm run」。
  - `src/client/components/workbench.mjs` 样式块加 `.autorun{display:flex;flex-direction:column;gap:6px;padding:8px 10px;margin:6px 0;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:8px}`。
  - impeccable 前置同第一部分 Task 8（读 `craft-floor.md`；确认块是行内块，不是浮层；按钮六态沿用 `btn`）。
- Step 3（验）：`logic` → 32 / 32 / 0；`client-render` → 74 / 74 / 0；`design-lint` → 1 / 1 / 0；`i18n`、`locale-parity` 不变；detector 逐文件集合比对：改动的 UI 源文件与 `lib/client.js` 不得出现基线版没有的条目（`workbench.mjs` 基线 11 条、`lib/client.js` 基线 12 条，实测集合相同；口径见第一部分全局约束的执行期勘正）。全量 → 404 / 404 / 0。

### Task 15: 「更多」折叠——换个目录开工、另开会话

- Consumes：`pickWorkspace`（Task 13 的去向提示版）、`another + local` 守卫（既有）。Produces：行内 `<details class="override-box">`。
- Step 1（红）：`test/client-render.test.mjs` 新增「更多折叠：可开工或有会话时在场；『换个目录开工…』在；存活执行或已有会话时『另开会话』在并调 workStart(key, <记住的非托管目录或 null>, true, lang)」。定位：按 summary 文案 `t("actions.more")` 找那个 `<details>`——行内本就有「人工推翻」的 `<details class="override-box">`，按 DETAILS 计数会得 2；「不可开工」样例用 `inbox`（`building + G1 pass` 是重试态，可开工）。单文件判据 `client-render` → Expected `ℹ tests 75`、`ℹ pass 74`、`ℹ fail 1`。
- Step 2（绿）：`src/client/components/actions.mjs` 的 `rowActions`：当 `canStart || c.work?.sessionId || runAlive` 时追加 `<details>`（summary 文案 `t("actions.more")`）；内含 `btn(t("work.changeDir"), …)` → 无视记忆直接弹选择器，按选择结果调用 `workStart`（与 `mkStart` 的分支同款，含哨兵：`undefined` 取消、`null` 本地默认；抽成内部函数复用）；当 `c.work?.sessionId || runAlive` 时再含 `btn(t("sessions.another"), …)` → 另开沿用记住的目录：记忆存在且非 `"managed"` 时传该目录，否则传 `null`（服务端解析本地默认）；不用托管克隆（B13「仅限本地目录」）。`rowActions` 现有的「移到 已分诊 / 待拍板 / 挂起 / 已关闭」四按钮与「人工推翻」暂不动（里程碑 3 收进「更多」）。双字典新键 `actions.more`「更多」/「More」、`work.changeDir`「换个目录开工…」/「Start in another directory…」。
- Step 3（验）：`client-render` → 75 / 75 / 0。全量 → 405 / 405 / 0。

### Task 16: PR 候选的开工消息带分支提示

- Consumes：`buildKickoff`（`src/worksession.mjs`）、候选 `pull.headRef`（摄取已存）。Produces：kickoff 的 PR 分支行。
- Step 1（红）：`test/worksession.test.mjs` 新增「buildKickoff：PR 候选含 PR 分支行与 gh pr checkout <n>；issue 候选不含」。单文件判据 `worksession` → Expected `ℹ tests 17`、`ℹ pass 16`、`ℹ fail 1`。
- Step 2（绿）：`src/worksession.mjs` 的 `T` 两张表各加 `prBranchLine`：zh「PR 分支：{head}（在本仓执行 `gh pr checkout {n}`；工作台不会替你切换分支）」、en「PR branch: {head} (run `gh pr checkout {n}` in this repo; the workbench never switches your branch)」；`buildKickoff` 在「默认分支」行之后，`candidate.type !== "issue"` 时插入 `"- " + t.prBranchLine.replace("{head}", candidate.pull?.headRef ?? "-").replace("{n}", candidate.number)`。
- Step 3（验）：`worksession` → 17 / 17 / 0。全量 → 406 / 406 / 0。

### Task 17: 里程碑 2 的构建、文档与收口

- Step 1：`npm run build`（退出码 0）；`npm test` → `ℹ tests 406`、`ℹ pass 406`、`ℹ fail 0`；detector 逐文件集合比对每个文件新增条目为 0。
- Step 2：文档三处。
  - `README.md` 第 24 行「开工会话（Work Session）」整条替换为：

    ```text
    - **开工（两模式）**：候选展开行里「开工」是主动作，等于「我来开」——首次按仓库选目录（选择器写明会话将出现在哪个宿主工作区），之后一键直达，「更多 › 换个目录开工」可重选；「自动执行」是并列的次级按钮，点击后行内确认四件事（在哪干活、从默认分支新起工作分支、会话归「DSH Loop Forge」、G2 后自动开 PR），确认即建 run。PR 候选只提供「开工」（引擎只服务 issue），开工消息写明 PR 分支与 `gh pr checkout`；引擎为 issue 新开的 PR 记在来源候选上（「PR #n · 待合并 / 已合并」），不再单独成为候选。
    ```

  - `README.en.md` 第一部分新增的那条之后追加一条：

    ```text
    - **Start work (two modes)**: in the expanded candidate row, **Start work** is the primary action — it means starting it yourself. The first time, you pick a directory per repository (the picker says which host workspace the session will appear under); afterwards it opens in one click, and **More › Start in another directory…** lets you re-pick. **Run automatically** is a secondary button: it asks for confirmation inline with four facts (where it works, a new branch off the default branch, sessions under **DSH Loop Forge**, and the PR it opens after G2). PR candidates offer only **Start work** (the engine serves issues only) and the kickoff names the PR branch with `gh pr checkout`; a PR the engine opens for an issue is recorded on that candidate ("PR #n · Awaiting merge / Merged") and never becomes a candidate of its own.
    ```

  - `PRODUCT.md` 第 38 行开头的「开工会话（G1 放行第二出口）：」替换为「开工会话（开工两模式之一；另一模式是自动执行，仅 issue 候选）：」。
- Step 3：`docs/design-v2.md` §20 末尾追加一行「M2 落地注记（<落地日期>，commit <sha>）：第 13、19、28–30 条与第 14 条的提示句已实现；第 3 条的列与按钮删除仍在里程碑 3。存量 PR80 run（PR 候选，早于「引擎只服务 issue」）的处置：<已取消 / 取消时间>；取消后该候选回已分诊，只有「开工」。」——日期与 sha 取提交后的真实值。
- Step 4：提交：`feat(work): 收敛 M2——开工两按钮与行内确认、目录记忆、引擎只服务 issue、交付 PR 记来源候选`（源码、测试、`README.md`、`README.en.md`、`PRODUCT.md`、`lib/client.js`、`lib/host.js` 同 commit）。Task 3 的 `fix(engine)` checkpoint 与第一部分的 `feat(sessions)` 提交照第一部分的规定，在第二部分开始前完成。
- Step 5（实机核验，覆盖两个里程碑；须主人同意后 `dshm_restart`，当轮最后一个动作，核验放下一轮）：第一部分 Task 9 Step 5 的五条原样执行，另加四条——
  - 里程碑 2 构建指纹：`grep -c -F "engine-issue-only" lib/host.js` → 不小于 1（单独执行、读输出）。
  - 在工作台把任一已分诊的 issue 候选展开：有「开工」与「自动执行」，没有「G1 放行 / 驳回」；点「自动执行」出四行确认，点「取消」收起。
  - 任一没有存活执行的 PR 候选展开：只有「开工」，没有「自动执行」。
  - 存量 PR80 run 是「PR 候选不提供自动执行」之前的例外：核验前先在工作台点它的「取消执行」，不要放行（放行会重跑 mr-open，并把新 PR 记到 PR80 候选上）；取消后该候选回已分诊，行内只有「开工」。
  - 任一候选首次点「开工」弹选择器且有三行去向提示；选完再展开同仓另一候选，按钮下方显示记住的目录，再点不弹选择器。
  - 把核验结果写进两段落地注记后提交 `docs(design): §20 M1/M2 落地注记`。

### Task 18（执行期增补，评审实施 F1，主人 2026-11-24 批准）: 开工会话始终安装模型

不在原 Task 0–17 之内。实机核验发现：设了 `workSessionPreset` 的开工会话首回合即报 `agent … has no provider/model`——rc.5 的预设只决定工具 schema 与提示段，不供模型，而 `composeWorkWorld.createAgent` 的预设分支既不传 `agentOptions` 也不 `select`；同时 `settings.workSessionModel` 只被校验和存储，`startWorkSession` 从不把它传给 `createAgent`。该分支早于本计划（引入于 `f62738e`），不是本次产出引入，但它让「开工」主路径在实机上建得出会话、跑不起来。

- Step 1（红）：`test/worksession.test.mjs` 第 140 行用例改名为「composeWorkWorld 模型安装：显式模型优先；无显式模型时无论有没有预设都装宿主默认（rc.5 预设不供模型，实机 2026-11-24 定谳）」，分支 2 断言改为：有预设、无显式模型 → `agentOptions` 为宿主默认、`setup` 在场、`select` 被调；新增「startWorkSession 接线：settings.workSessionModel 传给 createAgent；未配则装宿主默认——设了预设也一样」。红 → `worksession` 18 / 16 / 2。
- Step 2（绿）：`src/worksession.mjs`：`createAgent` 无论有没有预设都装模型（显式模型优先，否则宿主默认）；`startWorkSession` 把 `settings.workSessionModel` 作为 `model` 传入（未配不添键，既有 `createAgent` 入参形状断言不变）。绿 → `worksession` 18 / 18 / 0；全量 407 / 407 / 0。
- Step 3：`npm run build`；提交 `fix(work): …`，`lib/host.js` + `lib/client.js` 同 commit。
- Step 4（实机，须重启宿主后）：对已有活跃开工会话的候选点「另开会话」，新会话 `turn/end` 的 `reason.kind` 不再是 `error`。

### Task 19（执行期增补，评审实施 I4 / I5 / I3，2026-11-24）: 文案脱节与回归防护

- I4（重要）：「会话」页空态 `sessions.empty` 仍在教旧机制（「从清单里对候选 G1 放行并选「我来开」即可开工」），而 M2 之后行内已无「G1 放行」按钮、按钮改叫「开工」。`src/client/locale/zh-CN.mjs` 与 `en.mjs` 两句改为「展开候选点开工」的方向。
- I5（建议）：`pickWorkspace` 脏态分支的「取消」按钮与点遮罩两处 `finish(undefined)` 没有回归防护——回退成 `null` 会让明确的取消变成「本地默认检出」。在脏态用例里补两条断言（现即绿，属不变量用例）。
- I3（建议）：`test/client-render.test.mjs` 第 475 行用例名仍写「取消 null」、第 517 行注释仍写「confirm(false) → resolve null」，同步为 `undefined`。
- Step 1（红）：`test/client-render.test.mjs` 会话页空态断言补「含『开工』、不含『G1 放行』与『我来开』」→ `client-render` 红 1。
- Step 2（绿）：改双语两句 → `client-render` 75 / 75 / 0；`i18n`、`locale-parity` 不变；全量 407 / 407 / 0。`npm run build`；提交 `fix(i18n): …`，`lib/client.js` 同 commit。

### Task 20（执行期增补，主人 2026-11-24 定）: 另开会话只用明确的本地目录

不在原 Task 0–17 之内。第 5 轮复核（评审 M9）指出：「另开会话」对记住的是托管克隆的候选，UI 发 `cwd:null`，服务端回退到用户的本地检出 `~/workspace/<repo>`（审批 `never`），等于静默在真实检出里开会话。主人选「隐藏」。

- Step 1（红）：`test/client-render.test.mjs`：「更多折叠」用例中「无记忆 → null」改为断言另开不出现；新增「另开的目录守卫」用例（记住托管 → 行内无另开；`startAnother(key, null)` 不调用；会话页「不在列表」行无目录 → 无另开，有目录 → 有另开）。红 → `client-render` 2 条失败。
- Step 2（绿）：`src/client/components/actions.mjs`：「更多」中的「另开会话」仅当记住的是明确的本地目录、且有活跃会话或存活执行时出现；`startAnother` 无目录时不发起调用。`src/client/components/sessionsView.mjs`：「不在列表」行仅当会话带目录时出现另开。绿 → `client-render` 76 / 76 / 0；全量 408 / 408 / 0。
- Step 3：`npm run build`；提交 `fix(work): 另开会话只用明确的本地目录…`（5431c85，`lib/client.js` 与 `lib/host.js` 同 commit）。
- 服务端 `postWorkStart` 对空目录的本地回退未改（API 语义）；是否收紧待主人决定（见 design-v2 §20 落地注记的未结项）。
- 执行期勘正（评审 K21 I8，主人原则「另开只用明确的本地目录」）：工具目录落在托管根（`workspacesDir`）下的会话行同样不给另开；服务端对托管根下的显式目录返回 409 `managed-dir-explicit`（`d2f31d3`，测试 410）。托管克隆只经 `workspace:"managed"` 进入。

### Task 21（执行期增补，评审 K21 I15 / I6，主人 2026-11-24 指示实施）: 另开失败回显与 run 放行的类型守卫

- Step 1（红）：`test/client-render.test.mjs` 新增「会话页「另开」失败就地呈现原因；startAnother 把错误响应转成文案、成功返回 null」；`test/handlers.test.mjs` 新增「postRunGate：PR 候选的 run 放行 → 409 engine-issue-only」（用例在 store 里真实建一条归属 PR 候选的 run，引擎桩不带查询方法）。
- Step 2（绿）：`actions.mjs` 的 `startAnother` 把错误响应转成 `sessions.anotherFailed (原因码)`；`workbench.mjs` 的 `onAnother` 把它交回会话页（与「确认交付」同一机制）；`handlers.mjs` 的 `postRunGate` 在触达引擎前按 run 归属的候选类型拦（run 从 store 读）。绿 → 全量 412 / 412 / 0。
- Step 3：`npm run build`；提交 `fix(work): …`（070634f，`lib/client.js` 与 `lib/host.js` 同 commit）。
- 不在本次范围：交付 PR 被关闭但未合并时仍显示「待合并」（I6 的另一半，需新增状态、文案与界面）。

## 执行纪律（第二部分追加；其余同第一部分）

- 先完成第一部分 Task 0–8 与 Task 9 Step 1–4 并提交，全量 384 / 384 / 0 之后才开始 Task 10。
- Task 11 改动了既有断言（engine 1 条、handlers 2 条、client-render 0 条）；Task 13 改写 handlers 既有 2 条（`getWorkspaceStatus` 两条整形状断言各加 `workspaceTitle: null`）；Task 14 改写 client-render 既有 4 条（含第 650 行改为按钮域断言）。改既有断言前按旧值全仓 grep 清点，清点结果写进提交说明。
- 任何一步要让第一部分的测试计数低于其终点值，即停。
- 重启与实机核验只做一次，在 Task 17 之后。

## 最终验证（两部分合并）

```bash
set -o pipefail; cd /home/ubuntu/workspace/dsh-l
npm run build; echo "build exit=$?"
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
# detector 逐文件集合比对：去行号后的条目集合不得出现基线版没有的条目
#（旧版文件须放在项目目录内——检测器只对项目内文件套用 DESIGN.md；判据自证：注入一条新 advisory → 新增条目=1）
IMPECCABLE=/home/ubuntu/.dsh/profiles/web/node_modules/@iasiv5/dsh-skills/skills/impeccable/scripts/impeccable
norm() { jq -r '.[] | "\(.antipattern)|\(.snippet // "")"' | sort; }
rm -rf .detector-old
for f in $(git diff --name-only a859af6..HEAD -- src/client) lib/client.js; do
  mkdir -p ".detector-old/$(dirname "$f")"; git show "a859af6:$f" > ".detector-old/$f" 2>/dev/null || : > ".detector-old/$f"
  norm < <("$IMPECCABLE" detect --json "$f") > .detector-old/new.txt
  norm < <("$IMPECCABLE" detect --json ".detector-old/$f") > .detector-old/old.txt
  echo "$f 新增条目=$(comm -13 .detector-old/old.txt .detector-old/new.txt | wc -l)"   # 期望每个文件 0
done
rm -rf .detector-old
git status --short
```

- `build exit=0`；`ℹ tests 407`、`ℹ pass 407`、`ℹ fail 0`（含执行期增补 Task 18）；detector 逐文件集合比对每个文件「新增条目=0」；`git status --short` 无未提交改动（落地注记除外）。
- 修改摘要须列出：全部提交 sha、新增路由与 i18n 键清单、`engine-issue-only` 与 `workspace-not-found` 两个新错误码、实机核验八条的读数。
