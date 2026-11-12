import test from "node:test";
import assert from "node:assert/strict";
import { zhCN } from "../src/client/locale/zh-CN.mjs";
import { en } from "../src/client/locale/en.mjs";

const flat = (d, p = "") =>
  Object.entries(d).flatMap(([k, v]) => (typeof v === "string" ? [p + k] : flat(v, p + k + "."))).sort();

test("zh-CN 与 en 键集一致", () => assert.deepEqual(flat(zhCN), flat(en)));
