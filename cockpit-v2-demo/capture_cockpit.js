const fs = require("fs");
const path = require("path");
const { chromium } = require("/Users/mrmac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const URL = "https://www.perplexity.ai/computer/a/githubscout-v2-1-opportunity-i-4csuqsbNRl.HJKs6CHkEIQ?login-source=oneTap&login-new=false";
const OUT_DIR = path.join(__dirname, "screens");

const tabs = [
  ["command-center", "Command center"],
  ["domain-pools", "Domain pools"],
  ["opportunity-explorer", "Opportunity explorer"],
  ["top-actions", "Top actions"],
  ["deep-dives", "Deep dives"],
  ["funnel", "Funnel"],
  ["sources", "Sources"],
  ["methodology", "Methodology"],
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);

  const captured = [];
  for (let i = 0; i < tabs.length; i += 1) {
    const [slug, label] = tabs[i];
    if (i > 0) {
      const tab = page.getByText(label, { exact: true });
      await tab.waitFor({ state: "visible", timeout: 12000 });
      await tab.click();
      await page.waitForTimeout(1400);
    }

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
