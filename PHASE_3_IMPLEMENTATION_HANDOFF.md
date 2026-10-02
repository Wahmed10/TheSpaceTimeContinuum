# Phase 3 implementation handoff

Updated October 2, 2026. This supersedes the original September 27 instruction to start an unimplemented Phase 3. Scope authority remains `IMPLEMENTATION_PLAN.md`. Phase 2 is accepted with ADR 0010's allocation exception and the user's accepted device coverage. Do not reopen those gates. Phase 3 is now accepted; the next-session transition is documented in `PHASE_4_HANDOFF.md`. Phase 4 implementation remains unstarted.

## Current outcome

All 21 catalog bodies have reviewed appearance and scientific frame integration. Previously reviewed renderer/science/build, strict same-machine CPU and **laptop HIGH/WebGPU** gates pass; no device repeat is pending. The authorized geographic audit corrected Ceres/Charon map offsets and Phobos/Deimos source frames. Independent shape rays and twelve USGS landmarks pass; verify is **131 passed plus two expected rejected-model diagnostics**. The corrected source `b277fce` now passes **17 browser tests**, zero failed/skipped/flaky, production build and agent visual review of **60 captures**. Source-accuracy limitations remain documented as enhancements, not survey-accuracy claims. October 2 user checks pass Ceres, Phobos and Deimos. The reported Charon smudging matches low-detail regions in the original NASA basemap; the investigation is in `docs/science/surface-registration-audit.md`. The temporary screenshot was inspected and removed. The user subsequently accepted the explained Charon source limitation and confirmed readiness for Phase 4. Phase 3 is closed; see `PHASE_4_HANDOFF.md` and `docs/science/surface-registration-manual-review.md`.

No background job is pending. `.tools/phase-three-active-job.txt` selects the completed and reviewed `.tools/surface-audit/regression` job; `node tools/phase-three-status.mjs` reports FINISHED. Evidence is archived in `docs/perf/phase-three/surface-audit-*`; the checkpoint records the review. Do not relaunch passing jobs simply because a new session starts.

## Source and milestones

| Source | Outcome |
|---|---|
| `4409ef5d8f97299d9058360c97d560493d067c1c` | Immutable accepted Phase 2 CPU reference |
| `b4b2e87` | Saturn rings, analytic shadows, compressed-ring alignment and stable publishing fix |
| `2fd73e8`, `eb605bcb`, `0dd0d02` | Venus/Titan treatments; Pluto/Charon, colored Galilean, Ceres/Triton maps |
| `2ee8013` | Sourced Phobos/Deimos irregular meshes with matching UV atlases |
| `3b054cb` | Ten missing NAIF PCK scientific attitudes and independent fixtures |
| `bc79965` | Six planetary moon-system interaction regressions |
| `1868950` | Independent Io projection registration and cold texture transform helpers |
| `f57b42d` | Lazy attitude derivatives; correct, but its standalone CPU trial still failed |
| `2a780a7` | Diagnostic profiling tools and preserved failed evidence |
| `f74242aa1c8971b2ffa23da51b477a057b26a1f6` | Visible-mesh surface updates; full browser/build and strict paired CPU pass |
| `749a506ac1a04af91920201a4900b061fd4fcf50` | Preserved accepted evidence; all-body lab benchmark and regression tests |

Documentation-only continuation records the reviewed device-check result. These commits are local; no deployment or hosted Phase 3 validation is claimed.

## Implemented behavior

