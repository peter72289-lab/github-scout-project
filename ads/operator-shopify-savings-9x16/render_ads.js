const path = require("path");
const { chromium } = require("/Users/mrmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const outDir = __dirname;
const htmlPath = path.join(outDir, "render_ads.html");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });

  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  const ads = await page.evaluate(() => window.ads.map((ad) => ad.slug));

  for (let i = 0; i < ads.length; i += 1) {
    await page.goto(`file://${htmlPath}?ad=${i}`, { waitUntil: "load" });
    await page.waitForFunction(() => {
      const img = document.querySelector("#bg");
      return img && img.complete && img.naturalWidth > 0;
    });
    await page.screenshot({
      path: path.join(outDir, `github-scout-operator-shopify-ad-${ads[i]}.png`),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
  }

  await browser.close();
  console.log(`Rendered ${ads.length} PNG ads to ${outDir}`);
})();
