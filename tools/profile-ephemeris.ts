import { performance } from 'node:perf_hooks';
import { createBodyProvider } from '../packages/astro/src/ephemeris/AstronomyEngineProvider';
import { registerEphemerisCorrection } from '../packages/astro/src/ephemeris/ResidualTable';
import { readFile, writeFile } from 'node:fs/promises';
const bodies = ['Sun', 'Earth', 'Moon', 'Mars'];
for (const body of bodies) {
  const b = await readFile(
    `apps/web/public/data/corrections/${body.toLowerCase()}.bin`,
  );
  registerEphemerisCorrection(
    body,
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
}
const providers = bodies.map(createBodyProvider),
  out = new Float64Array(6);
for (let i = 0; i < 1000; i++)
  for (const p of providers) p.stateAt(8e8 + i, out);
const start = performance.now();
for (let i = 0; i < 10000; i++)
  for (const p of providers) p.stateAt(8e8 + i, out);
const msPerFrame = (performance.now() - start) / 10000;
await writeFile(
  'docs/perf/ephemeris-benchmark.json',
  JSON.stringify(
    {
      bodies,
      frames: 10000,
      msPerFrame,
      budgetMs: 0.2,
      pass: msPerFrame < 0.2,
      node: process.version,
    },
    null,
    2,
  ),
);
console.log(`Four bodies: ${msPerFrame.toFixed(4)} ms/frame (budget 0.2 ms)`);
if (msPerFrame >= 0.2) process.exitCode = 1;
