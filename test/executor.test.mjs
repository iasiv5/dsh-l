import test from "node:test";
import assert from "node:assert/strict";
import { makeExecutor } from "../src/engine/executor.mjs";

const fakeChild = ({ code = 0 } = {}) => {
  const listeners = {};
  const child = {
    killed: false, signals: [],
    stdout: { on: (ev, fn) => { listeners["out:" + ev] = fn; } },
    stderr: { on: (ev, fn) => { listeners["err:" + ev] = fn; } },
    on: (ev, fn) => { listeners["exit:" + ev] = fn; },
    kill: (sig) => { child.killed = true; child.signals.push(sig); listeners["exit:close"]?.(child.exitCode ?? code); },
    emitExit: (c = code) => { child.exitCode = c; listeners["exit:close"]?.(c); },
    emitOut: (t) => listeners["out:data"]?.(Buffer.from(t)),
    emitErr: (t) => listeners["err:data"]?.(Buffer.from(t)),
  };
  return child;
};

test("runScriptNode：exit 0 → ok，尾部恰 2048 入 artifacts", async () => {
  let spawned = null;
  const ex = makeExecutor({ spawn: (cmd, opts) => { spawned = { cmd, opts, child: fakeChild({ code: 0 }) }; return spawned.child; } });
  const { promise, cancel } = ex.runScriptNode({ node: { id: "s", script: "npm test" }, cwd: "/w" });
  await Promise.resolve();
  spawned.child.emitOut("x".repeat(3000)); spawned.child.emitErr("warn"); spawned.child.emitExit(0);
  const r = await promise;
  assert.equal(r.ok, true);
  assert.equal(r.artifacts[0].length, 2048);   // 评审 R2-1：恰 2048，无省略号前缀
  assert.ok(r.artifacts[1].includes("warn"));
  assert.equal(spawned.opts.cwd, "/w");
  assert.equal(spawned.opts.shell, true);
  assert.equal(typeof cancel, "function");
});
test("runScriptNode：非零退出 → ok:false；cancel → SIGTERM 且 promise 以 cancelled 决议", async () => {
  let c1 = null;
  const ex = makeExecutor({ spawn: () => { c1 = fakeChild({ code: 1 }); return c1; } });
  const p = ex.runScriptNode({ node: { id: "s", script: "exit 1" }, cwd: "/w" }).promise;
  c1.emitExit(1);   // 评审 R2-1：不 emit 则 promise 挂到 600s 超时
  const r = await p;
  assert.equal(r.ok, false);
  let killed = null;
  const ex2 = makeExecutor({ spawn: () => { const c = fakeChild({ code: 0 }); killed = c; return c; } });
  const { promise, cancel } = ex2.runScriptNode({ node: { id: "s", script: "sleep 999" }, cwd: "/w" });
  cancel();
  const r2 = await promise;
  assert.equal(r2.ok, false);
  assert.match(r2.error, /cancelled/);
  assert.deepEqual(killed.signals, ["SIGTERM"]);
});
test("runScriptNode：超时 → ok:false error=script timeout", async () => {
  const ex = makeExecutor({ spawn: () => fakeChild({ code: 0 }), scriptTimeoutMs: 30 });
  const r = await ex.runScriptNode({ node: { id: "s", script: "sleep 999" }, cwd: "/w" }).promise;
  assert.equal(r.ok, false);
  assert.equal(r.error, "script timeout");
});
