# dsh-l v2 M2（执行环闭环）实施计划

## 目标

- 让 run 真正跑起来：agent 节点经 ctx.agents 短会话执行、script 节点经宿主子进程执行，工作区（gh clone/复用/保留期清扫）落位；引擎驱动 start→dispatch→完成回调→stage 同步→再 dispatch 全链，含并发上限、取消链、节点重试、宿主重启恢复；POST run 四路由接通，postGate(G1,pass) 升级为别名；面板最小 UI（行内 run 区块/取消/重试/G2 激活/工作流条着色）。
- 同时清账 M1 产出评审移交的 backlog 五项（F1–F5，见 design-v2 §12.8）。
- 不含：看板/待我确认/角标/飞书（M3）、任务包 v2/Role/devflow-lite（M4）。

## 架构快照

- 新增三模块：`src/engine/workspace.mjs`（工作区管理器：sanitize/gh clone/复用/保留期清扫，io 全注入）、`src/engine/executor.mjs`（script=子进程 + agent=ctx.agents 短会话 + `composeAgentPrompt`，全部返回 `{promise, cancel}`）、`src/engine/engine.mjs`（run 生命周期驱动：startRun/dispatch/onNodeDone/cancelRun/retryNode/recover + 候选 stage 同步 + 进程内并发上限 + 在途登记）。
- 引擎驱动模型：事件链——节点完成回调 → scheduler 变换 → saveRun → 候选 stage 同步 → advanceRun → 可调度集分派。**可调度集 = computeReady(...) ∪ {nodeStates 中 status==="ready"}（均去在途）**（评审 R1-1：advanceRun/applyFailure/reject/recover 产出的是 ready，computeReady 只扫 pending——两路缺一不可）；gate 走 gateArrive 挂起；agent/script 起执行器并登记在途；并发上限 `settings.engineConcurrency`（默认 2，进程内在途计数，完成即再派发——`dispatchAlive()` 全局拾起，评审 R1-2 配套）。
- **回炉重臂（评审 R1-2）**：advanceRun 增一条规则——failed 节点若存在 rework 出边且其 target 已 succeeded → 该 failed 源节点回 ready（reworkCount 已在 applyFailure 计过，不再计）；manual retry 的 maxAttempts 预算只约束 retryNode 路径，不约束回炉重臂（回炉总次数由 maxReworks 把关）。
- **恢复重派不烧 attempt（评审 R1-11，落实 §12.1）**：recover 重派走 `dispatch(nodeId, {resume:true})`——attempt 保持原值、sessionId 追加 `:resume<序号>` 防撞（同 attempt 二次 createAgent 会被宿主 duplicate register 拒收）。
- **上游摘要（评审 R1-10）**：分派 agent 节点时由入边（success+rework）源节点提取 `{node, text}`（succeeded 取 artifacts[0]、failed 取 error，各截 500 字符）——回炉语境下 verify 失败文本随 build 重派进入 prompt。
- agent 节点等待机制镜像 triage.mjs（先订阅后创建、轮询 turn/end、非 completed fail-closed），差异点：成功**不 dispose**（autoloop api-mapping §4 判例：dispose 会删 session store 记录），取消/超时才 dispose；`ctx.workingDirectory.set(agent, cwd)` 经 world 注入（meta.cwd 只进会话头）。
- stage 同步（design-v2 §8）：run 创建→building（v1 别名已置）；gateArrive→gating；run succeeded→shipped；run failed→held（clone 失败同）；run cancelled→gating。sweepUpstream 与在途 run 互斥沿用 v1：只提示 `upstream-gone`，不代作主。
- prompt 组装（Q4）：`composeAgentPrompt({prefix, taskPackage, upstream})` = builtin `prefix`（固定 zh-CN 纪律句）+ 任务包 JSON + 上游工件摘要（无则省略）；LOOP_V1.build 增 prefix 字段（revision 指纹随之变化，golden 只锁格式不锁值，安全）。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies（child_process/crypto/fs 均 node 内置）；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- `peerDependencies @deepseek-ai/cordis ^4.0.2`；`dsh.engines.dsh ">=0.2.2-rc.1"`；本计划不改 cordis.patch.yml、package.json、src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs。
- **不动面（M1 全部继承 + 本计划新增）**：workbench.mjs 仅允许改第 159 行注释（F1）；locale 结构仅允许「增键」（zh-CN/en 双字典同步，parity 测试守护）；test/ 存量断言除本计划明列的「加键更新」（summarizeRun 两处 deepEqual、stripCells loop 断言）外一律不改。
- **测试桩纪律**：world/execFile/spawn/fs 全部注入，测试不真实 spawn gh/git/agent、不出网；LLM 行为不在单测（宿主冒烟另测）。
- 术语按 GLOSSARY（工作流/执行/节点/候选/闸门；不用 SOP/管线）；M1 约束「无新增 i18n 键」为 M1 专属，**本计划允许增键**（T11，双字典 + parity）。
- M2 不发 npm、不 bump version（0.0.1）。
- **docs commit 纪律（本计划起生效）**：本计划文件与 design-v2 §12 修订先行独立 `docs:` commit，不与代码混；此后每代码任务各自 conventional commit（M1 先例）。
- 退出码卫生：管道显示验证输出时 `set -o pipefail`。命令环境：Linux bash，工作目录 `/home/ubuntu/workspace/dsh-l`。

## 输入工件

- 设计：docs/design-v2.md §12（M2 补钉 Q1–Q8）、§4（调度）、§5（执行器）、§7（路由——GET run/:id 已按 §12.10 由 state.runs 承载）、§8（UI）、§9（安全）、§11（里程碑）。
- 参照实现：src/triage.mjs `runTriage`（订阅→create→send→轮询 turn/end→fail-closed 全套等待机制）、src/host.mjs `makeTriage`（world 组装模式）、src/store.mjs runs CRUD、src/engine/scheduler.mjs 全部导出、test/scheduler.test.mjs `st2/mkRun` 夹具范式。

## 文件结构与职责

- Create: `src/engine/workspace.mjs` — sanitizeKey/dirOf/ensure（gh clone 或复用）/sweep（保留期清扫）
- Create: `src/engine/executor.mjs` — composeAgentPrompt（纯函数）+ makeExecutor（runScriptNode/runAgentNode，均返回 `{promise, cancel}`）
- Create: `src/engine/engine.mjs` — makeEngine（startRun/dispatch/onNodeDone/cancelRun/retryNode/recover/候选 stage 同步/并发上限/在途登记）
- Modify: `src/workflows/validate.mjs` — F2 非 G1 gate 必带 rejectTarget + F3 success 边环检测
- Modify: `src/workflows/builtin.mjs` — build 节点增 `prefix` 字段、verify 增 `maxAttempts:3`、deliver 增 `maxAttempts:2`（M2 手动重试预算，§12.7）
- Modify: `src/store.mjs` — F4 `doc.runs ??= {}` 无条件回填；settings 默认与旧档回填 engineConcurrency=2 / workspaceRetentionDays=7
- Modify: `src/handlers.mjs` — makeHandlers 增 `engine` 参；postRunStart/postRunGate/postRunCancel/postRunRetry 四方法；postGate G1 pass 别名；putSettings 增两键校验（1..4 / 1..90）
- Modify: `src/host.mjs` — **inject 增 `"approval"`、`"workingDirectory"`**（评审 R1-12：runtime rc.3 实证——`@deepseek-ai/dsh-user-approval` 声明 `Context.approval: ApprovalService`、`@deepseek-ai/dsh-working-directory` 声明 `Context.workingDirectory: WorkingDirectoryService`，均为 cordis 声明式服务；不声明 inject 则 ctx 访问即抛错，可选链静默降级会让 executionPolicy:"auto" 静默失效）；`makeExecWorld(ctx, dir)`（makeTriage 同款 + setPolicy/setWorkingDirectory **直调非可选链**）；buildRuntime 装配 workspace/executor/engine + recover() 一次性扫描 + 保留期 ctx.interval 清扫；路由表增四条
- Modify: `src/client/api.mjs` — runStart/runGate/runCancel/runRetry 四端点
- Modify: `src/client/logic.mjs` — stripCells 增 runs 参（环内 chip 按 currentNodeIds 计数着色，dim=count===0）
- Modify: `src/engine/scheduler.mjs` — summarizeRun 增 `error` 字段（首个 failed 节点 error ?? null）；advanceRun 增**回炉源重臂**（评审 R1-2：rework 出边的 failed 源在其 target succeeded 后 → ready，reworkCount 不重复计）
- Modify: `src/client/components/actions.mjs` — 行内 run 区块（状态/error/cancel/retry）、G2 按 run.waitingGate 激活
- Modify: `src/client/components/workbench.mjs` — 仅第 159 行注释（F1：「管线条」→「工作流条」）
- Modify: `src/client/locale/zh-CN.mjs`、`en.mjs` — 增 run 相关键（T11 清单）
- Test: `test/workflows.test.mjs`（F2/F3）、`test/scheduler.test.mjs`（F5/summarizeRun error）、`test/store.test.mjs`（F4/settings）、`test/handlers.test.mjs`（settings 键 + run 路由）、`test/logic.test.mjs`（着色）、`test/workspace.test.mjs`（新）、`test/executor.test.mjs`（新）、`test/engine.test.mjs`（新）
- 不动：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json、src/client/components/workbench.mjs（除 F1 注释行）

