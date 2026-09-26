import { describe, expect, it, vi } from 'vitest';
import { Group } from 'three/webgpu';
import { PointLayer } from '../src/layers/PointLayer';

describe('PointLayer', () => {
  it('packs 10k items into one sprite with independent size/color attributes', () => {
    const layer = new PointLayer(10000);
    expect((layer.object as unknown as { count: number }).count).toBe(10000);
    expect(layer.positions.array).toBeInstanceOf(Float32Array);
    expect(layer.positions.count).toBe(10000);
    layer.colors.setXYZ(9999, 1, 0.5, 0);
    layer.sizes.setX(9999, 4);
    expect(layer.colors.getY(9999)).toBe(0.5);
    expect(layer.sizes.getX(9999)).toBe(4);
    layer.setCount(0);
    expect(layer.object.visible).toBe(false);
    layer.setCount(10000);
    expect(layer.object.visible).toBe(true);
    expect(() => layer.setCount(10001)).toThrow();
    layer.dispose();
  });

  it('merges partial pending writes and reuses records after upload', () => {
    const layer = new PointLayer(100);
    layer.upload(10, 2);
    const record = layer.positions.updateRanges[0];
    expect(record).toEqual({ start: 30, count: 6 });
    layer.upload(14, 2, false);
    expect(layer.positions.updateRanges).toEqual([{ start: 30, count: 18 }]);
    expect(layer.colors.updateRanges).toEqual([{ start: 30, count: 6 }]);
    expect(layer.sizes.updateRanges).toEqual([{ start: 10, count: 6 }]);
    layer.positions.clearUpdateRanges();
    layer.upload(1, 1, false);
    expect(layer.positions.updateRanges[0]).toBe(record);
    expect(record).toEqual({ start: 3, count: 3 });
    expect(() => layer.upload(99, 2)).toThrow();
    layer.dispose();
  });

  it('keeps local coordinates independent of rebased parent origin and owns disposal', () => {
    const a = new PointLayer(1),
      b = new PointLayer(1);
    a.positions.setXYZ(0, 7000.125, 0, 0);
    a.object.position.set(149597870.7 - 149590870.7, 0, 0);
    expect(a.positions.getX(0)).toBe(7000.125);
    expect(a.object.geometry).not.toBe(b.object.geometry);
    const host = new Group();
    host.add(a.object);
    const dispose = vi.fn();
    a.object.geometry.addEventListener('dispose', dispose);
    a.dispose();
    expect(host.children).toHaveLength(0);
    expect(dispose).toHaveBeenCalledOnce();
    b.dispose();
  });
});
