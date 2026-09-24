import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
const software = process.argv.includes('--software');
const browser = await chromium.launch({
  headless: true,
  args: software
    ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
    : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on('pageerror', (error) => console.error(error.message));
  await page.goto(
    'http://localhost:3000/lab/poc?perf=1&test=1' +
      (software ? '&renderer=webgl' : ''),
  );
  await page.locator('canvas[data-ready=true]').waitFor({ timeout: 60000 });
  await page.evaluate(
    (software) => window.__spaceEngine.setQuality(software ? 'low' : 'high'),
    software,
  );
  console.log('Running five-view report through the lab button');
  await page.exposeFunction('reportStatus', (status) => console.log(status));
  await page.evaluate(() => {
    const status = document.querySelector('aside [role="status"]');
    if (status)
      new MutationObserver(() =>
        window.reportStatus(status.textContent),
      ).observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      });
  });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 300000 }),
    page
      .getByRole('button', { name: 'Run Phase 1 device checks', exact: true })
      .click(),
  ]);
  const { benchmark, precision } = JSON.parse(
    await readFile(await download.path(), 'utf8'),
  );
  if (benchmark.results.length !== 5 || !precision.pass)
    throw new Error('Incomplete or failed device report');
  await writeFile(
    `docs/perf/device-${software ? 'software' : 'local'}.json`,
    JSON.stringify({ software, benchmark, precision }, null, 2),
  );
  console.log('Saved device report');
} finally {
  await browser.close();
}
