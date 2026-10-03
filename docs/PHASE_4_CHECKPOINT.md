# Phase 4 checkpoint

Updated October 3, 2026.

## Current state

- Phase 3 is accepted. Its renderer, scientific tolerances and accepted Phase 2/3 exceptions remain closed.
- User has requested starting Phase 4 and invited questions along the way.
- User approved [PHASE_4_PLAN.md](PHASE_4_PLAN.md) and instructed implementation to begin. P4.1–P4.9 are authorized in order; do not ask for the plan approval again.
- P4.1 URL/UTC validation and safe legacy startup are implemented. `pnpm.cmd verify` passes: 241 tests plus two expected rejected-model diagnostics; typecheck/lint/package boundaries pass. The new web tests are included in both Vitest discovery and web typechecking.
- P4.1 browser startup verification is reviewed and passes all five cases, with no skips/flakes/report errors. Both new captures were inspected.
- P4.2 is reviewed accepted and committed locally as `0b4b9f4`. Its production/build/browser/precision/storage/paired CPU evidence is recorded below and in the dedicated final review.
- P4.3 object routes/metadata/persistent shell are **reviewed accepted and committed locally as `1f778e3`**. Corrected retry passes both production builds, all 25 main browser checks and the configured all-21 metadata check, clean server logs and source/evidence hashes. The first failure is preserved. Short verify is 290 plus two existing expected diagnostics.
- P4.4 cold URL/history controller, accepted controls, explicit UTC/time anchors and sharing fallback are **reviewed accepted**. All 34 production browser cases, budgets, clean logs and source/preserved hashes pass. Short verify passes 306 tests plus two existing expected rejections, 38 files. Scoped acceptance commit is next; P4.5-P4.9 remain authorized.

## P4.1 implementation and evidence

- Pure codec resolves all 21 catalog bodies, legacy focus/canonical precedence, defaults/empty/known future layers, scale/frame/view enums, bounded queries and diagnostic flags. It rejects ambiguous duplicate fields and malformed encoding; valid object paths survive rejected query settings.
- Strict UTC adapters validate calendar components, explicit offsets, milliseconds and the existing 1900–2100 range. Fixed links initialize paused; rejected/absent dates remain LIVE outside explicit diagnostic test mode.
- EngineCanvas now uses validated state for time/focus/layers/scale/view, retaining startup cleanup and compatibility retry. An accessible link-settings notice reports recovery without claiming a graphics failure.
- Domain frame syntax is bounded/validated while registered namespaces and future event contracts remain intact.
- ADR: [0011](adr/0011-consumer-route-state.md). Unit log: `.tools/phase-four/p4-1/unit/verify.log`; all 35 test files passed. A test variable collision was caught during the first full run and fixed before the passing verify.
- The three new browser cases cover invalid-date LIVE recovery, paused offset restoration in `America/Toronto`, and malformed queries/explicit all-off layers. The two existing startup cases cover phone LAN hydration and a stalled startup.
- P4.1 also adds the small store/notice/CSS wiring needed to show nonfatal issues and includes web tests in tsconfig; these serve the approved validation/accessible-recovery requirements.
- **Still pending:** actual frame commands (P4.2), installed object/alias/event routes (P4.3), continuous state/history/share integration (P4.4), and later UX steps. Parsed valid frame settings currently show an unrestored notice. No scientific providers/assets/physical models changed.

## Inspected baseline

- HEAD: `3c0a304` (Phase 3 acceptance and detailed Phase 4 handoff).
- Node `v24.12.0`; pnpm `10.32.1`; use `pnpm.cmd`.
- Existing `http://localhost:3000/` responded HTTP 200; listening PID 23516 at inspection. Recheck process identity/command line before service changes.
- Read root/app agent instructions, current Phase 4 handoff, relevant implementation sections, route/bridge/domain/engine source and installed Next.js routing/metadata/history/Suspense guides.
- Main gaps confirmed: external state parsing is fragmented; object/event routes absent; MiniSearch unused; get/apply MapState frame/view behavior incomplete; accessible in-view query absent; card classifications/default clutter need work.

## Preserve existing unrelated changes

These files were modified before Phase 4 planning; do not reset or stage them as Phase 4 implementation:

