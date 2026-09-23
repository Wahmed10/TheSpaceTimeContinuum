'use client';
import { useEffect, useState } from 'react';
export default function Probe() {
  const [result, setResult] = useState('Checking graphics capabilities…');
  useEffect(() => {
    const gpu = (
      navigator as Navigator & {
        gpu?: {
          requestAdapter: () => Promise<{
            info: unknown;
            limits: unknown;
          } | null>;
        };
      }
    ).gpu;
    void (async () => {
      try {
        const adapter = await gpu?.requestAdapter();
        const canvas = document.createElement('canvas');
        setResult(
          JSON.stringify(
            {
              webgpu: !!gpu,
              adapter: adapter?.info ?? null,
              limits: adapter?.limits ?? null,
              webgl2: !!canvas.getContext('webgl2'),
              dpr: devicePixelRatio,
              userAgent: navigator.userAgent,
            },
            null,
            2,
          ),
        );
      } catch (e) {
        setResult(String(e));
      }
    })();
  }, []);
  return (
    <main className="document-page">
      <a href="/">← Explore</a>
      <h1>Graphics probe</h1>
      <pre>{result}</pre>
      <a href="/lab/poc?perf=1">Open renderer benchmark ↗</a>
      <br />
      <a href="/lab/poc?renderer=webgl&perf=1">Force WebGL2 ↗</a>
    </main>
  );
}