任务间接口依赖：T1 独立清账；T2 独立；T3/T4/T5 相互独立但均被 T6 消费（executor/workspace 由 makeEngine 注入）；T6 → T7/T8（同文件递进）→ T9（handlers/host 消费 engine）；T10 → T11（UI 消费 runs 摘要）。执行顺序按编号。

## 任务清单

### Task 1: M1 backlog 清账（F4/F5/F2/F3/F1）

- 目标：产出评审移交的五项一次性清账，M2 后续代码落在干净地基上。
- 涉及文件：Modify `src/store.mjs`（F4）、`src/workflows/validate.mjs`（F2/F3）、`src/client/components/workbench.mjs`（F1）；Test `test/store.test.mjs`、`test/workflows.test.mjs`、`test/scheduler.test.mjs`
- 接口契约：
  - Consumes: 既有迁移区/store API、validateTemplate、LOOP_V1 golden（格式锁不锁值）
  - Produces: ①store 打开后 `doc.runs` 恒存在（version 2 档也回填）②validateTemplate 对 `gateId!=="G1"` 且缺 rejectTarget 的 gate 报 `gate missing rejectTarget` ③validateTemplate 对 success 边成环的模板报 `cycle detected` ④scheduler 钉例：onFailure:"hold" 单节点失败 → run failed + hold=true ⑤workbench:159 注释改「工作流条」
- 验证范围：`npm test`（store/workflows/scheduler 段）

- [ ] Step 1: 追加失败测试
  - store.test.mjs：
```js
test("F4：version 2 手改档缺 runs 块，打开即回填不炸", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-f4-"));
  const file = join(dir, "store.json");
  writeFileSync(file, JSON.stringify({ version: 2, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {}, auth: {} }));
  const s = createStore({ filePath: file });
  assert.deepEqual(s.listRuns(), []);
});
```
  - workflows.test.mjs：
```js
test("F2：非 G1 gate 缺 rejectTarget 报错；G1 豁免", () => {
  const bad = { ...okT, nodes: [ ...okT.nodes, { id: "g2", name: "G2", type: "gate", gateId: "G2" } ],
    edges: [ ...okT.edges, { id: "e3", source: "s", target: "g2", kind: "success" } ] };
  const r = validateTemplate(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("rejectTarget")));
  assert.equal(validateTemplate(okT).ok, true);   // G1 rejectTarget:null 豁免
});
test("F3：success 边成环报 cycle detected", () => {
  const cyc = { ...okT, edges: [ ...okT.edges, { id: "e9", source: "s", target: "a", kind: "success" } ] };
  const r = validateTemplate(cyc);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("cycle")));
});
```
  - scheduler.test.mjs：
```js
test("F5：onFailure hold 的节点失败 → run failed + hold=true", () => {
  const snapshot = { nodes: [{ id: "x", type: "script", script: "exit 1", onFailure: "hold" }], edges: [] };
  let run = { id: "r", candidateKey: "k", status: "running", waitingGate: null, cancelReason: null, hold: false,
    snapshot, nodeStates: { x: { status: "running", attempt: 1, reworkCount: 0, error: null } } };
  run = applyFailure(run, "x", "boom");
  assert.equal(run.status, "failed");
  assert.equal(run.hold, true);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: F4/F2/F3/F5 四个新用例红（F4: listRuns TypeError；F2/F3: errors 不含目标串；F5: hold false）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现
  - store.mjs 迁移块后追加一行：`doc.runs ??= {};`（无条件回填，评审 F4）。
  - validate.mjs 节点循环内 gate 分支追加：`if (n?.type === "gate" && n.gateId !== "G1" && !n.rejectTarget) push("node " + (n?.id ?? "?") + ": gate missing rejectTarget");`；文件尾增环检测（success 边 DFS 三色，命中回边 push("cycle detected at " + 起点)）。
  - scheduler.test.mjs 的 F5 夹具见 Step 1（无需改 src——现有 applyFailure 已实现 hold 语义，F5 只补钉例）。
  - workbench.mjs:159 注释「管线条」→「工作流条（原管线条，GLOSSARY 已退役）」。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（106 + 4 = 110 pass）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "fix: M1 评审 backlog 清账——F2 校验器/F3 环检测/F4 回填/F5 钉例/F1 注释"`

### Task 2: settings 扩展（engineConcurrency/workspaceRetentionDays）

- 目标：引擎并发上限与保留期可配置；旧档回填缺省。
- 涉及文件：Modify `src/store.mjs`、`src/handlers.mjs`；Test `test/store.test.mjs`、`test/handlers.test.mjs`
- 接口契约：
  - Consumes: 既有 settings 块与 putSettings 校验骨架（handlers.mjs:248-271）
  - Produces: `store.getSettings()` 恒含 `engineConcurrency`（默认 2）与 `workspaceRetentionDays`（默认 7）；putSettings 接受 `engineConcurrency` 整数 1..4、`workspaceRetentionDays` 整数 1..90，越界/非整数 → `invalid settings`
- 验证范围：`npm test`（store/handlers 段）

- [ ] Step 1: 失败测试
```js
// store.test.mjs
test("settings v2：engineConcurrency/workspaceRetentionDays 默认与回填", () => {
  const s = open();
  assert.equal(s.getSettings().engineConcurrency, 2);
  assert.equal(s.getSettings().workspaceRetentionDays, 7);
  const file = join(mkdtempSync(join(tmpdir(), "dsh-l-set-")), "store.json");
  writeFileSync(file, JSON.stringify({ version: 1, watch: { repos: [], updatedAt: "T" }, candidates: {}, snapshots: {}, settings: {}, }));
  assert.equal(createStore({ filePath: file }).getSettings().engineConcurrency, 2);
});
// handlers.test.mjs
test("putSettings：并发与保留期边界", async () => {
  const store = openStore();
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.putSettings({ engineConcurrency: 3 })).engineConcurrency, 3);
  assert.equal((await h.putSettings({ workspaceRetentionDays: 14 })).workspaceRetentionDays, 14);
  assert.equal((await h.putSettings({ engineConcurrency: 5 })).error, "invalid settings");
  assert.equal((await h.putSettings({ workspaceRetentionDays: 0 })).error, "invalid settings");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: 两个新用例红（键 undefined / undefined）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——store.mjs `emptyDoc` settings 增两键；迁移块后无条件 `doc.settings.engineConcurrency ??= 2; doc.settings.workspaceRetentionDays ??= 7;`；handlers putSettings 增两分支（仿 intervalMinutes 的整数边界校验，写法同款）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(settings): engineConcurrency/workspaceRetentionDays"`

### Task 3: engine/workspace.mjs — 工作区管理器

- 目标：候选工作区的目录定位、gh clone（纯 gh 路线，Q5）、复用、保留期清扫；io/execFile 全注入。
- 涉及文件：Create `src/engine/workspace.mjs`；Test `test/workspace.test.mjs`
- 接口契约：
  - Consumes: ghBin 约定（host.mjs:47 同款 `join(dir,"bin","gh")`）；PATH 注入纪律（github.mjs gh 候选序列精神）
  - Produces: `sanitizeKey(key)`（`[^A-Za-z0-9._-]` → `_`）；`makeWorkspace({ dataDir, ghBin, execFile, fs: {existsSync, mkdirSync, readdirSync, statSync, rmSync} })` → `{ dirOf(key), ensure({key, repo, onLog}), sweep({ activeKeys, retentionDays, now }) }`；ensure 已存在 → `{dir, cloned:false}` 不执行 clone；不存在 → mkdir 父目录（recursive）+ `execFile(ghCmd, ["repo","clone", repo, dir], {env})` → `{dir, cloned:true}`；env = `{...process.env, PATH: ghBin 目录 + ":" + process.env.PATH, GIT_TERMINAL_PROMPT:"0"}`（ghBin 为 null 时省略 PATH 前缀）；sweep **先 `sanitizeKey(activeKey)` 再与目录名比对**（评审 R1-8：目录名是 sanitize 后形态，字面比对永不相等会误删活跃工作区），对 `workspaces/` 下不在比对集且 mtime < now - retentionDays*86400000 的目录 rmSync 递归，返回 removed 文件名数组
- 验证范围：`npm test`（workspace 段）

