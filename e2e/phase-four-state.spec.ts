import { expect, test } from '@playwright/test';

for (const [alias, frame] of [
  ['earth', 'ICRF_BODY:earth'],
  ['helio', 'ICRF_HELIO'],
  ['earth-fixed', 'FIXED:earth'],
] as const) {
  test(`${alias} restores the actual camera reference with a wide, hidden-layer selection`, async ({
    page,
  }) => {
    await page.goto(
      `/?renderer=webgl&test=1&focus=planet:earth&t=2026-10-02T12:00:00Z&frame=${alias}&view=wide&layers=`,
    );
    await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
      timeout: 60000,
    });
    const actual = await page.evaluate(async () => {
      const engine = window.__spaceEngine!;
      await engine.whenLayersSettled();
      return {
        state: engine.getMapState(),
        distance: engine.cameraController.distanceKm,
        layers: engine.getLayerStates(),
        mode: engine.clock.mode,
      };
    });
    expect(actual.state).toMatchObject({
      focus: 'planet:earth',
      frame,
      scale: 'explore',
      layers: [],
      camera: { preset: 'wide' },
    });
    expect(actual.distance).toBeCloseTo(149597870.7 * 4.2, 3);
    expect(actual.mode).toBe('paused');
    expect(actual.layers).toHaveLength(12);
    expect(
      actual.layers.every((layer) => !layer.requested && !layer.visible),
    ).toBe(true);
    await expect(
      page.getByRole('heading', { name: 'Earth', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.link-state-notice')).toHaveCount(0);
  });
}

test('public restoration is one cold command and does not add camera history', async ({
  page,
}) => {
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const actual = await page.evaluate(async () => {
    const engine = window.__spaceEngine!;
    const changes: unknown[] = [];
    const unsubscribe = engine.on('mapStateChange', (state) =>
      changes.push(state),
    );
    engine.applyMapState(
      {
        focus: 'planet:earth',
        t: '2026-10-02T12:00:00Z',
        frame: 'FIXED:earth',
        scale: 'true',
        layers: ['moons'],
        camera: { preset: 'wide' },
      },
      { transition: false, select: false, recordHistory: false },
    );
    await engine.whenLayersSettled();
    const state = engine.getMapState();
    engine.back();
    const afterBack = engine.getMapState();
    unsubscribe();
    return {
      changes,
      state,
      afterBack,
      selected: engine.diagnostics().selected,
    };
  });
  expect(actual.changes).toHaveLength(1);
  expect(actual.afterBack).toEqual(actual.state);
  expect(actual.selected).toBeNull();
  expect(actual.state).toMatchObject({
    focus: 'planet:earth',
    frame: 'FIXED:earth',
    scale: 'true',
    layers: ['moons'],
    camera: { preset: 'wide' },
  });
});

test('a fixed camera preserves pose when switched, then evolves the rendered view with time', async ({
  page,
}, info) => {
  await page.goto(
    '/?renderer=webgl&test=1&focus=planet:earth&t=2026-10-02T12:00:00Z&scale=true',
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const start = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const world = Array.from(engine.cameraController.world);
    const up = Array.from(engine.cameraController.up);
    const result = engine.setFrame('FIXED:earth');
    return { world, up, result };
  });
  expect(start.result).toEqual({ ok: true });
  await page.waitForTimeout(100);
  const switched = await page.evaluate(() => ({
    world: Array.from(window.__spaceEngine!.cameraController.world),
    up: Array.from(window.__spaceEngine!.cameraController.up),
  }));
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(start.world[i]! - switched.world[i]!)).toBeLessThan(1e-5);
    expect(Math.abs(start.up[i]! - switched.up[i]!)).toBeLessThan(1e-6);
  }
  const before = await page
    .locator('canvas')
    .screenshot({ path: info.outputPath('fixed-before.png') });
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.clock.setTime(engine.clock.state.tdbSec + 21600);
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          (origin) =>
            Math.hypot(
              ...Array.from(
                window.__spaceEngine!.cameraController.world,
                (x, i) => x - origin[i]!,
              ),
            ),
          switched.world,
        ),
      { timeout: 10000 },
    )
    .toBeGreaterThan(1000);
  const moved = await page.evaluate(() => ({
    world: Array.from(window.__spaceEngine!.cameraController.world),
    screen: window.__spaceEngine!.diagnostics().focusScreen,
  }));
  expect(
    Math.hypot(...moved.world.map((x, i) => x - switched.world[i]!)),
  ).toBeGreaterThan(1000);
  expect(moved.screen!.x).toBeCloseTo(720, 0);
  expect(moved.screen!.y).toBeCloseTo(500, 0);
  const after = await page
    .locator('canvas')
    .screenshot({ path: info.outputPath('fixed-after.png') });
  expect(after.equals(before)).toBe(false);
  await page.evaluate(() =>
    window.__spaceEngine!.clock.setTime(
      window.__spaceEngine!.clock.state.tdbSec - 21600,
    ),
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          (origin) =>
            Math.hypot(
              ...Array.from(
                window.__spaceEngine!.cameraController.world,
                (x, i) => x - origin[i]!,
              ),
            ),
          switched.world,
        ),
      { timeout: 10000 },
    )
    .toBeLessThan(1e-5);
  const reversed = await page.evaluate(() =>
    Array.from(window.__spaceEngine!.cameraController.world),
  );
  for (let i = 0; i < 3; i++)
    expect(Math.abs(reversed[i]! - switched.world[i]!)).toBeLessThan(1e-5);
});

test('unsupported state reports a command error while retaining the live renderer', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=webgl&test=1&focus=planet:mars');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const actual = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const commandErrors: unknown[] = [],
      graphicsErrors: string[] = [];
    const off = engine.on('commandError', (error) => commandErrors.push(error));
    const offGraphics = engine.on('error', (error) =>
      graphicsErrors.push(error),
    );
    const before = engine.getMapState();
    engine.applyMapState({ focus: 'planet:earth', frame: 'FIXED:mars' });
    off();
    offGraphics();
    return {
      before,
      after: engine.getMapState(),
      commandErrors,
      graphicsErrors,
    };
  });
  expect(actual.after).toEqual(actual.before);
  expect(actual.commandErrors).toHaveLength(1);
  expect(actual.graphicsErrors).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('.link-state-notice')).toBeVisible();
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(1);
});
