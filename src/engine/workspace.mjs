import { readdirSync, mkdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

// 候选键 → 目录名的安全化：候选键含 "/" 与 "#"（如 o/r#issue#12），目录名只留文件系统安全字符。
export const sanitizeKey = (key) => String(key ?? "").replace(/[^A-Za-z0-9._-]/g, "_");

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
    async ensure({ key, repo, onLog = () => {} }) {
      const dir = dirOf(key);
      let dirExists = false;   // 勿名 exists——会遮蔽外层 io.existsSync ?? existsSync（评审发现的真实事故）
      try { dirExists = Boolean(exists(dir)); } catch { dirExists = false; }
      if (dirExists) { onLog("workspace.reuse", dir); return { dir, cloned: false }; }
      mk(workspacesDir, { recursive: true });
      const ghCmd = ghBin ?? "gh";
      await execFile(ghCmd, ["repo", "clone", repo, dir], { env: ghEnv(ghBin) });
      onLog("workspace.cloned", dir);
      return { dir, cloned: true };
    },
    sweep({ activeKeys, retentionDays, now = () => new Date() }) {
      const removed = [];
      // now 兼容函数与 Date 实例两种传入（计划夹具传 Date 实例）
      const nowMs = typeof now === "function" ? now().getTime() : new Date(now ?? Date.now()).getTime();
      const cutoff = nowMs - retentionDays * 86400000;
      const active = new Set((activeKeys ?? []).map(sanitizeKey));
      let entries;
      try { entries = ls(workspacesDir); } catch { return { removed }; }
      for (const name of entries) {
        if (active.has(name)) continue;
        const full = join(workspacesDir, name);
        try { if (st(full).mtimeMs >= cutoff) continue; } catch { continue; }
        try { rm(full, { recursive: true, force: true }); removed.push(full); } catch {}
      }
      return { removed };
    },
  };
}
