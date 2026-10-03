import { expect, it } from 'vitest';
import {
  FrameTree,
  AU_KM,
  createSolarSystemFrameTree,
  isoToTdb,
} from '@space/astro';
import { CameraController } from '../src/camera/CameraController';
import {
  CameraReference,
  type CameraFrameTransforms,
} from '../src/camera/CameraReference';

function frames(tilted = false) {
  const tree = new FrameTree();
  for (const [id, base, rate] of [
    ['ICRF_BODY:earth', 1e8, 5],
    ['ICRF_HELIO', 1e6, 2],
  ] as const) {
    tree.register({
      id,
      parent: 'ICRF_SSB',
      origin: {
        id,
        frame: 'ICRF_SSB',
        method: 'static',
        validity: 'unbounded',
        certaintyAt: () => 'computed',
        stateAt: (t, out) => {
          out.set([base + rate * t, 0, 0, rate, 0, 0]);
          return {
            ok: true,
            frame: 'ICRF_SSB',
            certainty: 'computed',
            stale: false,
          };
        },
      },
    });
  }
  tree.register({
    id: 'FIXED:earth',
    parent: 'ICRF_BODY:earth',
    rotation: (t, out) => {
      if (tilted) {
        const c = Math.cos(0.7),
          s = Math.sin(0.7);
        out.set([1, 0, 0, 0, c, -s, 0, s, c]);
        return;
      }
      const angle = t * 0.01,
        c = Math.cos(angle),
        s = Math.sin(angle);
      out.set([c, -s, 0, s, c, 0, 0, 0, 1]);
    },
  });
  return tree;
}
function close(a: Float64Array, b: Float64Array, tolerance = 1e-6) {
  for (let i = 0; i < 3; i++)
    expect(Math.abs(a[i]! - b[i]!)).toBeLessThan(tolerance);
}
function camera(tree: CameraFrameTransforms = frames()) {
  const view = new CameraController(tree);
  const target = new Float64Array([1e8, 800, 400]);
  view.focus('planet:earth', target, 6371, 0, false, false, false);
  view.update(target, 1, 6371, 0);
  return { view, target, tree };
}

it('preserves world pose and up on every supported frame switch', () => {
  const { view, target } = camera();
  view.pan(1, 2);
  view.update(target, 2, 6371, 0);
  for (const frame of [
    'FIXED:earth',
    'ICRF_HELIO',
    'ICRF_BODY:earth',
    'ICRF_SSB',
  ] as const) {
    const world = view.world.slice(),
      center = view.center.slice(),
      up = view.up.slice();
    expect(view.setFrame(frame, 0)).toEqual({ ok: true });
    view.update(target, 3, 6371, 0);
    close(view.world, world);
    close(view.center, center);
    close(view.up, up, 1e-7);
  }
});
it('holds a frame-relative center when follow is off and tracks a moving focus when on', () => {
  for (const [frame, movement] of [
    ['ICRF_BODY:earth', 50],
    ['ICRF_HELIO', 20],
  ] as const) {
    const { view, target } = camera();
    view.setFrame(frame, 0);
    view.following = false;
    const start = view.center[0]!;
    view.update(target, 2, 6371, 10);
    expect(view.center[0]! - start).toBeCloseTo(movement, 6);
    target[0]! += 1234;
    view.following = true;
    view.update(target, 3, 6371, 20);
    close(view.center, target);
  }
});
it('evolves and reverses a fixed camera offset according to an independent analytic rotation', () => {
  const { view, target } = camera();
  view.setFrame('FIXED:earth', 0);
  const offset = view.world.map((value, i) => value - target[i]!);
  view.update(target, 2, 6371, 25);
  const angle = 0.25;
  expect(view.world[0]! - target[0]!).toBeCloseTo(
    offset[0]! * Math.cos(angle) - offset[1]! * Math.sin(angle),
    5,
  );
  expect(view.world[1]! - target[1]!).toBeCloseTo(
    offset[0]! * Math.sin(angle) + offset[1]! * Math.cos(angle),
    5,
  );
  view.update(target, 3, 6371, 0);
  close(
    view.world,
    target.map((value, i) => value + offset[i]!),
  );
});
it('keeps the default SSB path independent of transform availability and output allocation', () => {
  const tree = {
    transformPosition: () => {
      throw new Error('SSB must not need a transform');
    },
  };
  const { view, target } = camera(tree);
  const world = view.world,
    center = view.center,
    up = view.up,
    physical = target.slice();
  for (let i = 0; i < 100; i++) view.update(target, i + 1, 6371, i);
  expect(view.world).toBe(world);
  expect(view.center).toBe(center);
  expect(view.up).toBe(up);
  expect(target).toEqual(physical);
});
it('refuses unavailable frames without changing the current pose or reference', () => {
  const { view, target } = camera(new FrameTree());
  const world = view.world.slice();
  expect(view.setFrame('FIXED:earth', 0)).toEqual({
    ok: false,
    reason: 'unavailable-frame',
  });
  expect(view.frameId).toBe('ICRF_SSB');
  close(view.world, world);
  view.update(target, 2, 6371, 1);
  close(view.world, world);
});
it('keeps caller outputs intact on a failed reference update', () => {
  const tree = frames();
  const reference = new CameraReference(tree);
  const center = new Float64Array([1e8, 0, 0]),
    offset = new Float64Array([100, 200, 300]),
    local = new Float64Array(3);
  expect(reference.setFrame('FIXED:earth', 0, center, offset, local).ok).toBe(
    true,
  );
  const world = new Float64Array([9, 8, 7]),
    unchanged = world.slice();
  expect(
    reference.compose(NaN, center, local, new Float64Array(3), world, true).ok,
  ).toBe(false);
  expect(world).toEqual(unchanged);
});
it('controls throwing or nonfinite transforms without corrupting the camera pose', () => {
  for (const transformPosition of [
    () => {
      throw new Error('provider unavailable');
    },
    (
      _from: string,
      _to: string,
      _t: number,
      _input: Float64Array,
      out: Float64Array,
    ) => {
      out.fill(NaN);
      return true;
    },
  ]) {
    const { view } = camera({ transformPosition });
    const world = view.world.slice(),
      up = view.up.slice();
    expect(view.setFrame('FIXED:earth', 0)).toEqual({
      ok: false,
      reason: 'unavailable-frame',
    });
    expect(view.frameId).toBe('ICRF_SSB');
    close(view.world, world);
    close(view.up, up);
  }
});
it('round-trips frame, up, preset and camera history without recording restoration twice', () => {
  const { view, target } = camera();
  view.setFrame('FIXED:earth', 0);
  view.focus('planet:earth', target, 6371, 10, false, true, false);
  view.update(target, 11, 6371, 0);
  const up = view.up.slice();
  const other = new Float64Array([2e8, 3000, 4000]);
  view.focus('planet:mars', other, 3390, 12, false);
  view.setFrame('ICRF_HELIO', 0);
  const old = view.back()!;
  view.restore(old, target, 6371, 20, 0);
  view.update(target, 10000, 6371, 0);
  expect(view.frameId).toBe('FIXED:earth');
  expect(view.preset).toBe('wide');
  expect(view.distanceKm).toBe(AU_KM * 4.2);
  close(view.up, up, 1e-7);
  expect(view.back()).toBeUndefined();
});
it('preserves default and fixed-frame flight endpoints and reduced-motion fades', () => {
  const { view, target } = camera();
  view.setFrame('FIXED:earth', 0);
  const next = new Float64Array([2e8, 0, 0]);
  view.reducedMotion = true;
  view.focus('planet:mars', next, 3390, 1000);
  view.update(next, 1075, 3390, 0);
  close(view.center, target);
  expect(view.fade).toBeGreaterThan(0.7);
  view.update(next, 1150, 3390, 0);
  close(view.center, next);
  expect(view.fade).toBe(1);
  view.update(next, 1300, 3390, 0);
  expect(view.transitioning).toBe(false);
  expect(view.preset).toBe('close');
});