```text
docs/perf/phase-two-points-webgl.json
docs/perf/react-profile.json
docs/perf/texture-stability.json
docs/perf/screens/earth-webgl.png
docs/perf/screens/mars-webgl.png
docs/perf/screens/mobile-webgl.png
docs/perf/screens/phase-two-ceres.png
docs/perf/screens/phase-two-europa.png
docs/perf/screens/phase-two-jupiter.png
docs/perf/screens/phase-two-orbits-ceres.png
docs/perf/screens/phase-two-orbits-earth.png
docs/perf/screens/phase-two-pluto.png
docs/perf/screens/phase-two-titan.png
docs/perf/screens/solar-system-webgl.png
```

Ignored `test-results/` reports and prior `.tools/` evidence also remain preserved.

## Next action

P4.4 is reviewed accepted; no duplicate validation is needed. Commit its scoped implementation/docs/evidence locally and continue P4.5 catalog search. P4.3 is reviewed accepted and committed; no repeat P4.3 job is pending. P4.1/P4.2 are accepted. Database/ingestion/server search, deployment and Phase 5 remain excluded.

For any multi-minute job, record its PID/URL, exact command, source revision/diff, result/log locations and next review here, then end the turn. On continuation, inspect that existing job first.

## Reviewed P4.1 startup validation

- Source commit: `cd64f74491a33d1010f3928374f5bbb73111899f` (`P4.1: validate consumer route state and UTC input`). Local commit only; no push.
- Run directory: `.tools/phase-four/p4-1/startup/`.
- Persistent Node wrapper PID: **14460**. Launched with `Start-Process -WindowStyle Hidden`; startup was accepted. Recheck the process/result file before using this historical PID.
- Wrapper command: `node .tools/phase-four/p4-1/startup/run.mjs` from the repository root.
- Browser command: `pnpm.cmd exec playwright test e2e/startup.spec.ts e2e/phase-four-url.spec.ts --output=.tools/phase-four/p4-1/startup/browser --reporter=json`.
- Reuses the already-running dev server at `http://localhost:3000`, listening PID **23516** at launch. This focused run has no production build or `.next` output collision. Relevant source is committed and must remain unchanged during validation; wrapper checks revision/relevant diff before and after the suite.
- Manifest/result: `launch.json`, `result.json`; raw report: `browser.json`; stderr: `browser-stderr.log`, `wrapper-stderr.log`; captures/traces under `browser/`. Pre-existing generated evidence SHA256s are recorded and checked unchanged.
- Finished `2026-10-02T21:55:21.641Z`; browser duration 36.17 seconds. All five cases passed, zero skips/flakes/report errors; source checks and preserved-evidence hashes pass.
- **Reviewed pass.** The invalid-link capture shows a readable recovery notice and LIVE solar overview. The offset-date capture shows the expected paused UTC timestamp and moons-only controls. The wide True-scale view's tiny/hidden moon and existing card/popover clutter are limitations covered by later card/shell work; this is startup/state evidence. No physical GPU throughput is claimed.
- Browser stderr is empty. Wrapper stderr contains Node's shell-argument deprecation notice; the wrapper uses fixed trusted arguments. No application/browser error is reported. Later reusable wrappers should invoke the pnpm CLI directly to avoid that warning.
- Raw output remains in the run directory. Published review/raw browser record: `docs/perf/phase-four/p4-1-*`. Continue P4.2 without repeating this job or asking for plan approval again.

## How the user can check active jobs

From the repository root in PowerShell:

```powershell
node tools/phase-four-status.mjs
```

This reads `.tools/phase-four-active-job.txt`; it does not launch a duplicate job. It reports running/finished, source, stage outcomes and log directory, and distinguishes automated success from a recorded review. To inspect a specific older run, pass its directory:

```powershell
node tools/phase-four-status.mjs .tools/phase-four/p4-1/startup
Get-Content .tools/phase-four/p4-1/startup/result.json
```

Every future job handoff must include the appropriate status command and raw result/log path, as the user requested. Update the pointer when a new run is launched.

## P4.2 implementation and validation handoff

