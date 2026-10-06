import { test, expect } from '@playwright/test';
import { openTime, closeTime, toggleScale } from './helpers/consumerControls';
test('WebGL lab renderer, focus, clock, scale, and search', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lab/poc?renderer=webgl&test=1&perf=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Find a world', exact: true }).click();
  const input = page.getByRole('combobox', {
    name: 'Find a world',
    exact: true,
  });
  await input.fill('Earth');
  await input.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Earth', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.focusedId))
    .toBe('planet:earth');
  if (
    await page.getByRole('button', { name: 'Pause', exact: true }).isVisible()
  )
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await openTime(page);
  await page.getByLabel('Playback speed').selectOption('86400');
  await closeTime(page);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.clock.rate))
    .toBe(86400);
  await toggleScale(page, 'Explore');
  await page.getByRole('button', { name: 'Find a world', exact: true }).click();
  await input.fill('Mars');
  await input.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.focusedId))
    .toBe('planet:mars');
  await expect(page.locator('.error-panel')).toHaveCount(0);
  expect(errors).toEqual([]);
});
