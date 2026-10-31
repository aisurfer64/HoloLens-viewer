// Render face.html to a PNG at the given device scale factor.
import { chromium } from 'playwright-core';
const [html, out, dpr] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1217, height: 1598 }, deviceScaleFactor: +dpr });
await page.goto('file://' + html);
await page.waitForSelector('body[data-ready="1"]');
await page.locator('#plate').screenshot({ path: out });
await browser.close();
console.log('wrote', out);