- CameraReference/Controller implement pose-preserving SSB, helio, Earth inertial/fixed references, scientific axes, follow-off origin motion, reversed time, SSB flight interpolation, reference/up/pan/follow/preset history and reusable hot buffers. Default SSB arithmetic skips transforms. Physics/science/providers/assets are unchanged.
- Public v1 additions: CameraFrame/result, layer status/settling, restoration flags, cold mapStateChange, commandError separate from graphics fallback. Composite restoration emits one state event. Startup restores validated fields without history/animation and retains explicit diagnostic epochs. Layer settling observes the latest toggle and requested failures.
- Local `pnpm.cmd verify` passes: **254 tests plus two existing expected rejections, 36 files**, typecheck/lint/package boundaries. Log: `.tools/phase-four/p4-2-verify.log`. New browser state coverage has six cases; required longer regressions are pending.
- Plan fixture clarification: no independent Earth SPICE attitude fixture exists in this checkout. Added independent analytic rotation/translation/tilt tests and actual frame-tree timeline-boundary tests; retained unchanged independent Mars/Phase 3 fixtures and Earth Greenwich-noon/sidereal-day checks. No new Earth SPICE accuracy claim. ADR 0011 records this limit.
- Run directory: `.tools/phase-four/p4-2/`; isolated candidate worktree: `candidate/`; accepted Phase 2 reference: `.tools/cpu-phase-three/reference` at `4409ef5d8f97299d9058360c97d560493d067c1c`. The reference's generated next-env change is recorded; its relevant source is unchanged.
- Tested candidate is **uncommitted P4.2 source** on base `508646c`, not an accepted P4.2 commit. Exact 261-file snapshot SHA256: `5158135bcc48366e5ce24f82141ee9632f84079e024e7b9a20e7e0d02bdcd8cc`. `launch.json` records per-file hashes, new-source copies and preserved-evidence hashes; `tracked-source.patch` preserves the tracked changes. Code remains unchanged while validation runs. No push.
- Wrapper command from root: `node .tools/phase-four/p4-2/run.mjs`; hidden persistent launch. PID is recorded in `result.json` and in the launch record below. It installs offline/frozen, builds in the isolated worktree, checks engine/assets/licenses, runs 14 state/startup/precision/reference browser cases (including all eight original material screenshots), then fresh reference and candidate CPU runs sequentially on the same machine. The original 20% mean/p95/environment comparison remains unchanged.
- Persistent wrapper PID **38644**; startup confirmed with status `running` at the offline/frozen install stage. Run accepted; no longer-stage result has been reviewed. Recheck result/process identity when resuming rather than relying on this historical PID.
- Wrapper invokes the pnpm Node CLI directly; no shell argument interpolation. Its own candidate/reference dev servers use ports **3002/3001** and are stopped by owned PID; root server port **3000/PID 23516** is preserved. Build precedes browser/CPU stages, with no root `.next` collision or concurrent measurements.
- Status: `node tools/phase-four-status.mjs`. Specific run: `node tools/phase-four-status.mjs .tools/phase-four/p4-2`. Raw status: `Get-Content .tools/phase-four/p4-2/result.json`. Follow the active log reported by the status, e.g. `Get-Content .tools/phase-four/p4-2/build.log -Tail 30 -Wait` (Ctrl+C stops log viewing).
- Logs/reports: stage `.log`/`-stderr.log`, `browser.json`, captures/traces in `browser/`, `engine-bundle.json`, `precision-webgl.json`, `texture-stability.json`, `reference.json`, `current.json` and `current-comparison.json`. Wrapper stdout/stderr are separate. Original generated evidence remains untouched and hash-checked.
- On continuation: inspect the same result first; review every stage/report/stderr, fixed-frame captures, original screenshot diffs, precision/depth and matching CPU comparison. Publish a dedicated Phase 4 record/review. Fix any failure with preserved evidence and a new run directory. Commit P4.2 only after required green review, then proceed P4.3. SwiftShader evidence is not physical-device performance acceptance.

## October 3: first run reviewed; corrected run pending

