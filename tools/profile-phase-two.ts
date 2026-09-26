import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import {
  createBodyProvider,
  JupiterMoonsProvider,
  KeplerProvider,
  SampledEphemerisProvider,
  OsculatingElementsProvider,
  createSolarSystemFrameTree,
  registerEphemerisCorrection,
} from '../packages/astro/src/index';
import type { PositionProvider } from '../packages/domain/src/types';
if (!global.gc)
  throw new Error(
    'Run node --expose-gc --import tsx tools/profile-phase-two.ts',
  );
for (const body of ['sun', 'earth', 'moon', 'mars', 'callisto']) {
  const data = await readFile(`apps/web/public/data/corrections/${body}.bin`);
  registerEphemerisCorrection(
    body === 'callisto' ? body : body[0]!.toUpperCase() + body.slice(1),
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
}
const orbitTable = await readFile('apps/web/public/data/orbits/phobos.bin');
const providers: PositionProvider[] = [
  new OsculatingElementsProvider(
    'phobos-osculating',
    'ICRF_BODY:mars',
    orbitTable.buffer.slice(
      orbitTable.byteOffset,
      orbitTable.byteOffset + orbitTable.byteLength,
    ),
  ),
  createBodyProvider('Earth'),
  new JupiterMoonsProvider('callisto'),
  new KeplerProvider('synthetic-kepler', 'ICRF_BODY:earth', {
    epochTdbSec: 0,
    semiMajorAxisKm: 7000,
    eccentricity: 0.99,
    inclinationRad: 0.2,
    ascendingNodeRad: 0.3,
    argumentOfPeriapsisRad: 0.4,
    meanAnomalyRad: 0.5,
    gravitationalParameterKm3PerSec2: 398600.4418,
  }),
  new SampledEphemerisProvider('synthetic-sampled', 'ICRF_SSB', [
    {
      times: new Float64Array([0, 100000]),
      states: new Float64Array([0, 0, 0, 1, 0, 0, 100000, 0, 0, 1, 0, 0]),
      certainty: 'computed',
    },
  ]),
];
const out = new Float64Array(6),
  samples = [];
for (const provider of providers) {
  for (let i = 0; i < 10000; i++) provider.stateAt(i, out);
  global.gc();
  const before = process.memoryUsage().heapUsed,
    start = performance.now();
  for (let i = 0; i < 100000; i++) {
    if (!provider.stateAt(i, out).ok)
      throw new Error(`${provider.id}: failed state`);
  }
  const elapsedMs = performance.now() - start,
    beforeGc = process.memoryUsage().heapUsed;
  global.gc();
  const retainedGrowthBytes = process.memoryUsage().heapUsed - before;
  samples.push({
    provider: provider.id,
    calls: 100000,
    elapsedMs,
    heapDeltaBeforeGcBytes: beforeGc - before,
    retainedGrowthBytes,
    retainedGrowthUnder1MB: retainedGrowthBytes < 1000000,
    upstreamAllocates:
      provider instanceof JupiterMoonsProvider ||
      provider.id.startsWith('astronomy:'),
  });
}
const tree = createSolarSystemFrameTree(),
  q = new Float64Array(4);
const bodies = ['sun', 'earth', 'moon', 'mars'];
for (let i = 0; i < 1000; i++)
  for (const body of bodies) {
    tree.resolveOrigin(`ICRF_BODY:${body}`, i, out);
    tree.resolveTextureOrientation(`FIXED:${body}`, i, q);
  }
const start = performance.now();
for (let i = 0; i < 10000; i++)
  for (const body of bodies) {
    tree.resolveOrigin(`ICRF_BODY:${body}`, i, out);
    tree.resolveTextureOrientation(`FIXED:${body}`, i, q);
  }
const frameTreeMsPerFrame = (performance.now() - start) / 10000;
const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  samples,
  frameTreeMsPerFrame,
  note: 'Post-GC retained heap growth is a leak check, not proof of zero allocations. Astronomy-engine allocates transient objects. Frame-tree timing includes four corrected origins, texture rotations and numerical rotation derivatives; GPU timing is excluded.',
};
await writeFile(
  'docs/perf/phase-two-providers.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (samples.some((sample) => !sample.retainedGrowthUnder1MB))
  process.exitCode = 1;
