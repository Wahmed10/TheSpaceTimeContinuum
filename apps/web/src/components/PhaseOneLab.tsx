'use client';
import { Profiler, useState } from 'react';
import Explore from './Explore';
declare global {
  interface Window {
    __spaceUiCommits?: number[];
  }
}
function recordCommit() {
  const commits = window.__spaceUiCommits;
  if (commits && commits.length < 10000) commits.push(performance.now());
}
export default function PhaseOneLab() {
  const [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false);
  async function run() {
    const engine = window.__spaceEngine;
    if (!engine) {
      setStatus('Wait for the renderer to finish loading.');
      return;
    }
    setBusy(true);
    try {
      const benchmark = await engine.benchmark((view) =>
        setStatus(`Measuring ${view}... Keep this tab visible.`),
      );
      setStatus('Measuring GPU precision...');
      const precision = await engine.measurePrecision();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ benchmark, precision }, null, 2)], {
          type: 'application/json',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `phase-one-${benchmark.backend}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        'Report downloaded. FPS results apply only to this device and selected quality.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Profiler id="Explore" onRender={recordCommit}>
        <Explore />
      </Profiler>
      <aside
        style={{
          position: 'fixed',
          top: 90,
          left: 16,
          zIndex: 100,
          maxWidth: 350,
          background: '#101a20',
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <button disabled={busy} onClick={() => void run()}>
          {busy ? 'Benchmark running' : 'Run Phase 1 device checks'}
        </button>
        <p role="status">
          {status ||
            'Select a quality tier first. Five views and GPU precision take 1-4 minutes. Keep the tab visible and avoid interacting until the report downloads.'}
        </p>
      </aside>
    </>
  );
}
