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
  nodes: [
    { id: "g1", name: "G1", type: "gate", gateId: "G1", rejectTarget: null },
    { id: "build", name: "build", type: "agent", executionPolicy: "auto", maxAttempts: 2, roleId: "loop-builder",
      prefix: "你是实现工程师：只在当前工作区内修改代码，遵循任务包的 constraints 与 DoD；完成后确保测试通过。" },
    { id: "verify", name: "verify", type: "script", scriptLanguage: "shell", script: "npm test",
      maxReworks: 3, maxAttempts: 3 },
    { id: "g2", name: "G2", type: "gate", gateId: "G2", rejectTarget: "build" },
    { id: "deliver", name: "deliver", type: "script", scriptLanguage: "shell",
      script: "git push -u origin HEAD && gh pr create --fill", maxAttempts: 2 },
  ],
  edges: [
    { id: "e1", source: "g1", target: "build", kind: "success" },
    { id: "e2", source: "build", target: "verify", kind: "success" },
    { id: "e3", source: "verify", target: "build", kind: "rework" },
    { id: "e4", source: "verify", target: "g2", kind: "success" },
    { id: "e5", source: "g2", target: "deliver", kind: "success" },
  ],
};

LOOP_V1.revision = computeRevision(LOOP_V1);
