import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const sources = [
  { name: 'pluto', source: 'pluto_nh_color.jpg',
    url: 'https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/l/pluto_color_mapmosaic.jpg?crop=faces%2Cfocalpoint&fit=clip&h=2963&w=5926',
    page: 'https://science.nasa.gov/resource/pluto-global-color-map/' },
  { name: 'charon', source: 'charon_nh_basemap.jpg',
    url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia21/pia21860/figures/PIA21860_fig1_full.jpg',
    page: 'https://www.jpl.nasa.gov/images/pia21860-charons-surface-in-detail/' },
];
const manifestPath = 'apps/web/public/assets/textures/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  name: string; res: number; file: string; bytes: number; license: string; credit: string;
}[];
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
await mkdir('.tools/new-horizons-assets', { recursive: true });
await mkdir('assets/source', { recursive: true });
const provenance = [];
const publications: { encoded: string; output: string }[] = [];
for (const source of sources) {
  let original: Buffer;
  try { original = await readFile(`assets/source/${source.source}`); }
  catch {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
    original = Buffer.from(await response.arrayBuffer());
    await writeFile(`assets/source/${source.source}`, original);
  }
  const meta = await sharp(original).metadata();
  // The published Charon JPEG rounds its width to 12693 versus 6347 rows.
  if (Math.abs(meta.width! - meta.height! * 2) > 1) throw new Error(`${source.name}: expected a full 2:1 cylindrical map`);
  provenance.push({ ...source, sha256: createHash('sha256').update(original).digest('hex'),
    width: meta.width, height: meta.height, acquiredOn: '2026-09-27',
    credit: 'NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute',
    modification: 'South-edge connected black no-data replaced by uniform neutral gray; 180-degree longitude shift; 1k/2k ETC1S KTX2 with mipmaps. No terrain synthesized.' });
  for (const res of [1024, 2048]) {
    const height = res / 2;
    const pixels = await sharp(original).resize(res, height).removeAlpha().toColourspace('srgb').raw().toBuffer();
    // Only replace black connected to the south edge. Dark craters/markings
    // elsewhere must remain intact. Preserve all observed pixels above it.
    for (let x = 0; x < res; x++) {
      for (let y = height - 1; y >= 0; y--) {
        const i = (y * res + x) * 3;
        if (Math.max(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!) > 12) break;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 145;
      }
    }
    // Sources have 180 E at center; engine texture center is longitude zero.
    const shifted = Buffer.alloc(pixels.length);
    const half = res / 2 * 3;
    for (let y = 0; y < height; y++) {
      const start = y * res * 3;
      pixels.copy(shifted, start, start + half, start + res * 3);
      pixels.copy(shifted, start + half, start, start + half);
    }
    const png = `.tools/new-horizons-assets/${source.name}_${res}.png`;
    const encoded = `.tools/new-horizons-assets/${source.name}_${res}.ktx2`;
    await sharp(shifted, { raw: { width: res, height, channels: 3 } }).png().toFile(png);
    await promisify(execFile)(process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
      ['--t2', '--encode', 'etc1s', '--qlevel', '180', '--clevel', '2', '--genmipmap', '--assign_oetf', 'srgb', encoded, png],
      { windowsHide: true });
    const file = `/assets/textures/${source.name}_${res}.ktx2`;
    const bytes = (await readFile(encoded)).length;
    const entry = { name: source.name, res, file, bytes, license: 'NASA/JPL image use policy', credit: 'NASA/JHUAPL/SwRI' };
    const index = manifest.findIndex(m => m.file === file);
    const total = manifest.reduce((sum, m) => sum + m.bytes, 0) - (index < 0 ? 0 : manifest[index]!.bytes) + bytes;
    if (total > 80_000_000) throw new Error(`Asset budget exceeded before publication: ${total}`);
    publications.push({ encoded, output: `apps/web/public${file}` });
    if (index < 0) manifest.push(entry); else manifest[index] = entry;
    if (!credits.includes(file)) credits += `| ${file} | ${source.page} | NASA/JPL image use policy | NASA/JHUAPL/SwRI | Neutral unmapped south; longitude shift; ${res}px ETC1S KTX2; mipmaps; acquired 2026-09-27 |\n`;
    console.log(`${source.name} ${res}: ${bytes} bytes`);
  }
}
// Publish metadata after all assets are ready; never expose partially written JSON.
for (const item of publications) await rename(item.encoded, item.output);
await writeFile('.tools/new-horizons-assets/manifest.json', JSON.stringify(manifest, null, 2));
await rename('.tools/new-horizons-assets/manifest.json', manifestPath);
await writeFile('assets/ASSET_LICENSES.md', credits);
await writeFile('docs/licensing/new-horizons-assets.json', JSON.stringify(provenance, null, 2) + '\n');
