// 用法：node scripts/ui-probe.cjs <url> <evidenceDir> <buildId>
// 启动配方照抄 01_docs/research/2026-10-15-dshm-resize-cdp-assets/sweep.cjs:11,67（chromium-1234 + no-sandbox）。
const { chromium } = require("/home/ubuntu/workspace/dsh-m/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

(async () => {
  const [url, evid, build] = process.argv.slice(2);
  const log = (line) => fs.appendFileSync(path.join(evid, "probe.log"), new Date().toISOString() + " " + line + "\n");
  const browser = await chromium.launch({
    executablePath: "/home/ubuntu/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    page.on("console", (m) => log("console." + m.type() + " " + m.text()));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const entry = page.getByRole("button", { name: /Loop Engineering/ });
    await entry.first().waitFor({ timeout: 45000 });
    log("PASS sidebar entry visible");
    // R2-01：相对路径解析基准取证——工作台首屏 state 请求必须 2xx，并记下实际解析出的 URL。
    const stateResp = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith("/dsh-l/state"), { timeout: 20000 });
    await entry.first().click();
    const resp = await stateResp;
    if (resp.status() < 200 || resp.status() >= 300) throw new Error("state " + resp.status() + " " + resp.url());
    log("PASS state request " + resp.status() + " " + resp.url());
    const host = page.locator("[data-dsh-l-build]");
    await host.first().waitFor({ timeout: 20000 });
    const seen = await host.first().getAttribute("data-dsh-l-build");
    if (seen !== build) throw new Error("ui build " + seen + " != " + build);
    log("PASS workbench mounted build=" + seen);
    // 收活闸门后首屏两种形态：未绑定=登录闸（连接按钮），已绑定=工作台（刷新按钮）
    const boardBtn = page.getByRole("button", { name: /^(刷新|Refresh)$/ });
    const gateBtn = page.locator("article.gate button.cta");
    const board = await boardBtn.first().waitFor({ timeout: 6000 }).then(() => "board").catch(() => null);
    const view = board ?? await gateBtn.first().waitFor({ timeout: 6000 }).then(() => "gate");
    log("PASS view=" + view + (view === "gate" ? " (account not bound)" : " (account bound)"));
    // 遮挡/裁剪诊断：卡片矩形 vs 宿主矩形 vs 视口；elementsFromPoint 找盖在卡片上的外部元素
    const geo = await page.evaluate(() => {
      const hosts = [...document.querySelectorAll("*")].filter((e) => e.shadowRoot && e.shadowRoot.querySelector(".gate"));
      if (!hosts.length) return { error: "no gate host found" };
      const host = hosts[0];
      const card = host.shadowRoot.querySelector(".gate");
      const r = card.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const fmt = (e) => e.tagName + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "");
      return {
        card: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        host: { x: Math.round(hr.x), y: Math.round(hr.y), w: Math.round(hr.width), h: Math.round(hr.height) },
        viewport: { w: innerWidth, h: innerHeight },
        clippedTop: r.y < hr.y, clippedBottom: r.y + r.height > hr.y + hr.height,
        stackTop: document.elementsFromPoint(cx, cy).map(fmt).slice(0, 6),
      };
    });
    log("GEO " + JSON.stringify(geo));
    // 宿主首启 Preview Notice 在应用启动后才渲染且盖在面板上：取证前点掉并确认遮罩消失（在役已读过则跳过）
    const dismiss = page.locator("button", { hasText: /^(Continue|继续)$/ }).first();
    if (await dismiss.isVisible().catch(() => false)) {
      await dismiss.click().catch(() => {});
      log("notice dismissed");
    }
    await page.waitForFunction(() => !document.querySelector("[class*='_mask_']"), null, { timeout: 4000 }).catch(() => {});
    const maskLeft = await page.evaluate(() => Boolean(document.querySelector("[class*='_mask_']")));
    log("mask after dismiss: " + maskLeft);
    if (view === "gate") await page.locator(".gate").first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(evid, "ui.png"), fullPage: false });
    log("PASS screenshot");
    // 移动端取证：390x844 视口重开页面，最佳努力（手机布局侧栏在抽屉里，入口可能不可点）
    try {
      const mpage = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
      mpage.on("console", (m) => log("m.console." + m.type() + " " + m.text()));
      await mpage.goto(url, { waitUntil: "domcontentloaded" });
      await mpage.getByRole("button", { name: /^(Continue|继续)$/ }).first().click({ timeout: 3000 }).catch(() => {});
      const mentry = mpage.getByRole("button", { name: /Loop Engineering/ });
      await mentry.first().click({ timeout: 6000 });
      const mcard = mpage.locator("article.gate").first();
      const mbox = await mcard.boundingBox();
      const mgeo = await mpage.evaluate(() => {
        const card = [...document.querySelectorAll("*")].find((e) => e.shadowRoot && e.shadowRoot.querySelector(".gate"));
        const c = card.shadowRoot.querySelector(".gate").getBoundingClientRect();
        return { inView: c.top >= 0 && c.bottom <= innerHeight && c.left >= 0 && c.right <= innerWidth, vw: innerWidth, vh: innerHeight, top: Math.round(c.top), bottom: Math.round(c.bottom) };
      });
      await mcard.waitFor({ timeout: 8000 });
      await mpage.screenshot({ path: path.join(evid, "ui-mobile.png"), fullPage: false });
      log("PASS mobile geo=" + JSON.stringify(mgeo));
    } catch (e) {
      log("SKIP mobile: " + (e && e.message).slice(0, 120));
    }
  } catch (e) {
    log("FAIL " + (e && e.message));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
