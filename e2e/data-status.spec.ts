import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
// Do not import TS domain barrel into Playwright's runner; use response contracts in unit tests.
const configured = process.env.SPACE_API_CONFIGURED === '1';
test.describe(
  configured
    ? 'configured real development database'
    : 'unconfigured data platform',
  () => {
    if (configured) {
      test('real ranked search and owned object endpoints are bounded, cached and read-only', async ({
        request,
      }) => {
        const result = await request.get(
          '/api/v1/objects/search?q=jwst&limit=5',
        );
        expect(result.status()).toBe(200);
        expect(result.headers()['cache-control']).toContain('s-maxage=300');
        expect((await result.json()).data[0]).toMatchObject({
          id: 'spacecraft:jwst',
          positionAvailable: false,
          provenance: null,
        });
        const mars = await request.get('/api/v1/objects/planet%3Amars');
        expect(mars.status()).toBe(200);
        expect(mars.headers()['cache-control']).toContain('s-maxage=3600');
        const entity = (await mars.json()).data;
        expect(entity.id).toBe('planet:mars');
        expect(entity).not.toHaveProperty('createdAt');
        expect(
          (await request.get('/api/v1/objects/planet%3Amissing')).status(),
        ).toBe(404);
        const hostile = await request.get('/api/v1/objects/search', {
          params: { q: "%'_\\; drop table objects; --" },
        });
        expect(hostile.status()).toBe(200);
        expect((await hostile.json()).data).toEqual([]);
        expect((await request.post('/api/v1/status')).status()).toBe(405);
      });
      test('status reports actual proof-provider ingestion without exposing private state', async ({
        request,
      }) => {
        const response = await request.get('/api/v1/status');
        expect(response.status()).toBe(200);
        expect(response.headers()['cache-control']).toContain('s-maxage=60');
        const body = await response.json();
        const provider = body.data.providers.find(
          (row: { providerId: string }) => row.providerId === 'dummy-proof',
        );
        expect(provider).toMatchObject({
          records: 1,
          paused: false,
          freshness: 'fresh',
        });
        expect(provider.lastSuccessAt).toBeTruthy();
        for (const key of [
          'host',
          'leaseOwner',
          'leaseUntil',
          'resumeNote',
          'lastError',
        ])
          expect(provider).not.toHaveProperty(key);
        expect(body.meta.sources[0]).not.toHaveProperty('sourceTimestamp');
      });
      test('human status is accessible on desktop and mobile and loads no engine', async ({
        page,
      }, info) => {
        const scripts: string[] = [];
        page.on('request', (request) => scripts.push(request.url()));
        await page.goto('/status');
        await expect(
          page.getByRole('heading', { name: 'Data status', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(
            'This is a local test provider, not a scientific feed.',
          ),
        ).toBeVisible();
        await expect(page.locator('canvas')).toHaveCount(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: info.outputPath('status-desktop.png'),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: info.outputPath('status-mobile.png'),
          fullPage: true,
        });
        expect(
          scripts.some(
            (url) =>
              url.includes('/data/chunks/') || url.includes('sky-stars.bin'),
          ),
        ).toBe(false);
      });
      test('invalid requests return sanitized no-store errors with no server exception details', async ({
        request,
      }) => {
        for (const path of [
          '/api/v1/objects/search?q=x&limit=51',
          '/api/v1/objects/search?q=x&q=y',
          '/api/v1/objects/INVALID',
        ]) {
          const response = await request.get(path);
          expect(response.status()).toBe(400);
          expect(response.headers()['cache-control']).toBe('no-store');
          expect(await response.text()).not.toContain('stack');
        }
      });
    } else {
      test('unconfigured APIs and human status are honest and safe', async ({
        request,
        page,
      }) => {
        for (const path of [
          '/api/v1/status',
          '/api/v1/objects/search?q=mars',
          '/api/v1/objects/planet%3Amars',
        ]) {
          const response = await request.get(path);
          expect(response.status()).toBe(503);
          expect(response.headers()['cache-control']).toBe('no-store');
          expect((await response.json()).error.code).toBe(
            'DATABASE_NOT_CONFIGURED',
          );
        }
        await page.goto('/status');
        await expect(
          page.getByText('The data platform is not configured.', {
            exact: false,
          }),
        ).toBeVisible();
        await expect(page.locator('canvas')).toHaveCount(0);
      });
      test('the original planet-only route still renders with no database credentials', async ({
        page,
      }) => {
        // Keep the accepted body catalog unchanged and verify the existing route directly.
        const bodies = JSON.parse(
          readFileSync(
            new URL('../packages/domain/data/bodies.json', import.meta.url),
            'utf8',
          ),
        );
        expect(bodies).toHaveLength(21);
        await page.goto('/object/planet/earth?renderer=webgl&test=1');
        await expect(page.locator('canvas')).toHaveAttribute(
          'data-ready',
          'true',
          { timeout: 60000 },
        );
        await expect(
          page.getByRole('heading', { name: 'Earth', exact: true }),
        ).toBeVisible();
      });
    }
  },
);