- Original wrapper finished `2026-10-02T22:37:54.127Z`. Build, assets/licenses and engine gzip (374,751 / 450,000 bytes) pass. Browser: **13 pass, one fail, zero skips/flakes/report errors**. All six frame tests, precision (0.134356 px / 0.5 px, eleven depth probes), LOW texture stability and eight original material references pass. Fixed-frame captures are reviewed. CPU stages did not run after the failed browser gate.
- The malformed-query ordinary LIVE startup exposed a fractional orbit seed rounding 0.477 microseconds beyond the strict Neptune validity endpoint. Reproduced at `2026-10-02T22:35:20.002Z`. The sampler now keeps exact caller endpoints; a new test fails on the old behavior and passes with the fix. The browser case pins Date.now at that epoch with real RAF/timers, still rejects malformed query/debug flags and still attempts ordinary LIVE startup. Bounds/providers/assets/science/reference thresholds are unchanged.
- Failed result/trace/candidate are preserved; dedicated published [review](perf/phase-four/p4-2-first-review.md), raw browser/result and hashed review are in `docs/perf/phase-four/p4-2-first-*`. Isolated first source, fixed reference and all fourteen existing generated evidence hashes remain unchanged.
- Corrected `pnpm.cmd verify`: **255 tests plus two existing expected rejections, 36 files**, typecheck/lint/boundaries pass. Log: `.tools/phase-four/p4-2-fixed-verify.log`.
- New run directory **`.tools/phase-four/p4-2/retry-1/`**, with its own candidate worktree and immutable source snapshot. Base remains `508646c`; source SHA256 **`34f3b9e45ae924c3be93e1152c8fee8b03d9f9f5e34dcd2016ce73676313e3c3`** over 261 files. P4.2 remains uncommitted pending required review; the old candidate is untouched.
- Wrapper: `node .tools/phase-four/p4-2/retry-1/run.mjs`, launched hidden/persistent. It repeats the production build, budgets/licenses and all 14 required browser cases for the corrected sampler, then fresh reference/candidate CPU reports at the unchanged 20% gate. Uses the same fixed reference, own ports 3001/3002, and leaves root port 3000/PID 23516 intact.
- Persistent wrapper PID **42364**, confirmed running at offline/frozen install. This is startup confirmation only; longer stages are unreviewed. Check `result.json` before relying on this historical process ID.
- Check latest status: **`node tools/phase-four-status.mjs`**. Explicit run: `node tools/phase-four-status.mjs .tools/phase-four/p4-2/retry-1`. Raw: `Get-Content .tools/phase-four/p4-2/retry-1/result.json`; stage logs/captures/reports follow the same names as above within this new directory. Future browser failures now record summary counts in status before exiting.
- Next review: inspect this run first, then source/evidence hashes, every stage, malformed-query ready result, screenshots/precision, environment equality and all five CPU paths. Record a separate reviewed result; do not relabel or discard the first failure. Proceed to the P4.2 acceptance commit/P4.3 only if these required results pass review.

## October 3: P4.2 accepted after final review

- Corrected wrapper finished `2026-10-03T05:20:38.955Z`; **all required stages reviewed green**. Browser 14/14, no skips/flakes/errors. Production build, original eight material references, corrected LIVE startup and actual frame restoration pass. Precision is 0.134356 px; eleven depth probes pass. Engine gzip 374,760 / 450,000 bytes. Assets and 72 dependency licenses pass.
- Fresh sequential same-environment CPU pair against `4409ef5` passes all five paths: maximum mean/p95 increases **3.41% / 4.35%**, below the unchanged 20% gate. Matching environment/schedule reviewed. This is SwiftShader/CPU evidence; no physical GPU result is inferred.
- Source and existing evidence hashes match. Fixed-frame captures reviewed. Raw result preserved unchanged; `review.json` hashes it and records reviewed pass. `node tools/phase-four-status.mjs` now distinguishes the recorded review. Failed first run remains preserved.
- Dedicated [final review](perf/phase-four/p4-2-final-review.md) and adjacent source/result/browser/CPU/precision/bundle/texture artifacts are published under `docs/perf/phase-four/`. Runtime/evidence were committed locally as `0b4b9f4` (`P4.2: support consumer camera frames and MapState restoration`), excluding all fourteen earlier generated diffs. No push. P4.3 is already authorized.

## October 3: P4.3 implementation and first launch (now finished)

