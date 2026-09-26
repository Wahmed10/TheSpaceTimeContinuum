# Phase 2 checkpoint - September 26, 2026

The user explicitly authorized Phase 2 and repeated continuation through usage-limit resets. Continue without asking again. Missing Phase 1 physical-device evidence remains pending in `perf/gate-report.md`; it was not silently passed.

## Current state

- P2.1 frame tree is implemented and integrated.
- P2.2's provider functionality is implemented, with a justified source/model substitution in ADR 0009. Strict zero-allocation acceptance remains unresolved for upstream astronomy-engine.
- P2.3 catalog positioning is implemented: **all 21 bodies render and appear in search**. This includes Sun, eight planets, Pluto, Ceres and ten moons. Search lists all 21 and scrolls on desktop/mobile. Jupiter is a destination shortcut; dwarf-layer toggles and URL restoration include Pluto/Ceres.
- New bodies use generic lit colors with capped sphere geometry. Full materials, textures and rings belong to Phase 3. P2.4 has integrated LOD/point instancing and a synthetic GPU readback/performance probe. P2.5 has pooled labels and priority/grid decluttering. P2.6 has a layer registry with all 12 MVP IDs and verified GPU resource reuse. P2.7 adaptive TSL ribbon orbits and P2.8 float64 sphere / screen-space point picking are implemented with local regression evidence. P2.9 API v1 and P2.10 CPU tooling are implemented; hosted CPU and remaining device/visual acceptance are pending. See the final continuation section for current results.

## Scientific/implementation contracts

`FrameTree` owns origin and state transforms, cached by epoch/frame stamp. Scientific FIXED is Z north; texture orientation converts to Y-up. Velocity includes rotating-frame transport, with +/-0.5-second numerical matrix derivatives. TEME of date includes the equation of equinoxes and passes the independent Vallado Appendix C reference below 0.1 km. EQJ approximates ICRF; do not claim sub-meter GCRF. Barycentric providers attach directly to SSB, while parent-relative nodes compose through the tree. Camera-relative float64 subtraction and separate Explore coordinates are unchanged.

`EntityRegistry.loadCatalog` creates providers and registers local moon/body frames. Orbit generation now transforms provider output into the parent frame rather than subtracting a barycentric parent from already-relative moon coordinates. Unknown providers and duplicate entities throw instead of placing objects at the origin.

Runtime providers:

- AstronomyEngineProvider: existing corrected planets, Sun, Moon, Pluto. Eleven correction files load before construction.
- JupiterMoonsProvider: one shared upstream calculation for four moons per epoch; Jupiter-relative EQJ km/km/s. Callisto also loads `data/corrections/callisto.bin` through `registerEphemerisCorrection('callisto', buffer)`.
- KeplerProvider: elliptic/hyperbolic propagation; parabolas rejected; default epoch +/-30-day validity. Input elements must already use the declared reference axes.
- SampledEphemerisProvider: cubic Hermite interpolation with irregular intervals, gaps, per-segment certainty/staleness and no extrapolation.
- OsculatingElementsProvider: six regular tables of JPL osculating elements. Propagates adjacent Kepler solutions to the requested instant and blends with smoothstep. Velocity includes the blend-weight derivative. No extrapolation. Always `approximate`, method `kepler-2body`.

The last provider serves Phobos, Deimos, Titan, Triton, Charon and Ceres. Tables live in `apps/web/public/data/orbits/`, with per-file format/query/provenance JSON. They total **7,709,552 bytes** excluding JSON. Epochs/units: TDB seconds, ICRF-equatorial elements relative to the parent; Ceres is heliocentric. Register by canonical body ID before calling `createCatalogProvider`. Each provider owns decoded data and scratch arrays; hot calls allocate no explicit objects.

## Why the mean-table route changed

JPL states its rounded mean-element table describes orbit shape/orientation and is not intended for ephemeris computation. The experimental MeanElementsProvider/table path produced large epoch discrepancies and long-term drift. It is **not used by the renderer**. ADR `0009-osculating-moon-models.md` records the substitution; no phase/angle values were adjusted to fit expected test positions.

The old two `it.fails` checks retain the 2% epoch geometry target for Titan/Triton as diagnostics of the rejected model, not production acceptance tests. `docs/science/mean-moon-validation.json` preserves that evidence. The same bodies are now supported through the independently validated osculating provider. Do not confuse the rejected model with missing catalog bodies.

## Evidence

