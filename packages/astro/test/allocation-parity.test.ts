import { expect, it } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { createRequire } from 'node:module';
import fixture from './fixtures/astronomy-upstream-parity.json';

const vector = (s: Astronomy.StateVector) => [s.x, s.y, s.z, s.vx, s.vy, s.vz];

const commonjs: typeof Astronomy = createRequire(import.meta.url)(
  'astronomy-engine',
);
it.each([
  ['ESM', Astronomy],
  ['CommonJS', commonjs],
] as const)(
  '%s preserves unmodified upstream positions and velocities across 1900-2100',
  (_name, library) => {
    // Reverse order exercises scratch reset and cache changes instead of only
    // increasing dates. Public return objects must retain independent ownership.
    for (const sample of [...fixture.samples].reverse()) {
      const time = library.AstroTime.FromTerrestrialTime(sample.tt);
      for (const [body, expected] of Object.entries(sample.planets)) {
        const state = library.BaryState(body as Astronomy.Body, time);
        expect(vector(state)).toEqual(expected);
        library.BaryState(Astronomy.Body.Moon, time.AddDays(12.345));
        expect(vector(state)).toEqual(expected);
      }
      const moons = library.JupiterMoons(time);
      library.JupiterMoons(time.AddDays(-45.678));
      for (const [body, expected] of Object.entries(sample.moons))
        expect(vector(moons[body as keyof Astronomy.JupiterMoonsInfo])).toEqual(
          expected,
        );
    }
  },
);
