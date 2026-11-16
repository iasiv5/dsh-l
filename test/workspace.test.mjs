import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sanitizeKey, makeWorkspace } from "../src/engine/workspace.mjs";

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
test("sweep：非活跃且超期目录清除；活跃目录即使超期也保留（评审 R1-8 红灯）", () => {
  const dir = mkdtempSync(join(tmpdir(), "dsh-l-ws4-"));
  const old = join(dir, "workspaces", "old"); const fresh = join(dir, "workspaces", "fresh"); const active = join(dir, "workspaces", "o_active_stale");
  mkdirSync(old, { recursive: true }); mkdirSync(fresh, { recursive: true }); mkdirSync(active, { recursive: true });
  const now = Date.now();
  const removed = [];
  const w = makeWorkspace({ dataDir: dir, execFile: async () => {}, fs: {
    existsSync: () => false, mkdirSync: () => {}, readdirSync: () => ["old", "fresh", "o_active_stale"],
    statSync: (p) => ({ mtimeMs: p.includes("fresh") ? now : now - 20 * 86400000 }),   // fresh 新鲜；old 与 o_active_stale 都超期
    rmSync: (p) => { removed.push(p); },
  } });
  const out = w.sweep({ activeKeys: ["o/active#stale"], retentionDays: 7, now: new Date(now) });   // 原始键（未 sanitize）
  assert.deepEqual(out.removed.map((p) => p.split("/").pop()), ["old"]);   // o_active_stale 经 sanitizeKey("o/active#stale") 后命中保留集（评审 R2-8：目录名须与 sanitize 产物一致，否则红灯夹具照红）
  assert.equal(removed.length, 1);
});
