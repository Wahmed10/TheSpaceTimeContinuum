import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3, Vector4 } from 'three/webgpu';
import { EXPLORABLE_BODIES } from '@space/domain';
import { LabelLayout } from '../src/labels/LabelLayout';
import { SpaceEngine } from '../src/SpaceEngine';
import {
  centerInView,
  ObjectsInViewSnapshot,
} from '../src/scene/ObjectsInView';

describe('catalog center membership', () => {
  it('accepts clip edges and rejects each boundary, behind-camera and nonfinite coordinates', () => {
    expect(centerInView(true, 1, -1, 1, 1)).toBe(true);
    for (const values of [
      [1.01, 0, 0, 1],
      [0, -1.01, 0, 1],
      [0, 0, 1.01, 1],
      [0, 0, -1.01, 1],
      [0, 0, 0, -1],
      [0, 0, 0, 0],
      [NaN, 0, 0, 1],
      [0, Infinity, 0, 1],
      [0, 0, NaN, 1],
      [0, 0, 0, Infinity],
    ])
      expect(
        centerInView(true, ...(values as [number, number, number, number])),
      ).toBe(false);
    expect(centerInView(false, 0, 0, 0, 1)).toBe(false);
  });
  it('retains every qualifying center despite label collisions, with stable immutable snapshots', () => {
    const labels = [0, 1].map(() => ({
      x: 10,
      y: 10,
      width: 80,
      visible: true,
      selected: false,
      show: false,
      importance: 1,
    }));
    expect(new LabelLayout().place(labels)).toBe(1);
    const query = new ObjectsInViewSnapshot(EXPLORABLE_BODIES);
    const ids = ['star:sun', 'planet:earth'];
    query.begin();
    ids.forEach((id) => query.include(id));
    const first = query.finish();
    expect(first.map((item) => item.id)).toEqual(ids);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    query.begin();
    ids.forEach((id) => query.include(id));
    expect(query.finish()).toBe(first);
    query.begin();
    query.include('future:unknown');
    expect(query.finish()).toEqual([]);
    expect(first.map((item) => item.id)).toEqual(ids);
  });
});

function setup() {
  const camera = new PerspectiveCamera(90, 1, 0.1, 100);
  camera.updateMatrixWorld();
  const state = {
    disposed: false,
    initialReady: true,
    clock: { state: { tdbSec: 100 } },
    renderedEpoch: 100,
    renderedRevision: 0,
    camera,
    inViewCenter: new Vector4(),
    inViewSnapshot: new ObjectsInViewSnapshot(EXPLORABLE_BODIES),
    registry: {
      frames: { cacheRevision: 0 },
      entries: new Map(
        EXPLORABLE_BODIES.slice(0, 2).map((body, i) => [
          body.id,
          {
            body,
            visible: true,
            renderVisible: true,
            visual: { group: { position: new Vector3(i, 0, -5) } },
          },
        ]),
      ),
    },
    layers: { has: () => true },
  };
  const engine = Object.assign(
    Object.create(SpaceEngine.prototype),
    state,
  ) as SpaceEngine;
  return { engine, state, camera };
}
it('the public query uses the rendered camera, including point LOD, pan, zoom and layer changes', () => {
  const { engine, state, camera } = setup();
  const first = engine.getObjectsInView();
  expect(first.map((item) => item.id)).toEqual(
    EXPLORABLE_BODIES.slice(0, 2).map((body) => body.id),
  );
  expect(engine.getObjectsInView()).toBe(first);
  state.layers.has = () => false;
  expect(engine.getObjectsInView().map((item) => item.id)).toEqual([
    'star:sun',
  ]);
  state.layers.has = () => true;
  camera.position.x = 20;
  camera.updateMatrixWorld();
  expect(engine.getObjectsInView()).toEqual([]);
  camera.position.x = 0;
  camera.fov = 10;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  expect(engine.getObjectsInView().map((item) => item.id)).toEqual([
    'star:sun',
  ]);
  camera.fov = 90;
  camera.updateProjectionMatrix();
  camera.rotation.y = Math.PI;
  camera.updateMatrixWorld();
  expect(engine.getObjectsInView()).toEqual([]);
});
it('invalid providers, disabled rendered entities, startup and disposal fail closed', () => {
  const { engine, state } = setup();
  for (const e of state.registry.entries.values()) e.visible = false;
  expect(engine.getObjectsInView()).toEqual([]);
  for (const e of state.registry.entries.values()) {
    e.visible = true;
    e.renderVisible = false;
  }
  expect(engine.getObjectsInView()).toEqual([]);
  for (const e of state.registry.entries.values()) e.renderVisible = true;
  Object.assign(engine, { initialReady: false });
  expect(engine.getObjectsInView()).toEqual([]);
  Object.assign(engine, { initialReady: true, disposed: true });
  expect(engine.getObjectsInView()).toEqual([]);
});
it('withholds membership across a date jump or arriving chunk until a matching scene has rendered', () => {
  const { engine, state } = setup();
  expect(engine.getObjectsInView()).toHaveLength(2);
  state.clock.state.tdbSec = 101;
  expect(engine.getObjectsInView()).toEqual([]);
  Object.assign(engine, { renderedEpoch: 101 });
  expect(engine.getObjectsInView()).toHaveLength(2);
  state.registry.frames.cacheRevision = 1;
  expect(engine.getObjectsInView()).toEqual([]);
  Object.assign(engine, { renderedRevision: 1 });
  expect(engine.getObjectsInView()).toHaveLength(2);
});