- Workspace typecheck, ESLint/package boundaries and **93 tests passed; 2 expected diagnostic failures** for the unused mean-table model.
- Production build passed again after LOD, label pooling and explicit GPU texture initialization. The build validates all 21 catalog records before compiling.
- Browser suite now has **9 checks**. Eight passed in the full run, including the new LOD/GPU upload and label-layout checks, existing material references, mobile, precision and React cadence. The texture-stability check exposed lazy GPU initialization after LOD hid hero meshes; asset replacements and the Sun glow now initialize their GPU textures explicitly. Its focused rerun passed with 16 textures before/after 20 focus changes (8,039,512 asset bytes on LOW). The LOD test passed again after skipping entirely hidden point layers. No screenshot tolerance or performance threshold was relaxed.
- `docs/science/osculating-validation.json`: 50 independent off-grid samples per body (300 total), including timeline ends. Max observed errors: Phobos 24.62 km, Deimos 18.05 km, Titan 32.76 km, Triton 12.65 km, Charon 0.076 km, Ceres 159.18 km. These are sampled results, **not continuous bounds**. Predeclared test tolerances were not loosened.
- Existing five-epoch planet/Galilean tests, 24 additional Callisto holdouts, Eros +/-30-day propagation, Voyager cruise and Apophis encounter holdouts remain passing.
- `docs/perf/phase-two-providers.json`: five provider types each ran 100,000 calls, all under 1 MB retained growth after GC. The new osculating provider retained 488 bytes in that run. Post-GC growth is a leak check, not proof of zero transient allocation. Upstream astronomy-engine still allocates.
- `docs/perf/engine-bundle.json`: **361,235 bytes gzip / 450,000**. The curated catalog is now Zod-validated during build and tests instead of constructing schemas inside the renderer runtime. No validation of external input was removed; domain modules are marked side-effect-free for tree shaking. The measurement includes transitive engine dependencies and labs, not fetched datasets.
- Screenshots: `docs/perf/screens/phase-two-{jupiter,europa,pluto,titan,ceres}.png`. The new cards distinguish analytic, corrected analytic, and approximate orbit sources. `/about/data` and credit files describe the actual models.

## P2.4 and P2.5 implementation update

The LOD selector is integrated in `SpaceEngine`: CSS-pixel diameter thresholds 2/12/200, +/-15% hysteresis, immediate multi-band focus jumps, and display-space radii. Below 12 px, bodies use instanced billboards in parent-relative `PointLayer` groups. Larger bodies use spheres; hero spheres switch between cached 64-segment and tier detail geometry. High-detail clouds/atmospheres are disabled in the medium band. Labels and picking use semantic body visibility, independently of sphere visibility.

`PointLayer` owns float32 position/color/size attributes, reusable merged partial update ranges, an independent sprite geometry, and disposal. The catalog uses a layer per parent, rebased against the physical camera in float64. Layer toggles zero hidden point sizes without reallocating buffers. The synthetic probe renders 10,000 Earth-local points, updates 64 records per frame, and verifies a partial color update through GPU readback. The layer adds exactly one draw call; the total includes a sphere and renderer output pass.

`engine.measurePoints()` is a lab-only preview helper, exposed by **Run Phase 2 point checks** at `/lab/poc`. The report records backend, adapter/software status, viewport, draw calls, readback check and RAF timing. The local SwiftShader run is about 5 FPS; it **does not pass the physical desktop >=60 FPS gate**. Record real-device evidence separately. Progressive texture resolution is still controlled by quality tier rather than an independent per-body streaming scheduler. Manual transition inspection and WebGPU validation remain outstanding.

`LabelSystem` owns a fixed pool of 64 DOM elements. Selection then catalog importance determine placement. The 96x32 grid reserves every cell touched by measured label width, with 150 ms CSS fades and `aria-hidden`. Solar-system labels exclude moons except a target/target child; local views label the target and its children. Pure layout tests cover selection conflicts, adjacent-cell overlap and a 10,000-candidate cap. Browser checks verify pool size, real DOM rectangle overlap and Earth-local labels.

The user specifically flagged missing Saturn rings and plain non-hero surfaces. Confirmed against Phase 3: hero-grade Jupiter/Saturn materials, Saturn rings/shadows, other planet/moon materials and all-body orientation polish are deferred there. Do not describe the generic current spheres as finished art.

## P2.6 and new device evidence

