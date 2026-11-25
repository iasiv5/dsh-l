# dsh-l 收敛收口实施计划（C1 交付 PR 关闭态、C2 结束开工会话、C3 错误码人话）

## 目标

对里程碑 1、2 做三项收口，均为已批准设计的直接补全，不引入新的产品决定：

1. **C1**：引擎开的 PR 被上游关闭但未合并时，来源候选的交付标记如实显示「已关闭」，不再显示「待合并」（design-v2 §20 第 30 条；评审 K21 I6 上半）。
2. **C2**：开工会话被归档或用完后，给一个明确的「结束开工会话」动作清掉工作索引里的活跃行，候选不再卡在「进行中」。出处是 design-v2 §20 落地注记的未结项「待办（计划外建议）」；归档宿主会话复用第 16 条的钩子，但「结束开工会话」本身是 §20 没有的新语义，含四个小决定（见架构快照 2），随本次收口写进 §20 落地注记（评审 Q11）。
3. **C3**：行内与批量动作失败时，把服务端错误码翻译成人话；未收录的码保持原样兜底（评审 K21 I16）。

**不在本计划**：里程碑 3（看板删除、会话页删除、待拍板退场、标签页 2 合 1、发版确认降为标记，design-v2 §20 第 3 / 23 / 31–33 条）另走设计简报；批量清理界面；自动对照宿主归档集清理索引；`managedRoot` 缺省守卫（生产路径不可达）。

## 架构快照

1. **交付三态**：`candidate.delivery` 增两个**可选**字段 `closed?: boolean` 与 `closedAt?: string | null`（创建交付时不初始化，只在回填「已关闭」时写入；读方按缺席即 false / null 处理）。`postRefresh` 回填时先看 `mergedAt`（已合并），否则看 `state === "closed"`（已关闭，未合并）。已终态（`merged` 或 `closed`）的交付不再逐次查 `getPr`。脚注按三态显示「待合并 / 已合并 / 已关闭」。
2. **结束开工会话**（本次收口的四个小决定，评审 Q11 / Q21 / Q10 / Q18）：
    - (i) **结束＝标记**：`store.endWorkSession(key)` 给当前活跃行标 `endedAt`（不追加新行——追加会让会话页多出幽灵行）。`getWorkSession` 返回自末位向前最近一条无 `endedAt` 的行；全部已结束 → null。同一候选的多条历史活跃行可逐条结束。
    - (ii) **阶段回退只在最后一条活跃行结束时发生**：此时若候选在 `building` **且没有存活执行**，回 `triaged`（与「取消执行后可再次开工」一致）。还有活跃行时不回退——它明明还有会话在；有存活执行（running / waiting 的 run）时不回退——不让用户动作成为引擎 `syncStage` 之外的第二写者（§20 第 7 条）。
    - (iii) **归档宿主会话**：经 M1 Task 7 的 `archiveSession` 钩子（宿主服务缺席或失败静默，不阻断结束）。
    - (iv) **入口**：候选行「更多」里的「结束会话」，仅当有活跃开工会话时出现。
    路由 `POST /dsh-l/work/end`：候选须有活跃行，否则 404；留痕 `work-session.ended`。
3. **错误码人话**：新增纯函数 `errorText(error, t)`（`src/client/logic.mjs`）：在 `errors.codes.<码>` 查到则返回该文案，否则返回 `null`，由调用点回落到「<动作失败> (码)」（未收录的可能是网络错误或宿主新增的码，带前缀比裸码信息多）。`actions.mjs` 内五处拼接点（批量分诊、行内 `go`、行内「开工」失败、「更多 › 另开会话」失败、`startAnother`）统一经它翻译；其它文件的同类拼接列为范围外。**输出口径**（评审 Q22）：行内 `go` 与批量分诊的错误行就在触发的按钮下方，收录码只输出人话；开工 / 另开 / `startAnother` 的失败 chip 输出「<动作失败>：<人话>」——用户看到一句人话时要知道是哪个动作失败了。未收录一律回落「<动作失败> (码)」。动态键 `errors.codes` 进入 i18n 白名单守护表（本计划对「动态前缀键不得新增」的唯一例外），33 个码逐键列出。

## 全局约束（逐字继承 dsh-l 仓约与收敛计划）

- 零运行时依赖（devDeps 仅 esbuild）；`package.json` / `package-lock.json` 不动。
- UI 改动先 `npm run build` 再全量 `npm test`；`lib/client.js` + `lib/host.js` 随源码同 commit 入库；提交前显式退出码双 0。
- 双语 parity：`zh-CN.mjs` 与 `en.mjs` 键集相同；新增 `t("…")` 一律静态字面量键；动态前缀键不得新增。**本计划一处例外**：`errorText` 用动态键 `t("errors.codes." + code)`——按码查表本质上就是动态前缀，仓库既有白名单守护正是为此设（`run.status`、`groups` 等 7 个前缀在册）。该前缀登记进 `test/i18n.test.mjs` 的 `WHITELIST`，段内键逐个列出，守护照常生效。
- design-lint：变量名不得遮蔽 deps seam `a` / `ctx`；不用内联 `min-height` 等 R2 清单样式。
- impeccable：不用浮层；「确认执行」不做反色；改动的 UI 源文件 detector 逐文件集合比对不新增 advisory（命令内联在本计划「最终验证」，基线是本计划开工前的提交）。
- 红线：三道人工闸门人工；`worksession.mjs` 中 `.dispose(` 恰 1 处（rollback-only），本计划不新增 dispose；`meta.cwd` 与 `workingDirectory.set` 成对且 send 在后。
- TDD：先红后绿；红必须落在目标断言行；新符号在测试里用顶层动态导入引入；`node --test` 选项在文件参数之前；管道用 `set -o pipefail`；`grep -F`；计数 0 时 grep 退出码为 1，不入 `&&` 链。

## 测试基线（2026-11-25 00:13 实测，HEAD `6c6a37b`）

