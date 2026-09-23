import { readFileSync, readdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { createBodyProvider } from '../src/ephemeris/AstronomyEngineProvider';
import { jdToTdb } from '../src/time/scales';
import {registerEphemerisCorrection} from '../src/ephemeris/ResidualTable';
const names: Record<string, string> = {
  '10': 'Sun',
  '199': 'Mercury',
  '299': 'Venus',
  '399': 'Earth',
  '301': 'Moon',
  '499': 'Mars',
  '599': 'Jupiter',
  '699': 'Saturn',
  '799': 'Uranus',
  '899': 'Neptune',
  '999': 'Pluto',
};
const dir = new URL('./fixtures/horizons/', import.meta.url);
for (const file of readdirSync(dir)) {
  const name = names[file.split('_')[0]!]!;
  const data=readFileSync(new URL(`../../../apps/web/public/data/corrections/${name.toLowerCase()}.bin`,import.meta.url));
  registerEphemerisCorrection(name,data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  const fixture = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as {
    rows: { jdTdb: number; x: number; y: number; z: number }[];
  };
  it(`${name}: independent JPL Horizons vectors at five epochs`, () => {
    const provider = createBodyProvider(name);
    const out = new Float64Array(6);
    for (const r of fixture.rows) {
      expect(provider.stateAt(jdToTdb(r.jdTdb), out).ok).toBe(true);
      const norm = Math.hypot(r.x, r.y, r.z);
      const distance = Math.hypot(out[0]!, out[1]!, out[2]!);
      const angle =
        Math.atan2(
          Math.hypot(
            out[1]! * r.z - out[2]! * r.y,
            out[2]! * r.x - out[0]! * r.z,
            out[0]! * r.y - out[1]! * r.x,
          ),
          out[0]! * r.x + out[1]! * r.y + out[2]! * r.z,
        ) * 206264.806;
      expect(angle, `${name} JD ${r.jdTdb} angle`).toBeLessThan(30);
      expect(
        Math.abs(distance - norm) / norm,
        `${name} JD ${r.jdTdb} distance`,
      ).toBeLessThan(1e-5);
    }
  });
}