- [ ] Step 1: 新建 `test/workspace.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sanitizeKey, makeWorkspace } from "../src/engine/workspace.mjs";

test("sanitizeKey：# 与 / 替换为下划线", () => {
  assert.equal(sanitizeKey("o/r#issue#12"), "o_r_issue_12");
});
test("ensure：不存在则 gh repo clone（env 注入 ghBin PATH 与 GIT_TERMINAL_PROMPT）", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws-"));
  const calls = [];
  const ghBin = join(dir, "bin", "gh");
  const w = makeWorkspace({ dataDir: dir, ghBin, execFile: async (cmd, args, opts) => { calls.push([cmd, args, opts]); } });
  const out = await w.ensure({ key: "o/r#issue#12", repo: "o/r" });
  assert.equal(out.cloned, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], ["repo", "clone", "o/r", out.dir]);
  assert.ok(calls[0][2].env.PATH.startsWith(join(dir, "bin") + ":"));
  assert.equal(calls[0][2].env.GIT_TERMINAL_PROMPT, "0");
});
test("ensure：已存在则复用不 clone；clone 失败抛错", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws2-"));
  mkdirSync(join(dir, "workspaces", "o_r"), { recursive: true });   // 评审 R1-7④：recursive，父目录不存在
  let n = 0;
  const w = makeWorkspace({ dataDir: dir, execFile: async () => { n++; } });
  const out = await w.ensure({ key: "o/r", repo: "o/r" });
  assert.equal(out.cloned, false);
  assert.equal(n, 0);
  const w2 = makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-ws3-")), execFile: async () => { throw new Error("network down"); } });
  await assert.rejects(() => w2.ensure({ key: "o/x", repo: "o/x" }), /network down/);
});
test("sweep：非活跃且超期目录清除；活跃目录即使超期也保留（评审 R1-8 红灯）", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws4-"));
  const old = join(dir, "workspaces", "old"); const fresh = join(dir, "workspaces", "fresh"); const active = join(dir, "workspaces", "active_stale");
  mkdirSync(old, { recursive: true }); mkdirSync(fresh, { recursive: true }); mkdirSync(active, { recursive: true });
  const now = Date.now();
  const removed = [];
  const w = makeWorkspace({ dataDir: dir, execFile: async () => {}, fs: {
    existsSync: () => false, mkdirSync: () => {}, readdirSync: () => ["old", "fresh", "active_stale"],
    statSync: (p) => ({ mtimeMs: p.includes("fresh") ? now : now - 20 * 86400000 }),   // fresh 新鲜；old 与 active_stale 都超期
    rmSync: (p) => { removed.push(p); },
  } });
  const out = w.sweep({ activeKeys: ["o/active#stale"], retentionDays: 7, now: new Date(now) });   // 原始键（未 sanitize）
  assert.deepEqual(out.removed.map((p) => p.split("/").pop()), ["old"]);   // active_stale 目录经 sanitizeKey 后命中保留
  assert.equal(removed.length, 1);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: Cannot find module workspace.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/engine/workspace.mjs`（按 Produces 契约逐函数写；fs 参数解构默认取 node:fs 同名函数；ghCmd = ghBin ?? "gh"；ensure 的 mkdir 只建 `workspaces/` 父目录（recursive）；sweep 的 now 参数缺省取当前时间）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 工作区管理器（gh clone/复用/保留期清扫）"`

### Task 4: engine/executor.mjs — script 节点执行器

- 目标：确定性脚本步：spawn shell、cwd/env 注入、超时、可取消、stdout/stderr 尾部 2KB 入 artifacts。
- 涉及文件：Create `src/engine/executor.mjs`（本任务先落 runScriptNode）；Test `test/executor.test.mjs`
- 接口契约：
  - Consumes: design-v2 §5 script 语义（shell、cwd=工作区、timeoutMs 缺省 600000、kill）
  - Produces: `makeExecutor({ spawn, ghBin = null, agentTimeoutMs = 1800000, scriptTimeoutMs = 600000 })` → `{ runScriptNode({ node, cwd }) }`；`runScriptNode` 返回 `{ promise, cancel }`：promise 决议 `{ok, error, artifacts}`（exit 0 → ok:true、artifacts=["stdout 尾部","stderr 尾部"] 各截 2048；非零 → ok:false、error=尾串；超时 → ok:false、error="script timeout"）；`cancel()` → SIGTERM、5s 后 SIGKILL、promise 以 `error:"script cancelled"` 决议
- 验证范围：`npm test`（executor 段）

- [ ] Step 1: 新建 `test/executor.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { makeExecutor } from "../src/engine/executor.mjs";

const fakeChild = ({ code = 0, delay = 0 } = {}) => {
  const listeners = {};
  const child = {
    killed: false, signals: [],
    stdout: { on: (ev, fn) => { listeners["out:" + ev] = fn; } },
    stderr: { on: (ev, fn) => { listeners["err:" + ev] = fn; } },
    on: (ev, fn) => { listeners["exit:" + ev] = fn; },
    kill: (sig) => { child.killed = true; child.signals.push(sig); listeners["exit:close"]?.(code); },
    emitExit: (c = code) => listeners["exit:close"]?.(c),
    emitOut: (t) => listeners["out:data"]?.(Buffer.from(t)),
    emitErr: (t) => listeners["err:data"]?.(Buffer.from(t)),
  };
  return child;
};
test("runScriptNode：exit 0 → ok，尾部截 2048 入 artifacts", async () => {
  let spawned = null;
  const ex = makeExecutor({ spawn: (cmd, opts) => { spawned = { cmd, opts, child: fakeChild({ code: 0 }) }; return spawned.child; } });
  const { promise, cancel } = ex.runScriptNode({ node: { id: "s", script: "npm test" }, cwd: "/w" });
  await Promise.resolve();
  spawned.child.emitOut("x".repeat(3000)); spawned.child.emitErr("warn"); spawned.child.emitExit(0);
  const r = await promise;
  assert.equal(r.ok, true);
  assert.equal(r.artifacts[0].length, 2048);
  assert.ok(r.artifacts[1].includes("warn"));
  assert.equal(spawned.opts.cwd, "/w");
  assert.equal(spawned.opts.shell, true);
  assert.ok(typeof cancel === "function");
});
```
  说明：fakeChild 需挂回 spawned（`spawned.child = fakeChild(...)` 形态），测试代码按此写全。
```js
test("runScriptNode：非零退出 → ok:false；cancel → SIGTERM 且 promise 以 cancelled 决议", async () => {
  const ex = makeExecutor({ spawn: () => fakeChild({ code: 1 }) });
  let r = await ex.runScriptNode({ node: { id: "s", script: "exit 1" }, cwd: "/w" }).promise;
  assert.equal(r.ok, false);
  let killed = null;
  const ex2 = makeExecutor({ spawn: () => { const c = fakeChild({ code: 0 }); killed = c; return c; } });
  const { promise, cancel } = ex2.runScriptNode({ node: { id: "s", script: "sleep 999" }, cwd: "/w" });
  cancel();
  r = await promise;
  assert.equal(r.ok, false);
  assert.match(r.error, /cancelled/);
  assert.deepEqual(killed.signals, ["SIGTERM"]);
});
test("runScriptNode：超时 → ok:false error=script timeout", async () => {
  const ex = makeExecutor({ spawn: () => fakeChild({ code: 0 }), scriptTimeoutMs: 30 });
  const r = await ex.runScriptNode({ node: { id: "s", script: "sleep 999" }, cwd: "/w" }).promise;
  assert.equal(r.ok, false);
  assert.equal(r.error, "script timeout");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: runScriptNode 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——executor.mjs 骨架 + runScriptNode：
```js
import { spawn } from "node:child_process";
const TAIL = 2048;
const tail = (buf) => buf.length > TAIL ? "…" + buf.slice(-TAIL) : buf;

export function makeExecutor({ spawn: sp = spawn, ghBin = null, agentTimeoutMs = 1800000, scriptTimeoutMs = 600000 } = {}) {
  const env = () => ({ ...process.env,
    PATH: (ghBin ? ghBin.slice(0, ghBin.lastIndexOf("/")) + ":" : "") + process.env.PATH,   // ghBin 目录前插 PATH
    GIT_TERMINAL_PROMPT: "0" });
  return {
    runScriptNode({ node, cwd }) {
      let child; let settled = false; let timeoutTimer = null; let killTimer = null;
      const outBuf = []; const errBuf = [];
      const promise = new Promise((resolve) => {
        const finish = (r) => { if (!settled) { settled = true; clearTimeout(timeoutTimer); clearTimeout(killTimer); resolve(r); } };
        child = sp(node.script, { shell: true, cwd, env: env() });
        child.stdout?.on?.("data", (b) => outBuf.push(b));
        child.stderr?.on?.("data", (b) => errBuf.push(b));
        child.on("close", (code) => finish(code === 0
          ? { ok: true, error: null, artifacts: [tail(Buffer.concat(outBuf).toString()), tail(Buffer.concat(errBuf).toString())] }
          : { ok: false, error: "exit " + code + ": " + tail(Buffer.concat(errBuf).toString()), artifacts: [] }));
        timeoutTimer = setTimeout(() => finish({ ok: false, error: "script timeout", artifacts: [] }), scriptTimeoutMs);
      });
      return { promise, cancel: () => {   // SIGTERM + 5s 兜底 SIGKILL（settle 时 killTimer 一并 clear）
        try { child.kill("SIGTERM"); killTimer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 5000); } catch {}
      } };
    },
  };
}
```
  （env 合并：process.env 展开后覆写 PATH——ghBin 目录前插——与 GIT_TERMINAL_PROMPT；cancel 的 SIGTERM 后 5s 兜底 SIGKILL，settle 时两个 timer 都清。）
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): script 节点执行器"`

