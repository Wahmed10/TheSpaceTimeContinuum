import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
page.on('console', (m) => console.log(m.type(), m.text()));
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:3000/?renderer=webgl&test=1&perf=1');
await page.waitForTimeout(10000);
console.log(await page.evaluate(() => window.__spaceEngine?.diagnostics()));
await page.screenshot({ path: 'docs/perf/screens/debug.png' });
await browser.close();
