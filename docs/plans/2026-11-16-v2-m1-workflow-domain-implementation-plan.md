# dsh-l v2 M1（域模型双层化）实施计划

## 目标

- 把 store 从「候选单层 v1」升级为「候选 + 执行双层 v2」：store schema version 2（候选增 currentRunId/release/delivery 字段、新增 runs 块、v1→v2 无损迁移），新增工作流模板模块（内置 `loop-v1` + 用户文件模板 + schema 校验 + revision 指纹）与 DAG 调度器纯函数集，`/dsh-l/state` 暴露模板 meta 与 run 摘要，「管线条」升级为模板驱动只读渲染的工作流条。
- 不含执行器（ctx.agents/script 子进程）、不含 run 路由、不含看板/待我确认——它们是 M2/M3（docs/design-v2.md §11）。

## 架构快照

- 双层模型：候选（候选层，stage 枚举不变）→ 执行（run 层，锁模板快照 + 节点状态机）。模板不进 store：内置只读常量 + 数据目录 `workflows/*.json`，store 的 run 只存 `templateId+revision+snapshot`。
- 调度器（`src/engine/scheduler.mjs`）是纯函数集：输入 (snapshot, nodeStates, 事件) 输出新 nodeStates/run 形状，不碰网络与子进程（执行器 M2 才接）。
- 就绪规则：节点 ready ⇔ 全部 success 入边源节点 succeeded；gate 到达即 waiting（只闸必经路径）；rework 边在源失败时激活目标重跑并计 reworkCount；`reject` 沿 rejectTarget 回退（目标重置 ready、success 后代非 pending 者全部置 skipped 待重跑——design-v2 §4，重激活规则在 advanceRun）。
- 工作流条：`pipelineStrip` 从硬编码 7 段改为「前环 4 chip（沿用现有 i18n 键）+ 模板节点段（node.name 字面量、M1 全灰）」，无 workflow meta 时回退旧 7 段（向后兼容）。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`（scripts/build-host.mjs + scripts/build-client.mjs → lib/host.js、lib/client.js）。
- `peerDependencies: {"@deepseek-ai/cordis":"^4.0.2"}`；`dsh.engines.dsh ">=0.2.2-rc.1"`；`dsh.bundle.patch: ./cordis.patch.yml`；client `platform:"web", inject:["slots"]`。本计划不改 cordis.patch.yml、不改 package.json exports。
- 测试命令：`npm test`（= `node --test "test/*.test.mjs"`，package.json:15 实测——评审 R9 采纳改正：无 --disable-warning flag）。桩走注入，测试不真实 spawn 子进程/不真实 spawn agent。
- store.json 原子写不变（tmp + renameSync、mode 0o600）；`HISTORY_LIMIT=50`、`INGEST_LOG_LIMIT=50` 不变；run.history 上限 100（FIFO）。
- 术语按 GLOSSARY.md（2026-11-16 版）：工作流/执行/节点/候选/闸门；代码与文案不用 SOP、不用「管线」。
- M1 不发 npm、不 bump version（保持 0.0.1，基线 tag v0.0.1 已锁）、无新增 i18n 键（环内节点用 node.name 字面量）。
- 退出码卫生：验证命令经管道显示时加 `set -o pipefail`。
- 命令环境：Linux bash，工作目录 `/home/ubuntu/workspace/dsh-l`。

## 输入工件

- 设计：docs/design-v2.md（§2 store schema、§3 模板、§4 调度、§8 UI、§11 里程碑）；ADR-0002；GLOSSARY.md。
- 参照实现：src/store.mjs（迁移先例：`doc.repos ??= {}` 就地补齐风格）、src/handlers.mjs `buildTaskPackage`（v1 golden 形状）、src/client/components/pipelineStrip.mjs + src/client/logic.mjs `stageCounts`。

## 文件结构与职责

- Create: `src/workflows/validate.mjs` — validateTemplate（schema 校验）+ computeRevision（规范化 JSON 的 sha1 指纹）
- Create: `src/workflows/builtin.mjs` — LOOP_V1 只读常量（唯一事实源）
- Create: `src/workflows/loader.mjs` — loadTemplates（内置 + 数据目录用户模板聚合，meta 投影不含 script）
- Create: `src/engine/scheduler.mjs` — 纯函数调度集（就绪/闸门/回炉/驳回/终态/摘要/后代）
- Create: `test/workflows.test.mjs`、`test/scheduler.test.mjs`
- Modify: `src/store.mjs` — doc.version 2 迁移、候选增字段、runs CRUD、makeRunId
- Modify: `src/handlers.mjs` — makeHandlers 增 workflowCatalog 参；getState 增 runs 摘要与 workflow meta
- Modify: `src/host.mjs` — 构造 loadTemplates 并传入 makeHandlers（anchor：第 41–51 行 store/handlers/路由装配段）
- Modify: `src/client/logic.mjs` — 增 stripCells 纯函数
- Modify: `src/client/components/pipelineStrip.mjs` — 改用 stripCells 渲染（前环 + 环内两段 + 回退）
- Modify: `src/client/components/actions.mjs` — renderStrip 调用点（第 109 行 `strip(container,{t,state})`）增传 `workflow: state?.workflow`（评审 R8 采纳：grep 实测 renderStrip 唯一调用点在 actions.mjs；workbench.mjs:132-133 经 `extend?.strip?.(strip,{t,state})` 已整包透传 state，无需改动）
- Modify: `test/store.test.mjs`、`test/handlers.test.mjs`、`test/logic.test.mjs` — 各自增量用例
- 不动：src/http.mjs（复用 /dsh-l/state 路由）、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs

任务间接口依赖：T1（迁移/候选字段）→ T2（runs CRUD 用 T1 的 doc 结构）→ T9（state 用 T2 API）；T3（validate/revision）→ T4（builtin 用 T3）→ T5（loader 用 T3+T4）；T6→T7→T8（scheduler 递进，同文件）；T9/T10 消费 T2/T5/T8。执行顺序按编号。

## 任务清单

### Task 1: store.mjs — v2 迁移与候选增字段

- 目标：打开 v1 旧档无损升到 version 2；候选带 currentRunId/release/delivery。
- 涉及文件：Modify `src/store.mjs`；Test `test/store.test.mjs`
- 接口契约：
  - Consumes: 既有 `createStore`（第 26–32 行迁移区）、`upsertCandidates`（第 56–74 行）
  - Produces: doc.version===2；`doc.runs:{}`；候选字段 `currentRunId:null`、`release:null`、`delivery:null`（新候选与迁移存量都有）
- 验证范围：`npm test`（store 段）

- [ ] Step 1: 在 `test/store.test.mjs` 末尾追加失败测试
```js
test("v1 旧档迁移：version 2 + runs 空 + 候选补新字段", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-mig-"));
  const file = join(dir, "store.json");
  const v1 = { version: 1, watch: { repos: ["a/b"], updatedAt: "2026-11-01T00:00:00Z" },
    candidates: { "a/b#issue#1": { key: "a/b#issue#1", repo: "a/b", type: "issue", number: 1,
      title: "t", author: "a", labels: [], createdAt: "", updatedAt: "", url: "", meta: {}, pull: null,
      bodyExcerpt: "", stage: "triaged", triage: null, gates: { G1: null, G2: null, G3: null },
      taskPackage: null, history: [] } } };
  writeFileSync(file, JSON.stringify(v1));
  const s = createStore({ filePath: file });
  const doc = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(doc.version, 2);
  assert.deepEqual(doc.runs, {});
  const c = s.getCandidate("a/b#issue#1");
  assert.equal(c.currentRunId, null);
  assert.equal(c.release, null);
  assert.equal(c.delivery, null);
  const s2 = createStore({ filePath: file });   // 二次打开：迁移幂等（评审 R1 采纳）
  assert.equal(JSON.parse(readFileSync(file, "utf8")).version, 2);
  assert.equal(s2.getCandidate("a/b#issue#1").currentRunId, null);
});
test("新候选与新档自带 v2 字段", () => {
  const s = open();
  s.upsertCandidates([raw(9)]);
  const c = s.getCandidate(candidateKey("iasiv5/dsh-skins", "issue", 9));
  assert.equal(c.currentRunId, null); assert.equal(c.release, null); assert.equal(c.delivery, null);
});
```
并在文件头 import 区补 `readFileSync`（`node:fs`）。
- Run: `npm test 2>&1 | tail -20`
- Expected: 新增两个 test 失败（currentRunId undefined / version 仍 1），既有用例全绿。
- [ ] Step 2: 确认失败信号（上方输出含 `AssertionError`，且失败仅落在新用例）
- [ ] Step 3: 最小实现——`src/store.mjs`
```js
const emptyDoc = (now) => ({ version: 2, runs: {}, /* …其余同现状… */ });
// 迁移块置放：const persist 定义（现 store.mjs:33-38）之后、const need 之前——persist 为 const 声明，
// 留在 29-32 行旧迁移区会因 TDZ 调不到 persist()（评审 R1 采纳·方案①：迁移落盘）。
if (doc.version !== 2) {
  doc.version = 2;
  doc.runs ??= {};
  for (const c of Object.values(doc.candidates)) {
    c.currentRunId ??= null; c.release ??= null; c.delivery ??= null;
  }
  persist();   // 一次性、幂等；v2 起「打开旧档」会重写 store.json（tmp+rename 原子写，0o600 不变）——
               // 相对 v1 先例（打开路径不落盘）的行为变更；version===2 后的打开不再触发任何写。
}
// upsertCandidates 新候选分支的字段列表（gates 行附近）增：
currentRunId: null, release: null, delivery: null,
```
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（含既有迁移用例）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(store): v2 迁移与候选增字段（design-v2 §2）"`

