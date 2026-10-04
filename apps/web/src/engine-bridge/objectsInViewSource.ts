import type { EngineApi, ObjectInView, PerfSample } from '@space/engine';

interface State {
  engine: EngineApi | null;
  perf: PerfSample | null;
}
interface Store {
  getState(): State;
  subscribe(listener: (state: State, previous: State) => void): () => void;
}
const EMPTY: readonly ObjectInView[] = Object.freeze([]);
function same(a: readonly ObjectInView[], b: readonly ObjectInView[]) {
  return (
    a.length === b.length &&
    a.every(
      (item, i) =>
        item.id === b[i]?.id &&
        item.name === b[i]?.name &&
        item.kind === b[i]?.kind,
    )
  );
}

/** One mounted list owns one cold subscription to the existing perf bridge.
 * No new engine listener/timer, no React notification for coordinate-only changes.
 */
export function createObjectsInViewSource(store: Store) {
  let snapshot: readonly ObjectInView[] = EMPTY;
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => EMPTY,
    subscribe(notify: () => void) {
      function refresh(state: State) {
        const next = state.engine?.getObjectsInView() ?? EMPTY;
        if (!same(snapshot, next)) {
          snapshot = next;
          notify();
        }
      }
      const unsubscribe = store.subscribe((state, previous) => {
        if (state.engine !== previous.engine || state.perf !== previous.perf)
          refresh(state);
      });
      refresh(store.getState());
      return unsubscribe;
    },
  };
}
