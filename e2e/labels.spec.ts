import { test, expect } from '@playwright/test';

test('labels reuse a fixed pool, avoid overlap, and respect local view semantics', async ({
  page,
}) => {
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.space-label')).toHaveCount(64);
  const visible = page.locator('.space-label[data-visible="true"]');
  await expect(visible.filter({ hasText: /^Sun$/ })).toHaveCount(1);
  await expect(
    visible.filter({ hasText: /^Moon$|^Europa$|^Titan$/ }),
  ).toHaveCount(0);
  const boxes = await visible.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
      };
    }),
  );
  expect(boxes.length).toBeGreaterThan(2);
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!,
        b = boxes[j]!;
      expect(
        a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top,
      ).toBe(false);
    }
  await page.evaluate(() =>
    window.__spaceEngine!.focus('planet:earth', { transition: false }),
  );
  await expect(visible.filter({ hasText: /^Earth$/ })).toHaveClass(/selected/);
  await expect.poll(() => visible.allTextContents()).toEqual(['Earth']);
  await expect(page.locator('.space-label')).toHaveCount(64);
  expect(
    await page
      .locator('.space-label')
      .evaluateAll((elements) =>
        elements.every((el) => el.getAttribute('aria-hidden') === 'true'),
      ),
  ).toBe(true);
});
