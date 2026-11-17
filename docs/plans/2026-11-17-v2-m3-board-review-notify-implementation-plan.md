# dsh-l v2 M3（看板 + 待我确认 + 飞书通知 + 角标 + 改名）实施计划

## 目标

- 主栏顶部三视图 tab（清单/看板/待我确认）：看板 6 列（bucketOf 同构，白名单迁移）；待我确认收件箱聚合 gate 等待与 G3 发版分区，卡片动作齐全（G2 放行/驳回、G3 确认发版、failed run 重试/取消）；页头 badge 点击切 tab；侧栏 label 计数角标。
- 飞书单向通知：webhook 存 credentials（ref=`DSH_L_FEISHU_WEBHOOK_URL`），gate 到达 + run failed 触发，尽力而为不阻塞引擎；设置面板增 URL 输入与测试按钮。
- `POST /dsh-l/release/confirm` 路由落 G3 痕。
- 改名 **DSH Loop Forge**（panelLabel 双字典同名 + README/PRODUCT/GLOSSARY + 免责声明行）。
- 不含：执行详情独立视图（Q9-A 不做）、飞书双向（v3）、cancelled-run UI 重试入口（记录设计备注）、M4 全部。

## 架构快照

- 新增 `src/feishu.mjs`：`makeFeishu({ fetch, getWebhook })` → `{ sendNotice(text), testSend() }`——POST `https://open.feishu.cn/open-apis/bot/v2/hook/<token>`（msg_type=text），未配置/失败静默（warn），尽力而为不阻塞引擎；`formatNotice(evt)` 纯函数拼一行文本。
- engine 增 `emit` 回调（缺省 no-op）：三个触发点各 emit 一次——①gateArrive（g2 waiting）②applyFailure 致 run failed ③clone 失败。host 把 emit 接到 feishu.sendNotice（fire-and-forget + catch）。
- 待我确认聚合走客户端纯函数（state 已含 candidates + runs，零新后端查询）：`needsReview({ candidates, runs })` → `{ gateRuns, releaseList, count }`。
- 角标：`src/client/badge.mjs`（`export const badge = { count: 0 }` 可变持有者）——index.mjs 的 label 闭包读它，workbench paint 时写入；宿主 label() 调用时机实测钉死，滞后一次刷新可接受（§12.2/§13.2）。
- 主栏 tab：workbench 顶部三按钮切 `activeTab`（清单/看板/待我确认），三视图渲染分派走 logic 纯函数 `kanbanColumns({ candidates })`（6 列 bucketOf 同构 + MANUAL_STAGES 迁移白名单）。
- 改名：panelLabel 双字典同名 `DSH Loop Forge`（品牌不翻译）；README/PRODUCT/GLOSSARY 同步 + 免责声明；npm 包名 dsh-l、登录闸文案不动。

## 全局约束（从设计文档逐字继承）

- Node ≥24 ESM（.mjs），零运行时 dependencies；devDependencies 仅 esbuild ^0.25.0；构建走 `npm run build`。
- 不动面（M1/M2 继承）：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json、src/client/components/workbench.mjs 的 extend 调用签名与既存板块结构（本计划允许改 workbench 的 tab 结构与渲染分派——这是 M3 的主体改动之一，但 extend?.rowActions 的 `{t, view, lang}` 签名不改，runs 经 actions.mjs 闭包获取，M2 先例）。
- 测试桩纪律：fetch/execFile/io/world 全注入，单测不真实出网、不真实 spawn、不真实 clone。
- 飞书出网域仅 `open.feishu.cn`（design §9 既定）；webhook URL 含 secret，不落 store.json、不打日志（走 credentials）。
- 术语按 GLOSSARY；显示名改 **DSH Loop Forge**（panelLabel 双字典同名不翻译）；npm 包名 dsh-l、version 0.0.1、不发 npm。
- **docs commit 纪律延续**：README/PRODUCT/GLOSSARY 改名走独立 docs commit；代码任务各自 conventional commit。
- 退出码卫生：管道显示验证输出加 `set -o pipefail`。命令环境：Linux bash，工作目录 `/home/ubuntu/workspace/dsh-l`。

## 输入工件

- 设计：docs/design-v2.md §13（M3 补钉 Q1–Q9）、§7（release/confirm 路由）、§8（三视图/待我确认/看板）、§9（安全）、§11（里程碑）、§12.6/§12.9（M2 既定）。
- 参照实现：src/client/logic.mjs（bucketOf/GROUPS/stageCounts/stripCells/runBlock 先例）、src/client/components/actions.mjs（btn/row/sel/go 助手、lastRuns 闭包先例）、src/client/index.mjs（label 解析式注册）、src/engine/engine.mjs（emit 接入点：dispatch 的 gateArrive、onNodeDone 的 applyFailure 分支、startRun 的 clone catch）、/home/ubuntu/workspace/dsh-agent-autoloop/plugins/feishu/channel.ts（v3 双向参考，M3 不用其卡片机制）。

