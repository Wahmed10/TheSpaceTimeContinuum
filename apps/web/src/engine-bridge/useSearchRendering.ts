'use client';
import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useEngineStore } from './useEngineStore';
import { SearchRenderingGate } from './searchRenderingGate';

export function useSearchRendering(open: boolean) {
  const engine = useEngineStore((state) => state.engine);
  const appliedLocation = useEngineStore((state) => state.appliedLocation);
  const pathname = usePathname();
  const gate = useRef<SearchRenderingGate | null>(null);
  useLayoutEffect(() => {
    if (!engine) return;
    const owner = new SearchRenderingGate(engine, {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    });
    gate.current = owner;
    return () => {
      owner.dispose();
      if (gate.current === owner) gate.current = null;
    };
  }, [engine]);
  useLayoutEffect(() => {
    const owner = gate.current;
    if (!owner) return;
    // A choice updates accepted engine/card state before Next commits the URL.
    // Keep the existing search lease through that route commit and its paint.
    const pendingRoute =
      appliedLocation !== null && appliedLocation.split('?')[0] !== pathname;
    if (open || (owner.held && pendingRoute)) owner.hold();
    else owner.resumeAfterPaint();
  }, [engine, open, appliedLocation, pathname]);
}
