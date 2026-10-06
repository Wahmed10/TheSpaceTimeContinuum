import { test, expect } from '@playwright/test';

test('wide orbits highlight selection, style approximation, refresh after date jumps and obey layers', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() =>
    window.__spaceEngine!.focus('planet:earth', { transition: false }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .orbits.find((o) => o.id === 'planet:earth')?.width,
      ),
    )
    .toBe(2);
  await page.screenshot({
    path: 'docs/perf/screens/phase-two-orbits-earth.png',
  });
  expect(
    await page.evaluate(
      () =>
        window
          .__spaceEngine!.diagnostics()
          .orbits.find((o) => o.id === 'dwarf:ceres')?.visible,
    ),
  ).toBe(false);
  await page.evaluate(() =>
    window.__spaceEngine!.focus('dwarf:ceres', { transition: false }),
  );
  await page.evaluate(() => window.__spaceEngine!.whenOrbitsSettled());
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .orbits.find((o) => o.id === 'dwarf:ceres')?.visible,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        window
          .__spaceEngine!.diagnostics()
          .orbits.find((o) => o.id === 'dwarf:ceres')?.dashed,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'docs/perf/screens/phase-two-orbits-ceres.png',
  });
  const epoch = await page.evaluate(
    () =>
      window
        .__spaceEngine!.diagnostics()
        .orbits.find((o) => o.id === 'dwarf:ceres')!.epoch,
  );
  await page.evaluate(() =>
    window.__spaceEngine!.applyMapState({
      focus: 'dwarf:ceres',
      t: '2050-01-01T00:00:00Z',
      scale: 'true',
    }),
  );
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            window
              .__spaceEngine!.diagnostics()
              .orbits.find((o) => o.id === 'dwarf:ceres')!.epoch,
        ),
      { timeout: 15000 },
    )
    .not.toBe(epoch);
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__spaceEngine!.diagnostics().orbits.some((o) => o.visible),
      ),
    )
    .toBe(false);
  expect(errors).toEqual([]);
});
