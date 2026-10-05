'use client';
import { useEffect, useRef, useState } from 'react';
import { loadUiTime, tdbToIso } from './uiTimeAdapter';
import { useEngineStore } from './useEngineStore';
import { parseExploreLocation } from '../lib/routeState';
import type { RouteIssue } from '../lib/routeState';
import type { SpaceEngine } from '@space/engine';
import { initializeUserSettings } from './userSettingsBridge';
import { prefersReducedMotion } from '../lib/userSettings';
import { clockUiState } from './clockSnapshot';
declare global {
  interface Window {
    __spaceEngine?: SpaceEngine;
    /** Installed before navigation only by the production shell attribution audit. */
    __spaceEngineStartGate?: Promise<void>;
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
      'Interactive solar system. Drag to orbit, scroll to zoom. Arrow keys orbit, plus and minus zoom. Press O for the selectable Objects in view text list, slash to search every world, and question mark for help. These actions are also in Settings.',
    );
    host.current!.prepend(canvas);
    async function init() {
      try {
        const initialLocation = parseExploreLocation(
          location.pathname,
          location.search,
        );
        const { state, debug } = initialLocation;
        if (initialLocation.route.status !== 'lab')
          unsubs.push(initializeUserSettings());
        useEngineStore.setState({ linkIssues: initialLocation.issues });
        if (debug.test && window.__spaceEngineStartGate)
          await window.__spaceEngineStartGate;
        if (disposed || expired) return;
        const [{ SpaceEngine }, { isoToTdb }] = await Promise.all([
          import('@space/engine'),
          loadUiTime(),
        ]);
        if (disposed || expired) return;
        engine = await SpaceEngine.create(canvas, {
          forceWebGL: generation > 0 || debug.forceWebGL,
          labels: labels.current!,
          test: debug.test,
          focus: state.focus,
          ...(state.t ? { tdbSec: isoToTdb(state.t) } : {}),
        });
        if (disposed || expired) {
          engine.dispose();
          return;
        }
        if (initialLocation.route.status !== 'lab') {
          const preferences = useEngineStore.getState();
          engine.setQuality(preferences.quality);
          engine.setReducedMotion(
            prefersReducedMotion(
              preferences.reducedMotion,
              preferences.systemReducedMotion,
            ),
          );
        }
        unsubs.push(
          engine.on('clock', (s) => {
            // Text follows the clock without React. Cold mode/rate/boundary
            // changes remain immediate; recurring date snapshots are combined
            // with perf below, avoiding two independent 4 Hz commit cadences.
            const current = useEngineStore.getState();
            const next = clockUiState(s, current);
            if (
              next.mode !== current.mode ||
              next.rate !== current.rate ||
              next.clockClamped !== current.clockClamped
            )
              useEngineStore.setState(next);
            const el = document.getElementById('clock-readout');
            if (el)
              el.textContent =
                tdbToIso(s.tdbSec).replace('T', ' · ').slice(0, 21) + ' UTC';
          }),
          engine.on('perf', (perf) =>
            useEngineStore.setState((current) => ({
              ...clockUiState(engine!.clock.state, current),
              perf,
              tier: perf.tier,
            })),
          ),
          engine.on('error', (error) => {
            if (generation === 0) setGeneration(1);
            else useEngineStore.setState({ error });
          }),
          engine.on('tier', (tier) => useEngineStore.setState({ tier })),
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
        // Consumer cold subscriptions belong to RouteStateBridge. The standalone
        // lab retains its own display adapter and never writes consumer history.
        if (initialLocation.route.status === 'lab')
          unsubs.push(
            engine.on('select', (selectedId) =>
              useEngineStore.setState({
                selectedId,
                following: engine!.isFollowing,
              }),
            ),
            engine.on('mapStateChange', (mapState) =>
              useEngineStore.setState({
                mapState,
                scale: mapState.scale ?? 'explore',
                following: engine!.isFollowing,
              }),
            ),
          );
        // Navigation can finish while assets are loading. Restore the latest
        // accepted location, including changes during requested-layer settling.
        let appliedLocation: string;
        let latest: ReturnType<typeof parseExploreLocation>;
        do {
          appliedLocation = location.pathname + location.search;
          latest = parseExploreLocation(location.pathname, location.search);
          useEngineStore.setState({ linkIssues: latest.issues });
          // Explicit test mode retains its fixed epoch; absent consumer t is LIVE.
          const restored =
            latest.debug.test && !latest.state.t
              ? { ...latest.state, t: tdbToIso(engine.clock.state.tdbSec) }
              : latest.state;
          engine.applyMapState(restored, {
            transition: false,
            select: latest.selectedId !== null,
            recordHistory: false,
          });
          try {
            await engine.whenLayersSettled();
          } catch {
            /* commandError exposes requested-load failures. */
          }
          if (disposed || expired) {
            engine.dispose();
            return;
          }
        } while (appliedLocation !== location.pathname + location.search);
        if (
          latest.debug.test ||
          latest.debug.perf ||
          location.pathname.startsWith('/lab/')
        )
          window.__spaceEngine = engine;
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
          scale: latest.state.scale,
          mode: engine.clock.mode,
          rate: engine.clock.rate,
          following: engine.isFollowing,
          selectedId:
            debug.scenario === 'leo' ? 'planet:earth' : latest.selectedId,
          mapState: engine.getMapState(),
          appliedLocation,
          utcDate: tdbToIso(engine.clock.state.tdbSec).slice(0, 16),
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
      useEngineStore.setState({
        engine: null,
        ready: false,
        mapState: null,
        appliedLocation: null,
        utcDate: '',
      });
    };
  }, [generation]);
  return (
    <div ref={host} className="canvas-wrap">
      <div ref={labels} className="labels" />
    </div>
  );
}
