import { test, expect } from '@playwright/test';
import fixtures from '../packages/astro/test/fixtures/pck-orientations.json' with { type: 'json' };

test('all ten new body orientations reach the renderer and advance with simulation time', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const first = await page.evaluate(async () => {
    const engine = window.__spaceEngine!;
    engine.clock.setTime(631152000);
    engine.setRendering(true);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return engine.diagnostics().orientations;
  });

  for (const row of fixtures.records.filter((r) => r.tdbSec === 631152000)) {
    const actual = first.find((r) => r.id.split(':')[1] === row.body)!;
    expect(actual.frame).toBe(`FIXED:${row.body}`);
    const [x, y, z, w] = actual.quaternion as [number, number, number, number];
    const prime = [
      1 - 2 * (y * y + z * z),
      2 * (x * y + z * w),
      2 * (x * z - y * w),
    ];
    const pole = [
      2 * (x * y - z * w),
      1 - 2 * (x * x + z * z),
      2 * (y * z + x * w),
    ];
    for (let i = 0; i < 3; i++) {
      expect(prime[i]).toBeCloseTo(row.matrix[3 * i]!, 9);
      expect(pole[i]).toBeCloseTo(row.matrix[3 * i + 2]!, 9);
    }
  }
  const later = await page.evaluate(async () => {
    window.__spaceEngine!.clock.setTime(631152000 + 21600);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return window.__spaceEngine!.diagnostics().orientations;
  });

  for (const row of fixtures.records.filter((r) => r.tdbSec === 631152000)) {
    const a = first.find((r) => r.frame === `FIXED:${row.body}`)!;
    const b = later.find((r) => r.frame === a.frame)!;
    const dot = Math.abs(
      a.quaternion.reduce((sum, v, i) => sum + v * b.quaternion[i]!, 0),
    );
    expect(dot, row.body).toBeLessThan(0.99999);
  }
  expect(errors).toEqual([]);
});
