'use client';
import { useEffect, useRef, useState } from 'react';
import { isoToTdb, tdbToIso } from '@space/astro';
import { useEngineStore } from './useEngineStore';
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
        const { SpaceEngine } = await import('@space/engine');
        if (disposed) return;
        const q = new URLSearchParams(location.search);
        engine = await SpaceEngine.create(canvas, {
          forceWebGL: generation > 0 || q.get('renderer') === 'webgl',
          labels: labels.current!,
          test: q.has('test'),
          ...(q.get('t') ? { tdbSec: isoToTdb(q.get('t')!) } : {}),
        });
        if (disposed) {
          engine.dispose();
          return;
        }
        useEngineStore.setState({
          engine,
          backend: engine.backend,
          ready: true,
          error: null,
        });
        if (q.has('test') || q.has('perf')) window.__spaceEngine = engine;
        unsubs.push(
          engine.on('select', (id) =>
            useEngineStore.setState({
              selectedId: id,
              following: engine!.cameraController.following,
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
        );
        const focus = q.get('focus');
        if (focus) engine.focus(focus, { transition: false });
        if (q.get('scale') === 'true') {
          engine.setScale('true');
          useEngineStore.setState({ scale: 'true' });
        }
        if (q.has('layers')) {
          const enabled = new Set(q.get('layers')!.split(','));
          for (const id of ['planets', 'moons', 'orbits'])
            engine.setLayer(id, enabled.has(id));
        }
        if (q.get('scenario') === 'leo') {
          engine.focus('planet:earth', { transition: false });
          engine.cameraController.distanceKm = 6771.0084;
        }
      } catch (error) {
        if (!disposed)
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
      unsubs.forEach((fn) => fn());
      engine?.dispose();
      canvas.remove();
      delete window.__spaceEngine;
      useEngineStore.setState({ engine: null, ready: false });
    };
  }, [generation]);
  return (
    <div ref={host} className="canvas-wrap">
      <div ref={labels} className="labels" />
    </div>
  );
}