| 文件 | 起点 | 本计划后 | 增量来源 |
|---|---|---|---|
| store | 28 | 29 | Task 2 +1 |
| github | 35 | 35 | 不变（`getPr` 已返回 `state`） |
| handlers | 77 | 81 | Task 1 +1、Task 3 +3 |
| client-render | 78 | 81 | Task 1 +1、Task 4 +1、Task 5 +1 |
| logic | 32 | 33 | Task 5 +1 |
| host-smoke | 8 | 8 | 不变 |
| i18n / locale-parity / design-lint | 6 / 1 / 1 | 6 / 1 / 1 | 不变 |
| 全量 | 412 | 421 | +9 |

**逐任务累计**（按顺序执行）：Task 1 → 414；Task 2 → 415；Task 3 → 418；Task 4 → 419；Task 5 → 421（Task 5 在 client-render 加 1 条、logic 加 1 条）。

**计数口径**：各任务 Step 2 / Step 4 写的是**按任务顺序执行到该点**的单文件与全量计数（含此前任务的增量）。若只单跑某一任务做红绿复核，数字会不同——例如只做 Task 2 + Task 3 时 handlers 红为 80 / 77 / 3、绿 80 / 80 / 0，全量 416；做全部五个任务时终点 421（评审第 3 轮在副本实测；执行方原估 420，少算了 Task 5 的 1 条）。评审复核时请按「顺序累计」核对，或按此说明换算。

## 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/store.mjs` | 改 | `setDelivery` 已是合并写，`closed` / `closedAt` 无需改；新增 `endWorkSession(key)` 给末位活跃行标 `endedAt`（不追加行）；`getWorkSession` 自末位向前取最近一条无 `endedAt` 的行 |
| `src/handlers.mjs` | 改 | `postRefresh` 回填关闭态；新增 `postWorkEnd` |
| `src/host.mjs` | 改 | `makeHandlers` 注入 `archiveSession`（调用文件内既有的 `archiveSession(ctx, sessionId)`，M1 Task 7）；路由表增 `/dsh-l/work/end` |
| `src/client/logic.mjs` | 改 | 导出 `errorText(error, t)` |
| `src/client/components/actions.mjs` | 改 | `go` 与批量分诊经 `errorText`；「更多」增「结束会话」；`startAnother` 经 `errorText` |
| `src/client/components/candidateRow.mjs` | 改 | 脚注交付三态 |
| `src/client/api.mjs` | 改 | `workEnd(key)` |
| `src/client/locale/zh-CN.mjs` / `en.mjs` | 改 | `delivery.closed`、`work.endSession`、`errors.codes.*` |
| `docs/design-v2.md` | 改 | §20 末尾落地注记 |
| `README.md` / `README.en.md` | 改 | 交付三态与结束会话各一句 |

一起变化的边界：`store.endWorkSession`（Task 2）与 `handlers.postWorkEnd`（Task 3）是两个任务，Task 3 消费 Task 2 的产出；`errorText` 与它的五处消费点必须同任务（Task 5）；词典键与消费点同任务。

## 任务清单

### Task 0: 基线核对

- Step 1：`set -o pipefail; cd /home/ubuntu/workspace/dsh-l; npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"` → `ℹ tests 412`、`ℹ pass 412`、`ℹ fail 0`。
- Step 2：`git status --short` → 空；`git rev-parse --short HEAD` → `6c6a37b` 或其后仅含文档提交。

### Task 1: `postRefresh` 回填「已关闭」+ 脚注三态

- Step 1（红）：
  - `test/handlers.test.mjs` 末尾追加：
    ```js
    test("postRefresh：未合并的交付 PR 已关闭 → delivery.closed 回填；已终态的交付不再查 getPr（收敛收口 C1）", async () => {
      const store = openStore(); login(store);
      store.setWatch(["o/good"]);
      store.upsertCandidates([{ repo: "o/good", type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
      store.setDelivery("o/good#issue#1", { prNumber: 81, prUrl: "https://github.com/o/good/pull/81", merged: false, mergedAt: null, closed: false, closedAt: null }, "delivery.pr");
      const provider = PROVIDER();
      const asked = [];
      provider.getPr = async ({ number }) => { asked.push(number); return { number, state: "closed", mergedAt: null, htmlUrl: "https://github.com/o/good/pull/81", headRef: "b" }; };
      await makeHandlers({ store, provider, triage: noTriage, now: () => new Date("2026-11-24T00:00:00Z") }).postRefresh();
      assert.deepEqual(store.getCandidate("o/good#issue#1").delivery, { prNumber: 81, prUrl: "https://github.com/o/good/pull/81", merged: false, mergedAt: null, closed: true, closedAt: "2026-11-24T00:00:00.000Z" });   // toISOString 带毫秒（评审 P1：原期望缺 .000，照计划执行必卡）
      assert.equal(store.getCandidate("o/good#issue#1").history.at(-1).event, "delivery.closed");
      await makeHandlers({ store, provider, triage: noTriage, now: () => new Date("2026-11-24T00:00:00Z") }).postRefresh();
      assert.deepEqual(asked, [81], "已终态不再查");
    });
    ```
    夹具：回填的 `closedAt` 取自 `now()`，测试代码块里两处 `makeHandlers` 已带 `now: () => new Date("2026-11-24T00:00:00Z")`——只写在说明里不写进代码块，照块抄会漏（执行方自检实测全量 421 / 420 / 1）；期望值用 `toISOString` 的形态（带 `.000Z`）。
  - `test/client-render.test.mjs` 末尾追加：
    ```js
    test("candidateRow：delivery.closed → 脚注出『PR #n · 已关闭』；merged 仍为『已合并』（收敛收口 C1）", async () => {
      const { renderRow } = await import("../src/client/components/candidateRow.mjs");
      const mk = (delivery) => ({ key: "o/r#issue#1", repo: "o/r", type: "issue", number: 1, title: "t", stage: "shipped", triage: null, delivery });
      const closed = new FakeElement("div");
      renderRow(closed, mk({ prNumber: 81, prUrl: "u", merged: false, mergedAt: null, closed: true, closedAt: "t" }), t, { expanded: false, onToggle: () => {} });
      assert.ok(find(closed, (n) => n.className === "rowmeta")[0].textContent.includes("PR #81") && find(closed, (n) => n.className === "rowmeta")[0].textContent.includes(t("delivery.closed")), "已关闭标记");
      const merged = new FakeElement("div");
      renderRow(merged, mk({ prNumber: 81, prUrl: "u", merged: true, mergedAt: "t", closed: false, closedAt: null }), t, { expanded: false, onToggle: () => {} });
      assert.ok(find(merged, (n) => n.className === "rowmeta")[0].textContent.includes(t("delivery.merged")), "已合并不变");
    });
    ```
