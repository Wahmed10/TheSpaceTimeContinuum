import { test, expect } from '@playwright/test';
test('all 21 catalog entries load and computed/approximate bodies can be focused and layered', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  expect(
    await page.evaluate(() => window.__spaceEngine!.diagnostics().entities),
  ).toBe(21);
  await page.getByRole('button', { name: 'Find a world' }).click();
  await expect(page.locator('.search-result')).toHaveCount(8);
  await page.locator('.search-result').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.search-result').last()).toBeInViewport();
  await page.getByRole('button', { name: 'Close search' }).click();
  for (const [name, id] of [
    ['Jupiter', 'planet:jupiter'],
    ['Europa', 'moon:europa'],
    ['Pluto', 'dwarf:pluto'],
    ['Titan', 'moon:titan'],
    ['Ceres', 'dwarf:ceres'],
  ]) {
    await page.getByRole('button', { name: 'Find a world' }).click();
    await page.getByPlaceholder('Where would you like to go?').fill(name!);
    await page.getByPlaceholder('Where would you like to go?').press('Enter');
    await expect(
      page.getByRole('heading', { name: name!, exact: true }),
    ).toBeVisible();
    await page.evaluate(
      (id) => window.__spaceEngine!.focus(id!, { transition: false }),
      id,
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
      )
      .toBe(id);
    const metrics = await page.evaluate(
      (id) => window.__spaceEngine!.getMetrics(id!),
      id,
    );
    expect(metrics!.distanceSunKm).toBeGreaterThan(1e8);
    expect(metrics!.radiusKm).toBeGreaterThan(400);
    if (name === 'Titan' || name === 'Ceres') {
      expect(metrics!.certainty).toBe('approximate');
      await expect(page.locator('.position-certainty')).toHaveText(
        'Approximate position',
      );
    }
    await expect
      .poll(() =>
        page.evaluate(() => window.__spaceEngine!.diagnostics().focusScreen?.x),
      )
      .toBeCloseTo(720, 0);
    await page.screenshot({
      path: `docs/perf/screens/phase-two-${name!.toLowerCase()}.png`,
    });
  }
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByLabel('Dwarf planets', { exact: true }).uncheck();
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().layers),
  ).not.toContain('dwarfs');
  await page.getByLabel('Dwarf planets', { exact: true }).check();
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().layers),
  ).toContain('dwarfs');
  await page.keyboard.press('Escape');
  await expect(page.locator('.error-panel')).toHaveCount(0);
  expect(errors).toEqual([]);
});
