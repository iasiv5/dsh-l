# dsh-l 收敛收口实施计划（C1 交付 PR 关闭态、C2 结束开工会话、C3 错误码人话）

## 目标

对里程碑 1、2 做三项收口，均为已批准设计的直接补全，不引入新的产品决定：

1. **C1**：引擎开的 PR 被上游关闭但未合并时，来源候选的交付标记如实显示「已关闭」，不再显示「待合并」（design-v2 §20 第 30 条；评审 K21 I6 上半）。
2. **C2**：开工会话被归档或用完后，给一个明确的「结束开工会话」动作清掉工作索引里的活跃行，候选不再卡在「进行中」（design-v2 §20 第 16 条；实机核验遗留）。
3. **C3**：行内与批量动作失败时，把服务端错误码翻译成人话；未收录的码保持原样兜底（评审 K21 I16）。

**不在本计划**：里程碑 3（看板删除、会话页删除、待拍板退场、标签页 2 合 1、发版确认降为标记，design-v2 §20 第 3 / 23 / 31–33 条）另走设计简报；批量清理界面；自动对照宿主归档集清理索引；`managedRoot` 缺省守卫（生产路径不可达）。

## 架构快照

1. **交付三态**：`candidate.delivery` 增 `closed: boolean` 与 `closedAt: string | null`。`postRefresh` 回填时先看 `mergedAt`（已合并），否则看 `state === "closed"`（已关闭，未合并）。已终态（`merged` 或 `closed`）的交付不再逐次查 `getPr`。脚注按三态显示「待合并 / 已合并 / 已关闭」。
2. **结束开工会话**：`store.endWorkSession(key)` 给**末位活跃行**标上 `endedAt`（不追加新行——追加会让会话页多出幽灵行，评审 P2）。`getWorkSession` 返回自末位向前最近一条**无 `endedAt`** 的行；全部已结束 → null。这样同一候选的多条历史活跃行可以逐条结束，「结束会话」入口不会自己消失。路由 `POST /dsh-l/work/end`：候选须有活跃行；留痕 `work-session.ended`；候选若在 `building` 回 `triaged`（与「取消执行」一致，可再次开工）；经 `world.archiveSession` 归档该宿主会话（复用 M1 Task 7 的钩子，宿主服务缺席静默）。入口：候选行「更多」里，活跃开工会话行出现「结束会话」。
3. **错误码人话**：新增纯函数 `errorText(error, t)`（`src/client/logic.mjs`）：在 `errors.codes.<码>` 查到则返回该文案，否则返回原码。三处拼接点（`go`、批量分诊、`startAnother`）统一经它翻译。词典 `errors.codes` 用静态字面量键，不走动态前缀，不触发 i18n 白名单。

## 全局约束（逐字继承 dsh-l 仓约与收敛计划）

- 零运行时依赖（devDeps 仅 esbuild）；`package.json` / `package-lock.json` 不动。
- UI 改动先 `npm run build` 再全量 `npm test`；`lib/client.js` + `lib/host.js` 随源码同 commit 入库；提交前显式退出码双 0。
- 双语 parity：`zh-CN.mjs` 与 `en.mjs` 键集相同；新增 `t("…")` 一律静态字面量键；动态前缀键不得新增。
- design-lint：变量名不得遮蔽 deps seam `a` / `ctx`；不用内联 `min-height` 等 R2 清单样式。
- impeccable：不用浮层；「确认执行」不做反色；改动的 UI 源文件 detector 逐文件集合比对不新增 advisory（命令见收敛计划「最终验证（两部分合并）」）。
- 红线：三道人工闸门人工；`worksession.mjs` 中 `.dispose(` 恰 1 处（rollback-only），本计划不新增 dispose；`meta.cwd` 与 `workingDirectory.set` 成对且 send 在后。
- TDD：先红后绿；红必须落在目标断言行；新符号在测试里用顶层动态导入引入；`node --test` 选项在文件参数之前；管道用 `set -o pipefail`；`grep -F`；计数 0 时 grep 退出码为 1，不入 `&&` 链。

