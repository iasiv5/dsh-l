import { zhCN } from "./locale/zh-CN.mjs";
import { en } from "./locale/en.mjs";

const flatten = (d, p = "") =>
  Object.fromEntries(Object.entries(d).flatMap(([k, v]) =>
    typeof v === "string" ? [[p + k, v]] : Object.entries(flatten(v, p + k + "."))));
const TABLES = { "zh-CN": flatten(zhCN), en: flatten(en) };

export function normalizeLang(value) {
  return typeof value === "string" && /^en\b/i.test(value) ? "en" : "zh-CN";
}

export function makeT(lang) {
  const table = TABLES[lang] ?? TABLES["zh-CN"];
  return (key) => table[key] ?? key;
}

// guizang lib/client.js:36-43 同款：locale 服务在则跟随快照与 locale/change，缺席时浏览器语言兜底。
export function createLangSource(ctx, nav = globalThis.navigator) {
  let lang = normalizeLang(nav?.language);
  const subscribers = new Set();
  const set = (value) => {
    const next = normalizeLang(value);
    if (next === lang) return;
    lang = next;
    for (const fn of subscribers) fn(lang);
  };
  if (typeof ctx?.inject === "function") {
    ctx.inject(["locale"], (c) => {
      set(c.locale.getSnapshot().active);
      c.on("locale/change", (snap) => set(snap.active));
    });
  }
  return {
    get: () => lang,
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  };
}