## 文件结构与职责

- Create: `src/feishu.mjs` — makeFeishu（sendNotice/testSend）+ formatNotice（纯函数）
- Create: `src/client/badge.mjs` — badge 计数可变持有者
- Create: `src/client/components/kanban.mjs` — 看板视图组件（6 列）
- Create: `src/client/components/review.mjs` — 待我确认视图组件（两分区 + 动作）
- Modify: `src/engine/engine.mjs` — makeEngine 增 `emit` 参 + 三触发点
- Modify: `src/handlers.mjs` — postReleaseConfirm + makeHandlers 增 `feishu` 参（postFeishuTest）+ postRunStart/postRunGate/postRunCancel/postRunRetry 增 auth（M2 已有）无改动确认
- Modify: `src/host.mjs` — makeFeishu 装配（getWebhook 走 credentials.resolve）+ engine emit 接线 + `/dsh-l/release/confirm`、`/dsh-l/feishu/test`、`/dsh-l/feishu/webhook`（PUT 写 credentials）三条路由
- Modify: `src/client/index.mjs` — panelLabel 改名 + label() 读 badge.count
- Modify: `src/client/components/workbench.mjs` — 主栏 tab 三切 + 页头 badge chip + F1 行保持
- Modify: `src/client/components/kanban.mjs`、`review.mjs`（创建即本任务）
- Modify: `src/client/components/actions.mjs` — openSettings 增飞书 Webhook 输入与测试按钮
- Modify: `src/client/logic.mjs` — needsReview 纯函数 + kanbanColumns 纯函数
- Modify: `src/client/api.mjs` — releaseConfirm/feishuTest/putFeishuWebhook 三端点
- Modify: `src/engine/executor.mjs` — lastText 死代码清理（backlog）
- Modify: `src/engine/workspace.mjs` — sweep 保留期口径注释（backlog）
- Modify: `src/client/locale/zh-CN.mjs`、`en.mjs` — 增键一次落齐 13 个（tabs.list/board/review×3、review.gates/release/failed/confirm/empty×5、feishu.url/test/testOk/testFail×4、badge.pending×1——评审 P4：parity 只守两字典同集不守完备，全量在 T7 首个 UI 任务落齐，避免 T9 显示键名字面量）+ panelLabel 改名
- Modify: `README.md`、`PRODUCT.md`、`GLOSSARY.md` — 改名 + 免责声明（docs commit）
- Test: `test/feishu.test.mjs`（新）、`test/logic.test.mjs`（needsReview/kanbanColumns/runBlock 增量）、`test/handlers.test.mjs`（release/confirm + feishu 路由）、`test/engine.test.mjs`（emit 钉例）、`test/i18n.test.mjs`/`locale-parity.test.mjs`（自动覆盖新键）
- 不动：src/http.mjs、src/github.mjs、src/triage.mjs、src/poll.mjs、src/paths.mjs、cordis.patch.yml、package.json、src/store.mjs（release 块 M1 已在 schema，本计划零 store 改动）

任务间接口依赖：T1（feishu 纯函数）→ T4（engine emit 消费 feishu 格式化）；T2（needsReview）→ T7/T9（badge/视图消费）；T3 独立；T5 路由独立于 T6 装配（handlers 先行，host 后接）；T7（tab 骨架）→ T8/T9（视图挂进 tab）；T10 设置面板独立；T11 backlog 收尾。执行顺序按编号。

## 任务清单

### Task 1: 改名 DSH Loop Forge（docs + locale）

- 目标：显示名/文档全面改为 DSH Loop Forge，附免责声明。
- 涉及文件：Modify `README.md`、`PRODUCT.md`、`GLOSSARY.md`（docs commit）；Modify `src/client/locale/zh-CN.mjs`、`en.mjs` 的 panelLabel（代码 commit）
- 接口契约：
  - Consumes: locale `panelLabel` 键（两字典首键）
  - Produces: panelLabel 双字典均为 `DSH Loop Forge`；README/PRODUCT/GLOSSARY 标题与行文改名 + README 增一行「独立项目，与 Tencent LoopForge 无隶属关系。」；PRODUCT 显示名 durable fact 同步
- 验证范围：`npm test`（locale-parity 自动覆盖改名）；`grep -c 'Loop Engineering' README.md PRODUCT.md`（期望仅历史沿革/免责声明处可保留 0–2 处，正文 0）