## 测试基线（2026-11-25 00:13 实测，HEAD `6c6a37b`）

| 文件 | 起点 | 本计划后 | 增量来源 |
|---|---|---|---|
| store | 28 | 29 | Task 2 +1 |
| github | 35 | 35 | 不变（`getPr` 已返回 `state`） |
| handlers | 77 | 80 | Task 1 +1、Task 3 +2 |
| client-render | 78 | 82 | Task 1 +1、Task 4 +1、Task 5 +2 |
| logic | 32 | 33 | Task 5 +1 |
| host-smoke | 8 | 8 | 不变 |
| i18n / locale-parity / design-lint | 6 / 1 / 1 | 6 / 1 / 1 | 不变 |
| 全量 | 412 | 420 | +8 |

**逐任务累计**（按顺序执行）：Task 1 → 414；Task 2 → 415；Task 3 → 417；Task 4 → 418；Task 5 → 420。

**计数口径**：各任务 Step 2 / Step 4 写的是**按任务顺序执行到该点**的单文件与全量计数（含此前任务的增量）。若只单跑某一任务做红绿复核，数字会不同——例如只做 Task 2 + Task 3 时 handlers 红为 79 / 77 / 2、绿 79 / 79 / 0，全量 415（执行方 2026-11-25 在副本实测）。评审复核时请按「顺序累计」核对，或按此说明换算。