### Task 5: executor.mjs — agent 节点执行器与 composeAgentPrompt

- 目标：agent 节点 = ctx.agents 短会话（triage 同款等待机制）+ prompt 组装 + 审批策略 + 工作目录注入；成功不 dispose，取消/超时 dispose。
- 涉及文件：Modify `src/engine/executor.mjs`；Test `test/executor.test.mjs`
- 接口契约：
  - Consumes: triage.mjs 等待机制（订阅→create→send→轮询 turn/end→非 completed fail-closed）；api-mapping §2/§7/§12（setPolicy / workingDirectory.set）
  - Produces: `composeAgentPrompt({ prefix, taskPackage, upstream })` 纯函数（upstream 为空则无上游段）；`makeExecutor` 增 `runAgentNode({ run, node, cwd, taskPackage, upstream, resume, resumeSeq })` → `{promise, cancel}`：promise 决议 `{ok, error, artifacts:[]}`；内部 `sessionId = "dsh-l:run:" + run.id + ":" + node.id + ":" + ((run.nodeStates[node.id]?.attempt ?? 0) + (resume ? 0 : 1)) + (resume ? ":resume" + resumeSeq : "")`（评审 R1-6③ 优先级修正 + R1-11 resume 后缀防撞）；`world.setPolicy(agent, executionPolicy==="auto" ? "never" : "ask")`；`world.setWorkingDirectory(agent, cwd)`；超时（agentTimeoutMs）与 cancel → `agent.cancel` + `handle.dispose`；cancel 置 cancelled-flag：轮询环条件含 `!cancelledFlag`，立即以 `error:"cancelled"` 决议（评审 R1-18：不空等 endKind/超时）；成功路径不 dispose
- 验证范围：`npm test`（executor 段）

- [ ] Step 1: 追加失败测试（fake world：可控注入 turn/end）
```js
const fakeWorld = () => {
  const w = { events: [], created: [], sent: [], policies: [], cwds: [], sessionId: null,
    onSessionEvent: (fn) => { w.events.push(fn); return () => {}; },
    createAgent: async (sessionId, opts) => { w.created.push({ sessionId, opts }); w.sessionId = sessionId;
      const agent = { send: async (msg) => w.sent.push({ sessionId, msg }), cancel: async (c) => { w.cancelled = c; } };
      w.agent = agent;
      return { agent, dispose: () => { w.disposed = true; } }; },
    userMessage: (text) => ({ text }),
    sleep: () => Promise.resolve(),
    setPolicy: (agent, p) => w.policies.push(p),
    setWorkingDirectory: (agent, cwd) => w.cwds.push(cwd),
    finish: (kind) => w.events.forEach((fn) => fn(w.sessionId, { type: "turn/end", data: { reason: { kind } } })),
  };
  return w;
};
test("composeAgentPrompt：prefix + 任务包 + 上游段", () => {
  const p = composeAgentPrompt({ prefix: "纪律句", taskPackage: { kind: "dsh-l.task-package", instructions: { goal: "g" } }, upstream: [{ node: "verify", text: "2 failed" }] });
  assert.ok(p.startsWith("纪律句"));
  assert.ok(p.includes("dsh-l.task-package"));
  assert.ok(p.includes("上游节点输出")); assert.ok(p.includes("verify"));
  assert.equal(composeAgentPrompt({ prefix: "", taskPackage: { a: 1 } }).includes("上游节点输出"), false);
});
test("runAgentNode：completed → ok；executionPolicy 映射审批；cwd 注入；成功不 dispose", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const run = { id: "r1", nodeStates: { build: { attempt: 0 } }, snapshot: { nodes: [], edges: [] } };
  const node = { id: "build", type: "agent", executionPolicy: "auto", prefix: "纪律句" };
  const { promise } = ex.runAgentNode({ run, node, cwd: "/ws", taskPackage: { kind: "x" }, upstream: [] });
  await Promise.resolve(); await Promise.resolve();
  w.finish("completed");
  const r = await promise;
  assert.equal(r.ok, true);
  assert.equal(w.policies[0], "never");
  assert.deepEqual(w.cwds, ["/ws"]);
  assert.equal(w.disposed, undefined);
  assert.match(w.created[0].sessionId, /^dsh-l:run:r1:build:1$/);
});
test("runAgentNode：非 completed fail-closed；cancel → dispose + cancelled", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const run = { id: "r2", nodeStates: { build: { attempt: 0 } }, snapshot: { nodes: [], edges: [] } };
  const { promise, cancel } = ex.runAgentNode({ run, node: { id: "build", type: "agent", executionPolicy: "ask" }, cwd: "/ws", taskPackage: {}, upstream: [] });
  await Promise.resolve(); await Promise.resolve();
  w.finish("blocked");
  let r = await promise;
  assert.equal(r.ok, false); assert.match(r.error, /turn-end:blocked/);
  const w2 = fakeWorld();
  const ex2 = makeExecutor({ world: w2, spawn: () => fakeChild() });
  const j = ex2.runAgentNode({ run: { ...run, id: "r3" }, node: { id: "build", type: "agent", executionPolicy: "ask" }, cwd: "/ws", taskPackage: {}, upstream: [] });
  await Promise.resolve(); await Promise.resolve();
  j.cancel();
  r = await j.promise;
  assert.equal(r.ok, false); assert.match(r.error, /cancelled/);
  assert.equal(w2.disposed, true);
});
test("runAgentNode：超时 fail-closed", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild(), agentTimeoutMs: 20 });
  const r = await ex.runAgentNode({ run: { id: "r4", nodeStates: { build: { attempt: 0 } }, snapshot: { nodes: [], edges: [] } }, node: { id: "build", type: "agent" }, cwd: "/ws", taskPackage: {}, upstream: [] }).promise;
  assert.equal(r.ok, false);
  assert.equal(r.error, "timeout");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: composeAgentPrompt / world 参不支持 → 红。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——composeAgentPrompt 纯函数；makeExecutor 签名增 `world`；runAgentNode 按 Produces 契约实现（镜像 runTriage 的订阅/轮询骨架；endKind==="completed" → ok；轮询用 world.sleep(500)、环条件含 `!cancelledFlag`——评审 R1-18；超时/取消 → cancel+dispose；成功不 dispose；executor 签名 `world` 无缺省——M1 executor 测试不传 world 的用例需补 `world: fakeWorld()` 或缺省 `{}`——以「不传 world 时 runAgentNode 抛 world-not-wired」实现，T4 既有用例不触 runAgentNode 即不受影响）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): agent 节点执行器与 prompt 组装"`

### Task 6: engine.mjs — 执行环驱动核心

