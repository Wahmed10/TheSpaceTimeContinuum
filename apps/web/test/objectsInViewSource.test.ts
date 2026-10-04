import { expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import type { EngineApi, ObjectInView, PerfSample } from '@space/engine';
import { createObjectsInViewSource } from '../src/engine-bridge/objectsInViewSource';
it('queries only on existing perf/engine notifications, publishes semantic changes and cleans up', () => {
  let items: readonly ObjectInView[] = [
    { id: 'planet:earth', name: 'Earth', kind: 'planet' },
  ];
  const getObjectsInView = vi.fn(() => items);
  const engine = { getObjectsInView } as unknown as EngineApi;
  const store = createStore(() => ({
    engine: engine as EngineApi | null,
    perf: null as PerfSample | null,
    mode: 'paused',
  }));
  const source = createObjectsInViewSource(store),
    notify = vi.fn();
  const unsubscribe = source.subscribe(notify);
  expect(notify).toHaveBeenCalledTimes(1);
  const first = source.getSnapshot();
  store.setState({ mode: 'playing' });
  expect(getObjectsInView).toHaveBeenCalledTimes(1);
  items = items.map((item) => ({ ...item }));
  store.setState({ perf: {} as PerfSample });
  expect(notify).toHaveBeenCalledTimes(1);
  expect(source.getSnapshot()).toBe(first);
  items = [];
  store.setState({ perf: {} as PerfSample });
  expect(notify).toHaveBeenCalledTimes(2);
  expect(source.getSnapshot()).toEqual([]);
  store.setState({ engine: null });
  expect(notify).toHaveBeenCalledTimes(2);
  store.setState({ engine });
  const queries = getObjectsInView.mock.calls.length;
  unsubscribe();
  store.setState({ perf: {} as PerfSample });
  expect(getObjectsInView).toHaveBeenCalledTimes(queries);
});
it('replaces a late/recreated engine and recognizes changed names and kinds', () => {
  const store = createStore(() => ({
    engine: null as EngineApi | null,
    perf: null as PerfSample | null,
  }));
  const source = createObjectsInViewSource(store),
    notify = vi.fn();
  const unsubscribe = source.subscribe(notify);
  expect(source.getSnapshot()).toEqual([]);
  const record: ObjectInView = {
    id: 'planet:earth',
    name: 'Earth',
    kind: 'planet',
  };
  store.setState({
    engine: { getObjectsInView: () => [record] } as unknown as EngineApi,
  });
  store.setState({
    engine: {
      getObjectsInView: () => [{ ...record, name: 'Different', kind: 'moon' }],
    } as unknown as EngineApi,
  });
  expect(source.getSnapshot()[0]?.kind).toBe('moon');
  expect(notify).toHaveBeenCalledTimes(2);
  unsubscribe();
});
