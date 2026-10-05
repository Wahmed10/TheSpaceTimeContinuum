import { readFileSync,writeFileSync,readdirSync,cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve,join,relative } from 'node:path';

const dir=resolve('.tools/phase-four/p4-9/progressive-integration-5');
const prefix='docs/perf/phase-four/p4-9-progressive-integration-5-';
const read=f=>JSON.parse(readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const v=read(join(dir,'evidence-review.json')),m=read(join(dir,'launch.json'));
assert(v.sourceFilesChecked===3091&&v.referenceSourceFilesChecked===220&&v.preservedFilesChecked===14&&v.frozenInputsChecked===13,'Review counts');
assert(v.cpuPairs.length===3&&!v.failures.length&&v.cpuPairs.every(p=>p.comparison.pass&&p.checks.length===5&&p.checks.every(c=>c.meanRatio<=1.2&&c.p95Ratio<=1.2)),'All predetermined CPU pairs');
assert(hash(join(dir,'result.json'))===v.resultSha256,'Raw result changed');
for(const location of [m.root,m.candidate])for(const entry of m.source)assert(hash(join(location,entry.file))===entry.sha256,'Source changed: '+location+'/'+entry.file);
for(const entry of m.preservedEvidence)assert(hash(join(m.root,entry.file))===entry.sha256,'Preserved evidence changed');
for(const entry of m.cpuReference.source)assert(hash(join(m.cpuReference.checkout,entry.file))===entry.sha256,'Immutable reference changed');
for(const entry of m.frozenInputs)assert(hash(resolve(m.root,entry.file))===entry.sha256,'Frozen provenance changed');
const approximationIds=new Set(['dwarf:ceres','moon:phobos','moon:deimos','moon:titan','moon:triton','moon:charon']);
for(const j of v.jumps.jumps){
  const d=j.diagnostics;
  assert(j.actual===j.requested&&d.renderedEpoch===j.requested&&d.renderedRevision===d.sceneRevision,'Requested date actually rendered');
  assert(d.positionStatus.length===21&&new Set(d.positionStatus.map(s=>s.id)).size===21&&d.positionStatus.every(s=>s.status===(approximationIds.has(s.id)?'approximate':'ready')),'All21 current positions with honest orbital certainty');
  assert(j.progress.length>=2&&j.progress[0].earth==='approximate'&&j.progress[0].epoch===j.requested&&j.progress.at(-1).earth==='ready'&&j.progress.at(-1).loading.length===0&&d.renderedFrames>j.progress[0].renderedFrames,'Continued rendering from fresh approximate to corrected');
}
assert(v.prefetch.runs.length===2&&v.prefetch.runs[0].rate===31557600&&v.prefetch.runs[1].rate===-31557600&&v.prefetch.runs.every(r=>r.cache.bytes<=8*1024*1024),'Both prefetch directions/cache cap');
const build=readFileSync(join(dir,'build.log'),'utf8');
assert(build.includes('"mode": "verified"')&&build.includes('"chunks": 2623')&&build.includes('"maxBytes": 10568')&&build.includes('"maxCorrectionBytes": 6624'),'Exact generated science bundles and caps');
const driver=readFileSync(join(dir,'validationDriver.log'),'utf8');assert(driver.includes('tests 5')&&driver.includes('pass 5')&&driver.includes('fail 0'),'Driver5checks');
const prior=read('.tools/phase-four/p4-9/progressive-integration-4/review.json');
for(const capture of v.captures){
  assert(hash(join(dir,capture.file))===capture.sha256,'Current capture changed');
  if(capture.prior)assert(prior.captures.some(c=>c.file===capture.prior&&c.sha256===capture.sha256)&&hash(resolve('.tools/phase-four/p4-9/progressive-integration-4',capture.prior))===capture.sha256,'Previously inspected capture identity');
}
assert(v.captures.length===128&&v.captures.filter(c=>!c.prior).length===30&&v.sheets.length===2,'Inspected capture inventory');
for(const sheet of v.sheets)assert(hash(join(dir,sheet.file))===sheet.sha256,'Inspected sheet changed');
v.verdict='reviewed-pass';
v.reviewedAt=new Date().toISOString();
v.scope='P4.9 automated gates accepted at the exact frozen source; final Phase4 acceptance awaits user changed-UX review.';
v.visualReview={captures:128,priorIdentical:98,novelInspected:30,sheets:['visual-1.png','visual-2.png'],observations:'Both sheets inspected at original resolution. Physical True/Explore moon-system views retain expected scales, controls/search/list/settings/UTC dialogs are coherent, phone cards preserve timeline reachability, history restores empty layers, and paused/canonical/recovery/approximate marker flows are truthful. WebGPU preview displays its temporary uniform placeholder. All98 previously inspected byte-identical captures are independently rehashed; original8 material comparisons and all67 centered detailed submitted-frame readiness records pass. No missing/failed capture accepted.'};
v.reviewNotes={prefetch:'The observation is4000ms after1000ms acquisition, with480 actual RAF snapshots/direction and53 fixedchunk indices/direction. The old review script assumed>600frames from a faster prior run; this assumption is not an accepted target or test requirement. Every actual recorded snapshot is ready, both directions cross>40chunks and remain within8MiB. No app/test/protocol change or failed measurement waiver.',cpu:'All six reports save original aggregate measurements, not per-frame raw samples. Independently recomputed original comparator and ratio arithmetic for all15 paths/30 mean+p95 checks, exact environment/config/counts and dev-server sequencing. No outliers removed or samples averaged across pairs; all three predeclared pairs pass. Earlier spike cause remains unconfirmed; upload optimization is byte-exact and locally cheaper, but this does not prove it was the sole cause of historical spikes.'};
v.science={generatedChunks:2623,maxBundleBytes:10568,maxCorrectionBytes:6624,version:'ec190c00101ff5a573c924f77c96e49b238002087e633c3824f1f93eacd8413b',boundaryTests:'Every fixed boundary +/-1ms for every correction and six orbital models, >7800 states per body; correction position/derivative original thresholds and exact sixmodel positions; independent Horizons/holdouts/geocentric checks pass in480unit suite.'};
v.pendingGates=['User changed-consumer-UX review: refresh object link, Back/Forward, keyboard search/card/time, mobile sheet/keyboard/layers, settings/reduced motion'];
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>['candidate','new-source'].includes(e.name)?[]:e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
v.artifacts=walk(dir).filter(f=>/\.(json|log|mjs|patch)$/.test(f)&&!/[\\/](?:review|evidence-review)\.json$/.test(f)).map((file,index)=>{
  const name=relative(dir,file).replaceAll('\\','/');
  const published=prefix+'raw-'+String(index+1).padStart(3,'0')+'-'+name.split('/').at(-1).replace(/\.log$/,'.txt');
  cpSync(file,published);assert(hash(file)===hash(published),'Published artifact hash');
  return {file:name,sha256:hash(file),published};
});
for(const [index,capture] of v.captures.entries()){
  capture.published=prefix+'capture-'+String(index+1).padStart(3,'0')+'-'+capture.file.split('/').at(-1);
  cpSync(join(dir,capture.file),capture.published);assert(hash(capture.published)===capture.sha256,'Published capture hash');
}
for(const sheet of v.sheets){sheet.published=prefix+sheet.file;cpSync(join(dir,sheet.file),sheet.published);assert(hash(sheet.published)===sheet.sha256,'Published sheet hash');}
writeFileSync(join(dir,'review.json'),JSON.stringify(v,null,2)+'\n');
cpSync(join(dir,'review.json'),prefix+'review.json');
const maxBytes=Math.max(...v.cold.flatMap(c=>c.cold.map(x=>x.startupBytes)));
const cpuRows=v.cpuPairs.flatMap(pair=>pair.checks.map(c=>`| ${pair.index} | ${c.path} | ${c.reference.meanMs.toFixed(3)} / ${c.candidate.meanMs.toFixed(3)} | ${((c.meanRatio-1)*100).toFixed(2)}% | ${c.reference.p95Ms.toFixed(3)} / ${c.candidate.p95Ms.toFixed(3)} | ${((c.p95Ratio-1)*100).toFixed(2)}% |`));
const overview=v.profiles.find(p=>p.state==='overview'),card=v.profiles.find(p=>p.state==='card-and-list');
writeFileSync(prefix+'review.md',[
  '# Progressive integration5 reviewed automated acceptance - October5,2026 UTC','',
  '**All P4.9 automated gates pass independent review. Final Phase4 acceptance awaits the user changed-UX walkthrough required by the approved plan.** No validation job remains running. This record preserves prior failed reports and does not alter their verdicts.','',
  'Full verify:480 passed unit/science checks plus2 expected rejected-model diagnostics across56files; typecheck/lint/package boundaries pass. Five driver default/identity/failure-collection checks pass. All108 normal-production browser cases/22files,4 performance cases and3 separate production profiles pass, with zero skips/retries/flakes/report errors. Builds, assets79961515/80000000 bytes, licenses, original material references, source/provenance and preserved-evidence checks pass.','',
  '| Measured gate | Worst measured result | Original limit |','|---|---:|---:|',
  `| First actual painted desktop frame,5cold samples | ${v.cold[0].coldMaxMs.toFixed(1)}ms | 2500ms |`,
  `| First actual painted simulated4G frame,5cold samples | ${v.cold[1].coldMaxMs.toFixed(1)}ms | 5000ms |`,
  `| Actual startup transfer | ${maxBytes}bytes | 1500000bytes |`,
  `| Conservative build startup budget | ${v.startup.total}bytes | 1500000bytes |`,
  `| Five uncached desktop date jumps | ${Math.max(...v.jumps.jumps.map(j=>j.durationMs)).toFixed(1)}ms | 1000ms |`,
  `| CPU mean increase,all3pairs/all5paths | ${v.cpuLimits.maxMeanIncreasePercent.toFixed(2)}% | 20% |`,
  `| CPU p95 increase,all3pairs/all5paths | ${v.cpuLimits.maxP95IncreasePercent.toFixed(2)}% | 20% |`,
  `| Physical desktop HIGH WebGL2 p95,5views | ${v.hardware[0].worstP95Ms.toFixed(1)}ms | 16.7ms |`,
  `| Physical desktop HIGH WebGPU p95,5views | ${v.hardware[1].worstP95Ms.toFixed(1)}ms | 16.7ms |`,
  `| Lazy engine gzip | ${v.engineGzipBytes}bytes | 450000bytes |`,
  `| Route shell,root/Earth/Charon | ${v.shell.map(s=>s.gzipBytes).join('/')}gzipbytes | 200000bytes/route |`,'',
  'The first-frame markers follow actual paint. Startup request accounting includes late completion of pre-paint requests. Desktop protocol100Mbps/20Mbps/20ms/CPU1; simulated4G4Mbps/1Mbps/150ms/CPU4. Viewport/CPU/network emulation is not new physical-phone thermal/throughput or total-VRAM proof; accepted prior device coverage remains closed.','',
  `All five date jumps (${v.jumps.jumps.map(j=>j.durationMs.toFixed(1)).join(', ')}ms) continue rendering and reach the exact requested epoch/rendered cache revision with all21 current positions. Six sourced orbital models retain honest approximate certainty; corrected analytic positions become ready. First progress records show fresh approximate Earth while the six models load, not stale positions. Optional KTX concurrency stays<=2; no texture-settle wait or global scene freeze is counted as readiness. Forward/reverse1year/sec runs each record480 actual RAF snapshots over4s after1s initial acquisition, cross53 fixed time indices and show no missing current data; cache stays<=8MiB. Existing4s/>40-boundary protocol is unchanged.`,'',
  'All2623 fixed28Julian-day bundles are byte-verified against the accepted source model; maximum correction6624/8192bytes, combined10568/16384bytes. All correction and sixmodel boundary tests plus independent Horizons/off-grid/geocentric tolerances pass. The raw astronomy precision audit and compact exact polynomial correction rationale remain unchanged. Missing corrections retain fresh approximate positions. Desktop/mobile preview→1K→sharp/mobile1K and immutable fixed-range headers pass.','',
  '## CPU comparisons','',
  'Three pairs were declared before launch and measured sequentially reference→candidate, on the same Ryzen7 8845HS/Windows/Node24.12.0/Chromium153 runner. Both sides use ordinary dev builds with SwiftShader WebGL2 LOW1440x1000/DPR1/21bodies/fixed2026-09-22/rate1/120samples+30warmup/path,8clock+8perf updates. Reference remains4409ef5d8f97299d9058360c97d560493d067c1c. Each of the15 paths passes both mean and p95 independently; no pair selection, outlier filtering, cross-pair averaging, instrumentation or substituted reference.','',
  '| Pair | Path | Mean reference/candidate ms | Mean change | p95 reference/candidate ms | p95 change |','|---|---|---:|---:|---:|---:|',...cpuRows,'',
  'The production change calculates each orbit vertex once and writes the same shared endpoint buffer directly. Byte-exact tests preserve Float64 rebase/multiply/add order before Float32 upload, geometry/styles/data and one dirty revision. Isolated diagnostic upload work falls, but prior intermittent10-29ms spikes were not reproduced or conclusively attributed. This acceptance establishes compliance at the tested source/protocol, not the sole cause of all historical spikes. The original acceptance harness retains aggregate statistics; it does not save per-frame raw samples. Prior failed gates and three diagnostic reviews remain available.','',
  '## Capture, accessibility and profile review','',
  'All8 original material reference comparisons retain1.5% tolerance. All67 readiness records (8material+11ring+48body) require2new centered detailed submitted frames/current epoch+revision/29settled maps. All128 captures are accounted:98 byte-identical to independently rehashed previously inspected integration4 images,30 newly inspected in2contact sheets. Consumer controls/modals/cards/list/UTC/keyboard/mobile/history, physical True/Explore systems and temporary preview/approximate states remain coherent. Scientific precision600samples<0.5px/all11depth,texture stability,14axe scans plus resolved contrast/native-keyboard supplements pass.','',
  `Separate production profiles: overview${overview.commits}commits/30s and card/list${card.commits}commits/30s; every30 one-second bin<=4, actual playing86400 rate and29+days advance, expected open subtree and no measured history writes. Original lab${v.lab.commits}commits/${v.lab.seconds}s. Profile build is separate from normal-production performance and from ordinary-dev CPU comparisons.`,'',
  '## Source and remaining review','',
  `HEAD${v.candidateCommit} plus snapshotSHA${v.sourceSha256}; all3091root/candidate files,220 immutable reference files,14 preserved user artifacts and13 frozen provenance inputs independently matched before documentation follow-up. Exactly6 changes from integration4,3085 other files unchanged; science/providers/chunks/clock/FrameTree/material assets/original references/CPU thresholds are identical. Root user dev3000/PID3664 stays running; job-owned3001/3002 are stopped. No root production build, push/deploy, Phase4B/5 or memory update.`,'',
  'The approved Phase4 plan requires final changed-UX review: refresh an object link; select another body and use Back/Forward; keyboard search/card/UTC time; narrow/mobile sheet/search keyboard/layers; settings and reduced motion. No repeat science/source/Charon/device acceptance is required. Detailed walkthrough and durable continuation are in PHASE_4_IMPLEMENTATION_HANDOFF.md. Final phase acceptance remains pending this user review.','',
  `AdjacentJSON inventories${v.artifacts.length} hashed raw reports/logs/manifests/scripts and128 captures. Complete originals: .tools/phase-four/p4-9/progressive-integration-5. Status: node tools/phase-four-status.mjs.`,'',
].join('\n'));
console.log(JSON.stringify({verdict:v.verdict,scope:v.scope,raw:v.artifacts.length,captures:v.captures.length,readiness:v.readiness.length,cpuPairs:3,cpuLimits:v.cpuLimits,review:prefix+'review.md'}));
