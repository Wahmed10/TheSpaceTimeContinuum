import { Session } from 'node:inspector';
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import {
  createBodyProvider,
  JupiterMoonsProvider,
  KeplerProvider,
  registerEphemerisCorrection,
} from '../packages/astro/src/index.ts';

if (!global.gc)
  throw new Error(
    'Run node --expose-gc --import tsx tools/profile-allocations.mjs',
  );
const output = process.argv[2] ?? '.tools/allocations.json';
for (const body of ['earth', 'moon', 'callisto']) {
  const bytes = await readFile(`apps/web/public/data/corrections/${body}.bin`);
  registerEphemerisCorrection(
    body === 'callisto' ? body : body[0].toUpperCase() + body.slice(1),
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}
const providers = [
  createBodyProvider('Earth'),
  createBodyProvider('Moon'),
  new JupiterMoonsProvider('callisto'),
  new KeplerProvider('allocation-control', 'ICRF_BODY:earth', {
    epochTdbSec: 0,
    semiMajorAxisKm: 7000,
    eccentricity: 0.01,
    inclinationRad: 0.2,
    ascendingNodeRad: 0.3,
    argumentOfPeriapsisRad: 0.4,
    meanAnomalyRad: 0.5,
    gravitationalParameterKm3PerSec2: 398600.4418,
  }),
];
const session = new Session();
session.connect();
const post = (method, params = {}) =>
  new Promise((resolve, reject) =>
    session.post(method, params, (error, result) =>
      error ? reject(error) : resolve(result),
    ),
  );
const flush = () => new Promise((resolve) => setImmediate(resolve));
const gcEvents = [];
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries())
    gcEvents.push({
      durationMs: entry.duration,
      kind: entry.detail.kind,
      startMs: entry.startTime,
    });
});
observer.observe({ entryTypes: ['gc'] });
const out = new Float64Array(6);
const samples = [];
try {
  for (const provider of providers) {
    for (let i = 0; i < 10000; i++) provider.stateAt(i, out);
    global.gc();
    await flush();
    const before = process.memoryUsage().heapUsed;
    const started = performance.now();
    for (let i = 0; i < 100000; i++) {
      if (!provider.stateAt(i, out).ok)
        throw new Error(`${provider.id}: invalid state`);
    }
    const ended = performance.now();
    await flush();
    await flush();
    const observed = gcEvents.filter(
      (event) => event.startMs >= started && event.startMs <= ended,
    );
    global.gc();
    const retainedGrowthBytes = process.memoryUsage().heapUsed - before;
    await flush();
    // Include objects collected during sampling: retained-heap-only profiling
    // would miss the transient objects this investigation is intended to find.
    await post('HeapProfiler.startSampling', {
      samplingInterval: 1024,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    for (let i = 0; i < 10000; i++) provider.stateAt(i, out);
    const { profile } = await post('HeapProfiler.stopSampling');
    const bySite = new Map();
    function visit(node) {
      if (node.selfSize) {
        const frame = node.callFrame;
        const url = frame.url.replaceAll('\\', '/');
        const file = url.includes('astronomy-engine')
          ? `astronomy-engine/${url.split('/').at(-1)}`
          : url.includes('/packages/')
            ? `packages/${url.split('/packages/')[1]}`
            : frame.functionName;
        const key = `${file}:${frame.lineNumber + 1} ${frame.functionName || '(anonymous)'}`;
        bySite.set(key, (bySite.get(key) ?? 0) + node.selfSize);
      }
      for (const child of node.children) visit(child);
    }
    visit(profile.head);
    const sites = [...bySite]
      .map(([site, estimatedBytes]) => ({ site, estimatedBytes }))
      .sort((a, b) => b.estimatedBytes - a.estimatedBytes);
    samples.push({
      provider: provider.id,
      timedCalls: 100000,
      elapsedMs: ended - started,
      retainedGrowthBytes,
      observedGcCount: observed.length,
      observedGcTotalMs: observed.reduce(
        (sum, event) => sum + event.durationMs,
        0,
      ),
      observedGcMaxMs: Math.max(
        0,
        ...observed.map((event) => event.durationMs),
      ),
      profiledCalls: 10000,
      estimatedSampledAllocationBytes: sites.reduce(
        (sum, site) => sum + site.estimatedBytes,
        0,
      ),
      sites: sites.slice(0, 15),
    });
    console.log(
      `${provider.id}: timing and transient allocation profile complete`,
    );
  }
} finally {
  observer.disconnect();
  session.disconnect();
}
await writeFile(
  output,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      method:
        'Warmed providers at changing one-second epochs near J2000. Separate uninstrumented 100k-call timing/GC observation and 10k-call V8 allocation sampling including collected objects. Sampling is statistical, not a proof of zero allocations; no browser frame-pause claim. Explicit GC excluded from observed-workload counts. Retained growth includes measurement bookkeeping.',
      samples,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Saved ${output}`);
