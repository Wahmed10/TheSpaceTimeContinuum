# Implementation status - 2026-09-23

**Latest user decision:** the existing device reports and visual review are sufficient; further tier/browser coverage is waived as a prerequisite. Hosted CI has passed. Upstream allocation acceptance remains unresolved; no allocation exception or Phase 3 implementation is authorized.

## Current update: September 26, 2026

Hosted CI update: the repository is now `Wahmed10/TheSpaceTimeContinuum`, with local/remote `main` connected. [Verify passed](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277070443), including all 16 browser tests. After fixing hidden-directory artifact exclusion, CPU record run `36277869074` succeeded with a saved, reviewed Linux baseline. Independent hosted comparison run 36278590782 passed all five paths; automatic CPU comparisons are configured for main pushes and pull requests. See [hosted CI status](perf/hosted-ci.md). Older no-remote/no-hosted-run statements below are historical.

Latest device review: [six September 26 reports](perf/device-review-2026-09-26.md) pass at recorded tiers: laptop WebGPU HIGH, laptop WebGL2 MEDIUM and Android Brave LOW, including all 11 depth probes and three 10k-point runs. The user reports no visual issues and explicitly requests no Phase 3 implementation yet. This supersedes the older statement below that all supplied reports predate orbit/API changes. Remaining exact tiers/browser coverage and engineering acceptance are still open.

Fresh-session transition guide: [Phase 3 handoff](../PHASE_3_HANDOFF.md). The user reports that current navigation looks good. This is qualitative usability feedback; outstanding formal acceptance items below remain open. Phase 3 implementation has not started.

Phase 2 is explicitly authorized. P2.1 and P2.3-P2.8 are implemented with local verification. All 21 built-in bodies render and appear in search. The six osculating snapshot models retain their 300 independent JPL holdouts and unchanged tolerances. Detailed non-hero materials and Saturn rings remain Phase 3.

P2.9 now has a v1 consumer `EngineApi`, typed events, provider-backed entity registration and external point-source registration. The application store uses the consumer API and boundary checks reject camera-internal access. A 10,000-point source was exercised through rendering, touch picking, focus, layer reuse, failure isolation and disposal. The API does not fabricate missing ingest data or automatically add external records to the application search UI. See `packages/engine/README.md` for ownership, validation and source-buffer contracts.

P2.10 has a five-camera-path CPU recorder, Playwright CLI and comparator that fails above 20% mean or p95 regression. Schema 2 advances simulation at 1x with fixed 60 Hz scheduling; comparisons require matching CPU/platform/browser/configuration and scheduled-work counts. The corrected local Windows/SwiftShader repeat passes all five paths (largest p95 increase 10.34%). Earlier schema 1 evidence and its failed comparison remain preserved. Hosted acceptance is pending: no Git remote is configured. The manual CI bootstrap workflow requires a matching reviewed Linux baseline before comparison or automatic triggers are enabled.

Current tests: 116 passed plus the same two expected rejected-model diagnostics; typecheck/lint and production build pass. Ten final browser regressions pass, covering mobile/LAN startup, picking, providers/sources, orbits, precision/depth, texture reuse and all eight unchanged material references. Precision is 0.134356 px against 0.5 px, with all 11 depth scenarios passing. Engine bundle is 368,185 / 450,000 gzip bytes. Physical Samsung S23 Ultra / Brave ULTRA and desktop WebGPU reports remain preserved with verified original hashes; they predate these registration changes.

P2.2 upstream astronomy-engine allocation acceptance and remaining exact device tiers/browser coverage are still pending. Hosted CPU CI comparison has passed; the user reports no visual issues on tested devices. Phase 2 is not declared fully accepted. See [Phase 2 checkpoint](PHASE_2_CHECKPOINT.md) and [CPU evidence guide](perf/cpu-regression.md).
## Historical Phase 1 checkpoint (September 23)

Phase 1 implementation was ready for review. **Acceptance remained pending physical-device validation.** The user chose "Keep the gate strict" and requested finishing Phase 1. Phase 2 had not started at this historical checkpoint. The positive localhost visual review does not replace the device matrix.

Two user-supplied Windows Chrome WebGPU reports establish LOW and ULTRA performance (~161.3 FPS at p95 in all five views) and rendered precision/depth passes. The expected HIGH report actually records ULTRA. Exact HIGH, forced WebGL2, mobile and backend visual comparison remain unrecorded. Phase 2 approval was subsequently supplied; these physical-device measurements remain pending.

## Implemented and locally verified

- Strict TypeScript workspace, Next.js UI, framework-free Three WebGPU/WebGL2 renderer, package boundaries and CI workflows.
- Sun/Earth/Moon/Mars; float64 physics, camera-relative rendering, logarithmic depth, smooth zoom/focus/follow/history, keyboard/touch input, reduced-motion fade and Explore/True scale.
- UTC/TAI/TT/TDB sampled round trips below 1 microsecond. Deterministic live/past/future/reverse clock; 100% branch coverage (36/36).
- Weekly JPL Horizons residual corrections over 1900-2100. Original tolerances and 24 independent off-grid epochs per body pass for 11 bodies, including geocentric Moon checks. Four-body computation: 0.116 ms/frame against 0.2 ms. Sampled accuracy is not a bound at every instant.
- Earth apparent sidereal orientation and date-to-J2000 conversion; Greenwich noon check. Independent NAIF Mars orientation fixtures agree within 0.01 degree.
- Sun granulation/limb/corona/bloom; Earth day/night/cloud/ocean shading, spherical-shell Rayleigh/Mie single-scattering approximation and HIGH cloud shadows; Moon LROC color, LOLA normals/displacement and Lommel-Seeliger blend; Mars MOLA normals; NASA Deep Star Maps background plus 9,096 BSC5 stars.
- Progressive compressed textures, reference counts, device memory/texture limits, adaptive DPR/tier recovery, and released bloom buffers on LOW.
- Responsive search/cards/timeline/settings/layers and throttled React bridge. Lab-only React Profiler checks 30 seconds at 1 day/s.
- Render/readback precision and depth checks, eight material screenshot comparisons, desktop/touch walkthroughs and LOW texture stability over 20 focus changes.
- The /lab/poc button downloads five-view performance and precision/depth results. Hidden tabs and unsettled textures invalidate a run.

## Evidence and limits

See [gate report](perf/gate-report.md) and [device matrix](perf/device-matrix.md). Local browser evidence uses SwiftShader WebGL2; no real WebGPU adapter is available. Texture memory means compressed asset mip storage, not total VRAM. Atmosphere uses uniform-density analytic scattering. Lunar displacement is display-resolution, 8-bit terrain across +/-12 km, not scientific terrain data.

No hosted CI run, deployment, database or complete device-matrix PASS is claimed; individual submitted device results are recorded separately. Upstream astronomy-engine still allocates internal objects; the Phase 2 zero-allocation requirement has not been asserted. Phase 2 is now partially implemented as described above; later phases, db and ingest remain unimplemented/skeletons.

## Reproduce

Run pnpm verify, pnpm build, pnpm test:e2e, pnpm licenses:check, pnpm exec tsx tools/check-assets.ts, and node tools/measure-engine.mjs.

Clock coverage: pnpm exec vitest run --coverage --coverage.include=packages/astro/src/clock/SimulationClock.ts
Science report: pnpm exec tsx tools/fixtures/validate-horizons.ts
CPU budget: pnpm exec tsx tools/profile-ephemeris.ts

pnpm dev starts localhost:3000; Ctrl+C stops it. No keys are required.
