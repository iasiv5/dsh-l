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

test("i18n 动态前缀键白名单守护（M5 T6，评审 R-3）：源码动态 t 前缀 ⊆ 白名单且段键值域合法", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const zh = (await import("../src/client/locale/zh-CN.mjs")).zhCN;
  const en = (await import("../src/client/locale/en.mjs")).en;
  // 点分路径逐级下钻（run.status 类多段段键）
  const drill = (obj, dotted) => dotted.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
  // 白名单表（评审 R-3：7 前缀显式值域；新动态前缀出现 → 本用例红，提示补表）
  const WHITELIST = {
    groups: ["inbox", "triaged", "gating", "building", "shipped", "closed"],
    urgency: ["P0", "P1", "P2", "P3"],
    gates: ["G1", "G2", "G3"],
    validity: ["high", "medium", "low", "none"],
    recommendedActions: ["start", "feedback", "close", "hold"],
    "run.status": ["running", "waiting", "succeeded", "failed", "cancelled"],
    "errors.codes": ["gate-requires-gating", "engine-issue-only", "run-already-active", "workspace-not-found", "managed-dir-explicit", "work-cwd-conflict", "no-work-session", "deliver-requires-building", "engine-not-wired", "work-not-wired", "gh-not-installed", "gh-not-authorized", "gh-not-ours", "credential-unhealthy", "credential-missing", "credential-invalid", "credential-format", "token-invalid", "auth-required", "already-authorized", "model-not-in-catalog", "preset-not-in-roster", "release-requires-shipped", "release-already-confirmed", "refresh-in-progress", "feishu-not-wired", "invalid-path", "gate-not-available-in-v1", "candidate-not-found", "kickoff-failed", "retry-requires-failed-or-cancelled", "retry-requires-failed", "attempt-exhausted"],
    stages: ["ingest", "backlog", "triage", "feedback", "build", "verify", "ship"],
  };
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
  const re = /\bt\("([a-zA-Z.]+?)" *\+/g;   // 评审 R-3：[a-zA-Z.] 跨点跨大写（run.status / recommendedActions）；非贪婪防吞尾点
  const used = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) used.add(m[1].replace(/\.$/, ""));   // 归一化：剥尾部段点
  }
  const problems = [];
  for (const prefix of used) {
    if (!(prefix in WHITELIST)) { problems.push("未知动态前缀（请补白名单表）: " + prefix); continue; }
    for (const [lang, dict] of [["zh-CN", zh], ["en", en]]) {
      const seg = drill(dict, prefix);
      if (!seg || typeof seg !== "object") { problems.push(lang + " 段键缺失: " + prefix); continue; }
      const extra = Object.keys(seg).filter((k) => !WHITELIST[prefix].includes(k));
      if (extra.length > 0) problems.push(lang + " 段 " + prefix + " 含白名单外键: " + extra.join(","));
    }
  }
  assert.deepEqual(problems, []);
});
