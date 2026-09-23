import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const root = 'apps/web/.next/static/chunks';
const rows = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) await walk(path);
    else if (e.name.endsWith('.js')) {
      const buf = await readFile(path);
      rows.push({
        file: path.replace(root + '/', ''),
        bytes: buf.length,
        gzipBytes: gzipSync(buf).length,
      });
    }
  }
}
await walk(root);
rows.sort((a, b) => b.gzipBytes - a.gzipBytes);
console.table(rows.slice(0, 10));
await writeFile(
  'docs/perf/bundle-sizes.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Individual emitted chunks, not a route attribution report; engine dependencies may span several chunks.',
      rows,
    },
    null,
    2,
  ),
);