- Step 2：`node --test test/handlers.test.mjs` → 78 / 77 / 1；`node --test test/client-render.test.mjs` → 79 / 78 / 1。红在各自第一条 `assert`。
- Step 3（绿）：
  - `src/handlers.mjs` 的 `postRefresh`：把下面这块（现有回填循环）
  ```js
            for (const c of delivered) {
              if (c.delivery.merged) continue;
              try {
                const pr = await provider.getPr({ repo, number: c.delivery.prNumber, token: tk, fetch });
                if (pr?.mergedAt) store.setDelivery(c.key, { merged: true, mergedAt: pr.mergedAt }, "delivery.merged");
              } catch {}
            }
  ```
  整段替换为：
    ```js
            for (const c of delivered) {
              if (c.delivery.merged || c.delivery.closed) continue;   // 终态：已合并 / 已关闭未合并，都不再查
              try {
                const pr = await provider.getPr({ repo, number: c.delivery.prNumber, token: tk, fetch });
                if (pr?.mergedAt) store.setDelivery(c.key, { merged: true, mergedAt: pr.mergedAt }, "delivery.merged");
                else if (pr?.state === "closed") store.setDelivery(c.key, { closed: true, closedAt: now().toISOString() }, "delivery.closed");
              } catch {}
            }
    ```
  - `src/client/components/candidateRow.mjs` 脚注：
    ```js
        link.textContent = (segs.length ? " · " : "") + "PR #" + d.prNumber + " · " + (d.merged ? t("delivery.merged") : d.closed ? t("delivery.closed") : t("delivery.pending"));
    ```
  - `src/client/locale/zh-CN.mjs`：`delivery: { pending: "待合并", merged: "已合并", closed: "已关闭" },`；`src/client/locale/en.mjs`：`delivery: { pending: "Awaiting merge", merged: "Merged", closed: "Closed" },`。
- Step 4：`handlers` → 78 / 78 / 0；`client-render` → 79 / 79 / 0；`i18n`、`locale-parity` 不变。
- 接口：Produces `delivery.closed` / `delivery.closedAt` 字段语义；Task 6 文档引用。

### Task 2: `store.endWorkSession` 与 `getWorkSession` 的结束语义

- Step 1（红）：`test/store.test.mjs` 末尾追加：
  ```js
  test("endWorkSession：给当前活跃行标 endedAt，不追加行；getWorkSession 回退到最近一条未结束行；全结束 → null（收敛收口 C2，评审 P2）", () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json");
    const s = createStore({ filePath, now: () => new Date("2026-11-25T00:00:00Z") });
    s.upsertCandidates([raw(3)]);
    const key = candidateKey("iasiv5/dsh-skins", "issue", 3);
    s.appendWorkSession(key, { sessionId: "dsh-l:work-a", cwd: "/w/a", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    s.appendWorkSession(key, { sessionId: "dsh-l:work-b", cwd: "/w/b", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    assert.equal(s.getWorkSession(key).sessionId, "dsh-l:work-b", "末位为活跃");
    // 结束 b：标 endedAt，行数不变，回退到 a
    assert.equal(s.endWorkSession(key), "dsh-l:work-b");
    const rows = s.listWorkSessions().find((r) => r.key === key).rows;
    assert.equal(rows.length, 2, "不追加行");
    assert.equal(rows[1].endedAt, "2026-11-25T00:00:00.000Z");
    assert.equal(rows[0].endedAt, undefined, "更早的行不动");
    assert.equal(s.getWorkSession(key).sessionId, "dsh-l:work-a", "回退到最近一条未结束行");
    assert.equal(createStore({ filePath }).getWorkSession(key).sessionId, "dsh-l:work-a", "落盘可读回");
    // 结束 a：全结束 → null
    assert.equal(s.endWorkSession(key), "dsh-l:work-a");
    assert.equal(s.getWorkSession(key), null);
    assert.equal(s.endWorkSession(key), null, "没有活跃行 → 返回 null，不抛");
    // 再开一个新行 → 又有活跃行（结束不封死候选）
    s.appendWorkSession(key, { sessionId: "dsh-l:work-c", cwd: "/w/c", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    assert.equal(s.getWorkSession(key).sessionId, "dsh-l:work-c");
    assert.throws(() => s.endWorkSession("o/r#issue#404"), /not found/);
  });
  ```
- Step 2：`node --test test/store.test.mjs` → 29 / 28 / 1，红在 `s.endWorkSession is not a function`。
- Step 3（绿）：`src/store.mjs` 两处编辑（闭包 `activeRowOf` 必须放在 `return {` **之前**，与 `need`、`touch` 同级——放进对象字面量的成员之间是语法错误，`const` 不能出现在那里；文件内方法全部走闭包，不用 `this`，评审 Q18）：
  - 编辑 A：在 `const touch = (c, event, detail) => { … };` 之后、`return {` 之前插入：
  ```js
    // 开工会话索引：自末位向前最近一条无 endedAt 的行 = 活跃行（收敛收口 C2，评审 P2：结束是「标记」不是「追加」，
    // 追加会让 getWorkSessions 多出幽灵行；回退语义让同一候选的多条历史活跃行可以逐条结束）。
    const activeRowOf = (key) => {
      const rows = doc.workSessions[key] ?? [];
      for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].endedAt) return rows[i];
      return null;
    };
  ```
  - 编辑 B：把返回对象里的 `getWorkSession`（下面这块）替换为紧随其后的块，并新增 `endWorkSession`：
  ```js
      getWorkSession: (key) => {
        const rows = doc.workSessions[key];
        return rows && rows.length ? rows[rows.length - 1] : null;
      },
  ```
  ```js
      getWorkSession: (key) => activeRowOf(key),
      endWorkSession(key) {
        need(key);
        const active = activeRowOf(key);
        if (!active) return null;
        active.endedAt = now().toISOString();
        active.updatedAt = active.endedAt;
        persist();
        return active.sessionId;
      },
  ```