- 目标：startRun（g1 预置 succeeded + clone 首步异步）、dispatch 循环（并发上限/闸门挂起/节点派发）、完成回调（applyFailure/advanceRun + 候选 stage 同步）。
- 涉及文件：Create `src/engine/engine.mjs`；Modify `src/workflows/builtin.mjs`（build 增 prefix、verify maxAttempts:3、deliver maxAttempts:2）；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: scheduler 全导出、store runs CRUD、workspace.ensure、executor.runAgentNode/runScriptNode、GLOSSARY stage 映射（design-v2 §8）
  - Produces: `makeEngine({ store, workspace, executor, template = LOOP_V1, now, concurrencyOf = () => 2 })` → `{ startRun(key, { taskPackage }), dispatch(runId, {resume, resumeSeq}), onNodeDone(runId, nodeId, result), cancelRun(runId, reason), retryNode(runId, nodeId), recover(), dispatchAlive(), hasAliveRun(key) }`；`startRun`：候选存在 404、存活 run 409 run-already-active（`hasAliveRun(key)`）、创建 run（g1 预置 succeeded attempt1、其余 pending、snapshot=template 克隆）→ syncStage→building → 异步 `workspace.ensure` → 成功 appendRunHistory("workspace.cloned", dir+" remote=gh-https"——评审 R1-13) + dispatch；失败 → build 节点 failed(error) + run failed + `workspace.clone-failed` 留痕（评审 R1-14）+ 候选 held（评审 R1-3①：原稿调引擎不存在的 applyFailure——已内联修复）；`dispatch(runId, {resume, resumeSeq})`：非终态时**可调度集 = computeReady ∪ ready（去在途）**（评审 R1-1：advanceRun/applyFailure/reject/recover 产出的是 ready）逐节点派发（在途 < concurrencyOf()）：gate → gateArrive + 候选 gating；agent/script → 节点 running（attempt+1；resume 重派例外不烧 attempt——评审 R1-11）+ 计算 upstream（评审 R1-10：入边源 artifacts/error 提取）+ 起 executor + 登记 in-flight（`${runId}:${nodeId}` → cancel fn）→ 完成回调 onNodeDone；`onNodeDone`：run 已终态则忽略迟到结果；ok → succeeded+artifacts；否则 applyFailure → run failed 时候选 held；saveRun → advanceRun（含回炉源重臂——评审 R1-2，scheduler.mjs 落点见文件结构）→ succeeded 时候选 shipped → dispatch(runId) + dispatchAlive()（并发名额释放后全局拾起其余存活 run 的排队节点）
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 新建 `test/engine.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore, makeRunId } from "../src/store.mjs";
import { makeEngine } from "../src/engine/engine.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";

// fake workspace：ensure 立即成功/失败可控
const fakeWorkspace = (fail = false) => ({ ensure: async () => { if (fail) throw new Error("clone down"); return { dir: "/ws", cloned: false }; } });
// fake executor：agent/script 可手工放行；cancel 记账
const fakeExecutor = () => {
  const inflight = new Map(); let seq = 0;
  const exe = {
    inflight, lastArgs: null,
    runAgentNode(args) {
      const { run, node } = args; const key = run.id + ":" + node.id; const entry = {}; inflight.set(key, entry);
      exe.lastArgs = args;
      const promise = new Promise((resolve) => { entry.resolve = (r) => { inflight.delete(key); resolve(r); }; });
      exe.last = { key, runId: run.id, nodeId: node.id };
      return { promise, cancel: () => { entry.cancelled = true; entry.resolve({ ok: false, error: "cancelled" }); } };
    },
    runScriptNode(args) { return exe.runAgentNode(args); },
  };
  return exe;
};
const setup = ({ failClone = false, concurrency = 2 } = {}) => {
  const store = createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-eng-")), "s.json") });
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "", updatedAt: "", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  store.setStage("o/r#issue#1", "gating", "");
  const workspace = fakeWorkspace(failClone); const executor = fakeExecutor();
  const engine = makeEngine({ store, workspace, executor, now: () => new Date(), concurrencyOf: () => concurrency });
  return { store, workspace, executor, engine };
};
const nodeState = (store, runId, id) => store.getRun(runId).nodeStates[id].status;

test("startRun：g1 预置 succeeded、候选 building、存活 run 二次 start 409", async () => {
  const { store, engine } = setup();
  const key = "o/r#issue#1";
  const r = engine.startRun(key, {});
  const run = store.getRun(r.runId);
  assert.equal(nodeState(store, r.runId, "g1"), "succeeded");
  assert.equal(store.getCandidate(key).currentRunId, r.runId);
  assert.equal(store.getCandidate(key).stage, "building");
  assert.throws(() => engine.startRun(key, {}), /run-already-active/);
});
test("全链：build(agent)→verify(script)→G2 挂起→pass→deliver→run succeeded + 候选 shipped", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await Promise.resolve(); await Promise.resolve();   // clone + dispatch 微任务排空
  assert.equal(nodeState(store, runId, "build"), "running");
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, runId, "verify"), "running");
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: ["2 passed"] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, runId, "g2"), "waiting");
  assert.equal(store.getCandidate(key).stage, "gating");
  engine.applyGateDecision(runId, "g2", "pass");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  executor.inflight.get(runId + ":deliver").resolve({ ok: true, error: null, artifacts: [] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(store.getRun(runId).status, "succeeded");
  assert.equal(store.getCandidate(key).stage, "shipped");
});
test("verify 回炉超限 → run failed + 候选 held（回炉重臂经引擎自动重派，评审 R1-2）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  for (let i = 0; i < 3; i++) {   // 首跑 + 3 次回炉：verify 每次失败 → build 重臂 ready → 引擎自动重派
    assert.equal(nodeState(store, runId, "verify"), "running");
    executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "red", artifacts: [] }); await drain();
    assert.equal(nodeState(store, runId, "build"), "ready");
    assert.equal(store.getRun(runId).status, "running");
    executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  }
  assert.equal(nodeState(store, runId, "verify"), "running");
  executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "red again", artifacts: [] }); await drain();
  assert.equal(store.getRun(runId).status, "failed");
  assert.equal(store.getCandidate(key).stage, "held");
});
test("rework 重派：build 的 upstream 携带 verify 失败文本（评审 R1-10）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(runId + ":verify").resolve({ ok: false, error: "2 tests failed", artifacts: [] }); await drain();
  assert.equal(nodeState(store, runId, "build"), "running");
  assert.ok(executor.lastArgs.upstream.some((u) => u.node === "verify" && u.text.includes("2 tests failed")));
});
test("clone 失败 → run failed + 候选 held", async () => {
  const { store, engine } = setup({ failClone: true });
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(store.getRun(runId).status, "failed");
  assert.equal(store.getCandidate(key).stage, "held");
});
test("并发上限：concurrency=1 时第二个 run 的节点不被派发，直至首个完成", async () => {
  const { store, engine, executor } = setup({ concurrency: 1 });
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 2, title: "t2", author: "a", labels: [], createdAt: "", updatedAt: "", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  store.setStage("o/r#issue#2", "gating", "");
  const a = engine.startRun("o/r#issue#1", {});
  const b = engine.startRun("o/r#issue#2", {});
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, a.runId, "build"), "running");
  assert.equal(store.getRun(b.runId).nodeStates.build.status, "pending");   // 排队
  executor.inflight.get(a.runId + ":build").resolve({ ok: false, error: "boom", artifacts: [] });   // build 失败→无 rework→run failed，让出名额
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, b.runId, "build"), "running");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: Cannot find module engine.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/engine/engine.mjs`
```js
import { computeReady, gateArrive, applyGateDecision, applyFailure, advanceRun, cancelRun as schedCancelRun } from "./scheduler.mjs";
import { LOOP_V1 } from "../workflows/builtin.mjs";
import { makeRunId } from "../store.mjs";   // 评审 R1-3②：原稿漏 import
export function hasAliveRun(store, key) {
  const c = store.getCandidate(key);
  const run = c?.currentRunId ? store.getRun(c.currentRunId) : null;
  return Boolean(run && ["running", "waiting"].includes(run.status));
}
// 上游摘要（评审 R1-10）：入边（success+rework）源节点的 artifacts[0]/error，各截 500 字符——回炉语境下
// verify 的失败文本随 build 重派进入 prompt；无文本的源被过滤。
const upstreamOf = (run, nodeId) => {
  const inIds = [...new Set((run.snapshot.edges ?? []).filter((e) => e.target === nodeId).map((e) => e.source))];
  return inIds.map((id) => {
    const s = run.nodeStates[id] ?? {};
    const text = s.status === "failed" ? (s.error ?? "") : (s.artifacts?.[0] ?? "");
    return { node: id, text: String(text).slice(0, 500) };
  }).filter((u) => u.text);
};
export function makeEngine({ store, workspace, executor, template = LOOP_V1, now = () => new Date(), concurrencyOf = () => 2 }) {
  const inflight = new Map();   // "runId:nodeId" → cancel
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const syncStage = (key, run) => {
    const stage = run.status === "succeeded" ? "shipped" : run.status === "failed" ? "held" : run.status === "cancelled" ? "gating"
      : run.waitingGate ? "gating" : "building";
    const c = store.getCandidate(key);
    if (c && c.stage !== stage) store.setStage(key, stage, "run " + run.status);
  };
  const engine = {
    hasAliveRun: (key) => hasAliveRun(store, key),
    startRun(key, { taskPackage = null } = {}) {
      if (!store.getCandidate(key)) throw Object.assign(new Error("candidate not found"), { status: 404 });
      if (hasAliveRun(store, key)) throw Object.assign(new Error("run-already-active"), { status: 409 });
      const runId = makeRunId(now);
      const nodeStates = {};
      for (const n of template.nodes) nodeStates[n.id] = { status: n.id === "g1" ? "succeeded" : "pending", attempt: n.id === "g1" ? 1 : 0, reworkCount: 0, error: null, artifacts: [] };
      store.createRun({ id: runId, candidateKey: key, templateId: template.id, templateRevision: template.revision,
        snapshot: clone(template), nodeStates, status: "running", cancelReason: null,
        createdAt: now().toISOString(), updatedAt: now().toISOString(), history: [] });
      syncStage(key, store.getRun(runId));   // run 创建 → 候选 building（design-v2 §8 映射）
      const repo = store.getCandidate(key).repo;
      workspace.ensure({ key, repo }).then(({ dir }) => {
        const run = store.getRun(runId); if (!run || run.status !== "running") return;
        store.appendRunHistory(runId, "workspace.cloned", dir + " remote=gh-https");   // 评审 R1-13：实际 remote 落痕
        engine.dispatch(runId);
      }).catch((err) => {
        const run = store.getRun(runId); if (!run || run.status !== "running") return;
        const msg = "workspace clone: " + String(err?.message ?? err);
        run.nodeStates.build = { ...run.nodeStates.build, status: "failed", error: msg };
        run.status = "failed";                       // 评审 R1-3①：原稿调 engine.applyFailure——引擎对象无此方法
        store.saveRun(run);
        store.appendRunHistory(runId, "workspace.clone-failed", msg);   // 评审 R1-14
        store.setStage(key, "held", "workspace-clone-failed");
      });
      return { runId };
    },
    // 可调度集 = computeReady ∪ ready（评审 R1-1：advanceRun/applyFailure/reject/recover 产出 ready，
    // computeReady 只扫 pending——只调 computeReady 会让这些节点永不被派发）；resume 重派不烧 attempt（R1-11）。
    dispatch(runId, opts = {}) {
      const resume = opts.resume === true; const resumeSeq = opts.resumeSeq ?? 0;
      const run0 = store.getRun(runId);
      if (!run0 || ["succeeded", "failed", "cancelled"].includes(run0.status)) return;
      let run = run0;
      let guard = 16;
      while (inflight.size < concurrencyOf() && guard-- > 0) {
        const alive = Object.keys(run.nodeStates).filter((id) => run.nodeStates[id].status === "ready");
        const fresh = computeReady(run.snapshot, run.nodeStates);
        const ready = [...new Set([...alive, ...fresh])].filter((id) => !inflight.has(runId + ":" + id));
        if (ready.length === 0) break;
        const nodeId = ready[0];
        const node = run.snapshot.nodes.find((n) => n.id === nodeId);
        if (node.type === "gate") {
          run = gateArrive(run, nodeId); store.saveRun(run); syncStage(run.candidateKey, run); continue;
        }
        const ns = { ...run.nodeStates, [nodeId]: resume
          ? { ...run.nodeStates[nodeId], status: "running" }   // 评审 R1-11：恢复重派保持 attempt（防烧穿预算）
          : { ...run.nodeStates[nodeId], status: "running", attempt: (run.nodeStates[nodeId]?.attempt ?? 0) + 1 } };
        run = { ...run, nodeStates: ns }; store.saveRun(run);
        const taskPackage = store.getCandidate(run.candidateKey)?.taskPackage ?? null;
        const upstream = node.type === "agent" ? upstreamOf(run, nodeId) : [];
        const job = node.type === "agent"
          ? executor.runAgentNode({ run, node, cwd: workspace.dirOf(run.candidateKey), taskPackage, upstream, resume, resumeSeq })
          : executor.runScriptNode({ run, node, cwd: workspace.dirOf(run.candidateKey) });
        inflight.set(runId + ":" + nodeId, job.cancel);
        job.promise.then((result) => { inflight.delete(runId + ":" + nodeId); engine.onNodeDone(runId, nodeId, result); })
          .catch((err) => { inflight.delete(runId + ":" + nodeId); engine.onNodeDone(runId, nodeId, { ok: false, error: String(err?.message ?? err), artifacts: [] }); });
      }
    },
    onNodeDone(runId, nodeId, result) {
      const run0 = store.getRun(runId);
      if (!run0 || ["succeeded", "failed", "cancelled"].includes(run0.status)) return;   // 迟到结果忽略
      let run = result.ok
        ? { ...run0, nodeStates: { ...run0.nodeStates, [nodeId]: { ...run0.nodeStates[nodeId], status: "succeeded", artifacts: result.artifacts ?? [] } } }
        : applyFailure(run0, nodeId, result.error);
      store.saveRun(run);
      syncStage(run.candidateKey, run);
      run = advanceRun(store.getRun(runId));
      store.saveRun(run);
      syncStage(run.candidateKey, run);
      engine.dispatch(runId);
      engine.dispatchAlive();   // 并发名额释放后全局再派发（本回调只知道自己的 run；其余存活 run 排队的节点由这里拾起）
    },
    dispatchAlive() { for (const r of store.listRuns()) if (r.status === "running") engine.dispatch(r.id); },
    applyGateDecision(runId, nodeId, decision, overrideTarget = null) {
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      const next = applyGateDecision(run, nodeId, decision, overrideTarget);
      store.saveRun(next); syncStage(next.candidateKey, next); engine.dispatch(runId);
      return next;
    },
    cancelRun(runId, reason) {
      for (const [k, cancel] of inflight) if (k.startsWith(runId + ":")) cancel();
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      const next = schedCancelRun(run, reason);
      store.saveRun(next); syncStage(next.candidateKey, next);
    },
    retryNode(runId, nodeId) {
      const run = store.getRun(runId); if (!run) throw Object.assign(new Error("run not found"), { status: 404 });
      if (!["failed", "cancelled"].includes(run.status)) throw Object.assign(new Error("retry-requires-failed-or-cancelled"), { status: 409 });   // 评审 R1-9：D7 承诺两态
      const node = (run.snapshot.nodes ?? []).find((n) => n.id === nodeId) ?? {};
      const s = run.nodeStates[nodeId];
      if (!s || !["failed", "cancelled"].includes(s.status)) throw Object.assign(new Error("retry-requires-failed"), { status: 409 });
      const attempt = (s.attempt ?? 0) + 1;
      if (attempt > (node.maxAttempts ?? 1)) throw Object.assign(new Error("attempt-exhausted"), { status: 409 });
      const ns = { ...run.nodeStates, [nodeId]: { ...s, status: "ready", attempt, error: null } };
      if (run.status === "cancelled") for (const [id, st] of Object.entries(ns)) if (st.status === "cancelled") ns[id] = { ...st, status: "pending" };   // 取消态重试：其余 cancelled 节点回 pending 续跑
      const next = { ...run, nodeStates: ns, status: "running", cancelReason: null, waitingGate: null };   // 评审 R1-4：failed/cancelled run 重试须回 running，否则 dispatch 终态守卫直接 return
      store.saveRun(next); syncStage(next.candidateKey, next); engine.dispatch(runId);
    },
    recover() {
      const resumed = [];
      let seq = 0;
      for (const run of store.listRuns()) {
        if (!["running", "waiting"].includes(run.status)) continue;
        let touched = false; const ns = { ...run.nodeStates };
        for (const [id, s] of Object.entries(ns)) if (s.status === "running") { ns[id] = { ...s, status: "ready" }; touched = true; }
        if (touched) { const next = { ...run, nodeStates: ns }; store.saveRun(next); store.appendRunHistory(run.id, "resume.interrupted", "host restart"); resumed.push(run.id); }
        engine.dispatch(run.id, { resume: true, resumeSeq: ++seq });   // 评审 R1-11：resume 重派不烧 attempt，sessionId 追加 :resume<seq> 防撞
      }
      return resumed;
    },
  };
  return engine;
}
```

  cancelRun 的调度器 cancelRun 以 `import { cancelRun as cancelRunRef } from "./scheduler.mjs"` 引入（本骨架里的占位行替换为直接调用）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（engine 段含「全链」用例的微任务排空节奏如不稳，允许在 settle 后再补一轮 `await Promise.resolve()`；不许改 sleep/真实定时器）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 执行环驱动（start/dispatch/stage 同步/并发上限）"`

