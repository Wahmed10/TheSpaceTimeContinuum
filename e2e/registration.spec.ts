import { test, expect } from '@playwright/test';

test('public provider registration adds focusable objects and preserves existing GPU resources', async ({
  page,
}) => {
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const result = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const entity = {
      id: 'asteroid:test-registration',
      kind: 'asteroid' as const,
      name: 'Registration fixture',
      aliases: [],
      parentId: 'planet:earth',
      physical: { meanRadiusKm: 20, periodDays: 1 },
      color: '#aabbcc',
      importance: 1,
      description: 'Synthetic test object',
      tags: [],
      provenance: {
        providerId: 'test',
        sourceUrl: 'https://example.test/',
        method: 'static' as const,
        certainty: 'computed' as const,
      },
    };
    const factory = () => ({
      id: 'test',
      frame: 'ICRF_BODY:earth' as const,
      method: 'static' as const,
      validity: 'unbounded' as const,
      certaintyAt: () => 'computed' as const,
      stateAt: (tdb: number, out: Float64Array) => {
        const angle = (tdb / 86400) * 2 * Math.PI;
        out.set([50000 * Math.cos(angle), 50000 * Math.sin(angle), 0, 0, 0, 0]);
        return {
          ok: true as const,
          frame: 'ICRF_BODY:earth' as const,
          certainty: 'computed' as const,
          stale: false,
        };
      },
    });
    const before = engine.diagnostics().entities;
    engine.registerEntities([entity], factory);
    let duplicateRejected = false;
    try {
      engine.registerEntities([entity], factory);
    } catch {
      duplicateRejected = true;
    }
    engine.setLayer('neo', true);
    engine.focus(entity.id, { transition: false });
    return { before, after: engine.diagnostics().entities, duplicateRejected };
  });
  expect(result).toEqual({ before: 21, after: 22, duplicateRejected: true });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .lod.find((e) => e.id === 'asteroid:test-registration')?.visible,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .orbits.find((e) => e.id === 'asteroid:test-registration')?.visible,
      ),
    )
    .toBe(true);
  const before = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__spaceEngine!.setLayer('neo', false));
    await page.waitForTimeout(30);
    await page.evaluate(() => window.__spaceEngine!.setLayer('neo', true));
    await page.waitForTimeout(30);
  }
  const after = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  expect(after.geometries).toBe(before.geometries);
  expect(after.selected).toBe('asteroid:test-registration');
  expect(after.focusScreen!.x).toBeCloseTo(720, 0);
  await page.evaluate(() =>
    window.__spaceEngine!.focus('planet:earth', { transition: false }),
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
    )
    .toBe('planet:earth');
  expect(errors).toEqual([]);
});
