import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// NASA's republished JPL/USGS visualization maps, not calibrated albedo.
const names = ['io', 'europa', 'ganymede', 'callisto'];
const modelFiles: Record<string, string> = {
  europa: 'e/Europa_1_3138.glb',
  ganymede: 'g/Ganymede_1_5268.glb',
  callisto: 'c/Callisto_1_4821.glb',
};

// Extract the actual base-color image, never a normal/roughness texture.
function baseColorImage(glb: Buffer): Buffer {
  if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2 ||
      glb.readUInt32LE(8) !== glb.length || glb.readUInt32LE(16) !== 0x4e4f534a)
    throw new Error('Expected a complete glTF 2 binary with JSON first');
  const jsonEnd = 20 + glb.readUInt32LE(12);
  const model = JSON.parse(glb.subarray(20, jsonEnd).toString());
  if (model.materials.length !== 1 || glb.readUInt32LE(jsonEnd + 4) !== 0x004e4942)
    throw new Error('Unexpected model layout');
  const texture = model.materials[0].pbrMetallicRoughness.baseColorTexture;
  if (texture.texCoord !== 0 || texture.extensions) throw new Error('Unexpected texture coordinates');
  const image = model.images[model.textures[texture.index].source];
  const view = model.bufferViews[image.bufferView];
  const start = jsonEnd + 8 + (view.byteOffset ?? 0);
  if (image.mimeType !== 'image/png' || view.buffer !== 0 || start + view.byteLength > glb.length)
    throw new Error('Invalid embedded base-color image');
  return glb.subarray(start, start + view.byteLength);
}
const stage = '.tools/galilean-assets';
const manifestPath = 'apps/web/public/assets/textures/manifest.json';
const manifest = (JSON.parse(await readFile(manifestPath, 'utf8')) as {
  name: string; res: number; file: string; bytes: number; license: string; credit: string;
}[]).filter(entry => entry.file !== '/assets/textures/io_1440.ktx2');
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
const provenance = [];
const publications: { encoded: string; output: string }[] = [];
await mkdir(stage, { recursive: true });
await mkdir('assets/source', { recursive: true });
for (const name of names) {
  const page = name === 'io'
    ? 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km'
    : `https://science.nasa.gov/resource/${name}-3d-model/`;
  const url = name === 'io'
    ? 'https://planetarymaps.usgs.gov/mosaic/Io_Galileo_SSI_Global_Mosaic_ClrMerge_1km.tif'
    : `https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/${modelFiles[name]}`;
  const source = name === 'io' ? 'assets/source/io_usgs_color_merge.tif' : `assets/source/${name}_vtad.glb`;
  const license = name === 'io' ? 'Public domain (USGS)' : 'NASA images and media usage guidelines';
  const credit = name === 'io' ? 'USGS/NASA/JPL' : 'NASA Visualization Technology Applications and Development (VTAD)';
  let original: Buffer;
  try { original = await readFile(source); }
  catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    original = Buffer.from(await response.arrayBuffer());
    await writeFile(`${source}.download`, original);
    await rename(`${source}.download`, source);
  }
  const pixels = name === 'io' ? original : baseColorImage(original);
  const meta = await sharp(pixels).metadata();
  const dimensions = name === 'io' ? [11445, 5723] : name === 'europa' ? [4096, 2048] : [2048, 1024];
  if (meta.width !== dimensions[0] || meta.height !== dimensions[1]) throw new Error(`${name}: unexpected source dimensions`);
  provenance.push({ name, page, url, source, width: meta.width, height: meta.height,
    sha256: createHash('sha256').update(original).digest('hex'), acquiredOn: '2026-09-27',
    imageSha256: createHash('sha256').update(pixels).digest('hex'),
    credit,
    modification: name === 'io'
      ? '1024/2048-wide ETC1S KTX2 with mipmaps from USGS color-merge mosaic. Source pixel orientation and color retained; one-pixel aspect rounding normalized. No synthesized terrain or displacement.'
      : 'Extract embedded baseColorTexture from NASA VTAD glTF; resize to 1024/1440-wide ETC1S KTX2 with mipmaps. Source pixel orientation and color retained, no tint or synthesized terrain.',
    limitation: name === 'io'
      ? 'Enhanced/false-color Galileo and Voyager merged mosaic with varying spatial resolution; not natural eye color. See USGS product description.'
      : 'NASA visualization texture, not a calibrated true-color or albedo measurement. Regional detail and source processing vary; landmark registration remains separately validated.' });
  // 1440x720 preserves budget headroom and satisfies compression alignment.
  for (const res of [1024, name === 'io' ? 2048 : 1440]) {
    const png = `${stage}/${name}_${res}.png`;
    const encoded = `${stage}/${name}_${res}.ktx2`;
    await sharp(pixels).resize(res, res / 2).removeAlpha().toColourspace('srgb').png().toFile(png);
    await promisify(execFile)(process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
      ['--t2', '--encode', 'etc1s', '--qlevel', '180', '--clevel', '2', '--genmipmap', '--assign_oetf', 'srgb', encoded, png],
      { windowsHide: true });
    const file = `/assets/textures/${name}_${res}.ktx2`;
    const bytes = (await readFile(encoded)).length;
    const entry = { name, res, file, bytes, license, credit };
    const index = manifest.findIndex(m => m.file === file);
    if (index < 0) manifest.push(entry); else manifest[index] = entry;
    publications.push({ encoded, output: `apps/web/public${file}` });
    credits = credits.split('\n').filter(line => !line.startsWith(`| ${file} |`)).join('\n');
    credits += `| ${file} | ${page} | ${license} | ${credit} | Source visualization mosaic; ${res}px ETC1S KTX2; mipmaps; acquired 2026-09-27 |\n`;
    console.log(`${name} ${res}: ${bytes} bytes`);
  }
}
const total = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
if (total > 80_000_000) throw new Error(`Asset budget exceeded before publication: ${total}`);
// Encode outside the watched public directory, then publish only closed files.
for (const item of publications) await rename(item.encoded, item.output);
// Explicit obsolete file only; no recursive/computed directory deletion.
await rm('apps/web/public/assets/textures/io_1440.ktx2', { force: true });
credits = credits.split('\n').filter(line => !line.startsWith('| /assets/textures/io_1440.ktx2 |')).join('\n');
await writeFile(`${stage}/manifest.json`, JSON.stringify(manifest, null, 2));
await rename(`${stage}/manifest.json`, manifestPath);
await writeFile('assets/ASSET_LICENSES.md', credits);
await writeFile('docs/licensing/galilean-assets.json', JSON.stringify(provenance, null, 2) + '\n');
console.log(`Total textures: ${total} / 80000000 bytes`);
