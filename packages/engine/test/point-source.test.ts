import { expect, it, vi } from 'vitest';
import { FrameTree } from '@space/astro';
import { EXPLORABLE_BODIES } from '@space/domain';
import type { BodySpec } from '@space/domain';
import { SourcePointLayer } from '../src/layers/SourcePointLayer';
import type { PointSourceBuffers } from '../src';

const body: BodySpec = {
  ...EXPLORABLE_BODIES.find((entry) => entry.id === 'dwarf:ceres')!,
  id: 'asteroid:source',
  kind: 'asteroid',
  physical: { meanRadiusKm: 1 },
};

it('transforms parent-frame point states and rebases at 1 AU before float32 upload', () => {
  const frames = new FrameTree();
  frames.register({
    id: 'ICRF_BODY:test',
    parent: 'ICRF_SSB',
    origin: {
      id: 'parent',
      frame: 'ICRF_SSB',
      method: 'static',
      validity: 'unbounded',
      certaintyAt: () => 'computed',
      stateAt: (_t, out) => {
        out.set([149597870.7, 0, 0, 1, 0, 0]);
        return {
          ok: true,
          frame: 'ICRF_SSB',
          certainty: 'computed',
          stale: false,
        };
      },
    },
  });
  const dispose = vi.fn();
  let saved: PointSourceBuffers | undefined;
  const layer = new SourcePointLayer(
    {
      frame: 'ICRF_BODY:test',
      entities: [body],
      dispose,
      update: (_t, out) => {
        if (saved) expect(out).toBe(saved);
        saved = out;
        out.states.set([0.01, 0, -100, 2, 0, 0]);
        return 1;
      },
    },
    [body],
  );
  layer.sample(0, frames, true);
  layer.render(new Float64Array([149597870.7, 0, 0]), true);
  expect(layer.layer.positions.getX(0)).toBeCloseTo(0.01, 6);
  expect(layer.points[0]!.physical[3]).toBe(3);
  expect(layer.layer.object.visible).toBe(true);
  // A semantic band can enable rendering after sampling was skipped this frame.
  // Wait for a fresh sample rather than displaying stale positions for one frame.
  layer.sample(1, frames, false);
  layer.render(new Float64Array(3), true);
  expect(layer.layer.object.visible).toBe(false);
  expect(layer.points[0]!.renderVisible).toBe(false);
  layer.sample(1, frames, true);
  layer.render(new Float64Array([149597870.7, 0, 0]), true);
  expect(layer.layer.object.visible).toBe(true);
  layer.dispose();
  layer.dispose();
  expect(dispose).toHaveBeenCalledTimes(1);
});

it('hides invalid records and stale tail entries when the active prefix shrinks', () => {
  const frames = new FrameTree();
  let count = 2;
  const bodies = [body, { ...body, id: 'asteroid:second' }];
  const layer = new SourcePointLayer(
    {
      frame: 'ICRF_SSB',
      entities: bodies,
      update: (_t, out) => {
        out.states.set([1, 2, 3, 0, 0, 0, NaN, 0, 0, 0, 0, 0]);
        return count;
      },
    },
    bodies,
  );
  layer.sample(0, frames, true);
  layer.render(new Float64Array(3), true);
  expect(layer.points.map((point) => point.renderVisible)).toEqual([
    true,
    false,
  ]);
  expect(layer.layer.sizes.getX(1)).toBe(0);
  count = 0;
  layer.sample(1, frames, true);
  layer.render(new Float64Array(3), true);
  expect(layer.points.every((point) => !point.renderVisible)).toBe(true);
  expect(layer.layer.object.visible).toBe(false);
  layer.dispose();
});

it('latches source failures and disposes GPU resources even when source cleanup throws', () => {
  let fail = false;
  const update = vi.fn((_t: number, out: PointSourceBuffers) => {
    if (fail) throw new Error('worker unavailable');
    out.states.set([1, 2, 3, 0, 0, 0]);
    return 1;
  });
  const layer = new SourcePointLayer(
    {
      frame: 'ICRF_SSB',
      entities: [body],
      update,
      dispose: () => {
        throw new Error('cleanup');
      },
    },
    [body],
  );
  const frames = new FrameTree();
  layer.sample(0, frames, true);
  fail = true;
  layer.sample(1, frames, true);
  layer.sample(2, frames, true);
  layer.render(new Float64Array(3), true);
  expect(layer.error).toContain('worker unavailable');
  expect(update).toHaveBeenCalledTimes(2);
  expect(layer.layer.object.visible).toBe(false);
  expect(() => layer.dispose()).not.toThrow();
});

it('rejects an invalid count without transferring cleanup ownership on failed registration', () => {
  const dispose = vi.fn();
  const layer = new SourcePointLayer(
    { frame: 'ICRF_SSB', entities: [body], update: () => 2, dispose },
    [body],
  );
  layer.sample(0, new FrameTree(), true);
  expect(layer.error).toContain('count');
  layer.dispose(false);
  expect(dispose).not.toHaveBeenCalled();
});
