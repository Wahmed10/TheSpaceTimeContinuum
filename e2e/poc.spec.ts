import { test, expect } from '@playwright/test';
test('WebGL renderer, focus, clock, scale, and search', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/lab/poc?renderer=webgl&test=1&perf=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await page.screenshot({ path: 'docs/perf/screens/solar-system-webgl.png' });
  await page
    .getByRole('button', { name: 'Earth', exact: false })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Earth', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await page.screenshot({ path: 'docs/perf/screens/earth-webgl.png' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Playback speed').selectOption('86400');
  await page
    .getByRole('button', { name: 'Explore scale', exact: true })
    .click();
  await page.getByRole('button', { name: 'Find a world' }).click();
  await page.getByPlaceholder('Where would you like to go?').fill('Mars');
  await page.getByPlaceholder('Where would you like to go?').press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await page.screenshot({ path: 'docs/perf/screens/mars-webgl.png' });
  expect(errors).toEqual([]);
});
