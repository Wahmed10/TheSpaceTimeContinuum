# Phase 3 checkpoint — September 27, 2026

Phase 3 is authorized and started. Phase 2 remains accepted with ADR 0010 and documented device coverage. File-level work and the 21-body audit are in [PHASE_3_PLAN.md](PHASE_3_PLAN.md).

## Current: surface registration corrections ready for browser validation

October 1: user explicitly authorized completing the geographic audit, with Phase 4 still prohibited. The source audit found and corrected Ceres's 180-degree map seam, Charon's incorrect legacy 180-degree shift and the independent Phobos/Deimos source geometry frames. Europa/Ganymede/Callisto/Pluto mappings agree with twelve independent USGS landmarks; Triton's source/projection comparison supports keeping its existing mapping. Mesh frame inference compares all signed axis permutations to PDS grids and Phobos additionally to an explicit IAU_PHOBOS JPL DSK. Details, input hashes, full candidate scores, scripts and precision limits are in [the audit](science/surface-registration-audit.md).

Local verify passes typecheck, lint/boundaries and **131 tests plus two expected rejected-model diagnostics**. Assets remain **79,961,515 / 80,000,000 bytes**; no runtime files were rebaked. The corrections happen only at asset/mesh creation, with normals rotated alongside positions and unchanged atlas UVs. Previous accepted CPU and laptop evidence remains preserved. Corrected browser regression/build and visual review are the next checks; no complete Phase 3 acceptance is claimed yet.

## Previously reviewed: laptop HIGH/WebGPU Phase 3 report passed

Reviewed the user-supplied `test-results/phase-three-webgpu-1790908597477.json`: all 21 body close-ups and three Saturn ring views, HIGH throughout, 240 samples per view, settled textures, focused meshes and ring views visible. Worst p95 **6.20 ms** against 16.7 ms; mean FPS range **161.33–164.71**. Maximum draw calls **36 / 300**, detailed meshes **3 / 12**, compressed asset mip storage **119,844,112 bytes / 350 MB**. Precision **0.107680 px / 0.5 px** over 600 samples; all **11 depth probes pass**. Windows Chrome 153, WebGPU, 1707×904 at DPR 1.5. User identifies the device as their laptop; adapter string is blank, so no particular GPU is asserted.

Original download untouched; byte-identical copy and per-view review preserved in `docs/perf/phase-three/device-laptop-webgpu-high.json` and `device-laptop-webgpu-high-review.json`. Human-readable review `device-laptop-review.md`; SHA256 `596614cc20b2af3d5ccc5f9621712b746d2e1fe813f8956c57457d7a58f13f90`. The report does not embed a git revision; renderer/lab code remains unchanged from validated `749a506`. Timing is a short rolling RAF sample; mip bytes are not total VRAM, and first-frame time excludes network navigation.

The submitted laptop HIGH/WebGPU performance/precision evidence is accepted. No fix or duplicate run is needed. Earlier full browser/build/strict CPU evidence remains accepted; Phase 2 coverage is unchanged. No new mobile or forced-WebGL2 physical result is claimed. No background job is pending.

The subsequently authorized surface audit and corrections are recorded above. Do not conflate scientific SPICE attitude agreement with geographic imagery/mesh alignment. Phase 4 has not been authorized. See `PHASE_3_IMPLEMENTATION_HANDOFF.md` for the updated scope/evidence/constraints.

## Previous: device-report validation passed; hardware report was pending

Reviewed `.tools/phase-three-device/result.json`, browser JSON and the actual downloaded report for source **749a506ac1a04af91920201a4900b061fd4fcf50**. All **six tests pass**, zero failures/skips/flakes/report errors; production build passes. The original benchmark retains five views. The new report covers all 21 bodies and north/south/edge Saturn rings, with valid sample counts, settled textures and visible focused meshes. Precision error is 0.134356 px against 0.5 px over 600 samples; all eleven depth checks pass. Focus/scale/layers/playback rate and quality restoration pass.

Raw downloaded software report, browser report and summarized review are preserved in `docs/perf/phase-three/device-software.json`, `device-browser.json`, `device-validation.json`. This is SwiftShader WebGL2 functional evidence, not a hardware FPS pass. No local job is pending and the independent dev server is available. The status pointer still selects the completed job; FINISHED is expected. Do not launch another identical software or CPU run.

Next user step: open `http://localhost:3000/lab/poc?perf=1`, select HIGH and click **Run Phase 3 device checks**. Keep the tab visible and leave it alone for 5–10 minutes, until **Report downloaded** appears. Preserve the downloaded `phase-three-<backend>-<timestamp>.json` in `test-results/`. Review its real backend/adapter, all 24 p95 values, draw/mesh/storage budgets and precision/depth before Phase 3 hardware acceptance. Existing Phase 2 coverage is accepted; this tests newly added rendering. Instructions are in `docs/perf/phase-three/device-checks.md`.

Agent continuation: inspect a supplied hardware report first, preserve original downloads, fix actual failures without relaxing budgets, and retain geographic source-axis/landmark limitations as explicitly open rather than applying guessed corrections. See `PHASE_3_IMPLEMENTATION_HANDOFF.md` for current source/evidence/constraints. No Phase 4 authorization or complete Phase 3 acceptance is implied.

## Historical launch: Phase 3 device-report browser/build (completed and reviewed)

- Persistent hidden Node PID **40088**, startup confirmed; `.tools/phase-three-device/pid.txt`. Launcher `run.mjs`; result records `status: running`, `activeStage: browser`.
- Tested commit **749a506ac1a04af91920201a4900b061fd4fcf50**. This commit preserves the reviewed renderer/CPU pass and adds lab-only measurement; no frame hot path, scientific provider, material asset or API v1 change.
- Sequential commands: `pnpm.cmd exec playwright test e2e/phase-three-device.spec.ts e2e/orientations.spec.ts e2e/precision.spec.ts e2e/visual.spec.ts --output=.tools/phase-three-device/browser --reporter=json`; then `pnpm.cmd build` on success. Six selected tests, including the original five-view report and new all-body downloaded report with playback/layers/quality restoration.
- Completion/provenance `.tools/phase-three-device/result.json`; JSON report `browser.log`, `browser-stderr.log`, `build.log`, `build-stderr.log`; browser output and downloaded `device-software.json` under `browser/`. No test-results directory cleanup. Independent user dev server remains preserved at port 3000.
- Active pointer `.tools/phase-three-active-job.txt`; command `node tools/phase-three-status.mjs`. No automatic notification configured. Next resume: review this existing job first, inspect all six tests, downloaded 24-view coverage/sample/validity/restoration evidence and production build before handing the hardware check to the user. Functional software timings do not establish a device-performance pass. Do not rerun the accepted paired CPU job just because a new turn began.

