import { computeRevision } from "./validate.mjs";

// 内置工作流模板（唯一事实源，design-v2 §3）。只读常量；store 不存内置模板，run 只存
// templateId + revision + snapshot。loop-v1 = v1 硬编码 stage 机的泛化实例：
// G1(闸) → build(agent) → verify(script) --rework(maxReworks:3)--> build
//        verify → G2(闸, rejectTarget=build) → deliver(script: push + gh pr create) → run 终态 shipped
// G1 驳回（特例）= 取消 run、候选回 triaged——该语义在 scheduler 按 gateId 判，不进模板字段。
// script 正文为 M1 的具体缺省实现（M2 执行器接线时可按角色/工作区语境微调，改动会换 revision 指纹）。
export const LOOP_V1 = {
  id: "loop-v1",
  name: "Loop v1",
  version: 1,
  builtin: true,
  entryPresucceeded: ["g1"],   // 入口闸预置（评审 P16：审批时序语义——G1 放行即建 run，非结构位置）
  nodes: [
    { id: "g1", name: "G1", type: "gate", gateId: "G1", rejectTarget: null },
    { id: "build", name: "build", type: "agent", executionPolicy: "auto", maxAttempts: 2, roleId: "loop-builder",
      prefix: "你是实现工程师：只在当前工作区内修改代码，遵循任务包的 constraints 与 DoD；完成后确保测试通过，并把本轮改动 commit 到当前分支（不推送、不碰主分支）。" },
    { id: "verify", name: "verify", type: "script", scriptLanguage: "shell", script: "npm test",
      maxReworks: 3, maxAttempts: 3 },
    { id: "g2", name: "G2", type: "gate", gateId: "G2", rejectTarget: "build" },
    { id: "mr-open", name: "发起 MR", type: "agent", roleId: "mr-opener", executionPolicy: "auto", maxAttempts: 2, maxReworks: 2 },
    { id: "mr-push-check", name: "推送检查", type: "script", scriptLanguage: "shell", maxReworks: 2,
      script: "[ -z \"$(git status --porcelain)\" ] || { echo \"存在未提交改动\"; exit 1; }; [ \"$(git rev-list --count HEAD --not --remotes)\" = \"0\" ] || { echo \"存在未推送提交\"; exit 1; }; branch=$(git branch --show-current); [ -n \"$branch\" ] || { echo \"分离 HEAD，不在工作分支\"; exit 1; }; def=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); [ \"${def:-main}\" != \"$branch\" ] || { echo \"当前在默认分支 $branch，不在本轮工作分支\"; exit 1; }" },
    { id: "mr-open-check", name: "MR 检查", type: "script", scriptLanguage: "shell", maxReworks: 2,
      script: "url=$(gh pr view --json url -q .url 2>/dev/null) && state=$(gh pr view --json state -q .state) && [ \"$state\" = \"OPEN\" ] && head=$(gh pr view --json headRefOid -q .headRefOid) && [ \"$head\" = \"$(git rev-parse HEAD)\" ] && echo \"$url\"" },
    { id: "deliver", name: "交付汇总", type: "script", scriptLanguage: "shell", maxAttempts: 2,
      script: "gh pr view --json url,title,state --jq '\"\\(.url) \\(.title) [\\(.state)]\"'" },
  ],
  deliverEvidence: "deliver",   // M6 D4：onNodeDone 成功落 deliver.mr 事件（G3 证据源）
  edges: [
    { id: "e1", source: "g1", target: "build", kind: "success" },
    { id: "e2", source: "build", target: "verify", kind: "success" },
    { id: "e3", source: "verify", target: "build", kind: "rework" },
    { id: "e4", source: "verify", target: "g2", kind: "success" },
    { id: "e5", source: "g2", target: "mr-open", kind: "success" },
    { id: "e6", source: "mr-open", target: "mr-push-check", kind: "success" },
    { id: "e7", source: "mr-push-check", target: "mr-open-check", kind: "success" },
    { id: "e8", source: "mr-open-check", target: "deliver", kind: "success" },
    { id: "e9", source: "mr-open", target: "build", kind: "rework" },
    { id: "e10", source: "mr-push-check", target: "build", kind: "rework" },
    { id: "e11", source: "mr-open-check", target: "build", kind: "rework" },
  ],
};

