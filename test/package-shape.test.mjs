import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("manifest 形状", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.name, "dsh-l");
  assert.deepEqual(Object.keys(pkg.exports), [".", "./client"]);
  assert.equal(pkg.dsh.engines.dsh, ">=0.2.2-rc.1");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.deepEqual(pkg.dsh.client.inject, ["slots", "@deepseek-ai/dsh-client-ui-workspace", "@deepseek-ai/dsh-api-session-controller"]);
  assert.equal(pkg.dependencies, undefined);
});

test("cordis.patch.yml 为单 row block 序列（含 id 与 name）", () => {
  const patch = readFileSync("cordis.patch.yml", "utf8");
  assert.match(patch, /- insert:\n    - id: dsh-l\n      name: dsh-l\n$/);
  assert.ok(!patch.includes("[id:"), "禁止流式序列：[id: x, name: y] 会解析成两条单键 row，{id} 幽灵行打崩宿主 preflight（R1-01）");
});

test("构建产物形状与同指纹", () => {
  assert.ok(existsSync("lib/host.js") && existsSync("lib/client.js"));
  const client = readFileSync("lib/client.js", "utf8");
  assert.ok(client.startsWith("window.__ModuleLoader__.load({"));
  assert.ok(client.includes("sidebar.panellist"));
  assert.ok(client.includes("dsh-l.workbench"));
  assert.match(client, /order:\s*30/);
  const id = client.match(/dsh-l-build:([0-9a-f]{12})/)?.[1];
  assert.ok(id, "client 缺指纹");
  assert.ok(readFileSync("lib/host.js", "utf8").includes(id), "host 与 client 指纹不一致");
});
