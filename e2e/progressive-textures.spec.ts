import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const runtime = JSON.parse(
  readFileSync('packages/engine/src/assets/runtime-chunks.json', 'utf8'),
) as { version: string };
const textures = JSON.parse(
  readFileSync('apps/web/public/assets/textures/manifest.json', 'utf8'),
) as { file: string; res: number }[];
const resolution = new Map(textures.map((t) => [t.file, t.res]));
test.use({
  channel: 'chromium',
  launchOptions: {
    args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
  },
});
for (const backend of ['webgl', 'webgpu'] as const)
  test(`${backend}: a visible first frame survives held 1K/detail downloads and swaps on the physical GPU`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    let stage: 'preview' | 'baseline' | 'detail' = 'preview';
    const baseline: Route[] = [],
      detail: Route[] = [],
      errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (
        m.type() === 'error' ||
        /GPUValidationError|Invalid Texture|multiple-of-four|Failed to create device/.test(
          m.text(),
        )
      )
        errors.push(m.text());
    });
    await page.route('**/*.ktx2', async (route) => {
      const res = resolution.get(new URL(route.request().url()).pathname);
      if (stage === 'preview' && res === 1024) {
        baseline.push(route);
        return;
      }
      if (stage !== 'detail' && res !== 1024) {
        detail.push(route);
        return;
      }
      await route.continue();
    });
    await page.goto(
      '/object/planet/earth?test=1' +
        (backend === 'webgl' ? '&renderer=webgl' : ''),
    );
    await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
      timeout: 60000,
    });
    await expect(page.locator('.loading-screen')).toHaveCount(0);
    await expect.poll(() => baseline.length).toBe(2);
    await page.evaluate(() => {
      window.__spaceEngine!.setQuality('high');
      window.__spaceEngine!.referenceView('planet:earth', 'day');
    });
    const preview = await page.evaluate(() =>
      window.__spaceEngine!.diagnostics(),
    );
    expect(preview.backend).toBe(backend === 'webgl' ? 'webgl2' : 'webgpu');
    expect(preview.textureState).toHaveLength(29);
    expect(preview.textureState.every((t) => t.placeholder)).toBe(true);
    const adapter = preview.adapter;
    expect(JSON.stringify(adapter)).not.toMatch(
      /swiftshader|llvmpipe|software|unknown/i,
    );
    expect(adapter).toBeTruthy();
    await page.screenshot({ path: info.outputPath(`${backend}-preview.png`) });
    stage = 'baseline';
    await Promise.all(baseline.splice(0).map((route) => route.continue()));
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            window
              .__spaceEngine!.diagnostics()
              .textureState.every((t) => t.resolution === 1024),
          ),
        { timeout: 60000 },
      )
      .toBe(true);
    const oneK = await page.evaluate(() => window.__spaceEngine!.diagnostics());
    await page.screenshot({ path: info.outputPath(`${backend}-1k.png`) });
    stage = 'detail';
    await Promise.all(detail.splice(0).map((route) => route.continue()));
    await expect
      .poll(
        () =>
          page.evaluate(
            () => window.__spaceEngine!.diagnostics().pendingTextures,
          ),
        { timeout: 60000 },
      )
      .toBe(0);
    const sharp = await page.evaluate(() =>
      window.__spaceEngine!.diagnostics(),
    );
    expect(sharp.textureState.some((t) => t.resolution > 1024)).toBe(true);
    expect(sharp.textureState.every((t) => !t.placeholder && !t.failed)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`${backend}-detail.png`) });
    await writeFile(
      info.outputPath('texture-streaming.json'),
      JSON.stringify(
        {
          candidateCommit: process.env.SPACE_CANDIDATE_COMMIT,
          sourceSha256: process.env.SPACE_SOURCE_SHA256,
          adapter,
          preview,
          oneK,
          sharp,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  });
test('phone width retains real 1K maps and time chunks have immutable production headers', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.ktx2')) requests.push(new URL(r.url()).pathname);
  });
  await page.goto('/?test=1&renderer=webgl');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => window.__spaceEngine!.setQuality('high'));
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 60000 },
    )
    .toBe(0);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((file) => resolution.get(file) === 1024)).toBe(true);
  expect(
    await page.evaluate(() =>
      window
        .__spaceEngine!.diagnostics()
        .textureState.every((t) => t.resolution === 1024 && t.desired === 1024),
    ),
  ).toBe(true);
  const response = await request.get(`/data/chunks/${runtime.version}/0.bin`);
  expect(response.ok()).toBe(true);
  expect(response.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
  expect((await response.body()).byteLength).toBeLessThanOrEqual(16384);
});
