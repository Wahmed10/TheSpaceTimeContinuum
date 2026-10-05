import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BODY_BY_ID,
  objectResponseSchema,
  searchResponseSchema,
  statusResponseSchema,
} from '@space/domain';
const mocked = vi.hoisted(() => ({
  search: vi.fn(),
  object: vi.fn(),
  status: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('../src/server/dataQueries', () => ({
  readSearch: mocked.search,
  readObject: mocked.object,
  readStatus: mocked.status,
  PublicDataError: class extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
}));
import { PublicDataError } from '../src/server/dataQueries';
import { GET as search } from '../src/app/api/v1/objects/search/route';
import { GET as object } from '../src/app/api/v1/objects/[id]/route';
import { GET as status } from '../src/app/api/v1/status/route';

const mars = BODY_BY_ID.get('planet:mars')!;
const entity = {
  ...mars,
  parentId: mars.parentId,
  metadata: {},
  provenance: mars.provenance,
  aliases: mars.aliases,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocked.search.mockResolvedValue([]);
  mocked.object.mockResolvedValue(entity);
  mocked.status.mockResolvedValue([]);
});
describe('read-only versioned API contract', () => {
  it('returns ranked owned results and search CDN policy', async () => {
    mocked.search.mockResolvedValue([
      {
        id: mars.id,
        name: mars.name,
        kind: mars.kind,
        provenance: mars.provenance,
        positionAvailable: true,
      },
    ]);
    const response = await search(
      new Request(
        'http://localhost/api/v1/objects/search?q=Mars&kinds=planet&limit=5',
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    );
    expect(searchResponseSchema.parse(await response.json()).data[0]?.id).toBe(
      'planet:mars',
    );
    expect(mocked.search).toHaveBeenCalledWith({
      q: 'Mars',
      kinds: ['planet'],
      limit: 5,
    });
  });
  it.each([
    '',
    '?q=',
    '?q=foo&limit=51',
    '?q=foo&kinds=bogus',
    '?q=foo&q=bar',
    '?q=foo&unknown=x',
    '?q=foo%00',
    `?q=${'x'.repeat(121)}`,
  ])(
    'rejects invalid/ambiguous query %s before database work',
    async (query) => {
      const response = await search(
        new Request('http://localhost/api/v1/objects/search' + query),
      );
      expect(response.status).toBe(400);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(mocked.search).not.toHaveBeenCalled();
    },
  );
  it('returns object TTL and distinguishes invalid identity from a genuine missing record', async () => {
    const request = new Request('http://localhost/api/v1/objects/planet:mars');
    const result = await object(request, {
      params: Promise.resolve({ id: 'planet:mars' }),
    });
    expect(objectResponseSchema.parse(await result.json()).data.id).toBe(
      'planet:mars',
    );
    expect(result.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(
      (await object(request, { params: Promise.resolve({ id: 'invalid/id' }) }))
        .status,
    ).toBe(400);
    mocked.object.mockResolvedValue(null);
    const missing = await object(request, {
      params: Promise.resolve({ id: 'planet:missing' }),
    });
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
  });
  it('does not confuse response generation/ingestion with provider source time', async () => {
    mocked.status.mockResolvedValue([
      {
        providerId: 'test',
        lastRunAt: '2026-10-05T12:00:00.000Z',
        lastSuccessAt: null,
        nextRunAt: null,
        records: 0,
        consecutiveFailures: 0,
        paused: false,
        freshness: 'never-successful',
        lastErrorCode: null,
        lastHttpStatus: null,
      },
    ]);
    const response = await status();
    const body = statusResponseSchema.parse(await response.json());
    expect(response.headers.get('cache-control')).toContain('s-maxage=60');
    expect(body.meta.stale).toBe(true);
    expect(body.meta.sources).toEqual([{ id: 'test' }]);
    expect(body.data.providers[0]?.lastSuccessAt).toBe(null);
  });
  it('sanitizes database/configuration/validation failures and never publicly caches them', async () => {
    mocked.search.mockRejectedValue(
      new Error('postgres://user:private-password@internal'),
    );
    const unavailable = await search(
      new Request('http://localhost/api/v1/objects/search?q=foo'),
    );
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get('cache-control')).toBe('no-store');
    expect(await unavailable.text()).not.toContain('private-password');
    mocked.status.mockRejectedValue(
      new PublicDataError('DATABASE_NOT_CONFIGURED'),
    );
    expect((await (await status()).json()).error.code).toBe(
      'DATABASE_NOT_CONFIGURED',
    );
    mocked.search.mockResolvedValue([{ id: 'broken' }]);
    expect(
      (
        await search(
          new Request('http://localhost/api/v1/objects/search?q=foo'),
        )
      ).status,
    ).toBe(503);
  });
});