## Local renderer/CPU regression accepted; device-report instrumentation added

Reviewed retry-2: full browser **29 passed, zero failed/skipped/flaky**, production build and both CPU captures exit 0. All report environment/configuration fields match. Every path passes the strict 20% gate; largest mean/p95 increases 13.33%/10.53%. Earth LEO p95 is 2.0 ms for both versions. Source candidate `f74242aa1c8971b2ffa23da51b477a057b26a1f6`; reference `4409ef5d8f97299d9058360c97d560493d067c1c`. No profiler or threshold changes. Both earlier failures remain retained.

Reviewed all **77** new screenshots in four contact sheets: no visible regression in accepted surfaces, irregular silhouettes, ring shadows/quality switches or moon systems. Original eight references also pass unchanged. Ring shadow differences: 337 planet-to-ring pixels and 18,455 ring-to-planet pixels. Precision max error 0.134356 px against 0.5 px; all eleven depth probes pass. React commits 3.0656/sec against four/sec. LOW texture storage remains 16,516,088 bytes with 33 textures after twenty focus changes. All assets 79,961,515 / 80,000,000 bytes; 72 production dependency licenses pass. Raw final CPU/browser/build records, checksummed capture inventory and contact sheets are now preserved under `docs/perf/phase-three/`.

Next implementation adds lab-only Phase 3 device measurement: all 21 close-up bodies plus three Saturn ring views, texture/frame/visible-mesh validity guards, backend/quality/draw/mesh/storage reporting and the existing 600-sample precision/depth check. Progress is numbered out of 24 and the download is explicitly named `phase-three`. Original Phase 1 defaults remain five views; API v1 and frame/render paths are unchanged. Full local verify passes 128 tests plus two expected diagnostics; both new browser tests discover successfully. Current engine bundle is 373,041 / 450,000 gzip bytes.

The new device-button download, measurement coverage and restored focus/scale/layers/playback/quality must be validated in the next browser/build job before asking the user to run it on hardware. Original benchmark coverage, visible attitude integration, original references and precision also run. No duplicate CPU capture is needed for these lab-only changes. New report tests are functional SwiftShader evidence only. Exact source geographic registration limitations remain in `docs/science/surface-registration-audit.md`; do not claim fully registered NASA models or complete Phase 3 acceptance.

## Historical launch: full browser/build/paired CPU (completed and reviewed above)

- Persistent hidden Node PID **22132**, startup confirmed with `result.json` recording `status: running`, `activeStage: browser`. Launcher `.tools/cpu-phase-three/retry-2/run.mjs`; PID record `pid.txt`.
- Candidate **f74242aa1c8971b2ffa23da51b477a057b26a1f6**; unchanged detached reference **4409ef5d8f97299d9058360c97d560493d067c1c**. No profiler enabled. Same schema 2 five-path LOW/True timing configuration and strict 20% gate.
- Sequential commands: `pnpm.cmd exec playwright test --output=.tools/cpu-phase-three/retry-2/browser --reporter=json`; `pnpm.cmd build`; reference `pnpm.cmd perf:cpu --url http://localhost:3001 --output <retry-2>/reference.json`; stop reference process tree only; candidate `pnpm.cmd perf:cpu --url http://localhost:3000 --output <retry-2>/current.json --baseline <retry-2>/reference.json`.
- Job provenance/results `.tools/cpu-phase-three/retry-2/result.json`; stage logs `browser.log` (JSON report), `build.log`, `referenceCpu.log`, `candidateCpu.log`, and matching `*-stderr.log`; captures/traces `browser/`; reference-server startup log `reference-server.log`.
- `.tools/phase-three-active-job.txt` points to this job. Status command `node tools/phase-three-status.mjs`. Keep localhost idle during the timing stages. User dev server PID 3640 remains independent and preserved.
- Next resume: inspect this existing result first, review complete browser counts/failures and captures, build results, both raw CPU reports/environment compatibility and every path's strict comparison. Preserve failures. Do not launch a duplicate job or claim Phase 3/performance accepted before review. Older generated `docs/perf` outputs remain outside implementation commits; pre-suite backup `.tools/phase-three-full/perf-before/` remains available.

## Visible-mesh surface update optimization submitted for validation

Reviewed `.tools/cpu-phase-three/profiling/result.json`: both reference/candidate diagnostic captures completed with exit 0. This is successful evidence collection, not a CPU gate pass. Earth LEO sampled attribution is preserved in `docs/perf/phase-three/cpu-profile-attribution.json`; the discussion and limitations are in `cpu-regression.md`. Physical-origin cost was similar; added attitude evaluation and mesh-only update work identify avoidable work, without establishing a unique p95 root cause. Orbit sampling differed too, but no speculative orbit rewrite is included in this change.

`SpaceEngine.frame` now determines mesh visibility before refreshing attitude, cloud/material uniforms and mesh detail. Hidden meshes defer that work; current absolute epoch state is set synchronously when they become visible. Scientific positions, frame APIs, point representations, labels and orbits retain their update behavior. The orientation browser test focuses every new body and compares its visible mesh to independent SPICE fixtures, including hidden-time advancement and six-hour visible rotation. Tolerances and CPU configuration are unchanged.

Local verification passed: typecheck, lint/boundaries, 128 unit tests plus two expected rejected-model diagnostics. Browser test discovery passes. Browser behavior, production build and unprofiled strict paired CPU acceptance remain pending. Launch these sequentially in a new `retry-2` directory and review that existing job first next turn; preserve both earlier failed comparisons.

## Historical launch: diagnostic CPU profiles (now completed and reviewed)

- Persistent hidden Node PID **5648**, startup confirmed; `.tools/cpu-phase-three/profiling/pid.txt`; launcher `run.mjs`.
- Reference unchanged detached Phase 2 worktree `4409ef5`, port 3001. Candidate 2a780a7341ead234d136f27e5439b1300040fe0a at existing port 3000; runtime identical to failed optimized f57b42d trial. Documentation/profiling tool changes only.
- Sequential commands from main checkout: `pnpm.cmd exec node tools/profile-cpu-paths.mjs http://localhost:3001 <profiling>/reference-profile`; stop only reference process tree; `pnpm.cmd exec node tools/profile-cpu-paths.mjs http://localhost:3000 <profiling>/candidate-profile`.
- Each invokes the existing 120/30-frame, five-path LOW/True harness with Chrome CPU sampling at 100 microseconds. Profiler overhead included; these are DIAGNOSTIC runs, not gate comparisons. The CPU gate remains failed; no acceptance claimed even if capture stages exit 0.
- Status/provenance `.tools/cpu-phase-three/profiling/result.json`; logs `referenceProfile.log`, `candidateProfile.log`, their stderr and reference-server.log. Each profile folder contains `browser.cpuprofile`, `diagnostic-paths.json`, `summary.json` with top function attribution and per-path self time.
- Status command `node tools/phase-three-status.mjs` now labels diagnostic mode. Keep localhost idle while profiling. Independent candidate dev server remains preserved.
- Next resume: inspect capture completion first, compare Earth LEO attribution/source functions and profiles, then select an evidence-supported fix. Validate science/browser behavior and fresh paired CPU gate after the fix. Preserve both failed comparisons; no threshold changes or repeated runs merely to obtain a pass.

