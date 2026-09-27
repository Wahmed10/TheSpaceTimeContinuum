import { test, expect } from '@playwright/test';

test('Phase 3 existing planet maps render without resource errors', async ({
  page,
}, testInfo) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/assets/') && !response.ok())
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__spaceEngine!.setQuality('medium');
    window.__spaceEngine!.setLayer('orbits', false);
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 30000 },
    )
    .toBe(0);
  for (const body of [
    'mercury',
    'venus',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ]) {
    await page.evaluate(
      (body) => window.__spaceEngine!.referenceView(`planet:${body}`, 'day'),
      body,
    );
    await page.waitForTimeout(500);
    await canvas.screenshot({ path: testInfo.outputPath(`${body}.png`) });
  }
  expect(errors).toEqual([]);
});
