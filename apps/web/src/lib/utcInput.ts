import { MAX_UTC_MS, MIN_UTC_MS } from '@space/domain';

export type UtcInputResult =
  | { ok: true; utcMs: number; iso: string }
  | { ok: false; reason: 'format' | 'calendar' | 'out-of-range' };

/** External dates require an offset; Date's permissive rollover is not validation. */
export function parseUtcInstant(value: string): UtcInputResult {
  if (value.length > 64) return { ok: false, reason: 'format' };
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return { ok: false, reason: 'format' };
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  const hour = Number(match[4]),
    minute = Number(match[5]),
    second = Number(match[6]);
  const offsetHour = Number(match[10] ?? 0),
    offsetMinute = Number(match[11] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > days[month - 1]! ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return { ok: false, reason: 'calendar' };
  }
  const utcMs = Date.parse(value);
  if (!Number.isFinite(utcMs) || utcMs < MIN_UTC_MS || utcMs > MAX_UTC_MS) {
    return { ok: false, reason: 'out-of-range' };
  }
  return { ok: true, utcMs, iso: new Date(utcMs).toISOString() };
}

/** datetime-local supplies no offset: this adapter belongs to a UTC-labelled input. */
export function parseUtcDateInput(value: string): UtcInputResult {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value)) {
    return { ok: false, reason: 'format' };
  }
  return parseUtcInstant(`${value.length === 16 ? `${value}:00` : value}Z`);
}

export function formatUtcDateInput(utcMs: number): string {
  if (!Number.isFinite(utcMs) || utcMs < MIN_UTC_MS || utcMs > MAX_UTC_MS) {
    throw new RangeError('Date must be inside the supported UTC range');
  }
  return new Date(utcMs).toISOString().slice(0, -1);
}
