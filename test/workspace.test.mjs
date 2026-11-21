import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sanitizeKey, makeWorkspace, sweepActiveKeys } from "../src/engine/workspace.mjs";

test("sanitizeKey：# 与 / 替换为下划线", () => {
  assert.equal(sanitizeKey("o/r#issue#12"), "o_r_issue_12");
});
test("ensure：不存在则 gh repo clone（env 注入 ghBin PATH 与 GIT_TERMINAL_PROMPT）", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws-"));
  const calls = [];
  const ghBin = join(dir, "bin", "gh");
  const w = makeWorkspace({ dataDir: dir, ghBin, execFile: async (cmd, args, opts) => { calls.push([cmd, args, opts]); } });
  const out = await w.ensure({ key: "o/r#issue#12", repo: "o/r" });
  assert.equal(out.cloned, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ghBin);
  assert.deepEqual(calls[0][1], ["repo", "clone", "o/r", out.dir]);
  assert.ok(calls[0][2].env.PATH.startsWith(join(dir, "bin") + ":"));
  assert.equal(calls[0][2].env.GIT_TERMINAL_PROMPT, "0");
});
test("ensure：已存在则复用不 clone；clone 失败抛错", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws2-"));
  mkdirSync(join(dir, "workspaces", "o_r"), { recursive: true });   // 评审 R1-7④：recursive，父目录不存在
  let n = 0;
  const w = makeWorkspace({ dataDir: dir, execFile: async () => { n++; } });
  const out = await w.ensure({ key: "o/r", repo: "o/r" });
  assert.equal(out.cloned, false);
  assert.equal(n, 0);
  const w2 = makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-ws3-")), execFile: async () => { throw new Error("network down"); } });
  await assert.rejects(() => w2.ensure({ key: "o/x", repo: "o/x" }), /network down/);
});
test("sweep：非活跃且超期目录清除；活跃目录即使超期也保留（评审 R1-8 红灯）", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws4-"));
  const old = join(dir, "workspaces", "old"); const fresh = join(dir, "workspaces", "fresh"); const active = join(dir, "workspaces", "o_active_stale");
  mkdirSync(old, { recursive: true }); mkdirSync(fresh, { recursive: true }); mkdirSync(active, { recursive: true });
  const now = Date.now();
  const removed = [];
  const w = makeWorkspace({ dataDir: dir, execFile: async (c, a) => ({ stdout: a.includes("rev-list") ? "0" : "" }), fs: {
    existsSync: () => false, mkdirSync: () => {}, readdirSync: () => ["old", "fresh", "o_active_stale"],
    statSync: (p) => ({ mtimeMs: p.includes("fresh") ? now : now - 20 * 86400000 }),   // fresh 新鲜；old 与 o_active_stale 都超期
    rmSync: (p) => { removed.push(p); },
  } });
  const out = await w.sweep({ activeKeys: ["o/active#stale"], retentionDays: 7, now: new Date(now) });   // 原始键（未 sanitize）；M6：async 化 + 脏检查（桩 execFile 返回干净）
  assert.deepEqual(out.removed.map((p) => p.split("/").pop()), ["old"]);   // o_active_stale 经 sanitizeKey("o/active#stale") 后命中保留集（评审 R2-8：目录名须与 sanitize 产物一致，否则红灯夹具照红）
  assert.equal(removed.length, 1);
});

