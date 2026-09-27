# Phase 3 checkpoint — September 27, 2026

Phase 3 is authorized and started. Phase 2 remains accepted with ADR 0010 and documented device coverage. File-level work and the 21-body audit are in [PHASE_3_PLAN.md](PHASE_3_PLAN.md).

## Current: color variants installed; rendered review running

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
