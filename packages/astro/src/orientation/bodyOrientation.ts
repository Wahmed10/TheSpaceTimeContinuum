import * as Astronomy from 'astronomy-engine';
import { toAstroTime } from '../ephemeris/AstronomyEngineProvider';
import { DEG_TO_RAD } from '../time/constants';
// Quaternion maps a Y-up texture sphere (longitude zero on +X) into ICRF.
export function bodyOrientation(
  body: string,
  tdbSec: number,
  out: Float64Array,
): void {
  const axis = Astronomy.RotationAxis(
    body as Astronomy.Body,
    toAstroTime(tdbSec),
  );
  const ra = axis.ra * 15 * DEG_TO_RAD,
    dec = axis.dec * DEG_TO_RAD,
    w = axis.spin * DEG_TO_RAD;
  const nx = Math.cos(dec) * Math.cos(ra),
    ny = Math.cos(dec) * Math.sin(ra),
    nz = Math.sin(dec);
  const ax = -Math.sin(ra),
    ay = Math.cos(ra),
    az = 0;
  const bx = -nz * ay,
    by = nz * ax,
    bz = nx * ay - ny * ax;
  const xx = ax * Math.cos(w) + bx * Math.sin(w),
    xy = ay * Math.cos(w) + by * Math.sin(w),
    xz = az * Math.cos(w) + bz * Math.sin(w);
  const zx = xy * nz - xz * ny,
    zy = xz * nx - xx * nz,
    zz = xx * ny - xy * nx;
  const m00 = xx,
    m01 = nx,
    m02 = zx,
    m10 = xy,
    m11 = ny,
    m12 = zy,
    m20 = xz,
    m21 = nz,
    m22 = zz;
  const tr = m00 + m11 + m22;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    out[3] = s / 4;
    out[0] = (m21 - m12) / s;
    out[1] = (m02 - m20) / s;
    out[2] = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    out[3] = (m21 - m12) / s;
    out[0] = s / 4;
    out[1] = (m01 + m10) / s;
    out[2] = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    out[3] = (m02 - m20) / s;
    out[0] = (m01 + m10) / s;
    out[1] = s / 4;
    out[2] = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    out[3] = (m10 - m01) / s;
    out[0] = (m02 + m20) / s;
    out[1] = (m12 + m21) / s;
    out[2] = s / 4;
  }
}