### Task 2: store.mjs — runs CRUD 与 makeRunId

- 目标：store 具备执行层读写能力；调度器与 handler 只经此 API 触达 run。
- 涉及文件：Modify `src/store.mjs`；Test `test/store.test.mjs`
- 接口契约：
  - Consumes: Task 1 的 doc.runs 与候选字段
  - Produces: `makeRunId(now?)` → `"run-<epochMs>-<4hex>"`；`createRun(run)`（校验 id 唯一、candidateKey 存在；置候选 currentRunId；候选 history 记 `run.created`）；`getRun(id)`（null 安全）；`listRuns()`；`saveRun(run)`（刷新 updatedAt 后整体落盘）；`appendRunHistory(id, event, detail)`（上限 100 FIFO）
- 验证范围：`npm test`（store 段）

- [ ] Step 1: 追加失败测试
```js
test("runs CRUD：createRun 指针与留痕、saveRun 刷新、history FIFO", () => {
  const s = open(); s.upsertCandidates([raw(3)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 3);
  const id = makeRunId();
  assert.match(id, /^run-\d+-[0-9a-f]{4}$/);
  s.createRun({ id, candidateKey: key, templateId: "loop-v1", templateRevision: "r1",
    snapshot: { nodes: [], edges: [] }, nodeStates: {}, status: "running",
    cancelReason: null, createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", history: [] });
  assert.equal(s.getCandidate(key).currentRunId, id);
  const run = s.getRun(id);
  s.saveRun({ ...run, status: "succeeded" });
  assert.equal(s.getRun(id).status, "succeeded");
  for (let i = 0; i < 102; i++) s.appendRunHistory(id, "e" + i, "");
  assert.equal(s.getRun(id).history.length, 100);
  assert.equal(s.getRun(id).history[99].event, "e101");
  assert.equal(s.getRun("nope"), null);
  assert.throws(() => s.createRun({ id, candidateKey: key }), /exists/);
});
```
import 区补 `makeRunId`。注意：createRun 后候选 history 消耗 1 条，与 102 次 appendRunHistory 无冲突（不同容器）。
- Run: `npm test 2>&1 | tail -20` — Expected: 新用例失败（makeRunId 不是函数）。
- [ ] Step 2: 确认失败信号（`makeRunId is not a function` 或 import 报错）。
- [ ] Step 3: 最小实现——store.mjs
```js
import { randomBytes } from "node:crypto";
export const makeRunId = (now = () => new Date()) =>
  "run-" + now().getTime() + "-" + randomBytes(2).toString("hex");
const RUN_HISTORY_LIMIT = 100;
// 返回对象内追加：
makeRunId,
createRun(run) {
  if (doc.runs[run.id]) throw Object.assign(new Error("run exists: " + run.id), { status: 409 });
  const c = need(run.candidateKey);
  doc.runs[run.id] = run;
  c.currentRunId = run.id;
  touch(c, "run.created", run.id);
  persist();
},
getRun: (id) => doc.runs[id] ?? null,
listRuns: () => Object.values(doc.runs),
saveRun(run) { run.updatedAt = now().toISOString(); doc.runs[run.id] = run; persist(); },   // 评审 R11：用注入 now
appendRunHistory(id, event, detail = "") {
  const run = doc.runs[id];
  if (!run) throw Object.assign(new Error("run not found: " + id), { status: 404 });
  run.history.push({ at: now().toISOString(), event, detail });   // 评审 R11：用注入 now
  if (run.history.length > RUN_HISTORY_LIMIT) run.history.splice(0, run.history.length - RUN_HISTORY_LIMIT);
  persist();
},
```
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(store): runs CRUD 与 makeRunId（design-v2 §2）"`

