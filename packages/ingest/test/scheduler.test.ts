import { describe, expect, it, vi } from 'vitest';
import type { IngestionStore, IngestionTransaction } from '@space/db';
import type { AnyProvider } from '../src/contracts';
import { backoffMs, runDue } from '../src/scheduler';
import { ingestConfig } from '../src/config';

const config = ingestConfig({
  PROVIDER_CONTACT: 'https://example.com/contact',
});
const now = new Date('2026-10-05T12:00:00Z');
function store(): IngestionStore {
  return {
    register: vi.fn(async () => {}),
    claim: vi.fn(async (provider) => ({
      providerId: provider.id,
      owner: 'test',
      runId: 1,
      priorFailures: 2,
    })),
    pauseHost: vi.fn(async () => {}),
    complete: vi.fn(async (_lease, _now, _next, persist) =>
      persist({} as IngestionTransaction),
    ),
    fail: vi.fn(async () => {}),
    resume: vi.fn(async () => 0),
  };
}
function provider(
  id: string,
  fetchImpl: AnyProvider['fetch'] = async () => ({}),
): AnyProvider {
  return {
    definition: {
      id,
      host: 'provider.example',
      minIntervalMs: 7200_000,
      source: { id, name: id, license: 'fixture', attribution: 'test' },
    },
    fetch: fetchImpl,
    validate: (raw) => raw,
    normalize: (raw) => raw,
    persist: async () => ({
      recordsIn: 2,
      recordsUpserted: 1,
      payloadBytes: 10,
    }),
  };
}
describe('due runner lifecycle', () => {
  it('executes providers sequentially and schedules success no sooner than the source interval', async () => {
    const events: string[] = [];
    const db = store();
    const providers = ['a', 'b'].map((id) =>
      provider(id, async () => {
        events.push(id);
        return {};
      }),
    );
    expect(await runDue(providers, db, config, { now: () => now })).toEqual([
      { providerId: 'a', outcome: 'passed', records: 2 },
      { providerId: 'b', outcome: 'passed', records: 2 },
    ]);
    expect(events).toEqual(['a', 'b']);
    expect(db.complete).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      now,
      new Date(now.getTime() + 7200_000),
      expect.any(Function),
      config.retention,
    );
  });
  it('fetches nothing when persisted due/lease/pause claim is rejected', async () => {
    const db = store();
    db.claim = vi.fn(async () => null);
    const item = provider('a');
    item.fetch = vi.fn(item.fetch);
    expect((await runDue([item], db, config))[0]?.outcome).toBe(
      'not-due-or-blocked',
    );
    expect(item.fetch).not.toHaveBeenCalled();
  });
  it('fails validation with bounded codes and preserves last-good state by not persisting', async () => {
    const db = store(),
      item = provider('a');
    item.validate = () => {
      throw new Error('sensitive raw response');
    };
    const result = await runDue([item], db, config, { now: () => now });
    expect(result[0]).toMatchObject({
      outcome: 'failed',
      code: 'INVALID_PAYLOAD',
    });
    expect(db.complete).not.toHaveBeenCalled();
    expect(db.fail).toHaveBeenCalledWith(
      expect.anything(),
      now,
      new Date(now.getTime() + 28800_000),
      'INVALID_PAYLOAD',
      undefined,
    );
  });
  it('records persistence failure and aborts on bookkeeping failure rather than claiming success', async () => {
    const db = store(),
      item = provider('a');
    item.persist = async () => {
      throw new Error('secret connection string');
    };
    expect((await runDue([item], db, config))[0]).toMatchObject({
      code: 'PERSISTENCE',
      outcome: 'failed',
    });
    db.fail = async () => {
      throw new Error('cannot record failure');
    };
    await expect(runDue([item], db, config)).rejects.toThrow(
      'cannot record failure',
    );
  });
  it('bounds backoff without reducing a provider minimum and requires a safe contact', () => {
    expect(backoffMs(0, 7200_000)).toBe(7200_000);
    expect(backoffMs(99, 7200_000)).toBe(86400_000);
    expect(backoffMs(99, 7 * 86400_000)).toBe(7 * 86400_000);
    expect(() => ingestConfig({})).toThrow('PROVIDER_CONTACT');
    expect(() =>
      ingestConfig({ PROVIDER_CONTACT: 'foo\r\nAuthorization: secret' }),
    ).toThrow();
  });
});
