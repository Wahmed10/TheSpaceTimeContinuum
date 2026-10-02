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
  async function run(phase: 'phase-one' | 'phase-three' = 'phase-one') {
    const engine = window.__spaceEngine;
    if (!engine) {
      setStatus('Wait for the renderer to finish loading.');
      return;
    }
    setBusy(true);
    try {
      const benchmark = await engine.benchmark(
        (view) => setStatus(`Measuring ${view}... Keep this tab visible.`),
        phase,
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
      link.download = `${phase}-${benchmark.backend}-${Date.now()}.json`;
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
  async function runPoints() {
    const engine = window.__spaceEngine;
    if (!engine) return;
    setBusy(true);
    setStatus('Measuring 10,000 points. Keep this tab visible.');
    try {
      const report = await engine.measurePoints();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `phase-two-points-${report.backend}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        `Point report downloaded: ${report.fps.toFixed(1)} FPS${report.softwareRenderer ? ' (software renderer)' : ''}.`,
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
        <button disabled={busy} onClick={() => void run('phase-three')}>
          Run Phase 3 device checks
        </button>
        <button disabled={busy} onClick={() => void runPoints()}>
          Run Phase 2 point checks
        </button>
        <p role="status">
          {status ||
            'Select a quality tier first. Phase 1 takes 1-4 minutes. Phase 3 checks all 21 bodies and three Saturn ring views, then GPU precision; allow 5-10 minutes. Keep this tab visible and avoid interacting until the report downloads.'}
        </p>
      </aside>
    </>
  );
}
