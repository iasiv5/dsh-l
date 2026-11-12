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
  assert.deepEqual(pkg.dsh.client.inject, ["slots"]);
  assert.equal(pkg.dependencies, undefined);
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
