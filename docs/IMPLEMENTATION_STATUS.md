# Implementation status — October 1, 2026

## Current: Phase 3 rendering implemented; local regression accepted

All 21 bodies now have reviewed appearance, with Saturn rings/shadows, giant atmosphere rims, Venus/Titan cloud or haze treatments, sourced dwarf/moon maps, Phobos/Deimos irregular meshes and the ten previously missing scientific attitudes. Moon-system True/Explore, orbit and touch interactions pass. Phase 2 remains accepted with ADR 0010 and documented device coverage.

The reviewed `f74242a` run passes 128 unit tests plus two expected rejected-model diagnostics, all 29 browser tests, production build and the strict five-path same-machine CPU comparison against accepted Phase 2 `4409ef5`. CPU mean/p95 increases are at most 13.33%/10.53%, below the unchanged 20% gate. Original material references and scientific tolerances are unchanged. All 77 new regression captures were reviewed. Evidence: [Phase 3 CPU investigation](perf/phase-three/cpu-regression.md), [validation record](perf/phase-three/validation-final.json), and [checkpoint](PHASE_3_CHECKPOINT.md).

Local automation is SwiftShader WebGL2. The user's laptop HIGH/WebGPU Phase 3 report passes all 24 views: worst p95 6.20 ms, maximum 36 draw calls/three detailed meshes, compressed mip storage 119.84 MB, precision error 0.107680 px and all eleven depth probes pass. Exact GPU identity is unavailable. See [the laptop review](perf/phase-three/device-laptop-review.md). The all-body device-report button is validated at `749a506`: six browser tests and production build pass, with coverage and settings restoration verified. No repeat of the passing laptop run is pending. The subsequently authorized [surface registration audit](science/surface-registration-audit.md) resolves gross geographic frames and corrects Ceres/Charon longitude offsets and Phobos/Deimos source axes. Current verify passes 131 tests plus two expected diagnostics. Corrected browser/build and visual review remain pending; source accuracy limits are documented. See [the current handoff](../PHASE_3_IMPLEMENTATION_HANDOFF.md). No complete Phase 3 acceptance or Phase 4 start is claimed.

Everything below is historical acceptance context.

## September 27: Phase 2 accepted; Phase 3 ready to begin

The user explicitly accepted the existing device coverage/visual review and approved ADR 0010's scoped upstream allocation exception. No further Phase 2 acceptance decision is pending. Literal zero allocation remains unachieved and is tracked as a future enhancement in docs/ENHANCEMENTS.md; it is not a Phase 3 prerequisite.

All 21 bodies, provider/frame infrastructure, LOD, pooled labels, layers, adaptive orbit ribbons, picking and API v1 are implemented. Hosted Verify passed 118 unit tests plus two expected rejected-model diagnostics, science and retained-memory checks, production build and all 16 browser tests. Same-runner CPU comparison 36293066482 passed all five paths at the unchanged 20% threshold (maximum p95 increase 8.33%). Automatic comparisons retain a fixed reference commit and measure both versions sequentially on the same runner.

The pinned astronomy-engine patch reduced sampled temporary allocation by 71-85% in investigated workloads while preserving exact upstream parity over 495 states for both module entrypoints. Remaining allocations are permitted only within the documented exception; unchanged scientific tests, output-buffer contracts, <1 MB retained growth after 100,000 calls and the CPU gate remain in force. Engine bundle: 368,130 / 450,000 gzip bytes.

See [Phase 3 handoff](../PHASE_3_HANDOFF.md), [accepted ADR 0010](adr/0010-astronomy-allocation-patch.md), [future enhancement](ENHANCEMENTS.md) and [hosted CI evidence](perf/hosted-ci.md). Phase 3 implementation has not started in this session. A new session can start on the user's instruction without reopening these accepted decisions. No long job is pending.

Everything below is historical Phase 1 context; older pending-gate statements do not override the accepted status above.

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
