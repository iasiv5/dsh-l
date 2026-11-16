import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateTemplate, computeRevision } from "./validate.mjs";
import { LOOP_V1 } from "./builtin.mjs";

// meta 投影：script 正文不出模块（design-v2 §3）——state/客户端只拿 id/name/version/revision/builtin/节点名与类型/边数。
const metaOf = (t) => ({
  id: t.id, name: t.name, version: t.version, revision: t.revision, builtin: Boolean(t.builtin),
  nodes: (t.nodes ?? []).map(({ id, name, type }) => ({ id, name, type })),
  edgeCount: (t.edges ?? []).length,
});

// 模板目录：内置 loop-v1 在前 + 数据目录 workflows/*.json 用户模板（文件名序）。
// 策略（评审 R12）：仅收 .json 后缀；解析/校验失败 → 跳过并警告；用户模板 id 撞内置或彼此重复 → 拒收并警告。
// io 参数可注入以便测试。M1 启动时读一次（host.mjs 装配处），用户模板改动重启生效。
export function loadTemplates({ dataDir, readdirSync: ls = readdirSync, readFileSync: rf = readFileSync }) {
  const templates = [metaOf(LOOP_V1)];
  const warnings = [];
  const seen = new Set([LOOP_V1.id]);
  let files;
  try { files = ls(join(dataDir, "workflows")); } catch { return { templates, warnings }; }
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;                       // 评审 R12：非 json 忽略，不误报警告
    let t;
    try { t = JSON.parse(rf(join(dataDir, "workflows", file), "utf8")); }
    catch (err) { warnings.push(file + ": " + String(err?.message ?? err)); continue; }
    const v = validateTemplate(t);
    if (!v.ok) { warnings.push(file + ": " + v.errors[0]); continue; }
    t.revision ??= computeRevision(t);
    if (seen.has(t.id)) { warnings.push(file + ": duplicate template id " + t.id); continue; }
    seen.add(t.id);
    templates.push(metaOf(t));
  }
  return { templates, warnings };
}
