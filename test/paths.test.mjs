import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { findProfileRoot, dataDir } from "../src/paths.mjs";

const fakeProfile = () => {
  const home = mkdtempSync(join(tmpdir(), "dsh-l-home-"));
  const profile = join(home, "profiles", "p1");
  const lib = join(profile, "node_modules", ".pnpm", "dsh-l@x", "node_modules", "dsh-l", "lib");
  mkdirSync(lib, { recursive: true });
  writeFileSync(join(profile, "package.json"), JSON.stringify({ dsh: { profile: { bundles: [] } } }));
  writeFileSync(join(lib, "..", "package.json"), JSON.stringify({ name: "dsh-l" }));
  return { home, profile, moduleUrl: pathToFileURL(join(lib, "host.js")).href };
};

test("模块位置上溯找到声明 dsh.profile 的 profile 根（跨过插件自身与 .pnpm 虚拟仓）", () => {
  const { profile, moduleUrl } = fakeProfile();
  assert.equal(findProfileRoot(fileURLToPath(new URL(".", moduleUrl))), profile);
});

test("dataDir = <profile>/data/dsh-l 并创建", () => {
  const { profile, moduleUrl } = fakeProfile();
  const dir = dataDir({ env: {}, moduleUrl, argv: [], home: "/nonexistent" });
  assert.equal(dir, join(profile, "data", "dsh-l"));
  assert.ok(existsSync(dir));
});

test("DSH_L_DATA 覆盖优先", () => {
  const over = join(mkdtempSync(join(tmpdir(), "dsh-l-over-")), "d");
  assert.equal(dataDir({ env: { DSH_L_DATA: over }, moduleUrl: "file:///nowhere/x.js", argv: [], home: "/nonexistent" }), over);
});

test("模块不在 profile 内时按 argv 位置参数定位 profile", () => {
  const { home, profile } = fakeProfile();
  const dir = dataDir({ env: {}, moduleUrl: "file:///elsewhere/lib/host.js", argv: ["node", "bin.js", "p1", "--port", "3095"], home });
  assert.equal(dir, join(profile, "data", "dsh-l"));
});

test("全找不到则抛错并提示 DSH_L_DATA", () => {
  assert.throws(() => dataDir({ env: {}, moduleUrl: "file:///elsewhere/x.js", argv: [], home: "/nonexistent" }), /DSH_L_DATA/);
});
