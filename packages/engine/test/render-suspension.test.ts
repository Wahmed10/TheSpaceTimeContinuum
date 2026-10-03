import { afterEach, expect, it, vi } from 'vitest';
import { SpaceEngine } from '../src/SpaceEngine';

function setup() {
  const document = { hidden: false };
  vi.stubGlobal('document', document);
  const loop = vi.fn();
  const frame = vi.fn();
  const engine = Object.assign(Object.create(SpaceEngine.prototype), {
    disposed: false,
    renderSuspensions: 0,
    renderer: { setAnimationLoop: loop },
    frame,
    last: 100,
  }) as SpaceEngine;
  return { engine, loop, frame, document };
}
afterEach(() => vi.unstubAllGlobals());

it('nested modal leases stop submission until the last idempotent release', () => {
  const { engine, loop, frame } = setup();
  const a = engine.suspendRendering(),
    b = engine.suspendRendering();
  a();
  a();
  expect(loop.mock.calls.every(([callback]) => callback === null)).toBe(true);
  b();
  b();
  expect(
    loop.mock.calls.filter(([callback]) => callback === frame),
  ).toHaveLength(1);
});

it('visibility/explicit restart cannot bypass an outstanding modal lease', () => {
  const { engine, loop, frame } = setup();
  const release = engine.suspendRendering();
  engine.setRendering(true);
  expect(loop).not.toHaveBeenCalledWith(frame);
  release();
  expect(loop).toHaveBeenCalledWith(frame);
});

it('release while hidden defers submission until the visible lifecycle restarts it', () => {
  const { engine, loop, frame, document } = setup();
  const release = engine.suspendRendering();
  document.hidden = true;
  release();
  expect(loop).not.toHaveBeenCalledWith(frame);
  document.hidden = false;
  engine.setRendering(true);
  expect(loop).toHaveBeenCalledWith(frame);
});

it('release and acquire after engine disposal cannot revive its animation loop', () => {
  const { engine, loop, frame } = setup();
  const release = engine.suspendRendering();
  Object.assign(engine, { disposed: true });
  release();
  engine.suspendRendering()();
  expect(loop).not.toHaveBeenCalledWith(frame);
});
