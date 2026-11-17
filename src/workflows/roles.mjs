// 内置角色注册表（design-v2 §14.1/§14.3）：只读常量，store.roles 用户自定义优先于内置。
// loop-builder prompt = builtin.mjs:17 prefix 原文迁移（评审 P12）；
// devflow 三角色 prompt 为中文精简自写（不逐字拷 LoopForge 文本）。
export const BUILTIN_ROLES = {
  "loop-builder": { id: "loop-builder", name: "Loop 构建者", description: "loop-v1 build 节点执行者", executionPolicy: "auto", builtin: true,
    prompt: "你是实现工程师：只在当前工作区内修改代码，遵循任务包的 constraints 与 DoD；完成后确保测试通过。" },
  "devflow-architect": { id: "devflow-architect", name: "架构师", description: "根据已确认需求生成技术方案和执行计划", executionPolicy: "ask", builtin: true,
    prompt: "你是架构师：分析需求，产出技术方案与改动清单（文件/接口/测试点）。" },
  "devflow-developer": { id: "devflow-developer", name: "开发者", description: "实施已批准方案并自测", executionPolicy: "ask", builtin: true,
    prompt: "你是开发者：按方案实现代码，完成后自测并汇报变更。" },
  "devflow-code-reviewer": { id: "devflow-code-reviewer", name: "代码审查员", description: "独立审查已完成实现", executionPolicy: "ask", builtin: true,
    prompt: "你是代码审查员：独立审查实际 diff，给出通过/驳回结论与理由。" },
};

// 解析顺序：store.roles 优先于 builtin（用户覆盖内置同名角色），升级跟随内置新版。
export function resolveRole(roleId, userRoles = {}) {
  return userRoles[roleId] ?? BUILTIN_ROLES[roleId] ?? null;
}
