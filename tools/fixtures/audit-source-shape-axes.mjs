import { readFile, writeFile } from 'node:fs/promises';
const cache = process.argv[2] ?? '.tools/surface-audit';
const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ],
  reports = [];
for (const [name, file, step] of [
  ['phobos', 'm1phobos', 2],
  ['deimos', 'm2deimos', 5],
]) {
  const rows = (await readFile(`${cache}/${file}.tab`, 'utf8'))
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/).map(Number));
  const cols = 360 / step + 1;
  const grid = (lat, lon) => {
    let a = (lat + 90) / step,
      b = (((lon % 360) + 360) % 360) / step;
    const i = Math.min(Math.floor(a), 180 / step - 1),
      j = Math.floor(b);
    a -= i;
    b -= j;
    return (
      (1 - a) *
        ((1 - b) * rows[i * cols + j][2] + b * rows[i * cols + j + 1][2]) +
      a *
        ((1 - b) * rows[(i + 1) * cols + j][2] +
          b * rows[(i + 1) * cols + j + 1][2])
    );
  };
  const glb = await readFile(`assets/source/${name}_vtad.glb`);
  const end = 20 + glb.readUInt32LE(12),
    model = JSON.parse(glb.subarray(20, end)),
    bin = end + 8;
  const a = model.accessors[model.meshes[0].primitives[0].attributes.POSITION],
    v = model.bufferViews[a.bufferView];
  const pos = new Float32Array(
    glb.buffer,
    glb.byteOffset + bin + (v.byteOffset ?? 0) + (a.byteOffset ?? 0),
    a.count * 3,
  );
  const candidates = [];
  for (const p of perms)
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          const s = [sx, sy, sz];
          let e = 0;
          for (let i = 0; i < pos.length; i += 3) {
            const q = p.map((k, j) => s[j] * pos[i + k]);
            const r = Math.hypot(...q),
              lat = (Math.asin(q[2] / r) * 180) / Math.PI,
              lon = (Math.atan2(-q[1], q[0]) * 180) / Math.PI;
            const d = r - grid(lat, lon);
            e += d * d;
          }
          const parity = ((p[0] - p[1]) * (p[1] - p[2]) * (p[2] - p[0])) / 2;
          candidates.push({
            axes: p.map((k, j) => `${s[j] < 0 ? '-' : '+'}${'XYZ'[k]}`),
            det: parity * sx * sy * sz,
            rmsKm: Math.sqrt(e / a.count),
          });
        }
  candidates.sort((a, b) => a.rmsKm - b.rmsKm);
  console.log(name, a.count, JSON.stringify(candidates.slice(0, 8), null, 2));
  reports.push({
    name,
    sourceVertices: a.count,
    longitudeInterpretation:
      'grid positive west inferred independently from IAU_PHOBOS DSK; reflection candidates retained for diagnosis',
    candidates,
  });
}
await writeFile(
  `${cache}/shape-grid-comparison.json`,
  JSON.stringify(reports, null, 2),
);