## October 1: optimized CPU trial still fails; profiling required

Reviewed retry-1: all 5 selected browser tests pass, reference capture passes, candidate CPU gate still fails Earth LEO. Mean ratio 1.1082 and p95 ratio 1.2105 (1.9ms -> 2.3ms); all four other paths pass. Environment/configuration still match. This is the same performance failure, not a new browser failure. Preserved the optimized trial's three raw reports under `docs/perf/phase-three/`; original failures remain untouched.

The attitude derivative fix is correctness-verified but not accepted as a complete performance fix. Added `tools/profile-cpu-paths.mjs` (syntax/lint checked) for independent function-level and per-path CPU sampling of reference/candidate. Profiles are diagnostic only and cannot replace gate evidence. No new runtime fix is chosen until those profiles are reviewed.

## Previous: optimized frame rendering validation and paired CPU retry

Fix committed as f57b42d41ba5df389f784ecf7ed51a774e05c0d0. Full verify passed before launch: 128 tests plus two expected diagnostics, typecheck and lint/boundaries. Initial CPU failure remains retained; no optimized performance pass is claimed yet.

- Persistent hidden Node PID **33452**, confirmed started; `.tools/cpu-phase-three/retry-1/pid.txt`; launcher `run.mjs`.
- Command first: `pnpm.cmd exec playwright test e2e/orientations.spec.ts e2e/visual.spec.ts e2e/precision.spec.ts e2e/registration.spec.ts --output=.tools/cpu-phase-three/retry-1/browser --reporter=json`.
- Only after browser success: use existing detached Phase 2 `4409ef5` worktree and dependencies, start reference at port 3001; capture fresh reference via `pnpm.cmd perf:cpu --url http://localhost:3001 --output <retry>/reference.json`; stop only reference tree; capture candidate at port 3000 with `--output <retry>/current.json --baseline <retry>/reference.json`.
- Both captures fresh/sequential/same machine, immutable Phase 2 reference, unchanged schema/configuration and 20% mean/p95 gate. Candidate f57b42d41ba5df389f784ecf7ed51a774e05c0d0. No benchmark overlap with browser tests, edits or builds.
- Logs/result `.tools/cpu-phase-three/retry-1/`: `result.json`, `browser.log`, `browser-stderr.log`, `reference-server.log`, `referenceCpu.log`, `candidateCpu.log`, corresponding stderr; raw reports `reference.json`, `current.json`, `current-comparison.json`; browser captures/traces `browser/`.
- Status command `node tools/phase-three-status.mjs` now points here. Next resume review this existing run first; inspect browser/fixture parity, comparison/environment and any failure before another run. Preserve all original failed reports and thresholds. Source registration and physical rendering evidence remain subsequent Phase 3 work.
- Independent user dev server remains at 3000. Keep localhost idle while measuring.

## October 1: CPU failure investigated; redundant attitude derivatives removed

The initial paired job finished with verify/install/reference capture passed, candidate CPU comparison failed. Earth LEO p95 ratio 1.2222 (1.8ms -> 2.2ms), mean ratio 1.1879; other four paths pass. Matching environment/configuration confirmed. Original failure is preserved in `.tools/cpu-phase-three/` and tracked raw reports under `docs/perf/phase-three/`. No threshold or baseline changed.

FrameTree renderer requests now calculate only the central attitude for zero-origin frames; full derivatives and transport velocity are calculated lazily when state transforms need them. Parent coverage/failure checks remain intact. Unit tests cover call reduction, same-epoch derivative upgrade, cache invalidation, numeric transport velocity, unavailable parents and unchanged SPICE matrix results. Details: `docs/perf/phase-three/cpu-regression.md`. Full verify now passes: typecheck, lint/boundaries, 128 tests plus two expected diagnostics. Measured correction is still unverified; another paired run is required before accepting this fix.

## Previous: October 1 initial paired CPU job

Latest implementation is `1868950` (Io projection audit and mapping tests). Full browser suite passed at `bc79965`; the later cold-path transform extraction preserves rendering behavior and passed both projection tests, engine typecheck and targeted lint. Further source map/irregular-mesh registration remains unresolved as detailed in the audit. Phase 3 is still incomplete.

- Persistent hidden Node PID **14452**, startup confirmed; `.tools/cpu-phase-three/pid.txt`, launcher `run.mjs`.
- Commands: candidate `pnpm.cmd verify`; detached accepted Phase 2 worktree `.tools/cpu-phase-three/reference` at `4409ef5d8f97299d9058360c97d560493d067c1c`, `pnpm.cmd install --offline --frozen-lockfile`; reference dev server PORT=3001; reference `pnpm.cmd perf:cpu --url http://localhost:3001 --output <root>/.tools/cpu-phase-three/reference.json`; stop reference process tree; candidate `pnpm.cmd perf:cpu --url http://localhost:3000 --output <root>/.tools/cpu-phase-three/current.json --baseline <root>/.tools/cpu-phase-three/reference.json`.
- Candidate commit `1868950`; source provenance and stage exit codes in `result.json`. Fresh sequential captures on the same machine, schema 2, unchanged 120/30 frames, five paths and 20% gate. Historical baselines remain intact. This compares Phase 3 with accepted Phase 2; hosted CI's older immutable reference remains separate.
- Reports: `.tools/cpu-phase-three/{reference.json,current.json,current-comparison.json}`; logs `verify.log`, `referenceInstall.log`, `reference-server.log`, `referenceCpu.log`, `candidateCpu.log` and respective stderr logs. Startup/installation/measurement failure is preserved and prevents a pass.
- Reference server PID is recorded separately and only that process tree is stopped. Independent user dev server root PID 3640 at port 3000 is preserved. Keep app interaction, builds and source edits out of measurement execution.
- Status: `node tools/phase-three-status.mjs`. Review this existing job first on resume; do not duplicate it. Next inspect all stages, five path comparisons and matching environment/configuration. Fix a measured regression without changing thresholds. Then remaining source registration and physical rendering evidence/Phase 3 handoff; no Phase 4 work.

## October 1: full regression passed; surface audit