## 文件结构与职责

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/store.mjs` | 改 | `setDelivery` 已是合并写，`closed` / `closedAt` 无需改；新增 `endWorkSession(key)` 给末位活跃行标 `endedAt`（不追加行）；`getWorkSession` 自末位向前取最近一条无 `endedAt` 的行 |
| `src/handlers.mjs` | 改 | `postRefresh` 回填关闭态；新增 `postWorkEnd` |
| `src/host.mjs` | 改 | `makeHandlers` 注入 `endSession`（调 world 的归档钩子）；路由表增 `/dsh-l/work/end` |
| `src/client/logic.mjs` | 改 | 导出 `errorText(error, t)` |
| `src/client/components/actions.mjs` | 改 | `go` 与批量分诊经 `errorText`；「更多」增「结束会话」；`startAnother` 经 `errorText` |
| `src/client/components/candidateRow.mjs` | 改 | 脚注交付三态 |
| `src/client/api.mjs` | 改 | `workEnd(key)` |
| `src/client/locale/zh-CN.mjs` / `en.mjs` | 改 | `delivery.closed`、`sessions.end` / `work.endSession`、`errors.codes.*` |
| `docs/design-v2.md` | 改 | §20 末尾落地注记 |
| `README.md` / `README.en.md` | 改 | 交付三态与结束会话各一句 |

一起变化的边界：`store.endWorkSession` 与 `handlers.postWorkEnd` 必须同任务（Task 3）；`errorText` 与它的三处消费点必须同任务（Task 5）；词典键与消费点同任务。

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
      await makeHandlers({ store, provider, triage: noTriage }).postRefresh();
      assert.deepEqual(store.getCandidate("o/good#issue#1").delivery, { prNumber: 81, prUrl: "https://github.com/o/good/pull/81", merged: false, mergedAt: null, closed: true, closedAt: "2026-11-24T00:00:00.000Z" });   // toISOString 带毫秒（评审 P1：原期望缺 .000，照计划执行必卡）
      assert.equal(store.getCandidate("o/good#issue#1").history.at(-1).event, "delivery.closed");
      await makeHandlers({ store, provider, triage: noTriage }).postRefresh();
      assert.deepEqual(asked, [81], "已终态不再查");
    });
    ```
    夹具：回填的 `closedAt` 取自 `now()`，须确定——两处 `makeHandlers` 都传 `now: () => new Date("2026-11-24T00:00:00Z")`；期望值用 `toISOString` 的形态（带 `.000Z`）。
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
  - `src/handlers.mjs` 的 `postRefresh` 回填循环改为：
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
  test("endWorkSession：给末位活跃行标 endedAt，不追加行；getWorkSession 回退到最近一条未结束行；全结束 → null（收敛收口 C2，评审 P2）", () => {
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
- Step 3（绿）：`src/store.mjs` 的 `getWorkSession` 与新增 `endWorkSession`：
  ```js
      // 开工会话索引：末位向前最近一条无 endedAt 的行 = 活跃行（收敛收口 C2，评审 P2：结束是「标记」不是「追加」，
      // 追加会让 getWorkSessions 多出幽灵行；回退语义让同一候选的多条历史活跃行可以逐条结束）。
      getWorkSession: (key) => {
        const rows = doc.workSessions[key] ?? [];
        for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].endedAt) return rows[i];
        return null;
      },
      endWorkSession(key) {
        need(key);
        const active = this.getWorkSession(key);
        if (!active) return null;
        active.endedAt = now().toISOString();
        active.updatedAt = active.endedAt;
        persist();
        return active.sessionId;
      },
  ```
  注意 `endWorkSession` 内用 `this.getWorkSession`（对象字面量方法），不要写成裸调用。
- Step 4：`store` → 29 / 29 / 0；全量 → 414 / 414 / 0。
- 接口：Produces `store.endWorkSession(key) → sessionId | null`；`getWorkSession` 的回退语义。Task 3 消费。

### Task 3: 路由 `POST /dsh-l/work/end`

- Step 1（红）：`test/handlers.test.mjs` 追加两条（下面一个围栏块含两条完整的 `test(...)`，整块追加到文件末尾）：
  ```js
  test("postWorkEnd：活跃开工会话 → 结束末位活跃行、留痕 work-session.ended、building 回 triaged、调 archiveSession；多条历史活跃行可逐条结束（收敛收口 C2，评审 P2）", async () => {
    const store = openStore(); login(store); seed(store);
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-a", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-b", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    await store.setStage("o/r#issue#1", "building", "G1 pass");
    const archived = [];
    const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, archiveSession: async (id) => { archived.push(id); } });
    const r = await h.postWorkEnd({ key: "o/r#issue#1" });
    assert.deepEqual([r.ok, r.sessionId], [true, "dsh-l:work-b"], "结束的是末位活跃行");
    assert.equal(store.getWorkSession("o/r#issue#1").sessionId, "dsh-l:work-a", "回退到更早的活跃行——入口不消失");
    assert.equal(store.getCandidate("o/r#issue#1").stage, "triaged");
    assert.equal(store.getCandidate("o/r#issue#1").history.at(-1).event, "work-session.ended");
    assert.deepEqual(archived, ["dsh-l:work-b"]);
    // 第二次：结束剩下那条；此时才没有活跃行
    assert.deepEqual([await h.postWorkEnd({ key: "o/r#issue#1" })].map((x) => x.sessionId), ["dsh-l:work-a"]);
    assert.equal(store.getWorkSession("o/r#issue#1"), null);
    assert.deepEqual(archived, ["dsh-l:work-b", "dsh-l:work-a"]);
  });

  test("postWorkEnd：无活跃行 → 404 no-work-session；归档钩子抛错不影响结束（缺席静默）", async () => {
    const store = openStore(); login(store); seed(store);
    const h = makeHandlers({ store, provider: PROVIDER(), triage: noTriage });
    assert.deepEqual([(await h.postWorkEnd({ key: "o/r#issue#1" })).error, 404], ["no-work-session", 404]);
    store.appendWorkSession("o/r#issue#1", { sessionId: "dsh-l:work-b", cwd: "/w", approvalPolicy: null, createdAt: "t", updatedAt: "t" });
    const boom = makeHandlers({ store, provider: PROVIDER(), triage: noTriage, archiveSession: async () => { throw new Error("registry down"); } });
    assert.equal((await boom.postWorkEnd({ key: "o/r#issue#1" })).ok, true, "归档失败不阻断结束");
    assert.equal(store.getWorkSession("o/r#issue#1"), null);
    assert.equal(store.getCandidate("o/r#issue#1").stage, "inbox", "非 building 的候选不改阶段（seed 默认 inbox）");
  });
  ```
- Step 2：`node --test test/handlers.test.mjs` → 80 / 78 / 2，红在 `h.postWorkEnd is not a function`。
- Step 3（绿）：
  - `src/handlers.mjs`：`makeHandlers` 解构增 `archiveSession = null`（签名里 `sessionRoot = null,` 之后）；下面的围栏块是**方法实现**（一个对象方法，追加在 `postWorkDeliver` 之后、`getRoles` 之前），不是测试：
    ```js
      // 结束开工会话（收敛收口 C2）：索引活跃行结束并留痕；building 回已分诊（可再次开工）；宿主会话归档（钩子缺席或失败静默）。
      async postWorkEnd(body) {
        const gate = requireAuth(); if (gate) return gate;
        const key = body?.key;
        const c = store.getCandidate(key);
        if (!c) return fail("not found", 404);
        const active = store.getWorkSession(key);
        if (!active) return fail("no-work-session", 404);
        store.endWorkSession(key);
        if (c.stage === "building") store.setStage(key, "triaged", "work session ended");
        store.recordHistory(key, "work-session.ended", active.sessionId);
        try { await archiveSession?.(active.sessionId); } catch {}
        return { ok: true, sessionId: active.sessionId };
      },
    ```
  - `src/host.mjs`：`makeHandlers` 调用处增 `archiveSession: (sessionId) => archiveSession(ctx, sessionId),`（函数已在文件内，M1 Task 7）；路由表在 `/dsh-l/work/deliver` 之后增 `"/dsh-l/work/end": { POST: handlers.postWorkEnd },`。
- Step 4：`handlers` → 80 / 80 / 0；`host-smoke` → 8 / 8 / 0；全量 → 416 / 416 / 0。
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
- Step 2：`node --test test/client-render.test.mjs` → 80 / 79 / 1，红在 `assert.ok(endBtn)`。
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
  - 词典：zh `work` 段 `endSession: "结束会话"`；en `endSession: "End session"`。
- Step 4：`client-render` → 80 / 80 / 0；`i18n`、`locale-parity`、`design-lint` 不变；全量 → 417 / 417 / 0。
- 接口：Consumes Task 3 的路由；Produces 用户入口。

### Task 5: 错误码人话 `errorText`

- Step 1（红）：
  - `test/logic.test.mjs` 追加（新符号动态导入）：
    ```js
    test("errorText：收录的码 → 词典文案；未收录 → 原码；无 error → 空串（收敛收口 C3）", async () => {
      const { errorText } = await import("../src/client/logic.mjs");
      const dict = { "errors.codes.managed-dir-explicit": "托管克隆请用「托管克隆」按钮进入", "errors.codes.gate-requires-gating": "先对待拍板候选放行 G1" };
      const t = (k) => dict[k] ?? k;
      assert.equal(errorText("managed-dir-explicit", t), "托管克隆请用「托管克隆」按钮进入");
      assert.equal(errorText(new Error("gate-requires-gating"), t), "先对待拍板候选放行 G1");
      assert.equal(errorText("some-new-code", t), "some-new-code", "未收录原码兜底");
      assert.equal(errorText(undefined, t), "", "无错误");
    });
    ```
  - `test/client-render.test.mjs` 追加：
    ```js
    test("行内动作失败：收录的错误码显示人话而非原码（收敛收口 C3）", async () => {
      const { installActions } = await import("../src/client/components/actions.mjs");
      const api = { stage: async () => { const e = new Error("managed-dir-explicit"); e.status = 409; throw e; } };
      const hooks = installActions({ getLang: () => "zh-CN", openWorkSession: () => true, pickDirectory: null, sessionsFeed: () => [], deps: { api } });
      const d = new FakeElement("div");
      hooks.rowActions(d, mkCandidate("triaged"), { t, view: { reload: async () => {}, shadow: new FakeElement("shadow") }, lang: "zh-CN" });
      const moveBtn = find(d, (n) => String(n.tagName).toUpperCase() === "BUTTON" && n.textContent === t("actions.moveTo") + " " + t("groups.closed"))[0];
      moveBtn.onclick(); await new Promise((r) => setTimeout(r, 10));
      const errLine = find(d, (n) => n.className === "rowerr")[0];
      assert.ok(errLine.textContent.includes(t("errors.codes.managed-dir-explicit")), "显示人话：" + errLine.textContent);
      assert.ok(!errLine.textContent.includes("(managed-dir-explicit)"), "不再显示原码括注");
    });
    ```
- Step 2：`logic` → 33 / 32 / 1（红在 `errorText is not a function`）；`client-render` → 81 / 80 / 1（红在 `includes(人话)`）。
- Step 3（绿）：
  - `src/client/logic.mjs` 末尾：
    ```js
    // 错误码人话（收敛收口 C3，评审 K21 I16）：服务端 fail(code) 的码经词典 errors.codes.<码> 翻译；未收录原码兜底。
    // 三处拼接点（行内 go、批量分诊、startAnother）统一经此，码本身不再带括注出现。
    export function errorText(error, t) {
      const code = String(error?.message ?? error ?? "").trim();
      if (!code) return "";
      const text = t("errors.codes." + code);
      return text === "errors.codes." + code ? code : text;
    }
    ```
    注意：这是动态键，i18n 白名单守护（`test/i18n.test.mjs`）会报「未知动态前缀 `errors.codes`」，且会逐键核对段内不得有白名单外的键。在 `WHITELIST` 增一项，数组必须与下面词典的 27 个键逐字一致（`rg -o 'fail\("[a-z-]+"' src/handlers.mjs | sort -u` 的全部值，2026-11-25 实测 27 个；早先 `head -20` 截断导致漏数 7 个）：
    ```js
      "errors.codes": ["already-authorized", "auth-required", "credential-format", "credential-invalid", "credential-missing", "credential-unhealthy", "deliver-requires-building", "engine-issue-only", "engine-not-wired", "feishu-not-wired", "gate-requires-gating", "gh-not-authorized", "gh-not-installed", "gh-not-ours", "invalid-path", "managed-dir-explicit", "model-not-in-catalog", "no-work-session", "preset-not-in-roster", "refresh-in-progress", "release-already-confirmed", "release-requires-shipped", "run-already-active", "token-invalid", "work-cwd-conflict", "work-not-wired", "workspace-not-found"],
    ```
  - 词典 `errors` 段增 `codes` 子对象（zh / en 键集相同）。收录本仓当前全部 27 个码，文案按动作写「问题 + 下一步」：
    - zh：`gate-requires-gating`「这个候选还没放行 G1，先放行再操作」；`engine-issue-only`「自动执行只服务 issue，PR 请用「开工」」；`run-already-active`「这个候选已有执行在进行，先取消或等它结束」；`workspace-not-found`「目录不存在，请重新选择」；`managed-dir-explicit`「托管克隆请用「托管克隆」按钮进入，不要手填路径」；`work-cwd-conflict`「这个候选已有一个在不同目录的开工会话，先结束它或用「另开」」；`no-work-session`「这个候选没有进行中的开工会话」；`deliver-requires-building`「只有进行中的开工会话可以确认交付」；`engine-not-wired`「引擎未接入，这是部署问题」；`work-not-wired`「开工会话未接入，这是部署问题」；`gh-not-installed`「本机没有 gh，请先安装并登录」；`gh-not-ours`「gh 登录的账号不是当前仓库的所有者」；`credential-unhealthy`「GitHub 凭据失效，请重新校验或更换 token」；`token-invalid`「token 无效」；`model-not-in-catalog`「模型不在目录里，请重新选择」；`preset-not-in-roster`「预设不在名册里，请重新选择」；`release-requires-shipped`「只有已交付的候选可以确认发版」；`release-already-confirmed`「这次交付已经确认过发版」；`refresh-in-progress`「正在刷新，请稍候」；`feishu-not-wired`「飞书未接入」；`invalid-path`「路径无效」；`auth-required`「请先连接 GitHub」；`already-authorized`「已经连接，不需要重复连接」；`credential-missing`「没有可用的 GitHub 凭据」；`credential-invalid`「凭据格式无效，请重新填写」；`credential-format`「凭据格式无效，请重新填写」；`gh-not-authorized`「gh 还没登录，请先 `gh auth login`」。
    - en：对应英文，同样「问题 + 下一步」。
  - `actions.mjs`：三处 `t("errors.actionFailed") + " (" + (e?.message ?? e) + ")"` 改为 `errorText(e, t)`（import 增 `errorText`）；`startAnother` 的 `" (" + String(r?.error ?? "unknown") + ")"` 改为 `errorText(r?.error, t)`。
- Step 4：`logic` → 33 / 33 / 0；`client-render` → 81 / 81 / 0；`i18n` → 6 / 6 / 0（白名单已补）；全量 → 420 / 420 / 0。
- 接口：Produces `errorText(error, t)`；词典 `errors.codes.*`。

### Task 6: 构建、文档与提交

- Step 1：`npm run build`（退出码 0）；`npm test` → `ℹ tests 420`、`ℹ pass 420`、`ℹ fail 0`；detector 逐文件集合比对：改动的 UI 源文件（`actions.mjs`、`candidateRow.mjs`、`logic.mjs`）新增条目 0。
- Step 2：文档四处。
  - `README.md`：交付那句「引擎为 issue 新开的 PR 记在来源候选上（「PR #n · 待合并 / 已合并」）」改为「（「PR #n · 待合并 / 已合并 / 已关闭」）」；在「更多 › 换个目录开工」可重选」之后增「；有进行中的开工会话时，「更多 › 结束会话」可以收掉它并让候选回到已分诊」。
  - `README.en.md`：对应两处英文。
  - `docs/design-v2.md` §20 末尾追加「收口落地注记（2026-11-25，commit <sha>）」：三项各一行，含 live store 读数（C1：当前 `delivery` 块为空，无实例；C2：#82 的 3 条残留行经「结束会话」清理后的索引读数；C3：27 个码收录）。
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
set -o pipefail; cd /home/ubuntu/workspace/dsh-l
npm run build; echo "build exit=$?"
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node --test test/store.test.mjs test/github.test.mjs test/handlers.test.mjs test/client-render.test.mjs test/logic.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
# detector 逐文件集合比对：命令与判据同 docs/plans/2026-11-23-convergence-m1-stop-bleed-visibility-implementation-plan.md「最终验证（两部分合并）」
git status --short
```

- `build exit=0`；`ℹ tests 420`、`ℹ pass 420`、`ℹ fail 0`。
- 单文件终点：`store` 29、`handlers` 80、`client-render` 81、`logic` 33、`github` 35、`host-smoke` 8（逐个单跑核对）。
- detector：改动的 UI 源文件新增条目 0；`lib/client.js` 与基线 12 条集合相同。
- `git status --short` 无未提交改动（落地注记除外）。
- 修改摘要须列出：两笔提交的 sha、新增词典键清单、`delivery` 新增字段、新路由。