- Step 4：`store` → 29 / 29 / 0；全量 → 415 / 415 / 0。
- 接口：Produces `store.endWorkSession(key) → sessionId | null`；`getWorkSession` 的回退语义。Task 3 消费。

### Task 3: 路由 `POST /dsh-l/work/end`

- Step 1（红）：`test/handlers.test.mjs` 追加三条（下面一个围栏块含三条完整的 `test(...)`，整块追加到文件末尾）：
  ```js
  test("postWorkEnd：结束当前活跃行、留痕 work-session.ended、调 archiveSession；多条历史活跃行可逐条结束，最后一条结束时 building 才回 triaged（收敛收口 C2，评审 P2 / Q21）", async () => {
    const store = openStore(); login(store); seed(store);
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-a", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-b", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    await store.setStage("o/r#issue#1", "building", "G1 pass");
    const archived = [];
    const mk = () => makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine: { hasAliveRun: () => false }, archiveSession: async (id) => { archived.push(id); } });
    // 第一次：结束 b，回退到 a；仍有活跃行 → 阶段不动
    const r1 = await mk().postWorkEnd({ key: "o/r#issue#1" });
    assert.deepEqual([r1.ok, r1.sessionId], [true, "dsh-l:work-b"], "结束的是当前活跃行");
    assert.equal(store.getWorkSession("o/r#issue#1").sessionId, "dsh-l:work-a", "回退到更早的活跃行——入口不消失");
    assert.equal(store.getCandidate("o/r#issue#1").stage, "building", "仍有活跃行 → 阶段不动");
    // 第二次：结束 a，没有活跃行了 → building 回 triaged
    const r2 = await mk().postWorkEnd({ key: "o/r#issue#1" });
    assert.deepEqual([r2.ok, r2.sessionId], [true, "dsh-l:work-a"]);
    assert.equal(store.getWorkSession("o/r#issue#1"), null);
    assert.equal(store.getCandidate("o/r#issue#1").stage, "triaged", "最后一条结束 → 回已分诊");
    assert.equal(store.getCandidate("o/r#issue#1").history.at(-1).event, "work-session.ended");
    assert.deepEqual(archived, ["dsh-l:work-b", "dsh-l:work-a"]);
  });

  test("postWorkEnd：无活跃行 → 404 no-work-session；归档钩子抛错不影响结束（缺席静默）；非 building 不改阶段", async () => {
    const store = openStore(); login(store); seed(store);
    const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
    assert.deepEqual([(await h.postWorkEnd({ key: "o/r#issue#1" })).error, 404], ["no-work-session", 404]);
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-b", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    const boom = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine: { hasAliveRun: () => false }, archiveSession: async () => { throw new Error("registry down"); } });
    assert.equal((await boom.postWorkEnd({ key: "o/r#issue#1" })).ok, true, "归档失败不阻断结束");
    assert.equal(store.getWorkSession("o/r#issue#1"), null);
    assert.equal(store.getCandidate("o/r#issue#1").stage, "inbox", "非 building 的候选不改阶段（seed 默认 inbox）");
  });

  test("postWorkEnd：有存活执行时不改阶段——用户动作不得成为引擎 syncStage 之外的第二写者（评审 Q10，design-v2 §20 第 7 条）", async () => {
    const store = openStore(); login(store); seed(store);
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-a", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    await store.setStage("o/r#issue#1", "building", "G1 pass");
    const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, engine: { hasAliveRun: () => true } });   // run 仍在 running / waiting
    assert.equal((await h.postWorkEnd({ key: "o/r#issue#1" })).ok, true, "会话照常结束");
    assert.equal(store.getWorkSession("o/r#issue#1"), null);
    assert.equal(store.getCandidate("o/r#issue#1").stage, "building", "有存活执行 → 阶段不动，留给引擎");
  });
  ```
- Step 2：`node --test test/handlers.test.mjs` → 81 / 78 / 3，红在 `h.postWorkEnd is not a function`。
- Step 3（绿）：
  - `src/handlers.mjs`：`makeHandlers` 解构增 `archiveSession = null`（签名里 `sessionRoot = null,` 之后）；下面的围栏块是**方法实现**（一个对象方法，追加在 `postWorkDeliver` 之后、`getRoles` 之前），不是测试：
  ```js
      // 结束开工会话（收敛收口 C2）：结束当前活跃行并留痕；仅当「没有活跃行了」且「没有存活执行」且候选在 building 时回已分诊——
      // 有存活执行时不碰阶段，用户动作不得成为引擎 syncStage 之外的第二写者（评审 Q10，design-v2 §20 第 7 条）。
      async postWorkEnd(body) {
        const gate = requireAuth(); if (gate) return gate;
        const key = body?.key;
        const c = store.getCandidate(key);
        if (!c) return fail("not found", 404);
        const active = store.getWorkSession(key);
        if (!active) return fail("no-work-session", 404);
        store.endWorkSession(key);
        const engineBusy = engine ? engine.hasAliveRun(key) : false;
        if (c.stage === "building" && !store.getWorkSession(key) && !engineBusy) store.setStage(key, "triaged", "work session ended");
        store.recordHistory(key, "work-session.ended", active.sessionId);
        try { await archiveSession?.(active.sessionId); } catch {}
        return { ok: true, sessionId: active.sessionId };
      },
  ```
  - `src/host.mjs`：`makeHandlers` 调用处增 `archiveSession: (sessionId) => archiveSession(ctx, sessionId),`（函数已在文件内，M1 Task 7）；路由表在 `/dsh-l/work/deliver` 之后增 `"/dsh-l/work/end": { POST: handlers.postWorkEnd },`。
- Step 4：`handlers` → 81 / 81 / 0；`host-smoke` → 8 / 8 / 0；全量 → 418 / 418 / 0。
- 接口：Consumes Task 2 的 `store.endWorkSession`；Produces 路由 `POST /dsh-l/work/end`，请求 `{ key }`，响应 `{ ok, sessionId }` 或 404 `no-work-session`。Task 4 消费。

