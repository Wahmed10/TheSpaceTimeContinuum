# The Space Time Continuum

A working **Phase 0 / Phase 1 architecture preview**, not the completed MVP.

```powershell
pnpm install
pnpm dev
```

Open http://localhost:3000. The application works locally without accounts, API keys, or a database. `?renderer=webgl` forces WebGL2; `?test=1` freezes the simulation at 2026-09-22; `?perf=1` exposes rendering diagnostics. `/lab/probe` reports browser capabilities.

Currently implemented: a Next.js/TypeScript workspace; a framework-free Three.js WebGPU/WebGL2 engine; textured Sun/Earth/Moon/Mars; camera-relative float64 physics; orbit, zoom, pan, focus flights, follow, and history; a deterministic TDB clock with live/past/future/reverse playback; Explore/True scale; search, cards, layer controls, settings, and responsive UI. Reference data and attributed textures are committed.

**The architecture gate remains open.** Scientific verification now passes without widening the original tolerances: weekly JPL Horizons residual tables correct astronomy-engine, with independent off-grid holdout tests. The local browser exposes only SwiftShader and no WebGPU adapter. Real desktop/mobile GPU performance and remaining renderer acceptance checks are pending. The user explicitly requested keeping this gate strict; Phase 2 has not started.

See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [gate report](docs/perf/gate-report.md) for the exact scope, results, limitations, and next work. The production build, lint, typecheck, runtime license audit, and texture-credit audit are separate from the scientific gate.

Useful commands:

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the application |
| `pnpm build` | Produce the Next.js production build |
| `pnpm verify` | Typecheck, lint/boundaries, all unit/science tests |
| `pnpm test:e2e` | Desktop and mobile-emulated WebGL UI checks |
| `pnpm exec tsx tools/fixtures/validate-horizons.ts` | Full error measurements, nonzero exit on failed gate |
| `pnpm fixtures:horizons` | Re-fetch independent JPL fixtures sequentially |
| `pnpm assets:build` | Build KTX2 tiers, NASA lunar maps, and BSC5 stars (requires toktx) |
| `pnpm licenses:check` | Audit runtime dependencies and regenerate notices |

The `db` and `ingest` packages are skeletons, not functioning services. There is no deployed site, provisioned Neon database, satellite ingestion, news pipeline, or telemetry. No fake live provider data is supplied.
