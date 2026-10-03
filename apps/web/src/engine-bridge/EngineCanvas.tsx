'use client';
import { useEffect, useRef, useState } from 'react';
import { isoToTdb, tdbToIso } from '@space/astro';
import { useEngineStore } from './useEngineStore';
import { parseExploreLocation } from '../lib/routeState';
import type { RouteIssue } from '../lib/routeState';
import type { SpaceEngine } from '@space/engine';
declare global {
  interface Window {
    __spaceEngine?: SpaceEngine;
  }
}
export default function EngineCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    let disposed = false;
    let expired = false;
    const startupDeadline = window.setTimeout(() => {
      if (disposed) return;
      expired = true;
      useEngineStore.setState({
        error:
          'Loading the graphics and planetary maps took too long. Check your connection and reload to try again.',
      });
    }, 60000);
    let engine: SpaceEngine | undefined;
    const unsubs: (() => void)[] = [];
    // Each mount owns its canvas, so disposing an obsolete asynchronous mount
    // cannot destroy the graphics context of a newer React StrictMode mount.
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute(
      'aria-label',
      'Interactive solar system. Drag to orbit, scroll to zoom. Arrow keys orbit, plus and minus zoom. Use the object buttons to select a world.',
    );
    host.current!.prepend(canvas);
    async function init() {
      try {
        const { state, selectedId, debug, issues } = parseExploreLocation(
          location.pathname,
          location.search,
        );
        useEngineStore.setState({ linkIssues: issues });
        const { SpaceEngine } = await import('@space/engine');
        if (disposed || expired) return;
        engine = await SpaceEngine.create(canvas, {
          forceWebGL: generation > 0 || debug.forceWebGL,
          labels: labels.current!,
          test: debug.test,
          ...(state.t ? { tdbSec: isoToTdb(state.t) } : {}),
        });
        if (disposed || expired) {
          engine.dispose();
          return;
        }
        if (debug.test || debug.perf || location.pathname.startsWith('/lab/'))
          window.__spaceEngine = engine;
        unsubs.push(
          engine.on('select', (id) =>
            useEngineStore.setState({
              selectedId: id,
              following: engine!.isFollowing,
            }),
          ),
          engine.on('clock', (s) => {
            useEngineStore.setState({ mode: s.mode, rate: s.rate });
            const el = document.getElementById('clock-readout');
            if (el)
              el.textContent =
                tdbToIso(s.tdbSec).replace('T', ' · ').slice(0, 21) + ' UTC';
          }),
          engine.on('perf', (perf) =>
            useEngineStore.setState({ perf, tier: perf.tier }),
          ),
          engine.on('error', (error) => {
            if (generation === 0) setGeneration(1);
            else useEngineStore.setState({ error });
          }),
          engine.on('tier', (tier) => useEngineStore.setState({ tier })),
          engine.on('mapStateChange', (mapState) =>
            useEngineStore.setState({
              mapState,
              scale: mapState.scale ?? 'explore',
              following: engine!.isFollowing,
            }),
          ),
          engine.on('commandError', ({ command, message }) =>
            useEngineStore.setState((current) => ({
              linkIssues: [
                ...current.linkIssues,
                {
                  field: command === 'layer' ? 'layers' : 'frame',
                  code: 'unsupported',
                  message,
                } satisfies RouteIssue,
              ].slice(-8),
            })),
          ),
        );
        // An explicit diagnostic test mode retains its established fixed epoch.
        // Ordinary consumer links without t restore LIVE.
        const initialState =
          debug.test && !state.t
            ? { ...state, t: tdbToIso(engine.clock.state.tdbSec) }
            : state;
        engine.applyMapState(initialState, {
          transition: false,
          select: selectedId !== null,
          recordHistory: false,
        });
        try {
          await engine.whenLayersSettled();
        } catch {
          /* The commandError subscription exposes requested-load failures. */
        }
        if (disposed || expired) {
          engine.dispose();
          return;
        }
        window.clearTimeout(startupDeadline);
        if (debug.scenario === 'leo') {
          engine.focus('planet:earth', { transition: false });
          engine.setReferenceDistance(6771.0084);
        }
        useEngineStore.setState({
          engine,
          backend: engine.backend,
          ready: true,
          error: null,
          scale: state.scale,
          mode: engine.clock.mode,
          rate: engine.clock.rate,
          following: engine.isFollowing,
          selectedId: debug.scenario === 'leo' ? 'planet:earth' : selectedId,
          mapState: engine.getMapState(),
        });
      } catch (error) {
        window.clearTimeout(startupDeadline);
        if (!disposed && !expired)
          useEngineStore.setState({
            error:
              error instanceof Error
                ? error.message
                : 'Unable to initialize 3D graphics',
          });
      }
    }
    void init();
    return () => {
      disposed = true;
      window.clearTimeout(startupDeadline);
      unsubs.forEach((fn) => fn());
      engine?.dispose();
      canvas.remove();
      delete window.__spaceEngine;
      useEngineStore.setState({ engine: null, ready: false, mapState: null });
    };
  }, [generation]);
  return (
    <div ref={host} className="canvas-wrap">
      <div ref={labels} className="labels" />
    </div>
  );
}