### Task 4: 候选行「结束会话」入口

- Step 1（红）：`test/client-render.test.mjs` 追加：
  ```js
  test("「更多」里的「结束会话」：有活跃开工会话时出现；点击调 workEnd(key)（收敛收口 C2）", async () => {
    const { installActions } = await import("../src/client/components/actions.mjs");
    const calls = [];
    const api = { workEnd: async (key) => { calls.push(key); return { ok: true, sessionId: "dsh-l:work-a" }; } };
    const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [], deps: { api } });
    const view = { reload: async () => {}, shadow: new FakeElement("shadow") };
    const d = new FakeElement("div");
    hooks.rowActions(d, mkCandidate("building", { sessionId: "dsh-l:work-a", cwd: "/w" }), { t, view, lang: "zh-CN" });
    const more = find(d, (n) => String(n.tagName).toUpperCase() === "DETAILS" && (n.children[0]?.textContent ?? "") === t("actions.more"))[0];
    assert.ok(more, "有活跃会话 → 有「更多」");
    const endBtn = find(more, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("work.endSession"))[0];
    assert.ok(endBtn, "有「结束会话」");
    endBtn.onclick(); await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(calls, ["o/r#issue#1"]);
    // 无活跃会话 → 无「结束会话」
    const d2 = new FakeElement("div");
    hooks.rowActions(d2, mkCandidate("triaged"), { t, view, lang: "zh-CN" });
    assert.equal(find(d2, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("work.endSession")).length, 0);
  });
  ```
- Step 2：`node --test test/client-render.test.mjs` → 80 / 79 / 1，红在前一行 `assert.ok(more, "有活跃会话 → 有「更多」")`（评审 Q16：该夹具没有记住目录，`canStart` 为假，现有代码整个「更多」块都不渲染，所以先红在 `more`）。
- Step 3（绿）：
  - `src/client/api.mjs`：在 `workDeliver` 之后加一行（助手名是 `send`，与 `workDeliver` 同款）：
    ```js
      workEnd: (key) => send("dsh-l/work/end", { key }),
    ```
  - `src/client/components/actions.mjs`：「更多」块的条件由 `if (canStart || canAnother)` 改为 `if (canStart || canAnother || c.work?.sessionId)`；块内增：
    ```js
            if (c.work?.sessionId) {
              more.append(btn(t("work.endSession"), () => go(async () => { await a.workEnd(c.key); })));
            }
    ```
  - 词典（整行替换，键后必须带逗号——行内片段不带逗号、没写插入位置，照抄进 `work: { … }` 即 SyntaxError，三个文件级全红；评审 Q28）：
    - `src/client/locale/zh-CN.mjs`：把 `    startFailed: "开工失败",` 这一行替换为下面两行：
  ```js
    startFailed: "开工失败",
    endSession: "结束会话",
  ```
    - `src/client/locale/en.mjs`：把 `    startFailed: "Start failed",` 这一行替换为下面两行：
  ```js
    startFailed: "Start failed",
    endSession: "End session",
  ```
- Step 4：`client-render` → 80 / 80 / 0；`i18n`、`locale-parity`、`design-lint` 不变；全量 → 419 / 419 / 0。
- 接口：Consumes Task 3 的路由；Produces 用户入口。

### Task 5: 错误码人话 `errorText`

- Step 1（红）：
  - `test/logic.test.mjs` 追加（新符号动态导入）：
    ```js
    test("errorText：收录的码 → 词典文案；未收录 → null（调用点回落旧格式）；无 error → null（收敛收口 C3）", async () => {
      const { errorText } = await import("../src/client/logic.mjs");
      const dict = { "errors.codes.managed-dir-explicit": "托管克隆请用「托管克隆」按钮进入", "errors.codes.gate-requires-gating": "先对待拍板候选放行 G1" };
      const t = (k) => dict[k] ?? k;
      assert.equal(errorText("managed-dir-explicit", t), "托管克隆请用「托管克隆」按钮进入");
      assert.equal(errorText(new Error("gate-requires-gating"), t), "先对待拍板候选放行 G1");
      assert.equal(errorText("some-new-code", t), null, "未收录 → null，调用点回落「操作失败 (码)」");
      assert.equal(errorText(undefined, t), null, "无错误 → null");
      assert.equal(errorText(new Error(""), t), null, "空消息 → null");
    });
    ```
  - `test/client-render.test.mjs` 追加一条新用例：
    ```js
    test("动作失败：收录的错误码显示人话；未收录的码保持「操作失败 (码)」；开工与另开失败同样翻译（收敛收口 C3）", async () => {
      const { installActions } = await import("../src/client/components/actions.mjs");
      const mkHooks = (api) => installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [], deps: { api } });
      const settle = () => new Promise((r) => setTimeout(r, 10));
      // 1) 行内迁移失败：收录的码 → 人话，不带原码括注
      const known = new Error("managed-dir-explicit"); known.status = 409;
      const h1 = mkHooks({ stage: async () => { throw known; } });
      const d1 = new FakeElement("div");
      h1.rowActions(d1, mkCandidate("triaged"), { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
      find(d1, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("actions.moveTo") + " " + t("groups.closed"))[0].onclick(); await settle();
      const e1 = find(d1, (n) => n.className === "rowerr")[0].textContent;
      assert.ok(e1.includes(t("errors.codes.managed-dir-explicit")) && !e1.includes("(managed-dir-explicit)"), "收录的码显示人话：" + e1);
      // 2) 未收录的码 → 回落「操作失败 (码)」
      const h2 = mkHooks({ stage: async () => { throw new Error("boom"); } });
      const d2 = new FakeElement("div");
      h2.rowActions(d2, mkCandidate("triaged"), { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
      find(d2, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("actions.moveTo") + " " + t("groups.closed"))[0].onclick(); await settle();
      const e2 = find(d2, (n) => n.className === "rowerr")[0].textContent;
      assert.ok(e2.includes(t("errors.actionFailed")) && e2.includes("(boom)"), "未收录回落旧格式：" + e2);
      // 3) 行内「开工」失败（workStart 的码）同样翻译
      const h3 = mkHooks({ workStart: async () => ({ error: "work-cwd-conflict", status: 409 }) });
      hooks_strip_dir(h3, { "o/r": "/home/u/workspace/r" });
      const d3 = new FakeElement("div");
      h3.rowActions(d3, mkCandidate("gating"), { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
      find(d3, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("work.startBtn"))[0].onclick(); await settle();
      const e3 = d3.textContent;
      assert.ok(e3.includes(t("work.startFailed") + "：" + t("errors.codes.work-cwd-conflict")) && !e3.includes("(work-cwd-conflict)"), "开工失败翻译（动作失败：人话）：" + e3);
      // 4) startAnother：收录 → 「另开会话失败：<人话>」；未收录 → 「另开会话失败 (码)」；t 缺省安全
      const h4 = mkHooks({ workStart: async () => ({ error: "managed-dir-explicit", status: 409 }) });
      assert.equal(await h4.startAnother("o/r#issue#9", "/w"), t("sessions.anotherFailed") + "：" + t("errors.codes.managed-dir-explicit"));
      const h5 = mkHooks({ workStart: async () => ({ error: "boom", status: 500 }) });
      assert.equal(await h5.startAnother("o/r#issue#9", "/w"), t("sessions.anotherFailed") + " (boom)");
    });
    function hooks_strip_dir(hooks, workDirs) { hooks.strip(new FakeElement("div"), { t, state: { candidates: [], runs: [], workflow: { templates: [] }, settings: { workDirs } } }); }
    ```
  - **改一条既有测试**（`test/client-render.test.mjs` 中「会话页「另开」失败就地呈现原因；startAnother 把错误响应转成文案、成功返回 null（评审 K21 I15）」用例，约第 2121 行起）的一处断言——它钉的是「码原样出现在括号里」，而 `managed-dir-explicit` 本计划收录后会被翻译：
    ```js
      // 原：assert.equal(failed, t("sessions.anotherFailed") + " (managed-dir-explicit)", "错误响应转成文案");
      assert.equal(failed, t("sessions.anotherFailed") + "：" + t("errors.codes.managed-dir-explicit"), "错误响应转成文案（收录的码翻译，收敛收口 C3）");
    ```
    其余既有测试不动：`「错误文案=操作失败+消息」`（约第 1030 行起）钉的是未收录码 `boom`，按本任务的回落规则仍然成立。