LOOP_V1.revision = computeRevision(LOOP_V1);

// devflow-lite（design-v2 §14.2/D2）：DevFlow 语义骨架精简——需求闸→设计→实现→独立评审→测试→交付闸→交付。
// 砍 KNOWLEDGE/SUMMARY、不做规模分级（固定 medium 路由，small 需求走 loop-v1）；
// rework 预算由 maxReworks 承载（对齐 LoopForge max_stage_failures:2 语义）。
export const DEVFLOW_LITE = {
  id: "devflow-lite",
  name: "DevFlow Lite",
  version: 1,
  builtin: true,
  nodes: [
    { id: "requirement", name: "需求确认", type: "gate", gateId: "G1", rejectTarget: null },
    { id: "design", name: "设计", type: "agent", roleId: "devflow-architect", executionPolicy: "ask" },
    { id: "implement", name: "实现", type: "agent", roleId: "devflow-developer", executionPolicy: "auto", maxAttempts: 2 },
    { id: "review", name: "评审", type: "agent", roleId: "devflow-code-reviewer", executionPolicy: "ask", maxReworks: 2 },
    { id: "test", name: "测试", type: "script", scriptLanguage: "shell", script: "npm test", maxAttempts: 2 },
    { id: "g2", name: "G2", type: "gate", gateId: "G2", rejectTarget: "implement" },
    { id: "mr-open", name: "发起 MR", type: "agent", roleId: "mr-opener", executionPolicy: "auto", maxAttempts: 2, maxReworks: 2 },
    { id: "mr-push-check", name: "推送检查", type: "script", scriptLanguage: "shell", maxReworks: 2,
      script: "[ -z \"$(git status --porcelain)\" ] || { echo \"存在未提交改动\"; exit 1; }; [ \"$(git rev-list --count HEAD --not --remotes)\" = \"0\" ] || { echo \"存在未推送提交\"; exit 1; }; branch=$(git branch --show-current); [ -n \"$branch\" ] || { echo \"分离 HEAD，不在工作分支\"; exit 1; }; def=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); [ \"${def:-main}\" != \"$branch\" ] || { echo \"当前在默认分支 $branch，不在本轮工作分支\"; exit 1; }" },
    { id: "mr-open-check", name: "MR 检查", type: "script", scriptLanguage: "shell", maxReworks: 2,
      script: "url=$(gh pr view --json url -q .url 2>/dev/null) && state=$(gh pr view --json state -q .state) && [ \"$state\" = \"OPEN\" ] && head=$(gh pr view --json headRefOid -q .headRefOid) && [ \"$head\" = \"$(git rev-parse HEAD)\" ] && echo \"$url\"" },
    { id: "deliver", name: "交付汇总", type: "script", scriptLanguage: "shell", maxAttempts: 2,
      script: "gh pr view --json url,title,state --jq '\"\\(.url) \\(.title) [\\(.state)]\"'" },
  ],
  deliverEvidence: "deliver",   // M6 D4
  edges: [
    { id: "d1", source: "requirement", target: "design", kind: "success" },
    { id: "d2", source: "design", target: "implement", kind: "success" },
    { id: "d3", source: "implement", target: "review", kind: "success" },
    { id: "d4", source: "review", target: "implement", kind: "rework" },
    { id: "d5", source: "review", target: "test", kind: "success" },
    { id: "d6", source: "test", target: "g2", kind: "success" },
    { id: "d7", source: "g2", target: "mr-open", kind: "success" },
    { id: "d8", source: "mr-open", target: "mr-push-check", kind: "success" },
    { id: "d9", source: "mr-push-check", target: "mr-open-check", kind: "success" },
    { id: "d10", source: "mr-open-check", target: "deliver", kind: "success" },
    { id: "d11", source: "mr-open", target: "implement", kind: "rework" },
    { id: "d12", source: "mr-push-check", target: "implement", kind: "rework" },
    { id: "d13", source: "mr-open-check", target: "implement", kind: "rework" },
  ],
};

DEVFLOW_LITE.revision = computeRevision(DEVFLOW_LITE);