- New `(explore)` shared layout owns the Explore shell/canvas. Catalog pages use Promise params, 21 static routes and `dynamicParams=false`. Unknown/cross-kind/future IDs return not-found handling; a client pathname gate suppresses renderer startup behind those screens. Charon uses the actual `moon:charon` ID and `/object/moon/charon` path; `moon:pluto-charon` is not in this catalog.
- Object metadata is pure catalog title/description/kind with OG `website`. Optional explicit `SITE_URL` validates HTTP(S) origin only; absent/invalid values omit absolute canonical/OG URLs. Canonical root is scoped to the overview page rather than the global layout, avoiding inheritance on About/404 pages. Configuration is documented in README/.env.example. No raster asset, telemetry or invented event added.
- Friendly alias page checks catalog membership and bounded search settings. The additional one-segment Proxy validates raw query escaping before Next's decoded searchParams lose malformed-percent evidence. Its matcher bypasses object/static asset requests. Existing literal About/lab routes retain precedence. Events return an honest unavailable 404 with a useful Explore link.
- Search/destination selections use Next router.push with canonical object paths and preserve actual accepted engine state plus explicitly retained diagnostic flags. The small Suspense observer applies location commands, skips already-applied startup state and replaces legacy root-focus paths without duplicate restoration/history. EngineCanvas rereads the latest URL during asynchronous startup/layer settling. About leaves the group through Next Link and disposes the engine. Standalone lab Explore retains its existing behavior.
- P4.4 still owns complete canvas-selection/Previous-view/history integration, cold state-to-query synchronization and the 500 ms debounce/clipboard replacement. The existing share UI is not yet migrated. P4.5–P4.9 consumer/search/card/mobile/accessibility work remains pending. No engine hot loop/science/provider/asset changed in P4.3, so the accepted P4.2 fresh CPU pair is not repeated here.
- Short `pnpm.cmd verify` passes **290 + two existing expected rejections, 37 files**, typecheck/lint/boundaries. Log `.tools/phase-four/p4-3/verify.log`. Web typecheck now runs `next typegen` before tsc, following installed Next docs; the initial check caught stale generated root-page types and an exact-optional type error, both corrected. Test discovery confirms **25** required browser cases (11 new routing plus 14 prior frame/startup/URL/precision/visual cases).
- Immutable candidate: `.tools/phase-four/p4-3/candidate`, detached base **`0b4b9f4`**, exact uncommitted source snapshot SHA256 **`a055da1a670a6e7fbc803c769f7d5337434250a0766e9149c88b78bb96effb9d`**, 280 files plus the removed old root page. Per-file hashes, deletions, binary tracked patch and new files are recorded in `launch.json`, `tracked-source.patch` and `new-source/`. Runtime/config/README/ADR source must stay unchanged during the run. All fourteen earlier generated diffs are preserved and hash-checked; ignored test-results is untouched.
- Persistent wrapper command: **`node .tools/phase-four/p4-3/run.mjs`**, launched hidden with `Start-Process`, PID **35048**, startup confirmed. Recheck recorded result/process before relying on the historical PID. It runs offline/frozen install, an unconfigured-origin production build, engine/assets/license checks, an owned production server on **3002**, and 25 Playwright cases. Then it stops only its owned server, builds with `SITE_URL=https://continuum.example`, starts a fresh owned production server and checks all-21-object HTTP metadata again (one test case). Actual build/server environment is recorded per stage. Root port **3000 / PID 23516** remains running; no root `.next` build collision.
- Main browser invocation in the candidate: `pnpm exec playwright test --config=phase-four.playwright.config.ts e2e/phase-four-routing.spec.ts e2e/phase-four-state.spec.ts e2e/phase-four-url.spec.ts e2e/startup.spec.ts e2e/precision.spec.ts e2e/visual.spec.ts --output=<run>/browser --reporter=json`. Config points to port 3002 without launching another server. Configured-origin invocation uses the routing file with `--grep="production HTTP HTML"` and separate output. SwiftShader is functional evidence, not new physical-device performance acceptance.
- **Status:** `node tools/phase-four-status.mjs`. Explicit run: `node tools/phase-four-status.mjs .tools/phase-four/p4-3`. Raw: `Get-Content .tools/phase-four/p4-3/result.json`. Stage stdout/stderr and `wrapper-stdout.log`/`wrapper-stderr.log` are in this directory; browser reports are `browser.json` and `configuredMetadata.json`, with captures/traces in `browser/` and `configured-browser/`. For log viewing, e.g. `Get-Content .tools/phase-four/p4-3/build.log -Tail 30 -Wait`; Ctrl+C stops viewing.
- **Next review:** check this same run first; verify every stage/exit/report/error/source hash, genuine HTTP statuses, all-21 static metadata with and without origin, alias malformed/duplicate state recovery, five kind/Charon refreshes, legacy root normalization, 20 selections with engine/canvas identity and exact restoration/subscription counts, startup race/latest route, About disposal and lab support. Review unavailable-events/canonical-Charon/frame/URL captures, original visual references and precision/storage. Publish a dedicated reviewed record/hash and explicit acceptance commit only if all required checks pass. Do not launch duplicate validation or claim this unreviewed work passed.

