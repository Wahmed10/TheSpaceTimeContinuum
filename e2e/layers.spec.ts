import { test, expect } from '@playwright/test';

test('layer toggles and map restoration reuse GPU resources', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setQuality('low');
    engine.focus('planet:earth', { transition: false });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().pendingTextures),
    )
    .toBe(0);
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  expect(before.layers).toHaveLength(12);
  expect(
    before.layers.find((layer) => layer.id === 'sat.stations'),
  ).toMatchObject({ available: false, loaded: false, visible: false });
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => {
      for (const id of ['planets', 'moons', 'dwarfs', 'orbits'])
        window.__spaceEngine!.setLayer(id, false);
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__spaceEngine!.diagnostics()
              .layers.filter((layer) => layer.visible).length,
        ),
      )
      .toBe(0);
    await page.evaluate(() => {
      for (const id of ['planets', 'moons', 'dwarfs', 'orbits'])
        window.__spaceEngine!.setLayer(id, true);
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__spaceEngine!.diagnostics()
              .layers.filter((layer) => layer.visible).length,
        ),
      )
      .toBe(4);
  }
  const after = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  expect(after.geometries).toBe(before.geometries);
  expect(after.gpuAttributes).toBeGreaterThan(0);
  expect(after.gpuAttributes).toBe(before.gpuAttributes);
  expect(after.textureCount).toBe(before.textureCount);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.applyMapState({
      focus: 'planet:earth',
      layers: ['moons', 'sat.stations', 'future-layer'],
      scale: 'true',
    });
  });
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().layers),
  ).toEqual(['moons', 'sat.stations']);
  await expect(page.locator('.error-panel')).toHaveCount(0);
  expect(errors).toEqual([]);
});