Reviewed full result and browser JSON: verify exit 0 (124 tests plus two expected diagnostics); all 29 browser tests pass, zero failed/skipped/flaky. Original reference tolerance remains unchanged. Latest React report records 3.097 commits/second; 10k point partial-upload check passes, but its 5.59 software FPS is not physical-device evidence. Build already passed at the prior unchanged runtime commit.

Io registration now has an independent projection check using actual sphere vertices, published ISIS bounds and USGS projection behavior. Two new tests, targeted lint and engine typecheck pass. Source label archived; audit is in `docs/science/surface-registration-audit.md`. No visual asset or scientific attitude changes. Remaining NASA mesh/map prime-meridian registration is explicitly unresolved; no guessed corrections applied. Inspected and removed the last temporary Io screenshot under the user-authorized cleanup instruction.

### Previous full regression launch

Moon-system evidence committed as `bc79965`. Short asset/license/bundle checks pass (details below). Full verify and all browser specs are now running sequentially; no new production build is needed for test/document-only changes after the passed moon-system build.

- Persistent hidden Node PID **13648**, startup confirmed; `.tools/phase-three-full/pid.txt`; launcher `run.mjs`.
- Tested commit `bc79965` (plus checkpoint documentation); commands `pnpm.cmd verify`, then `pnpm.cmd exec playwright test --output=.tools/phase-three-full/browser --reporter=json` on verify success.
- Status/results `.tools/phase-three-full/result.json`; logs `verify.log`, `verify-stderr.log`, `browser.log`, `browser-stderr.log`; captures/traces `browser/`.
- `node tools/phase-three-status.mjs` points to this active run. No full-suite pass is claimed yet.
- Existing tests also write docs/perf files. Entire pre-run docs/perf directory copied to `.tools/phase-three-full/perf-before` to preserve earlier evidence and unrelated local modifications. Do not blindly commit all generated reports. User test-results/ and temp-pics/ remain untouched.
- Next: review this run first, fix failures without relaxing thresholds, review remaining captures. Then same-runner CPU comparison after all edits/builds stop; geographic map/model registration audit and physical rendering evidence remain explicitly separate outstanding work. Phase 3 is not yet complete.

## Reviewed: six moon-system interaction checks passed

September 29: saved result and JSON report confirm 9 browser tests passed, zero failed/skipped/flaky, and production build passed. Jupiter Explore and Pluto True captures visually reviewed. All six systems pass scale/orbit/touch checks; labels/layers/registration regressions pass. User also reports the test passed. Assets pass at 79,961,515 / 80,000,000 bytes; 72 dependency licenses pass; measured engine gzip is 372,545 / 450,000 bytes (`docs/perf/engine-bundle.json`). Full browser regression is next; CPU comparison and surface registration audit remain outstanding.

Orientation increment committed as `3b054cb`; reviewed retry has all 11 browser tests and production build passed. New `e2e/moon-systems.spec.ts` covers Earth/Mars/Jupiter/Saturn/Neptune/Pluto systems in True/Explore, moon visibility, selected orbit visibility, touch selection and invariant physical metrics across display-scale switches. Produces twelve system captures. New tests have passed lint and test discovery; execution results remain unreviewed. Geographic model/texture registration and full performance gates remain pending.

- Persistent hidden Node PID **38972**, confirmed started; `.tools/moon-systems/pid.txt`, launcher `run.mjs`.
- Base `3b054cb` plus new moon-system test and checkpoint edits.
- Command: `pnpm.cmd exec playwright test e2e/moon-systems.spec.ts e2e/labels.spec.ts e2e/layers.spec.ts e2e/registration.spec.ts --output=.tools/moon-systems/browser --reporter=json`; then production build only on success.
- Reports/logs: `.tools/moon-systems/result.json`, `browser.log`, `browser-stderr.log`, `build.log`, `build-stderr.log`; captures/traces `browser/`.
- User status command: `node tools/phase-three-status.mjs`. Pointer `.tools/phase-three-active-job.txt` selects this run. FINISHED means automated completion, not reviewed phase acceptance.
- Next resume: review this job first and fix any failures; inspect system captures, then continue registration audit and P3.5 evidence. Do not repeat completed orientation checks without a reason. Keep independent dev server and unrelated perf/user files intact.

## September 29: orientation retry passed

Reviewed `.tools/orientation/retry-1/result.json` and browser report: all 11 tests passed, zero failed/skipped/flaky; production build exit 0. User accepts the visual result. Phobos high/day capture inspected; surface/model geographic registration remains explicitly pending. The running-job notes below are historical.

Check the latest job from the repository terminal with `node tools/phase-three-status.mjs`. It prints RUNNING or FINISHED and each recorded stage result; completion still requires agent review.

### Previous retry launch

User reports the new orientations look good and authorizes continuation. Scientific tilt verification is automated; geographic texture/mesh registration is still pending, so visual acceptance does not certify landmark alignment.

The original orientation job failed before running tests: Node ESM required `with { type: 'json' }` on the new browser fixture import. Production build was skipped. Original failure evidence remains in `.tools/orientation/{result.json,browser.log,browser-stderr.log}`. Added the import attribute; Playwright `--list` now successfully discovers all 11 tests across six files and targeted ESLint exits 0.

- Active persistent hidden Node PID **39704**, confirmed started; `.tools/orientation/retry-1/pid.txt`.
- Launcher `.tools/orientation/retry-1/run.mjs`; base `2ee8013758cd85ca0fc149ab572ce0f6579f6abc` plus uncommitted orientation changes and import fix.
- Command: `pnpm.cmd exec playwright test e2e/orientations.spec.ts e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts e2e/precision.spec.ts e2e/picking.spec.ts --output=.tools/orientation/retry-1/browser --reporter=json`; production `pnpm.cmd build` follows only on browser success.
- Outputs in `.tools/orientation/retry-1/`: `result.json`, `browser.log`, `browser-stderr.log`, `build.log`, `build-stderr.log`, captures/traces `browser/`.
- Next resume: review this retry first (do not duplicate). Fix failures, inspect changed-body images and rendered rotation checks, then continue source-based landmark/mesh-axis registration and remaining P3.4/P3.5 gates. No browser/build pass or Phase 3 completion is claimed.
- Independent user dev server root PID 3640 remains alive. Preserve it and unrelated user/performance files.

## Previous: P3.4 rotations implemented

September 28: accepted Mars-moon shape increment committed as `2ee8013`. Its saved browser report has 10 passed, zero failed/skipped/flaky; production build passed. User accepts appearance and requested interaction checks.