test("M6/R7：ensure clone 后落工作分支；复用路径 checkout 幂等/起枝（R12-i）", async () => {
  const calls = [];
  const w = makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-ws6-")), execFile: async (cmd, args) => {
    calls.push([cmd, ...args]);
    return { stdout: "" };
  }, fs: { existsSync: () => false, mkdirSync: () => {} } });
  await w.ensure({ key: "o/r#i#1", repo: "o/r", branch: "dsh-l/run-x1" });
  assert.deepEqual(calls.at(-1), ["git", "-C", expect_dir(calls), "checkout", "-b", "dsh-l/run-x1"]);   // clone 后起枝
  // 复用路径：分支已存在 → checkout 幂等
  const w2 = makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-ws7-")), execFile: async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes("checkout") && args.includes("-b")) throw new Error("branch exists");   // 分支已存在 → 纯 checkout 应成功
    return { stdout: "" };
  }, fs: { existsSync: () => true } });
  calls.length = 0;
  await w2.ensure({ key: "o/r#i#1", repo: "o/r", branch: "dsh-l/run-x1" });
  assert.deepEqual(calls[0].slice(0, 4), ["git", "-C", calls[0][2], "checkout"]);   // 先试纯 checkout
  assert.equal(calls.some((c) => c[3] === "-b"), false);   // 分支已存在，未走 -b
  // 复用路径：新 rid → checkout 失败 → -b 起枝
  const w3 = makeWorkspace({ dataDir: mkdtempSync(join(tmpdir(), "dsh-l-ws8-")), execFile: async (cmd, args) => {
    calls.push([cmd, ...args]);
    if (args.includes("checkout") && !args.includes("-b")) throw new Error("no such branch");   // 新 rid：纯 checkout 失败 → -b 起枝
    return { stdout: "" };
  }, fs: { existsSync: () => true } });
  calls.length = 0;
  await w3.ensure({ key: "o/r#i#1", repo: "o/r", branch: "dsh-l/run-x2" });
  assert.ok(calls.some((c) => c[4] === "-b" && c[5] === "dsh-l/run-x2"));   // 新 rid 起枝（索引：0=git 1=-C 2=dir 3=checkout 4=-b 5=branch）
});
const expect_dir = (calls) => calls.find((c) => c[0] === "git")[2];
test("M6/D5：sweep 脏检查三态——净删除/脏跳过/命令失败 fail-closed", async () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws9-"));
  const now = Date.now();
  const mkFs = (removed) => ({ existsSync: () => false, mkdirSync: () => {}, readdirSync: () => ["old"], statSync: () => ({ mtimeMs: now - 20 * 86400000 }), rmSync: (p) => removed.push(p) });
  const mk = ({ porcelain = "", count = "0", throws = false }, removed) => makeWorkspace({ dataDir: dir, execFile: async (c, a) => {
    if (throws) throw new Error("git broken");
    return { stdout: a.includes("rev-list") ? count : porcelain };
  }, fs: mkFs(removed) });
  const r1 = []; const out1 = await mk({ throws: false }, r1).sweep({ activeKeys: [], retentionDays: 7, now: new Date(now) });
  assert.equal(out1.removed.length, 1); assert.equal(out1.skipped.length, 0);   // 净 → 删除
  const r2 = []; const out2 = await mk({ porcelain: "M x.ts\n" }, r2).sweep({ activeKeys: [], retentionDays: 7, now: new Date(now) });
  assert.equal(out2.removed.length, 0); assert.equal(out2.skipped.length, 1);   // 脏（未提交）→ 跳过
  const r3 = []; const out3 = await mk({ throws: true }, r3).sweep({ activeKeys: [], retentionDays: 7, now: new Date(now) });
  assert.equal(out3.removed.length, 0); assert.equal(out3.skipped.length, 1);   // 命令失败 → fail-closed 跳过
  const r4 = []; const out4 = await mk({ count: "3" }, r4).sweep({ activeKeys: [], retentionDays: 7, now: new Date(now) });
  assert.equal(out4.removed.length, 0); assert.equal(out4.skipped.length, 1);   // 未推送（ahead=3）→ 跳过
});

// ---- 开工会话（Work Session）Task 9：sweepActiveKeys 纯函数（R1-5/R3-3 断言面打在 active 计算） ----

test("sweepActiveKeys：running/waiting run 键 ∪ workSessions 全键去重；终态 run 键不进", () => {
  const runs = [
    { candidateKey: "o/live#issue#1", status: "running" },
    { candidateKey: "o/wait#issue#2", status: "waiting" },
    { candidateKey: "o/done#issue#3", status: "succeeded" },
    { candidateKey: "o/failed#issue#4", status: "failed" },
  ];
  const workSessions = [
    { key: "o/cold#issue#9", rows: [{ sessionId: "dsh-l:work-a", cwd: "/w" }] },
    { key: "o/live#issue#1", rows: [{ sessionId: "dsh-l:work-b", cwd: "/w" }] },
  ];
  const out = sweepActiveKeys({ runs, workSessions });
  assert.deepEqual([...out].sort(), ["o/cold#issue#9", "o/live#issue#1", "o/wait#issue#2"]);
  assert.equal(new Set(out).size, out.length, "去重");
});

test("sweepActiveKeys：空输入退化为空数组", () => {
  assert.deepEqual(sweepActiveKeys({ runs: [], workSessions: [] }), []);
});