- [ ] Step 1: docs 编辑（README 标题与正文、**README.en.md 两处——:1 标题「Loop Engineering Workbench (dsh-l)」→「DSH Loop Forge (dsh-l)」与 :46 激活段，免责声明双语加行**（评审 P5）、PRODUCT.md 第 5/37 行显示名、GLOSSARY 首行）→ docs commit `docs: 显示名改名 DSH Loop Forge + 免责声明`
- [ ] Step 2: locale 两文件 panelLabel 改 `DSH Loop Forge` → Run: `npm test 2>&1 | tail -4` — Expected: parity 全绿（两字典同改）。
- [ ] Step 3: 代码 commit `feat(ui): 显示名 DSH Loop Forge（panelLabel 双字典）`

### Task 2: logic.mjs — needsReview 与 kanbanColumns 纯函数

- 目标：待我确认聚合与看板列数据全部纯函数化，UI 层零计算。
- 涉及文件：Modify `src/client/logic.mjs`；Test `test/logic.test.mjs`
- 接口契约：
  - Consumes: bucketOf（logic.mjs:5）、MANUAL_STAGES 语义（handlers.mjs:5 同名单，logic 侧自置常量 `["inbox","triaged","gating","shipped","closed","held"]` 不可迁移集 `["building","verifying"]`）
  - Produces: `needsReview({ candidates, runs })` → `{ gateRuns: [run 摘要]，failedRuns: [run 摘要]，releaseList: [候选]，count }`（gateRuns = runs 中 status==="waiting" 且 waitingGate 真值；failedRuns = runs 中 status==="failed"——评审 P1：D5 动作齐备的第三分区数据源；releaseList = candidates 中 stage==="shipped" 且 release 未确认；**count = gateRuns.length + releaseList.length，failed 不计入——D5 角标口径**）；`kanbanColumns({ candidates, runs })` → `{ columns: [{id, dim, cards:[candidate], movable:false|true}] }`（**列头 label 移除——渲染层用 t("groups."+id) 解析**，评审 P9；6 列 id 同 GROUPS；building 列含 building+verifying、closed 列含 held；卡片 movable 仅当其 stage ∈ 白名单——building/verifying 卡 movable:false）
- 验证范围：`npm test`（logic 段）

- [ ] Step 1: 失败测试（logic.test.mjs 追加，夹具用既有 c()/t()）
```js
test("needsReview：gate 等待 + G3 待发版聚合", () => {
  const candidates = [
    { key: "k1", stage: "shipped", currentRunId: null, release: null },
    { key: "k2", stage: "shipped", currentRunId: null, release: { confirmedAt: "T" } },
    { key: "k3", stage: "building", currentRunId: null, release: null },
  ];
  const runs = [
    { id: "r1", status: "waiting", waitingGate: "g2", currentNodeIds: ["g2"], error: null },
    { id: "r2", status: "running", waitingGate: null, currentNodeIds: ["build"], error: null },
    { id: "r3", status: "failed", waitingGate: null, currentNodeIds: [], failedNodeIds: ["deliver"], error: "push rejected" },
  ];
  const out = needsReview({ candidates, runs });
  assert.deepEqual(out.gateRuns.map((r) => r.id), ["r1"]);
  assert.deepEqual(out.failedRuns.map((r) => r.id), ["r3"]);     // 评审 P1：第三分区数据源
  assert.deepEqual(out.releaseList.map((c) => c.key), ["k1"]);   // k2 已确认发版、k3 非 shipped
  assert.equal(out.count, 2);                                    // D5 口径：failed 不计入角标
});
test("kanbanColumns：6 列同构 + 进行中列禁迁移", () => {
  const out = kanbanColumns({ candidates: [c("inbox"), c("building"), c("verifying"), c("shipped"), c("held")], runs: [] });
  assert.deepEqual(out.columns.map((col) => col.id), ["inbox", "triaged", "gating", "building", "shipped", "closed"]);
  const byId = Object.fromEntries(out.columns.map((col) => [col.id, col]));
  assert.deepEqual(byId.building.cards.map((x) => x.stage), ["building", "verifying"]);
  assert.deepEqual(byId.closed.cards.map((x) => x.stage), ["held"]);
  assert.equal(byId.inbox.cards[0].movable, true);
  assert.equal(byId.building.cards[0].movable, false);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: needsReview/kanbanColumns 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——logic.mjs 增两函数（needsReview 的 release 判定：`c.stage === "shipped" && !c.release?.confirmedAt`；kanbanColumns 复用 bucketOf 分桶 + movable 判定 `["inbox","triaged","gating","shipped","held","closed"].includes(c.stage)`——building/verifying 恒 false）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(client): needsReview 聚合与看板列纯函数"`

### Task 3: release/confirm 路由