- Step 2：`node --test test/logic.test.mjs` → 33 / 32 / 1（红在 `errorText is not a function`）；`node --test test/client-render.test.mjs` → 81 / 79 / 2（新用例红在 `includes(人话)`；改过断言的既有用例红在 `managed-dir-explicit` 被翻译）。
- Step 3（绿）：
  - `src/client/logic.mjs` 末尾：
    ```js
    // 错误码人话（收敛收口 C3，评审 K21 I16）：服务端 fail(code) 的码经词典 errors.codes.<码> 翻译；未收录返回 null，
    // 由调用点回落到「<动作失败> (码)」——未收录的可能是网络错误或宿主新增的码，带前缀比裸码信息多。
    export function errorText(error, t) {
      const code = String(error?.message ?? error ?? "").trim();
      if (!code) return null;
      const text = t("errors.codes." + code);
      return text === "errors.codes." + code ? null : text;
    }
    ```
    这是动态键，i18n 白名单守护（`test/i18n.test.mjs`）会报「未知动态前缀 `errors.codes`」，且逐键核对段内不得有白名单外的键。在 `WHITELIST` 增一项，数组必须与下面词典的 33 个键逐字一致。口径（评审 Q07）：`handlers.mjs` 内 `fail("<kebab 字面量>"` 的 28 个（正则须含数字——`gate-not-available-in-v1` 曾因 `[a-z-]` 漏掉）+ 开工会话透传 2 个（`worksession.mjs` 的 `candidate-not-found`、`kickoff-failed`）+ 引擎透传 3 个（`engine.mjs` 的 `retry-requires-failed-or-cancelled`、`retry-requires-failed`、`attempt-exhausted`，行内「重试该节点」经 `go` 直达）。核对命令：`rg -o 'fail\("[a-z0-9-]+"' src/handlers.mjs | sed -E 's/.*fail\("([a-z0-9-]+)"/\1/' | sort -u | wc -l` → 28。带空格的整句（`not found` / `invalid gate` 等）不是 kebab 码，不进词典，按回落规则带前缀显示。
    ```js
      "errors.codes": ["gate-requires-gating", "engine-issue-only", "run-already-active", "workspace-not-found", "managed-dir-explicit", "work-cwd-conflict", "no-work-session", "deliver-requires-building", "engine-not-wired", "work-not-wired", "gh-not-installed", "gh-not-authorized", "gh-not-ours", "credential-unhealthy", "credential-missing", "credential-invalid", "credential-format", "token-invalid", "auth-required", "already-authorized", "model-not-in-catalog", "preset-not-in-roster", "release-requires-shipped", "release-already-confirmed", "refresh-in-progress", "feishu-not-wired", "invalid-path", "gate-not-available-in-v1", "candidate-not-found", "kickoff-failed", "retry-requires-failed-or-cancelled", "retry-requires-failed", "attempt-exhausted"],
    ```
  - 词典 `errors` 段增 `codes` 子对象。文案对齐实际触发条件（评审 Q26）：`gate-requires-gating` 的触发是「阶段不是待拍板/已分诊」或「另开但 G1 未过」，行内「G1 放行」按钮已删，所以不写「先放行」；`gh-not-ours` 实指 gh 登录态不是工作台建立的。**带连字符的键必须加引号**，否则整份词典 SyntaxError、client-render / i18n / locale-parity 三个文件级全红（评审 Q20）。两份字典键集必须逐字相同（locale-parity 守护）。`zh-CN.mjs` 在 `actionFailed: "操作失败",` 之后插入：
  ```js
      codes: {
        "gate-requires-gating": "这个候选现在不能这么操作：要先分诊，或等它不再进行中",
      "engine-issue-only": "自动执行只服务 issue，PR 请用「开工」",
      "run-already-active": "这个候选已有执行在进行，先取消或等它结束",
      "workspace-not-found": "目录不存在，请重新选择",
      "managed-dir-explicit": "托管克隆请用「托管克隆」按钮进入，不要手填路径",
      "work-cwd-conflict": "这个候选已有一个在不同目录的开工会话，先结束它或用「另开」",
      "no-work-session": "这个候选没有进行中的开工会话",
      "deliver-requires-building": "只有进行中的开工会话可以确认交付",
      "engine-not-wired": "引擎未接入，这是部署问题",
      "work-not-wired": "开工会话未接入，这是部署问题",
      "gh-not-installed": "本机没有 gh，请先安装并登录",
      "gh-not-authorized": "gh 还没登录，请先 gh auth login",
      "gh-not-ours": "本机 gh 登录的不是工作台所用的账号",
      "credential-unhealthy": "GitHub 凭据失效，请重新校验或更换 token",
      "credential-missing": "没有可用的 GitHub 凭据",
      "credential-invalid": "凭据格式无效，请重新填写",
      "credential-format": "凭据格式无效，请重新填写",
      "token-invalid": "token 无效",
      "auth-required": "请先连接 GitHub",
      "already-authorized": "已经连接，不需要重复连接",
      "model-not-in-catalog": "模型不在目录里，请重新选择",
      "preset-not-in-roster": "预设不在名册里，请重新选择",
      "release-requires-shipped": "只有已交付的候选可以确认发版",
      "release-already-confirmed": "这次交付已经确认过发版",
      "refresh-in-progress": "正在刷新，请稍候",
      "feishu-not-wired": "飞书未接入",
      "invalid-path": "路径无效",
      "gate-not-available-in-v1": "这一版还没有这道闸门",
      "candidate-not-found": "候选不存在，请刷新清单",
      "kickoff-failed": "开工消息没发出去，会话已回滚，请重试",
      "retry-requires-failed-or-cancelled": "只能重试失败或已取消的节点",
      "retry-requires-failed": "只能重试失败的节点",
      "attempt-exhausted": "重试次数已用完",
      },
  ```
  `en.mjs` 在 `actionFailed: "Action failed",` 之后插入（同一组键，同一顺序）：
  ```js
      codes: {
        "gate-requires-gating": "This candidate cannot do that right now: triage it first, or wait until it is no longer in progress",
      "engine-issue-only": "Automatic runs serve issues only; for a PR use Start work",
      "run-already-active": "This candidate already has a run in progress — cancel it or wait",
      "workspace-not-found": "That directory does not exist — pick again",
      "managed-dir-explicit": "Use the Managed clone button to enter a managed clone; do not type its path",
      "work-cwd-conflict": "This candidate already has a work session in a different directory — end it or use Start another",
      "no-work-session": "This candidate has no work session in progress",
      "deliver-requires-building": "Only a candidate with a work session in progress can be confirmed as delivered",
      "engine-not-wired": "The engine is not wired — this is a deployment problem",
      "work-not-wired": "Work sessions are not wired — this is a deployment problem",
      "gh-not-installed": "gh is not installed here — install it and sign in",
      "gh-not-authorized": "gh is not signed in — run gh auth login first",
      "gh-not-ours": "The gh sign-in on this machine is not the one the workbench set up",
      "credential-unhealthy": "The GitHub credential is unhealthy — re-verify it or replace the token",
      "credential-missing": "No usable GitHub credential",
      "credential-invalid": "The credential is malformed — enter it again",
      "credential-format": "The credential is malformed — enter it again",
      "token-invalid": "The token is invalid",
      "auth-required": "Connect GitHub first",
      "already-authorized": "Already connected — no need to connect again",
      "model-not-in-catalog": "That model is not in the catalog — pick again",
      "preset-not-in-roster": "That preset is not in the roster — pick again",
      "release-requires-shipped": "Only a delivered candidate can confirm a release",
      "release-already-confirmed": "The release for this delivery was already confirmed",
      "refresh-in-progress": "Refreshing — please wait",
      "feishu-not-wired": "Feishu is not wired",
      "invalid-path": "Invalid path",
      "gate-not-available-in-v1": "This gate is not available in this version yet",
      "candidate-not-found": "Candidate not found — refresh the list",
      "kickoff-failed": "The kickoff message could not be sent; the session was rolled back — try again",
      "retry-requires-failed-or-cancelled": "Only a failed or cancelled node can be retried",
      "retry-requires-failed": "Only a failed node can be retried",
      "attempt-exhausted": "No retries left",
      },
  ```
  - `src/client/components/actions.mjs`：import 增 `errorText`。**五处**拼接点全部改为「翻译优先、未收录回落」：
    - 批量分诊与行内 `go` 的两处 catch（各一处，共两处）：
      ```js
          errLine.textContent = errorText(e, t) ?? (t("errors.actionFailed") + " (" + (e?.message ?? e) + ")");
      ```
    - 行内「开工」失败（`workChip(target, …)`）与「更多 › 另开会话」失败（`workChip(more, …)`）两处：
      ```js
              const failedOpen = errorText(r.error, t);
              workChip(target, failedOpen ? t("work.startFailed") + "：" + failedOpen : t("work.startFailed") + " (" + r.error + ")", true);
      ```
      ```js
                const failedAnother = errorText(r.error, t);
                workChip(more, failedAnother ? t("work.startFailed") + "：" + failedAnother : t("work.startFailed") + " (" + r.error + ")", true);
      ```
    - `startAnother` 的完整目标语句（`t` 可选；缺省时经 `makeT(getLang())` 兜底，所以不传 `t` 也能翻译。`actions.mjs` 顶部 import 增 `makeT`：`import { makeT } from "../i18n.mjs";`。收录用全角冒号连接，未收录回落括注）：
      ```js
          startAnother: async (key, cwd, t) => {
            if (!cwd) return null;   // 无目录不发起（不得回退到本地检出）
            const r = await a.workStart(key, cwd, true, getLang());
            if (r?.ok) return null;
            const tt = t ?? makeT(getLang());   // t 缺省时用当前语言兜底——不传 t 也要能翻译，而不是回落括注（评审第 3 轮红一）
            const head = tt("sessions.anotherFailed");   // 走兜底后的 tt，不传 t 也不中英混排（评审 Q25）。须在 tt 定义之后——const 有暂时性死区，先写 head 会报 Cannot access tt before initialization（执行方自检实测）
            const human = errorText(r?.error, tt);
            return human ? head + "：" + human : head + " (" + String(r?.error ?? "unknown") + ")";
          },
      ```
  - **范围外（写进落地注记）**：`kanban.mjs` 的 `kberr`、`review.mjs` 的 `rverr`、`workbench.mjs` 的「刷新失败」「确认交付失败」仍是「<动作失败> (码)」——它们不经过 `actions.mjs`，且看板与待我确认页在里程碑 3 会删除或重排，届时一并处理。
