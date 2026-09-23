/** Weekly NASA/JPL Horizons minus astronomy-engine states. Positions and their
 * derivatives are interpolated together; no extrapolation is permitted. */
export class ResidualTable {
 readonly startTdbSec:number;readonly stepSec:number;readonly count:number;private values:Float32Array;
 constructor(buffer:ArrayBuffer){const view=new DataView(buffer);if(buffer.byteLength<24)throw new Error('Truncated ephemeris correction table');this.startTdbSec=view.getFloat64(0,true);this.stepSec=view.getFloat64(8,true);this.count=view.getFloat64(16,true);if(!Number.isFinite(this.startTdbSec)||this.stepSec<=0||!Number.isFinite(this.stepSec)||!Number.isInteger(this.count)||this.count<2||this.count>20000||buffer.byteLength!==24+24*this.count)throw new Error('Malformed ephemeris correction table');this.values=new Float32Array(this.count*6);for(let i=0;i<this.values.length;i++){const value=view.getFloat32(24+i*4,true);if(!Number.isFinite(value))throw new Error('Nonfinite ephemeris correction');this.values[i]=value;}}
 addTo(tdbSec:number,out:Float64Array,offset=0):boolean {const s=(tdbSec-this.startTdbSec)/this.stepSec;if(s<0||s>this.count-1||!Number.isFinite(s))return false;const index=Math.min(this.count-2,Math.floor(s)),u=s-index,u2=u*u,u3=u2*u,h=this.stepSec;const a=index*6,b=a+6;
 for(let j=0;j<3;j++){const p0=this.values[a+j]!,p1=this.values[b+j]!,v0=this.values[a+j+3]!,v1=this.values[b+j+3]!;out[offset+j]!+=(2*u3-3*u2+1)*p0+(u3-2*u2+u)*h*v0+(-2*u3+3*u2)*p1+(u3-u2)*h*v1;out[offset+j+3]!+=((6*u2-6*u)*p0+(-6*u2+6*u)*p1)/h+(3*u2-4*u+1)*v0+(3*u2-2*u)*v1;}return true;
 }
}
const tables=new Map<string,ResidualTable>();
export function registerEphemerisCorrection(body:string,buffer:ArrayBuffer){tables.set(body,new ResidualTable(buffer));}
export function getEphemerisCorrection(body:string){return tables.get(body);}