Uncommitted P3.4 adds NAIF PCK00011 pole/prime-meridian rotations for Ceres and nine moons, registered through the existing scientific FrameTree after ephemeris loading. Existing hero orientations and orbital providers are unchanged. Independent CSPICE N0067 fixtures cover 60 matrices over 1900–2100; all match within 1e-9 component error. Full verify passes 124 tests plus two expected diagnostics, typecheck and lint/boundaries. After diagnostic/browser-test additions, targeted engine typecheck and lint pass too. See [pck-orientations.md](science/pck-orientations.md) for reproducibility and limitations.

Geographic texture and irregular-mesh axis registration is STILL PENDING: model/atlas axes have not been silently corrected or declared scientifically aligned. This increment establishes scientific attitude and its renderer integration, not landmark accuracy or full P3.4 completion. No public asset bytes added; asset total remains 79,961,515 / 80,000,000. Full Phase 3 performance gates and remaining moon-system interactions remain pending.

### Active job — review this first on resume

- Persistent hidden Node PID **9232**; `.tools/orientation/pid.txt`; launcher `.tools/orientation/run.mjs`.
- Base `2ee8013` plus uncommitted P3.4 source/data/test/doc files. Startup confirmed.
- Command: `pnpm.cmd exec playwright test e2e/orientations.spec.ts e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts e2e/precision.spec.ts e2e/picking.spec.ts --output=.tools/orientation/browser --reporter=json`, followed by `pnpm.cmd build` only after browser success.
- `.tools/orientation/result.json` completion; `browser.log` JSON report, `browser-stderr.log`, `build.log`, `build-stderr.log`, captures/traces in `browser/`.
- Next: inspect this existing job, review changed-body captures and two-epoch renderer rotation checks, fix failures before committing orientation increment. Continue landmark/model-axis registration and moon-system behavior, then Phase 3 exit evidence. Do not launch a duplicate job before review.
- Persistent user dev server remains root PID 3640 at http://localhost:3000, separate from browser job. Do not stop it. Local automation is SwiftShader WebGL2, not hardware WebGPU evidence. Preserve unrelated generated perf artifacts and user temporary images.

## Previous: Phobos/Deimos accepted

September 28 resume: user accepts the shapes and all requested interaction checks (orbit views, clearance, quality changes and selection). Saved result.json confirms browser/build exit 0; browser report confirms 10 passed, zero failed/skipped/flaky. Shapes are accepted. User requests irregular meshes for bodies whose shapes warrant them, including future additions. P3.4 scientific rotations are next; mesh geographic registration remains a separate audit.

P3.4 preparation progressed independently: downloaded and hashed NAIF PCK00011, located all ten missing bodies' pole/prime-meridian and periodic terms, and identified quadratic Mars phase angles plus the N0067 toolkit requirement. See `docs/science/phase-three-orientation-preparation.md` for source hash, parsing hazards, independent SPICE fixture requirements, and frame/mesh registration checks. Cached source `.tools/orientation/pck00011.tpc`. Review existing Mars-moon job first on next resume, then commit accepted shape work and implement sourced rotations.

September 28: Ceres/Triton accepted and committed as `0dd0d02` after six browser tests and production build passed. User accepts Ceres's muted appearance; NASA natural-color explanation is recorded below. No duplicate Ceres/Triton run is needed.

Uncommitted implementation: Phobos/Deimos matching NASA/JPL-Caltech meshes and UV atlases. Offline Three.js meshoptimizer simplification targets 20% triangles; compact quantized/gzip shape files decoded at startup. Non-spherical BufferGeometry survives LOD and quality switching; camera extent/zoom clearance includes shape bounds. Source origin/axes and atlas mapping retained; metalness set to zero. Physics/catalog radii remain unchanged. Geographic orientation is not yet scientifically validated. Credits, source hashes, conversion and limitations: `docs/licensing/mars-moon-assets.json`, `docs/science/mars-moon-shapes.md`.

Whole public asset package INCLUDING compressed shapes is **79,961,515 / 80,000,000 bytes**, leaving 38,485 bytes. Four new files total 423,579 bytes. All tiers use 1024-square ETC1S atlases. Short checks passed: typecheck, lint/boundaries, 122 unit tests plus two expected diagnostics, alignment/manifest/budget checks and 72 dependency licenses. Decoder tests validate actual packaged geometry bounds/UVs and corrupt/truncated payload rejection. New browser group checks both moons' LOW/HIGH day/quarter views and stable geometry identity through quality transitions. Rendered results remain unreviewed.

### Existing job — review first, do not duplicate

- Persistent hidden Node PID **32764**, startup confirmed; `.tools/mars-moons/pid.txt`, launcher `run.mjs`.
- Base commit `0dd0d02` plus current uncommitted Mars-moon shape/atlas changes.
- `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts e2e/precision.spec.ts e2e/picking.spec.ts --output=.tools/mars-moons/browser --reporter=json`; followed by `pnpm.cmd build` only on success.
- `.tools/mars-moons/`: `result.json` progress/completion, `browser.log` JSON report, `browser-stderr.log`, captures/traces `browser/`, `build.log`, `build-stderr.log`.
- Next inspect report and both irregular-moon captures for UV alignment, silhouette, lighting, focus/quality changes; fix before commit. Then P3.4 sourced missing rotations/landmark registration and moon interaction review, followed by full Phase 3 scientific/performance/device exit gates. Sphere picking remains approximate and is documented for interaction review. Prior generated performance artifacts and temporary user files remain excluded from implementation commits. Local automated rendering is software WebGL, not hardware WebGPU evidence.

## Previous: Ceres/Triton (completed and accepted)

September 28 resume: six browser tests and production build passed (result/report reviewed); user accepts Ceres/Triton appearance, with Ceres's muted color appropriate for this visualization. NASA explains natural-color differences are subtle: https://www.nasa.gov/image-article/hints-ceres-composition-from-color/ . Keep source gray map rather than substituting an enhanced infrared palette. Proceed to Phobos/Deimos matching meshes and atlases.

Galilean increment committed as `eb605bcb7eb56338c44a34a7eb0e7a0049f4d884` after successful five-test browser/build run and user visual acceptance. Io blur remains accepted and tracked in ENHANCEMENTS. No duplicate color-map job is needed.

Uncommitted Ceres/Triton increment: two NASA VTAD base-color maps, 1024x512 ETC1S with mipmaps on all quality tiers, added to catalog/preload and reproducible build (`tools/assets/build-galilean.ts --minor`). Ceres base color correctly selected instead of its separate normal map. Source colors retained; Ceres gray source and Triton unmapped plain north documented in app and `docs/science/minor-body-surfaces.md`. Hashes/URLs: `docs/licensing/minor-body-assets.json`. Combined 189,252 bytes; total 79,537,936 / 80,000,000 bytes. Remaining headroom 462,064 bytes.

