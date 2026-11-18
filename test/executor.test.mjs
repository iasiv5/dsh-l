import test from "node:test";
import assert from "node:assert/strict";
import { makeExecutor, composeAgentPrompt } from "../src/engine/executor.mjs";
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

// ---- Task 5：agent 节点执行器（world 注入）与 composeAgentPrompt ----
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
const agentRun = (attempt = 0) => ({ id: "r1", nodeStates: { build: { attempt } }, snapshot: { nodes: [], edges: [] } });

test("composeAgentPrompt：rolePrompt + 任务包 + 上游段", () => {
  const p = composeAgentPrompt({ rolePrompt: "纪律句", taskPackage: { kind: "dsh-l.task-package", instructions: { goal: "g" } }, upstream: [{ node: "verify", text: "2 failed" }] });
  assert.ok(p.startsWith("纪律句"));
  assert.ok(p.includes("dsh-l.task-package"));
  assert.ok(p.includes("上游节点输出"));
  assert.ok(p.includes("verify"));
  assert.throws(() => composeAgentPrompt({ rolePrompt: "", taskPackage: { a: 1 } }), /rolePrompt/);
});
test("runAgentNode：completed → ok；auto→never 映射；cwd 注入；成功不 dispose；sessionId :1", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const node = { id: "build", type: "agent" };
  const { promise } = ex.runAgentNode({ run: agentRun(0), node, cwd: "/ws", taskPackage: { kind: "dsh-l.task-package" }, upstream: [], rolePrompt: "纪律句", executionPolicy: "auto" });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  w.finish("completed");
  const r = await promise;
  assert.equal(r.ok, true);
  assert.equal(w.policies[0], "never");
  assert.deepEqual(w.cwds, ["/ws"]);
  assert.equal(w.disposed, undefined);
  assert.match(w.created[0].sessionId, /^dsh-l:run:r1:build:1$/);
  assert.ok(w.sent[0].msg.text.includes("纪律句"));
});
test("runAgentNode：非 completed fail-closed 且 dispose", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const { promise } = ex.runAgentNode({ run: agentRun(), node: { id: "build", type: "agent" }, cwd: "/ws", taskPackage: {}, upstream: [], rolePrompt: "审查", executionPolicy: "ask" });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  w.finish("blocked");
  const r = await promise;
  assert.equal(r.ok, false);
  assert.match(r.error, /turn-end:blocked/);
  assert.equal(w.disposed, true);
});
test("runAgentNode：cancel → dispose + cancelled", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const { promise, cancel } = ex.runAgentNode({ run: agentRun(), node: { id: "build", type: "agent" }, cwd: "/ws", taskPackage: {}, upstream: [], rolePrompt: "审查", executionPolicy: "ask" });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  cancel();
  const r = await promise;
  assert.equal(r.ok, false);
  assert.match(r.error, /cancelled/);
  assert.equal(w.disposed, true);
});
test("runAgentNode：超时 fail-closed", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild(), agentTimeoutMs: 20 });
  const r = await ex.runAgentNode({ run: agentRun(), node: { id: "build", type: "agent" }, cwd: "/ws", taskPackage: {}, upstream: [], rolePrompt: "审查", executionPolicy: "ask" }).promise;
  assert.equal(r.ok, false);
  assert.equal(r.error, "timeout");
});
test("runAgentNode：resume/resumeSeq → sessionId 追加 :resume<seq> 且 attempt 不加一（评审 R1-11）", async () => {
  const w = fakeWorld();
  const ex = makeExecutor({ world: w, spawn: () => fakeChild() });
  const { promise } = ex.runAgentNode({ run: { id: "r9", nodeStates: { build: { attempt: 2 } }, snapshot: { nodes: [], edges: [] } }, node: { id: "build", type: "agent" }, cwd: "/ws", taskPackage: {}, upstream: [], rolePrompt: "审查", executionPolicy: "ask", resume: true, resumeSeq: 2 });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  w.finish("completed");
  await promise;
  assert.equal(w.created[0].sessionId, "dsh-l:run:r9:build:2:resume2");
});

test("composeAgentPrompt：rolePrompt 空则 throw；非空拼接上游", () => {
  assert.throws(() => composeAgentPrompt({ rolePrompt: "", taskPackage: {} }), /rolePrompt/);
  const p = composeAgentPrompt({ rolePrompt: "实现代码", taskPackage: { kind: "x" }, upstream: [{ node: "review", text: "fix bug" }] });
  assert.ok(p.startsWith("实现代码"));
  assert.ok(p.includes("x"));
  assert.ok(p.includes("review"));
});
test("脱密守护（M6 T5/评审 R8-②）：script env 注入面 = 基线 env + {PATH, GIT_TERMINAL_PROMPT}，无敏感后缀键", async () => {
  const before = new Set(Object.keys(process.env));
  let capturedEnv = null;
  const ex = makeExecutor({ spawn: (script, opts) => {
    capturedEnv = opts.env;
    const child = { stdout: { on: () => {} }, stderr: { on: () => {} }, on: (ev, cb) => { if (ev === "close") setImmediate(() => cb(0)); } };
    return child;
  } });
  const r = await ex.runScriptNode({ node: { id: "verify", script: "true" }, cwd: "/ws" }).promise;
  assert.equal(r.ok, true);
  assert.ok(capturedEnv, "env 未捕获");
  const injected = Object.keys(capturedEnv).filter((k) => !before.has(k));
  // 注入面契约（D6/R8-②）：新增键 ⊆ {PATH, GIT_TERMINAL_PROMPT}（PATH 经 process.env spread 继承，通常不在差集）
  assert.ok(injected.every((k) => ["PATH", "GIT_TERMINAL_PROMPT"].includes(k)), "注入面外键: " + injected.join(","));
  // 差集与敏感后缀双断言：基线 env 中的敏感键不因 executor 扩散（若有也在 captured 内原样——断言差集即可）
  assert.ok(injected.every((k) => !/(_TOKEN|_KEY|_SECRET|_PASSWORD)$/.test(k)));
});