### Task 3: workflows/validate.mjs — schema 校验与 revision 指纹

- 目标：模板形状有唯一权威校验器；指纹是 run 锁快照的引用键。
- 涉及文件：Create `src/workflows/validate.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Consumes: design-v2 §3 模板形状（nodes: agent|script|gate；gate 必带 gateId；edges kind success|rework；rework 边的 target 节点需 maxReworks>0 语义由 builtin 保证，校验器只查结构与引用完整性）
  - Produces: `validateTemplate(t)` → `{ ok, errors: string[] }`；`computeRevision(t)` → 40 位 hex（规范化 JSON＝剔除 revision 字段后稳定序列化的 sha1）
- 验证范围：`npm test`（workflows 段）

- [ ] Step 1: 新建 `test/workflows.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateTemplate, computeRevision } from "../src/workflows/validate.mjs";
const okT = { id: "t1", name: "T1", version: 1, builtin: false,
  nodes: [ { id: "g1", name: "G1", type: "gate", gateId: "G1", rejectTarget: null },
           { id: "a", name: "build", type: "agent", executionPolicy: "ask" },
           { id: "s", name: "verify", type: "script", scriptLanguage: "shell", script: "exit 0" } ],
  edges: [ { id: "e1", source: "g1", target: "a", kind: "success" },
           { id: "e2", source: "a", target: "s", kind: "success" } ] };
