import { readFileSync, writeFileSync } from 'node:fs';
const file='.tools/phase-four/p4-9/progressive-integration-5/review.mjs';
let source=readFileSync(file,'utf8');
function replace(old,value) {
  if (!source.includes(old)) throw Error('Missing exact review anchor: '+old.slice(0,90));
  source=source.replace(old,value);
}
replace("progressive-integration-4');", "progressive-integration-5');");
replace("assert(r.status==='finished'&&r.verdict==='failed'&&r.failedMeasurements.length===1&&r.failedMeasurements[0]==='cpuRegression','Expected CPU-only collected failure');", "assert(r.status==='finished'&&r.verdict==='automated-measurements-pass-review-pending'&&!r.failure&&!r.failedMeasurements?.length,'Expected all fixed acceptance measurements passed');\nassert(m.cpuRepetitions===3&&m.protocol.cpuRepetitions===3,'Three predetermined CPU pairs');\nfor(const e of m.frozenInputs)assert(hash(resolve(m.root,e.file))===e.sha256,'Frozen provenance changed: '+e.file);\nconst head=spawnSync('git',['rev-parse','HEAD'],{cwd:m.root,encoding:'utf8',windowsHide:true});assert(head.status===0&&head.stdout.trim()===m.candidateCommit,'Root HEAD changed');");
replace("'referenceCpu','cpuReferenceServerLog','cpuCandidateServerLog','sourceIntegrity'", "'sourceIntegrity',...[1,2,3].flatMap(i=>['referenceCpu'+i,'cpuReference'+i+'ServerLog','candidateCpu'+i,'cpuCandidate'+i+'ServerLog','cpuRegression'+i])");
replace("assert(r.candidateCpu.exitCode===1&&r.cpuRegression.exitCode===1,'Retained CPU failure');", "assert(r.sourceUnchanged&&r.preservedEvidenceUnchanged,'Runner integrity flags');");
source=source.replaceAll('477 passed','480 passed').replaceAll('(479\\)','(482\\)').replaceAll('passed:477','passed:480').replaceAll('units:477','units:480');
const cpuStart=source.indexOf("const ref=one('cpu-reference.json'),cur=one('cpu-current.json');");
const cpuEnd=source.indexOf('const prior=',cpuStart);
if(cpuStart<0||cpuEnd<0)throw Error('Missing CPU block anchors');
source=source.slice(0,cpuStart)+[
  "const {compareCpuReports}=await import(pathToFileURL(resolve('packages/engine/src/perf/compareCpu.ts')));",
  'const cpuPairs=[];',
  'for(const index of [1,2,3]){',
  " const ref=one('cpu-reference-'+index+'.json'),cur=one('cpu-current-'+index+'.json');",
  " const comparison=compareCpuReports(ref,cur);assert(JSON.stringify(comparison)===JSON.stringify(one('cpu-current-'+index+'-comparison.json')),'Independent comparator pair'+index);",
  " assert(comparison.threshold===1.2&&comparison.pass&&comparison.checks.length===5&&comparison.checks.every(c=>c.pass&&c.meanRatio<=1.2&&c.p95Ratio<=1.2),'Every original CPU gate pair'+index);",
  ' for(const v of [ref,cur]){',
  "  assert(v.schemaVersion===2&&v.backend==='webgl2'&&v.softwareRenderer&&v.tier==='low'&&v.viewport.width===1440&&v.viewport.height===1000&&v.viewport.dpr===1&&v.entities===21&&v.clockRate===1&&v.startTime==='2026-09-22T00:00:00Z'&&v.frames===120&&v.warmupFrames===30,'Original CPU configuration pair'+index);",
  "  assert(v.results.length===5&&v.results.every(p=>p.frames===120&&p.clockEvents===8&&p.uiUpdates===8&&[p.meanMs,p.medianMs,p.p95Ms,p.maxMs].every(x=>Number.isFinite(x)&&x>0)&&p.meanMs<=p.maxMs&&p.medianMs<=p.p95Ms&&p.p95Ms<=p.maxMs),'CPU aggregates/counts pair'+index);",
  ' }',
  " assert(JSON.stringify(ref.environment)===JSON.stringify(cur.environment)&&ref.adapter===cur.adapter&&ref.method===cur.method,'Matching pair environment/adapter/method');",
  " if(cpuPairs.length)assert(JSON.stringify(cur.environment)===JSON.stringify(cpuPairs[0].environment)&&Date.parse(cpuPairs.at(-1).candidate.measuredAt)<Date.parse(r['cpuReference'+index+'Server'].startedAt),'Same runner/sequential fixed pairs');",
  " assert(Date.parse(r['cpuReference'+index+'Server'].startedAt)<Date.parse(ref.measuredAt)&&Date.parse(ref.measuredAt)<Date.parse(r['cpuCandidate'+index+'Server'].startedAt)&&Date.parse(r['cpuCandidate'+index+'Server'].startedAt)<Date.parse(cur.measuredAt),'Sequential same-machine pair'+index);",
  " assert(r['cpuReference'+index+'Server'].mode==='dev'&&r['cpuCandidate'+index+'Server'].mode==='dev','Ordinary dev CPU builds');",
  ' const checks=comparison.checks.map((v,i)=>{',
  '  const reference=ref.results[i],candidate=cur.results[i];',
  "  assert(v.path===reference.path&&v.path===candidate.path&&v.meanRatio===candidate.meanMs/reference.meanMs&&v.p95Ratio===candidate.p95Ms/reference.p95Ms,'Independent ratio arithmetic');",
  '  return {...v,reference,candidate};',
  ' });',
  ' cpuPairs.push({index,environment:cur.environment,comparison,checks,reference:ref,candidate:cur});',
  '}',
  'const cpu=cpuPairs.map(p=>({index:p.index,checks:p.checks}));',
  "const cpuLimits={maxMeanIncreasePercent:Math.max(...cpuPairs.flatMap(p=>p.checks.map(c=>(c.meanRatio-1)*100))),maxP95IncreasePercent:Math.max(...cpuPairs.flatMap(p=>p.checks.map(c=>(c.p95Ratio-1)*100)))};",
  '',
].join('\n')+source.slice(cpuEnd);
replace("progressive-integration-3/review.json", "progressive-integration-4/review.json");
replace('lab,cpu,environment:cur.environment,captures,sheets,', 'lab,cpu,cpuPairs,cpuLimits,environment:cpuPairs[0].environment,frozenInputsChecked:m.frozenInputs.length,captures,sheets,');
const failureStart=source.indexOf("failures:['earth-leo mean");
const failureEnd=source.indexOf("};\nwriteFileSync(join(dir,'evidence-review.json')",failureStart);
if(failureStart<0||failureEnd<0)throw Error('Missing diagnosis anchors');
source=source.slice(0,failureStart)+"failures:[],diagnosis:{confirmed:'All three predetermined clean comparable CPU pairs pass every original mean/p95 limit with no filtered samples or best-pair selection. Orbit upload has byte-exact correctness and lower isolated work, but the prior intermittent spikes were not reproduced/attributed and this does not prove a sole cause. Acceptance CPU reports save aggregates, not per-frame raw samples.'},pendingGates:['User changed-consumer-UX review']"+source.slice(failureEnd);
replace('jumps:jumps.jumps.map(j=>j.durationMs),cpu,hardware:review.hardware,', 'jumps:jumps.jumps.map(j=>j.durationMs),cpuLimits,cpu:cpu.map(p=>({index:p.index,checks:p.checks.map(c=>({path:c.path,meanRatio:c.meanRatio,p95Ratio:c.p95Ratio}))})),hardware:review.hardware,');
writeFileSync(file,source);