### Task 7: 取消链与 retry（engine 补齐 + 独立钉例）

- 目标：cancelRun 全链（在途 cancel→scheduler cancel→saveRun→候选 gating）；retryNode 语义钉例（attempt 预算与 409）。
- 涉及文件：Modify `src/engine/engine.mjs`（若 T6 已含则本任务为钉例补全）；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: Task 6 makeEngine、scheduler.cancelRun/applyGateDecision
  - Produces: 钉例①取消：agent 在途时 engine.cancelRun → executor cancel 被调用 + run cancelled + 候选 gating；钉例②retry：failed run → retryNode → attempt+1 → ready 且 **run.status 回 running**（评审 R1-4：否则 dispatch 终态守卫直接 return）；钉例③attempt 超限 409 attempt-exhausted；钉例④cancelled run retry：cancelled 节点回 pending、run 回 running（评审 R1-9 / D7 两态承诺）
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 追加失败测试
```js
test("cancelRun：在途 agent 收到 cancel，run cancelled + 候选 gating", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  const entry = executor.inflight.get(runId + ":build");   // 先取后取消（评审 R1-7③：fake cancel 同步删键）
  engine.cancelRun(runId, "user");
  assert.equal(entry.cancelled, true);
  assert.equal(store.getRun(runId).status, "cancelled");
  assert.equal(store.getCandidate(key).stage, "gating");
});
test("cancelled run 的 retry：cancelled 节点回 pending 续跑（评审 R1-9 / D7）", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  const entry = executor.inflight.get(runId + ":build");
  engine.cancelRun(runId, "user");
  entry.resolve({ ok: false, error: "cancelled" }); await drain();   // 迟到结果被终态守卫忽略
  engine.retryNode(runId, "build");   // cancelled run + cancelled 节点 → 重试续跑
  await drain();
  assert.equal(store.getRun(runId).status, "running");
  assert.equal(store.getRun(runId).nodeStates.build.status, "running");
});
test("retryNode：failed 节点 attempt+1 重投；超限 409", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await Promise.resolve(); await Promise.resolve();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] });
  await Promise.resolve(); await Promise.resolve();
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] });
  await Promise.resolve(); await Promise.resolve();
  engine.applyGateDecision(runId, "g2", "pass");
  await Promise.resolve(); await Promise.resolve();
  executor.inflight.get(runId + ":deliver").resolve({ ok: false, error: "push rejected", artifacts: [] });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(store.getRun(runId).status, "failed");
  engine.retryNode(runId, "deliver");   // deliver maxAttempts:2，attempt 1→2 ≤ 2
  await Promise.resolve(); await Promise.resolve();
  assert.equal(nodeState(store, runId, "deliver"), "running");
  assert.throws(() => { store.saveRun({ ...store.getRun(runId), nodeStates: { ...store.getRun(runId).nodeStates, deliver: { status: "failed", attempt: 2, reworkCount: 0, error: "again", artifacts: [] } } }); engine.retryNode(runId, "deliver"); }, /attempt-exhausted/);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: 若 T6 已含则可能直接绿——本任务允许「测试先行但首跑即绿」，此时如实标注并补跑一遍红演：临时把 retryNode 的 attempt 比较改 `>=` 放回旧实现（外部副本或临时改回）确认红，再复原。以台账记录为准。
- [ ] Step 2: 确认红/绿状态（红则继续；绿则按上句红演）。
- [ ] Step 3: 按需补实现（T6 骨架已含 retryNode/cancelRun 主体；此步只补遗漏分支）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 取消链与节点重试钉例"`

