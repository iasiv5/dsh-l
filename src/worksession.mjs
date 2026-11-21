// 开工会话（Work Session）域层（GLOSSARY「开工会话」）——计划 docs/plans/2026-11-21-work-session-implementation-plan.md Task 3。
// 职责：id 生成、kickoff 构建、composeWorkWorld（三分支模型解析 + 审批策略 + 调用序红线）、
// startWorkSession（复用/冲突守卫 + 创建事务与回滚）。
// 红线（评审闭环版全局约束）：①meta.cwd 与 workingDirectory.set 成对且早于 send；②对已登记会话零 dispose，
// 唯一例外是创建事务回滚（本文件内 rollback-only 标记分支）；③审批策略未显式配置时零 setPolicy。
// agent handle 不逃逸本文件：startWorkSession 只向调用方返回 sessionId。
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { resolveAgentSelection } from "./agent-selection.mjs";

const FENCE = "```";

export function workSessionId(now = () => new Date()) {
  return "dsh-l:work-" + now().getTime().toString(36) + "-" + randomBytes(3).toString("hex");
}

const T = {
  "zh-CN": {
    head: "开工任务（开工会话）",
    link: "链接", triage: "分诊", goal: "目标", branch: "默认分支", ws: "工作区",
    first: "建议首步",
    firstStep: "先读候选正文与本仓贡献规范，确认工作分支后再动手；完成或需要反馈时回到工作台拍板。",
    wsNone: "（未记录）",
  },
  en: {
    head: "Kickoff task (work session)",
    link: "Link", triage: "Triage", goal: "Goal", branch: "Default branch", ws: "Workspace",
    first: "Suggested first step",
    firstStep: "Read the issue/PR body and the repo contribution guide first; confirm the working branch before coding. Return to the workbench to decide when done or blocked.",
    wsNone: "(not recorded)",
  },
};

export function buildKickoff(candidate, pkg, lang = "zh-CN") {
  const t = T[lang] ?? T["zh-CN"];
  const word = candidate.type === "issue" ? "issue" : "PR";
  const prefix = "[dsh-l] " + candidate.repo + "#" + candidate.number + " " + word + " · ";
  let title = String(candidate.title ?? "");
  if (prefix.length + title.length > 72) title = title.slice(0, Math.max(1, 72 - prefix.length));
  const anchor = prefix + title;
  const localPath = pkg?.repo?.localPath ?? null;
  const lines = [
    anchor,
    "",
    "## " + t.head,
    "",
    "- " + t.link + ": " + (candidate.url ?? ""),
    "- " + t.triage + ": " + (candidate.triage ? candidate.triage.validity + " / " + candidate.triage.urgency + " / " + candidate.triage.action + " — " + candidate.triage.reason : "-"),
    "- " + t.goal + ": " + (pkg?.instructions?.goal ?? title),
    "- " + t.branch + ": " + (pkg?.repo?.defaultBranch ?? "-"),
    "- " + t.ws + ": " + (localPath ?? t.wsNone),
    "- " + t.first + ": " + t.firstStep,
    "",
    "## task package",
    "",
    FENCE + "json",
    JSON.stringify(pkg, null, 1),
    FENCE,
    "",
  ];
  return lines.join("\n");
}

export function resolveLocalWorkspace(repo, { home, stat } = {}) {
  if (!repo || typeof repo !== "string" || !repo.includes("/") || !home) return null;
  const dir = join(home, "workspace", repo.split("/")[1]);
  try {
    const st = stat?.(dir);
    return st && typeof st.isDirectory === "function" && st.isDirectory() ? dir : null;
  } catch {
    return null;
  }
}

// services：{agents, workingDirectory, approval, agentDefaultModel, settings, userMessage}（host.mjs 装配注入；
// 测试注 fake）。模型/preset 三分支（评审 R1-6/R2-3）：显式模型（resolveAgentSelection validity 判定）→
// agentOptions + setup select；preset 在场且无显式 → agentOptions 不传、不 select；皆无 → 不传、不 select。
export function composeWorkWorld({ agents, workingDirectory, approval, agentDefaultModel, settings = null, userMessage }) {
  const hostDefault = () => agentDefaultModel?.currentSelection?.() ?? { provider: "", model: "" };
  // settings 支持对象或函数（评审 impl#1）：store.setSettings 整体替换 doc.settings 引用——装配期对象快照会
  // stale，host.mjs 传 () => store.getSettings()，createAgent 每次调用时求值。
  const settingsOf = () => (typeof settings === "function" ? settings() : settings) ?? null;
  return {
    async createAgent(sessionId, { cwd, agentPreset, model, approvalPolicy } = {}) {
      const preset = agentPreset ?? settingsOf()?.workSessionPreset ?? undefined;
      const policy = approvalPolicy ?? settingsOf()?.workSessionApprovalPolicy ?? null;
      const explicit = model && typeof model.provider === "string" && model.provider !== ""
        && typeof model.model === "string" && model.model !== "";
      let agentOptions;
      let setup;
      if (explicit) {
        agentOptions = resolveAgentSelection(model, hostDefault());
        setup = (_agentCtx, agent) => { agent.model?.select?.(agentOptions); };
      }
      const handle = await agents.create({
        sessionId,
        meta: { cwd, agentPreset: preset },
        agentOptions,
        setup,
      });
      // 红线①：meta.cwd 只落会话头，工具实际目录由此二跳设置；调用方必须在二者之后才 send（时序红线）。
      await workingDirectory.set(handle.agent, cwd);
      if (policy) approval.setPolicy(handle.agent, policy);
      return handle;
    },
    send(agent, text) {
      return agent.send(userMessage(text), "next-turn", true);
    },
  };
}

// 创建事务（守卫与记账在路由层 postWorkStart——架构快照守卫序 1-7；本函数持守卫序 3/4 的域内防御复检）。
export async function startWorkSession(world, { store, lang = "zh-CN", now = () => new Date() }, { key, cwd, another = false, pkg }) {
  const active = store.getWorkSession(key);
  if (active && !another && (!cwd || cwd === active.cwd)) {
    return { sessionId: active.sessionId, reused: true };
  }
  if (active && !another && cwd && cwd !== active.cwd) {
    throw Object.assign(new Error("active work session uses a different workspace"), { status: 409, code: "work-cwd-conflict" });
  }
  const c = store.getCandidate(key);
  if (!c) throw Object.assign(new Error("candidate not found: " + key), { status: 404, code: "candidate-not-found" });
  const sessionId = workSessionId(now);
  // kickoff 用派生包：工作区路径落 localPath（可读块引用），不改响应侧原包。
  const kpkg = { ...pkg, repo: { ...(pkg?.repo ?? {}), localPath: cwd ?? null } };
  const handle = await world.createAgent(sessionId, { cwd });
  try {
    await world.send(handle.agent, buildKickoff(c, kpkg, lang));
  } catch (err) {
    // rollback-only：创建事务回滚（send 失败且 appendWorkSession 之前）——红线②唯一允许的 dispose。
    try { await handle.dispose(); } catch {}
    try { store.recordHistory(key, "work-session.kickoff-failed", String(err?.message ?? err)); } catch {}
    throw Object.assign(new Error("kickoff failed: " + String(err?.message ?? err)), { status: 500, code: "kickoff-failed" });
  }
  store.appendWorkSession(key, {
    sessionId,
    cwd: cwd ?? null,
    approvalPolicy: store.getSettings?.()?.workSessionApprovalPolicy ?? null,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  });
  store.recordHistory(key, "work-session.opened", sessionId);
  return { sessionId, reused: false };
}
