import { describe, expect, it } from 'vitest';
import { MAX_UTC_MS, MIN_UTC_MS } from '@space/domain';
import { loadUiTime, uiTime } from '../src/engine-bridge/uiTimeAdapter';

describe('UI time initialization boundary', () => {
  it('rejects premature clock formatting before engine initialization', () => {
    expect(() => uiTime()).toThrow('before engine publication');
  });

  it('retains exact scientific dates, leap seconds and supported bounds after loading', async () => {
    const [first, concurrent] = await Promise.all([loadUiTime(), loadUiTime()]);
    expect(concurrent).toBe(first);
    expect(uiTime()).toBe(first);
    expect(first.minTdb).toBe(first.utcMsToTdb(MIN_UTC_MS));
    expect(first.maxTdb).toBe(first.utcMsToTdb(MAX_UTC_MS));
    for (const iso of [
      '1900-01-01T00:00:00.000Z',
      '2016-12-31T23:59:60.000Z',
      '2026-10-02T12:00:00.000Z',
      '2100-12-31T23:59:59.999Z',
    ]) {
      expect(first.tdbToIso(first.isoToTdb(iso))).toBe(iso);
    }
  });
});
