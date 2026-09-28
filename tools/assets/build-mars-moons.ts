import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { BufferGeometry, BufferAttribute } from '../../packages/engine/node_modules/three/build/three.module.js';
import { SimplifyModifier } from '../../packages/engine/node_modules/three/examples/jsm/modifiers/SimplifyModifier.js';

const stage = '.tools/mars-moons';
await mkdir(stage, { recursive: true });
await mkdir('apps/web/public/assets/shapes', { recursive: true });
const manifestPath = 'apps/web/public/assets/textures/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
const publications = [], provenance = [];
for (const [name, radius, file] of [
  ['phobos', 11.267, '24878_Phobos_1_1000.glb'],
  ['deimos', 6.2, '24879_Deimos_1_1000.glb'],
] as const) {
  const page = `https://science.nasa.gov/resource/${name}-mars-moon-3d-model/`;
  const url = `https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/gltf_files/${file}`;
  const source = `assets/source/${name}_vtad.glb`;
  let glb: Buffer;
  try { glb = await readFile(source); } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    glb = Buffer.from(await response.arrayBuffer());
    await writeFile(source, glb);
  }
  if (glb.toString('ascii', 0, 4) !== 'glTF' || glb.readUInt32LE(4) !== 2 || glb.readUInt32LE(8) !== glb.length)
    throw new Error('Invalid GLB');
  const end = 20 + glb.readUInt32LE(12), bin = end + 8;
  const model = JSON.parse(glb.subarray(20, end).toString());
  const node = model.nodes[0];
  if (model.nodes.length !== 1 || node.translation || node.rotation || node.scale || node.matrix)
    throw new Error('Unexpected source transform');
  const primitive = model.meshes[node.mesh].primitives[0];
  function attribute(index: number) {
    const a = model.accessors[index], v = model.bufferViews[a.bufferView];
    if (a.sparse || v.byteStride || v.buffer !== 0) throw new Error('Unsupported accessor');
    const width = a.type === 'VEC3' ? 3 : a.type === 'VEC2' ? 2 : 1;
    const offset = glb.byteOffset + bin + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (a.componentType === 5126) return new Float32Array(glb.buffer, offset, a.count * width);
    if (a.componentType === 5123) return new Uint16Array(glb.buffer, offset, a.count);
    throw new Error('Unexpected component type');
  }
  const original = new BufferGeometry();
  for (const [key, sourceKey, size] of [['position', 'POSITION', 3], ['normal', 'NORMAL', 3], ['uv', 'TEXCOORD_0', 2]] as const)
    original.setAttribute(key, new BufferAttribute(attribute(primitive.attributes[sourceKey]), size));
  original.setIndex(new BufferAttribute(attribute(primitive.indices), 1));
  const geometry = await new SimplifyModifier().modify(original, Math.floor(original.attributes.position.count * 0.8));
  const pos = geometry.attributes.position.array, normals = geometry.attributes.normal.array;
  const uv = geometry.attributes.uv.array, indices = geometry.index!.array;
  const count = pos.length / 3;
  if (count > 65535) throw new Error('Shape index overflow');
  // SHP1: counts, normalized int16 positions, int8 normals, uint16 UVs/indices.
  const packed = Buffer.alloc(12 + count * 13 + indices.length * 2);
  packed.write('SHP1'); packed.writeUInt32LE(count, 4); packed.writeUInt32LE(indices.length, 8);
  let cursor = 12;
  for (const value of pos) { packed.writeInt16LE(Math.round(value / radius * 16384), cursor); cursor += 2; }
  for (const value of normals) packed.writeInt8(Math.round(Math.max(-1, Math.min(1, value)) * 127), cursor++);
  for (const value of uv) { packed.writeUInt16LE(Math.round(value * 65535), cursor); cursor += 2; }
  for (const value of indices) { packed.writeUInt16LE(value, cursor); cursor += 2; }
  const shape = `${stage}/${name}.bin.gz`;
  await writeFile(shape, gzipSync(packed, { level: 9 }));
  const material = model.materials[primitive.material];
  const image = model.images[model.textures[material.pbrMetallicRoughness.baseColorTexture.index].source];
  const view = model.bufferViews[image.bufferView];
  const pixels = glb.subarray(bin + (view.byteOffset ?? 0), bin + (view.byteOffset ?? 0) + view.byteLength);
  const png = `${stage}/${name}.png`, texture = `${stage}/${name}_1024.ktx2`;
  await sharp(pixels).resize(1024, 1024).removeAlpha().png().toFile(png);
  await promisify(execFile)(process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
    ['--t2', '--encode', 'etc1s', '--qlevel', '140', '--clevel', '2', '--genmipmap', '--assign_oetf', 'srgb', texture, png], { windowsHide: true });
  for (const [staged, output, assetName, res] of [
    [shape, `/assets/shapes/${name}.bin.gz`, `${name}_shape`, 0],
    [texture, `/assets/textures/${name}_1024.ktx2`, name, 1024],
  ] as const) {
    const bytes = (await readFile(staged)).length;
    const entry = { name: assetName, res, file: output, bytes, license: 'NASA images and media usage guidelines', credit: 'NASA/JPL-Caltech' };
    const index = manifest.findIndex((m: { file: string }) => m.file === output);
    if (index < 0) manifest.push(entry); else manifest[index] = entry;
    publications.push({ staged, output: `apps/web/public${output}` });
    credits = credits.split('\n').filter(line => !line.startsWith(`| ${output} |`)).join('\n');
    credits += `| ${output} | ${page} | NASA images and media usage guidelines | NASA/JPL-Caltech | Simplified normalized mesh or 1k ETC1S atlas; acquired 2026-09-28 |\n`;
    console.log(output, bytes);
  }
  provenance.push({ name, page, url, source, sha256: createHash('sha256').update(glb).digest('hex'),
    meanRadiusKm: radius, originalVertices: original.attributes.position.count, vertices: count, triangles: indices.length / 3,
    modification: 'Three.js meshoptimizer simplification with normal/UV weights, target 20% triangles. Original origin/axes retained; source km positions divided by catalog mean radius. Positions quantized at 1/16384 radius, normals int8, UVs uint16; gzip. Source atlas resized to 1024 square ETC1S. No scientific orientation inferred.' });
}
const total = manifest.reduce((sum: number, m: { bytes: number }) => sum + m.bytes, 0);
if (total > 80_000_000) throw new Error(`Asset budget exceeded before publication: ${total}`);
for (const item of publications) await rename(item.staged, item.output);
await writeFile(`${stage}/manifest.json`, JSON.stringify(manifest, null, 2));
await rename(`${stage}/manifest.json`, manifestPath);
await writeFile('assets/ASSET_LICENSES.md', credits);
await writeFile('docs/licensing/mars-moon-assets.json', JSON.stringify(provenance, null, 2) + '\n');
console.log(`All assets: ${total}/80000000`);
