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