- 目标：G3 发版闸的人工确认落痕（不代跑发版）。
- 涉及文件：Modify `src/handlers.mjs`、`src/host.mjs`（路由表增 `"/dsh-l/release/confirm": { POST: handlers.postReleaseConfirm }`——评审 P2②）、`src/client/api.mjs`（`releaseConfirm(key, note)` 端点——评审 P2①：T9 消费但原计划无任务承接）；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: store 候选 release 块（M1 schema：`{confirmedAt, note}|null`）、requireAuth、fail 助手
  - Produces: `postReleaseConfirm({key, note})`：401 auth-required → 404 → 409 release-requires-shipped（stage 非 shipped）→ 409 release-already-confirmed（release.confirmedAt 已在）→ 落 `release={confirmedAt, note}` + history `release.confirmed` → `{ok}`；随本任务落地 `api.releaseConfirm(key, note)` 端点与 host 路由表行（评审 P2①②：T9 的消费依赖由此闭合）
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: 失败测试（handlers.test.mjs 追加）
```js
test("release/confirm：G3 发版确认落痕；非 shipped/重复确认 409", async () => {
  const store = openStore(); login(store); seed(store);
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-requires-shipped");
  store.setStage("o/r#issue#1", "shipped", "v2");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1", note: "0.2.5" })).ok, true);
  const c = store.getCandidate("o/r#issue#1");
  assert.ok(c.release.confirmedAt);
  assert.equal(c.history.at(-1).event, "release.confirmed");
  assert.equal((await h.postReleaseConfirm({ key: "o/r#issue#1" })).error, "release-already-confirmed");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: postReleaseConfirm 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——handlers 增 postReleaseConfirm（按 Produces 校验链；note 缺省 ""）；api.mjs 增 `releaseConfirm: (key, note = "") => send("dsh-l/release/confirm", { key, note }),`；host.mjs 路由表增 `"/dsh-l/release/confirm": { POST: handlers.postReleaseConfirm },`。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(api): release/confirm G3 发版确认路由"`

### Task 4: feishu.mjs — 单向 webhook 通知

- 目标：gate/failed 事件的尽力而为推送（未配置/失败静默）。
- 涉及文件：Create `src/feishu.mjs`；Test `test/feishu.test.mjs`
- 接口契约：
  - Consumes: design §13.3/§13.4（open.feishu.cn bot hook、msg_type=text、尽力而为）
  - Produces: `formatNotice(evt)` 纯函数 → 一行文本（evt={type:"gate"|"failed", key, gateId?, error?, title?}；gate →「待拍板：{key} {title}（{gateId}）」；failed →「执行失败：{key} {error 截 200}」）；`makeFeishu({ fetch, getWebhook })` → `{ sendNotice(text) }`：getWebhook() 返回空/抛错 → 不发并返回 {sent:false, reason}；POST hook JSON `{msg_type:"text", content:{text}}` → res.ok 且 res.data?.code === 0（飞书 body code 字段，缺省按成功）→ {sent:true}；异常/非 ok → {sent:false, reason}（不 throw）
- 验证范围：`npm test`（feishu 段）

- [ ] Step 1: 新建 `test/feishu.test.mjs`
```js
import test from "node:test";
import assert from "node:assert/strict";
import { formatNotice, makeFeishu } from "../src/feishu.mjs";
test("formatNotice：gate 与 failed 两种文案", () => {
  assert.match(formatNotice({ type: "gate", key: "o/r#issue#1", gateId: "g2", title: "修复登录闸" }), /待拍板/);
  assert.match(formatNotice({ type: "failed", key: "o/r#issue#1", error: "boom" }), /执行失败/);
});
test("sendNotice：webhook 就绪发 POST；未配置静默；网络失败不 throw", async () => {
  const calls = [];
  const ok = makeFeishu({ getWebhook: () => "https://open.feishu.cn/open-apis/bot/v2/hook/tk", fetch: async (url, opts) => { calls.push([url, JSON.parse(opts.body)]); return { ok: true, json: async () => ({ code: 0 }) }; } });
  const r = await ok.sendNotice("hello");
  assert.equal(r.sent, true);
  assert.match(calls[0][0], /open-apis\/bot\/v2\/hook\/tk$/);
  assert.equal(calls[0][1].msg_type, "text");
  const silent = makeFeishu({ getWebhook: () => "", fetch: async () => { throw new Error("should not fetch"); } });
  const r2 = await silent.sendNotice("hello");
  assert.equal(r2.sent, false);
  const bad = makeFeishu({ getWebhook: () => "https://x", fetch: async () => { throw new Error("net"); } });
  const r3 = await bad.sendNotice("hello");
  assert.equal(r3.sent, false);
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: Cannot find module feishu.mjs。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——`src/feishu.mjs`（按 Produces 契约写；POST 用注入 fetch(url, {method:"POST", headers:{"content-type":"application/json"}, body})；getWebhook 抛错按未配置处理）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(notify): 飞书单向 webhook 通知（尽力而为）"`

### Task 5: engine emit 接线（三触发点）

