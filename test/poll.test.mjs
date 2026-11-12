import test from "node:test";
import assert from "node:assert/strict";
import { armInterval } from "../src/poll.mjs";

const fakeInterval = () => {
  const live = new Set();
  const interval = (callback, delay) => { const h = { callback, delay }; live.add(h); return () => live.delete(h); };
  return { interval, live };
};

test("0 分钟不注册", () => {
  const { interval, live } = fakeInterval();
  armInterval({ interval, getMinutes: () => 0, refresh: async () => {} });
  assert.equal(live.size, 0);
});
test("5 分钟按 (callback, delay) 注册 300000ms，回调触发 refresh", async () => {
  const { interval, live } = fakeInterval();
  let n = 0;
  armInterval({ interval, getMinutes: () => 5, refresh: async () => { n++; } });
  const [h] = [...live];
  assert.equal(h.delay, 300000);
  h.callback();
  await new Promise((r) => setImmediate(r));
  assert.equal(n, 1);
});
test("rearm 释放旧句柄；dispose 清空", () => {
  const { interval, live } = fakeInterval();
  let minutes = 5;
  const p = armInterval({ interval, getMinutes: () => minutes, refresh: async () => {} });
  minutes = 10; p.rearm();
  assert.equal(live.size, 1);
  assert.equal([...live][0].delay, 600000);
  p.dispose();
  assert.equal(live.size, 0);
});
test("refresh 抛错不冒泡", () => {
  const { interval, live } = fakeInterval();
  armInterval({ interval, getMinutes: () => 1, refresh: async () => { throw new Error("x"); } });
  assert.doesNotThrow(() => [...live][0].callback());
});