Short checks pass: typecheck, lint/boundaries, 120 unit tests plus two expected diagnostics, texture alignment/manifest/budget gate, 72 dependency licenses. Two-body LOW/HIGH day/quarter capture group and successful texture-load assertions added. New rendered captures remain unreviewed. Phobos/Deimos mesh/atlas integration, body orientations and full exit evidence are still pending.

### Existing job to review first on resume

- Persistent hidden Node PID **21708**, startup confirmed; `.tools/remaining-bodies/pid.txt`, launcher `run.mjs`.
- Base `eb605bcb7eb56338c44a34a7eb0e7a0049f4d884` plus uncommitted Ceres/Triton files.
- `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/remaining-bodies/browser --reporter=json`; then `pnpm.cmd build` only if browser succeeds.
- Logs under `.tools/remaining-bodies/`: `browser.log` (JSON report), `browser-stderr.log`, captures/traces `browser/`, `build.log`, `build-stderr.log`, progress/completion `result.json`.
- Next: review result and eight new captures, fix failures, then commit increment. Continue Phobos/Deimos with their matching irregular meshes (cached source details below), preserve source units/UVs and budget checks. Independent user dev server remains active; local automated evidence is software WebGL only.

## Previous: color variants (completed and accepted)

Completed review on resume: `.tools/moon-color/result.json` records browser/build exit 0, and the user approved the colored moons. Galilean appearance increment accepted, including Io's documented blur exception. Next implementation is Ceres/Triton cylindrical textures; Phobos/Deimos require a separate matching mesh/atlas integration. Historical running notes below are superseded.

Latest resume: user visually approves the three colored moons ("they look beautiful"). Existing PID 35576 was still running on entry, with no completed browser report yet; do not treat visual approval as a completed automated run or launch a duplicate. No runtime/assets were changed during that run.

Prepared the remaining-body sources independently under `.tools/remaining-bodies/`: cached NASA GLBs in ignored `assets/source/{ceres,triton,phobos,deimos}_vtad.glb`, extracted model JSON and preview PNGs, and inspected all four base-color images. Ceres has a separate normal map: select material baseColorTexture (image index 1), not image 0. Its 4096x2048 base color is gray in the published NASA model; prefer this observed/display source to invented color. Triton's 4096x2048 base color includes an explicitly plain unmapped northern region, which must be documented rather than filled with invented detail.

NASA pages: `https://science.nasa.gov/resource/ceres-3d-model/`, `https://science.nasa.gov/resource/triton-3d-model/`, `https://science.nasa.gov/resource/phobos-mars-moon-3d-model/`, `https://science.nasa.gov/resource/deimos-mars-moon-3d-model/`. GLB URLs are captured in discovery output/scripts and cached page HTML. Phobos texture is 2048x2048, Deimos 1024x1024: square UV atlases for their irregular meshes, NOT cylindrical maps. Do not put these on sphere geometry. Next implementation should preserve mesh/UV correspondence or source suitable cylindrical maps plus justified shape approximation. Check model geometry units/orientation before import. Only 651,316 bytes remain in the texture budget; measure compressed derivatives before publication. Source collection does not count as implemented appearance.

Io correction completed successfully: asset conversion/checks, verify (120 passes plus two expected diagnostics), five browser tests with no failures/flakes/skips, and production build. User accepts remaining blurry/smudged areas for now; documented under `docs/ENHANCEMENTS.md` (Io surface mosaic detail). The temporary user screenshot was already removed; no new user screenshots were created or retained.

User requests color variants for Europa, Ganymede and Callisto. Replaced grayscale with embedded base-color PNGs extracted reproducibly from NASA VTAD published glTF models. All three source images inspected. Source dimensions Europa 4096x2048, other two 2048x1024; compressed 1024/1440 distribution tiers retained for budget. No tint or invented color added. Builder validates expected container/material/image structure and records both container and embedded-image hashes. Source URLs, NASA credits, usage terms and visualization limitations updated in provenance, science docs and app. These are visualization textures, not calibrated true-color measurements; landmark/rotation validation remains P3.4.

Published texture package: **79,348,684 / 80,000,000 bytes**, leaving 651,316 bytes for remaining assets. Typecheck, lint/boundaries, 120 unit tests (+2 expected diagnostics), asset checks and 72 dependency license checks passed. Local server PID 3640 remains independent and returned HTTP 200.

### Existing color validation job — review first on resume

- Persistent hidden Node PID **35576**, startup confirmed; `.tools/moon-color/pid.txt`, launcher `run.mjs`.
- Base `2fd73e83ab1af9f36e17a675e022864527f08dbc` plus all uncommitted Galilean, Io and color-replacement changes. No new implementation commit yet.
- Browser: `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/moon-color/browser --reporter=json`; production `pnpm.cmd build` follows only on browser success.
- `.tools/moon-color/result.json`: progress/completion; `browser.log`: JSON report; `browser-stderr.log`; `browser/`: captures/traces; `build.log` and `build-stderr.log`.
- Next review rendered colors at LOW/HIGH day/quarter, shader/resource errors and original reference regressions. If passed and visually sound, commit Galilean increment, excluding unrelated generated performance artifacts. Continue Ceres/Phobos/Deimos/Triton appearance, sourced orientations and Phase 3 exit evidence. Do not duplicate the existing job. Software WebGL evidence is not hardware WebGPU evidence.

## Previous: Io source correction (completed)

The prior Galilean run completed successfully: five browser tests passed (zero skipped/flaky/unexpected/errors), production build exit 0. User approved Europa, Ganymede and Callisto but reported Io's texture as strange. Inspected `temp-pics/IO.png`: obvious patchwork joins, large blurred regions and radial polar streaking match the legacy Io map. Deleted that exact temporary screenshot after analysis as requested; folder retained. The three other maps are intentionally grayscale source products, not full-color representations.

New correction uses USGS's higher-detail Io color-merge mosaic; browse image reviewed with substantially better continuity. Full TIFF acquisition/conversion and validation are running under persistent hidden Node PID **15920**, launcher `.tools/io-correction/run.mjs`, PID file `pid.txt`. Base remains `2fd73e83ab1af9f36e17a675e022864527f08dbc` plus uncommitted Galilean and correction changes. No correction pass or rendered acceptance claimed yet.

Sequence: `pnpm.cmd exec tsx tools/assets/build-galilean.ts`; `pnpm.cmd exec tsx tools/check-assets.ts`; `pnpm.cmd verify`; `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/io-correction/browser --reporter=json`; then `pnpm.cmd build`. Stops on any failure. Logs `<step>.log` / `<step>-stderr.log`, browser captures `browser/`, and completion `result.json`, all in `.tools/io-correction/`. Io now targets 1024/2048; others stay 1024/1440. Budget checked before publication, obsolete Io 1440 removed afterward. Full source metadata and final bytes are emitted by the builder.

