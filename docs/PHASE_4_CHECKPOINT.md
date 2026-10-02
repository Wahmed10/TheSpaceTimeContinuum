# Phase 4 checkpoint

Updated October 2, 2026.

## Current state

- Phase 3 is accepted. Its renderer, scientific tolerances and accepted Phase 2/3 exceptions remain closed.
- User has requested starting Phase 4 and invited questions along the way.
- User approved [PHASE_4_PLAN.md](PHASE_4_PLAN.md) and instructed implementation to begin. P4.1–P4.9 are authorized in order; do not ask for the plan approval again.
- P4.1 URL/UTC validation and safe legacy startup are implemented. `pnpm.cmd verify` passes: 241 tests plus two expected rejected-model diagnostics; typecheck/lint/package boundaries pass. The new web tests are included in both Vitest discovery and web typechecking.
- Startup/browser verification is the next required review before P4.2. No new browser/build/performance pass is claimed. The existing Phase 3 job is finished/reviewed.

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

Review the P4.1 startup job described below before starting P4.2. Inspect raw browser results, console errors and the new captures; fix failures without weakening validation. Once reviewed green, continue the already approved plan at P4.2 (camera references/MapState). Database/ingestion/server search, deployment and Phase 5 remain excluded.

For any multi-minute job, record its PID/URL, exact command, source revision/diff, result/log locations and next review here, then end the turn. On continuation, inspect that existing job first.