## October 3: P4.3 failure reviewed; corrected retry running

- First wrapper finished `2026-10-03T06:02:25.832Z`: production build/budgets/assets/licenses pass; browser **22 pass / three fail, zero skips/flakes/report errors**. Configured-origin stages did not run. No P4.3 acceptance commit. See [preserved first review](perf/phase-four/p4-3-first-review.md) and adjacent source/validation/browser/hashed review JSONs. Original candidate and all fourteen pre-existing evidence hashes still match.
- Actual redirect bug: Next reconstructs decoded query values before Proxy by default; malformed `t=%FF&test=1` incorrectly kept `test=1`. Installed Next docs/source identify `skipProxyUrlNormalize`; it is now enabled so the unchanged strict codec receives the original request. Existing malformed-query expectations remain intact.
- Two test setup errors: the first Sun locator assumed whitespace in nested textContent; it now uses the exact accessible button name. Startup header clicks were blocked by the loading overlay for 60 seconds and only navigated after expiry; the test now opens the search dialog using the existing `/` shortcut while startup is pending. Keep all 20 engine/canvas identity/restoration/subscription/disposal checks and latest-startup/lab assertions. New test actions have a 10-second bound; no application deadline/acceptance threshold was extended.
- Unknown object requests returned correct 404s but logged internal `NoFallbackError` with `dynamicParams=false`. All 21 static params and catalog page/metadata notFound checks are retained; remove the nonfallback override and require genuine HTTP 404 with clean production logs in the retry. Renderer suppression remains unchanged.
- Events-unavailable and paused-offset captures inspected; no invented event/renderer behind the 404. Original material references and GPU precision/depth pass in the first run. Texture storage evidence is functional SwiftShader, not physical throughput; accepted P4.2 CPU evidence is unchanged.
- Corrected `pnpm.cmd verify` passes **290 tests plus two existing expected rejections, 37 files**, typecheck/lint/boundaries. Log `.tools/phase-four/p4-3-fixed-verify.log`, copied into the retry as `verify.log`. Final routing test lint/discovery passes; 25 required browser cases remain.
- New run directory **`.tools/phase-four/p4-3/retry-1/`**, with its own detached candidate and raw patch/new-source snapshot. Base remains `0b4b9f4`; source SHA256 **`b1f595fb4db7577e164d39ec705c184618e3a6adc3a10830720abd261dd7d41c`**, 280 files plus removed old root page. The first source is untouched. Runtime/config/README/ADR source must remain unchanged while this snapshot is validated.
- Persistent wrapper **PID 24620**, command **`node .tools/phase-four/p4-3/retry-1/run.mjs`**, launched hidden and startup confirmed. It repeats isolated offline/frozen install, unconfigured-origin production build/budgets/licenses, all 25 browser/HTTP/renderer regressions, then configured-origin production build and all-21 metadata check (one case). New wrapper assertions reject production server exception logs for both configurations. Own production port is 3002; only its owned server PID is stopped. Root dev port 3000 is preserved; current listener **PID 20920** was verified as this checkout's Node dev process after automatic config reload. Historical 23516 no longer identifies its listener.
- Check active tests: **`node tools/phase-four-status.mjs`**. Specific: `node tools/phase-four-status.mjs .tools/phase-four/p4-3/retry-1`. Raw status/logs: `.tools/phase-four/p4-3/retry-1/result.json`, stage `.log`/`-stderr.log`, `wrapper-stdout.log`, `wrapper-stderr.log`, `browser.json`, `configuredMetadata.json`, captures/traces under `browser/`/`configured-browser/`. `.tools/phase-four-active-job.txt` points here.
- On continuation inspect **this retry first**, not the old job and not a duplicate launch. Review every required stage, strict statuses, corrected alias rejection, 20 real selections/cleanup, unexpired startup latest-route result/lab, configured-origin metadata and server logs, source/evidence hashes and captures. Publish a separate reviewed record and commit P4.3 only if all required checks pass, then continue authorized P4.4. Automated success alone is not acceptance.

