import { test, expect } from '@playwright/test';

const systems = [
  { parent: 'planet:earth', moons: ['moon:moon'], distance: 1600000 },
  {
    parent: 'planet:mars',
    moons: ['moon:phobos', 'moon:deimos'],
    distance: 100000,
  },
  {
    parent: 'planet:jupiter',
    moons: ['moon:io', 'moon:europa', 'moon:ganymede', 'moon:callisto'],
    distance: 8000000,
  },
  { parent: 'planet:saturn', moons: ['moon:titan'], distance: 5000000 },
  { parent: 'planet:neptune', moons: ['moon:triton'], distance: 1600000 },
  { parent: 'dwarf:pluto', moons: ['moon:charon'], distance: 100000 },
];

for (const system of systems)
  test(`${system.parent} moon system supports scale, orbit and touch focus`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?renderer=webgl&test=1');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-ready', 'true', {
      timeout: 60000,
    });
    await page.evaluate(() => {
      window.__spaceEngine!.clock.setTime(631152000);
      window.__spaceEngine!.clock.pause();
    });
    await page.addStyleTag({
      content:
        'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
    });
    for (const scale of ['true', 'explore'] as const) {
      await page.evaluate(
        ({ system, scale }) => {
          const engine = window.__spaceEngine!;
          engine.setScale(scale);
          engine.focus(system.parent, { transition: false });
          engine.cameraController.distanceKm = system.distance;
          engine.cameraController.elevationRad = Math.PI / 2 - 0.05;
          engine.setLayer('moons', true);
        },
        { system, scale },
      );
      await expect
        .poll(() =>
          page.evaluate((moons) => {
            const lod = window.__spaceEngine!.diagnostics().lod;
            return moons.every(
              (id) => lod.find((row) => row.id === id)?.visible,
            );
          }, system.moons),
        )
        .toBe(true);
      await canvas.screenshot({ path: info.outputPath(`${scale}-system.png`) });
      for (const moon of system.moons) {
        await expect
          .poll(
            () =>
              page.evaluate(
                (id) =>
                  window.__spaceEngine!.getPositionStatus(id) !== 'loading',
                moon,
              ),
            { timeout: 30000 },
          )
          .toBe(true);
        await page.evaluate(
          (moon) => window.__spaceEngine!.focus(moon, { transition: false }),
          moon,
        );
        await expect
          .poll(() =>
            page.evaluate(
              () => window.__spaceEngine!.diagnostics().focusScreen?.x,
            ),
          )
          .toBeCloseTo(720, 0);
        await expect
          .poll(() =>
            page.evaluate(
              (moon) =>
                window
                  .__spaceEngine!.diagnostics()
                  .orbits.find((row) => row.id === moon)?.visible,
              moon,
            ),
          )
          .toBe(true);
        const metrics = await page.evaluate(
          (moon) => window.__spaceEngine!.getMetrics(moon),
          moon,
        );
        await page.evaluate(() => window.__spaceEngine!.select(null));
        await page.touchscreen.tap(720, 500);
        await expect
          .poll(() =>
            page.evaluate(() => window.__spaceEngine!.diagnostics().selected),
          )
          .toBe(moon);
        await page.evaluate(
          (scale) =>
            window.__spaceEngine!.setScale(
              scale === 'true' ? 'explore' : 'true',
            ),
          scale,
        );
        // Public physical measurements must not change when display radii change.
        expect(
          await page.evaluate(
            (moon) => window.__spaceEngine!.getMetrics(moon),
            moon,
          ),
        ).toEqual(metrics);
        await page.evaluate(
          (scale) => window.__spaceEngine!.setScale(scale),
          scale,
        );
      }
    }
    await page.evaluate(() => window.__spaceEngine!.setLayer('moons', false));
    await expect
      .poll(() =>
        page.evaluate((moons) => {
          const lod = window.__spaceEngine!.diagnostics().lod;
          return moons.some((id) => lod.find((row) => row.id === id)?.visible);
        }, system.moons),
      )
      .toBe(false);
    expect(errors).toEqual([]);
  });

test.use({ hasTouch: true });