- 目标：引擎在 gate 挂起 / run failed / clone 失败三点发出事件，通知层由宿主接线（引擎不碰网络）。
- 涉及文件：Modify `src/engine/engine.mjs`；Test `test/engine.test.mjs`
- 接口契约：
  - Consumes: Task 4 formatNotice 的 evt 形状（引擎只发 evt，格式化在 feishu.mjs）
  - Produces: `makeEngine({ …, emit = null })`；三触发点各 `try { emit?.({ type, key, runId, nodeId, error?, title? }) } catch {}`——①dispatch 内 gateArrive 后（type:"gate"，**nodeId=闸节点 id**——与 waitingGate/api.runGate 同域（"g2"），评审 P3②；并带候选 title）②onNodeDone 中 applyFailure 致 run.status==="failed" 时（type:"failed"，error 取节点 error）③startRun clone catch（type:"failed"）。emit 抛错被吞（通知永不阻塞引擎）
- 验证范围：`npm test`（engine 段）

- [ ] Step 1: 失败测试（engine.test.mjs；setup 增可注入 emitter）
```js
const setup2 = ({ failClone = false, concurrency = 2 } = {}) => {
  const base = setup({ failClone, concurrency });
  const events = [];
  base.engine = makeEngine({ store: base.store, workspace: base.workspace, executor: base.executor,
    now: () => new Date(), concurrencyOf: () => concurrency, emit: (e) => { events.push(e); } });
  return { ...base, events };
};
test("emit：gate 挂起与 run failed 各一条；成功路径零通知", async () => {
  const { store, engine, executor, events } = setup2();
  const key = "o/r#issue#1";
  const { runId } = engine.startRun(key, {});
  await drain();
  executor.inflight.get(runId + ":build").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  assert.deepEqual(events.map((e) => e.type), []);   // 评审 P3①：成功零通知断言前移——此时 verify 在跑、闸未到达
  executor.inflight.get(runId + ":verify").resolve({ ok: true, error: null, artifacts: [] }); await drain();
  const gateEvt = events.find((e) => e.type === "gate");
  assert.equal(gateEvt.nodeId, "g2");   // 评审 P3②：nodeId=闸节点 id，与 waitingGate/api.runGate 同域
  engine.applyGateDecision(runId, "g2", "pass");
  await drain();
  executor.inflight.get(runId + ":deliver").resolve({ ok: false, error: "push rejected", artifacts: [] }); await drain();
  const failedEvt = events.find((e) => e.type === "failed");
  assert.equal(failedEvt.error, "push rejected");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: setup2 内 makeEngine 不识别 emit 也能跑（多余参数被解构忽略），但 events 恒空 → 断言红。
- [ ] Step 2: 确认失败信号（events 空）。
- [ ] Step 3: 最小实现——engine.mjs：makeEngine 解构增 `emit = null`；三触发点按 Produces 插入（dispatch 的 gate 分支 gateArrive 后、onNodeDone 的 failed 分支、startRun clone catch）；每处 `try { emit?.({...}) } catch {}`；候选 title 经 store.getCandidate(key)?.title 取。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿（含 M1/M2 既有 engine 用例——emit 缺省 null 不触发）。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(engine): gate/failed 事件 emit 接线"`

### Task 6: host 装配（feishu + emit + 三条新路由）

- 目标：credentials 存取 webhook、emit→飞书接线、设置测试路由。
- 涉及文件：Modify `src/host.mjs`、`src/handlers.mjs`；Test `test/handlers.test.mjs`
- 接口契约：
  - Consumes: Task 4 makeFeishu、Task 5 engine.emit、credentials 服务（set/resolve 直调字符串 ref，rc.3 类型实证）
  - Produces: buildRuntime 内 `const getWebhook = async () => { try { const hit = await ctx.credentials?.resolve?.("DSH_L_FEISHU_WEBHOOK_URL"); return typeof hit?.value === "string" && hit.value ? hit.value : null; } catch { return null; } };` `const notifier = makeFeishu({ fetch: globalThis.fetch, getWebhook });` `const engine = makeEngine({ …, emit: (evt) => { try { notifier.sendNotice(formatNotice(evt)); } catch {} } });`（formatNotice 从 feishu.mjs import）；makeHandlers 增 `feishu` 参（= notifier + setWebhook 包装：`setWebhook: async (url) => ctx.credentials.set("DSH_L_FEISHU_WEBHOOK_URL", url)`）；新方法 `postFeishuTest()`（feishu.testSend → {ok, sent}）与 `putFeishuWebhook({url})`（auth；url 非法（非 https://open.feishu.cn/open-apis/bot/v2/hook/ 前缀）→ invalid webhook；写入 credentials → {ok}）；路由表增 `/dsh-l/feishu/test` POST、`/dsh-l/feishu/webhook` PUT；makeExecWorld 不变
- 验证范围：`npm test`（handlers 段）

