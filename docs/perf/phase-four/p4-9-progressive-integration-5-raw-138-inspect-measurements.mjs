import { readdirSync,readFileSync } from 'node:fs';
import { resolve,join,basename } from 'node:path';
const dir=resolve('.tools/phase-four/p4-9/progressive-integration-5');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>['candidate','new-source'].includes(e.name)?[]:e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const files=walk(dir),read=f=>JSON.parse(readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const one=name=>read(files.find(f=>basename(f)===name));
const prefetch=one('fast-playback-prefetch.json');
console.log(JSON.stringify({runs:prefetch.runs.map(r=>({rate:r.rate,snapshots:r.snapshots.length,boundaries:new Set(r.snapshots.map(s=>s.index)).size,first:r.snapshots[0],last:r.snapshots.at(-1),nonready:r.snapshots.filter(s=>s.planet!=='ready'||s.missing.length),cacheBytes:r.cache.bytes})),jumps:one('desktop-date-jumps.json').jumps.map(j=>({date:j.date,durationMs:j.durationMs,requested:j.requested,actual:j.actual,progress:j.progress,status:j.diagnostics.positionStatus,renderedFrames:j.diagnostics.renderedFrames,renderedEpoch:j.diagnostics.renderedEpoch,renderedRevision:j.diagnostics.renderedRevision,sceneRevision:j.diagnostics.sceneRevision})),mobileTexture:files.filter(f=>/phone-textures|mobile-textures|chunk-headers|cache-headers/.test(basename(f))).map(f=>({file:f,record:read(f)}))},null,2));
