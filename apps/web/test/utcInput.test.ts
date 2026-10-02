import { describe, expect, it } from 'vitest';
import { MAX_UTC_MS, MIN_UTC_MS } from '@space/astro';
import {
  formatUtcDateInput,
  parseUtcDateInput,
  parseUtcInstant,
} from '../src/lib/utcInput';

describe('external UTC instants', () => {
  it.each([
    ['2026-10-02T12:34:56Z', '2026-10-02T12:34:56.000Z'],
    ['2026-10-02T08:34:56-04:00', '2026-10-02T12:34:56.000Z'],
    ['2026-10-02T18:04:56+05:30', '2026-10-02T12:34:56.000Z'],
    ['2000-02-29T00:00:00.1Z', '2000-02-29T00:00:00.100Z'],
    ['2024-02-29T00:00:00.12Z', '2024-02-29T00:00:00.120Z'],
    ['2100-12-31T23:59:59.999Z', '2100-12-31T23:59:59.999Z'],
    ['1899-12-31T23:00:00-01:00', '1900-01-01T00:00:00.000Z'],
  ])('normalizes %s without local timezone interpretation', (input, iso) => {
    expect(parseUtcInstant(input)).toEqual({
      ok: true,
      iso,
      utcMs: Date.parse(iso),
    });
  });

  it.each([
    '',
    'tomorrow',
    '2026-10-02',
    '2026-10-02T12:34',
    '2026-10-02T12:34:56',
    '2026-10-02 12:34:56Z',
    '2026-10-02T12:34:56.1234Z',
    '2026-10-02T12:34:56Z ',
    '1900-02-29T00:00:00Z',
    '2100-02-29T00:00:00Z',
    '2026-02-30T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-00-02T00:00:00Z',
    '2026-13-02T00:00:00Z',
    '2026-01-00T00:00:00Z',
    '2026-01-32T00:00:00Z',
    '2026-10-02T24:00:00Z',
    '2026-10-02T12:60:00Z',
    '2026-10-02T12:34:60Z',
    '2026-10-02T12:34:56+24:00',
    '2026-10-02T12:34:56+02:60',
    '1899-12-31T23:59:59.999Z',
    '2101-01-01T00:00:00Z',
    '1900-01-01T00:00:00+00:01',
    '2100-12-31T23:59:59-00:01',
    '0'.repeat(65),
  ])('rejects invalid or out-of-range date %s', (input) => {
    expect(parseUtcInstant(input).ok).toBe(false);
  });

  it('shares the existing simulation-clock boundaries', () => {
    expect(parseUtcInstant('1900-01-01T00:00:00Z')).toMatchObject({
      ok: true,
      utcMs: MIN_UTC_MS,
    });
    expect(parseUtcInstant('2100-12-31T23:59:59.999Z')).toMatchObject({
      ok: true,
      utcMs: MAX_UTC_MS,
    });
  });
});

describe('UTC date picker adapter', () => {
  it('treats an offset-free picker value as explicitly labelled UTC', () => {
    expect(parseUtcDateInput('2026-10-02T12:34')).toMatchObject({
      ok: true,
      iso: '2026-10-02T12:34:00.000Z',
    });
    expect(parseUtcDateInput('2026-10-02T12:34:56.789')).toMatchObject({
      ok: true,
      iso: '2026-10-02T12:34:56.789Z',
    });
    expect(parseUtcDateInput('2026-02-30T12:34').ok).toBe(false);
    expect(parseUtcDateInput('2026-10-02T12:34Z').ok).toBe(false);
  });

  it('formats and parses boundaries and subsecond values exactly', () => {
    for (const utcMs of [
      MIN_UTC_MS,
      Date.UTC(2026, 9, 2, 12, 34, 56, 789),
      MAX_UTC_MS,
    ]) {
      expect(parseUtcDateInput(formatUtcDateInput(utcMs))).toMatchObject({
        ok: true,
        utcMs,
      });
    }
    expect(() => formatUtcDateInput(NaN)).toThrow(RangeError);
    expect(() => formatUtcDateInput(MAX_UTC_MS + 1)).toThrow(RangeError);
  });
});
