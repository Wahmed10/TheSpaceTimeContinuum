# The Space Time Continuum

A working Solar System explorer with **Phase4 consumer UX accepted**. The approved [progressive loading](docs/PHASE_4_PROGRESSIVE_LOADING_PLAN.md) meets the original startup, byte, date-jump, science and CPU targets. The user completed the [changed-UX walkthrough](docs/PHASE_4_UX_REVIEW.md); [final acceptance](docs/perf/phase-four/p4-9-final-acceptance.md) records the evidence and deferred design polish. [The implementation handoff](PHASE_4_IMPLEMENTATION_HANDOFF.md) records the exact tested source and completed acceptance. For the next session, read [the Phase 5 handoff](PHASE_5_HANDOFF.md), including the unimplemented Phase 4B prerequisite. Check the recorded job with `node tools/phase-four-status.mjs`.

```powershell
pnpm install
pnpm dev
```

Open http://localhost:3000. The application works locally without accounts, API keys, or a database. `?renderer=webgl` forces WebGL2; `?test=1` freezes the simulation at 2026-09-22; `?perf=1` exposes rendering diagnostics. `/lab/probe` reports browser capabilities.

Object routes use catalog IDs, for example `/object/planet/mars`, `/object/moon/europa`, `/object/dwarf/pluto` and `/object/moon/charon`. Friendly paths such as `/mars` redirect with validated link settings. Optional `SITE_URL` must be an HTTP(S) origin with no credentials, path, query or fragment; set it in the web build environment (or `apps/web/.env.local`). Unconfigured/invalid origins omit absolute canonical and Open Graph URLs. Metadata uses catalog descriptions, with no invented live measurements. Event links currently return an unavailable-events 404.

Check the recorded Phase4 job from PowerShell with `node tools/phase-four-status.mjs`. This prints its source, stage outcomes, matching review and remaining decisions without starting tests. [The final automated review](docs/perf/phase-four/p4-9-progressive-integration-5-review.md) passes480 unit/science checks plus2 expected diagnostics,108 browser cases,4 performance cases,3 production profiles and all3 predetermined CPU pairs. First-frame maxima are0.901s desktop/4.421s simulated4G, actual startup929385bytes/1500000 and uncached desktop jumps<=113ms/1000. All original thresholds remain; [earlier failed cold evidence](docs/perf/phase-four/p4-9-regression-1-review.md) is preserved. No validation job is running. The user UX review is complete; Phase4 is accepted.

Consumer UX includes canonical links and Back/Forward restoration, local search across all21 bodies and aliases, physical measurements and source provenance, sharing, UTC date/eight-speed playback, requested/visible layer states, persisted distance/quality/motion settings, mobile card sheets and a selectable Objects in view list. The default shell has six controls; Settings contains secondary actions. Native keyboard flows, fourteen actual open-state accessibility scans and whole-Explore accelerated profiles pass review. These checks supplement manual accessibility assessment.

The framework-free Three.js WebGPU/WebGL2 renderer retains the accepted21 sourced bodies, Saturn rings, irregular Phobos/Deimos meshes, camera-relative float64 physics, camera inputs/focus/follow/history and Explore/True scale. P4.9 measures production shell attribution, cold first frame, settled navigation, desktop throughput and geometry/storage. Phone viewport emulation remains distinct from physical-phone evidence. Reference data, assets and original tolerances are preserved.

**Phase 2 and Phase 3 are accepted.** Phase 2 retains ADR 0010's documented upstream allocation exception and accepted device coverage. Phase 3 passes local renderer/science/build, strict paired CPU regression, user laptop HIGH/WebGPU and final appearance review, including the explained Charon source-resolution limitation. Local browser automation is SwiftShader functional evidence; the separate laptop report supplies physical-device evidence. See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [Phase 4 handoff](PHASE_4_HANDOFF.md) for exact scope and limitations.

Open http://localhost:3000/lab/poc?perf=1 for the original five-view checks or the **Run Phase 3 device checks** all-body report. These are reproduction tools; no repeat device run is currently pending. The [reviewed laptop report](docs/perf/phase-three/device-laptop-review.md) and [Phase 4 handoff](PHASE_4_HANDOFF.md) distinguish accepted coverage from future validation.

See [implementation status](docs/IMPLEMENTATION_STATUS.md) and [gate report](docs/perf/gate-report.md) for the exact scope, results, limitations, and next work. The production build, lint, typecheck, runtime license audit, and texture-credit audit are separate from the scientific gate.

Useful commands:

| Command                                             | Purpose                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                                          | Start the application                                                       |
| `pnpm build`                                        | Produce the Next.js production build                                        |
| `pnpm verify`                                       | Typecheck, lint/boundaries, all unit/science tests                          |
| `pnpm test:e2e`                                     | UI, precision/depth, texture stability, React profile and visual regression |
| `pnpm exec tsx tools/fixtures/validate-horizons.ts` | Full error measurements, nonzero exit on failed gate                        |
| `pnpm fixtures:horizons`                            | Re-fetch independent JPL fixtures sequentially                              |
| `pnpm assets:build`                                 | Build KTX2 tiers, NASA lunar/Mars/sky maps and BSC5 stars (requires toktx)  |
| `node tools/measure-engine.mjs`                     | Check complete engine gzip against 450 KB                                   |
| `pnpm licenses:check`                               | Audit runtime dependencies and regenerate notices                           |

The `db` and `ingest` packages are skeletons, not functioning services. There is no deployed site, provisioned Neon database, satellite ingestion, news pipeline, or telemetry. No fake live provider data is supplied.
