'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { useEngineStore } from './useEngineStore';
import { createObjectsInViewSource } from './objectsInViewSource';

/** Used only by the mounted open list; closing it releases the subscription. */
export function useObjectsInView() {
  const source = useMemo(() => createObjectsInViewSource(useEngineStore), []);
  return useSyncExternalStore(
    source.subscribe,
    source.getSnapshot,
    source.getServerSnapshot,
  );
}
