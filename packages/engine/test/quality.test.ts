import { it, expect } from 'vitest';
import { QualityManager } from '../src/quality/QualityManager';
import { CameraController } from '../src/camera/CameraController';

it('waits for sustained pressure, reduces DPR first, and respects manual quality', () => {
  const manager = new QualityManager(false, 'webgl2');
  for (let i = 0; i < 19; i++) expect(manager.sample(40, 0.25)).toBe(false);
  expect(manager.sample(40, 0.25)).toBe(true);
  expect(manager.tier).toBe('medium');
  expect(manager.dpr).toBe(0.75);
  expect(manager.sample(40, 5)).toBe(true);
  expect(manager.tier).toBe('low');
  manager.set('high');
  expect(manager.sample(1000, 60)).toBe(false);
  expect(manager.tier).toBe('high');
});

it('uses elapsed time and recovers DPR only after twenty seconds of headroom', () => {
  const manager = new QualityManager(false, 'webgl2');
  manager.sample(40, 5);
  expect(manager.sample(5, 19.9)).toBe(false);
  expect(manager.sample(5, 0.1)).toBe(true);
  expect(manager.dpr).toBe(1);
});

it('reduced motion changes views behind a fade rather than travelling through space', () => {
  const camera = new CameraController();
  const a = new Float64Array([1e8, 0, 0]);
  const b = new Float64Array([2e8, 1e8, 0]);
  camera.focus('planet:earth', a, 6371, 0, false);
  camera.reducedMotion = true;
  camera.focus('planet:mars', b, 3390, 1000);
  camera.update(b, 1075, 3390);
  expect(camera.center).toEqual(a);
  expect(camera.fade).toBeGreaterThan(0.7);
  camera.update(b, 1150, 3390);
  expect(camera.center).toEqual(b);
  expect(camera.fade).toBe(1);
  camera.update(b, 1300, 3390);
  expect(camera.fade).toBeCloseTo(0);
  expect(camera.transitioning).toBe(false);
});
