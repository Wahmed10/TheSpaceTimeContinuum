# The Space Time Continuum

A working **Phase 3 Solar System renderer**, not the completed MVP. Phase 3 is accepted; [the detailed Phase 4 handoff](PHASE_4_HANDOFF.md) prepares the next session's Core Consumer UX plan. Phase 4 implementation has not started.

```powershell
pnpm install
pnpm dev
```

Open http://localhost:3000. The application works locally without accounts, API keys, or a database. `?renderer=webgl` forces WebGL2; `?test=1` freezes the simulation at 2026-09-22; `?perf=1` exposes rendering diagnostics. `/lab/probe` reports browser capabilities.

Currently implemented: a Next.js/TypeScript workspace; a framework-free Three.js WebGPU/WebGL2 engine; all 21 catalog bodies with sourced maps/materials, Saturn rings and irregular Phobos/Deimos meshes; camera-relative float64 physics; orbit, zoom, pan, focus flights, follow, and history; a deterministic TDB clock with live/past/future/reverse playback; Explore/True scale; basic search, cards, layer controls, settings, and responsive UI. Reference data and attributed assets are committed. Phase 4 will complete consumer routing, share-state synchronization, search and accessibility rather than rebuild the accepted renderer.

**Phase 2 and Phase 3 are accepted.** Phase 2 retains ADR 0010's documented upstream allocation exception and accepted device coverage. Phase 3 passes local renderer/science/build, strict paired CPU regression, user laptop HIGH/WebGPU and final appearance review, including the explained Charon source-resolution limitation. Local browser automation is SwiftShader functional evidence; the separate laptop report supplies physical-device evidence. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [Phase 4 handoff](PHASE_4_HANDOFF.md) for exact scope and limitations.

Open http://localhost:3000/lab/poc?perf=1 for the original five-view checks or the **Run Phase 3 device checks** all-body report. These are reproduction tools; no repeat device run is currently pending. The [reviewed laptop report](docs/perf/phase-three/device-laptop-review.md) and [Phase 4 handoff](PHASE_4_HANDOFF.md) distinguish accepted coverage from future validation.

See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [gate report](docs/perf/gate-report.md) for the exact scope, results, limitations, and next work. The production build, lint, typecheck, runtime license audit, and texture-credit audit are separate from the scientific gate.

Useful commands:

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the application |
| `pnpm build` | Produce the Next.js production build |
| `pnpm verify` | Typecheck, lint/boundaries, all unit/science tests |
| `pnpm test:e2e` | UI, precision/depth, texture stability, React profile and visual regression |
| `pnpm exec tsx tools/fixtures/validate-horizons.ts` | Full error measurements, nonzero exit on failed gate |
| `pnpm fixtures:horizons` | Re-fetch independent JPL fixtures sequentially |
| `pnpm assets:build` | Build KTX2 tiers, NASA lunar/Mars/sky maps and BSC5 stars (requires toktx) |
| `node tools/measure-engine.mjs` | Check complete engine gzip against 450 KB |
| `pnpm licenses:check` | Audit runtime dependencies and regenerate notices |

The `db` and `ingest` packages are skeletons, not functioning services. There is no deployed site, provisioned Neon database, satellite ingestion, news pipeline, or telemetry. No fake live provider data is supplied.
