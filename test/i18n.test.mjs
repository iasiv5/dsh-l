import test from "node:test";
import assert from "node:assert/strict";
import { makeT, normalizeLang, createLangSource } from "../src/client/i18n.mjs";

test("normalizeLang", () => {
  assert.equal(normalizeLang("en"), "en");
  assert.equal(normalizeLang("en-US"), "en");
  assert.equal(normalizeLang("zh"), "zh-CN");
  assert.equal(normalizeLang(undefined), "zh-CN");
});

test("makeT 取嵌套键，缺键回显键名", () => {
  assert.equal(makeT("en")("panelLabel"), "DSH Loop Forge");
  assert.equal(makeT("zh-CN")("groups.inbox"), "待分诊");
  assert.equal(makeT("en")("no.such.key"), "no.such.key");
});
test("i18n 消费键守护：静态 t(\"…\") 字面量 ⊆ 双字典键集（M4 T9）", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const zh = (await import("../src/client/locale/zh-CN.mjs")).zhCN;
  const en = (await import("../src/client/locale/en.mjs")).en;
  const flatten = (obj, prefix = "") => {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const dotted = prefix ? prefix + "." + k : k;
      if (v && typeof v === "object") keys.push(...flatten(v, dotted));
      else keys.push(dotted);
    }
    return keys;
  };
  const zhKeys = new Set(flatten(zh));
  const enKeys = new Set(flatten(en));
  // 扫 src/client/**/*.mjs 源码，提取 t("…") / t('…') 静态字面量
  const clientDir = path.resolve(import.meta.dirname, "../src/client");
  const files = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory()) walk(full);
      else if (f.name.endsWith(".mjs")) files.push(full);
    }
  };
  walk(clientDir);
  const re = /\bt\((['"])([^'"\n]+)\1\)/g;
  const consumed = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) consumed.add(m[2]);   // m[2]=键名（m[1] 是引号界定符——评审 R2-1 同型：索引写错）
  }
  // 守护：消费键必须在 zh/en 双字典键集中（缺失即红，列出缺失键与来源文件）
  const missing = [];
  for (const key of consumed) {
    if (!zhKeys.has(key)) missing.push("zh-CN missing: " + key);
    if (!enKeys.has(key)) missing.push("en missing: " + key);
  }
  assert.deepEqual(missing, []);
});

test("createLangSource 跟随宿主 locale 快照与 locale/change", () => {
  let changeHandler = null;
  const fakeCtx = {
    inject: (deps, cb) => cb({
      locale: { getSnapshot: () => ({ active: "en" }) },
      on: (name, fn) => { if (name === "locale/change") changeHandler = fn; },
    }),
  };
  const src = createLangSource(fakeCtx, { language: "zh-CN" });
  assert.equal(src.get(), "en");
  const seen = [];
  src.subscribe((l) => seen.push(l));
  changeHandler({ active: "zh" });
  assert.equal(src.get(), "zh-CN");
  assert.deepEqual(seen, ["zh-CN"]);
});

test("无 locale 服务时按浏览器语言兜底", () => {
  assert.equal(createLangSource({}, { language: "en-GB" }).get(), "en");
});
