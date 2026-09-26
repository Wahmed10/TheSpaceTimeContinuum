import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  Fn,
  If,
  attribute,
  vec2,
  vec4,
  float,
  bool,
  modelViewMatrix,
  cameraProjectionMatrix,
  cameraNear,
  cameraFar,
  positionGeometry,
  varyingProperty,
  viewport,
  screenDPR,
  reference,
  mix,
  materialOpacity,
  viewZToLogarithmicDepth,
} from 'three/tsl';

/** Screen-space ribbon without Line2's lossy inverse-projection round trip.
 * Clip W and fragment log depth both come directly from physical view depth.
 */
export class OrbitMaterial extends MeshBasicNodeMaterial {
  linewidth = 1;
  dashSize = 1;
  gapSize = 1;
  readonly dashed: boolean;

  constructor(color: string, dashed: boolean) {
    super({ color, transparent: true, depthWrite: false, opacity: 0.25 });
    this.dashed = dashed;
    const width = float(reference('linewidth', 'float', this));
    const dash = float(reference('dashSize', 'float', this));
    const gap = float(reference('gapSize', 'float', this));
    const viewZ = varyingProperty('float', 'orbitViewDepth');
    const distance = varyingProperty('float', 'orbitPathDistance');
    this.vertexNode = Fn(() => {
      const start = vec4(
        modelViewMatrix.mul(vec4(attribute('instanceStart'), 1)),
      ).toVar();
      const end = vec4(
        modelViewMatrix.mul(vec4(attribute('instanceEnd'), 1)),
      ).toVar();
      const d0 = float(attribute('instanceDistanceStart')).toVar();
      const d1 = float(attribute('instanceDistanceEnd')).toVar();
      const near = float(cameraNear).negate();
      const clip = vec4(0, 0, 2, 1).toVar();
      viewZ.assign(near);
      distance.assign(0);
      If(start.z.lessThan(near).or(end.z.lessThan(near)), () => {
        If(start.z.greaterThanEqual(near), () => {
          const alpha = near.sub(start.z).div(end.z.sub(start.z));
          d0.assign(mix(d0, d1, alpha));
          start.assign(mix(start, end, alpha));
          start.z.assign(near);
        }).ElseIf(end.z.greaterThanEqual(near), () => {
          const alpha = near.sub(end.z).div(start.z.sub(end.z));
          d1.assign(mix(d1, d0, alpha));
          end.assign(mix(end, start, alpha));
          end.z.assign(near);
        });
        // Keep endpoints within a small viewport guard band before expansion.
        // Letting the rasterizer clip a ribbon spanning millions of NDC units
        // destroys the precision of its perspective depth interpolation.
        const visible = bool(true).toVar();
        for (const axis of ['x', 'y'] as const) {
          for (const sign of [-1, 1]) {
            const a = cameraProjectionMatrix.mul(start).toVar();
            const b = cameraProjectionMatrix.mul(end).toVar();
            const da = a.w.mul(1.1).add(a[axis].mul(sign)).toVar();
            const db = b.w.mul(1.1).add(b[axis].mul(sign)).toVar();
            If(da.lessThan(0).and(db.lessThan(0)), () => {
              visible.assign(bool(false));
            });
            If(da.lessThan(0).and(db.greaterThanEqual(0)), () => {
              const alpha = da.div(da.sub(db));
              d0.assign(mix(d0, d1, alpha));
              start.assign(mix(start, end, alpha));
            }).ElseIf(db.lessThan(0).and(da.greaterThanEqual(0)), () => {
              const alpha = db.div(db.sub(da));
              d1.assign(mix(d1, d0, alpha));
              end.assign(mix(end, start, alpha));
            });
          }
        }
        If(visible, () => {
          const c0 = cameraProjectionMatrix.mul(start);
          const c1 = cameraProjectionMatrix.mul(end);
          const first = positionGeometry.y.lessThan(0.5);
          clip.assign(first.select(c0, c1));
          viewZ.assign(first.select(start.z, end.z));
          distance.assign(first.select(d0, d1));
          const delta = c1.xy.div(c1.w).sub(c0.xy.div(c0.w)).mul(viewport.zw);
          const direction = delta.div(delta.length().max(0.000001));
          const offset = vec2(direction.y, direction.x.negate())
            .mul(positionGeometry.x)
            .mul(width)
            .mul(screenDPR)
            .div(viewport.zw)
            .mul(clip.w);
          clip.xy.addAssign(offset);
        });
      });
      return clip;
    })();
    this.depthNode = viewZToLogarithmicDepth(
      float(viewZ),
      cameraNear,
      cameraFar,
    );
    this.opacityNode = Fn(() => {
      if (dashed)
        float(distance).mod(dash.add(gap)).greaterThan(dash).discard();
      return float(materialOpacity);
    })();
  }
}