test("合法模板通过校验", () => assert.deepEqual(validateTemplate(okT), { ok: true, errors: [] }));
test("结构缺陷逐条报错", () => {
  const bad = { ...okT, nodes: [okT.nodes[0], { id: "gx", name: "gateX", type: "gate" }],   // gx 缺 gateId
    edges: [ { id: "e1", source: "g1", target: "a", kind: "success" },
             { id: "e9", source: "a", target: "ghost", kind: "rework" } ] };
  const r = validateTemplate(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("e1")));   // 边指向被删节点（target missing）
  assert.ok(r.errors.some((e) => e.includes("gate"))); // node gx: gate missing gateId（评审 R2 采纳：补缺 gateId 夹具）
  assert.ok(r.errors.some((e) => e.includes("e9")));   // source 与 target 双缺失
});
test("revision 稳定且内容敏感", () => {
  const a = computeRevision(okT);
  assert.equal(a, computeRevision({ ...okT, revision: "旧指纹也影响不到" }));
  assert.notEqual(a, computeRevision({ ...okT, name: "T2" }));
  assert.match(a, /^[0-9a-f]{40}$/);
  // 顶层键重排不换指纹（评审 R13 采纳：stable stringify）
  assert.equal(computeRevision({ edges: okT.edges, nodes: okT.nodes, builtin: false, version: 1, name: "T1", id: "t1" }), a);
});
```
- Run: `npm test 2>&1 | tail -20` — Expected: 模块不存在导致 import 失败（Cannot find module）。
- [ ] Step 2: 确认失败信号（Cannot find module '…/src/workflows/validate.mjs'）。
- [ ] Step 3: 最小实现——`src/workflows/validate.mjs`
```js
import { createHash } from "node:crypto";
const NODE_TYPES = new Set(["agent", "script", "gate"]);
export function validateTemplate(t) {
  const errors = [];
  const push = (m) => errors.push(m);
  if (!t || typeof t.id !== "string" || !t.id) push("id required");
  const nodes = t?.nodes ?? [];
  const ids = new Set(nodes.map((n) => n?.id));
  if (ids.size !== nodes.length) push("duplicate node id");
  for (const n of nodes) {
    if (!NODE_TYPES.has(n?.type)) push("node " + (n?.id ?? "?") + ": bad type");
    if (n?.type === "gate" && !n.gateId) push("node " + (n?.id ?? "?") + ": gate missing gateId");
    if (n?.type === "script" && typeof n?.script !== "string") push("node " + (n?.id ?? "?") + ": script missing");
  }
  for (const e of t?.edges ?? []) {
    if (!ids.has(e?.source)) push("edge " + (e?.id ?? "?") + ": source missing");
    if (!ids.has(e?.target)) push("edge " + (e?.id ?? "?") + ": target missing");
    if (!["success", "rework"].includes(e?.kind)) push("edge " + (e?.id ?? "?") + ": bad kind");
  }
  return { ok: errors.length === 0, errors };
}
const stableStringify = (v) => Array.isArray(v) ? v.map(stableStringify)
  : (v && typeof v === "object") ? Object.keys(v).sort().reduce((o, k) => (o[k] = stableStringify(v[k]), o), {})
  : v;
export function computeRevision(t) {
  const { revision: _ignored, ...rest } = t ?? {};
  // 键排序后序列化（评审 R13 采纳）：兑现 design-v2 §3「规范化 JSON」——用户模板格式化/重排键不换指纹，
  // 否则 M2 的 templateRevision 比对会误报漂移。
  return createHash("sha1").update(JSON.stringify(stableStringify(rest))).digest("hex");
}
```
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: workflows 段全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(workflows): 模板校验与 revision 指纹（design-v2 §3）"`

### Task 4: workflows/builtin.mjs — 内置 loop-v1 常量（golden 形状锁）

- 目标：`loop-v1` 成为唯一内置模板事实源，形状被 golden 钉死。
- 涉及文件：Create `src/workflows/builtin.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Consumes: Task 3 的 validateTemplate/computeRevision
  - Produces: `LOOP_V1`（含 revision 字段，节点 g1/build/verify/g2/deliver；边见 design-v2 §3；build.executionPolicy:"auto"；verify.rework→build 且 build.maxReworks 计数承载上限 3——实现取 `verify` 节点 `maxReworks:3`（rework 发起方计数）并在 golden 注明该裁决）
- 验证范围：`npm test`（workflows golden）

- [ ] Step 1: 追加 golden 测试
```js
import { LOOP_V1 } from "../src/workflows/builtin.mjs";
test("loop-v1 golden：形状锁", () => {
  assert.equal(LOOP_V1.id, "loop-v1");
  assert.equal(LOOP_V1.builtin, true);
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.id), ["g1", "build", "verify", "g2", "deliver"]);
  assert.deepEqual(LOOP_V1.nodes.map((n) => n.type), ["gate", "agent", "script", "gate", "script"]);
  const byId = Object.fromEntries(LOOP_V1.nodes.map((n) => [n.id, n]));
  assert.equal(byId.g1.gateId, "G1");
  assert.equal(byId.build.executionPolicy, "auto");
  assert.equal(byId.verify.maxReworks, 3);
  assert.equal(byId.g2.gateId, "G2");
  assert.equal(byId.g2.rejectTarget, "build");
  assert.deepEqual(LOOP_V1.edges.map((e) => [e.source, e.target, e.kind]),
    [["g1","build","success"],["build","verify","success"],["verify","build","rework"],["verify","g2","success"],["g2","deliver","success"]]);
  assert.equal(validateTemplate(LOOP_V1).ok, true);
  assert.match(LOOP_V1.revision, /^[0-9a-f]{40}$/);
});
```
- Run: `npm test 2>&1 | tail -20` — Expected: Cannot find module builtin.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/workflows/builtin.mjs`（按 golden 逐字段写常量，末尾 `LOOP_V1.revision = computeRevision(LOOP_V1)`；g1.rejectTarget=null，G1 驳回=取消 run 的语义在 scheduler 按 gateId 判，不进模板字段；各节点带 name："G1"/"build"/"verify"/"G2"/"deliver"）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(workflows): 内置 loop-v1 golden（design-v2 §3）"`

### Task 5: workflows/loader.mjs — 用户模板加载与 meta 投影

- 目标：数据目录 `workflows/*.json` 即模板；非法文件跳过并留警告；对外只投影 meta（script 内容不出模块）。
- 涉及文件：Create `src/workflows/loader.mjs`；Test `test/workflows.test.mjs`
- 接口契约：
  - Consumes: Task 3 validateTemplate/computeRevision、Task 4 LOOP_V1
  - Produces: `loadTemplates({ dataDir, readdirSync?, readFileSync? })` → `{ templates: [{id,name,version,revision,builtin,nodes:[{id,name,type}],edgeCount}], warnings: string[] }`（内置在前；用户模板按文件名排序；io 参数可注入以便测试；**仅收 `.json` 后缀文件**；**用户模板 id 撞内置（loop-v1）或彼此重复 → 拒收并警告、不进 templates**——评审 R12 采纳）
