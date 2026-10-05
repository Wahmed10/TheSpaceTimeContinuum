import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

// Conservative emitted-byte gate: all browser JS/CSS, including unused routes,
// plus the largest HTML document and critical assets. Live CDP measurements
// separately count actual transfer bytes, headers and overlapping requests.
const root = process.cwd();
const build = resolve(process.argv[2] ?? 'apps/web/.next');
const publicDir = resolve('apps/web/public');
const cap = 1_500_000;
function files(dir, pattern) {
  if (!existsSync(dir)) throw Error('Startup budget input missing: ' + dir);
  return readdirSync(dir, { recursive: true })
    .filter((file) => pattern.test(file))
    .map((file) => resolve(dir, file));
}
function measured(file, compressed = true) {
  const raw = readFileSync(file);
  if (!raw.length) throw Error('Empty startup budget input: ' + file);
  return {
    file: relative(root, file),
    bytes: compressed ? gzipSync(raw, { level: 6 }).length : raw.length,
  };
}
const scripts = files(resolve(build, 'static'), /\.js$/).map((file) =>
  measured(file),
);
const styles = files(resolve(build, 'static'), /\.css$/).map((file) =>
  measured(file),
);
const documents = files(resolve(build, 'server/app'), /\.html$/).map((file) =>
  measured(file),
);
if (!scripts.length || !styles.length || !documents.length)
  throw Error('Incomplete emitted startup accounting');
const manifest = JSON.parse(
  readFileSync('packages/engine/src/assets/runtime-chunks.json', 'utf8'),
);
if (manifest.format !== 1 || !/^[a-f0-9]{64}$/.test(manifest.version))
  throw Error('Invalid runtime chunk metadata');
const chunks = files(
  resolve(publicDir, 'data/chunks', manifest.version),
  /\.bin$/,
).map((file) => measured(file, false));
if (chunks.length !== manifest.toIndex - manifest.fromIndex + 1)
  throw Error('Incomplete chunk budget accounting');
const critical = [
  measured(resolve(publicDir, 'data/stars.bin'), false),
  measured(resolve(publicDir, 'assets/textures/manifest.json'), false),
  measured(resolve(publicDir, 'assets/shapes/phobos.bin.gz'), false),
  measured(resolve(publicDir, 'assets/shapes/deimos.bin.gz'), false),
  {
    file: 'maximum current-date bundle',
    bytes: Math.max(...chunks.map((entry) => entry.bytes)),
  },
];
const html = documents.reduce((a, b) => (a.bytes > b.bytes ? a : b));
const reserve = 64_000; // Response headers, flight/prefetch metadata and route variance.
const total = [...scripts, ...styles, html, ...critical].reduce(
  (n, entry) => n + entry.bytes,
  reserve,
);
const report = {
  measuredAt: new Date().toISOString(),
  cap,
  total,
  reserve,
  passed: total <= cap,
  method:
    'All emitted browser JS/CSS gzip level6; largest HTML gzip; critical static data counted uncompressed; maximum one date bundle; 64KB header/flight reserve. Texture/basis and curve/prefetch work deferred beyond first paint. Live CDP cap is a separate acceptance gate.',
  scripts,
  styles,
  html,
  critical,
};
writeFileSync(
  resolve(build, 'startup-budget.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    cap,
    total,
    passed: report.passed,
    scripts: scripts.length,
    report: resolve(build, 'startup-budget.json'),
  }),
);
if (!report.passed)
  throw Error(`Startup download budget exceeded: ${total} > ${cap}`);
