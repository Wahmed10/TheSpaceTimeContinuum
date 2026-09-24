import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { EXRLoader } from '../../packages/engine/node_modules/three/examples/jsm/loaders/EXRLoader.js';
import { FloatType } from '../../packages/engine/node_modules/three/build/three.core.js';
const source =
  'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr';
let raw: Buffer;
try {
  raw = await readFile('assets/source/milkyway_2020_4k.exr');
} catch {
  const r = await fetch(source);
  if (!r.ok) throw new Error(`Sky source: ${r.status}`);
  raw = Buffer.from(await r.arrayBuffer());
  await writeFile('assets/source/milkyway_2020_4k.exr', raw);
}
const decoded = new EXRLoader()
  .setDataType(FloatType)
  .parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const pixels = decoded.data as Float32Array,
  channels = pixels.length / (decoded.width * decoded.height),
  rgb = Buffer.alloc(decoded.width * decoded.height * 3);
for (let p = 0; p < decoded.width * decoded.height; p++)
  for (let c = 0; c < 3; c++) {
    const linear = Math.max(0, pixels[p * channels + c]!);
    const tone = linear / (1 + linear);
    rgb[p * 3 + c] = Math.round(
      255 *
        (tone <= 0.0031308 ? 12.92 * tone : 1.055 * tone ** (1 / 2.4) - 0.055),
    );
  }
const manifestPath = 'apps/web/public/assets/textures/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  file: string;
}[];
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
for (const res of [1024, 2048, 4096]) {
  const file = `/assets/textures/stars_milky_way_${res}.ktx2`,
    png = `assets/source/ktx/stars_milky_way_${res}.png`;
  // EXRLoader returns bottom-up scanlines; PNG/KTX pipeline uses top-down.
  await sharp(rgb, {
    raw: { width: decoded.width, height: decoded.height, channels: 3 },
  })
    .flip()
    .resize({ width: res })
    .png()
    .toFile(png);
  await promisify(execFile)(
    process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
    [
      '--t2',
      '--encode',
      'etc1s',
      '--qlevel',
      '255',
      '--clevel',
      '3',
      '--genmipmap',
      '--assign_oetf',
      'srgb',
      `apps/web/public${file}`,
      png,
    ],
    { windowsHide: true },
  );
  const index = manifest.findIndex((m) => m.file === file);
  if (index >= 0) manifest.splice(index, 1);
  manifest.push({
    name: 'stars_milky_way',
    res,
    file,
    bytes: (await stat(`apps/web/public${file}`)).size,
    license: 'NASA-media-guidelines',
    credit: 'NASA SVS / Ernie Wright',
  } as { file: string });
  credits = credits
    .split('\n')
    .filter((line) => !line.includes(`| ${file} |`))
    .join('\n');
  credits += `| ${file} | ${source} | NASA media guidelines | NASA GSFC SVS, Ernie Wright | Deep Star Maps 2020 faint-star background; Reinhard tone mapping, sRGB, resize, KTX2 |\n`;
  console.log(`Sky ${res}`);
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile('assets/ASSET_LICENSES.md', credits);
