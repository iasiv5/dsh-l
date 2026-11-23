import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

// P2 retro #2：设计防回潮家族收敛——源码级静态断言单文件化。
// 各规则来源判例见 docs/plans/2026-11-22-p1/p2 §8 与 CODING_STANDARDS.md；新判例只加行不改结构。

const componentsDir = path.resolve(url.fileURLToPath(new URL("../src/client/components", import.meta.url)));
const compFiles = fs.readdirSync(componentsDir).filter((f) => f.endsWith(".mjs"));
const srcOf = (f) => fs.readFileSync(path.join(componentsDir, f), "utf8");
const problems = [];

// R1（判例：P1 B3②/P2 Task 1）：语义色一律 color-mix(in srgb,#d1242f 85%,currentColor)——禁 crimson 字面量（含注释，防回潮词面）
for (const f of compFiles) {
  if (srcOf(f).includes("crimson")) problems.push(f + ": crimson 字面量（应改 color-mix 语义色）");
}

// R2（判例：P1 B3① ssarchive / P1 B3② 关闭钮 / P2 B1 palette item）：内联 min-height 压过 coarse 44px——
// 非 workbench 组件的内联 min-height 数值 ≥36 允许（36px = input 基线验收口径），<36 即触点缩水违规。
for (const f of compFiles) {
  if (f === "workbench.mjs") continue;
  for (const m of srcOf(f).matchAll(/min-height:\s*(\d+)px/g)) {
    if (Number(m[1]) < 36) problems.push(f + ": 内联 min-height " + m[1] + "px < 36（触点尺寸交 coarse 层接管）");
  }
}

// R3（判例：P2 B1 palette input）：非 workbench 组件禁内联 font-size:14px（压过 coarse 16px，iOS 聚焦缩放）——
// workbench 的 :host 基线 14px 为全局排版语义，豁免。
for (const f of compFiles) {
  if (f === "workbench.mjs") continue;
  if (srcOf(f).includes("font-size:14px")) problems.push(f + ": 内联 font-size:14px（交 coarse 层接管）");
}

// R4（判例：P2 Task 1 actions.mjs）：deps seam 统一命名 a；`const a = ` 仅允许 deps 注入形态——
// 其余单字母 const a 遮蔽 seam 会静默错路由（CODING_STANDARDS R2）。
for (const f of compFiles) {
  const bad = srcOf(f).match(/const a = (?!deps)/g);
  if (bad) problems.push(f + ": const a = 非注入形态（遮蔽 deps seam）×" + bad.length);
}

// R5（判例：P2 Task 1）：checkboxEls 登记式同步已被「部分失败走全量重绘」取代——死基建防回潮
for (const f of compFiles) {
  if (srcOf(f).includes("checkboxEls")) problems.push(f + ": checkboxEls 死基建复生");
}

test("design-lint：源码级设计纪律零违规", () => {
  assert.deepEqual(problems, []);
});