### Task 8: 恢复扫描 recover()

- 目标：宿主重启后 running→ready（不烧 attempt）+ `resume.interrupted` 留痕 + 重新派发。
- 涉及文件：Modify `src/engine/engine.mjs`（T6 骨架已含；本任务钉例）；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: Task 6 recover 骨架
  - Produces: 钉例：手工构造 run（build=running、run=running，currentRunId 指针在位）→ `simulateRestart()` 清空在途（评审 R1-17：测试钩子，无生产调用方）→ `recover()` 返回含该 runId → build=ready 且 attempt 不变（重派走 dispatch({resume:true})，评审 R1-11：不烧 attempt）→ run.history 末条 `resume.interrupted` → 重新派发后 build=running 且 executor 收到 `resume:true`
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 追加失败/验证测试
```js
test("recover：running→ready 不烧 attempt + 留痕 + 重新派发", async () => {
  const { store, engine, executor } = setup();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  const before = store.getRun(runId).nodeStates.build.attempt;
  engine.simulateRestart();   // 模拟宿主重启：丢弃内存 in-flight（评审 R1-17：测试代码显式调用）
  const resumed = engine.recover();
  assert.ok(resumed.includes(runId));
  assert.equal(store.getRun(runId).nodeStates.build.status, "ready");
  assert.equal(store.getRun(runId).nodeStates.build.attempt, before);      // 评审 R1-11：恢复重派不烧 attempt
  assert.equal(store.getRun(runId).history.at(-1).event, "resume.interrupted");
  await drain();
  assert.equal(store.getRun(runId).nodeStates.build.status, "running");    // 重新派发（resume 路径）
  assert.equal(store.getRun(runId).nodeStates.build.attempt, before);      // 仍不烧
  assert.equal(executor.lastArgs.resume, true);
});
```
  注意：recover 在「同一引擎实例」上测试时，原 in-flight 还在内存里——recover 前需清空 in-flight（引擎实例的模拟重启）。实现上 recover 不依赖 in-flight 清空即正确（running 节点重置 ready，原 job 迟到结果被 onNodeDone 终态守卫忽略的前提是 run 终态——此处 run 未终态，迟到结果会落成 succeeded，测试将失真）。**处置**：makeEngine 增 `simulateRestart()`（测试钩子：清空 in-flight）或 recover 内先把 running 节点的新派发延后到 onNodeDone 守卫之外——以 `simulateRestart()` 为准写进 Produces（测试专用，无生产调用方）。
- Run: `npm test 2>&1 | tail -6` — Expected: simulateRestart 不是函数（或断言红）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——makeEngine 返回对象增 `simulateRestart: () => inflight.clear()`；测试在 recover 前调用。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 宿主重启恢复扫描（resume.interrupted）"`

### Task 9: 路由四条 + postGate 别名 + host 装配

- 目标：POST run 四路由 + postGate 别名接引擎；host 侧 makeExecWorld/workspace/executor/engine 装配与 recover 一次性扫描。
- 涉及文件：Modify `src/handlers.mjs`、`src/host.mjs`；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 6/7/8 engine 全导出、workspace/executor 构造器、buildTaskPackage
  - Produces: `makeHandlers({ …, engine })`（缺省 null）；`postRunStart({key})`：401 auth-required → 404 → **409 run-already-active（先于闸门校验——评审 R1-5/D7：二次 start 时 stage 已 building，若闸门校验前置会错报 gate-requires-gating）** → 409 gate-requires-gating（须 gating）→ buildTaskPackage + **setGate(G1 pass, pkg 落库——评审 R1-16：引擎读 candidate.taskPackage，不落库则 agent 静默无契约执行)** + setStage(building) + startRun → `{ok, taskPackage, runId, workspace:"cloning"}`；`postRunGate({runId,nodeId,decision,note,targetNode})` → engine.applyGateDecision → `{ok}`；`postRunCancel({runId,reason})` → engine.cancelRun → `{ok}`；`postRunRetry({runId,nodeId})` → engine.retryNode → `{ok}`；engine 为 null 时四方法返回 `fail("engine-not-wired", 503)`；postGate G1 pass 分支在 engine 在位时追加 startRun 并回 `{ok, taskPackage, runId}`（engine null 保持 v1 形状，存量测试不受扰）；host.mjs：inject 增 `"approval"`、`"workingDirectory"`（评审 R1-12，见文件结构），`makeExecWorld(ctx, dir)`（createAgent 用 meta.cwd=dir + setup 选模同 makeTriage + `setPolicy:(a,p)=>ctx.approval.setPolicy(a,p)` + `setWorkingDirectory:(a,c)=>ctx.workingDirectory.set(a,c)`——inject 已声明故直调）；buildRuntime 内 `const workspace = makeWorkspace({dataDir: dir, ghBin: join(dir,"bin","gh"), execFile});` `const executor = makeExecutor({ world: makeExecWorld(ctx, dir), spawn: spawnCb, ghBin: join(dir,"bin","gh") });` `const engine = makeEngine({ store, workspace, executor, concurrencyOf: () => store.getSettings().engineConcurrency });` 传 handlers；路由表增四条；`engine.recover()` 在 apply 内 effect 装配尾部调用一次；保留期清扫：apply 内 ctx.interval 每日一次 `workspace.sweep({ activeKeys: 存活 run 的候选键集, retentionDays: store.getSettings().workspaceRetentionDays })`
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: 失败测试（handlers.test.mjs；engine 用真 makeEngine + fake workspace/executor——同 engine.test 范式，或直接注入真引擎走全链）
```js
test("run 路由：start 别名链/409/gate/cancel/retry/engine 缺省 503", async () => {
  const store = openStore(); login(store); seed(store);
  store.setRepoFacts("o/r", { defaultBranch: "trunk", cloneUrl: "git@github.com:o/r.git" });
  const engine = makeEngine({ store, workspace: fakeWorkspace(), executor: fakeExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "gate-requires-gating");
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postRunStart({ key: "o/r#issue#1" });
  assert.ok(r.runId); assert.equal(r.workspace, "cloning"); assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.equal((await h.postRunStart({ key: "o/r#issue#1" })).error, "run-already-active");
  const drain = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  await drain();
  executor.inflight.get(r.runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  executor.inflight.get(r.runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.equal(store.getRun(r.runId).nodeStates.g2.status, "waiting");
  assert.equal((await h.postRunGate({ runId: r.runId, nodeId: "g2", decision: "pass" })).ok, true);
  await drain();
  assert.equal((await h.postRunRetry({ runId: r.runId, nodeId: "deliver" })).error, "retry-requires-failed");
  assert.equal((await h.postRunCancel({ runId: r.runId, reason: "test" })).ok, true);
  assert.equal(store.getCandidate("o/r#issue#1").stage, "gating");
  const noEngine = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noEngine.postRunStart({ key: "o/r#issue#1" })).error, "engine-not-wired");
});
test("postGate 别名：G1 pass 追加 runId 并创建 run", async () => {
  const store = openStore(); login(store); seed(store);
  const engine = makeEngine({ store, workspace: fakeWorkspace(), executor: fakeExecutor(), concurrencyOf: () => 2 });
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine });
  await h.postStage({ key: "o/r#issue#1", stage: "gating" });
  const r = await h.postGate({ key: "o/r#issue#1", gate: "G1", decision: "pass", note: "" });
  assert.ok(r.taskPackage); assert.ok(r.runId);
  assert.equal(store.getRun(r.runId).nodeStates.g1.status, "succeeded");
  assert.equal(store.getCandidate("o/r#issue#1").stage, "building");
});
```
  文件顶部静态补 import：`makeEngine`、`makeWorkspace`、`makeExecutor` 三行；`fakeWorkspace`（ensure 立即成功/dirOf 固定/sweep 空实现）与 `fakeExecutor`（inflight Map + 手工 resolve，cancel 记 `entry.cancelled`）按 engine.test.mjs 既有夹具形态**内联定义**在本文件（仓内惯例：无共享 test-utils，M1 先例各自内联）。
