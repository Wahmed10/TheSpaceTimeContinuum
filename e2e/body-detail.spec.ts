import { test, expect } from '@playwright/test';

test('cloud decks and New Horizons maps render through quality transitions', async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (
      m.type() === 'error' ||
      /multiple-of-four|Invalid Texture/.test(m.text())
    )
      errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.url().includes('/assets/') && !r.ok())
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
  });
  for (const tier of ['low', 'high'] as const) {
    await page.evaluate((tier) => window.__spaceEngine!.setQuality(tier), tier);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__spaceEngine!.diagnostics().pendingTextures,
          ),
        { timeout: 60000 },
      )
      .toBe(0);
    for (const id of [
      'planet:venus',
      'moon:titan',
      'dwarf:pluto',
      'moon:charon',
    ]) {
      for (const phase of ['day', 'quarter'] as const) {
        await page.evaluate(
          ({ id, phase }) => {
            window.__spaceEngine!.referenceView(id, phase);
            window.__spaceEngine!.setRendering(true);
          },
          { id, phase },
        );
        await page.waitForTimeout(600);
        await page.evaluate(() => window.__spaceEngine!.setRendering(false));
        await canvas.screenshot({
          path: testInfo.outputPath(
            `${id.replace(':', '-')}-${tier}-${phase}.png`,
          ),
        });
        expect(errors).toEqual([]);
      }
    }
    await page.evaluate(() => window.__spaceEngine!.setRendering(true));
  }
  await testInfo.attach('resource-diagnostics', {
    body: JSON.stringify(
      await page.evaluate(() => window.__spaceEngine!.diagnostics()),
      null,
      2,
    ),
    contentType: 'application/json',
  });
});
