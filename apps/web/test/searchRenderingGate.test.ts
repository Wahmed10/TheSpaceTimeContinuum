import { expect, it, vi } from 'vitest';
import { SearchRenderingGate } from '../src/engine-bridge/searchRenderingGate';

function setup() {
  const release = vi.fn();
  const acquire = vi.fn(() => release);
  const frames = new Map<number, () => void>();
  let next = 0;
  const gate = new SearchRenderingGate(
    { suspendRendering: acquire },
    {
      request: (callback) => {
        frames.set(++next, callback);
        return next;
      },
      cancel: (id) => {
        frames.delete(id);
      },
    },
  );
  const paint = () => {
    const queued = [...frames.values()];
    frames.clear();
    queued.forEach((callback) => callback());
  };
  return { gate, acquire, release, frames, paint };
}

it('holds through route commitment and a paint, then releases once without a permanent frame subscription', () => {
  const { gate, acquire, release, frames, paint } = setup();
  gate.hold();
  gate.hold();
  expect(acquire).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
  gate.resumeAfterPaint();
  gate.resumeAfterPaint();
  paint();
  expect(release).not.toHaveBeenCalled();
  paint();
  expect(release).toHaveBeenCalledTimes(1);
  expect(gate.held).toBe(false);
  expect(frames.size).toBe(0);
});

it('reopening cancels a captured first-frame callback before it can resume background work', () => {
  const { gate, acquire, release, frames, paint } = setup();
  gate.hold();
  gate.resumeAfterPaint();
  const stale = [...frames.values()][0]!;
  gate.hold();
  stale();
  expect(gate.held).toBe(true);
  expect(acquire).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
  expect(release).not.toHaveBeenCalled();
  gate.resumeAfterPaint();
  paint();
  paint();
  expect(release).toHaveBeenCalledTimes(1);
});

it('reopening also invalidates a captured release after the first paint', () => {
  const { gate, release, frames, paint } = setup();
  gate.hold();
  gate.resumeAfterPaint();
  paint();
  const stale = [...frames.values()][0]!;
  gate.hold();
  stale();
  expect(release).not.toHaveBeenCalled();
  expect(gate.held).toBe(true);
  gate.dispose();
  expect(release).toHaveBeenCalledTimes(1);
});

it('unmount cancels pending paint callbacks and releases ownership without reacquiring after disposal', () => {
  const { gate, acquire, release, frames } = setup();
  gate.hold();
  gate.resumeAfterPaint();
  const stale = [...frames.values()][0]!;
  gate.dispose();
  gate.dispose();
  stale();
  gate.hold();
  gate.resumeAfterPaint();
  expect(release).toHaveBeenCalledTimes(1);
  expect(acquire).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
});
