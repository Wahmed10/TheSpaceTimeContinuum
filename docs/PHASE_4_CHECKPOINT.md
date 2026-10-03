# Phase 4 checkpoint

Updated October 2, 2026.

## Current state

- Phase 3 is accepted. Its renderer, scientific tolerances and accepted Phase 2/3 exceptions remain closed.
- User has requested starting Phase 4 and invited questions along the way.
- User approved [PHASE_4_PLAN.md](PHASE_4_PLAN.md) and instructed implementation to begin. P4.1–P4.9 are authorized in order; do not ask for the plan approval again.
- P4.1 URL/UTC validation and safe legacy startup are implemented. `pnpm.cmd verify` passes: 241 tests plus two expected rejected-model diagnostics; typecheck/lint/package boundaries pass. The new web tests are included in both Vitest discovery and web typechecking.
- P4.1 browser startup verification is reviewed and passes all five cases, with no skips/flakes/report errors. Both new captures were inspected. No new production build or performance pass is claimed. P4.2 is the next step.

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

P4.2 is reviewed accepted; no repeat validation is pending. Commit its explicitly scoped runtime/evidence files, then continue the approved P4.3 object routes/metadata/persistent shell. P4.1 is accepted. Database/ingestion/server search, deployment and Phase 5 remain excluded.

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
- Dedicated [final review](perf/phase-four/p4-2-final-review.md) and adjacent source/result/browser/CPU/precision/bundle/texture artifacts are published under `docs/perf/phase-four/`. Runtime acceptance commit is next, with explicit staging that excludes all fourteen earlier generated diffs. P4.3 is already authorized and next.