`LayerRegistry` now owns all 12 MVP IDs, category/band metadata, requested versus effective visibility, load-once behavior, shared in-flight loads, retry after failure and disposal. A late load applies the latest hidden/visible state, including explicitly hiding newly created default-visible objects. Existing catalog resources are registered resident and reused. NEO/satellite/spacecraft definitions remain unavailable until real data sources are registered; saved requests are preserved without pretending those sources are loaded. Unknown URL IDs are ignored. Moon/satellite bands are local/planetary; remaining categories allow local/planetary/solar. The public API is still a preview.

Verification: full workspace typecheck/lint and 93 tests plus two expected diagnostics passed; production build passed. Four layer-specific tests cover toggle reuse, racing loads, failure/retry, semantic bands and disposal. Catalog, label and new layer browser checks passed. The browser toggles the four implemented layers twenty times and asserts stable geometry, GPU-attribute and texture counts, then checks map-state restoration. A final unit rerun covers explicitly hiding a late load after an off request. Bundle is 361,235 / 450,000 gzip bytes.

Two user reports were copied byte-for-byte into `docs/perf` before running tests; see `docs/perf/device-review-2026-09-25.md` for hashes and exact measurements. The Phase 1 rerun passes ULTRA performance, precision and depth; its earlier invalid error was not supplied and its cause is unconfirmed. The Phase 2 WebGPU point run records 164.7 FPS average and 6.2 ms p95, one point draw and passing partial-upload readback, exceeding the 60 FPS workload target. Both report blank GPU names, so device attribution remains limited. Do not relabel ULTRA as HIGH or mark the rest of the device/visual matrix passed.

**Preserve user reports in `test-results/`.** It contains manual downloads, while Playwright normally clears its output directory. Use `pnpm.cmd exec playwright test --output=.tools/playwright-phase-two` for subsequent automated checks, or copy any new reports to a durable location first. Current originals remain intact.

## Historical next steps at the September 25 checkpoint

P2.9-P2.10 were the next implementation tasks here; their completion and remaining acceptance work are recorded in the September 26 section below. Preserve all 21 bodies and scientific tolerances. Desktop HIGH/forced-WebGL2, requested mobile LOW/MEDIUM tiers and backend visual signoff remain pending. Samsung Brave ULTRA evidence has been reviewed separately. Upstream astronomy-engine still allocates; no global zero-allocation claim has been made.

## Commands

```powershell
pnpm.cmd verify
pnpm.cmd build
pnpm.cmd exec playwright test --output=.tools/playwright-phase-two
node tools/measure-engine.mjs
node --expose-gc --import tsx tools/profile-phase-two.ts
pnpm.cmd exec tsx tools/fixtures/validate-osculating-tables.ts
```

Offline acquisition/build (sequential requests, local cache, stop on errors):

```powershell
pnpm.cmd exec tsx tools/fixtures/build-osculating-tables.ts
pnpm.cmd exec tsx tools/fixtures/fetch-phase-two.ts --only=osculating-holdouts
pnpm.cmd exec tsx tools/fixtures/build-callisto-correction.ts
pnpm.cmd exec tsx tools/fixtures/fetch-phase-two.ts --only=callisto-holdout
```

Builders accept `--only=<body-name>`; fixture fetcher also accepts individual fixture names. Cached upstream responses under `assets/source/` are ignored; runtime binaries, provenance and test fixtures must be retained. An Apophis long TLIST URL previously returned HTTP 502; interval acquisition succeeded. Windows restricted mode can block tsx's user-profile lookup; ordinary execution works with the current full-access policy. Use pnpm.cmd if PowerShell blocks pnpm.ps1; do not alter machine-wide policy.

## September 25 mobile LAN startup fix

The user reported an infinite loading screen on a Samsung S23 Ultra using Brave at the PC's HTTP Wi-Fi address. Reproduced in Chromium using that same non-localhost origin: Next's dev HMR websocket was rejected, hydration did not complete, and no engine canvas was created. The server log explicitly requested `allowedDevOrigins` for the LAN hostname. This was not reproduced by the previous localhost viewport tests.

`apps/web/next.config.ts` now allows the PC's exact non-loopback IPv4 interface addresses in development only (no wildcard). LAN startup then reached `canvas[data-ready=true]` without websocket errors. EngineCanvas also has a 60-second startup deadline with a visible retry message and cleanup/late-result guards for stalled initialization after hydration.

Verification: workspace typecheck/lint and 93 tests plus two expected diagnostics pass. The existing mobile interaction test and new LAN-origin/stalled-startup browser tests pass. `e2e/startup.spec.ts` checks actual insecure HTTP LAN origin hydration, all 21 search results, and a controlled data-request stall with a virtual-clock deadline. This is local reproduction/regression evidence, not actual Brave-on-phone acceptance; the user was asked to reload the phone page. User report originals remain in `test-results/`; test output is under ignored `.tools/`.

