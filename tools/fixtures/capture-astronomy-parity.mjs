import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Explicit regeneration only. Never obtain expected values from the patched
// dependency: this checksum pins the original npm 2.1.19 CommonJS source.
if (!process.argv[2])
  throw new Error(
    'Pass the unmodified astronomy-engine 2.1.19 astronomy.js file',
  );
const path = resolve(process.argv[2]);
const source = await readFile(path);
const sha256 = createHash('sha256').update(source).digest('hex');
if (
  sha256 !== '729c0ce37cc1a8096034a689039a5f04585ee8184177c638e8c74dec4fa3185a'
)
  throw new Error(
    'Source is not the original pinned astronomy-engine CommonJS file',
  );
const upstream = createRequire(import.meta.url)(path);
const bodies = [
  'Sun',
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Moon',
];
const vector = (s) => [s.x, s.y, s.z, s.vx, s.vy, s.vz];
const samples = [];
for (let i = 0; i <= 32; i++) {
  const tt = -36524.5 + (i * 73050) / 32;
  const time = upstream.AstroTime.FromTerrestrialTime(tt);
  const planets = Object.fromEntries(
    bodies.map((body) => [body, vector(upstream.BaryState(body, time))]),
  );
  const moons = upstream.JupiterMoons(time);
  samples.push({
    tt,
    planets,
    moons: Object.fromEntries(
      ['io', 'europa', 'ganymede', 'callisto'].map((body) => [
        body,
        vector(moons[body]),
      ]),
    ),
  });
}
await writeFile(
  'packages/astro/test/fixtures/astronomy-upstream-parity.json',
  JSON.stringify(
    {
      source:
        'Unmodified astronomy-engine npm 2.1.19 CommonJS export; no fitted values. TT days spanning 1900-2100, 33 epochs, 15 bodies. Positions AU, velocities AU/day, EQJ. Original public state outputs retained for allocation-patch parity.',
      sourceSha256: sha256,
      samples,
    },
    null,
    2,
  ) + '\n',
);