- 验证范围：`npm test`（workflows 段）

- [ ] Step 1: 追加测试（mkdtemp 造 `workflows/` 目录：一个好模板 JSON + 一个坏模板 JSON + 一个 id 撞内置的 JSON + 一个非 json 文件）
```js
import { loadTemplates } from "../src/workflows/loader.mjs";
test("loadTemplates：内置在前、坏文件/撞 id 跳过并警告、非 json 忽略、meta 不含 script", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-wf-"));
  mkdirSync(join(dir, "workflows"));
  writeFileSync(join(dir, "workflows", "b.json"), JSON.stringify({ ...okT, id: "user-b", name: "UB" }));
  // 真·非法夹具（评审 R3 采纳·方案①）：edges 指向不存在节点；空 nodes 不算非法——校验器不新增
  // 「nodes 非空」规则，design-v2 §3 口径不变。
  writeFileSync(join(dir, "workflows", "bad.json"),
    '{"id":"bad","nodes":[{"id":"n1","name":"N","type":"agent"}],"edges":[{"id":"e1","source":"n1","target":"ghost","kind":"success"}]}');
  writeFileSync(join(dir, "workflows", "c.json"), JSON.stringify({ ...okT, id: "loop-v1", name: "撞内置" }));   // 评审 R12
  writeFileSync(join(dir, "workflows", "notes.txt"), "not a template");                                        // 评审 R12：非 json 忽略
  const out = loadTemplates({ dataDir: dir });
  assert.deepEqual(out.templates.map((t) => t.id), ["loop-v1", "user-b"]);
  assert.equal(out.warnings.length, 2);
  assert.ok(out.warnings.some((w) => w.includes("bad.json")));
  assert.ok(out.warnings.some((w) => w.includes("c.json")));
  const meta = out.templates[1];
  assert.ok(!("script" in meta.nodes[2]));
  assert.deepEqual(meta.nodes.map((n) => n.id), ["g1", "a", "s"]);
});
test("无 workflows 目录：仅内置、零警告", () => {
  const out = loadTemplates({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-wf0-")) });
  assert.deepEqual(out.templates.map((t) => t.id), ["loop-v1"]);
  assert.deepEqual(out.warnings, []);
});
```
import 区补 `mkdirSync`。okT 来自本文件 Task 3 的夹具。
- Run: `npm test 2>&1 | tail -20` — Expected: Cannot find module loader.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/workflows/loader.mjs`（默认 io 用 node:fs readdirSync/readFileSync；try/catch 目录缺席→零警告；readdirSync 结果仅收 `.json` 后缀（评审 R12）；逐文件 JSON.parse+validateTemplate，失败 `warnings.push(file + ": " + errors[0])` 并 continue；成功者补 revision（若缺）后查 id：撞内置 loop-v1 或与已收用户模板重复 → warnings.push 并 continue（评审 R12）；通过者投影 meta：`nodes.map(({id,name,type})=>({id,name,type}))` 与 `edgeCount: edges.length`）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(workflows): 用户模板加载与 meta 投影（design-v2 §3）"`

### Task 6: engine/scheduler.mjs — computeReady 与后代查询

- 目标：DAG 就绪规则与后代遍历成为纯函数（gate 只闸必经路径的基石）。
- 涉及文件：Create `src/engine/scheduler.mjs`；Test `test/scheduler.test.mjs`
- 接口契约：
  - Consumes: design-v2 §4 就绪规则；快照形状 {nodes,edges}
  - Produces: `computeReady(snapshot, nodeStates)` → `[nodeId]`（status==="pending" 且全部 success 入边源 succeeded；无 success 入边者视作入口 ready）；`descendantsOf(snapshot, nodeId)` → `[nodeId]`（沿 success 边可达、不含自身、按遍历序去重）
- 验证范围：`npm test`（scheduler 段）

- [ ] Step 1: 新建 `test/scheduler.test.mjs`，造并行分支夹具
```js
import test from "node:test";
import assert from "node:assert/strict";
import { computeReady, descendantsOf } from "../src/engine/scheduler.mjs";
// a→b（普通支）与 a→c(gate)→d（闸门支）：gate 只闸 d，不闸 b（design-v2 §4 / grill Q9-B）
const snap = { nodes: [{id:"a"},{id:"b"},{id:"c"},{id:"d"}],
  edges: [ {id:"e1",source:"a",target:"b",kind:"success"}, {id:"e2",source:"a",target:"c",kind:"success"},
           {id:"e3",source:"c",target:"d",kind:"success"} ] };
const st = (map) => Object.fromEntries(snap.nodes.map((n) => [n.id, { status: map[n.id] ?? "pending", attempt: 0, reworkCount: 0 }]));
test("computeReady：入口即绪、闸门只堵下游", () => {
  assert.deepEqual(computeReady(snap, st({})), ["a"]);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded" })), ["b", "c"]); // c 是 gate：ready 待人工，d 被堵
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "waiting" })), []);
  assert.deepEqual(computeReady(snap, st({ a: "succeeded", b: "succeeded", c: "succeeded" })), ["d"]);
});
test("descendantsOf：success 边可达、不含自身", () => {
  assert.deepEqual(descendantsOf(snap, "a"), ["b", "c", "d"]);
  assert.deepEqual(descendantsOf(snap, "c"), ["d"]);
  assert.deepEqual(descendantsOf(snap, "d"), []);
});
```
- Run: `npm test 2>&1 | tail -20` — Expected: Cannot find module scheduler.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/engine/scheduler.mjs`（两函数各 ~10 行：入边索引 + 状态过滤；descendants 用 BFS）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): computeReady 与 descendantsOf（design-v2 §4）"`