## September 25 continuation: P2.7 orbits and P2.8 picking

P2.7 now uses a custom TSL screen-space ribbon (the plan's permitted fallback) with LineGeometry and adaptive parent-frame samples retained in float64. Uploads subtract the physical camera before float32 conversion. Computed/reconstructed trajectories are solid, predicted trajectories dashed, and approximate trajectories dotted with faded ends. Selection raises width from 1 to 2 CSS pixels and opacity from 0.25 to 0.65 (approximate 0.12 to 0.38). Dwarf orbits are shown only for selection/hover. Date changes resample visible paths one at a time outside the render callback; validity-clipped arcs stay open. No spacecraft source exists yet, so spacecraft past/future styling is not claimed.

Long oblique segments exposed numerical failures in the initial Line2 integration and a fragment-only depth correction. OrbitMaterial now projects the true segment view coordinates directly. It clips to the near plane and a viewport guard band before widening the ribbon; the guard band avoids rasterizer precision loss from enormous offscreen coordinates. Clip W and logarithmic fragment depth share the same physical view coordinates. GPU readback covers lines inside/in front of Earth at 400, 30,000 and 1,000,000 km altitude, plus a segment crossing the camera plane and an oblique path checked across the viewport against float64 ray-sphere intersections. The oblique test excludes the tessellated/MSAA silhouette and depth-intersection boundary pixels; all unambiguous interior/exterior pixels must match. Without viewport clipping, the stronger test detected numerous interior mismatches, not only silhouette differences. The existing marker/cloud/Moon probes remain intact. Material screenshot tests now explicitly disable orbit paths to isolate materials; all eight original references and the 1.5% tolerance remain unchanged. Dedicated orbit tests cover selection style, approximation, date refresh and layer visibility. Layer toggling and texture stability still pass. Real WebGPU/mobile orbit visual parity and LEO orbit jitter signoff remain outstanding.

P2.8 has a reusable CPU Picker: float64 ray-sphere intersections select the nearest surface; point picking projects current display positions with a 12 px mouse / 24 px touch radius. Meshes occlude points. Picking does not depend on labels or GPU readback. Hover emits only on change, affects label priority and reveals dwarf orbits; touch does not require hover. Input clears hover on drag/leave/zoom and suppresses selection at the end of multi-touch gestures. Unit tests cover surface ordering, behind-camera rejection, touch radius, projected-point ordering and mesh occlusion. Browser tests exercise actual pointer and touch events on meshes/points, hover clearing, and two-finger non-selection. Label and mobile interaction regressions pass.

Your physical Samsung S23 Ultra / Brave results are preserved and reviewed in `docs/perf/device-review-2026-09-25.md`: WebGL2 ULTRA, Phase 1 p95 16.7-16.8 ms, precision 0.104706333 px and all three original depth probes; 10k points at 60.003 average FPS with passing partial upload and one point draw. These predate the new orbit build. Device/browser identity is user-attested; the report's adapter string is Brave. Do not relabel ULTRA as LOW/MEDIUM or infer new-orbit validation from these reports.

Current workspace verification: 101 tests passed plus two expected rejected-model diagnostics; typecheck, lint/boundaries and production build passed. Orbit/precision/material/resource/picking checks (6 browser tests) and earlier mobile/label checks passed. Engine bundle: 364,360 / 450,000 gzip bytes. User originals remain untouched in `test-results/`.

At the September 25 checkpoint, P2.9 and P2.10 were next. Their subsequent implementation is recorded below. P2.2 upstream allocation and remaining physical/browser/visual acceptance caveats remain explicit. Saturn rings and detailed non-hero surfaces remain Phase 3.

## September 26 continuation: P2.9 API v1 and P2.10 CPU tooling

`EngineApi`/`API_VERSION=1` now define the application surface. The app store uses it; `isFollowing` replaces direct controller reads and a lab distance helper replaces the LEO setup's direct mutation. API tests cover commands/events, point-source signatures and invalid consumer calls. The boundary checker rejects `.cameraController` in application code. Lab helpers remain outside the stable consumer contract.

`registerEntities` validates batches/factories before scene mutation, stages visuals/orbits/point-group capacity, and commits provider-backed objects. Existing parents/frames, globally unique IDs, positive radii and valid metadata/periods are required. Parent point buffers grow once during registration; layer toggles reuse them. Synthetic registration was verified through focus, orbit visibility, duplicate rejection and GPU resource stability.

`registerPointLayer` installs a resident source on `neo`, `sat.*` or `spacecraft`. It owns reusable state/color/size buffers and a single PointLayer, without allocating individual meshes. Metadata capacity/order are fixed. Coordinates and velocities transform through FrameTree in float64 before camera-relative float32 upload. Active counts, NaNs, hidden points, source failures and disposal are checked. The returned detach function removes IDs/labels, returns focus to Earth if necessary, preserves visibility requests and releases ownership exactly once. Sources emit a separate typed `sourceError`, so a data failure does not trigger a renderer fallback. A 10,000-point browser fixture passed touch selection, focus, layer reuse, fault isolation and idempotent disposal. External ingest/search population and source-specific orbital arcs are not claimed; see engine README.

The CPU harness measures five deterministic camera paths, 30 warmup plus 120 recorded frames each, LOW/True scale and original catalog. Schema 2 starts on September 22, advances simulation at 1x and drives clock/UI work on a fixed 60 Hz schedule. `CpuTimings` records real synchronous frame duration including ephemeris and renderer submission; RAF waits are excluded. Comparison fails above 20% mean or p95 regression and rejects malformed/missing paths or different CPU/platform/browser/configuration/scheduled work. The preserved schema 1 repeat failed Earth–Moon zoom p95 by 26.32%; that protocol paused simulation and allowed variable scheduling. It remains diagnostic evidence, not a pass. The corrected schema 2 pair (`cpu-fixed-initial.json`, `cpu-fixed-repeat.json`) passes all five paths; maximum p95 increase is 10.34%, with eight clock events and eight UI updates in every path. Initial means are 1.72-2.08 ms and p95 2.7-3.3 ms. See `docs/perf/cpu-regression.md`. These are CPU measurements, not GPU FPS.

No Git remote is configured. `.github/workflows/cpu-perf.yml` is a manual record/compare bootstrap, not a claimed hosted pass. It requires reviewed matching Linux evidence before automatic pull-request/push triggers can be enabled. Windows evidence is not a Linux baseline. P2.10 hosted/automatic acceptance and P2.2 upstream allocation acceptance remain open. Existing physical-device/visual/tier caveats and all original scientific tolerances are preserved. Do not begin Phase 3 or mark the complete Phase 2 gate passed solely from these local checks.

Final local verification: `pnpm.cmd verify` passes typecheck, lint/boundaries and 116 tests plus two expected rejected-model diagnostics. `pnpm.cmd build` passes. Ten browser regressions pass: mobile interactions, orbit styling/date refresh/layers, mesh/point picking, 10k external source ownership/failure isolation, provider registration/resource reuse, LAN startup, stalled startup recovery, GPU precision/depth, LOW texture stability and material references. The material test includes all eight unchanged images at the original 1.5% tolerance. GPU precision is 0.134355961 px against 0.5 px over 600 samples, and all 11 depth scenarios pass. Final standalone engine bundle is 368,185 / 450,000 gzip bytes. `git diff --check` passes. User report hashes still match all four preserved originals under `test-results/`; automated browser output is `.tools/phase-two-api-final`.

The source layer also suppresses rendering after a skipped sample so a newly enabled semantic band cannot flash stale coordinates. Focus updates its following state before emitting selection. Regression checks cover skipped sampling and CPU protocol/scheduling mismatches. Engine README and CPU guide use UTF-8.

## Resume here

P2.9 implementation and P2.10 local tooling/verification are complete. Remaining Phase 2 work is acceptance, not reimplementation of registration or another unmotivated benchmark run:

- P2.10: configure the intended Git remote/hosted runner, collect and review a schema 2 Linux baseline, then enable CI comparison. No remote or hosted credentials were available in this checkout; do not invent a destination or promote Windows evidence to hosted evidence.
- P2.2: resolve the upstream astronomy-engine allocation requirement explicitly; the current zero-allocation caveat remains.
- Preserve the exact device matrix: remaining tiers, backend visual parity and new orbit/LEO jitter acceptance are pending. Submitted Samsung Brave and desktop ULTRA evidence remains valid for its recorded build and workload.
- Phase 3 requires separate authorization. Saturn rings and detailed planetary materials remain there. The user's plan to collect cosmetic bugs after the phases is compatible with continuing development, while blocking failures and verification regressions remain immediate work.
