# Implementation status - 2026-09-23

Phase 1 implementation is ready for review. **Acceptance remains pending physical-device validation.** The user chose "Keep the gate strict" and requested finishing Phase 1. Phase 2 has not started. The positive localhost visual review is recorded; it does not replace the device matrix.

Update: two user-supplied Windows Chrome WebGPU reports now establish LOW and ULTRA performance (~161.3 FPS at p95 in all five views) and rendered precision/depth passes. The expected HIGH report actually records ULTRA. Exact HIGH, forced WebGL2, mobile and backend visual comparison remain unrecorded. The user explicitly requires approval before Phase 2; no approval has been given.

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

No hosted CI run, deployment, database or physical-device PASS is claimed. Upstream astronomy-engine still allocates internal objects; the Phase 2 zero-allocation requirement has not been asserted. Phases 2-11 and 4B remain unimplemented; db and ingest are skeletons.

## Reproduce

Run pnpm verify, pnpm build, pnpm test:e2e, pnpm licenses:check, pnpm exec tsx tools/check-assets.ts, and node tools/measure-engine.mjs.

Clock coverage: pnpm exec vitest run --coverage --coverage.include=packages/astro/src/clock/SimulationClock.ts
Science report: pnpm exec tsx tools/fixtures/validate-horizons.ts
CPU budget: pnpm exec tsx tools/profile-ephemeris.ts

pnpm dev starts localhost:3000; Ctrl+C stops it. No keys are required.