### Task 7: scheduler — 闸门语义（waiting/pass/reject/G1 取消）

- 目标：gate 到达挂起、pass 放行、reject 按边回退、G1 驳回取消 run。
- 涉及文件：Modify `src/engine/scheduler.mjs`；Test `test/scheduler.test.mjs`
- 接口契约：
  - Consumes: Task 6 computeReady/descendantsOf；快照节点 gateId/rejectTarget 字段（Task 4 形状）
  - Produces: `gateArrive(run, nodeId)` → run'（节点 waiting、run.status="waiting"、run.waitingGate=nodeId）；`applyGateDecision(run, nodeId, decision, overrideTarget = null)` → run'（pass：waiting→succeeded、waitingGate 清空、run.status="waiting"→"running"；reject：G1 gateId → 复用 cancelRun(run,"g1-rejected") 全量清理在途节点；其余 → 目标节点（overrideTarget ?? rejectTarget）重置 ready 不计 rework、该目标 success 后代中非 pending 者全部置 **skipped**（待重跑，对齐 design-v2 §4——评审 R7 采纳）、waitingGate 清空、run.status="waiting"→"running"）；`cancelRun(run, reason)` → run'（在途 running/waiting/ready 节点 → cancelled（评审 R6 采纳：ready 也算在途），pending 保持，run.status="cancelled"、cancelReason=reason）
- 验证范围：`npm test`（scheduler 段）

- [ ] Step 1: 追加测试（夹具用 LOOP_V1 + 并行支合成模板各一）
```js
import { gateArrive, applyGateDecision, cancelRun } from "../src/engine/scheduler.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";
test("G2 reject：目标重置 ready、后代 skipped 待重跑、不计 rework", () => {
  // 构造：g2 已 waiting，build/verify 已 succeeded（回炉后抵达 G2 的形状）
  let run = { status: "waiting", waitingGate: "g2", cancelReason: null,
    nodeStates: st2({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "waiting", deliver: "pending" }) };
  run = applyGateDecision(run, "g2", "reject");
  assert.equal(run.nodeStates.build.status, "ready");
  assert.equal(run.nodeStates.verify.status, "skipped");   // build 的 success 后代，非 pending → skipped 待重跑（design-v2 §4 / 评审 R7 采纳）
  assert.equal(run.nodeStates.deliver.status, "pending");  // 本就 pending，保持（规则只改非 pending 者）
  assert.equal(run.nodeStates.build.reworkCount, 0);       // reject 不计回炉
  assert.equal(run.status, "running");
});
test("G1 reject：取消 run", () => {
  let run = { status: "waiting", waitingGate: "g1", cancelReason: null,
    nodeStates: st2({ g1: "waiting", build: "pending", verify: "pending", g2: "pending", deliver: "pending" }) };
  run = applyGateDecision(run, "g1", "reject");
  assert.equal(run.status, "cancelled");
  assert.equal(run.cancelReason, "g1-rejected");
});
test("pass 放行与 cancelRun", () => {
  let run = { status: "waiting", waitingGate: "g1", cancelReason: null,
    nodeStates: st2({ g1: "waiting", build: "ready", verify: "pending", g2: "pending", deliver: "pending" }) };
  run = applyGateDecision(run, "g1", "pass");
  assert.equal(run.nodeStates.g1.status, "succeeded");
  assert.equal(run.status, "running");
  run = cancelRun(run, "user");
  assert.equal(run.status, "cancelled");
  assert.equal(run.nodeStates.build.status, "cancelled");
});
```
`st2(map)` 就地定义：LOOP_V1 节点集上的状态夹具（同 Task 6 st 模式）。
- Run: `npm test 2>&1 | tail -20` — Expected: gateArrive 等不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现（按 Produces 契约逐函数写；reject 的后代置 skipped 用 descendantsOf(snapshot, target) 过滤 status!=="pending"；G1 reject 复用 cancelRun(run,"g1-rejected")；pass 后调 computeReady 不在纯函数内做—— ready 化交给 advanceRun（Task 8））。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 闸门挂起/放行/驳回/取消语义（design-v2 §4）"`

### Task 8: scheduler — 回炉、推进与终态

- 目标：失败激活 rework 边（计数、超限终态）与 ready 化推进、完成判定、run 摘要。
- 涉及文件：Modify `src/engine/scheduler.mjs`；Test `test/scheduler.test.mjs`
- 接口契约：
  - Consumes: Task 6/7 全部导出；LOOP_V1 形状
  - Produces: `applyFailure(run, nodeId, error)` → run'（节点 failed 记 error；存在 rework 出边→reworkCount+1，目标重置 ready；`reworkCount > maxReworks` → run.status="failed"、run.hold=(节点 onFailure==="hold")；无 rework 出边→run.status="failed"）；`advanceRun(run)` → run'（重激活：skipped 且全部 success 入边源 succeeded → pending（评审 R7 采纳的 skipped 语义配套，M2 执行器无需感知）；ready 化：computeReady 结果 pending→ready；全部节点 succeeded→run.status="succeeded"，否则保持原 running/waiting——评审 R4 采纳：ready≠终态）；`summarizeRun(run)` → `{ id, candidateKey, status, waitingGate, currentNodeIds }`（currentNodeIds = running/waiting/ready 节点列表）
