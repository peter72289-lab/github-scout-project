const fs = require("fs");
const path = require("path");
const { chromium } = require("/Users/mrmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = __dirname;
const htmlPath = path.join(root, "render/operator_demo.html");
const framesDir = path.join(root, "render/frames");
fs.mkdirSync(framesDir, { recursive: true });

(async () => {
  const fps = 12;
  const seconds = 45;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });

  for (let frame = 0; frame < fps * seconds; frame += 1) {
    const t = frame / fps;
    await page.goto(`file://${htmlPath}?t=${t.toFixed(3)}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("#bg")?.complete);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(frame + 1).padStart(4, "0")}.png`),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
  }

  await browser.close();
  console.log(`Rendered ${fps * seconds} frames`);
})();
