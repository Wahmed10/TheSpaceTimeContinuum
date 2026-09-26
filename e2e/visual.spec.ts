import { test, expect } from '@playwright/test';
test('deterministic material reference views', async ({ page }) => {
  test.setTimeout(240000);
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => window.__spaceEngine!.setQuality('medium'));
  // Keep material references independent of evolving orbit geometry/styles.
  // Orbit visibility and depth are covered by orbits.spec and GPU depth probes.
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 30000 },
    )
    .toBe(0);
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
  });
  for (const [name, id] of [
    ['earth-terminator', 'planet:earth'],
    ['moon-quarter', 'moon:moon'],
    ['mars-close', 'planet:mars'],
    ['sun-bloom', 'star:sun'],
  ]) {
    await page.evaluate(
      (id) => window.__spaceEngine!.focus(id!, { transition: false }),
      id,
    );
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__spaceEngine!.setRendering(false));
    await expect(canvas).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: 0.015,
      timeout: 30000,
    });
    await page.evaluate(() => window.__spaceEngine!.setRendering(true));
  }
  for (const [name, id, phase] of [
    ['earth-day', 'planet:earth', 'day'],
    ['earth-night', 'planet:earth', 'night'],
    ['earth-limb', 'planet:earth', 'limb'],
    ['moon-full', 'moon:moon', 'day'],
  ] as const) {
    await page.evaluate(
      ({ id, phase }) => window.__spaceEngine!.referenceView(id, phase),
      { id, phase },
    );
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__spaceEngine!.setRendering(false));
    await expect(canvas).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: 0.015,
      timeout: 30000,
    });
    await page.evaluate(() => window.__spaceEngine!.setRendering(true));
  }
});