it.each(['ICRF_SSB', 'FIXED:earth'] as const)(
  'preserves world orientation and restores follow-off history in %s',
  (frame) => {
    // Independent constant X rotation exercises up axes beyond the Z-only fixture.
    const tree = frames(true);
    const { view, target } = camera(tree);
    const world = view.world.slice(),
      up = view.up.slice();
    view.setFrame(frame, 0);
    view.update(target, 2, 6371, 0);
    close(view.world, world);
    close(view.up, up, 1e-7);
    view.following = false;
    view.pan(4, 5);
    view.update(target, 3, 6371, 0);
    const saved = view.world.slice();
    view.focus('planet:mars', new Float64Array([2e8, 0, 0]), 3390, 4, false);
    view.update(new Float64Array([2e8, 0, 0]), 5, 3390, 0);
    view.restore(view.back()!, target, 6371, 6, 0);
    view.update(target, 7, 6371, 0);
    expect(view.following).toBe(false);
    close(view.world, saved);
    close(view.up, up, 1e-7);
  },
);

it('supports the actual Earth/heliocentric tree at the fixed timeline boundaries', () => {
  const tree = createSolarSystemFrameTree();
  const target = new Float64Array(3);
  for (const date of [
    '1900-01-01T00:00:00Z',
    '2000-01-01T12:00:00Z',
    '2026-10-02T12:00:00Z',
    '2100-12-31T23:59:59.999Z',
  ]) {
    const t = isoToTdb(date);
    expect(tree.resolveOrigin('ICRF_BODY:earth', t, target)).toBe(true);
    const view = new CameraController(tree);
    view.focus('planet:earth', target, 6371, 0, false, false, false);
    view.update(target, 1, 6371, t);
    const world = view.world.slice();
    for (const frame of [
      'FIXED:earth',
      'ICRF_HELIO',
      'ICRF_BODY:earth',
      'ICRF_SSB',
    ] as const) {
      expect(view.setFrame(frame, t)).toEqual({ ok: true });
      view.update(target, 2, 6371, t);
      close(view.world, world);
      expect(view.up.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...view.up)).toBeCloseTo(1, 10);
    }
  }
});
