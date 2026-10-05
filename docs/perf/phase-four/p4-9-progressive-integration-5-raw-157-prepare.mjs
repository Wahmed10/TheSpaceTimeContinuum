import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = process.cwd(), dir = resolve('.tools/phase-four/p4-9/progressive-integration-5'), candidate = resolve(dir, 'candidate');
const read = f => JSON.parse(readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const hash = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const previous = read('.tools/phase-four/p4-9/progressive-integration-4/launch.json');
const diagnosticPath = '.tools/phase-four/p4-9/cpu-investigation-3';
const diagnostic = read(resolve(diagnosticPath, 'review.json'));
const git = (args, cwd = root) => {
  const response = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 40 * 1024 * 1024 });
  if (response.status !== 0) throw Error(response.stderr);
  return response.stdout.trim();
};
if (existsSync(resolve(dir, 'launch.json')) || existsSync(candidate)) throw Error('Fresh run only; never overwrite reviewed evidence');
if (diagnostic.verdict !== 'reviewed-pass' || !diagnostic.diagnosticOnly || diagnostic.sourceSha256 !== previous.sourceSha256 || diagnostic.resultSha256 !== hash(resolve(diagnosticPath, 'result.json'))) throw Error('Exact previous-source native diagnostic review missing');
for (const entry of previous.preservedEvidence) if (hash(resolve(root, entry.file)) !== entry.sha256) throw Error('Preserved user evidence changed: ' + entry.file);
const paths = ['apps/web/src','apps/web/test','apps/web/public/assets','apps/web/public/data','apps/web/next.config.ts','apps/web/package.json','packages','e2e','tools','package.json','README.md','docs/IMPLEMENTATION_STATUS.md','docs/adr/0011-consumer-route-state.md','docs/PHASE_4_PROGRESSIVE_LOADING_PLAN.md','docs/science/analytic-ephemeris-audit.json','docs/science/analytic-ephemeris-audit.md'];
const tracked = git(['ls-files','--',...paths]).split('\n').filter(Boolean);
const added = git(['ls-files','--others','--exclude-standard','--',...paths]).split('\n').filter(Boolean);
const files = [...new Set([...previous.source.map(entry => entry.file), ...tracked, ...added])].sort();
const deleted = files.filter(file => !existsSync(resolve(root, file)));
if (deleted.length || files.includes('PHASE_4_IMPLEMENTATION_HANDOFF.md') || files.includes('docs/PHASE_4_CHECKPOINT.md')) throw Error('Unexpected deletion or frozen handoff');
const source = files.map(file => ({ file, sha256: hash(resolve(root, file)) }));
const previousMap = new Map(previous.source.map(entry => [entry.file, entry.sha256]));
const changes = source.filter(entry => previousMap.get(entry.file) !== entry.sha256);
const allowed = ['packages/engine/src/layers/OrbitLayer.ts','packages/engine/test/orbits.test.ts','tools/run-phase-four-validation.mjs','tools/cpu-validation-plan.mjs','tools/cpu-validation-plan.test.mjs','docs/IMPLEMENTATION_STATUS.md'];
if (changes.length !== allowed.length || changes.some(entry => !allowed.includes(entry.file))) throw Error('Unexpected changed source: ' + JSON.stringify(changes.map(entry => entry.file)));
const candidateCommit = git(['rev-parse','HEAD']);
if (candidateCommit !== previous.candidateCommit) throw Error('Unexpected HEAD change');
const cpuReference = previous.cpuReference;
if (git(['rev-parse','HEAD'],cpuReference.checkout) !== '4409ef5d8f97299d9058360c97d560493d067c1c') throw Error('Wrong immutable CPU reference');
for (const entry of cpuReference.source) if (hash(resolve(cpuReference.checkout,entry.file)) !== entry.sha256) throw Error('Reference source changed: ' + entry.file);
if (git(['diff','--name-only','HEAD','--','apps/web/src','apps/web/public','apps/web/next.config.ts','apps/web/package.json','packages','tools','package.json','pnpm-lock.yaml','patches'],cpuReference.checkout)) throw Error('Reference runtime/data Git diff');
git(['worktree','add','--detach',candidate,candidateCommit]);
for (const entry of source) {
  mkdirSync(dirname(resolve(candidate,entry.file)),{recursive:true});
  cpSync(resolve(root,entry.file),resolve(candidate,entry.file));
}
for (const file of added) {
  mkdirSync(dirname(resolve(dir,'new-source',file)),{recursive:true});
  cpSync(resolve(root,file),resolve(dir,'new-source',file));
}
const patch = spawnSync('git',['diff','--binary','HEAD','--',...paths],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:40*1024*1024});
if (patch.status !== 0) throw Error('Cannot archive tracked patch');
writeFileSync(resolve(dir,'tracked-source.patch'),patch.stdout);
for (const entry of source) if (hash(resolve(candidate,entry.file)) !== entry.sha256) throw Error('Snapshot copy mismatch');
const sourceSha256 = createHash('sha256').update(JSON.stringify({source,deleted})).digest('hex');
const frozenInputs = [
  '.tools/phase-four/p4-9/progressive-integration-4/launch.json',
  '.tools/phase-four/p4-9/progressive-integration-4/result.json',
  '.tools/phase-four/p4-9/progressive-integration-4/review.json',
  resolve(diagnosticPath,'launch.json'),resolve(diagnosticPath,'result.json'),resolve(diagnosticPath,'review.json'),
  '.tools/phase-four/p4-9/orbit-upload-microbench.ts',
  '.tools/phase-four/p4-9/orbit-upload-microbench.json',
  'docs/perf/phase-four/p4-9-progressive-integration-4-review.md',
  'docs/perf/phase-four/p4-9-progressive-integration-4-review.json',
  'docs/perf/phase-four/p4-9-cpu-investigation-3-review.md',
  'docs/perf/phase-four/p4-9-cpu-investigation-3-review.json',
  resolve(dir,'prepare.mjs'),
].map(file => ({file,sha256:hash(resolve(root,file))}));
const method = 'Fresh full validation of one production change: OrbitLayer computes each vertex once and writes the unchanged shared segment endpoint buffer directly. Independent byte-for-byte tests prove Float64 rebase/multiply/add order, Float32 uploads, mutated points, scale, signed zero and near-surface origins; geometry/material/style/data/model/cadence/original CPU protocol unchanged. Nine predetermined alternating Node pairs indicate reduced upload cost but are diagnostic only. Prior native2400frame review does not reproduce clean spikes or establish sole cause; failed EarthLEO+21.137percent/Moonp95+26.316percent remainfailed. Fresh verify480expected unit passes+2expected diagnostics,5driver checks,all2623derivedchunks/staticcaps,1000lookup/normalbuild/shell/engine/assets/licenses;4startup/navigation/physicalHIGH cases,108production browser cases/22files,3separateproduction profiles. Three PREDECLARED uninstrumented ordinary-dev sequential same-machine reference4409ef5 then consumer CPU pairs, each5paths120+30/fixeddate-rate/LOW1440x1000DPR1/equal scheduled counts/environment/original20percent everymean+p95. ALL three must pass; no outlier filtering, averaging across pairs, best-result selection, diagnostic acceptance or inherited runtime performance. Independent groups/pairs continue after failures, all failures retained, integrity/setup failclosed, only owned3001/3002 stopped and rootdev3000 untouched. Source/reference/14preserved and provenance hashes frozen. Changed-consumer-UX review follows automated review; no Phase4B/5, scientific/reference/threshold change, commit/push/deploy/completion claim.';
const manifest = {
  preparedAt:new Date().toISOString(),root,candidate,runDirectory:dir,candidateCommit,sourceSha256,
  candidateSource:candidateCommit+' + approved progressive scene integration snapshot SHA256 '+sourceSha256,
  source,deleted,newFiles:added,preservedEvidence:previous.preservedEvidence,cpuReference,
  frozenInputs,node:process.execPath,pnpmCli:previous.pnpmCli,port:3002,
  verifyFirst:true,validateDriver:true,cpuRepetitions:3,shellPrerequisite:true,
  browserSpecs:previous.browserSpecs,profileSpecs:previous.profileSpecs,
  protocol:{...previous.protocol,
    measurementPass:'Fresh full orbit upload validation; all runtime gates plus three predetermined uninstrumented CPU pairs',
    cpuRepetitions:3,cpuAcceptance:'Every original mean/p95 path must pass in all three pairs; no pair selection or cross-pair averaging',
    finalRegression:'108browser/4performance/3profiles/3fresh five-path CPU pairs; independent failures retained, overall verdict remainsfailed.'},
  localVerify:{typecheck:'Engine typecheck passed',lint:'Changed runtime/test/driver/helper sources pass ESLint; runner node--check passed',focused:'16orbit/label-readiness/objects-in-view tests in3files pass;5driver default/identity/failure-collection tests pass. Nine predetermined alternating Node diagnostic microbenchmark pairs have exact upload bytes; median ratio0.458. No science/material/CPU/startup limits changed.'},
  pendingGates:['Review full verify/science/chunk-boundaries/4performance/108browser/3profiles and ALL three clean original20percent CPU pairs; no unreviewed pass','User changed-consumer-UX review after all automatic gates pass'],method,
};
writeFileSync(resolve(dir,'source-comparison.json'),JSON.stringify({previous:previous.sourceSha256,current:sourceSha256,previousFiles:previous.source.length,currentFiles:source.length,unchanged:source.length-changes.length,changes,originalReferencesUnchanged:true,scientificProvidersAndChunkDataUnchanged:true},null,2)+'\n');
writeFileSync(resolve(dir,'launch.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({prepared:true,candidateCommit,sourceSha256,files:source.length,newFiles:added.length,changes:changes.map(entry=>entry.file),preserved:previous.preservedEvidence.length,reference:cpuReference.source.length,cpuRepetitions:3,candidate}));