- [ ] Step 1: 失败测试（handlers.test.mjs 追加；fake credentials 记账 set/resolve；fake feishu 记账 testSend）
```js
test("feishu 路由：webhook 写入 credentials、测试发送走注入通知器", async () => {
  const store = openStore(); login(store);
  const saved = [];
  const credentials = { set: async (ref, v) => saved.push([ref, v]), resolve: async (ref) => saved.find(([r]) => r === ref)?.[1] ? { value: saved.find(([r]) => r === ref)[1] } : undefined };
  const notifier = { sendNotice: async (t) => ({ sent: true, text: t }), testSend: async () => ({ sent: true }) };
  const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, credentials, feishu: { notifier, setWebhook: async (url) => { await credentials.set("DSH_L_FEISHU_WEBHOOK_URL", url); } } });
  assert.equal((await h.putFeishuWebhook({ url: "http://evil" })).error, "invalid webhook");
  assert.equal((await h.putFeishuWebhook({ url: "https://open.feishu.cn/open-apis/bot/v2/hook/abc" })).ok, true);
  assert.deepEqual(saved, [["DSH_L_FEISHU_WEBHOOK_URL", "https://open.feishu.cn/open-apis/bot/v2/hook/abc"]]);
  const r = await h.postFeishuTest();
  assert.equal(r.sent, true);
  const noFeishu = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
  assert.equal((await noEngineGuard(noFeishu)).error, "feishu-not-wired");
  async function noEngineGuard(h2) { return h2.postFeishuTest(); }
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: putFeishuTest 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——handlers：签名增 `feishu = null`；`postFeishuTest`：auth → feishu null 503 feishu-not-wired → `feishu.notifier.testSend()` → {ok, sent}；`putFeishuWebhook`：auth → url 前缀校验 `https://open.feishu.cn/open-apis/bot/v2/hook/` → feishu.setWebhook(url) → {ok}。host.mjs：buildRuntime 增 getWebhook/notifier/engine emit 接线与 feishu 装配（engine 构造移到 notifier 之后以满足 emit 闭包）；路由表增两行（POST /dsh-l/feishu/test、PUT /dsh-l/feishu/webhook）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(notify): 飞书装配/测试路由/webhook 写入 credentials"`

### Task 7: 主栏 tab 三切 + 页头 badge + 侧栏 label 计数

- 目标：三视图导航骨架 + 待确认计数双载体（页头 chip + 侧栏 label）。
- 涉及文件：Create `src/client/badge.mjs`；Modify `src/client/index.mjs`、`src/client/components/workbench.mjs`、`src/client/locale/zh-CN.mjs`、`en.mjs`（**M3 全量新键 13 个一次落齐**——评审 P4：T9 消费 review.* 键，晚落会显示键名字面量）；Test `test/logic.test.mjs`
- 接口契约：
  - Consumes: Task 2 needsReview、M1 label 解析式注册（index.mjs:23 `const label = () => makeT(lang.get())("panelLabel")`）、M2 lastRuns 先例
  - Produces: `src/client/badge.mjs` 导出 `badge = { count: 0 }`；index.mjs label 改 `() => { const n = badge.count; const base = makeT(lang.get())("panelLabel"); return n > 0 ? makeT(lang.get())("badge.pending").replace("{n}", String(n)) + " · " + base : base; }`；workbench：paint 时 `badge.count = needsReview({candidates: state.candidates, runs: state.runs}).count`；主栏顶部 tab bar 三按钮（i18n `tabs.*`——**全量 13 键随本任务一次落齐**，评审 P4：parity 只守同集不守完备，晚落会让 T9 显示键名字面量）；**tab 互斥显隐**：activeTab==="list"|"board"|"review" 为 mountWorkbench 闭包内部状态（paint 全量重建时保持，不进 store——评审 P10 措辞钉死：非「清单常显」）；页头增 badge chip（N>0 才显）点击切待我确认 tab
- 验证范围：`npm test`（logic badge 相关纯函数 + 既有全量）+ `npm run build`

- [ ] Step 1: 失败测试（logic.test.mjs：badge 文案格式化纯函数 `badgeLabel({ count, label, template })`——template 由调用方传 `t("badge.pending")`（`待确认 ({n})`），logic 层零 i18n 依赖）
```js
test("badgeLabel：计数前缀格式（i18n 模板注入）", () => {
  assert.equal(badgeLabel({ count: 2, label: "DSH Loop Forge", template: "待确认 ({n})" }), "待确认 (2) · DSH Loop Forge");
  assert.equal(badgeLabel({ count: 0, label: "DSH Loop Forge", template: "待确认 ({n})" }), "DSH Loop Forge");
});
```
- Run: `npm test 2>&1 | tail -6` — Expected: badgeLabel 不是函数。
- [ ] Step 2: 确认失败信号。
- [ ] Step 3: 最小实现——badge.mjs 持有者；logic.mjs 增 badgeLabel（`count > 0 ? template.replace("{n}", String(count)) + " · " + label : label`）；index.mjs label 接线（template 取 `makeT(lang.get())("badge.pending")`——新 i18n 键 `badge.pending` 双字典加入，随 T10 键清点一并落地或本任务先落两键）；workbench：paint 时 `badge.count = needsReview(...).count`；主栏 tab bar 与页头 badge chip 写 DOM（tab 切换为 workbench 内部 UI 状态，不进 store）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -1` — Expected: 全绿 + 双包构建成功。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(ui): 主栏三视图 tab + 页头 badge + 侧栏 label 计数"`