## October 3: P4.3 accepted after retry review

- Retry finished `2026-10-03T06:19:16.758Z`. All 25 main browser cases and one configured-origin case (all 21 metadata pages/root) pass with no failures/skips/flakes/report errors. Both production builds and server-log assertions pass; no NoFallbackError remains. Source/root/candidate and all fourteen earlier generated-evidence hashes match.
- Canonical Charon and unavailable-event captures inspected. Twenty real selections retain engine/canvas identity, one restoration per navigation, no additional engine subscriptions and one disposal on exit; latest-startup/lab and all prior fourteen regressions pass. Precision 0.134356 px/eleven depth probes; LOW textures/mip storage stable; gzip/assets/licenses within unchanged budgets. No new physical-device/CPU claim.
- Raw result remains untouched. `review.json` binds its SHA256 to reviewed pass, and the status tool now reports review recorded. Published [final review](perf/phase-four/p4-3-final-review.md) and adjacent source/result/browser/configured-metadata/precision/storage/bundle JSONs preserve evidence; the first failure is retained. Acceptance commit is next with explicit staging; then P4.4 is authorized.

## October 3: P4.3 committed; P4.4 production validation running

- P4.3 acceptance commit is **`1f778e3`**, `P4.3: add object routes and persistent Explore shell`, local only. The previously reviewed retry, failed first run and all fourteen unrelated generated-evidence changes remain preserved.
- P4.4 replaces ExploreRouteObserver with a pure RouteStateController and one Suspense bridge owning cold selection/state subscriptions. Exactly one focus/push per object choice; owned URL observations skip restoration feedback. Settings replace the current query after 500 ms. Explicit state flushes into the old entry before selection; popstate/unmount/revision cancel delayed callbacks. Rapid choices and settings during navigation keep the latest state. Next's patched native replaceState receives null, letting Next preserve internal history state and update its navigation hooks.
- Controls derive layers/scale/frame/view from accepted state. UTC picker and explicit playback/reverse/rate/LIVE commands use bridge adapters; no clock/gesture URL writes. Share captures current non-LIVE simulation time and flushes meaningful settings. Public links strip diagnostics/renderer flags; compatibility adds only renderer=webgl. Clipboard failure opens a labelled selected URL dialog with manual Copy and focus return. Follow/rate/exact camera pose remain outside public links.
- Additive public focusedId getter distinguishes camera target from a closed/selected card. Focus/back accept known hidden targets while layers remain disabled; rendering fast paths, frame loops, physical/scientific models/providers/assets and tolerance thresholds are unchanged. P4.2 paired CPU acceptance is retained; no new CPU or physical-device claim.
- Final short `pnpm.cmd verify` passes **306 tests plus two existing expected rejections, 38 files**, typecheck/lint/package boundaries. Sixteen pure controller tests cover feedback, selection cardinality, old-entry flush, stale/pop/disposal callbacks, rapid startup/owned navigation, LIVE/time snapshots and StrictMode effect replay. Log: `.tools/phase-four/p4-4/verify.log`. Playwright discovery confirms **34 required browser cases**, nine new plus the 25 prior regressions. The existing 20-selection case now requires exactly one focus and zero restoration feedback per selection, retaining identity/subscription/disposal checks.
- Persistent run **`.tools/phase-four/p4-4/`**, detached candidate at **`1f778e3` plus exact uncommitted snapshot**. Source SHA256 **`a63139f0155f9646b10d4b3a2f76482bbf0b74a3dab4ab958142d992929a95bb`**, 284 files plus deleted old observer. `launch.json`, `tracked-source.patch` and `new-source/` bind the candidate to reviewed local source. Root/candidate source and fourteen preserved hashes are checked before/after. Do not change runtime/config/ADR source while validation runs; this checkpoint is outside the snapshot and may be updated.
- Hidden persistent Node wrapper **PID 32684**, launched October 3 at 02:57:09 Toronto time; startup confirmed. Command: **`node .tools/phase-four/p4-4/run.mjs`** from the repository root. Offline/frozen install, isolated production build, engine gzip/assets/license checks, owned production server on **3002**, all 34 browser/HTTP/renderer regressions, clean server log and source checks. Browser command: `pnpm.cmd exec playwright test --config=phase-four.playwright.config.ts e2e/phase-four-history.spec.ts e2e/phase-four-routing.spec.ts e2e/phase-four-state.spec.ts e2e/phase-four-url.spec.ts e2e/startup.spec.ts e2e/precision.spec.ts e2e/visual.spec.ts --output=<absolute run directory>/browser --reporter=json`. The generated candidate config sets baseURL to port 3002 and disables Playwright's dev-server launch. Root dev port **3000/PID 20920** remains running; only the wrapper's owned server PID is stopped.
- SITE_URL is intentionally unconfigured for this build. P4.3's already accepted configured-origin build/all-21 metadata evidence is retained; origin handling is unchanged. The current suite still checks all 21 unconfigured metadata responses, genuine 404s and alias validation. SwiftShader only establishes functional precision/storage behavior, not physical GPU throughput or total VRAM.
- **Check active tests:** `node tools/phase-four-status.mjs`. Specific run: `node tools/phase-four-status.mjs .tools/phase-four/p4-4`. Raw status: `Get-Content .tools/phase-four/p4-4/result.json`. Stage stdout/stderr, `wrapper-stdout.log`, `wrapper-stderr.log`, `unconfigured-server.log`, `browser.json` and captures/traces under `browser/` remain in the run directory. The active-job pointer names this run. For viewing logs: `Get-Content .tools/phase-four/p4-4/build.log -Tail 30 -Wait`; Ctrl+C only stops the viewer.
- **Next review:** check this same job first. Verify every required stage/report/error/source/evidence hash, all 34 cases (no skips/flakes), Back/Forward control restoration and all-off layers, cancellation, one-focus selection/no clock or gesture history flood, dated snapshot paused reload/LIVE omission, Previous/Backspace replacement, card close/reselect and canvas event path, compatibility stripping, obsolete async startup and newest selection. Inspect history-restored and mobile clipboard screenshots, original material references, precision/depth/storage and production logs. Publish a dedicated hashed reviewed record and commit P4.4 only if accepted; then continue authorized P4.5. Do not report automated or unreviewed results as accepted.

