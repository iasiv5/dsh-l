import test from "node:test";
import assert from "node:assert/strict";
import { sortSessionRows, parseWorkAnchor } from "../src/client/components/sessionsView.mjs";

// ---- 开工会话（Work Session）Task 11：排序纯函数 + 锚行反解（Q13/Q14） ----

const row = (id, updatedAt, extra = {}) => ({ kind: "work", sessionId: id, updatedAt, ...extra });

test("sortSessionRows：running 置顶、其余 updatedAt 倒序；无 summaries 退化按 updatedAt", () => {
  const rows = [row("a", 100), row("b", 300), row("c", 200)];
  const summaries = [{ id: "b", running: true }, { id: "c", running: false }];
  assert.deepEqual(sortSessionRows(rows, summaries).map((r) => r.sessionId), ["b", "c", "a"]);
  assert.deepEqual(sortSessionRows(rows, null).map((r) => r.sessionId), ["b", "c", "a"]);
  assert.deepEqual(sortSessionRows(rows, []).map((r) => r.sessionId), ["b", "c", "a"]);
});

test("parseWorkAnchor：锚行反解成功/失败/非字符串", () => {
  assert.deepEqual(parseWorkAnchor("[dsh-l] iasiv5/dsh-skins#12 issue · 修复空窗"), { repo: "iasiv5/dsh-skins", number: 12, type: "issue" });
  assert.deepEqual(parseWorkAnchor("[dsh-l] iasiv5/dsh-l#3 PR · Some fix"), { repo: "iasiv5/dsh-l", number: 3, type: "PR" });
  assert.equal(parseWorkAnchor("随便什么标题"), null);
  assert.equal(parseWorkAnchor("[dsh-l] broken"), null);
  assert.equal(parseWorkAnchor(null), null);
});

test("parseWorkAnchor：兼容新标题 `<仓库名>#<号> <issue|PR> · ` 与旧锚行", () => {
  assert.deepEqual(parseWorkAnchor("dsh-m#80 PR · docs: add"), { repo: "dsh-m", number: 80, type: "PR" });
  assert.deepEqual(parseWorkAnchor("[dsh-l] o/r#2 issue · T2"), { repo: "o/r", number: 2, type: "issue" });
  assert.deepEqual(parseWorkAnchor("分诊 · 1 条"), null);
});
