import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createBodyProvider,jdToTdb} from '../../packages/astro/src/index';
const mapping:Record<string,string>={Sun:'10',Mercury:'199',Venus:'299',Earth:'399',Moon:'301',Mars:'499',Jupiter:'599',Saturn:'699',Uranus:'799',Neptune:'899',Pluto:'999'};
const startJd=2415020.5; // 1900-01-01 TDB; extend beyond both UI boundaries.
const firstJd=startJd-14,stepDays=7,count=Math.ceil((2488434.5-firstJd)/stepDays)+3;
await mkdir('assets/source/corrections',{recursive:true});await mkdir('apps/web/public/data/corrections',{recursive:true});
const manifest:Record<string,unknown>={format:'f64le:t0,step,count;f32le:dx,dy,dz,dvx,dvy,dvz',startJd:firstJd,stepDays,count,source:'NASA/JPL Horizons',sourceUrl:'https://ssd.jpl.nasa.gov/horizons/',generatedAt:new Date().toISOString(),bodies:{}};
for(const [body,id] of Object.entries(mapping)){
 const provider=createBodyProvider(body);const out=new Float64Array(6);const records:number[][]=[];const queries=[];
 for(let offset=0;offset<count;offset+=5000){const n=Math.min(5000,count-offset);const jds=Array.from({length:n},(_,i)=>firstJd+(offset+i)*stepDays);const path=`assets/source/corrections/${body}-${offset}.json`;let payload:{signature?:{version:string};result?:string;error?:string};
 const query={format:'json',COMMAND:`'${id}'`,OBJ_DATA:"'NO'",EPHEM_TYPE:"'VECTORS'",CENTER:"'500@0'",REF_SYSTEM:"'ICRF'",REF_PLANE:"'FRAME'",VEC_TABLE:"'2'",OUT_UNITS:"'KM-S'",TIME_TYPE:"'TDB'",CSV_FORMAT:"'YES'",START_TIME:`'JD${jds[0]}'`,STOP_TIME:`'JD${jds[n-1]!+0.1}'`,STEP_SIZE:"'7 d'"};queries.push(query);
 try{payload=JSON.parse(await readFile(path,'utf8'));}catch{const response=await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(query)}`,{headers:{'User-Agent':'SpaceTimeContinuum-ephemeris-build/0.1'},signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error(`Stopped on HTTP ${response.status}`);payload=await response.json() as typeof payload;if(payload.error)throw new Error(payload.error);await writeFile(path,JSON.stringify(payload));await new Promise(r=>setTimeout(r,1500));}
 if(!payload.signature||!['1.2','1.3'].includes(payload.signature.version))throw new Error('Unknown Horizons version');const block=payload.result?.split('$$SOE')[1]?.split('$$EOE')[0];if(!block)throw new Error(payload.error??'No vectors');
 const rows=block.trim().split('\n').map(line=>{const c=line.split(',');return [Number(c[0]),...c.slice(2,8).map(Number)];});if(rows.length!==n)throw new Error(`${body}: ${rows.length} instead of ${n}`);
 for(const row of rows){const jd=row[0]!;const t=jdToTdb(jd); // use unbounded base state for the short guard interval
 const state=provider.stateAt(Math.max(provider.validity.fromTdb,Math.min(provider.validity.toTdb,t)),out);
 if(!state.ok)throw new Error('Base state unavailable');
 if(t<provider.validity.fromTdb||t>provider.validity.toTdb){const {BaryState,Body}=await import('../../packages/astro/node_modules/astronomy-engine/esm/astronomy.js');const {toAstroTime}=await import('../../packages/astro/src/ephemeris/AstronomyEngineProvider');const s=BaryState(Body[body as keyof typeof Body],toAstroTime(t));out.set([s.x*149597870.7,s.y*149597870.7,s.z*149597870.7,s.vx*149597870.7/86400,s.vy*149597870.7/86400,s.vz*149597870.7/86400]);}
 const residual=row.slice(1).map((v,i)=>v-out[i]!);if(residual.some(v=>!Number.isFinite(v)))throw new Error('Nonfinite residual');records.push(residual);}
 console.log(`${body}: ${records.length}/${count} correction samples`);
 }
 const buffer=Buffer.alloc(24+records.length*24);buffer.writeDoubleLE(jdToTdb(firstJd),0);buffer.writeDoubleLE(stepDays*86400,8);buffer.writeDoubleLE(records.length,16);for(let i=0;i<records.length;i++)for(let j=0;j<6;j++)buffer.writeFloatLE(records[i]![j]!,24+(i*6+j)*4);
 const file=`${body.toLowerCase()}.bin`;await writeFile(`apps/web/public/data/corrections/${file}`,buffer);await writeFile(`apps/web/public/data/corrections/${body.toLowerCase()}.provenance.json`,JSON.stringify({body,queries,generatedAt:new Date().toISOString(),note:'Hermite-interpolated residuals added to astronomy-engine 2.1.19 barycentric states. Guard samples bracket the supported date interval.'},null,2));
 (manifest.bodies as Record<string,unknown>)[body]={file,bytes:buffer.length};await writeFile('apps/web/public/data/corrections/manifest.json',JSON.stringify(manifest,null,2));
}
