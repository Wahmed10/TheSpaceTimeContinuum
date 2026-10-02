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

Continue the already approved P4.2 (camera references/MapState); P4.1 unit and startup checks are reviewed green. Database/ingestion/server search, deployment and Phase 5 remain excluded.

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
