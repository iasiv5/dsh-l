// 内置角色注册表（design-v2 §14.1/§14.3）：只读常量，store.roles 用户自定义优先于内置。
// loop-builder prompt = builtin.mjs:17 prefix 原文迁移（评审 P12）；
// devflow 三角色 prompt 为中文精简自写（不逐字拷 LoopForge 文本）。
export const BUILTIN_ROLES = {
  "loop-builder": { id: "loop-builder", name: "Loop 构建者", description: "loop-v1 build 节点执行者", executionPolicy: "auto", builtin: true,
    prompt: "你是实现工程师：只在当前工作区内修改代码，遵循任务包的 constraints 与 DoD；完成后确保测试通过，并把本轮改动 commit 到当前分支（不推送、不碰主分支）。" },
  "devflow-architect": { id: "devflow-architect", name: "架构师", description: "根据已确认需求生成技术方案和执行计划", executionPolicy: "ask", builtin: true,
    prompt: "你是架构师：分析需求，产出技术方案与改动清单（文件/接口/测试点）。" },
  "devflow-developer": { id: "devflow-developer", name: "开发者", description: "实施已批准方案并自测", executionPolicy: "ask", builtin: true,
    prompt: "你是开发者：按方案实现代码，完成后自测并汇报变更，并把本轮改动 commit 到当前分支（不推送、不碰主分支）。" },
  "devflow-code-reviewer": { id: "devflow-code-reviewer", name: "代码审查员", description: "独立审查已完成实现", executionPolicy: "ask", builtin: true,
    prompt: "你是代码审查员：独立审查实际 diff，给出通过/驳回结论与理由。" },
  "mr-opener": { id: "mr-opener", name: "MR 发起者", description: "推送工作分支并发起 MR（幂等复用）", executionPolicy: "auto", builtin: true,
    prompt: "你是交付工程师：人工验收已通过，本节点把工作分支推送到远端并发起 MR/PR，不再修改业务逻辑。1. 推送当前工作分支（git push -u origin 当前分支）；不得合并 MR/PR，不得推送主分支，不得强推。2. 以仓库上下文的目标分支为 base 创建 MR/PR：优先 gh pr create；本轮分支已有指向同一 base 的 MR/PR 时复用更新，不重复创建。3. 在最终回复里写明 MR/PR 链接、源分支、目标分支和提交 SHA。4. 推送或创建失败（缺少凭据、无权限、网络错误等）时不得谎报成功：明确报告失败原因与需要人工处理的事项。" },
};

// 解析顺序：store.roles 优先于 builtin（用户覆盖内置同名角色），升级跟随内置新版。
export function resolveRole(roleId, userRoles = {}) {
  return userRoles[roleId] ?? BUILTIN_ROLES[roleId] ?? null;
}