- 验证范围：`npm test`（scheduler 段 + 全量）

- [ ] Step 1: 追加测试
```js
import { applyFailure, advanceRun, summarizeRun } from "../src/engine/scheduler.mjs";
test("verify 失败回炉 build，第 4 次超限 run failed", () => {
  let run = { status: "running", waitingGate: null, cancelReason: null, hold: false,
    nodeStates: st2({ g1: "succeeded", build: "succeeded", verify: "running", g2: "pending", deliver: "pending" }) };
  for (let i = 0; i < 3; i++) {
    run.nodeStates.verify.reworkCount = i;
    run = applyFailure(run, "verify", "tests red");
    assert.equal(run.status, "running");
    assert.equal(run.nodeStates.build.status, "ready");
    // 模拟 build 重跑成功后 verify 再跑：手工推进
    run.nodeStates.build.status = "succeeded"; run.nodeStates.verify.status = "running";
  }
  run.nodeStates.verify.reworkCount = 3;
  run = applyFailure(run, "verify", "tests red again");
  assert.equal(run.status, "failed");
  assert.equal(run.hold, false);            // verify 未配 onFailure:"hold"
  assert.match(run.nodeStates.verify.error, /again/);
});
test("advanceRun ready 化：终态前 run 保持 running（评审 R4 采纳·拆例①）", () => {
  let run = { status: "running", waitingGate: null, cancelReason: null, hold: false,
    nodeStates: st2({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "succeeded", deliver: "pending" }) };
  run = advanceRun(run);
  assert.equal(run.nodeStates.deliver.status, "ready");   // ready 即待执行（M2 执行器接手）
  assert.equal(run.status, "running");                    // deliver 未跑完，run 不终态
  const sum = summarizeRun({ ...run, id: "r1", candidateKey: "k" });
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "running", waitingGate: null, currentNodeIds: ["deliver"] });
});
test("advanceRun 终态：全 succeeded 才收口（评审 R4 采纳·拆例②）", () => {
  let run = { status: "running", waitingGate: null, cancelReason: null, hold: false,
    nodeStates: st2({ g1: "succeeded", build: "succeeded", verify: "succeeded", g2: "succeeded", deliver: "succeeded" }) };
  run = advanceRun(run);
  assert.equal(run.status, "succeeded");
  const sum = summarizeRun({ ...run, id: "r1", candidateKey: "k" });
  assert.deepEqual(sum, { id: "r1", candidateKey: "k", status: "succeeded", waitingGate: null, currentNodeIds: [] });
});
test("skipped 重激活：reject 后目标重跑成功，skipped 后代逐级回 ready（评审 R7 采纳·配套）", () => {
  // G2 reject 后的形状：build=ready，verify=skipped，g2=skipped，deliver=pending（design-v2 §4 + T7 规则）
  let run = { status: "running", waitingGate: null, cancelReason: null, hold: false,
    nodeStates: st2({ g1: "succeeded", build: "ready", verify: "skipped", g2: "skipped", deliver: "pending" }) };
  run.nodeStates.build.status = "succeeded";              // 模拟 M2 执行器重跑 build 完成
  run = advanceRun(run);
  assert.equal(run.nodeStates.verify.status, "ready");    // skipped→pending→ready（success 入边源已 succeeded）
  assert.equal(run.nodeStates.g2.status, "skipped");      // verify 未重跑，仍停
  assert.equal(run.nodeStates.deliver.status, "pending"); // 入边 g2 未通，保持 pending
});
```
- Run: `npm test 2>&1 | tail -20` — Expected: applyFailure 等不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现（applyFailure：查 rework 出边→计数+ready 化目标；计数与 maxReworks 比较用 `reworkCount > maxReworks`（第 4 次失败时 reworkCount 增至 4、大于上限 3 → 超限，对应回炉限 3）；无 rework 出边直接 failed。advanceRun：skipped 重激活（success 入边源全 succeeded → pending）→ computeReady ready 化 → 全 succeeded 才置 "succeeded"（评审 R4/R7 采纳）。summarizeRun 按 Produces 形状）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（14 文件全部：12 存量 + workflows + scheduler）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): 回炉/推进/终态/摘要（design-v2 §4）"`

### Task 9: handlers/host — state 暴露 workflow meta 与 runs 摘要

- 目标：客户端拿到模板 meta（不含 script）与 run 摘要；loader 接进宿主装配。
- 涉及文件：Modify `src/handlers.mjs`、`src/host.mjs`；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 2 store runs API、Task 5 loadTemplates、Task 8 summarizeRun
  - Produces: `makeHandlers({ …, workflowCatalog })` 新参（默认 `{ templates: [], warnings: [] }`）；`getState()` 返回增 `runs`（listRuns().map(summarizeRun)）与 `workflow: { templates, warnings }`；host.mjs 在 createStore 后调用 `loadTemplates({ dataDir: dir })` 传入（M1 启动时读一次，用户模板改动重启生效——M1 范围内接受，注释写明）
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: `test/handlers.test.mjs` 追加失败测试（沿用该文件现有 makeHandlers 组装方式，传入 `workflowCatalog` 桩与带一个 run 的 store 桩——以现有测试的 store 构造先例为准；断言：`state.workflow.templates[0].id === "loop-v1"`、模板节点对象不含 `script` 键、`state.runs` 为摘要数组且含 `currentNodeIds`）
- Run: `npm test 2>&1 | tail -20` — Expected: 新用例失败（getState 无 workflow 键）。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——handlers.mjs：签名加 `workflowCatalog = { templates: [], warnings: [] }`；getState 返回对象追加 `runs: store.listRuns().map(summarizeRun), workflow: workflowCatalog`（import summarizeRun 自 ./engine/scheduler.mjs）。host.mjs：`import { loadTemplates } from "./workflows/loader.mjs";`，第 42 行 makeHandlers 调用增 `workflowCatalog: loadTemplates({ dataDir: dir })`（注释：M1 启动读一次）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(api): state 暴露 workflow meta 与 runs 摘要（design-v2 §7/§8）"`

