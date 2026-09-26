import { describe, expect, it } from 'vitest';
import { projectedDiameter, selectLod, type LodLevel } from '../src/lod/LodSystem';

describe('angular size LOD', () => {
  it('selects the four nominal representations on first observation', () => {
    expect([0, 1.99, 2, 11.99, 12, 199.99, 200, Infinity].map(px => selectLod(px)))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it.each([2, 12, 200])('resists oscillation around the %i px boundary', threshold => {
    let low = selectLod(threshold - 0.01);
    const original = low;
    for (let frame = 0; frame < 120; frame++) {
      low = selectLod(threshold * (1 + 0.14 * Math.sin(frame)), low);
      expect(low).toBe(original);
    }
    const high = selectLod(threshold * 1.151, low);
    expect(high).toBe(original + 1);
    expect(selectLod(threshold * 0.851, high)).toBe(high);
    expect(selectLod(threshold * 0.849, high)).toBe(original);
  });

  it('handles focus jumps and invalid measurements without intermediate frames', () => {
    expect(selectLod(1000, 0)).toBe(3);
    expect(selectLod(0, 3)).toBe(0);
    for (const level of [0, 1, 2, 3] as LodLevel[]) {
      expect(selectLod(NaN, level)).toBe(level);
    }
  });

  it('uses the projected sphere silhouette and CSS viewport height', () => {
    // Radius 3, distance 5 gives a tangent silhouette of 3/4.
    expect(projectedDiameter(3, 5, Math.PI / 2, 800)).toBeCloseTo(600);
    expect(projectedDiameter(3, 5, Math.PI / 2, 400)).toBeCloseTo(300);
    expect(projectedDiameter(3, 3, Math.PI / 2, 800)).toBe(Infinity);
    expect(projectedDiameter(0, 5, Math.PI / 2, 800)).toBe(0);
  });
});
