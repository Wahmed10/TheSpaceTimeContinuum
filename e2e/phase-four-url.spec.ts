import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Toronto' });

test('invalid external time and settings recover to a LIVE overview', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    '/?renderer=webgl&perf=1&t=2026-02-30T00:00:00Z&focus=sat:25544&scale=huge&frame=FIXED:mars',
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await expect(page.locator('.link-state-notice [role="status"]')).toHaveText(
    'Some link settings could not be restored.',
  );
  await page.getByText('Review link settings', { exact: true }).click();
  await expect(page.locator('.link-state-notice')).toContainText(
    'LIVE time was used',
  );
  const state = await page.evaluate(() => ({
    mode: window.__spaceEngine!.clock.mode,
    state: window.__spaceEngine!.getMapState(),
  }));
  expect(state.mode).toBe('live');
  expect(state.state.focus).toBe('star:sun');
  expect(state.state.t).toBeUndefined();
  expect(state.state.scale).toBe('explore');
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('invalid-link-recovery.png'),
  });
});

test('an offset date restores paused time and known layers outside the UTC browser timezone', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    '/?renderer=webgl&test=1&focus=moon:europa&t=2026-10-02T08%3A00%3A00-04%3A00&layers=moons,moons&scale=true&view=wide',
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(
    page.getByRole('heading', { name: 'Europa', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.link-state-notice')).toHaveCount(0);
  const result = await page.evaluate(() => ({
    mode: window.__spaceEngine!.clock.mode,
    state: window.__spaceEngine!.getMapState(),
  }));
  expect(result.mode).toBe('paused');
  expect(result.state.focus).toBe('moon:europa');
  expect(
    Math.abs(Date.parse(result.state.t!) - Date.parse('2026-10-02T12:00:00Z')),
  ).toBeLessThanOrEqual(1);
  expect(result.state.layers).toEqual(['moons']);
  expect(result.state.scale).toBe('true');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByLabel('Moons', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Planets', { exact: true })).not.toBeChecked();
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('paused-offset-link.png'),
  });
});

test('malformed query encoding does not fail graphics and layers= remains all off', async ({
  page,
}) => {
  // Keep Date.now at the fractional LIVE epoch that exposed endpoint rounding.
  // setFixedTime leaves RAF/timers running and does not enable diagnostic mode.
  await page.clock.setFixedTime(new Date('2026-10-02T22:35:20.002Z'));
  await page.goto('/?renderer=webgl&perf=1&t=%FF');
  // Rejecting the malformed query also drops debug flags. Read observable UI
  // instead of weakening that policy just to expose a test hook.
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await expect(page.locator('.link-state-notice')).toBeVisible();
  await page.goto('/?renderer=webgl&test=1&focus=planet:mars&layers=');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().layers),
  ).toEqual([]);
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
});
