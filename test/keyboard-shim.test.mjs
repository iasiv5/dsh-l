import test from "node:test";
import assert from "node:assert/strict";
import { installKeyboardPrototypeShim } from "../src/client/keyboard-shim.mjs";

// 键盘原型补齐（鲁棒性 shim）测试：合成 keydown 的 W3C 未知按键语义补齐，
// 钉死三个宿主崩溃面（ui-primitives:1788 startsWith / shortcuts dom.ts:78 getModifierState / isComposing）。
// 注意：本测试真实修改全局 Event.prototype，用例后还原描述符（node --test 每文件独立进程，跨文件无污染）。

test("补齐后：合成 Event 获得未知按键语义，宿主两个崩溃面安全早退", () => {
  assert.equal(installKeyboardPrototypeShim(), true);
  const e = new Event("keydown");
  assert.equal(e.key, "Unidentified");                    // ui-primitives:1788 has()→false、startsWith("Arrow")→false：早退
  assert.equal(e.getModifierState("AltGraph"), false);    // shortcuts dom.ts:78 守卫不崩
  assert.equal(e.isComposing, false);
  assert.equal(e.repeat, false);
});

test("真实键盘事件语义不受影响：子类自有原型遮蔽补齐", () => {
  class FakeKeyboardEvent extends Event {
    get key() { return "Enter"; }
    get isComposing() { return false; }
    getModifierState() { return true; }
    get repeat() { return false; }
  }
  const e = new FakeKeyboardEvent("keydown");
  assert.equal(e.key, "Enter");                           // KeyboardEvent 原型自有 key 遮蔽 Event.prototype
  assert.equal(e.isComposing, false);
  assert.equal(e.getModifierState("AltGraph"), true);
});

test("实例级赋值：set 分支落为自有属性", () => {
  const e = new Event("keydown");
  e.key = "Enter";
  assert.equal(e.key, "Enter");
  const other = new Event("keydown");
  assert.equal(other.key, "Unidentified");   // 实例赋值不串扰
});

test("幂等：重复安装返回 false 不重复定义", () => {
  assert.equal(installKeyboardPrototypeShim(), false);
});