- Step 4：`logic` → 33 / 33 / 0；`client-render` → 81 / 81 / 0；`i18n` → 6 / 6 / 0（白名单已补）；`design-lint`、`locale-parity` 不变；全量 → 421 / 421 / 0。
- 接口：Produces `errorText(error, t) → string | null`；词典 `errors.codes.*`（33 键）。

### Task 6: 构建、文档与提交

- Step 1：`npm run build`（退出码 0）；`npm test` → `ℹ tests 421`、`ℹ pass 421`、`ℹ fail 0`；detector 逐文件集合比对：改动的 UI 源文件（`actions.mjs`、`candidateRow.mjs`、`logic.mjs`）新增条目 0。
- Step 2：文档四处。
  - `README.md`：交付那句「引擎为 issue 新开的 PR 记在来源候选上（「PR #n · 待合并 / 已合并」）」改为「（「PR #n · 待合并 / 已合并 / 已关闭」）」；在「更多 › 换个目录开工」可重选」之后增「；有进行中的开工会话时，「更多 › 结束会话」可以收掉它；最后一条会话结束后，候选才回到已分诊（有执行在跑时不动）」。
  - `README.en.md`：把 `recorded on that candidate ("PR #n · Awaiting merge / Merged")` 换成 `recorded on that candidate ("PR #n · Awaiting merge / Merged / Closed")`；把 `**More › Start in another directory…** lets you re-pick.` 换成下面这句：
  ```text
  **More › Start in another directory…** lets you re-pick. While a work session is in progress, **More › End session** closes it; the candidate returns to Triaged only after its last session ends (and not while a run is alive).
  ```
  - `docs/design-v2.md` §20 末尾追加「收口落地注记（2026-11-25，commit <sha>）」：三项各一行，并**明写 C2「结束开工会话」的四个小决定**（标 `endedAt` / 最后一条结束且无存活执行时 building 回 `triaged` / 结束时归档宿主会话 / 入口在「更多」——主人 2026-11-25 追认，评审 Q11 / Q27），含 live store 读数（C1：当前 `delivery` 块为空，无实例；C2：#82 的 3 条残留行经「结束会话」清理后的索引读数；C3：33 个码收录）。
  - 本计划文件入 `docs/plans/`。
