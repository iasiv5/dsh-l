# dsh-l v1 数据面与分诊实施计划

## 目标

- 在隔离验证环境交付 dsh-l v1：摄取 12 个监看仓的 open issue / open PR 成候选清单，LLM 批量分诊给建议，人工阶段迁移与 G1 闸门放行产出任务包。
- 每个任务独立可验证；Task 9 通过即 v1 收口。

## 架构快照

- host（Node ESM，零运行时依赖）：文件驱动存储 ~/.dsh/storages/dsh-l.json；GitHub REST 摄取（token 三级解析）；ctx.agents 短命会话批量分诊（session/event 流取 turn/end 完成证据）；webServer 注册 exact 路由 /dsh-l/*。
- client（原生 DOM + Shadow DOM，esbuild iife）：main slot 整页工作台 + sidebar.panellist（order:7）图标；i18n 双字典。
- 复用判例：路由形态＝dsh-host-webserver README（exact/prefix，重复路径抛错）；分诊回执＝autoloop dsh/src/bridge.ts 窄接口模式；lang 解析＝guizang 的 navigator.language 判例；装机验证＝know-how 049 runbook。

## 全局约束（从 design.md / PRODUCT.md 逐字继承）

- engines.dsh 固定 >=0.2.2-rc.1；零运行时 dependencies，devDependencies 仅 esbuild；不引 @deepseek-ai/* 运行时依赖（know-how 041 红线）。
- GitHub token 不落存储、不打日志、只进 Authorization 头。
- UI 文案只出自 src/client/locale/zh-CN.mjs 与 en.mjs，两文件键集始终同步（守卫测试锁死）。
- 分诊结果是建议，v1 不自动触发任何下游动作；G1/G2/G3 闸门全部人工放行。
- Task 6/7 动 UI 前读 impeccable reference/craft-floor.md；UI 完成后跑 impeccable detect。
- 装机验证一律隔离 scratch profile（049 runbook），不触在役宿主。
- 联网 npm 命令带 npm_config_cache=/home/ubuntu/workspace/.npm-cache。
- 命令环境：bash（Host A）；grep 断言用 grep -q（grep -c 计 0 时 exit 1，禁入 && 链）。

## 输入工件

- docs/design.md（存储 schema §2、provider §3、路由 §4、分诊 §5、任务包 §6、状态机 §8）
- PRODUCT.md（首跑默认 12 仓；三道闸门纪律）
- docs/adr/0001-park-autoloop-build-thin-layer.md
- dsh-agent-autoloop/docs/dsh-api-mapping.md（宿主 API 钉版 0.2.2-rc.1）
- 01_docs/dsh-intall-know-how/049-dshm-scratch-web-host-e2e-runbook.md
- 01_docs/research/dsw-alias-tokens.md（UI 令牌白名单）

## 文件结构与职责

- Create: scripts/build-host.mjs —— esbuild 打包 host（external @deepseek-ai/* 与 cordis）
- Create: scripts/build-client.mjs —— esbuild 打包 client（iife / browser / es2022）
- Create: src/host.mjs —— 宿主入口：inject、路由注册、依赖装配、ctx.effect 卸载清理
- Create: src/handlers.mjs —— makeHandlers 纯函数 + buildTaskPackage
- Create: src/store.mjs —— createStore 文件驱动存储（design §2 全 API）
- Create: src/github.mjs —— resolveToken / listOpenIssues / listOpenPulls / discoverRepos
- Create: src/triage.mjs —— parseTriageOutput / buildPrompt / runTriage（world 窄接口）
- Create: src/poll.mjs —— armInterval 定时摄取（默认关）
- Create: src/client/index.mjs —— slots 注册（main + sidebar.panellist order:7）
- Create: src/client/i18n.mjs —— flatten 字典 + makeT + resolveLang
- Create: src/client/api.mjs —— host 路由的 fetch 封装
- Create: src/client/logic.mjs —— groupCandidates / filterCandidates 纯函数
- Create: src/client/components/workbench.mjs —— 页头 + 过滤条 + 分组列表
- Create: src/client/components/candidateRow.mjs —— 候选行 + 展开操作
- Create: src/client/components/repoPicker.mjs —— 监看仓库选择器对话框
- Create: src/client/components/pipelineStrip.mjs —— 七段管线计数条（后三段灰显）
- Create: scripts/install-smoke.sh —— 049 六步隔离装机冒烟
- Test: test/package-shape.test.mjs、test/locale-parity.test.mjs、test/store.test.mjs、test/github.test.mjs、test/handlers.test.mjs、test/triage.test.mjs、test/logic.test.mjs
- Modify: src/client/locale/zh-CN.mjs、src/client/locale/en.mjs（Task 6 加 groups.closed；Task 7 加 actions.* 键）

接口依赖链：host.mjs → handlers.mjs → store/github/triage 的全部导出；client → api.mjs → host 路由 JSON 契约；workbench → logic.mjs 分组与 i18n。

---

## 任务清单

### Task 1: 构建链 + 包形状与 i18n parity 测试 + 最小可挂载实体

- 目标：npm run build 产出双 bundle；测试锁死 manifest 与双字典键集；client 注册面板空态页，host 提供 /dsh-l/health。
- 涉及文件：Create scripts/build-host.mjs、scripts/build-client.mjs、test/package-shape.test.mjs、test/locale-parity.test.mjs、src/host.mjs、src/client/index.mjs、src/client/i18n.mjs
- 接口契约
  - Consumes: package.json、cordis.patch.yml、src/client/locale/zh-CN.mjs、src/client/locale/en.mjs（均已存在）
  - Produces: lib/host.js（导出 name="dsh-l"、inject、apply）；lib/client.js（注册 key 为 dsh-l.workbench 的 main 面板与 order:7 的 sidebar.panellist）；src/client/i18n.mjs 导出 makeT(lang)、resolveLang(ctx)
- 验证范围：npm run build && npm test 全绿；lib/ 两文件存在且 client bundle 含 sidebar.panellist 与 dsh-l.workbench 字面量。

- [ ] Step 1: 写失败测试

test/package-shape.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("manifest 与构建产物形状", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.name, "dsh-l");
  assert.deepEqual(Object.keys(pkg.exports), [".", "./client"]);
  assert.equal(pkg.dsh.engines.dsh, ">=0.2.2-rc.1");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.deepEqual(pkg.dsh.client.inject, ["slots", "@deepseek-ai/dsh-client-locale"]);
  assert.equal(pkg.dependencies, undefined);
  assert.ok(existsSync("lib/host.js"));
  assert.ok(existsSync("lib/client.js"));
  const client = readFileSync("lib/client.js", "utf8");
  assert.ok(client.includes("sidebar.panellist"));
  assert.ok(client.includes("dsh-l.workbench"));
});
```

test/locale-parity.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { zhCN } from "../src/client/locale/zh-CN.mjs";
import { en } from "../src/client/locale/en.mjs";

const flat = (d, p = "") =>
  Object.entries(d).flatMap(([k, v]) =>
    typeof v === "string" ? [p + k] : flat(v, p + k + ".")).sort();

test("zh-CN 与 en 键集一致", () => assert.deepEqual(flat(zhCN), flat(en)));
```

- Run: `npm install && npm test`
- Expected: 红——lib/host.js 不存在（existsSync 断言失败），exit code 非 0。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: package-shape 用例报 lib 文件缺失；locale-parity 通过（两字典已同步）。

- [ ] Step 3: 写最小实现

scripts/build-host.mjs：
```js
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("lib", { recursive: true });
await build({
  entryPoints: ["src/host.mjs"], outfile: "lib/host.js", bundle: true,
  format: "esm", platform: "node", external: ["@deepseek-ai/*", "cordis"],
});
```

scripts/build-client.mjs：
```js
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("lib", { recursive: true });
await build({
  entryPoints: ["src/client/index.mjs"], outfile: "lib/client.js", bundle: true,
  format: "iife", platform: "browser", target: "es2022",
});
```

src/host.mjs（本任务最小版，Task 4 扩为完整装配）：
```js
export const name = "dsh-l";
export const inject = ["webServer"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function apply(ctx) {
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: "exact", path: "/dsh-l/health",
      handler: () => json({ ok: true, name }),
    });
    return () => dispose?.();
  });
}
```

src/client/i18n.mjs：
```js
import { zhCN } from "./locale/zh-CN.mjs";
import { en } from "./locale/en.mjs";

const flatten = (d, p = "") =>
  Object.fromEntries(Object.entries(d).flatMap(([k, v]) =>
    typeof v === "string" ? [[p + k, v]] : Object.entries(flatten(v, p + k + "."))));
const TABLES = { "zh-CN": flatten(zhCN), en: flatten(en) };

export function makeT(lang) {
  const table = TABLES[lang] ?? TABLES["zh-CN"];
  return (key) => table[key] ?? key;
}

export function resolveLang(ctx) {
  const provided = ctx?.locale?.lang ?? null; // 宿主 locale 服务可用则优先；Task 6 冒烟核对实际挂法
  if (provided === "en") return "en";
  if (typeof provided === "string" && provided.startsWith("zh")) return "zh-CN";
  return /^en\b/i.test(navigator.language) ? "en" : "zh-CN";
}
```

src/client/index.mjs：
```js
import { makeT, resolveLang } from "./i18n.mjs";

const PANEL_KEY = "dsh-l.workbench";

function PanelIcon({ size }) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none");
  const ring = document.createElementNS(ns, "circle");
  ring.setAttribute("cx", "12"); ring.setAttribute("cy", "12"); ring.setAttribute("r", "9");
  ring.setAttribute("stroke", "currentColor"); ring.setAttribute("stroke-width", "2");
  const arrow = document.createElementNS(ns, "path");
  arrow.setAttribute("d", "M16.5 7.5a6 6 0 1 0 1.2 5");
  arrow.setAttribute("stroke", "currentColor"); arrow.setAttribute("stroke-width", "2");
  arrow.setAttribute("stroke-linecap", "round");
  svg.append(ring, arrow);
  return svg;
}

function WorkbenchStub() {
  const host = document.createElement("div");
  const root = host.attachShadow({ mode: "open" });
  const t = makeT(resolveLang(null));
  root.innerHTML =
    "<style>:host{display:block;padding:16px;font:14px system-ui}</style>" +
    "<h2>" + t("panelLabel") + "</h2><p>" + t("emptyStates.backlog") + "</p>";
  return host;
}

export function apply(ctx) {
  const lang = () => resolveLang(ctx);
  ctx.slots.inject("main", () =>
    ctx.slots.register(
      { name: "main", key: PANEL_KEY, label: () => makeT(lang())("panelLabel") },
      WorkbenchStub));
  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      { name: "sidebar.panellist", id: PANEL_KEY, order: 7, label: () => makeT(lang())("panelLabel") },
      PanelIcon));
}
```

- Change: 新增两构建脚本、包形状与 parity 测试、最小 host/client/i18n。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: exit 0；两测试文件全绿。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(build): 构建链 + 包形状/i18n parity 测试 + 最小面板挂载"`

---

### Task 2: store.mjs 文件驱动存储层

- 目标：design §2 的 JSON 文档与全部 store API 落地，首跑默认 12 仓内置，历史有界。
- 涉及文件：Create src/store.mjs、test/store.test.mjs
- 接口契约
  - Consumes: design §2 schema、PRODUCT.md 的 12 默认仓名
  - Produces: `createStore({ filePath, now, initial })` 返回 `{ getWatch, setWatch, upsertCandidates, listCandidates, getCandidate, setStage, setTriage, setGate, getSettings, setSettings, getSnapshots, setSnapshots }`；`candidateKey(repo, type, number)`；`DEFAULT_WATCH_REPOS`（12 项）
- 验证范围：store 用例全绿（默认 12 仓；upsert 保留 stage/triage/gates/history；setTriage 把 inbox 升为 triaged；setGate G1+pass 存 taskPackage；history 每候选上限 50）。

- [ ] Step 1: 写失败测试

test/store.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore, DEFAULT_WATCH_REPOS, candidateKey } from "../src/store.mjs";

const open = () => createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-")), "store.json") });
const raw = (n) => ({
  repo: "iasiv5/dsh-skins", type: "issue", number: n, title: "t" + n, author: "a",
  labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-02T00:00:00Z",
  url: "https://example.com/" + n, meta: { comments: 0, reactionsTotal: 0 },
  pull: null, bodyExcerpt: "b",
});

test("首跑默认 12 仓", () => {
  assert.equal(open().getWatch().repos.length, 12);
  assert.ok(DEFAULT_WATCH_REPOS.includes("iasiv5/dsh-m"));
});

test("upsert 新建候选落在 inbox；重复摄取保留人工字段", () => {
  const s = open();
  s.upsertCandidates([raw(1)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 1);
  assert.equal(s.getCandidate(key).stage, "inbox");
  s.setStage(key, "gating", "manual");
  s.upsertCandidates([{ ...raw(1), title: "changed" }]);
  const again = s.getCandidate(key);
  assert.equal(again.title, "changed");
  assert.equal(again.stage, "gating");
  assert.ok(again.history.length >= 2);
});

test("setTriage 升级 inbox→triaged；setGate G1 pass 存任务包", () => {
  const s = open();
  s.upsertCandidates([raw(2)]);
  const key = candidateKey("iasiv5/dsh-skins", "issue", 2);
  s.setTriage(key, { validity: "high", urgency: "P1", action: "start", reason: "r", lang: "zh-CN" }, "llm");
  assert.equal(s.getCandidate(key).stage, "triaged");
  const pkg = { kind: "dsh-l.task-package", version: 1 };
  s.setGate(key, "G1", "pass", "", pkg);
  assert.equal(s.getCandidate(key).taskPackage, pkg);
});
```

- Run: `npm test`
- Expected: ERR_MODULE_NOT_FOUND（../src/store.mjs 不存在）。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: store 用例全部红，错误为模块不存在。

- [ ] Step 3: 写最小实现

src/store.mjs：
```js
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_WATCH_REPOS = [
  "iasiv5/dsh-skins", "iasiv5/dsh-quota-watch", "iasiv5/dsh-stock-kanban",
  "iasiv5/dsh-onetree-log", "iasiv5/dsh-obmc-web", "iasiv5/dsh-copilot-auth",
  "iasiv5/skills", "iasiv5/dsh-m", "iasiv5/dsh-send-later",
  "iasiv5/dsh-skip-browser-auth", "iasiv5/dsh-surf", "iasiv5/dsh-agent-autoloop",
];

const HISTORY_LIMIT = 50;

export const storePath = () =>
  process.env.DSH_L_FILE ?? join(homedir(), ".dsh", "storages", "dsh-l.json");

export function candidateKey(repo, type, number) {
  return repo + "#" + type + "#" + number;
}

const emptyDoc = (now) => ({
  version: 1,
  watch: { repos: [...DEFAULT_WATCH_REPOS], updatedAt: now().toISOString() },
  candidates: {},
  snapshots: { lastIngestAt: null, perRepo: {} },
  settings: { intervalMinutes: 0, triageModel: null },
});

export function createStore({ filePath, now = () => new Date(), initial = emptyDoc }) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    doc = initial(now);
  }
  const persist = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    const tmp = join(dirname(filePath), "." + Math.random().toString(36).slice(2) + ".tmp");
    writeFileSync(tmp, JSON.stringify(doc));
    renameSync(tmp, filePath);
  };
  const touch = (key, event, detail) => {
    const c = doc.candidates[key];
    if (!c) return;
    c.history.push({ at: now().toISOString(), event, detail: detail ?? "" });
    if (c.history.length > HISTORY_LIMIT) c.history.splice(0, c.history.length - HISTORY_LIMIT);
  };
  return {
    getWatch: () => doc.watch,
    setWatch(repos) {
      doc.watch = { repos: [...new Set(repos)], updatedAt: now().toISOString() };
      persist();
    },
    listCandidates: () => Object.values(doc.candidates),
    getCandidate: (key) => doc.candidates[key] ?? null,
    upsertCandidates(list) {
      for (const raw of list) {
        const key = candidateKey(raw.repo, raw.type, raw.number);
        const prev = doc.candidates[key];
        if (!prev) {
          doc.candidates[key] = {
            key, ...raw, stage: "inbox", triage: null,
            gates: { G1: null, G2: null, G3: null }, taskPackage: null,
            history: [{ at: now().toISOString(), event: "ingested", detail: "" }],
          };
        } else {
          Object.assign(prev, {
            title: raw.title, author: raw.author, labels: raw.labels,
            createdAt: raw.createdAt, updatedAt: raw.updatedAt, url: raw.url,
            meta: raw.meta, pull: raw.pull, bodyExcerpt: raw.bodyExcerpt,
          });
        }
      }
      persist();
    },
    setStage(key, stage, note = "") {
      const c = doc.candidates[key];
      if (!c) throw new Error("candidate not found: " + key);
      c.stage = stage;
      touch(key, "stage", stage + (note ? " | " + note : ""));
      persist();
    },
    setTriage(key, result, by) {
      const c = doc.candidates[key];
      if (!c) throw new Error("candidate not found: " + key);
      c.triage = { ...result, by, at: now().toISOString() };
      if (c.stage === "inbox") c.stage = "triaged";
      touch(key, "triage", result.validity + "/" + result.urgency + "/" + result.action);
      persist();
    },
    setGate(key, gate, decision, note = "", taskPackage = null) {
      const c = doc.candidates[key];
      if (!c) throw new Error("candidate not found: " + key);
      c.gates[gate] = { decision, note, at: now().toISOString(), passedBy: "human" };
      if (decision === "pass" && gate === "G1") c.taskPackage = taskPackage;
      touch(key, "gate." + gate, decision);
      persist();
    },
    getSettings: () => doc.settings,
    setSettings(patch) {
      doc.settings = { ...doc.settings, ...patch };
      persist();
    },
    getSnapshots: () => doc.snapshots,
    setSnapshots(perRepo) {
      doc.snapshots = { lastIngestAt: now().toISOString(), perRepo };
      persist();
    },
  };
}
```

- Change: 新增 store 与测试。

- [ ] Step 4: 运行并确认通过
- Run: `npm test`
- Expected: store 用例全绿，其余不回归。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(store): 文件驱动存储 + 首跑默认 12 仓"`

---

### Task 3: github.mjs provider

- 目标：REST 摄取与 token 三级解析，依赖全注入可测。
- 涉及文件：Create src/github.mjs、test/github.test.mjs
- 接口契约
  - Consumes: design §3（端点、白名单、token 顺序）
  - Produces: `resolveToken({credentials, execFile})`；`listOpenIssues({repo, token, fetch})`；`listOpenPulls({repo, token, fetch})`；`discoverRepos({token, fetch})`——候选字段与 design §2 一致
- 验证范围：github 用例全绿（分页拼接；issues 剔除 PR 行；token 顺序 credentials→gh→null；无 token 无 Authorization 头；非 2xx 抛带仓名错误）。

- [ ] Step 1: 写失败测试

test/github.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import * as github from "../src/github.mjs";

const page = (rows) => ({ ok: true, json: async () => rows });
const fetchPages = (...pages) => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return pages.shift() ?? page([]); };
  return { f, calls };
};

test("issues 分页拼接且剔除 pull_request 行", async () => {
  const { f, calls } = fetchPages(
    page([{ number: 1, title: "i", user: { login: "u" }, labels: [], created_at: "T", updated_at: "T", html_url: "U", comments: 2, reactions: { total_count: 3 }, body: "b", pull_request: {} }, { number: 2, title: "j", user: { login: "u" }, labels: [], created_at: "T", updated_at: "T", html_url: "U", comments: 0, reactions: {}, body: null }]),
    page([]),
  );
  const rows = await github.listOpenIssues({ repo: "o/r", token: "tk", fetch: f });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].number, 2);
  assert.equal(rows[0].type, "issue");
  assert.ok(calls[0].init.headers.authorization === "Bearer tk");
});

test("pulls 映射 draft 与 diff 规模", async () => {
  const { f } = fetchPages(
    page([{ number: 7, title: "p", user: { login: "u" }, labels: [], created_at: "T", updated_at: "T", html_url: "U", comments: 1, draft: true, additions: 10, deletions: 2, head: { ref: "b" }, body: null }]),
    page([]),
  );
  const rows = await github.listOpenPulls({ repo: "o/r", token: null, fetch: f });
  assert.equal(rows[0].pull.draft, true);
});

test("token 三级解析：credentials 优先，gh 次之，兜底 null", async () => {
  assert.equal(await github.resolveToken({ credentials: { readRecord: async () => ({ token: "ck" }) }, execFile: async () => ({ stdout: "gk\n" }) }), "ck");
  assert.equal(await github.resolveToken({ credentials: { readRecord: async () => null }, execFile: async () => ({ stdout: " gk " }) }), "gk");
  assert.equal(await github.resolveToken({ credentials: { readRecord: async () => null }, execFile: async () => { throw new Error("no gh"); } }), null);
});
```

- Run: `npm test`
- Expected: ERR_MODULE_NOT_FOUND（../src/github.mjs）。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: github 用例红，模块不存在。

- [ ] Step 3: 写最小实现

src/github.mjs：
```js
const API_BASE = "https://api.github.com";

const headers = (token) => ({
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  ...(token ? { authorization: "Bearer " + token } : {}),
});

async function pagedGet(path, { token, fetch: f = globalThis.fetch }) {
  const rows = [];
  for (let page = 1; page <= 10; page++) {
    const url = API_BASE + path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + page;
    const res = await f(url, { headers: headers(token) });
    if (!res.ok) throw new Error("github api " + res.status + " for " + path);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
  return rows;
}

const excerpt = (body, n = 600) => String(body ?? "").slice(0, n);
const labelsOf = (r) => (r.labels ?? []).map((l) => l.name ?? l);

export async function listOpenIssues({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/issues?state=open", { token, fetch });
  return rows
    .filter((r) => !r.pull_request)
    .map((r) => ({
      repo, type: "issue", number: r.number, title: r.title,
      author: r.user?.login ?? "", labels: labelsOf(r),
      createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url,
      meta: { comments: r.comments ?? 0, reactionsTotal: r.reactions?.total_count ?? 0 },
      pull: null, bodyExcerpt: excerpt(r.body),
    }));
}

export async function listOpenPulls({ repo, token, fetch }) {
  const rows = await pagedGet("/repos/" + repo + "/pulls?state=open", { token, fetch });
  return rows.map((r) => ({
    repo, type: "pull", number: r.number, title: r.title,
    author: r.user?.login ?? "", labels: labelsOf(r),
    createdAt: r.created_at, updatedAt: r.updated_at, url: r.html_url,
    meta: { comments: r.comments ?? 0, reactionsTotal: 0 },
    pull: {
      draft: !!r.draft, additions: r.additions ?? null, deletions: r.deletions ?? null,
      headRef: r.head?.ref ?? "",
    },
    bodyExcerpt: excerpt(r.body),
  }));
}

export async function discoverRepos({ token, fetch }) {
  const rows = await pagedGet("/user/repos?affiliation=owner&sort=pushed", { token, fetch });
  return rows.map((r) => ({ full_name: r.full_name, pushed_at: r.pushed_at, visibility: r.visibility }));
}

export async function resolveToken({ credentials, execFile }) {
  try {
    const record = await credentials?.readRecord?.("dsh-l.github-token");
    const value = typeof record === "string" ? record : record?.token;
    if (typeof value === "string" && value.length > 0) return value;
  } catch {}
  try {
    return String((await execFile("gh", ["auth", "token"])).stdout).trim();
  } catch {
    return null;
  }
}
```

- Change: 新增 provider 与测试。

- [ ] Step 4: 运行并确认通过
- Run: `npm test`
- Expected: github 用例全绿。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(provider): GitHub REST 摄取 + token 三级解析"`

---

### Task 4: handlers.mjs 处理器 + host 完整接线

- 目标：design §4 全端点处理器（纯函数）落地；host.mjs 扩为完整装配（inject 六服务 + 路由 + world）。
- 涉及文件：Create src/handlers.mjs、test/handlers.test.mjs；Modify src/host.mjs
- 接口契约
  - Consumes: Task 2 store 全 API、Task 3 provider 四函数、design §4 路由表（stage/gate 走 /dsh-l/candidate/stage、/dsh-l/candidate/gate，key 在请求体）
  - Produces: `makeHandlers({store, provider, triage, fetch, credentials, execFile, now})` 返回 `{getState, postRefresh, getWatch, putWatch, getDiscover, postTriage, postStage, postGate}`；`buildTaskPackage(candidate, now)`；host 侧 world 对象 `{createAgent, onSessionEvent, userMessage}`（Task 5 的 runTriage 消费）
- 验证范围：handlers 用例全绿（refresh 单仓失败容错记 perRepo.error 且不中断；putWatch 校验 owner/repo 形状；postTriage 上限 10 与写回 setTriage；postStage/postGate 校验并写 history；build 后 health 仍 200——包形状测试覆盖）。

- [ ] Step 1: 写失败测试

test/handlers.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../src/store.mjs";
import { makeHandlers, buildTaskPackage } from "../src/handlers.mjs";

const openStore = () => createStore({ filePath: join(mkdtempSync(join(tmpdir(), "dsh-l-h")), "s.json") });
const okFetch = async () => ({ ok: true, json: async () => [] });
const failFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
const noTriage = { runTriage: async () => ({ updated: [], failed: "not-configured" }) };

test("postRefresh 单仓失败容错且记 perRepo.error", async () => {
  const store = openStore();
  store.setWatch(["o/good", "o/bad"]);
  const h = makeHandlers({ store, provider: PROVIDER({ good: okFetch, bad: failFetch }), triage: noTriage });
  const r = await h.postRefresh();
  assert.equal(r.perRepo["o/bad"].error, "github api 500 for /repos/o/bad/issues?state=open");
  assert.equal(r.perRepo["o/good"].error, null);
});

test("putWatch 校验仓名形状", async () => {
  const h = makeHandlers({ store: openStore(), provider: PROVIDER({}), triage: noTriage });
  assert.equal((await h.putWatch({ repos: ["o/r"] })).repos[0], "o/r");
  assert.deepEqual(await h.putWatch({ repos: ["bad name"] }), { error: "invalid repos" });
});

test("postTriage 上限 10 并把结果写回 store", async () => {
  const store = openStore();
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 1, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  const triage = { runTriage: async () => ({ updated: [{ key: "o/r#issue#1", validity: "low", urgency: "P3", action: "close", reason: "spam" }], failed: null }) };
  const h = makeHandlers({ store, provider: PROVIDER({}), triage });
  const r = await h.postTriage({ keys: ["o/r#issue#1"], lang: "zh-CN" });
  assert.deepEqual(r.updated, ["o/r#issue#1"]);
  assert.equal(store.getCandidate("o/r#issue#1").triage.validity, "low");
  assert.equal(await (async () => { try { return await h.postTriage({ keys: Array.from({ length: 11 }, (_, i) => "k" + i) }); } catch { return { error: "throw" }; } })().then((x) => x.error !== undefined), true);
});

test("postGate G1 pass 生成任务包", async () => {
  const store = openStore();
  store.upsertCandidates([{ repo: "o/r", type: "issue", number: 2, title: "t", author: "a", labels: [], createdAt: "2026-11-01T00:00:00Z", updatedAt: "T", url: "U", meta: {}, pull: null, bodyExcerpt: "" }]);
  const h = makeHandlers({ store, provider: PROVIDER({}), triage: noTriage });
  const r = await h.postGate("o/r#issue#2", { gate: "G1", decision: "pass", note: "" });
  assert.equal(r.taskPackage.kind, "dsh-l.task-package");
  assert.equal(r.taskPackage.emit.type, "build.requested");
});

const PROVIDER = (fns) => ({
  resolveToken: async () => null,
  listOpenIssues: ({ repo, fetch }) => (fns.good && repo === "o/good" ? (0, fns.good)().then ? fetch : fetch, undefined) ?? [],
});
```
注意：上面 PROVIDER 桩的最后一行不能这么写——直接用显式实现替换（测试文件里按下面形状写）：
```js
const PROVIDER = (mode) => ({
  resolveToken: async () => null,
  listOpenIssues: async ({ repo }) => {
    if (mode.bad && repo === "o/bad") throw new Error("github api 500 for /repos/o/bad/issues?state=open");
    return [];
  },
  listOpenPulls: async () => [],
  discoverRepos: async () => [],
});
const PROVIDER_FETCH = (good, bad) => ({
  resolveToken: async () => "tk",
  listOpenIssues: ({ repo, fetch }) => simpleIssues(repo, fetch, good, bad),
  listOpenPulls: async () => [],
  discoverRepos: async () => [],
});
```
为避免双桩混乱，最终测试文件只保留 PROVIDER(mode) 形态（bad 分支直接 throw 与真实错误串一致），删除 PROVIDER_FETCH 与 okFetch/failFetch。

- Run: `npm test`
- Expected: ERR_MODULE_NOT_FOUND（../src/handlers.mjs）。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: handlers 用例红，模块不存在。

- [ ] Step 3: 写最小实现

src/handlers.mjs：
```js
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const STAGES = new Set(["inbox", "triaged", "gating", "closed", "held"]);
const GATES = new Set(["G1", "G2", "G3"]);
const URGENCY = new Set(["P0", "P1", "P2", "P3"]);
const VALIDITY = new Set(["high", "medium", "low"]);
const ACTION = new Set(["start", "feedback", "close", "hold"]);

export function buildTaskPackage(candidate, now = () => new Date()) {
  return {
    version: 1,
    kind: "dsh-l.task-package",
    candidate: { key: candidate.key, repo: candidate.repo, type: candidate.type, number: candidate.number, title: candidate.title, url: candidate.url },
    triage: candidate.triage
      ? { validity: candidate.triage.validity, urgency: candidate.triage.urgency, action: candidate.triage.action, reason: candidate.triage.reason }
      : null,
    gate: { gate: "G1", passedBy: "human", at: now().toISOString() },
    instructions: { goal: candidate.title, constraints: [], definitionOfDone: [] },
    repo: { defaultBranch: "main", cloneUrl: "git@github.com:" + candidate.repo + ".git", localPath: null },
    emit: { source: "dsh-l", type: "build.requested", at: now().toISOString() },
  };
}

export function makeHandlers({ store, provider, triage, fetch = globalThis.fetch, credentials, execFile, now = () => new Date() }) {
  return {
    async getState() {
      return {
        watch: store.getWatch(),
        snapshots: store.getSnapshots(),
        settings: store.getSettings(),
        candidates: store.listCandidates(),
      };
    },
    async postRefresh() {
      const token = await provider.resolveToken({ credentials, execFile });
      const perRepo = {};
      const merged = [];
      for (const repo of store.getWatch().repos) {
        try {
          const [issues, pulls] = await Promise.all([
            provider.listOpenIssues({ repo, token, fetch }),
            provider.listOpenPulls({ repo, token, fetch }),
          ]);
          merged.push(...issues, ...pulls);
          perRepo[repo] = { issues: issues.length, pulls: pulls.length, fetchedAt: now().toISOString(), error: null };
        } catch (err) {
          perRepo[repo] = { issues: 0, pulls: 0, fetchedAt: now().toISOString(), error: String(err?.message ?? err) };
        }
      }
      store.upsertCandidates(merged);
      store.setSnapshots(perRepo);
      return { perRepo, total: merged.length };
    },
    async getWatch() {
      return store.getWatch();
    },
    async putWatch(body) {
      const repos = body?.repos;
      if (!Array.isArray(repos) || repos.some((r) => typeof r !== "string" || !REPO_RE.test(r))) {
        return { error: "invalid repos" };
      }
      store.setWatch(repos);
      return store.getWatch();
    },
    async getDiscover() {
      const token = await provider.resolveToken({ credentials, execFile });
      return { repos: await provider.discoverRepos({ token, fetch }) };
    },
    async postTriage(body) {
      const keys = body?.keys;
      if (!Array.isArray(keys) || keys.length === 0 || keys.length > 10) return { error: "keys must be 1..10" };
      const lang = body?.lang === "en" ? "en" : "zh-CN";
      const candidates = keys.map((k) => store.getCandidate(k)).filter(Boolean);
      if (candidates.length === 0) return { error: "no candidates" };
      const result = await triage.runTriage({ candidates, lang, model: store.getSettings().triageModel });
      if (result.failed) return { error: result.failed };
      for (const row of result.updated) {
        if (!store.getCandidate(row.key)) continue;
        if (!VALIDITY.has(row.validity) || !URGENCY.has(row.urgency) || !ACTION.has(row.action)) continue;
        store.setTriage(row.key, { validity: row.validity, urgency: row.urgency, action: row.action, reason: String(row.reason ?? "").slice(0, 160), lang }, "llm");
      }
      return { updated: result.updated.map((r) => r.key) };
    },
    async postStage(body) {
      const { key, stage, note } = body ?? {};
      if (!STAGES.has(stage)) return { error: "invalid stage" };
      if (!store.getCandidate(key)) return { error: "not found" };
      store.setStage(key, stage, note ?? "");
      return { ok: true };
    },
    async postGate(body) {
      const { key, gate, decision, note } = body ?? {};
      if (!GATES.has(gate) || !["pass", "reject"].includes(decision)) return { error: "invalid gate" };
      const c = store.getCandidate(key);
      if (!c) return { error: "not found" };
      const pkg = gate === "G1" && decision === "pass" ? buildTaskPackage(c, now) : null;
      store.setGate(key, gate, decision, note ?? "", pkg);
      return { ok: true, taskPackage: pkg };
    },
  };
}
```

src/host.mjs（完整版替换 Task 1 最小版；triage 先接占位实现在 Task 5 替换为 runTriage）：
```js
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { createStore, storePath } from "./store.mjs";
import * as github from "./github.mjs";
import { makeHandlers } from "./handlers.mjs";

const execFile = promisify(execFileCb);

export const name = "dsh-l";
export const inject = ["webServer", "credentials", "timer", "agents", "sessionPersistence", "agentDefaultModel"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function apply(ctx) {
  ctx.effect(() => {
    const store = createStore({ filePath: storePath() });
    const triage = {
      runTriage: async () => ({ updated: [], failed: "triage-not-wired" }), // Task 5 替换
    };
    const handlers = makeHandlers({
      store, provider: github, triage,
      credentials: ctx.credentials, execFile, fetch: globalThis.fetch,
    });
    const disposers = [];
    const route = (path, methods, fn) =>
      disposers.push(ctx.webServer.register({
        kind: "exact", path,
        handler: async (request) => {
          if (!methods.includes(request.method)) return json({ error: "method not allowed" }, 405);
          try {
            const body = request.method === "GET" || request.method === "HEAD" ? null : await request.json().catch(() => null);
            const out = await fn(body);
            return out?.error ? json(out, 400) : json(out);
          } catch (err) {
            return json({ error: String(err?.message ?? err) }, 500);
          }
        },
      }) ?? (() => {}));
    route("/dsh-l/health", ["GET"], async () => ({ ok: true, name }));
    route("/dsh-l/state", ["GET"], handlers.getState);
    route("/dsh-l/refresh", ["POST"], handlers.postRefresh);
    route("/dsh-l/watch", ["GET", "PUT"], async (body, request) =>
      request.method === "GET" ? handlers.getWatch() : handlers.putWatch(body));
    route("/dsh-l/discover", ["GET"], handlers.getDiscover);
    route("/dsh-l/triage", ["POST"], handlers.postTriage);
    route("/dsh-l/candidate/stage", ["POST"], handlers.postStage);
    route("/dsh-l/candidate/gate", ["POST"], handlers.postGate);
    return () => { for (const d of disposers) d?.(); };
  });
}
```
说明：route 的 fn 第二参 request——watch 路由需要按方法分派，故 fn 签名为 (body, request)；其余路由忽略第二参。

- Change: 新增 handlers 与测试；host.mjs 换完整版（route 签名统一 (body, request)）。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: handlers 用例全绿；package-shape 仍绿（health 字面量在 bundle 中）。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(routes): 处理器纯函数化 + host 完整接线"`

---

### Task 5: triage.mjs 分诊（world 窄接口）

- 目标：解析器与 prompt 稳定；runTriage 经注入 world 可测；host 换真实现。
- 涉及文件：Create src/triage.mjs、test/triage.test.mjs；Modify src/host.mjs（triage 占位换成 runTriage + world）
- 接口契约
  - Consumes: design §5；world 形态 `{ createAgent(options?): Promise<{agent:{id, send(message, target?)}, cancel?, dispose()}>, onSessionEvent(h): () => void, userMessage(text) }`（autoloop bridge BridgeWorld 判例）
  - Produces: `parseTriageOutput(text)`；`buildPrompt(candidates, lang)`；`runTriage(world, { candidates, lang, model, timeoutMs })` 返回 `{ updated: [{key, validity, urgency, action, reason}], failed }`；handlers.postTriage 改调 `triage.runTriage`（此时 world 由 host 传入 makeHandlers 的 triage 对象）
- 验证范围：triage 用例全绿（围栏数组解析、尾随杂文、非法输出 null、batch>10 抛错、turn/end 非 completed → failed、assistant 文本取末条）。

- [ ] Step 1: 写失败测试

test/triage.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseTriageOutput, buildPrompt, runTriage } from "../src/triage.mjs";

const GOOD = "```json\n[{\"key\":\"o/r#issue#1\",\"validity\":\"high\",\"urgency\":\"P1\",\"action\":\"start\",\"reason\":\"r\"}]\n```";

test("parse: 围栏数组 + 尾随杂文", () => {
  assert.equal(parseTriageOutput("前言\n" + GOOD + "\n后记").length, 1);
});
test("parse: 非法或缺失 → null", () => {
  assert.equal(parseTriageOutput("没有围栏"), null);
  assert.equal(parseTriageOutput("```json\n[{\"key\":\"k\",\"validity\":\"x\"}]\n```"), null);
});
test("buildPrompt 含 key 且 zh/en 双语", () => {
  const c = { key: "o/r#issue#1", type: "issue", repo: "o/r", number: 1, title: "t", labels: [], meta: {}, pull: null, bodyExcerpt: "b" };
  assert.ok(buildPrompt([c], "zh-CN").includes("分诊"));
  assert.ok(buildPrompt([c], "en").includes("triage"));
});
test("runTriage: completed → 解析写回；aborted → failed", async () => {
  const c = { key: "o/r#issue#1", type: "issue", repo: "o/r", number: 1, title: "t", labels: [], meta: {}, pull: null, bodyExcerpt: "" };
  const world = (reason, text) => ({
    createAgent: async () => ({ agent: { id: "s1", send: async () => {} } , dispose: async () => {} }),
    onSessionEvent: (h) => {
      h("s1", { type: "assistant/message", data: { message: { content: [{ type: "text", text }] } } });
      h("s1", { type: "turn/end", data: { reason: { kind: reason } } });
      return () => {};
    },
    userMessage: (t) => ({ role: "user", content: [{ type: "text", text: t }] }),
  });
  const ok = await runTriage(world("completed", GOOD), { candidates: [c], lang: "zh-CN" });
  assert.equal(ok.failed, null);
  assert.equal(ok.updated[0].key, "o/r#issue#1");
  const bad = await runTriage(world("aborted", ""), { candidates: [c], lang: "zh-CN" });
  assert.equal(bad.failed, "turn-end:aborted");
});
```

- Run: `npm test`
- Expected: ERR_MODULE_NOT_FOUND（../src/triage.mjs）。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: triage 用例红。

- [ ] Step 3: 写最小实现

src/triage.mjs：
```js
const LIMIT = 10;
const RULES = {
  "zh-CN": "你是开源仓库的分诊助手。对下面每条 open issue / open PR 摘要判断：validity（issue 看可复现、非重复、非灌水、非误报；PR 看能构建、非恶意、符合贡献规范）取 high/medium/low；urgency 取 P0/P1/P2/P3；action 取 start/feedback/close/hold；reason 一句中文理由不超过 80 字。只输出一个 json 围栏数组，元素形如 {\"key\":...,\"validity\":...,\"urgency\":...,\"action\":...,\"reason\":...}，不要输出其它内容。候选列表：",
  en: "You are a triage assistant for open-source repositories. For each open issue / open PR digest below judge: validity (issues: reproducible, not duplicate, not spam, not false report; PRs: buildable, not malicious, follows contribution norms) as high/medium/low; urgency as P0/P1/P2/P3; action as start/feedback/close/hold; reason as one English sentence of at most 60 words. Output exactly one json fenced array with objects {\"key\":...,\"validity\":...,\"urgency\":...,\"action\":...,\"reason\":...} and nothing else. Candidates:",
};

export function buildPrompt(candidates, lang) {
  const head = RULES[lang] ?? RULES["zh-CN"];
  const digest = candidates.map((c) => ({
    key: c.key, type: c.type, repo: c.repo, number: c.number, title: c.title,
    labels: c.labels, ageDays: c.meta?.ageDays ?? null, comments: c.meta?.comments ?? 0,
    reactions: c.meta?.reactionsTotal ?? 0, pull: c.pull ?? null, bodyExcerpt: c.bodyExcerpt ?? "",
  }));
  return head + "\n" + JSON.stringify(digest, null, 1);
}

export function parseTriageOutput(text) {
  const fences = [...String(text ?? "").matchAll(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/g)].map((m) => m[1]);
  if (fences.length === 0) return null;
  try {
    const arr = JSON.parse(fences[fences.length - 1]);
    if (!Array.isArray(arr)) return null;
    const ok = arr.every((x) => x && typeof x.key === "string"
      && ["high", "medium", "low"].includes(x.validity)
      && ["P0", "P1", "P2", "P3"].includes(x.urgency)
      && ["start", "feedback", "close", "hold"].includes(x.action)
      && typeof x.reason === "string");
    return ok ? arr : null;
  } catch {
    return null;
  }
}

const kindOf = (reason) =>
  typeof reason === "string" ? reason : String(reason?.kind ?? "unknown");
const textOf = (message) => {
  const blocks = message?.content;
  return Array.isArray(blocks)
    ? blocks.filter((b) => b?.type === "text").map((b) => b.text).join("")
    : typeof blocks === "string" ? blocks : "";
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runTriage(world, { candidates, lang = "zh-CN", model, timeoutMs = 300000 }) {
  if (candidates.length === 0) return { updated: [], failed: null };
  if (candidates.length > LIMIT) throw new Error("triage batch limit is " + LIMIT);
  const handle = await world.createAgent(model ? { model } : {});
  const sessionId = handle.agent.id;
  let lastText = "";
  let turnEnd = null;
  const off = world.onSessionEvent((sid, event) => {
    if (sid !== sessionId) return;
    if (event?.type === "assistant/message") lastText = textOf(event.data?.message ?? event.data);
    if (event?.type === "turn/end") turnEnd = kindOf(event.data?.reason ?? event.data?.turnEndReason);
  });
  const deadline = Date.now() + timeoutMs;
  try {
    await handle.agent.send(world.userMessage(buildPrompt(candidates, lang)), "next-turn");
    while (turnEnd === null && Date.now() < deadline) await sleep(500);
    if (turnEnd === null) {
      await handle.agent.cancel?.("triage-timeout");
      return { updated: [], failed: "timeout" };
    }
    if (turnEnd !== "completed") return { updated: [], failed: "turn-end:" + turnEnd };
    const parsed = parseTriageOutput(lastText);
    return parsed ? { updated: parsed, failed: null } : { updated: [], failed: "parse-failed" };
  } finally {
    off?.();
    await handle.dispose?.();
  }
}
```

src/host.mjs 的 triage 对象替换为：
```js
import { runTriage } from "./triage.mjs";
// ctx.effect 内：
const world = {
  createAgent: (options) => ctx.agents.create(options),
  onSessionEvent: (h) => ctx.on("session/event", (sessionId, event) => h(sessionId, event)),
  userMessage: (text) => ({ role: "user", content: [{ type: "text", text }], source: { kind: "user" } }),
};
const triage = {
  runTriage: (params) => runTriage(world, params),
};
```

- Change: 新增 triage 与测试；host 接真 runTriage。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: triage 用例全绿（runTriage 假 world 同步发事件，轮询立即退出）。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(triage): 批量分诊 + turn/end 完成证据"`

---

### Task 6: client 基础工作台（逻辑 + 列表 + 过滤 + 刷新）

- 目标：主栏页呈现分组候选列表、过滤条、刷新按钮；分组/过滤逻辑无头可测；样式只用宿主 alias 令牌与 color-mix。
- 涉及文件：Create src/client/logic.mjs、test/logic.test.mjs、src/client/api.mjs、src/client/components/workbench.mjs、src/client/components/candidateRow.mjs；Modify src/client/index.mjs、src/client/locale/zh-CN.mjs、src/client/locale/en.mjs
- 接口契约
  - Consumes: design §4 路由 JSON；locale 字典；craft-floor（动手前读）
  - Produces: `groupCandidates(list, t)` 返回 `[{id, label, dim, items}]`（inbox/triaged/gating/building/shipped/closed 六组）；`filterCandidates(list, {type, repo, urgency})`；api.mjs 导出 `{state, refresh, putWatch, discover, triage, stage, gate}`；workbench 挂载签名 `mountWorkbench(shadow, { lang })`；两字典新增键 groups.closed
- 验证范围：logic 用例全绿；locale parity 绿；build 绿。

- [ ] Step 1: 失败检查（含 craft-floor 前置）
- Run: `npm test`（logic.test.mjs 引 ../src/client/logic.mjs 不存在 → 红）
- Expected: ERR_MODULE_NOT_FOUND。同时本步读一遍 impeccable reference/craft-floor.md（UI 编辑前置，一次性）。

- [ ] Step 2: 运行并确认失败
- Run: `npm test`
- Expected: logic 用例红。

- [ ] Step 3: 写最小实现

src/client/logic.mjs：
```js
export function groupCandidates(list, t) {
  const defs = [
    { id: "inbox", label: t("groups.inbox"), dim: false },
    { id: "triaged", label: t("groups.triaged"), dim: false },
    { id: "gating", label: t("groups.gating"), dim: false },
    { id: "building", label: t("groups.building"), dim: true },
    { id: "shipped", label: t("groups.shipped"), dim: true },
    { id: "closed", label: t("groups.closed"), dim: true },
  ];
  const buckets = Object.fromEntries(defs.map((d) => [d.id, []]));
  for (const c of list ?? []) {
    if (c.stage === "inbox") buckets.inbox.push(c);
    else if (c.stage === "triaged") buckets.triaged.push(c);
    else if (c.stage === "gating") buckets.gating.push(c);
    else if (c.stage === "building" || c.stage === "verifying") buckets.building.push(c);
    else if (c.stage === "shipped") buckets.shipped.push(c);
    else buckets.closed.push(c);
  }
  for (const d of defs) d.items = buckets[d.id];
  return defs;
}

export function filterCandidates(list, { type = "all", repo = "all", urgency = "all" } = {}) {
  return (list ?? []).filter((c) =>
    (type === "all" || c.type === type) &&
    (repo === "all" || c.repo === repo) &&
    (urgency === "all" || (c.triage?.urgency ?? "") === urgency));
}
```

test/logic.test.mjs：
```js
import test from "node:test";
import assert from "node:assert/strict";
import { groupCandidates, filterCandidates } from "../src/client/logic.mjs";
import { zhCN } from "../src/client/locale/zh-CN.mjs";
const t = (k) => k;
const c = (stage, over = {}) => ({ stage, type: "issue", repo: "o/r", triage: null, ...over });

test("六组归位：building+verifying 并入 building；未知并入 closed", () => {
  const g = groupCandidates([c("inbox"), c("triaged"), c("gating"), c("building"), c("verifying"), c("shipped"), c("held"), c("weird")], t);
  assert.equal(g.find((x) => x.id === "inbox").items.length, 1);
  assert.equal(g.find((x) => x.id === "building").items.length, 2);
  assert.equal(g.find((x) => x.id === "closed").items.length, 2);
});
test("过滤组合：类型 × 仓 × 紧急度", () => {
  const list = [c("triaged", { type: "pull", repo: "o/a", triage: { urgency: "P0" } }), c("triaged", { repo: "o/b", triage: { urgency: "P1" } })];
  assert.equal(filterCandidates(list, { type: "pull" }).length, 1);
  assert.equal(filterCandidates(list, { repo: "o/b" }).length, 1);
  assert.equal(filterCandidates(list, { urgency: "P0" }).length, 1);
  assert.equal(filterCandidates(list).length, 2);
});
```

src/client/api.mjs：
```js
const get = (p) => fetch(p).then((r) => r.json());
const send = (p, body, method = "POST") =>
  fetch(p, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());
export const api = {
  state: () => get("/dsh-l/state"),
  refresh: () => send("/dsh-l/refresh", {}),
  putWatch: (repos) => send("/dsh-l/watch", { repos }, "PUT"),
  discover: () => get("/dsh-l/discover"),
  triage: (keys, lang) => send("/dsh-l/triage", { keys, lang }),
  stage: (key, stage, note) => send("/dsh-l/candidate/stage", { key, stage, note }),
  gate: (key, gate, decision, note) => send("/dsh-l/candidate/gate", { key, gate, decision, note }),
};
```

src/client/components/candidateRow.mjs（v1 行：徽标 + 标题 + chips；展开区 Task 7 填操作）：
```js
import { makeT } from "../i18n.mjs";

export function renderRow(container, candidate, t, { onOpen } = {}) {
  const row = document.createElement("div");
  row.className = "row";
  const badge = document.createElement("span");
  badge.className = "badge " + candidate.type;
  badge.textContent = candidate.type === "pull" ? "PR" : "ISSUE";
  const main = document.createElement("button");
  main.className = "title";
  main.textContent = candidate.repo + "#" + candidate.number + " " + candidate.title;
  main.onclick = () => onOpen?.(candidate);
  row.append(badge, main);
  if (candidate.triage) {
    const u = document.createElement("span");
    u.className = "chip u-" + candidate.triage.urgency;
    u.textContent = t("urgency." + candidate.triage.urgency);
    const v = document.createElement("span");
    v.className = "chip v-" + candidate.triage.validity;
    v.textContent = t("validity." + candidate.triage.validity);
    const a = document.createElement("span");
    a.className = "chip";
    a.textContent = t("recommendedActions." + candidate.triage.action);
    row.append(u, v, a);
  }
  container.append(row);
  return row;
}
```

src/client/components/workbench.mjs：
```js
import { makeT } from "../i18n.mjs";
import { groupCandidates, filterCandidates } from "../logic.mjs";
import { api } from "../api.mjs";
import { renderRow } from "./candidateRow.mjs";

const CSS = `
:host{display:flex;flex-direction:column;height:100%;font-size:14px}
header{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent)}
header h2{font-size:16px;margin:0;font-weight:600}
button,select{font:inherit;color:inherit;background:transparent;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:6px;padding:4px 10px;cursor:pointer}
button:hover{background:color-mix(in srgb,currentColor 8%,transparent)}
.meta{color:color-mix(in srgb,currentColor 55%,transparent);font-size:12px;margin-left:auto}
.bar{display:flex;gap:8px;padding:8px 16px;flex-wrap:wrap}
main{flex:1;overflow:auto;padding:0 16px 16px}
.group>h3{font-size:13px;margin:14px 0 6px;color:color-mix(in srgb,currentColor 60%,transparent)}
.group.dim>h3{opacity:.5}
.row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent)}
.row .title{flex:1;text-align:left;border:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 0}
.badge{font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;border:1px solid color-mix(in srgb,currentColor 30%,transparent)}
.badge.pull{color:var(--dsh-color-accent,var(--dsh-accent,inherit))}
.chip{font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 20%,transparent)}
.chip.u-P0{border-color:var(--dsh-color-danger,var(--dsh-danger,currentColor))}
.empty{padding:24px 0;color:color-mix(in srgb,currentColor 50%,transparent)}
`;

export function mountWorkbench(shadow, { lang }) {
  const t = makeT(lang);
  let state = null;
  let filters = { type: "all", repo: "all", urgency: "all" };
  shadow.innerHTML = "";
  const style = document.createElement("style");
  style.textContent = CSS;
  shadow.append(style);
  const header = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = t("panelLabel");
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = t("refresh");
  const meta = document.createElement("span");
  meta.className = "meta";
  header.append(title, refreshBtn, meta);
  const bar = document.createElement("div");
  bar.className = "bar";
  const mkSelect = (options, value, onChange) => {
    const s = document.createElement("select");
    for (const [v, label] of options) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = label;
      s.append(o);
    }
    s.value = value;
    s.onchange = () => onChange(s.value);
    return s;
  };
  const typeSel = mkSelect([["all", t("filters.all")], ["issue", t("filters.issues")], ["pull", t("filters.pullRequests")]], filters.type, (v) => { filters.type = v; render(); });
  const repoSel = mkSelect([["all", t("filters.repo")]], filters.repo, (v) => { filters.repo = v; render(); });
  const urgSel = mkSelect([["all", t("filters.urgency")], ["P0", t("urgency.P0")], ["P1", t("urgency.P1")], ["P2", t("urgency.P2")], ["P3", t("urgency.P3")]], filters.urgency, (v) => { filters.urgency = v; render(); });
  bar.append(typeSel, repoSel, urgSel);
  const main = document.createElement("main");
  shadow.append(header, bar, main);
  const render = () => {
    main.innerHTML = "";
    const repos = ["all", ...new Set((state?.candidates ?? []).map((c) => c.repo))];
    repoSel.innerHTML = "";
    for (const r of repos) {
      const o = document.createElement("option");
      o.value = r;
      o.textContent = r === "all" ? t("filters.repo") : r;
      repoSel.append(o);
    }
    repoSel.value = filters.repo;
    const list = filterCandidates(state?.candidates ?? [], filters);
    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = t("emptyStates.backlog");
      main.append(empty);
      return;
    }
    for (const group of groupCandidates(list, t)) {
      if (group.items.length === 0) continue;
      const sec = document.createElement("section");
      sec.className = "group" + (group.dim ? " dim" : "");
      const h = document.createElement("h3");
      h.textContent = group.label + " (" + group.items.length + ")";
      sec.append(h);
      for (const c of group.items) renderRow(sec, c, t);
      main.append(sec);
    }
  };
  const load = async () => {
    state = await api.state();
    meta.textContent = t("meta.lastRefreshAt") + ": " + (state?.snapshots?.lastIngestAt ?? "-");
    render();
  };
  refreshBtn.onclick = async () => {
    refreshBtn.textContent = t("refreshing");
    refreshBtn.disabled = true;
    try { await api.refresh(); await load(); } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = t("refresh");
    }
  };
  load();
  return { reload: load };
}
```

src/client/index.mjs：WorkbenchStub 替换为挂真组件（保留 PanelIcon 与 slots 注册不动）：
```js
import { mountWorkbench } from "./components/workbench.mjs";
// main slot 组件改为：
function Workbench() {
  const host = document.createElement("div");
  mountWorkbench(host.attachShadow({ mode: "open" }), { lang: resolveLang(null) });
  return host;
}
```

两字典同步加键：zh-CN `closed: "已关闭/挂起"`、en `closed: "Closed and held"`（挂 groups 下）。

- Change: logic/api/row/workbench 落地；index 换挂真组件；字典加 groups.closed。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: logic + parity 全绿；build 产出含 mountWorkbench。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(ui): 工作台分组列表 + 过滤 + 刷新"`

---

### Task 7: repo 选择器 + 批量分诊 + 行操作 + 管线条

- 目标：监看仓库选择器（发现 + 手填 + 勾选持久化）、批量分诊按钮、行展开操作（改阶段 / G1 放行 → 复制任务包 JSON）、七段管线计数条（后三段灰显）。
- 涉及文件：Create src/client/components/repoPicker.mjs、src/client/components/pipelineStrip.mjs；Modify src/client/components/workbench.mjs、src/client/components/candidateRow.mjs、src/client/locale/zh-CN.mjs、src/client/locale/en.mjs
- 接口契约
  - Consumes: Task 6 的 api 对象与 mountWorkbench 结构；路由 /dsh-l/discover、/dsh-l/watch(PUT)、/dsh-l/triage、/dsh-l/candidate/stage、/dsh-l/candidate/gate
  - Produces: `openRepoPicker({ lang, current, onSaved })`（对话框，保存走 api.putWatch）；`renderStrip(container, { lang, candidates })`；行操作回调注入 renderRow 的 onOpen 展开区；字典新增 actions.* 键（triageBatch / copyPackage / copied）
- 验证范围：build 绿；Task 9 冒烟走通「刷新→过滤→分诊→G1→复制任务包」。

- [ ] Step 1: 失败检查
- Run: `npm run build`（两新组件不存在但 build 仍绿——功能缺失）＋清点 workbench 无 picker/strip/triage 入口（grep 计数 openRepoPicker=0、renderStrip=0）
- Expected: grep -q 不命中即当前缺失成立。

- [ ] Step 2: 运行并确认失败（功能缺失态记录）。

- [ ] Step 3: 写最小实现

src/client/components/pipelineStrip.mjs：
```js
import { makeT } from "../i18n.mjs";

export function renderStrip(container, { lang, candidates }) {
  const t = makeT(lang);
  const stages = [
    ["ingest", false], ["backlog", false], ["triage", false], ["feedback", false],
    ["build", true], ["verify", true], ["ship", true],
  ];
  const counts = {
    ingest: candidates.length,
    backlog: candidates.filter((c) => c.stage === "inbox").length,
    triage: candidates.filter((c) => c.triage).length,
    feedback: candidates.filter((c) => c.stage === "gating").length,
    build: candidates.filter((c) => ["building", "verifying"].includes(c.stage)).length,
    verify: candidates.filter((c) => c.stage === "verifying").length,
    ship: candidates.filter((c) => c.stage === "shipped").length,
  };
  container.innerHTML = "";
  const strip = document.createElement("div");
  strip.style.cssText = "display:flex;gap:4px;padding:8px 16px;flex-wrap:wrap";
  for (const [key, dim] of stages) {
    const cell = document.createElement("span");
    cell.className = "pipe" + (dim ? " dim" : "");
    cell.style.cssText = "font-size:12px;padding:2px 8px;border-radius:999px;border:1px solid color-mix(in srgb,currentColor 20%,transparent)" + (dim ? ";opacity:.45" : "");
    cell.textContent = t("stages." + key) + " " + counts[key];
    strip.append(cell);
  }
  container.append(strip);
}
```

src/client/components/repoPicker.mjs：
```js
import { makeT } from "../i18n.mjs";
import { api } from "../api.mjs";

export function openRepoPicker({ lang, current, onSaved }) {
  const t = makeT(lang);
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:70";
  const dialog = document.createElement("div");
  dialog.style.cssText = "min-width:360px;max-height:70vh;overflow:auto;padding:16px;border-radius:10px;background:var(--dsh-color-surface,#fff);color:inherit";
  const title = document.createElement("h3");
  title.textContent = t("repoPicker.title");
  const list = document.createElement("div");
  const input = document.createElement("input");
  input.placeholder = t("repoPicker.addManually");
  input.style.cssText = "font:inherit;padding:4px 8px;margin:8px 0;border-radius:6px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);background:transparent;color:inherit";
  const addBtn = document.createElement("button");
  addBtn.textContent = "+";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = t("repoPicker.save");
  const close = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  const selected = new Set(current);
  const renderList = (repos) => {
    list.innerHTML = "";
    for (const name of repos) {
      const label = document.createElement("label");
      label.style.cssText = "display:block;padding:2px 0";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(name);
      cb.onchange = () => { cb.checked ? selected.add(name) : selected.delete(name); };
      label.append(cb, document.createTextNode(" " + name));
      list.append(label);
    }
  };
  renderList([...selected]);
  api.discover().then((r) => renderList(r.repos.map((x) => x.full_name))).catch(() => {});
  addBtn.onclick = () => {
    const v = input.value.trim();
    if (/^[\w.-]+\/[\w.-]+$/.test(v)) { selected.add(v); renderList([...selected]); input.value = ""; }
  };
  saveBtn.onclick = async () => {
    await api.putWatch([...selected]);
    close();
    onSaved?.();
  };
  const row = document.createElement("div");
  row.append(input, addBtn, saveBtn);
  dialog.append(title, list, row);
  overlay.append(dialog);
  document.body.append(overlay);
}
```

workbench.mjs 增补（页头）：pickerBtn（t("watchedRepos")）→ openRepoPicker({lang, current: state.watch.repos, onSaved: load})；triageBtn（t("actions.triageBatch")）→ 取 filterCandidates(全部候选, {type:"all",repo:filters.repo,urgency:"all"}) 中 stage==="inbox" 的前 10 个 key 调 api.triage(keys, lang) 后 load()；header 与 bar 之间插 strip 容器并 renderStrip。
candidateRow.mjs 增补：onOpen 展开区渲染分诊理由（candidate.triage?.reason）、改阶段按钮组（triaged/gating/closed/held → api.stage 后 onRefresh 回调）、G1 放行按钮（t("gates.G1") + t("recommendedActions.start")）调 api.gate(key,"G1","pass") 后把返回的 taskPackage 写剪贴板（navigator.clipboard.writeText(JSON.stringify(pkg, null, 2))，按钮文案 t("actions.copyPackage")，成功后短暂变 t("actions.copied")）。
两字典同步加键 actions：zh-CN `{ triageBatch: "分诊待分诊", copyPackage: "复制任务包", copied: "已复制" }`、en `{ triageBatch: "Triage inbox", copyPackage: "Copy task package", copied: "Copied" }`。

- Change: 两新组件 + workbench/row 增补 + 字典键。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: build 绿、parity 绿。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(ui): repo 选择器 + 批量分诊 + 闸门操作 + 管线条"`

---

### Task 8: 定时轮询（默认关）+ 设置入口

- 目标：intervalMinutes>0 时自动 refresh；工作台设置弹层可改。
- 涉及文件：Create src/poll.mjs；Modify src/host.mjs、src/client/components/workbench.mjs、src/client/locale/zh-CN.mjs、src/client/locale/en.mjs
- 接口契约
  - Consumes: handlers.postRefresh、store.getSettings/setSettings、ctx.interval
  - Produces: `armInterval({ ctx, store, refresh })` 返回 dispose；设置弹层（分钟数字入，0=关）
- 验证范围：armInterval 单测（假 ctx.interval 计数：0 不注册；5 注册每 5 分钟；重 arm 释放旧句柄）；build 绿。

- [ ] Step 1: 失败检查
- Run: `npm test`（test 内补 poll 断言：armInterval 模块不存在 → 红）
- Expected: ERR_MODULE_NOT_FOUND。

- [ ] Step 2: 确认失败。

- [ ] Step 3: 写最小实现

src/poll.mjs：
```js
export function armInterval({ ctx, store, refresh }) {
  let off = null;
  const apply = () => {
    off?.();
    off = null;
    const minutes = Number(store.getSettings().intervalMinutes ?? 0);
    if (minutes > 0) {
      off = ctx.interval(minutes * 60_000, () => { refresh().catch(() => {}); });
    }
  };
  apply();
  return () => off?.();
}
```
host.mjs：ctx.effect 内补 `const disarm = armInterval({ ctx, store, refresh: handlers.postRefresh });`，清理链加入 disarm；设置变更即时生效的路径：postSettings 路由（route("/dsh-l/settings", ["GET","PUT"], …) 调 store.setSettings 后重新 armInterval——host 侧持 armInterval 返回的 re-arm 句柄：把 armInterval 改为返回 `{ dispose, rearm }`，rearm=apply）。
workbench.mjs：页头齿轮按钮开设置弹层（number input + 保存走 PUT /dsh-l/settings）；api.mjs 增 `settings: (patch) => send("/dsh-l/settings", patch, "PUT")`。
两字典加键 settings.title / settings.intervalMinutes / settings.save（zh：设置 / 自动刷新间隔（分钟，0=关）/ 保存；en: Settings / Auto-refresh interval (minutes, 0 = off) / Save）。

- Change: poll 模块 + host settings 路由与 rearm + UI 弹层 + 字典键。

- [ ] Step 4: 运行并确认通过
- Run: `npm run build && npm test`
- Expected: poll 用例绿；handlers 用例补 settings PUT 断言绿。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "feat(poll): 可选定时摄取（默认关）+ 设置入口"`

---

### Task 9: 隔离 profile 装机冒烟（049 runbook）

- 目标：真实宿主六步验证：装包≠挂载坑位全覆盖，health/state 200，默认 12 仓在线。
- 涉及文件：Create scripts/install-smoke.sh
- 接口契约
  - Consumes: 049 runbook 六步；宿主 bin.js 路径 /home/ubuntu/.local/share/dsh-runtime/node_modules/@deepseek-ai/dsh/lib/bin.js；pnpm 在 /home/ubuntu/.local/share/pnpm/
  - Produces: scripts/install-smoke.sh（可重复执行；trap 保证清理）
- 验证范围：`bash scripts/install-smoke.sh; echo $?` 输出 0 且打印 SMOKE PASS。

- [ ] Step 1: 失败检查
- Run: `bash scripts/install-smoke.sh`
- Expected: No such file or directory。

- [ ] Step 2: 确认失败。

- [ ] Step 3: 写最小实现

scripts/install-smoke.sh：
```bash
#!/usr/bin/env bash
# dsh-l 隔离装机冒烟——know-how 049 runbook 六步；全程不触在役宿主。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="dsh-l-smoke-$$"
PROFILE_DIR="$HOME/.dsh/profiles/$PROFILE"
PORT=3095
RUNTIME_BIN="/home/ubuntu/.local/share/dsh-runtime/node_modules/@deepseek-ai/dsh/lib/bin.js"
PNPM="$(command -v pnpm || echo /home/ubuntu/.local/share/pnpm/pnpm)"
LOG="$(mktemp /tmp/dsh-l-smoke-XXXXXX.log)"
COOKIES="$PROFILE_DIR/cookies.txt"

cleanup() {
  if [ -f "$PROFILE_DIR/smoke.pid" ]; then
    kill "$(cat "$PROFILE_DIR/smoke.pid")" 2>/dev/null || true
  fi
  rm -rf "$PROFILE_DIR" "$LOG"
}
trap cleanup EXIT

# 1. 官方模板建 profile（勿手拼）
dsh "$PROFILE" --from-default-profile web
test -f "$PROFILE_DIR/cordis.yml"

# 2. 本地文件夹装插件
(cd "$PROFILE_DIR" && "$PNPM" add "file://$ROOT" >/dev/null)
test -f "$PROFILE_DIR/node_modules/dsh-l/lib/host.js"
test -f "$PROFILE_DIR/node_modules/dsh-l/lib/client.js"

# 3. bundles 追加 dsh-l（装包 ≠ 挂载）
node -e "const fs=require(\"fs\");const p=process.argv[1]+\"/package.json\";const pkg=JSON.parse(fs.readFileSync(p,\"utf8\"));pkg.dsh.profile.bundles=[...new Set([...(pkg.dsh.profile.bundles??[]),\"dsh-l\"])];fs.writeFileSync(p,JSON.stringify(pkg,null,2));" "$PROFILE_DIR"

# 4. 隔离端口启动
node "$RUNTIME_BIN" "$PROFILE" --host 127.0.0.1 --port "$PORT" --no-open > "$LOG" 2>&1 &
echo $! > "$PROFILE_DIR/smoke.pid"
for _ in $(seq 1 60); do grep -q "token=" "$LOG" && break; sleep 1; done
grep -q "http://127.0.0.1:$PORT/?token=" "$LOG" || { echo "FAIL: host did not start"; tail -20 "$LOG"; exit 1; }

# 5. token 提取（正则含连字符）→ cookie 会话
TOKEN="$(grep -oE "token=[A-Za-z0-9_-]+" "$LOG" | head -1 | cut -d= -f2)"
BASE="http://127.0.0.1:$PORT"
curl -sc "$COOKIES" "$BASE/?token=$TOKEN" >/dev/null

# 6. 断言
HEALTH="$(curl -s -b "$COOKIES" -o /dev/null -w "%{http_code}" "$BASE/dsh-l/health?token=$TOKEN")"
[ "$HEALTH" = "200" ] || { echo "FAIL: /dsh-l/health -> $HEALTH"; exit 1; }
curl -s -b "$COOKIES" "$BASE/dsh-l/state?token=$TOKEN" | node -e "let s=\"\";process.stdin.on(\"data\",(d)=>s+=d).on(\"end\",()=>{const j=JSON.parse(s);if(!Array.isArray(j.watch?.repos)||j.watch.repos.length!==12){console.error(\"FAIL: default watch repos != 12\");process.exit(1);}console.log(\"OK: 12 default repos\");});"
echo "SMOKE PASS"
```
chmod +x scripts/install-smoke.sh。

- [ ] Step 4: 运行并确认通过
- Run: `bash scripts/install-smoke.sh; echo $?`
- Expected: 输出 OK: 12 default repos 与 SMOKE PASS；退出码 0。

- [ ] Step 5: 可选 checkpoint commit
- Run: `git add -A && git commit -m "chore(smoke): 049 runbook 隔离装机冒烟"`

---

## 执行纪律

- 开始实现前，先批判性复查整份计划；发现缺项、矛盾、命名不一致或验证命令无效，先修计划再动代码。
- 按任务顺序执行，不无声跳步、合并步或改变任务目标。
- 每完成一个任务，运行该任务定义的验证；没有验证的任务不算完成。
- 遇到阻塞、重复失败或计划与仓库现实不符（尤其宿主 API 形态与判例不符时），立即停下说明，不要猜。
- 当前分支是 main 且用户未明确同意直接在 main 开发时，开工前先向用户确认分支策略。
- 全部任务完成后，运行最终验证并输出修改摘要。

## 最终验证

- Run: `cd /home/ubuntu/workspace/dsh-l && npm run build && npm test && bash scripts/install-smoke.sh`
- Expected: 构建零错误；七个测试文件全绿；冒烟输出 SMOKE PASS、退出码 0。
- 人工检查项（Task 9 后一次性）：在隔离宿主浏览器打开面板，确认侧栏官方条目下方出现 L♾️p 图标，主栏页可刷新/过滤/分诊/G1 放行/复制任务包。

## 审阅 Checkpoint

- 计划正文到此。请先确认这份计划；如果没问题，下一步可以按计划由普通编码 agent 或人工继续执行。
