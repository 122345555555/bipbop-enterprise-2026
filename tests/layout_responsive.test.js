const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve(__dirname, "..");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const html = source
    .replace(/<link[^>]+style\.css[^>]*>/i, `<style>${css}</style>`)
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  const chromeCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ];
  const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) {
    console.log("SKIP: browser locale non disponibile; usare il controllo responsive in CI/Vercel.");
    return;
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath });
  } catch (error) {
    console.log("SKIP: il sandbox non consente l'avvio del browser headless.");
    return;
  }
  const page = await browser.newPage();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      bodyWidth: document.body.scrollWidth,
      mainWidth: document.querySelector("main").getBoundingClientRect().width
    }));
    assert.ok(
      layout.documentWidth <= layout.viewportWidth,
      `scroll orizzontale globale a ${viewport.width}px: ${layout.documentWidth} > ${layout.viewportWidth}`
    );
    assert.ok(layout.bodyWidth <= layout.viewportWidth);
    assert.ok(layout.mainWidth <= layout.viewportWidth);
  }

  await browser.close();
  console.log("OK: nessuno scroll orizzontale globale a 1440, 1024 e 390 px.");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
