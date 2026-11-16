import { spawn } from "node:child_process";

const TAIL = 2048;
const tail = (buf) => buf.slice(-TAIL);   // 评审 R2-1：恰 2048，无省略号前缀

const ghEnv = (ghBin) => ({ ...process.env,
  PATH: (ghBin ? ghBin.slice(0, ghBin.lastIndexOf("/")) + ":" : "") + process.env.PATH,
  GIT_TERMINAL_PROMPT: "0" });

// 节点执行器（design-v2 §5）。makeExecutor 产物：runScriptNode / runAgentNode（T5 增）。
// 两者均返回 { promise, cancel }：promise 决议 { ok, error, artifacts }；cancel 立即以 cancelled 决议。
export function makeExecutor({ spawn: sp = spawn, world = null, ghBin = null, agentTimeoutMs = 1800000, scriptTimeoutMs = 600000 } = {}) {
  const env = () => ghEnv(ghBin);
  return {
    // script 节点：宿主子进程（shell），cwd=工作区，超时 fail-closed，取消=SIGTERM+兜底 SIGKILL。
    runScriptNode({ node, cwd }) {
      let child; let settled = false; let timeoutTimer = null; let killTimer = null; let resolveRef = null;   // 评审 R3-4：resolve 提升到 cancel 作用域
      const outBuf = []; const errBuf = [];
      const promise = new Promise((resolve) => {
        resolveRef = resolve;
        const finish = (r) => { if (!settled) { settled = true; clearTimeout(timeoutTimer); clearTimeout(killTimer); resolve(r); } };
        child = sp(node.script, { shell: true, cwd, env: env() });
        child.stdout?.on?.("data", (b) => outBuf.push(b));
        child.stderr?.on?.("data", (b) => errBuf.push(b));
        child.on("close", (code) => finish(code === 0
          ? { ok: true, error: null, artifacts: [tail(Buffer.concat(outBuf).toString()), tail(Buffer.concat(errBuf).toString())] }
          : { ok: false, error: "exit " + code + ": " + tail(Buffer.concat(errBuf).toString()), artifacts: [] }));
        timeoutTimer = setTimeout(() => finish({ ok: false, error: "script timeout", artifacts: [] }), scriptTimeoutMs);
      });
      return { promise, cancel: () => {   // 评审 R2-1：立即 settle 为 cancelled（后续 close 被 settled 守卫挡掉）；SIGTERM + 5s 兜底 SIGKILL
        if (settled) return; settled = true; clearTimeout(timeoutTimer); clearTimeout(killTimer);
        try { child.kill("SIGTERM"); killTimer = setTimeout(() => { try { child.kill("SIGKILL"); } catch {} }, 5000); } catch {}
        resolveRef({ ok: false, error: "script cancelled", artifacts: [] });   // 评审 R3-4：经提升后的 resolveRef
      } };
    },
  };
}
