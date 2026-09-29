import { expect, it } from 'vitest';
import {
  hasPckOrientation,
  pckOrientation,
} from '../src/orientation/pckOrientation';
import {
  createSolarSystemFrameTree,
  registerCatalogFrames,
} from '../src/frames/solarSystemFrames';
import { EXPLORABLE_BODIES } from '@space/domain';
import fixtures from './fixtures/pck-orientations.json';

it('matches 60 independent CSPICE N0067 fixed-to-J2000 matrices across 1900–2100', () => {
  const out = new Float64Array(9);
  for (const row of fixtures.records) {
    if (!hasPckOrientation(row.body)) throw new Error(row.body);
    pckOrientation(row.body, row.tdbSec, out);
    for (let i = 0; i < 9; i++)
      expect(
        Math.abs(out[i]! - row.matrix[i]!),
        `${row.body} ${row.tdbSec} [${i}]`,
      ).toBeLessThan(1e-9);
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        const dot =
          out[a]! * out[b]! +
          out[a + 3]! * out[b + 3]! +
          out[a + 6]! * out[b + 6]!;
        expect(dot).toBeCloseTo(a === b ? 1 : 0, 12);
      }
  }
});

it('exposes all missing FIXED frames and preserves scientific-to-texture axis conventions', () => {
  const tree = createSolarSystemFrameTree();
  for (const body of EXPLORABLE_BODIES) {
    // Rotation is independent of translation; isolate it from ephemeris asset loading.
    registerCatalogFrames(tree, body, {
      id: body.id,
      frame: 'ICRF_SSB',
      method: 'static',
      validity: 'unbounded',
      certaintyAt: () => 'computed',
      stateAt: (_t, out) => {
        out.fill(0);
        return {
          ok: true,
          frame: 'ICRF_SSB',
          certainty: 'computed',
          stale: false,
        };
      },
    });
  }
  const q = new Float64Array(4);
  // Actual provider coverage includes this 2020 epoch; no extrapolation needed.
  for (const row of fixtures.records.filter(
    (row) => row.tdbSec === 631152000,
  )) {
    expect(
      tree.resolveTextureOrientation(`FIXED:${row.body}`, row.tdbSec, q),
    ).toBe(true);
    const [x, y, z, w] = Array.from(q) as [number, number, number, number];
    const textureMatrix = [
      1 - 2 * (y * y + z * z),
      2 * (x * y - z * w),
      2 * (x * z + y * w),
      2 * (x * y + z * w),
      1 - 2 * (x * x + z * z),
      2 * (y * z - x * w),
      2 * (x * z - y * w),
      2 * (y * z + x * w),
      1 - 2 * (x * x + y * y),
    ];
    for (let r = 0; r < 3; r++) {
      expect(textureMatrix[3 * r]).toBeCloseTo(row.matrix[3 * r]!, 9);
      expect(textureMatrix[3 * r + 1]).toBeCloseTo(row.matrix[3 * r + 2]!, 9);
      expect(textureMatrix[3 * r + 2]).toBeCloseTo(-row.matrix[3 * r + 1]!, 9);
    }
  }
});
