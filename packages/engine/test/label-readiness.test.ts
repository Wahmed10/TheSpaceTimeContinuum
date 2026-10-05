import { expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import { EXPLORABLE_BODIES } from '@space/domain';
import { SpaceEngine } from '../src/SpaceEngine';

function setup() {
  const camera = new PerspectiveCamera(90, 1.44, 0.1, 100);
  camera.updateMatrixWorld();
  let approximate = true;
  const certainty = vi.fn(() => (approximate ? 'approximate' : 'computed'));
  const entries = new Map(
    EXPLORABLE_BODIES.map((body) => [
      body.id,
      {
        body,
        provider: { certaintyAt: certainty },
        visible: true,
        renderVisible: true,
        visual: { group: { position: new Vector3(0, 0, -5) } },
      },
    ]),
  );
  const labels = {
    begin: vi.fn(),
    setApproximate: vi.fn(),
    update: vi.fn(),
    end: vi.fn(),
  };
  const state = {
    camera,
    projected: new Vector3(),
    width: 1440,
    height: 1000,
    labels,
    clock: { state: { tdbSec: 100 } },
    sceneEpoch: 100,
    sceneStamp: 0,
    registry: { entries, frames: { cacheRevision: 0 }, update: vi.fn() },
    sourcePoints: new Map(),
    sourceEpoch: 100,
    selected: 'planet:earth',
    hovered: null,
    cameraController: { distanceKm: 450000, targetId: 'planet:earth' },
  };
  // These fixtures exercise the real label/readiness methods without a GPU.
  const engine = Object.assign(
    Object.create(SpaceEngine.prototype),
    state,
  ) as Pick<SpaceEngine, 'getPositionStatus'> & {
    updateLabels(now: number): void;
  };
  return {
    engine,
    state,
    entries,
    labels,
    certainty,
    correct: () => {
      approximate = false;
    },
  };
}

it('checks certainty only for shown relevant labels and refreshes when a body enters view', () => {
  const { engine, state, entries, labels, certainty } = setup();
  engine.updateLabels(0);
  expect(labels.setApproximate.mock.calls.map(([id]) => id)).toEqual([
    'planet:earth',
    'moon:moon',
  ]);
  expect(certainty).toHaveBeenCalledTimes(2);
  labels.setApproximate.mockClear();
  state.cameraController.targetId = 'planet:mars';
  entries.get('moon:phobos')!.visual.group.position.z = 5;
  entries.get('moon:deimos')!.renderVisible = false;
  engine.updateLabels(1);
  expect(labels.setApproximate.mock.calls.map(([id]) => id)).toEqual([
    'planet:mars',
  ]);
  labels.setApproximate.mockClear();
  entries.get('moon:phobos')!.visual.group.position.z = -5;
  engine.updateLabels(2);
  expect(labels.setApproximate.mock.calls.map(([id]) => id)).toEqual([
    'planet:mars',
    'moon:phobos',
  ]);
});

it('shown labels refresh after a correction arrives while paused, without stale cached certainty', () => {
  const { engine, state, labels, correct } = setup();
  engine.updateLabels(0);
  expect(labels.setApproximate).toHaveBeenCalledWith('planet:earth', true);
  correct();
  state.registry.frames.cacheRevision++;
  engine.updateLabels(1);
  expect(state.registry.update).toHaveBeenCalledWith(100);
  expect(labels.setApproximate).toHaveBeenLastCalledWith('moon:moon', false);
  expect(labels.setApproximate).toHaveBeenCalledWith('planet:earth', false);
});

it('a label-free scene performs no certainty lookups and public readiness remains available', () => {
  const { engine, certainty } = setup();
  Object.assign(engine, { labels: null });
  engine.updateLabels(0);
  expect(certainty).not.toHaveBeenCalled();
  expect(engine.getPositionStatus('planet:earth')).toBe('approximate');
  expect(certainty).toHaveBeenCalledOnce();
});