- Existing Mercury, Venus, Jupiter, Saturn, Uranus and Neptune maps are enabled. Gas giants have atmosphere rims and tier-aware detail. Saturn has C/B/A annuli, Cassini division, radial color/opacity, both analytic shadow directions and forward-scattering approximation with LOW fallback. Rings retain geometry through quality changes and have compatible logarithmic depth.
- Venus has an opaque cloud deck. Titan has opaque haze, rather than presenting its surface as directly visible. Pluto/Charon use licensed New Horizons maps with missing coverage documented. Io uses a USGS color-merge source; the other Galilean maps and Ceres/Triton use sourced NASA imagery. Source resolution limits remain enforced.
- Phobos/Deimos retain sourced irregular shapes and matching atlas UVs, simplified for the asset budget. Non-spherical geometry survives quality/LOD changes. Camera clearance uses bounding extent; physical radii and provider coordinates stay unchanged. User direction: use irregular meshes whenever a body's physical shape requires them and appropriate source models exist.
- Ceres and nine previously unoriented moons use PCK00011 scientific rotations. Independent CSPICE fixtures cover 60 matrices over 1900–2100 at unchanged component tolerances. Scientific Z-north converts to texture Y-north exactly once. Original hero attitudes/providers are preserved.
- Earth, Mars, Jupiter, Saturn, Neptune and Pluto moon systems pass True/Explore views, orbit visibility, physical-state invariance and touch focus. All planetary/moon orbit providers retain existing accuracy/approximation labels.
- Render frames defer attitude, cloud/material uniform and geometry-detail work while a mesh is hidden or represented by a point. Current absolute-time state is refreshed before the mesh is drawn. Position/point/label/orbit updates continue. Full state transforms calculate attitude derivatives lazily when required; transport velocity remains correct.
- The lab has a separate **Run Phase 3 device checks** button. It observes all 21 close-ups and three Saturn ring sides, rejects hidden/incomplete runs, downloads an explicitly named report and restores saved settings. API v1 and frame hot paths are unchanged by this instrumentation. The original five-view and point-check buttons remain available.

## Reviewed evidence

Local checks: typecheck, lint/package boundaries, **128 passed tests plus two expected rejected-model diagnostics**. Assets/manifest/alignment checks and **72 production dependency licenses** pass. Distributed assets, including shapes: **79,961,515 / 80,000,000 bytes**, leaving only 38,485 bytes. Current standalone engine: **373,041 / 450,000 gzip bytes**.

The `.tools/cpu-phase-three/retry-2` job tests `f74242a`: **29 browser tests pass**, zero failed/skipped/flaky; production build passes. All 77 captures were visually reviewed in four contact sheets; original eight material references pass unchanged tolerances. Precision error is **0.134356 px / 0.5 px** over 600 samples; all eleven depth checks pass. React commits are **3.0656/sec / 4/sec**. LOW compressed mip storage stays **16,516,088 bytes**, with 33 textures after twenty focus changes. These mip bytes are not total VRAM.

Its unprofiled CPU reference/candidate captures are sequential on the same Windows machine, with matching Ryzen 7 8845HS, Chromium 153.0.8010.12, Node 24.12.0, viewport, LOW/True configuration, fixed scheduling, five paths and 30/120 warmup/measured frames. All paths pass the unchanged 20% mean/p95 gate. Largest increases: **13.33% mean / 10.53% p95**. Earth LEO p95 is 2.0 ms in both versions. Both earlier failed trials and the diagnostic profiles remain preserved; thresholds were never relaxed.

The `.tools/phase-three-device` job tests `749a506`: **six browser tests pass**, zero failed/skipped/flaky, and production build passes. The actual download contains **24 valid views**, at least 44 samples per view, zero unsettled textures, all focused meshes visible and all ring views visible. At LOW, maximum recorded draw calls are 24, detailed meshes three and asset mip bytes 16,516,088. Precision/depth and focus/layers/scale/playback/quality restoration pass. This uses SwiftShader WebGL2 at approximately five FPS; it establishes functional correctness, not a hardware throughput pass.

Durable records: `docs/perf/phase-three/validation-final.json`, raw final CPU reports/comparison, `browser-final.json`, `build-final.log`, `visual-review-1.png` through `visual-review-4.png`, `device-software.json`, `device-browser.json`, `device-validation.json`, and `cpu-regression.md`. Raw profiles, original captures, wrapper launchers and logs remain under their `.tools/` job directories.

## Laptop device step completed and reviewed

The user supplied `phase-three-webgpu-1790908597477.json`. HIGH/WebGPU throughout, 240 samples for each of 24 views, worst p95 6.20 ms, mean FPS range 161.33–164.71, maximum 36 draw calls, three detailed meshes and 119,844,112 compressed mip bytes. Precision error 0.107680 px; all eleven depth probes pass. Windows Chrome 153, viewport 1707×904/DPR 1.5; adapter identity is blank. This accepts that user-attested laptop/backend/tier result, without claiming a particular GPU or new physical mobile/forced-WebGL2 coverage. Original download is untouched; byte-identical preserved copy and review are linked in `docs/perf/phase-three/device-laptop-review.md`. No fix or repeat run is needed.

