import test from "node:test";
import assert from "node:assert/strict";
import { formatNotice, makeFeishu } from "../src/feishu.mjs";
test("formatNotice：gate 与 failed 两种文案", () => {
  assert.match(formatNotice({ type: "gate", key: "o/r#issue#1", nodeId: "g2", title: "修复登录闸" }), /待拍板/);
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