- Run: `npm test 2>&1 | tail -6` — Expected: postRunStart 等不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现（handlers 四方法 + engine 参 + postGate 别名分支；host.mjs 按 Produces 装配——world 的 createAgent 复用 makeTriage 的 resolveTriageSelection 选模逻辑，模型来源=宿主默认；路由表四行；recover 调用与清扫 interval）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(api): run 四路由与 postGate 别名"`

### Task 10: summarizeRun.error + client api + stripCells 着色

- 目标：runs 摘要带失败原因；客户端四个 run 端点；工作流条环内 chip 按在途计数着色。
- 涉及文件：Modify `src/engine/scheduler.mjs`、`src/client/api.mjs`、`src/client/logic.mjs`；Test `test/scheduler.test.mjs`、`test/logic.test.mjs`
- 接口契约：
  - Consumes: Task 6 summarizeRun、M1 stripCells、state.runs 摘要
  - Produces: ①`summarizeRun` 增 `error`（首个 failed 节点 error ?? null）——scheduler.test 两处 deepEqual **加键更新**（`error: null`）；②api.mjs 增 `runStart(key)`、`runGate(runId, nodeId, decision, note)`、`runCancel(runId, reason)`、`runRetry(runId, nodeId)`；③`stripCells({candidates, workflow, runs})` loop chip 增 `count`（runs 中 currentNodeIds 含该节点的 run 数）与 `dim = count === 0`（runs 缺省 []，M1 既有「恒灰」用例不变绿）
- 验证范围：`npm test`（scheduler/logic 段）

- [ ] Step 1: 失败测试
  - scheduler.test.mjs：ready 化例与终态例的 summarizeRun deepEqual 各加 `error: null`（加键更新）；另增一小用例：
```js
test("summarizeRun.error：首个 failed 节点的 error", () => {
  assert.equal(summarizeRun({ id: "r", candidateKey: "k", status: "failed", waitingGate: null,
    nodeStates: { a: { status: "succeeded" }, b: { status: "failed", error: "boom" } } }).error, "boom");
  assert.equal(summarizeRun({ id: "r", candidateKey: "k", status: "succeeded", waitingGate: null,
    nodeStates: { a: { status: "succeeded" } } }).error, null);
});
```
  - logic.test.mjs：
```js
test("stripCells：环内 chip 按 runs 在途计数着色", () => {
  const out = stripCells({ candidates: [], workflow: { templates: [LOOP_V1] },
    runs: [{ currentNodeIds: ["build"] }, { currentNodeIds: ["build", "verify"] }] });
  const byId = Object.fromEntries(out.loop.map((n) => [n.id, n]));
  assert.equal(byId.build.count, 2);
  assert.equal(byId.build.dim, false);
  assert.equal(byId.verify.count, 1);
  assert.equal(byId.g1.dim, true);
  assert.deepEqual(stripCells({ candidates: [], workflow: { templates: [LOOP_V1] } }).loop[0].dim, true);   // 无 runs 兼容
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: summary 缺 error 键 / stripCells count undefined → 红。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——summarizeRun 增 error 提取；api.mjs 四行；stripCells loop 投影增 count/dim。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(client): runs 摘要 error 与工作流条着色"`

### Task 11: actions 行内 run 区块 + G2 激活 + i18n 键（含 F1）

- 目标：用户可见的最小执行 UI；文案与语义同步（文案面审计前置达标）。
- 涉及文件：Modify `src/client/components/actions.mjs`、`src/client/locale/zh-CN.mjs`、`en.mjs`、`src/client/components/workbench.mjs`（F1 注释）；Test `test/i18n.test.mjs`（既有 parity 自动覆盖）、`test/logic.test.mjs`
- 接口契约：
  - Consumes: Task 10 api/runStart 等、state.runs 摘要、候选 currentRunId
  - Produces: ①新 i18n 键（双字典同集，8 键）：`actions.cancelRun`、`actions.retryRun`、`run.status.running/waiting/succeeded/failed/cancelled`、`run.workspaceCloning`②rowActions 展开区：候选 currentRunId → state.runs 摘要渲染状态行（`t("run.status."+status)` + currentNodeIds join）+ error 行（有则显）+ 取消/重试按钮（failed 节点才亮重试；waiting/running 才亮取消）③G2/G3 按钮从字面量禁用（actions.mjs:135-136 第三参恒 true——评审 R1-19 表述更正）改为：G2 在 `runBlock(c, runs)?.waitingGate === "g2"` 时激活 pass/reject（走 api.runGate），G3 保持禁用（M3 发版分区）④strip 调用（actions.mjs:109）增传 `runs: state?.runs`（评审 R1-15：着色数据源，缺此传参着色静默失效）⑤G1 按钮 behavior 不变（走 candidate/gate 别名）⑥workbench:159 注释改「工作流条」
- 验证范围：`npm test`（i18n parity + logic）+ `npm run build`

- [ ] Step 1: 失败测试——logic.test.mjs 增「run 区块数据选择」纯函数（新增 `runBlock(candidate, runs)`：返回 `{status, waitingGate, currentNodeIds, error} | null`——放 logic.mjs，供 actions 消费；测试：currentRunId 命中/未命中/无 run 三态）＋ i18n parity 由既有 locale-parity.test 自动红（只加了一侧字典时）。
- Run: `npm test 2>&1 | tail -6` — Expected: runBlock 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——logic.mjs 增 runBlock；locale 两文件各增 8 键（zh 文案：取消执行/重试该节点/执行中/待你放行/已交付/失败/已取消/工作区克隆中；en 对应 Cancel run/Retry node/Running/Waiting for you/Delivered/Failed/Cancelled/Cloning workspace）；actions.mjs rowActions 追加 run 区块与 G2 激活（`const run = runBlock(c, state?.runs ?? [])`）；workbench:159 注释改。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -1` — Expected: 全绿（含 parity）+ 双包构建成功。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(ui): 行内 run 区块/G2 激活/i18n 键（含 F1 注释清理）"`

### Task 12: 最终验证与冒烟

- 目标：收口验证；装机冒烟按需。
- 验证范围：全量。
- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -14`
  Expected: 构建双包成功、全量测试绿（预计 ≥ 128 pass：M1 106 + 新增 ≥ 22）、提交序列为 docs + T1–T11。
- [ ] Step 2: （可选，装机场景）049 runbook scratch profile + `dsh plugin --profile web add -w /home/ubuntu/workspace/dsh-l`：面板行内 run 区块可见；无 LLM 凭据时 G1 放行 → build 节点 fail-closed（`MISSING_CREDENTIAL` 同 v1 判例）→ run failed + 候选 held——**预期行为非缺陷**；生效探针=GET /dsh-l/state 的 runs 摘要与构建指纹（HTTP 200 不作数）；executionPolicy:"auto" 的 build 放行后宿主侧 `approval/policy` durable 事件（log-only）可查即为 setPolicy 生效证据（评审 R1-12：inject 已声明，宿主服务缺失会在加载期抛错而非静默降级）。
- [ ] Step 3: 停下交评审（章程同 M1：独立评审 Agent + 台账 + 最多 5 轮）。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务编号顺序执行；每任务跑完它定义的验证再进下一个；docs 变更独立 commit。
- 测试桩只走注入：world/execFile/spawn/fs 全可注入，单测不真实 spawn gh/git/agent、不出网；fake executor 的「微任务排空」节奏如遇不稳定，允许增加 `await Promise.resolve()` 轮次，禁改 sleep/真实定时器。
- main 分支直接工作是本仓惯例（M1 先例）；遇阻、重复失败或计划与仓库现实不符：立即停下说明，不猜。
- 全部任务完成后运行最终验证并输出修改摘要，然后停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -14`
- Expected: 构建双包成功（新指纹）；全量测试绿（106 存量全数保持 + 新增用例；测试文件 14 → 17：新增 workspace/executor/engine 三文件）；提交序列 docs + Task 1–11。
- 生效探针：构建指纹变化（区别于 M1 的 010a12dcb616）；`GET /dsh-l/state` 的 `runs` 摘要含 `error` 字段。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。M3（看板/待我确认/飞书/角标）、M4（Role/任务包 v2/devflow-lite）在本计划验收后另立。
