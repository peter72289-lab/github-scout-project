const fs = require("fs");
const path = require("path");
const { chromium } = require("/Users/mrmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ROOT = __dirname;
const OUT = path.join(ROOT, "render", "frames");
const HTML = `file://${path.join(ROOT, "render", "render_demo.html")}`;
const FPS = 12;
const DURATION = 60;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${HTML}?t=0`);

  const total = FPS * DURATION;
  for (let frame = 0; frame < total; frame += 1) {
    const t = frame / FPS;
    await page.evaluate((time) => window.setDemoTime(time), t);
    await page.screenshot({
      path: path.join(OUT, `frame-${String(frame + 1).padStart(4, "0")}.png`),
      fullPage: false,
    });
  }

  await browser.close();
  console.log(JSON.stringify({ frames: total, fps: FPS, out: OUT }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
