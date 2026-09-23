# Implementation status ? 2026-09-23

The full project is not complete. Phase 0/1 is a runnable, tested four-body preview. On September 23 the user explicitly chose **Keep the gate strict**: do not start Phase 2 until P1.12 passes.

## Verified checkpoint

- Strict TypeScript pnpm workspace; Next.js UI; framework-free Three WebGPU/WebGL2 engine; package boundary checks and CI configuration.
- Sun/Earth/Moon/Mars rendering, camera-relative float64 positions, logarithmic depth, camera controls/follow/history, deterministic clock, responsive search/cards/timeline/settings/layers.
- UTC/TAI/TT/TDB conversions, leap seconds, reverse playback and animated LIVE. Clock has 100% measured branch coverage.
- Weekly Horizons residual corrections for 11 bodies over 1900?2100. Original five-epoch assertions and 24 independent off-grid epochs per body pass; separate geocentric Moon acceptance passes. See ADR 0008 and science/horizons-validation.json.
- Progressive KTX2 1k/2k/4k maps, Earth day/night 8k, tier-dependent geometry, bloom and atmosphere visibility. Assets total 75.89 MB, below the 80 MB budget; manifest sizes and credits checked.
- NASA LROC Moon color and LOLA-derived normals/displacement. The displacement is display-resolution, quantized to 8-bit across -12 to +12 km, not scientific terrain data.
- 9,096 BSC5 stars with fixed J2000 directions and illustrative magnitude/color rendering.
- Solar noise granulation, limb darkening, corona and bloom; lunar Lommel?Seeliger blend; Earth cloud/night/ocean shading.
- Adaptive quality now uses real elapsed time, waits through startup, lowers DPR before tier, and honors manual settings. Reduced motion switches behind a fade.
- Disposal on loading failures, device-loss fallback, hidden-tab suspension, bounded orbit sampling, and static orbit buffers without redundant frame uploads.
- `pnpm verify`: 42 tests passing, typecheck and lint passing. Production build and two desktop/mobile-emulated Playwright walkthroughs pass. Runtime license audit: 72 dependencies pass.

## Open Phase 0/1 work

- Real WebGPU and physical-device FPS/memory/load-time measurements, backend visual comparisons and depth matrix. Local probe confirms SwiftShader only; see perf/local-gpu-probe.json.
- Earth atmosphere is still a rim approximation rather than the specified single-scattering model. Cloud shadows are a simplified texture offset; Mars MOLA normals remain absent.
- Independent orientation-reference assertions, stronger rendered precision/depth and screenshot-diff acceptance, and complete engine-bundle attribution remain outstanding.
- Upstream astronomy-engine allocates internal state objects; zero-allocation provider compliance is not established. Complete lazy per-body loading/refcounting remains pending.
- No GitHub remote/hosted CI run, database, production deployment or physical-device signoff has been claimed.

## Next work

Finish the open renderer requirements above, then run the checklist in perf/device-matrix.md on representative hardware and record P1.12 results. Keep Phase 2 blocked until acceptance passes. Phases 2?11 and 4B remain unimplemented; db and ingest are explicit skeletons.

## Reproduce

`pnpm verify`, `pnpm build`, `pnpm test:e2e`, `pnpm licenses:check`, `pnpm exec tsx tools/check-assets.ts`.

`pnpm exec vitest run --coverage --coverage.include=packages/astro/src/clock/SimulationClock.ts` checks clock coverage. `pnpm exec tsx tools/fixtures/validate-horizons.ts` regenerates the science report. `pnpm dev` starts localhost:3000; Ctrl+C stops it. No keys are required for this preview.
