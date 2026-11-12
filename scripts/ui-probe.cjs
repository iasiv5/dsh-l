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
    await page.getByRole("button", { name: /^(刷新|Refresh)$/ }).first().waitFor({ timeout: 10000 });
    log("PASS refresh button visible");
    await page.screenshot({ path: path.join(evid, "ui.png"), fullPage: false });
    log("PASS screenshot");
  } catch (e) {
    log("FAIL " + (e && e.message));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
