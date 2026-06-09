const fs = require("fs");
const path = require("path");
const { chromium } = require("/Users/mrmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const URL = "https://www.perplexity.ai/computer/a/githubscout-v2-1-opportunity-i-4csuqsbNRl.HJKs6CHkEIQ?login-source=oneTap&login-new=false";
const OUT_DIR = path.join(__dirname, "screens-clicked");

const tabs = [
  ["command-center", "Command center", 124, 196],
  ["domain-pools", "Domain pools", 120, 234],
  ["opportunity-explorer", "Opportunity explorer", 140, 272],
  ["top-actions", "Top actions", 116, 310],
  ["deep-dives", "Deep dives", 112, 348],
  ["funnel", "Funnel", 86, 386],
  ["sources", "Sources", 88, 424],
  ["methodology", "Methodology", 116, 462],
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: [
      "--window-size=1440,900",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(OUT_DIR, "00-preflight.png"), fullPage: false });

  const captured = [];
  for (let i = 0; i < tabs.length; i += 1) {
    const [slug, label, x, y] = tabs[i];
    await page.mouse.click(x, y);
    await page.waitForTimeout(1600);
    const file = path.join(OUT_DIR, `${String(i + 1).padStart(2, "0")}-${slug}.png`);
    await page.screenshot({ path: file, fullPage: false });
    captured.push({ label, file });
  }

  await browser.close();
  console.log(JSON.stringify(captured, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