## October 3: P4.4 reviewed accepted

- Existing PID 32684 run finished `2026-10-03T07:04:04.299Z`. All 34 browser cases pass, zero failures/skips/flakes/report errors. Production build/budgets/assets/licenses and clean server logs pass. Independent root/candidate/manifest check matches all 284 source files, deleted observer and fourteen preserved files.
- Reviewed desktop history-restored and mobile clipboard-fallback captures. Back/Forward, accepted UTC/state controls, no clock/gesture history flood, current-time shared paused reload/LIVE omission, Previous/Backspace hidden-target restoration, close/reselect, compatibility stripping and obsolete/latest startup all pass. Twenty real selections keep one focus, zero restoration feedback, engine/canvas identity, no new subscriptions and one exit disposal.
- Precision 0.134356 px/eleven depth probes; LOW textures 33 and compressed mip storage 16,516,088 bytes stable, pending zero. Engine gzip 374,764 bytes against 450,000; assets within unchanged 80 MB; licenses 72. No new physical GPU/CPU evidence. P4.3 configured-origin acceptance retained because origin handling is unchanged.
- Raw result is unchanged; `review.json` binds its SHA256 to reviewed pass. Published [final review](perf/phase-four/p4-4-final-review.md) and adjacent source/result/browser/precision/storage/bundle/review JSONs preserve evidence. Commit only scoped files; leave fourteen unrelated generated diffs untouched. Continue authorized P4.5.
