import { DeltaT_EspenakMeeus } from 'astronomy-engine';
import {
  J2000_JD,
  J2000_UNIX_MS,
  SEC_PER_DAY,
  TT_MINUS_TAI,
  DEG_TO_RAD,
} from './constants';
import { taiMinusUtc, leapSeconds } from './leapSeconds';
export function tdbMinusTt(ttSec: number): number {
  const g = (357.53 + (0.98560028 * ttSec) / SEC_PER_DAY) * DEG_TO_RAD;
  return 0.001657 * Math.sin(g) + 0.000014 * Math.sin(2 * g);
}
export function utcMsToTaiSec(ms: number): number {
  return (ms - J2000_UNIX_MS) / 1000 + taiMinusUtc(ms);
}
export function utcMsToTdb(ms: number): number {
  const ut = (ms - J2000_UNIX_MS) / 1000;
  const tt =
    ms < Date.UTC(1972, 0, 1)
      ? ut + DeltaT_EspenakMeeus(ut / SEC_PER_DAY)
      : utcMsToTaiSec(ms) + TT_MINUS_TAI;
  return tt + tdbMinusTt(tt);
}
export function tdbToUtcMs(tdbSec: number): number {
  let ms = J2000_UNIX_MS + tdbSec * 1000;
  for (let i = 0; i < 4; i++) ms += (tdbSec - utcMsToTdb(ms)) * 1000;
  return ms;
}
export const tdbToJd = (tdbSec: number): number =>
  J2000_JD + tdbSec / SEC_PER_DAY;
export const jdToTdb = (jd: number): number => (jd - J2000_JD) * SEC_PER_DAY;
export function tdbToIso(tdbSec: number): string {
  for (let i = 1; i < leapSeconds.length; i++) {
    const utcMs = leapSeconds[i]![0];
    const boundary = utcMsToTdb(utcMs);
    if (tdbSec >= boundary - 1 && tdbSec < boundary) {
      return new Date(utcMs - 1000 + Math.floor((tdbSec - boundary + 1) * 1000))
        .toISOString()
        .replace(':59.', ':60.');
    }
  }
  return new Date(tdbToUtcMs(tdbSec)).toISOString();
}
export function isoToTdb(iso: string): number {
  if (/:60(?:\.\d+)?Z$/.test(iso)) {
    const normalized = iso.replace(':60', ':59');
    const ms = Date.parse(normalized);
    const boundary = Math.floor(ms / 1000) * 1000 + 1000;
    if (!leapSeconds.some((r, i) => i > 0 && r[0] === boundary))
      throw new RangeError('Not a recorded leap second');
    return utcMsToTdb(ms) + 1;
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new RangeError('Invalid UTC date');
  return utcMsToTdb(ms);
}