The following device instructions are retained for reproduction, not an outstanding user request.

Open `http://localhost:3000/lab/poc?perf=1`, select **HIGH**, and press **Run Phase 3 device checks**. Leave the tab visible without interacting for 5–10 minutes. Progress reaches `24/24`, then precision; completion says **Report downloaded**. Place `phase-three-<backend>-<timestamp>.json` in `test-results/` and return for review. This records new Phase 3 rendering, not a repeat acceptance request for Phase 2.

Review the actual backend/adapter and every view's p95 against existing hardware targets, plus draw/mesh/storage budgets and precision/depth. A missing adapter name or absent software-name match is not independent hardware identification. Record visual artifacts/errors. A forced-WebGL2 comparison is available using `&renderer=webgl`; mobile uses the reachable LAN URL and LOW/MEDIUM. See `docs/perf/phase-three/device-checks.md` for the exact method and limits. The rolling statistics cover the final up to 240 RAF intervals, not GPU execution time or a sustained thermal test.

## Scientific source limitations and accepted appearance choices

`docs/science/surface-registration-audit.md` verifies Io using its ISIS projection, six other solid-body maps using twelve independent USGS landmarks, Triton's gross mapping using independent projection/image comparison, and the two Mars moon frames using independent shape models. Four cold-path corrections pass unit/browser/build and agent visual review. Source models still lack declared cartographic frames; registration is inferred from recorded evidence rather than attributed to nonexistent metadata. Fine geodetic accuracy, model-generation differences and source coverage remain limitations in `docs/ENHANCEMENTS.md`. Ceres/Phobos/Deimos user checks pass; Charon's original-source blur is investigated, documented and now accepted by the user. No runtime or asset change was made for this report.

The user accepted remaining Io blur/smearing as a future improvement, recorded in `docs/ENHANCEMENTS.md`. They accepted Ceres's naturally muted appearance and the existing gray source map; do not substitute enhanced spectral false color as natural color. Imagery/color/coverage and atmosphere approximations remain documented in the scientific and licensing files. Literal zero upstream transient allocation remains deferred under accepted ADR 0010.

## Workspace and resume constraints

- Read root `AGENTS.md`. Multi-minute jobs must be launched persistently, with source/PID/commands/logs/next step recorded, then hand off. Review existing jobs first; do not poll or duplicate completed runs.
- Windows PowerShell; use `pnpm.cmd`. Read relevant installed Next documentation before app edits under `apps/web/AGENTS.md`.
- Preserve the independent user server: root cmd PID **3640**, `.tools/saturn-fix/dev.pid`, `dev.cmd`, `dev-server.log`, port 3000. Confirm identity before any process operation; do not terminate it with reference/test cleanup. Reference worktree/server is separate at `.tools/cpu-phase-three/reference`, port 3001, and currently stopped.
- Preserve `test-results/`: user downloads live there. Always supply a new `.tools/...` Playwright output directory.
- Generated older `docs/perf` files/screens remain modified and outside implementation commits. Pre-suite copies exist in `.tools/phase-three-full/perf-before/`. Do not reset or silently overwrite unrelated evidence. Inspect `git status` first.
- Temporary screenshots were inspected and removed under the user's instruction; the prior temporary folder was empty at last review. Inspect any newly supplied pictures before removing them.
- Do not regenerate ephemeris data, change scientific tolerances or loosen performance/asset budgets to resolve a visual failure. No database, keys, deployment or Phase 4 work is required here.

Phase 3 acceptance is closed: the user accepted the explained Charon source-imagery limitation and confirmed Phase 4 readiness. Corrected browser/build and agent capture review have passed; no repeated tests or laptop/CPU measurements are pending. Do not claim the blur was repaired, synthesize measured detail, or revert the independently verified map registration. Resume with `PHASE_4_HANDOFF.md`: prepare a file-level Phase 4 plan for approval before implementation. This session created documentation only; Phase 4 remains unstarted.
