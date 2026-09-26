import { readFile, writeFile } from 'node:fs/promises';
import { BODIES } from '../../packages/domain/src/index';
import { createMeanMoonProvider } from '../../packages/astro/src/ephemeris/createMeanMoonProvider';
import { jdToTdb } from '../../packages/astro/src/time/scales';
const results = [];
for (const moon of ['phobos', 'deimos', 'titan', 'triton', 'charon']) {
  const fixture = JSON.parse(
    await readFile(
      `packages/astro/test/fixtures/phase-two/${moon}.json`,
      'utf8',
    ),
  ) as { rows: string[][] };
  const provider = createMeanMoonProvider(
    BODIES.find((body) => body.id === `moon:${moon}`)!,
  );
  const out = new Float64Array(6);
  for (const raw of fixture.rows) {
    const row = raw.map(Number);
    provider.stateAt(jdToTdb(row[0]!), out);
    const radiusKm = Math.hypot(row[2]!, row[3]!, row[4]!);
    const errorKm = Math.hypot(
      out[0]! - row[2]!,
      out[1]! - row[3]!,
      out[2]! - row[4]!,
    );
    results.push({
      moon,
      jdTdb: row[0],
      errorKm,
      relativeVectorError: errorKm / radiusKm,
    });
  }
}
await writeFile(
  'docs/science/mean-moon-validation.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      status: 'NOT ACCEPTED FOR RENDERING',
      note: 'Rounded mean-element models have unresolved epoch/reference-plane/precession conventions and long-term drift. This model path is excluded from rendering; the five bodies now use independently validated osculating snapshot models. Two expected-failure diagnostic tests retain the 2% epoch geometry target; these are not science passes.',
      results,
    },
    null,
    2,
  ),
);
console.log(
  'Saved unresolved mean-moon accuracy report; no rendering acceptance claimed.',
);
