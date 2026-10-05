import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BODIES } from '@space/domain';
import { DatabaseConfigurationError } from '@space/db';
const mock = vi.hoisted(() => ({
  create: vi.fn(),
  search: vi.fn(),
  object: vi.fn(),
  aliases: vi.fn(),
  statuses: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@space/db', async (original) => ({
  ...(await original<typeof import('@space/db')>()),
  createDatabase: mock.create,
  searchObjects: mock.search,
  getObject: mock.object,
  getObjectAliases: mock.aliases,
  providerStatuses: mock.statuses,
}));
const baseProvider = {
  providerId: 'fixture',
  host: 'internal-host',
  lastRunAt: null,
  lastSuccessAt: null,
  nextRunAt: null,
  consecutiveFailures: 0,
  lastError: null,
  lastHttpStatus: null,
  records: 0,
  pausedAt: null,
  pauseReason: null,
  resumedAt: null,
  resumedBy: null,
  resumeNote: null,
  leaseOwner: 'private-token',
  leaseUntil: null,
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mock.create.mockReturnValue({ db: {}, close: async () => {} });
});
describe('server-owned database projection', () => {
  it('opens lazily and strips raw metadata, internal timestamps and private fields', async () => {
    const api = await import('../src/server/dataQueries');
    expect(mock.create).not.toHaveBeenCalled();
    mock.object.mockResolvedValue({
      ...BODIES[0],
      createdAt: new Date(),
      metadata: { description: 'Sun', rawProvider: { secret: 'hidden' } },
    });
    mock.aliases.mockResolvedValue(['Sol']);
    const entity = await api.readObject('star:sun');
    expect(entity?.aliases).toEqual(['Sol']);
    expect(JSON.stringify(entity)).not.toContain('hidden');
    expect(entity).not.toHaveProperty('createdAt');
    expect(entity?.metadata).toEqual({ description: 'Sun' });
    expect(mock.create).toHaveBeenCalledTimes(1);
    mock.search.mockResolvedValue([
      { ...BODIES[0], metadata: {}, raw: 'private' },
    ]);
    expect(
      (await api.readSearch({ q: 'sun', kinds: [], limit: 20 }))[0],
    ).not.toHaveProperty('raw');
    expect(mock.create).toHaveBeenCalledTimes(1);
  });
  it('keeps identity-only spacecraft unavailable instead of inventing provenance', async () => {
    const api = await import('../src/server/dataQueries');
    mock.search.mockResolvedValue([
      {
        id: 'spacecraft:jwst',
        name: 'Webb',
        kind: 'spacecraft',
        metadata: { positionAvailable: false },
        provenance: null,
      },
    ]);
    const [item] = await api.readSearch({ q: 'jwst', kinds: [], limit: 20 });
    expect(item).toMatchObject({ positionAvailable: false, provenance: null });
  });
  it('reports stale/paused/never-successful separately and withholds private run errors', async () => {
    const api = await import('../src/server/dataQueries');
    const now = new Date('2026-10-05T12:00:00Z');
    expect(api.publicProvider(baseProvider, now).freshness).toBe(
      'never-successful',
    );
    const failed = {
      ...baseProvider,
      lastSuccessAt: new Date(now.getTime() - 7200_001),
      nextRunAt: new Date(now.getTime() + 86400_000),
      lastError: 'postgres://private-password',
      pausedAt: null,
    };
    expect(api.publicProvider(failed, now)).toMatchObject({
      freshness: 'stale',
      lastErrorCode: 'INGESTION_FAILED',
    });
    expect(
      api.publicProvider({ ...failed, pausedAt: now }, now).freshness,
    ).toBe('paused');
    expect(JSON.stringify(api.publicProvider(failed, now))).not.toContain(
      'private',
    );
    expect(
      api.publicProvider({ ...baseProvider, lastSuccessAt: now }, now)
        .freshness,
    ).toBe('fresh');
  });
  it('maps bad DTOs and driver failures to bounded public codes', async () => {
    const api = await import('../src/server/dataQueries');
    mock.create.mockImplementation(() => {
      throw new DatabaseConfigurationError();
    });
    await expect(api.readStatus()).rejects.toMatchObject({
      code: 'DATABASE_NOT_CONFIGURED',
    });
    mock.create.mockReturnValue({ db: {} });
    mock.statuses.mockRejectedValue(new Error('internal SQL/secret'));
    await expect(api.readStatus()).rejects.toMatchObject({
      code: 'DATA_UNAVAILABLE',
      message: 'DATA_UNAVAILABLE',
    });
  });
});
