import data from './pck-models.json';

export type PckBody = keyof typeof data.models;
const RAD = Math.PI / 180;

function polynomial(coefficients: readonly number[], t: number): number {
  let value = 0;
  for (let i = coefficients.length - 1; i >= 0; i--)
    value = value * t + coefficients[i]!;
  return value;
}

/** NAIF PCK00011 scientific Z-north FIXED -> ICRF, row-major.
 * TDB seconds since J2000. Caller owns the nine-element output; no hot-path allocation.
 * Text-PCK attitude approximation, not a mission reconstructed attitude product.
 */
export function pckOrientation(
  body: PckBody,
  tdbSec: number,
  out: Float64Array,
): void {
  const model = data.models[body];
  const days = tdbSec / 86400;
  const centuries = days / 36525;
  let ra = polynomial(model.ra, centuries);
  let dec = polynomial(model.dec, centuries);
  let w = polynomial(model.pm, days);
  for (let i = 0; i < model.angles.length; i++) {
    const angle = polynomial(model.angles[i]!, centuries) * RAD;
    const sine = Math.sin(angle);
    ra += (model.raTerms[i] ?? 0) * sine;
    dec += (model.decTerms[i] ?? 0) * Math.cos(angle);
    w += (model.pmTerms[i] ?? 0) * sine;
  }
  ra *= RAD;
  dec *= RAD;
  w = (w % 360) * RAD;
  const sr = Math.sin(ra),
    cr = Math.cos(ra);
  const sd = Math.sin(dec),
    cd = Math.cos(dec);
  const sw = Math.sin(w),
    cw = Math.cos(w);
  // Columns: prime meridian, east, pole. Transpose of NAIF's inertial->fixed Euler product.
  out[0] = -sr * cw - sd * cr * sw;
  out[1] = sr * sw - sd * cr * cw;
  out[2] = cd * cr;
  out[3] = cr * cw - sd * sr * sw;
  out[4] = -cr * sw - sd * sr * cw;
  out[5] = cd * sr;
  out[6] = cd * sw;
  out[7] = cd * cw;
  out[8] = sd;
}

export function hasPckOrientation(body: string): body is PckBody {
  return Object.hasOwn(data.models, body);
}
