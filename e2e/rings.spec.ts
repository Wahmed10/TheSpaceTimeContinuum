import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { freezeRenderedView } from './rendered-view';

test('Saturn rings render both sides, shadows and stable quality geometry', async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
    if (
      /multiple-of-four|GPUValidationError|Invalid Texture/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const e = window.__spaceEngine!;
    e.setQuality('medium');
    e.applyMapState({
      focus: 'planet:saturn',
      t: '2020-06-01T00:00:00Z',
      scale: 'true',
    });
    e.clock.pause();
    e.setLayer('orbits', false);
  });
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 60000 },
    )
    .toBe(0);
  const capture = async (
    name: string,
    side: 'north' | 'south' | 'edge',
    planetShadow: boolean,
    ringShadow: boolean,
  ) => {
    const readiness = await freezeRenderedView(
      page,
      'planet:saturn',
      () =>
        page.evaluate(
          ({ side, planetShadow, ringShadow }) => {
            window.__spaceEngine!.ringReferenceView(
              side,
              planetShadow,
              ringShadow,
            );
            window.__spaceEngine!.setRendering(true);
          },
          { side, planetShadow, ringShadow },
        ),
      true,
    );
    await writeFile(
      testInfo.outputPath(name + '-readiness.json'),
      JSON.stringify({ ...readiness, side, planetShadow, ringShadow }, null, 2),
    );
    return canvas.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  };
  const none = await capture('north-no-shadows', 'north', false, false);
  const planet = await capture('north-planet-shadow', 'north', true, false);
  // The rings shade the hemisphere opposite the Sun's ring-plane latitude.
  // In June 2020 the Sun is north: inspect the south face for surface shadows.
  const southNone = await capture('south-no-shadows', 'south', false, false);
  const ring = await capture('south-ring-shadow', 'south', false, true);
  const changedPixels = async (a: Buffer, b: Buffer) => {
    const x = await sharp(a).removeAlpha().raw().toBuffer();
    const y = await sharp(b).removeAlpha().raw().toBuffer();
    let changed = 0;
    for (let i = 0; i < x.length; i += 3)
      if (
        Math.abs(x[i]! - y[i]!) +
          Math.abs(x[i + 1]! - y[i + 1]!) +
          Math.abs(x[i + 2]! - y[i + 2]!) >
        15
      )
        changed++;
    return changed;
  };
  const effects = {
    planetOnRings: await changedPixels(none, planet),
    ringsOnPlanet: await changedPixels(southNone, ring),
  };
  await writeFile(
    testInfo.outputPath('shadow-effects.json'),
    JSON.stringify(effects, null, 2),
  );
  expect(errors).toEqual([]);
  expect(effects.planetOnRings).toBeGreaterThan(30);
  expect(effects.ringsOnPlanet).toBeGreaterThan(30);
  await capture('north-both', 'north', true, true);
  await capture('south-both', 'south', true, true);
  await capture('edge-both', 'edge', true, true);
  for (const tier of ['low', 'high', 'medium'] as const) {
    await page.evaluate((tier) => {
      window.__spaceEngine!.setQuality(tier);
      window.__spaceEngine!.setRendering(true);
    }, tier);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__spaceEngine!.diagnostics().pendingTextures,
          ),
        { timeout: 60000 },
      )
      .toBe(0);
    await capture(`north-${tier}`, 'north', true, true);
    const rings = await page.evaluate(
      () => window.__spaceEngine!.diagnostics().rings,
    );
    expect(rings).toHaveLength(1);
    expect(rings[0]).toMatchObject({
      id: 'planet:saturn',
      visible: true,
      geometry: 'RingGeometry',
      vertices: 514,
    });
    expect(rings[0]!.innerRadius).toBeCloseTo(74658 / 58232);
    expect(rings[0]!.outerRadius).toBeCloseTo(136780 / 58232);
  }
  await page.evaluate(() => {
    window.__spaceEngine!.setLayer('orbits', true);
    window.__spaceEngine!.setScale('explore');
  });
  await capture('north-explore-orbits', 'north', true, true);
  expect(errors).toEqual([]);
});
