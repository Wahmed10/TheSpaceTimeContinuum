import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { BODIES } from '@space/domain';
import { createMeanMoonProvider } from '../src/ephemeris/createMeanMoonProvider';
import { jdToTdb } from '../src/time/scales';
for (const moon of ['phobos', 'deimos', 'titan', 'triton', 'charon']) {
  const scienceCheck = ['titan', 'triton'].includes(moon) ? it.fails : it;
  // Known source/model discrepancies: keep the same threshold and exclude these
  // models from rendering. Catalog bodies now use osculating snapshots instead.
  scienceCheck(
    `${moon}: approximate mean elements agree with independent epoch geometry`,
    () => {
      const fixture = JSON.parse(
        readFileSync(
          new URL(`./fixtures/phase-two/${moon}.json`, import.meta.url),
          'utf8',
        ),
      ) as { rows: string[][] };
      const provider = createMeanMoonProvider(
        BODIES.find((body) => body.id === `moon:${moon}`)!,
      );
      const out = new Float64Array(6),
        before = new Float64Array(6),
        after = new Float64Array(6);
      const row = fixture.rows[0]!.map(Number),
        t = jdToTdb(row[0]!);
      expect(provider.stateAt(t, out)).toMatchObject({
        ok: true,
        certainty: 'approximate',
      });
      const error = Math.hypot(
        out[0]! - row[2]!,
        out[1]! - row[3]!,
        out[2]! - row[4]!,
      );
      expect(error / Math.hypot(row[2]!, row[3]!, row[4]!)).toBeLessThan(0.02);
      for (const at of [t, t + 86400, 8e8]) {
        provider.stateAt(at, out);
        provider.stateAt(at - 0.5, before);
        provider.stateAt(at + 0.5, after);
        for (let i = 0; i < 3; i++)
          expect(after[i]! - before[i]!).toBeCloseTo(out[i + 3]!, 5);
      }
      expect(provider.stateAt(NaN, out).ok).toBe(false);
    },
  );
}
