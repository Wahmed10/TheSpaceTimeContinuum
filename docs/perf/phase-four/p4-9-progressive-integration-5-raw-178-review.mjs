import {readFileSync,writeFileSync,readdirSync,existsSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,relative,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const dir=resolve('.tools/phase-four/p4-9/progressive-integration-5');
const read=f=>JSON.parse(readFileSync(f,'utf8').replace(/^\uFEFF/,'')), hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const assert=(c,m)=>{if(!c)throw Error(m);};
const m=read(join(dir,'launch.json')),r=read(join(dir,'result.json'));
assert(r.status==='finished'&&r.verdict==='automated-measurements-pass-review-pending'&&!r.failure&&!r.failedMeasurements?.length,'Expected all fixed acceptance measurements passed');
assert(m.cpuRepetitions===3&&m.protocol.cpuRepetitions===3,'Three predetermined CPU pairs');
for(const e of m.frozenInputs)assert(hash(resolve(m.root,e.file))===e.sha256,'Frozen provenance changed: '+e.file);
const head=spawnSync('git',['rev-parse','HEAD'],{cwd:m.root,encoding:'utf8',windowsHide:true});assert(head.status===0&&head.stdout.trim()===m.candidateCommit,'Root HEAD changed');
assert(createHash('sha256').update(JSON.stringify({source:m.source,deleted:m.deleted})).digest('hex')===m.sourceSha256,'Source digest');
for(const location of [m.root,m.candidate]){
 for(const e of m.source)assert(hash(join(location,e.file))===e.sha256,'Source changed: '+location+'/'+e.file);
 for(const f of m.deleted)assert(!existsSync(join(location,f)),'Deletion changed');
}
for(const e of m.preservedEvidence)assert(hash(join(m.root,e.file))===e.sha256,'User evidence changed');
for(const e of m.cpuReference.source)assert(hash(join(m.cpuReference.checkout,e.file))===e.sha256,'Reference changed');
const git=args=>spawnSync('git',args,{cwd:m.cpuReference.checkout,encoding:'utf8',windowsHide:true});
assert(git(['rev-parse','HEAD']).stdout.trim()==='4409ef5d8f97299d9058360c97d560493d067c1c','Immutable reference HEAD');
const diff=git(['diff','--name-only','HEAD','--','packages','apps/web/src','apps/web/public']);assert(diff.status===0&&!diff.stdout.trim(),'Reference runtime/data diff');
for(const stage of ['install','validationDriver','verify','localSearch','build','engineBundle','assets','licenses','shellAttribution','performance','browser','productionServerLog','browserRegression','profileBuild','reactProfile','profilingServerLog','profileRegression','sourceIntegrity',...[1,2,3].flatMap(i=>['referenceCpu'+i,'cpuReference'+i+'ServerLog','candidateCpu'+i,'cpuCandidate'+i+'ServerLog','cpuRegression'+i])])assert(r[stage]?.exitCode===0,'Stage '+stage);
assert(r.sourceUnchanged&&r.preservedEvidenceUnchanged,'Runner integrity flags');
const verify=readFileSync(join(dir,'verify.log'),'utf8');assert(/Test Files\s+56 passed \(56\)/.test(verify)&&/Tests\s+480 passed \| 2 expected fail \(482\)/.test(verify),'Unit totals');
const specs=s=>[...(s.specs??[]),...(s.suites??[]).flatMap(specs)];
for(const [name,count] of [['performance',4],['browser',108],['reactProfile',3]]){
 const v=read(join(dir,name+'.json')),rows=v.suites.flatMap(specs);
 assert(v.stats.expected===count&&!v.stats.unexpected&&!v.stats.skipped&&!v.stats.flaky&&!v.errors.length&&rows.length===count,'Stats '+name);
 assert(rows.every(s=>s.ok&&s.tests.length===1&&s.tests[0].status==='expected'&&s.tests[0].results.length===1&&s.tests[0].results[0].status==='passed'&&s.tests[0].results[0].retry===0),'Individual result '+name);
}
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>['candidate','new-source'].includes(e.name)?[]:e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const files=walk(dir),one=name=>{const hits=files.filter(f=>basename(f)===name);assert(hits.length===1,'Missing/duplicate '+name);return read(hits[0]);};
const cold=[one('performance-desktop.json'),one('performance-phone-viewport.json')];
for(const v of cold){
 assert(v.sourceSha256===m.sourceSha256&&v.cold.length===5&&v.navigation.length===12&&v.coldMaxMs<=v.coldTargetMs&&v.maxLongTaskMs<=v.longTaskTargetMs,'Cold/navigation');
 for(const c of v.cold)assert(c.startupBytes<=1500000&&!c.errors.length&&c.startup.every(t=>t.bytes>0&&t.completed>0&&!/\/data\/(orbits|corrections)\//.test(t.url)),'Actual transfer accounting');
}
const startup=one('startup-budget.json');assert(startup.passed&&startup.cap===1500000&&startup.total<=startup.cap,'Startup cap');
const jumps=one('desktop-date-jumps.json'),prefetch=one('fast-playback-prefetch.json');
assert(jumps.targetMs===1000&&jumps.peakTextureRequests<=2&&jumps.jumps.length===5&&jumps.jumps.every(j=>j.durationMs<=1000),'Jumps/concurrency');
assert(prefetch.runs.length===2,'Both playback directions');
assert(prefetch.acquisitionMs===1000&&prefetch.observationMs===4000,'Original prefetch acquisition/observation protocol');
for(const v of prefetch.runs)assert(v.snapshots.length>0&&Math.abs(v.rate)===31557600&&new Set(v.snapshots.map(s=>s.index)).size>40&&v.snapshots.every(s=>s.planet==='ready'&&!s.missing.length),'Both sustained directions and every recorded frame ready');
const shell=one('shell.json'),engine=one('engine-bundle.json'),lookup=one('local-search.json');
assert(shell.pass&&!shell.errors.length&&shell.reports.length===3&&shell.reports.every(v=>v.engineGateVerified&&v.shellGzipBytes<=200000&&!v.failures.length),'Shell');
assert(engine.gzipBytes<=450000&&lookup.samples.length===1000&&lookup.maxMs<=16,'Engine/lookup');
const hardware=['desktop-high-webgl.json','desktop-high-webgpu.json'].map(one);
for(const v of hardware)assert(v.sourceSha256===m.sourceSha256&&!v.softwareRenderer&&!v.errors.length&&v.results.length===5&&v.results.every(x=>x.samples>=30&&x.p95Ms<=16.7&&x.drawCalls<=300&&x.detailedMeshes<=12&&x.pendingTextures===0&&x.gpuBytes<=350000000),'Physical HIGH');
const streaming=files.filter(f=>basename(f)==='texture-streaming.json').map(read);assert(streaming.length===2,'Streaming count');
for(const v of streaming)assert(v.sourceSha256===m.sourceSha256&&!v.errors.length&&v.preview.textureState.length===29&&v.preview.textureState.every(t=>t.placeholder)&&v.oneK.textureState.every(t=>t.resolution===1024)&&v.sharp.textureState.some(t=>t.resolution>1024)&&v.sharp.pendingTextures===0,'Staged textures');
const precision=one('precision-webgl.json'),storage=one('texture-stability.json');
assert(precision.samples===600&&precision.maxErrorPx<.5&&precision.depthResults.length===11&&precision.depthResults.every(v=>v.pass),'Precision');
assert(storage.focusChanges===20&&storage.before.textureCount===storage.after.textureCount&&storage.after.gpuBytes<=128*1024*1024,'Storage');
const scans=files.filter(f=>/[/\\]axe-(desktop|phone)-[^/\\]+\.json$/.test(f)).map(read);
assert(scans.length===14&&scans.every(v=>!v.scan.violations.length&&v.contrast.every(c=>c.resolved&&c.ratio>=c.minimum)&&v.controlTargets.every(t=>t.id&&t.role==='dialog'&&t.visible)),'Axe/contrast');
const readiness=files.filter(f=>f.endsWith('-readiness.json')).map(f=>{
 const v=read(f);assert(v.renderedFrames>=v.beforeFrames+2&&v.renderedRevision===v.sceneRevision&&v.target.id===v.id&&v.target.visible&&v.target.level>=2&&Math.hypot(v.center.x-720,v.center.y-500)<=1,'View readiness '+f);
 assert(v.textureState.length===29&&v.textureState.every(t=>!t.placeholder&&!t.loading&&!t.failed&&t.resolution>=1024),'Settled textures '+f);
 return {file:relative(dir,f).replaceAll('\\','/'),sha256:hash(f),...v};
});
assert(readiness.length===67,'8 material +11 ring +48 body views');
const material=['earth-terminator','moon-quarter','mars-close','sun-bloom','earth-day','earth-night','earth-limb','moon-full'];
for(const n of material)assert(readiness.some(v=>v.file.endsWith('/'+n+'-readiness.json'))&&m.source.some(v=>v.file==='e2e/visual-reference/visual.spec.ts/'+n+'.png'),'Original material reference '+n);
const profiles=files.filter(f=>/[/\\]react-(overview|card-and-list)\.json$/.test(f)).map(f=>{
 const v=read(f);assert(v.observedSeconds>=30&&v.windowSeconds===30&&v.commits>0&&v.bins.length===30&&v.bins.every(b=>b<=4),'Profile bins');
 assert(v.initial.mode==='playing'&&v.final.mode==='playing'&&v.initial.rate===86400&&v.final.rate===86400&&v.final.tdbSec-v.initial.tdbSec>=29*86400&&!v.measuredHistoryWrites.length,'Profile workload');
 assert(v.state==='card-and-list'?v.initial.cardCount===1&&v.final.cardCount===1&&v.initial.listCount>0&&v.final.listCount>0:v.initial.cardCount===0&&v.final.cardCount===0,'Card/list');
 return {file:relative(dir,f).replaceAll('\\','/'),sha256:hash(f),...v};
});assert(profiles.length===2,'Two consumer profiles');
const lab=one('lab-react-profile.json');assert(lab.seconds>=30&&lab.playbackRate===86400&&lab.commits>0&&lab.commits<=Math.ceil(lab.seconds*4)+1,'Lab');
const {compareCpuReports}=await import(pathToFileURL(resolve('packages/engine/src/perf/compareCpu.ts')));
const cpuPairs=[];
for(const index of [1,2,3]){
 const ref=one('cpu-reference-'+index+'.json'),cur=one('cpu-current-'+index+'.json');
 const comparison=compareCpuReports(ref,cur);assert(JSON.stringify(comparison)===JSON.stringify(one('cpu-current-'+index+'-comparison.json')),'Independent comparator pair'+index);
 assert(comparison.threshold===1.2&&comparison.pass&&comparison.checks.length===5&&comparison.checks.every(c=>c.pass&&c.meanRatio<=1.2&&c.p95Ratio<=1.2),'Every original CPU gate pair'+index);
 for(const v of [ref,cur]){
  assert(v.schemaVersion===2&&v.backend==='webgl2'&&v.softwareRenderer&&v.tier==='low'&&v.viewport.width===1440&&v.viewport.height===1000&&v.viewport.dpr===1&&v.entities===21&&v.clockRate===1&&v.startTime==='2026-09-22T00:00:00Z'&&v.frames===120&&v.warmupFrames===30,'Original CPU configuration pair'+index);
  assert(v.results.length===5&&v.results.every(p=>p.frames===120&&p.clockEvents===8&&p.uiUpdates===8&&[p.meanMs,p.medianMs,p.p95Ms,p.maxMs].every(x=>Number.isFinite(x)&&x>0)&&p.meanMs<=p.maxMs&&p.medianMs<=p.p95Ms&&p.p95Ms<=p.maxMs),'CPU aggregates/counts pair'+index);
 }
 assert(JSON.stringify(ref.environment)===JSON.stringify(cur.environment)&&ref.adapter===cur.adapter&&ref.method===cur.method,'Matching pair environment/adapter/method');
 if(cpuPairs.length)assert(JSON.stringify(cur.environment)===JSON.stringify(cpuPairs[0].environment)&&Date.parse(cpuPairs.at(-1).candidate.measuredAt)<Date.parse(r['cpuReference'+index+'Server'].startedAt),'Same runner/sequential fixed pairs');
 assert(Date.parse(r['cpuReference'+index+'Server'].startedAt)<Date.parse(ref.measuredAt)&&Date.parse(ref.measuredAt)<Date.parse(r['cpuCandidate'+index+'Server'].startedAt)&&Date.parse(r['cpuCandidate'+index+'Server'].startedAt)<Date.parse(cur.measuredAt),'Sequential same-machine pair'+index);
 assert(r['cpuReference'+index+'Server'].mode==='dev'&&r['cpuCandidate'+index+'Server'].mode==='dev','Ordinary dev CPU builds');
 const checks=comparison.checks.map((v,i)=>{
  const reference=ref.results[i],candidate=cur.results[i];
  assert(v.path===reference.path&&v.path===candidate.path&&v.meanRatio===candidate.meanMs/reference.meanMs&&v.p95Ratio===candidate.p95Ms/reference.p95Ms,'Independent ratio arithmetic');
  return {...v,reference,candidate};
 });
 cpuPairs.push({index,environment:cur.environment,comparison,checks,reference:ref,candidate:cur});
}
const cpu=cpuPairs.map(p=>({index:p.index,checks:p.checks}));
const cpuLimits={maxMeanIncreasePercent:Math.max(...cpuPairs.flatMap(p=>p.checks.map(c=>(c.meanRatio-1)*100))),maxP95IncreasePercent:Math.max(...cpuPairs.flatMap(p=>p.checks.map(c=>(c.p95Ratio-1)*100)))};
const prior=read('.tools/phase-four/p4-9/progressive-integration-4/review.json').captures;
const captures=files.filter(f=>f.endsWith('.png')).map(f=>({file:relative(dir,f).replaceAll('\\','/'),sha256:hash(f),prior:prior.find(v=>v.sha256===hash(f))?.file??null}));
const novel=captures.filter(v=>!v.prior),sheets=[];
for(let offset=0;offset<novel.length;offset+=25){
 const page=novel.slice(offset,offset+25),parts=[];
 for(let n=0;n<page.length;n++){const c=page[n],x=(n%5)*280,y=Math.floor(n/5)*210;parts.push({input:await sharp(join(dir,c.file)).resize(280,178,{fit:'contain',background:'#090c14'}).png().toBuffer(),left:x,top:y});
 const label=`${offset+n+1} ${basename(c.file)}`.replaceAll('&','&amp;').replaceAll('<','&lt;');parts.push({input:Buffer.from(`<svg width="280" height="32"><rect width="280" height="32" fill="#fff"/><text x="4" y="13" font-family="Arial" font-size="11">${label.slice(0,43)}</text></svg>`),left:x,top:y+178});}
 const file=`visual-${sheets.length+1}.png`;await sharp({create:{width:1400,height:Math.ceil(page.length/5)*210,channels:4,background:'#ddd'}}).composite(parts).png().toFile(join(dir,file));sheets.push({file,captures:page.map(v=>v.file),sha256:hash(join(dir,file))});
}
const review={verdict:'evidence-checked-visual-review-pending',reviewedAt:new Date().toISOString(),candidateCommit:m.candidateCommit,sourceSha256:m.sourceSha256,resultSha256:hash(join(dir,'result.json')),sourceFilesChecked:m.source.length,referenceSourceFilesChecked:m.cpuReference.source.length,preservedFilesChecked:m.preservedEvidence.length,verify:{passed:480,expectedDiagnostics:2,files:56},browser:r.browser.stats,performance:r.performance.stats,reactProfile:r.reactProfile.stats,cold,startup,jumps,prefetch,shell:shell.reports.map(v=>({route:v.route,gzipBytes:v.shellGzipBytes})),engineGzipBytes:engine.gzipBytes,lookup,hardware:hardware.map(v=>({backend:v.backend,adapter:v.adapter,worstP95Ms:Math.max(...v.results.map(x=>x.p95Ms))})),streaming:streaming.map(v=>({adapter:v.adapter,preview:v.preview.textureState.map(t=>t.resolution),oneK:v.oneK.textureState.map(t=>t.resolution),sharp:v.sharp.textureState.map(t=>t.resolution)})),precision,storage,axeScans:14,readiness,profiles,lab,cpu,cpuPairs,cpuLimits,environment:cpuPairs[0].environment,frozenInputsChecked:m.frozenInputs.length,captures,sheets,failures:[],diagnosis:{confirmed:'All three predetermined clean comparable CPU pairs pass every original mean/p95 limit with no filtered samples or best-pair selection. Orbit upload has byte-exact correctness and lower isolated work, but the prior intermittent spikes were not reproduced/attributed and this does not prove a sole cause. Acceptance CPU reports save aggregates, not per-frame raw samples.'},pendingGates:['User changed-consumer-UX review']};
writeFileSync(join(dir,'evidence-review.json'),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({source:m.source.length,reference:m.cpuReference.source.length,preserved:m.preservedEvidence.length,units:480,browser:108,performance:4,profiles:3,readiness:readiness.length,cold:cold.map(v=>({profile:v.profile,maxMs:v.coldMaxMs,bytes:Math.max(...v.cold.map(c=>c.startupBytes))})),jumps:jumps.jumps.map(j=>j.durationMs),cpuLimits,cpu:cpu.map(p=>({index:p.index,checks:p.checks.map(c=>({path:c.path,meanRatio:c.meanRatio,p95Ratio:c.p95Ratio}))})),hardware:review.hardware,captures:captures.length,novel:novel.length,sheets:sheets.map(v=>v.file)},null,2));