Next: review this existing job first, fix failures without duplicate launch, inspect replacement source and Io captures (especially polar/seam artifacts), then commit accepted Galilean increment. Original user server remains independent. Ceres/Phobos/Deimos/Triton, scientific orientations/registration and Phase 3 exit gates remain pending. Do not claim realistic natural color: USGS identifies Io's map as enhanced/false color.

## Previous: Galilean surface increment implemented; browser/build completed

Approved Venus/Titan/Pluto/Charon increment committed as `2fd73e83ab1af9f36e17a675e022864527f08dbc`. New uncommitted increment adds NASA-distributed USGS/JPL/Caltech Io color and Europa/Ganymede/Callisto grayscale visualization maps. Source TIFFs and 1024/native-1440 ETC1S builder, source hashes, credits and limitations are recorded. Eight new assets add 1,288,963 bytes; total 79,152,006 / 80,000,000 bytes (847,994 bytes remain). Source maps reviewed; rendered captures still pending. Scientific landmark registration and rotations remain P3.4.

Short checks passed: typecheck, lint/package boundaries, 120 unit tests plus two expected diagnostics, all asset alignment/manifest/budget checks and 72 dependency licenses. Browser test now covers both groups of four bodies, checks successful 1024/1440 Galilean loads and saves LOW/HIGH day/quarter captures. Original visual references are unchanged. Old generated performance files remain outside this increment.

### Existing job to review on resume — do not duplicate

- Persistent hidden Node PID **34864**, process startup confirmed; `.tools/galilean-assets/pid.txt`.
- Launcher `.tools/galilean-assets/run.mjs`; base `2fd73e83ab1af9f36e17a675e022864527f08dbc` plus uncommitted Galilean increment.
- Browser: `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/galilean-assets/browser --reporter=json`.
- Then production `pnpm.cmd build` only if browser passes.
- JSON browser report `browser.log`, browser stderr `browser-stderr.log`, captures/traces `browser/`, build logs `build.log` / `build-stderr.log`, progress/completion `result.json`, all under `.tools/galilean-assets/`.
- Independent user server PID 3640 remains running; localhost:3000 returned HTTP 200 before launch.

Next: review completion/report and all Galilean captures, fix failures before committing. Then Ceres, Phobos, Deimos, Triton; sourced scientific orientations/landmark registration; full Phase 3 science/performance/device exit evidence. Local browser automation is SwiftShader WebGL2 and does not verify hardware WebGPU. Phase 3 remains incomplete.

## P3.3 first surface increment accepted

Resumed review: `.tools/phase-three-surfaces/result.json` records browser and production build exit 0. Browser report has four expected passes, zero failures/skips/flakes and no report errors. Reviewed all 16 LOW/HIGH day/quarter captures in `contact.png`; user also explicitly approved Venus, Pluto, Charon and Titan. Local automation remains WebGL2/SwiftShader, not hardware WebGPU evidence. This increment is accepted for commit; P3.3 and Phase 3 remain incomplete.

Next source work: Ceres, Phobos, Deimos, Io, Europa, Ganymede, Callisto and Triton. Remaining asset headroom is 2,136,957 bytes; preserve the 80,000,000-byte gate and use source-limited compressed maps.

### Historical launch record (completed and reviewed above)

P3.2 is committed as `b4b2e87ada789c62bcd01b739f1847cb84de263d`. The corrected six-test ring/visual/precision/startup regression passed and the user confirms Saturn looks good. No duplicate ring-fix job is needed. Older job statuses below are historical.

Uncommitted P3.3 changes: softened opaque Venus cloud deck, procedural opaque Titan haze and atmosphere rims; sourced New Horizons Pluto color and Charon grayscale basemap textures at 1k/2k. Neutral gray explicitly marks missing southern coverage. Scientific orientation for Charon and the other missing bodies remains pending P3.4. New Horizons conversion is reproducible, uses ETC1S compression and publishes staged files after budget checks; sources/hashes and limitations are in `docs/licensing/new-horizons-assets.json` and `docs/science/phase-three-surfaces.md`. The app data page has credits and appearance explanations. Four new compressed assets total 680,604 bytes; all textures total 77,863,043 / 80,000,000 bytes.

Verified before launch: typecheck, lint/boundaries, 120 unit tests plus two expected diagnostics; asset checks pass including block alignment; 72 production dependency licenses pass. Visual results are not yet reviewed. Original hero maps/references and scientific fixtures are unchanged. Existing generated next-env.d.ts and earlier performance output changes are preserved, not included in the P3.2 commit.

### Running job to review next