### Task 10: 工作流条模板驱动渲染（前环 + 环内两段 + 回退）

- 目标：工作流条（原「管线条」——该术语已按 GLOSSARY 2026-11-16 退役，此处仅作迁移指称）从硬编码 7 段改为模板驱动只读渲染；无 workflow meta 时回退旧形态。
- 涉及文件：Modify `src/client/logic.mjs`、`src/client/components/pipelineStrip.mjs`、`src/client/components/actions.mjs`（第 109 行调用点）；Test `test/logic.test.mjs`。workbench.mjs 已核无需改（state 经 extend hook 整包透传，评审 R8 实测）
- 接口契约：
  - Consumes: Task 9 state.workflow（templates meta）；logic.mjs 既有 `stageCounts`（第 34 行）；pipelineStrip 既有渲染样式（chip class、dim 透明度）
  - Produces: `stripCells({ candidates, workflow })` → `{ pre: [{key, count}]×4（ingest/backlog/triage/feedback）, loop: [{id, name, type, dim:true}], fallback: boolean }`（workflow.templates 为空 → fallback:true、loop:[]）；renderStrip 新签名 `renderStrip(container, { t, candidates, workflow })`
- 验证范围：`npm test`（logic 段）+ `npm run build`（client 打包）

- [ ] Step 1: `test/logic.test.mjs` 追加失败测试
```js
import { stripCells } from "../src/client/logic.mjs";
import { LOOP_V1 } from "../src/workflows/builtin.mjs";
test("stripCells：前环计数 + 环内模板节点全灰", () => {
  const out = stripCells({ candidates: [{ stage: "inbox" }, { stage: "triaged" }], workflow: { templates: [LOOP_V1] } });
  assert.deepEqual(out.pre.map((c) => c.key), ["ingest", "backlog", "triage", "feedback"]);
  assert.equal(out.pre[0].count, 2);   // stageCounts.ingest = all.length（logic.mjs:38，评审 R5 采纳）
  assert.equal(out.pre[1].count, 1);   // backlog = stage==="inbox" 计数（logic.mjs:39）
  assert.equal(out.fallback, false);
  assert.deepEqual(out.loop.map((n) => n.id), ["g1", "build", "verify", "g2", "deliver"]);
  assert.ok(out.loop.every((n) => n.dim === true));   // M1 无执行器，环内恒灰
});
test("stripCells：无 workflow meta 回退旧 7 段", () => {
  const out = stripCells({ candidates: [], workflow: null });
  assert.equal(out.fallback, true);
  assert.deepEqual(out.loop, []);
});
```
- Run: `npm test 2>&1 | tail -20` — Expected: stripCells 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——logic.mjs 增 stripCells（pre 段复用 stageCounts 的四键计数；loop 段取 `workflow.templates[0]?.nodes ?? []` 投影 `{id,name,type,dim:true}`；fallback 判 `!workflow?.templates?.length`）。pipelineStrip.mjs 改为消费 stripCells：fallback 时渲染旧 `STAGES`（常量保留），否则渲染 pre chips（`t("stages."+key)`）+ 分隔符 + loop chips（`n.name` 字面量、dim 样式）。actions.mjs 第 109 行的 `renderStrip(container,{t,candidates:state?.candidates??[]})` 调用增传 `workflow: state?.workflow`（评审 R8 采纳）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5 && npm run build` — Expected: 全绿且 esbuild 双包构建成功（lib/client.js 重新生成）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(ui): 工作流条模板驱动只读渲染（design-v2 §8）"`

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务编号顺序执行，不无声跳步、合并步或改变任务目标；每任务跑完它定义的验证再进下一个。
- 测试桩只走注入（fetch/execFile/spawn/io 均可注入），不真实 spawn gh/python/agent；LLM 相关行为不进 M1。
- 在 main 分支直接工作是本仓惯例（v1 亦然）；如需分支由执行者与用户确认。
- 遇阻、重复失败或计划与仓库现实不符：立即停下说明，不猜。
- 全部任务完成后运行最终验证并输出修改摘要。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -10`（build 先行——评审计划外建议采纳：干净 checkout 下 package-shape.test.mjs 断言 lib/ 双包存在，先 test 会误红）
- Expected: `npm test` 全部用例通过（14 个测试文件，含新增 workflows/scheduler 两文件）；`npm run build` 生成 lib/host.js 与 lib/client.js 无报错；提交序列为 Task 1–10 的 10 个 conventional commit。
- 手工冒烟（可选，装机场景）：`dsh plugin --profile web add -w /home/ubuntu/workspace/dsh-l` 后打开面板——工作台两段工作流条可见（前环计数 + loop-v1 节点灰显），`GET /dsh-l/state` 含 `workflow.templates` 与 `runs: []`。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。M2（执行环）/M3（看板+待我确认）/M4（Role+任务包 v2+devflow-lite）在本计划验收后逐份另立计划。
