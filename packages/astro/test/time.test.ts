import { describe, it, expect } from 'vitest';
import {
  utcMsToTdb,
  tdbToUtcMs,
  jdToTdb,
  tdbToJd,
  tdbMinusTt,
  isoToTdb,
  tdbToIso,
} from '../src/time/scales';
import { taiMinusUtc, LEAP_TABLE_VALID_UNTIL } from '../src/time/leapSeconds';
describe('time scales', () => {
  it('identifies J2000', () => {
    expect(jdToTdb(2451545)).toBe(0);
    expect(tdbToJd(0)).toBe(2451545);
    expect(utcMsToTdb(Date.parse('2000-01-01T11:58:55.816Z'))).toBeCloseTo(
      -0.000073,
      5,
    );
  });
  it('handles leap boundaries', () => {
    const ms = Date.parse('2017-01-01T00:00:00Z');
    expect(taiMinusUtc(ms - 1)).toBe(36);
    expect(taiMinusUtc(ms)).toBe(37);
    expect(utcMsToTdb(ms) - utcMsToTdb(ms - 1000)).toBeCloseTo(2, 5);
  });
  it('round trips 10000 deterministic epochs', () => {
    let seed = 7;
    for (let i = 0; i < 10000; i++) {
      seed = (seed * 16807) % 2147483647;
      const ms =
        Date.UTC(1900, 0, 1) +
        ((Date.UTC(2101, 0, 1) - Date.UTC(1900, 0, 1)) * seed) / 2147483647;
      expect(Math.abs(tdbToUtcMs(utcMsToTdb(ms)) - ms)).toBeLessThanOrEqual(
        0.001,
      );
      expect(Math.abs(tdbMinusTt(utcMsToTdb(ms)))).toBeLessThan(0.0017);
    }
  });
  it('requires review of the leap-second table', () =>
    expect(Date.now()).toBeLessThan(LEAP_TABLE_VALID_UNTIL));
  it('represents an explicit leap second independently of JS Date', () => {
    const t = isoToTdb('2016-12-31T23:59:60Z');
    expect(isoToTdb('2017-01-01T00:00:00Z') - t).toBeCloseTo(1, 6);
    expect(tdbToIso(t)).toBe('2016-12-31T23:59:60.000Z');
    expect(() => isoToTdb('2026-09-22T23:59:60Z')).toThrow();
  });
});
