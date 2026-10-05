import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { freezeRenderedView } from './rendered-view';
test('deterministic material reference views', async ({ page }, info) => {
  test.setTimeout(240000);
  await page.goto('/?renderer=webgl&test=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => window.__spaceEngine!.setQuality('medium'));
  // Keep material references independent of evolving orbit geometry/styles.
  // Orbit visibility and depth are covered by orbits.spec and GPU depth probes.
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 30000 },
    )
    .toBe(0);
  await page.addStyleTag({
    content:
      'body * { visibility: hidden !important; } canvas[role] { visibility: visible !important; }',
  });
  async function renderView(
    name: string,
    id: string,
    phase?: 'day' | 'night' | 'quarter' | 'limb',
  ) {
    const readiness = await freezeRenderedView(
      page,
      id,
      () =>
        page.evaluate(
          ({ id, phase }) => {
            const engine = window.__spaceEngine!;
            if (phase) engine.referenceView(id, phase);
            else engine.focus(id, { transition: false });
            engine.setRendering(true);
          },
          { id, phase },
        ),
      true,
    );
    await writeFile(
      info.outputPath(`${name}-readiness.json`),
      JSON.stringify({ ...readiness, phase }, null, 2),
    );
    await expect(canvas).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: 0.015,
      timeout: 30000,
    });
    await page.evaluate(() => window.__spaceEngine!.setRendering(true));
  }
  for (const [name, id] of [
    ['earth-terminator', 'planet:earth'],
    ['moon-quarter', 'moon:moon'],
    ['mars-close', 'planet:mars'],
    ['sun-bloom', 'star:sun'],
  ]) {
    await renderView(name!, id!);
  }
  for (const [name, id, phase] of [
    ['earth-day', 'planet:earth', 'day'],
    ['earth-night', 'planet:earth', 'night'],
    ['earth-limb', 'planet:earth', 'limb'],
    ['moon-full', 'moon:moon', 'day'],
  ] as const) {
    await renderView(name, id, phase);
  }
});