- Persistent hidden Node PID **26484**; startup confirmed. Launcher `.tools/phase-three-surfaces/run.mjs`, PID record `pid.txt` in that directory.
- Tested base `b4b2e87ada789c62bcd01b739f1847cb84de263d` plus current uncommitted P3.3 changes.
- First: `pnpm.cmd exec playwright test e2e/body-detail.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/phase-three-surfaces/browser --reporter=json`.
- If browser succeeds: `pnpm.cmd build`, sequentially, not during browser measurements.
- Browser report `.tools/phase-three-surfaces/report.json`, stderr `browser-stderr.log`, captures/traces `browser/`; build logs `build.log` and `build-stderr.log`; completion/progress `result.json`.
- Persistent user dev server remains independent (root PID 3640, `.tools/saturn-fix/dev.pid`, http://localhost:3000). Do not stop it when tests finish.

Next: review job report and all 16 new-body LOW/HIGH day/quarter captures, then fix failures before committing this P3.3 increment. Continue Ceres, Phobos/Deimos, Galilean moon and Triton appearance, followed by all-body orientations and full performance/scientific exit evidence. P3.3 and Phase 3 remain incomplete.

## Latest user-reported Saturn/load fix

Supersedes the job status below. The original P3.2 report finished with six passing tests and one failed ring-shadow visibility assertion. Its fixture looked at the wrong hemisphere; fixed sunward camera views now check the south surface at the June 2020 epoch. Original material references, precision/depth and startup checks passed in that run. Keep its failed report as evidence.

Found invalid compressed ring base dimensions (1024x63 and 2048x125), with KTX2Loader warnings in the browser trace. Rebuilt 1024x64 / 2048x128 assets, updated manifest/licenses and added a block-alignment asset gate (confirmed it rejects the old asset). The automatic browser has no WebGPU adapter, so this is a confirmed portable asset defect, not a reproduction of the user's exact eight console errors. During rebuild, toktx's exclusive Windows file handle also triggered a Turbopack panic. Converter output now encodes to a temporary source location then publishes by rename; dev server restarted cleanly.

Reviewed smoke: HTTP 200, Saturn and rings visible from north/south, no console errors or alignment warnings, surface-shadow toggle changes 14,922 pixels. Evidence `.tools/saturn-fix/smoke.json`, `north-fixed.png`, `south-on.png`. Full verify passes 120 tests plus two expected diagnostics; asset check passes 77.18 MB / 80 MB. Hardware WebGPU remains unverified.

Persistent user dev server is independent of Playwright: root PID **3640**, `.tools/saturn-fix/dev.pid`, launcher `dev.cmd`, log `.tools/saturn-fix/dev-server.log`, URL http://localhost:3000. Do not terminate it when tests finish. The prior test-owned server had stopped after the suite. Earlier panic evidence is retained in `dev-server-before-restart.log`.

Current regression: PID **10728**, `.tools/saturn-fix/regression.mjs`, base `04d784740974206d681c75cb9e6eee140850d57b` plus current uncommitted P3.2/fix files. Runs rings, original visual references, precision and startup suites with output `.tools/saturn-fix/regression-browser`; report `.tools/saturn-fix/regression.json`, stderr `regression-stderr.log`, completion `regression-result.json`. Launch confirmed; results unreviewed. Review this existing job first next turn. No P3.2 commit or phase completion is claimed yet.

## Latest: P3.2 implemented, browser review running

P3.1 is committed as `04d784740974206d681c75cb9e6eee140850d57b`. Its browser completion record passed and six maps were visually reviewed. Earlier running-job notes below are historical.

Uncommitted P3.2 now adds sourced C/B/A ring geometry and Cassini division, shared radial color/opacity, analytic planet-to-ring and ring-to-planet shadows, forward scattering with LOW fallback, giant atmosphere rims, ring-aware Saturn focus framing and lab-only deterministic ring views/diagnostics. Scientific dimensions and rendering approximations are documented in [saturn-rings.md](science/saturn-rings.md). No asset binary/dependency was added. Generated `apps/web/next-env.d.ts` remains excluded from implementation commits.

`pnpm.cmd verify` passed: typecheck, lint/package boundaries, **120 tests passed plus two expected diagnostics**. Two new tests cover sourced ring dimensions, equatorial geometry, shared asset loading, attachment without double tilt and geometry disposal. Browser shader/visual correctness is still unreviewed; P3.2 is not complete.

### Current job — check before launching anything

- Hidden persistent `cmd.exe` PID **16800**, startup confirmed; base commit `04d784740974206d681c75cb9e6eee140850d57b` plus current uncommitted P3.2 files.
- Launcher `.tools/phase-three-rings/run.cmd`; PID `.tools/phase-three-rings/pid.txt`.
- Command: `pnpm.cmd exec playwright test e2e/rings.spec.ts e2e/visual.spec.ts e2e/orbits.spec.ts e2e/precision.spec.ts e2e/startup.spec.ts --output=.tools/phase-three-rings/browser --reporter=json`.
- JSON report `.tools/phase-three-rings/report.json`; stderr `.tools/phase-three-rings/stderr.log`; exit record `.tools/phase-three-rings/result.txt`.
- Captures/traces and measured independent shadow effects: `.tools/phase-three-rings/browser/`.
- Tracked diff snapshot `.tools/phase-three-rings/tracked.patch`; new files remain in the working tree (snapshot is not a complete patch).

Next: inspect the exit record and JSON report; review north/south/edge, independent shadow toggles, quality transitions, Explore/orbits and original material/depth results. Fix failures without relaxing thresholds and relaunch persistently if needed. Record honest visual/performance limitations before committing P3.2. Production build, full Phase 3 CPU/device/performance evidence, remaining body assets and orientation are still pending. No duplicate foundation run is needed.

## P3.1 implementation, awaiting review

- Activated six existing licensed KTX2 maps: Mercury, Venus, Jupiter, Saturn, Uranus and Neptune. AssetManager preloads their 1k versions and retains existing tier upgrades, capped by available source resolution (2k).
- Jupiter/Saturn now receive tier-dependent close-up sphere geometry.
- LOD swaps only sphere geometry, preserving future ring annuli.
- Added a browser resource-error check and six deterministic day-view captures. These captures are review artifacts, not accepted golden images or proof of hero-grade completion.
- Asset manifest/credit check passed: 77.17 MB / 80 MB. Dependency license check passed: 72 production dependencies.

Saturn rings, atmosphere extensions, missing moon/dwarf assets and rotations, complete per-body visual references and Phase 3 performance acceptance remain pending. No physical/device or browser pass is claimed here.

## Running verification — review this first next turn

- Persistent hidden PowerShell process: PID **36192** (confirm process identity; PIDs can be reused).
- Launcher: `.tools/phase-three-foundation/run.ps1`; PID record: `.tools/phase-three-foundation/pid.txt`.
- Source: uncommitted P3.1 changes on base `4409ef5d8f97299d9058360c97d560493d067c1c`.
- Commands, sequential: `pnpm.cmd verify`, then `pnpm.cmd exec playwright test e2e/phase-three-materials.spec.ts e2e/visual.spec.ts e2e/startup.spec.ts --output=.tools/phase-three-foundation/browser`.
- Log: `.tools/phase-three-foundation/run.log`.
- Completion status: `.tools/phase-three-foundation/result.txt` (written on success or ordinary command failure).
- Browser traces/screenshots: `.tools/phase-three-foundation/browser/`.
- Startup confirmed with Get-Process. Results have not been reviewed. No duplicate run should be launched before checking this job.

Next: inspect result/log, fix failures, review all six images and original reference results. Commit P3.1 only after required checks pass. Then implement P3.2 rings, with authoritative sourced dimensions and analytic shadow tests. Builds, CPU runs, GPU/depth checks and full phase exit validation remain outstanding. Preserve `test-results/` and all scientific fixtures.

## P3.1 review on resume

The process has exited. The log confirms typecheck, lint/boundaries and 118 passing unit tests plus two expected diagnostics. Browser `.last-run.json` records `passed` with no failed tests (September 27, 02:13:31); all six new-body PNGs were visually reviewed and show their intended maps. The wrapper did not preserve browser stdout or write result.txt, so exact per-test timings are unavailable. Future launches use native output redirection plus a JSON browser report and explicit exit records. The foundation is ready to commit; full Phase 3 startup/performance acceptance remains pending. Generated next-env.d.ts changes are excluded.

## P3.2 reviewed checkpoint

The corrected regression finished successfully: `.tools/saturn-fix/regression-result.json` exit 0; report has six passed, zero failed/skipped. This covers ring shadow toggles and both sides/edge/LOW/HIGH/MEDIUM views, original visual references, precision/depth and startup. Captures reviewed; user also confirms Saturn looks good. Implementation milestone is ready to commit; full Phase 3 performance and hardware evidence remain pending. Persistent development server remains independent of tests. Continuing P3.3 body detail.