- Step 3：提交划分（docs 独立）。
  - `fix(work): 收口——交付 PR 关闭态、结束开工会话、错误码人话`（源码、测试、README 双语、`lib/client.js`、`lib/host.js` 同 commit）。
  - `docs(design): §20 收口落地注记 + 收口实施计划入库`。

## 执行纪律

- 开始实现前，先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标；每个任务完成后运行其验证。
- 遇到阻塞、重复失败或计划与仓库现实不符，立即停下来说明，不猜。
- 任何一步全量计数低于前一步，即停。
- 重启与实机核验在 Task 6 之后、评审通过后进行；重启须主人同意，`dshm_restart` 为当轮最后一个动作。
- 实机核验 C2：对 #82 点「结束会话」三次（三条活跃行自末位起逐条结束，每次后重新展开——入口在前两次之后仍在），读 `GET /dsh-l/state` 确认该候选 `work` 为 null、候选回「已分诊」，且 `GET /dsh-l/work/sessions` 里 #82 的行数不增；#82 的三条宿主会话此前已归档，`archiveSession` 对已归档会话应幂等不报错——若报错，如实记录。

## 最终验证

```bash
# detector 逐文件集合比对（基线 = 本计划开工前的提交，不是 a859af6——照搬旧基线会扫进 M1/M2 的 8 个文件）
# 旧版文件须放在项目目录内（检测器只对项目内文件套用 DESIGN.md）；去行号后的条目集合不得出现基线版没有的条目
BASE=14750e0   # 开工前最后一个计划提交；若开工前又有提交，改成那个
IMPECCABLE=/home/ubuntu/.dsh/profiles/web/node_modules/@iasiv5/dsh-skills/skills/impeccable/scripts/impeccable
norm() { jq -r '.[] | "\(.antipattern)|\(.snippet // "")"' | sort; }
rm -rf .detector-old
for f in src/client/components/actions.mjs src/client/components/candidateRow.mjs src/client/logic.mjs src/client/api.mjs src/client/locale/zh-CN.mjs src/client/locale/en.mjs lib/client.js; do
  mkdir -p ".detector-old/$(dirname "$f")"; git show "$BASE:$f" > ".detector-old/$f" 2>/dev/null || : > ".detector-old/$f"
  norm < <("$IMPECCABLE" detect --json "$f") > .detector-old/new.txt
  norm < <("$IMPECCABLE" detect --json ".detector-old/$f") > .detector-old/old.txt
  echo "$f 旧=$(wc -l < .detector-old/old.txt) 新=$(wc -l < .detector-old/new.txt) 新增条目=$(comm -13 .detector-old/old.txt .detector-old/new.txt | wc -l)"
done
rm -rf .detector-old
```


- `build exit=0`；`ℹ tests 421`、`ℹ pass 421`、`ℹ fail 0`。
- 单文件终点：`store` 29、`handlers` 81、`client-render` 81、`logic` 33、`github` 35、`host-smoke` 8（逐个单跑核对）。
- detector（基线读数 2026-11-25 在副本实测：6 个 UI 源文件均为 0，`lib/client.js` 为 12）：每个文件「新增条目=0」；`lib/client.js` 新 = 旧 = 12。
- `git status --short` 无未提交改动（落地注记除外）。
- 修改摘要须列出：两笔提交的 sha、新增词典键清单、`delivery` 新增字段、新路由。
