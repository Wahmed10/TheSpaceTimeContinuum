import { expect, it } from 'vitest';
import { PerspectiveCamera } from 'three/webgpu';
import { Picker } from '../src/picking/Picker';

const camera = new PerspectiveCamera(90, 1, 0.1, 1e12);
camera.updateMatrixWorld();
const world = new Float64Array([149597870.7, 0, 0]);
const at = (x: number, y: number, z: number) =>
  new Float64Array([world[0]! + x, y, z]);

it('hits the nearest sphere surface, independent of insertion order, at 1 AU', () => {
  const picker = new Picker();
  picker.begin(camera, world, 1000, 1000, 500, 500, false);
  picker.consider('small-near-center', at(0, 0, -10), 1, false);
  picker.consider('large-near-surface', at(0, 0, -12), 5, false);
  expect(picker.result).toBe('large-near-surface');
  picker.begin(camera, world, 1000, 1000, 500, 500, false);
  picker.consider('off-ray', at(3, 0, -10), 1, false);
  picker.consider('behind', at(0, 0, 10), 1, false);
  expect(picker.result).toBeNull();
});

it('uses 12 CSS pixels for desktop and 24 for touch, without cached labels', () => {
  const picker = new Picker();
  for (const touch of [false, true]) {
    picker.begin(camera, world, 1000, 1000, 500, 500, touch);
    picker.consider('twenty-pixels', at(4, 0, -100), 0.1, true);
    expect(picker.result).toBe(touch ? 'twenty-pixels' : null);
  }
  picker.begin(camera, world, 1000, 1000, 500, 500, true);
  picker.consider('beyond-touch-radius', at(5, 0, -100), 0.1, true);
  picker.consider('behind-camera', at(0, 0, 100), 0.1, true);
  expect(picker.result).toBeNull();
});

it('chooses the nearest projected point while rejecting points behind a mesh', () => {
  const picker = new Picker();
  picker.begin(camera, world, 1000, 1000, 500, 500, false);
  picker.consider('planet', at(0, 0, -100), 20, false);
  picker.consider('occluded', at(0, 0, -200), 0.1, true);
  expect(picker.result).toBe('planet');
  picker.consider('foreground', at(1, 0, -50), 0.1, true);
  expect(picker.result).toBe('foreground');
  picker.consider('closer-screen', at(0.5, 0, -60), 0.1, true);
  expect(picker.result).toBe('closer-screen');
});
