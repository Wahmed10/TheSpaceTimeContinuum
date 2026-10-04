import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
export async function openSettings(page: Page) {
  if (!(await page.locator('.settings-popover').isVisible())) {
    const trigger = page.getByRole('button', { name: 'Settings', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    await expect(page.locator('.settings-popover')).toBeVisible();
  }
}
export async function closeSettings(page: Page) {
  await page
    .getByRole('button', { name: 'Close settings', exact: true })
    .click();
  await expect(page.locator('.settings-popover')).toHaveCount(0);
}
export async function openTime(page: Page) {
  if (!(await page.locator('.time-panel').isVisible()))
    await page
      .getByRole('button', { name: 'Choose simulation date', exact: true })
      .click();
  await expect(page.locator('.time-panel')).toBeVisible();
}
export async function closeTime(page: Page) {
  await page
    .getByRole('button', { name: 'Close time controls', exact: true })
    .click();
  await expect(page.locator('.time-panel')).toHaveCount(0);
}
export async function toggleScale(page: Page, current: 'Explore' | 'True') {
  await openSettings(page);
  await page
    .getByRole('button', { name: current + ' scale', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: (current === 'Explore' ? 'True' : 'Explore') + ' scale',
      exact: true,
    }),
  ).toBeVisible();
  await closeSettings(page);
}
export async function expectScale(page: Page, scale: 'Explore' | 'True') {
  await openSettings(page);
  await expect(
    page.getByRole('button', { name: scale + ' scale', exact: true }),
  ).toBeVisible();
  await closeSettings(page);
}
