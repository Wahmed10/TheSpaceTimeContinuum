import { settledSceneResources } from './helpers/sceneResources';
import { test, expect } from '@playwright/test';
declare global {
  interface Window {
    __detachFixture?: () => void;
    __sourceDisposeCount?: number;
    __sourceFail?: boolean;
  }
}
test.use({ hasTouch: true });

test('10k external points support focus, touch picking, visibility, failure isolation and disposal', async ({
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
    window.__sourceDisposeCount = 0;
    const entities = Array.from({ length: 10000 }, (_, index) => ({
      id: `asteroid:point-${index}`,
      name: `Point ${index}`,
      kind: 'asteroid' as const,
      aliases: [],
      parentId: 'planet:earth',
      physical: { meanRadiusKm: 10 },
      color: '#aabbcc',
      description: 'Synthetic source fixture',
      importance: 1,
      tags: [],
      provenance: {
        providerId: 'fixture',
        sourceUrl: 'https://example.test/',
        method: 'static' as const,
        certainty: 'computed' as const,
      },
    }));
    window.__detachFixture = engine.registerPointLayer('neo', {
      frame: 'ICRF_BODY:earth',
      entities,
      update: (_tdb, out) => {
        if (window.__sourceFail) throw new Error('Source fixture failed');
        for (let index = 0; index < entities.length; index++) {
          const offset = index * 6;
          out.states[offset] = 50000 + index * 100;
          out.states[offset + 1] = index * 100;
          out.states[offset + 2] = 0;
          out.states[offset + 3] =
            out.states[offset + 4] =
            out.states[offset + 5] =
              0;
          out.sizes[index] = 6;
        }
        return entities.length;
      },
      dispose: () => {
        window.__sourceDisposeCount!++;
      },
    });
    engine.on('sourceError', ({ message }) => {
      document.querySelector('canvas')!.dataset.sourceError = message;
    });
    engine.setLayer('neo', true);
    engine.focus('asteroid:point-0', { transition: false });
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().sourcePoints),
    )
    .toBe(10000);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__spaceEngine!.select(null));
  await page.touchscreen.tap(720, 500);
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBe('asteroid:point-0');
  await settledSceneResources(page);
  const before = await page.evaluate(
    () => window.__spaceEngine!.diagnostics().geometries,
  );
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__spaceEngine!.setLayer('neo', false));
    await page.waitForTimeout(40);
    await page.evaluate(() => window.__spaceEngine!.setLayer('neo', true));
    await page.waitForTimeout(40);
  }
  expect(
    await page.evaluate(() => window.__spaceEngine!.diagnostics().geometries),
  ).toBe(before);
  expect(await page.locator('.space-label').count()).toBe(64);
  await page.evaluate(() => {
    window.__sourceFail = true;
  });
  await expect(canvas).toHaveAttribute(
    'data-source-error',
    /Source fixture failed/,
  );
  await expect(canvas).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    window.__detachFixture!();
    window.__detachFixture!();
  });
  expect(await page.evaluate(() => window.__sourceDisposeCount)).toBe(1);
  expect(
    await page.evaluate(() => window.__spaceEngine!.diagnostics().sourcePoints),
  ).toBe(0);
  expect(
    await page.evaluate(() =>
      window.__spaceEngine!.getEntity('asteroid:point-0'),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
  ).toBe('planet:earth');
});
