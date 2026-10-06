import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EXPLORABLE_BODIES } from '../../packages/domain/src/index';
import {
  MIN_UTC_MS,
  MAX_UTC_MS,
} from '../../packages/astro/src/time/constants';
import { utcMsToTdb } from '../../packages/astro/src/time/scales';
import {
  decodeRuntimeChunk,
  runtimeChunkIndex,
} from '../../packages/astro/src/ephemeris/RuntimeChunk';
import type {
  RuntimeBody,
  RuntimeChunkManifest,
} from '../../packages/astro/src/ephemeris/RuntimeChunk';
import { encodeRuntimeChunk } from './encode-runtime-chunk';

const check = process.argv.includes('--check'),
  publicRoot = 'apps/web/public/data/chunks';
const names = [
  ...EXPLORABLE_BODIES.flatMap((body) =>
    body.astronomyBody ? [body.astronomyBody] : [],
  ),
  'callisto',
];
const hash = createHash('sha256');
for (const file of [
  'tools/fixtures/encode-runtime-chunk.ts',
  'packages/astro/src/ephemeris/RuntimeChunk.ts',
  'packages/astro/src/ephemeris/PolynomialCorrection.ts',
  'packages/astro/src/ephemeris/OsculatingElementsProvider.ts',
])
  // Git checkouts may use CRLF on Windows; source identity must be portable.
  hash.update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
function load(
  id: string,
  kind: RuntimeBody['kind'],
  frame: RuntimeBody['frame'],
  file: string,
) {
  const bytes = readFileSync(file);
  hash.update(file).update(bytes);
  const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
    view = new DataView(buffer);
  return {
    body: {
      id,
      kind,
      frame,
      startTdbSec: view.getFloat64(0, true),
      stepSec: view.getFloat64(8, true),
      count: view.getFloat64(16, true),
    } as RuntimeBody,
    buffer,
  };
}
const inputs = [
  ...names.map((name) =>
    load(
      name,
      'correction',
      name === 'callisto' ? 'ICRF_BODY:jupiter' : 'ICRF_SSB',
      `apps/web/public/data/corrections/${name.toLowerCase()}.bin`,
    ),
  ),
  ...EXPLORABLE_BODIES.filter(
    (body) => body.provenance.providerId === 'jpl-horizons-orbital-elements',
  ).map((body) =>
    load(
      body.id,
      'orbit',
      body.parentId === 'star:sun'
        ? 'ICRF_HELIO'
        : (`ICRF_BODY:${body.parentId!.split(':')[1]}` as RuntimeBody['frame']),
      `apps/web/public/data/orbits/${body.id.split(':')[1]}.bin`,
    ),
  ),
];
const manifest: RuntimeChunkManifest = {
  format: 1,
  version: hash.digest('hex'),
  fromIndex: runtimeChunkIndex(utcMsToTdb(MIN_UTC_MS)),
  toIndex: runtimeChunkIndex(utcMsToTdb(MAX_UTC_MS)),
  bodies: inputs.map((input) => input.body),
};
const folder = `${publicRoot}/${manifest.version}`,
  manifestFile = 'packages/engine/src/assets/runtime-chunks.json';
if (!check) mkdirSync(folder, { recursive: true });
let totalBytes = 0,
  maxBytes = 0,
  maxCorrectionBytes = 0;
for (let index = manifest.fromIndex; index <= manifest.toIndex; index++) {
  const encoded = encodeRuntimeChunk(index, inputs),
    chunk = decodeRuntimeChunk(encoded, index, manifest);
  const correctionBytes = Array.from(chunk.corrections.values()).reduce(
    (sum, c) => sum + 48 + c.intervalCount * 96,
    0,
  );
  if (encoded.byteLength > 16384 || correctionBytes > 8192)
    throw Error(
      `Current-date data budget exceeded at ${index}: ${encoded.byteLength} total / ${correctionBytes} correction bytes`,
    );
  const file = `${folder}/${index}.bin`;
  if (check) {
    if (!readFileSync(file).equals(Buffer.from(encoded)))
      throw Error(`Stale runtime chunk ${file}`);
  } else writeFileSync(file, Buffer.from(encoded));
  totalBytes += encoded.byteLength;
  maxBytes = Math.max(maxBytes, encoded.byteLength);
  maxCorrectionBytes = Math.max(maxCorrectionBytes, correctionBytes);
}
const metadata = JSON.stringify(manifest, null, 2) + '\n';
for (const file of [manifestFile, `${folder}/manifest.json`]) {
  if (check) {
    if (readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== metadata)
      throw Error(`Stale chunk manifest ${file}`);
  } else writeFileSync(file, metadata);
}
console.log(
  JSON.stringify(
    {
      mode: check ? 'verified' : 'generated',
      version: manifest.version,
      chunks: manifest.toIndex - manifest.fromIndex + 1,
      totalBytes,
      maxBytes,
      maxCorrectionBytes,
      manifestBytes: Buffer.byteLength(metadata),
    },
    null,
    2,
  ),
);