### Task 8: 看板视图组件

- 目标：6 列看板卡片化（复用行内信息密度），迁移走 candidate/stage 白名单。
- 涉及文件：Create `src/client/components/kanban.mjs`；Modify `src/client/components/workbench.mjs`（看板 tab 挂载）；Test `test/logic.test.mjs`（kanbanColumns 已在 T2）
- 接口契约：
  - Consumes: Task 2 kanbanColumns、既有 renderStrip/go 助手、api.stage（已有端点）
  - Produces: `renderKanban(container, { t, candidates, runs, view })`：6 列 flex 布局，卡片 = 候选（repo#number 标题 + 紧急度 chip + run 状态 chip（runBlock）），卡片底部迁移按钮（movable 卡片才渲染「移到 → 相邻合法 stage」按钮组，走 api.stage）；列头计数
- 验证范围：`npm test`（logic 已绿即可——组件无新纯函数）+ `npm run build`

- [ ] Step 1: 组件实现（本任务以构建+既有测试为验证；DOM 结构镜像 actions.mjs 的 chip/btn 风格，无新纯函数——kanbanColumns 在 T2 已单测）
- [ ] Step 2: Run: `npm run build 2>&1 | tail -1` — Expected: 双包构建成功。
- [ ] Step 3: workbench 看板 tab 挂载 renderKanban（activeTab==="board" 时渲染）。
- [ ] Step 4: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 5: checkpoint commit：`git add -A && git commit -m "feat(ui): 看板视图（6 列/白名单迁移）"`

### Task 9: 待我确认视图组件

- 目标：两分区收件箱（gate 等待 / G3 发版）+ 卡片动作齐全（Q8-A）。
- 涉及文件：Create `src/client/components/review.mjs`；Modify `src/client/components/workbench.mjs`（待我确认 tab 挂载）；Test `test/logic.test.mjs`（needsReview 已在 T2）
- 接口契约：
  - Consumes: Task 2 needsReview、api.runGate/runRetry/runCancel/releaseConfirm、runBlock
  - Produces: `renderReview(container, { t, candidates, runs, view, go })`：分区一「待你放行」= gateRuns 卡片（候选 key/标题 + G2 放行/驳回按钮走 api.runGate）；分区二「待发版确认」= releaseList 卡片 + 确认按钮（api.releaseConfirm(key, note="")）；空态文案 `review.empty`
- 验证范围：`npm test` + `npm run build`

- [ ] Step 1: 组件实现（needsReview 已单测；DOM 镜像既有 chip/btn 风格；go 助手由挂载点注入——workbench 传 `(fn) => run(view)(fn)` 等价闭包）
- [ ] Step 2: Run: `npm run build 2>&1 | tail -1` — Expected: 双包构建成功。
- [ ] Step 3: Run: `npm test 2>&1 | tail -5` — Expected: 全绿。
- [ ] Step 4: checkpoint commit：`git add -A && git commit -m "feat(ui): 待我确认收件箱（gate/G3 两分区 + 就地动作）"`

### Task 10: 设置面板飞书 Webhook + i18n 键清点

- 目标：URL 输入 + 测试按钮走新路由（i18n 键已在 T7 落齐）。
- 涉及文件：Modify `src/client/components/actions.mjs`（openSettings 增飞书段）、`src/client/api.mjs`（feishuTest/putFeishuWebhook——T6 若未落则本任务落）；Test `test/i18n.test.mjs`（parity 自动）；**i18n 键已在 T7 全量落齐，本任务零 locale 改动**（评审 P4：消除「键未落地先消费」窗口）
- 接口契约：
  - Consumes: Task 6 路由（PUT /dsh-l/feishu/webhook、POST /dsh-l/feishu/test）
  - Produces: 设置对话框增「飞书 Webhook URL」input（type=url）+「发送测试消息」按钮（成功 → chip 提示已发送；失败 → 错误 chip）；i18n 键消费（已由 T7 全量落齐：settings.feishuUrl/feishuTest/feishuTestOk、tabs.*）
- 验证范围：`npm test`（parity + logic）+ `npm run build`

