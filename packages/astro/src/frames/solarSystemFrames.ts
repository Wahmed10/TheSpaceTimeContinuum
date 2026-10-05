import * as Astronomy from 'astronomy-engine';
import type { BodySpec, PositionProvider } from '@space/domain';
import {
  hasPckOrientation,
  pckOrientation,
} from '../orientation/pckOrientation';
import {
  createBodyProvider,
  toAstroTime,
} from '../ephemeris/AstronomyEngineProvider';
import { bodyOrientation } from '../orientation/bodyOrientation';
import { FrameTree } from './FrameTree';
import type { FrameRotation } from './FrameTree';

function fixedRotation(body: string): FrameRotation {
  const q = new Float64Array(4);
  return (tdbSec, out) => {
    bodyOrientation(body, tdbSec, q);
    const x = q[0]!,
      y = q[1]!,
      z = q[2]!,
      w = q[3]!;
    // Texture axes are Y north, -Z east. Scientific FIXED axes are Z north, Y east.
    out[0] = 1 - 2 * (y * y + z * z);
    out[1] = -2 * (x * z + y * w);
    out[2] = 2 * (x * y - z * w);
    out[3] = 2 * (x * y + z * w);
    out[4] = -2 * (y * z - x * w);
    out[5] = 1 - 2 * (x * x + z * z);
    out[6] = 2 * (x * z - y * w);
    out[7] = -(1 - 2 * (x * x + y * y));
    out[8] = 2 * (y * z + x * w);
  };
}

function temeRotation(tdbSec: number, out: Float64Array): void {
  const time = toAstroTime(tdbSec);
  const rotation = Astronomy.Rotation_EQD_EQJ(time).rot;
  // TEME has mean equinox, EQD true equinox: include equation of equinoxes.
  // Astronomy e_tilt.ee is sidereal seconds of time, converted to radians.
  const angle = (-Astronomy.e_tilt(time).ee * Math.PI) / (12 * 3600);
  const c = Math.cos(angle),
    s = Math.sin(angle);
  for (let i = 0; i < 3; i++) {
    out[3 * i] = rotation[0]![i]! * c - rotation[1]![i]! * s;
    out[3 * i + 1] = rotation[0]![i]! * s + rotation[1]![i]! * c;
    out[3 * i + 2] = rotation[2]![i]!;
  }
}

/** SSB providers attach directly to root; this is equivalent to the EMB hierarchy
 * without subtracting/re-adding large barycentric positions every frame. */
export function createSolarSystemFrameTree(
  analytic: (body: string) => PositionProvider = createBodyProvider,
): FrameTree {
  const tree = new FrameTree();
  tree.register({
    id: 'ICRF_HELIO',
    parent: 'ICRF_SSB',
    origin: analytic('Sun'),
  });
  tree.register({
    id: 'ICRF_EMB',
    parent: 'ICRF_SSB',
    origin: analytic('EMB'),
  });
  for (const body of [
    'Sun',
    'Mercury',
    'Venus',
    'Earth',
    'Moon',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
  ]) {
    const id = `ICRF_BODY:${body.toLowerCase()}` as const;
    tree.register({ id, parent: 'ICRF_SSB', origin: analytic(body) });
    tree.register({
      id: `FIXED:${body.toLowerCase()}`,
      parent: id,
      rotation: fixedRotation(body),
    });
  }
  tree.register({
    id: 'TEME_EARTH',
    parent: 'ICRF_BODY:earth',
    rotation: temeRotation,
  });
  return tree;
}

/** Add catalog frames after their ephemeris assets have loaded. */
export function registerCatalogFrames(
  tree: FrameTree,
  body: BodySpec,
  provider: PositionProvider,
): void {
  const slug = body.id.split(':')[1]!;
  const id = `ICRF_BODY:${slug}` as const;
  if (!tree.has(id))
    tree.register({ id, parent: provider.frame, origin: provider });
  if (hasPckOrientation(slug) && !tree.has(`FIXED:${slug}`))
    tree.register({
      id: `FIXED:${slug}`,
      parent: id,
      rotation: (tdbSec, out) => pckOrientation(slug, tdbSec, out),
    });
}
