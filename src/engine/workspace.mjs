import { readdirSync, mkdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// 候选键 → 目录名的安全化：候选键含 "/" 与 "#"（如 o/r#issue#12），目录名只留文件系统安全字符。
export const sanitizeKey = (key) => String(key ?? "").replace(/[^A-Za-z0-9._-]/g, "_");

// 清扫活跃集（Task 9，R1-5/R3-3）：running/waiting run 的候选键 ∪ 开工会话索引全键（Q9 冷会话亦活跃），
// 去重；终态 run 键不进。纯函数无 IO——host.mjs sweeper 由此取 activeKeys，测试直接钉本函数。
export function sweepActiveKeys({ runs = [], workSessions = [] } = {}) {
  const out = new Set();
  for (const r of runs) if (r && (r.status === "running" || r.status === "waiting")) out.add(r.candidateKey);
  for (const w of workSessions) if (w && w.key) out.add(w.key);
  return [...out];
}

const ghEnv = (ghBin) => ({
  ...process.env,
  PATH: (ghBin ? ghBin.slice(0, ghBin.lastIndexOf("/")) + ":" : "") + process.env.PATH,   // ghBin 目录前插 PATH（评审 D5：纯 gh 路线）
  GIT_TERMINAL_PROMPT: "0",
});

// 工作区管理器（design-v2 §5 / §12.5）：
// - dirOf(key) = <dataDir>/workspaces/<sanitizeKey(key)>/
// - ensure：不存在则 gh repo clone（https + gh 凭据 helper），存在则复用不 clone（回炉不回退）
// - sweep：保留期清扫——先 sanitizeKey(activeKey) 再与目录名比对（评审 R2-8），
//   非活跃且 mtime 超期的目录 rmSync 递归。io/execFile 全注入，测试不真实 clone。
//   保留期口径（M2 产出评审 backlog 备注）：以目录 mtime（≈clone 时刻）起算，保守于 design §5
//   「终态后保留 N 天」——工作区不回炉重建（mtime 只增不减），mtime 口径不会提前删除活跃工作区。
export function makeWorkspace({ dataDir, ghBin = null, execFile, fs: io = {} } = {}) {
  const ls = io.readdirSync ?? readdirSync;
  const st = io.statSync ?? statSync;
  const rm = io.rmSync ?? rmSync;
  const mk = io.mkdirSync ?? mkdirSync;
  const exists = io.existsSync ?? existsSync;
  const workspacesDir = join(dataDir, "workspaces");
  const dirOf = (key) => join(workspacesDir, sanitizeKey(key));
  return {
    dirOf,
    async ensure({ key, repo, branch = null, onLog = () => {} }) {
      const dir = dirOf(key);
      let dirExists = false;   // 勿名 exists——会遮蔽外层 io.existsSync ?? existsSync（评审发现的真实事故）
      try { dirExists = Boolean(exists(dir)); } catch { dirExists = false; }
      const ghCmd = ghBin ?? "gh";
      if (dirExists) {
        // M6 评审 R12-i：复用路径也落分支——新 rid 起枝（溯源不断裂），同分支纯 checkout 幂等。
        if (branch) {
          try { await execFile("git", ["-C", dir, "checkout", branch], { env: ghEnv(ghBin) }); onLog("workspace.branch-reuse", branch); }
          catch { await execFile("git", ["-C", dir, "checkout", "-b", branch], { env: ghEnv(ghBin) }); onLog("workspace.branch-create", branch); }
        }
        onLog("workspace.reuse", dir);
        return { dir, cloned: false };
      }
      mk(workspacesDir, { recursive: true });
      await execFile(ghCmd, ["repo", "clone", repo, dir], { env: ghEnv(ghBin) });
      // M6 评审 R7：「工作区永不落默认分支」由构造保证——clone 后即起本轮工作分支。
      if (branch) { await execFile("git", ["-C", dir, "checkout", "-b", branch], { env: ghEnv(ghBin) }); onLog("workspace.branch-create", branch); }
      onLog("workspace.cloned", dir);
      return { dir, cloned: true };
    },
    async sweep({ activeKeys, retentionDays, now = () => new Date() }) {
      const removed = [];
      const skipped = [];   // M6 评审 R6-A/D5：脏检查跳过目录（防丢工作——未提交/未推送/命令失败 fail-closed）
      const isDirty = async (dir) => {
        try {
          const porcelain = await execFile("git", ["-C", dir, "status", "--porcelain"], { env: ghEnv(ghBin) });
          if (String(porcelain.stdout ?? "").trim()) return true;
          const ahead = await execFile("git", ["-C", dir, "rev-list", "--count", "HEAD", "--not", "--remotes"], { env: ghEnv(ghBin) });
          return String(ahead.stdout ?? "").trim() !== "0";
        } catch { return true; }   // fail-closed：git 不可用即视为脏，保守跳过
      };
      // now 兼容函数与 Date 实例两种传入（计划夹具传 Date 实例）
      const nowMs = typeof now === "function" ? now().getTime() : new Date(now ?? Date.now()).getTime();
      const cutoff = nowMs - retentionDays * 86400000;
      const active = new Set((activeKeys ?? []).map(sanitizeKey));
      let entries;
      try { entries = ls(workspacesDir); } catch { return { removed, skipped }; }
      for (const name of entries) {
        if (active.has(name)) continue;
        const full = join(workspacesDir, name);
        try { if (st(full).mtimeMs >= cutoff) continue; } catch { continue; }
        if (await isDirty(full)) { skipped.push(full); continue; }
        try { rm(full, { recursive: true, force: true }); removed.push(full); } catch {}
      }
      return { removed, skipped };
    },
  };
}