- [ ] Step 1: 失败测试——i18n parity：仅在 zh-CN 加键不改 en → locale-parity 红（既有测试自动覆盖，无需新用例；本步骤为「确认 parity 守护在工作」的冒烟，可跳过）。改为直接实现 + 既有 parity/全量测试收口。
- [ ] Step 2: 实现——api.mjs 增 feishuTest/putFeishuWebhook；openSettings 增飞书段（input + 测试按钮，调用后按结果刷新 chip）；locale 双字典增 `settings.feishuUrl/settings.feishuTest/settings.feishuTestOk`、`tabs.list/tabs.board/tabs.review`、`review.empty`（zh 文案：清单/看板/待我确认/没有待确认事项；feishu：飞书 Webhook URL/发送测试消息/测试消息已发送；en 对应）。
- [ ] Step 3: Run: `set -o pipefail; npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -1` — Expected: 全绿 + 双包构建成功。
- [ ] Step 4: checkpoint commit：`git add -A && git commit -m "feat(ui/settings): 飞书 Webhook 配置与测试按钮 + i18n 键"`

### Task 11: backlog 清账（lastText 死代码 + sweep 口径注释 + runbook 提示）

- 目标：M2 产出评审移交的三条小项收尾。
- 涉及文件：Modify `src/engine/executor.mjs`（lastText/textOf 死代码删除——保留 turn/end 捕获）、`src/engine/workspace.mjs`（sweep 口径注释：目录 mtime≈clone 时刻，保守于 §5 终态口径）、docs/plans 本文件尾注（runbook inject 提示）
- 接口契约：
  - Consumes: 无
  - Produces: executor.mjs 无 lastText/textOf 残留（grep 自证 0 命中）；workspace.mjs sweep 注释含「口径：目录 mtime（≈clone 时刻），保守于 §5 终态口径」；最终验证节含 inject 排查提示（本计划 T12 前置完成，无需改动）
- 验证范围：`npm test` 全绿 + `grep -c lastText src/engine/executor.mjs`（期望 0）

- [ ] Step 1: 变更前检查——Run: `grep -c lastText src/engine/executor.mjs` — Expected: ≥2（记录基数）。
- [ ] Step 2: 删除 lastText 采集与 textOf 助手（保留 turn/end endKind 捕获——成功路径需要它）；workspace.mjs sweep 注释增口径说明；**runbook inject 提示落点=本计划 T12 Step 2 装机注记**（评审 P6：原「无需改动」措辞删除，装机注记补写 inject 排查要点——自 M2 计划装机注记精简继承）。
- [ ] Step 3: Run: `set -o pipefail; grep -c lastText src/engine/executor.mjs >/dev/null; echo grep-exit=$?; npm test 2>&1 | tail -5` — Expected: grep-exit=1（0 命中）且全绿。
- [ ] Step 4: checkpoint commit：`git add -A && git commit -m "chore(engine): lastText 死代码清理 + sweep 保留期口径注释（backlog）"`

### Task 12: 最终验证与收口

- 目标：全量收口，停下交产出评审。
- [ ] Step 1: Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -18`
  Expected: 双包构建成功（新指纹）；全量测试绿（143 存量 + 新增 ≥8——评审 P7：计划内 test 块实数 8）；提交序列 docs + Task 1–11。
- [ ] Step 2: 停下交产出评审（章程同 M1/M2：独立评审 Agent + 台账 + 最多 5 轮）。装机冒烟（可选）判据同 T12 装机注记。

## 执行纪律

- 开始实现前先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动手。
- 按任务编号顺序执行；每任务跑完它定义的验证再进下一个；docs 变更独立 commit（T1 的 README/PRODUCT/GLOSSARY 单独 docs commit）。
- 测试桩只走注入（fetch/execFile/io/world 全可注入），单测不真实出网（飞书 POST 用 fake fetch）、不真实 spawn/clone。
- workbench.mjs 本任务为主改动文件（tab 结构 + 挂载），但 extend?.rowActions 的 `{t, view, lang}` 签名与「workbench 仅 extend 机制变更」红线维持：不改 extend 调用签名。
- 遇阻、重复失败或计划与仓库现实不符：立即停下说明，不猜。
- 全部任务完成后运行最终验证并输出修改摘要，然后停下交评审。

## 最终验证

- Run: `set -o pipefail; npm run build && npm test 2>&1 | tail -8 && git log --oneline -18`
- Expected: 双包构建成功（新指纹，区别于 M2 的 e1cd038eeb46）；全量测试绿（143 存量 + 新增 ≥8——评审 P7：计划内 test 块实数 8；测试文件 17 → 18：新增 feishu.test.mjs）；提交序列 docs + Task 1–11。
- 生效探针：构建指纹变化；`GET /dsh-l/state` 无新键（M3 聚合在客户端）——冒烟观察点为主栏三 tab、看板 6 列、待我确认两分区、设置面板飞书段（装机可选）。

## 审阅 Checkpoint

- 计划正文结束后请求用户审阅；审阅通过前不进入实现。M4（Role 入册 + 任务包 v2 + devflow-lite）在本计划验收后另立。
