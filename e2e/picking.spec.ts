import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });

test('mesh and point selection, hover events and touch radius work without labels', async ({
  page,
}) => {
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
  });
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.focus('planet:earth', { transition: false });
    engine.select(null);
    engine.on('hover', (id) => {
      document.querySelector('canvas')!.dataset.hover = id ?? '';
    });
  });
  await page.waitForTimeout(250);
  await page.mouse.move(720, 500);
  await expect(canvas).toHaveAttribute('data-hover', 'planet:earth');
  await page.mouse.click(800, 500);
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBe('planet:earth');
  await page.mouse.move(1, 1);
  await expect(canvas).toHaveAttribute('data-hover', '');

  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setLayer('moons', false);
    engine.cameraController.distanceKm = 1e8;
    engine.select(null);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .lod.find((e) => e.id === 'planet:earth')!.level,
      ),
    )
    .toBeLessThan(2);
  await page.mouse.click(720, 500);
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBe('planet:earth');
  await page.mouse.click(738, 500);
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBeNull();
  await page.touchscreen.tap(738, 500);
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBe('planet:earth');
  await expect(canvas).toHaveAttribute('data-hover', '');

  await page.evaluate(() => window.__spaceEngine!.select(null));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 715, y: 500, id: 1 },
      { x: 725, y: 500, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  expect(
    await page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
  ).toBeNull();
  await cdp.detach();
});
