# Phase 4 final UX walkthrough

**Completed and accepted October 5, 2026.** The user reports working links/refresh, keyboard search, mobile feature access and settings, and deliberately defers opinion-based design refinements. The orbit startup delay and reduced-motion behavior were checked in the implementation and explained. Neptune's open arc is consistent with the validated date limit; its presentation is recorded in [future enhancements](ENHANCEMENTS.md). No blocking UX defect was reported. [Final acceptance](perf/phase-four/p4-9-final-acceptance.md) records the reviewed source, measurements and limitations.

Reduced motion changes transitions rather than a stationary planet view: camera selection uses a brief 300ms fade instead of a sweeping flight, interface transitions/animations are suppressed, and Return to LIVE skips its animated transition. Simulation playback and planetary rotation still work. To compare the setting, select a different planet with it Off, then repeat with it On. System follows the operating-system preference.

All automated gates are reviewed passed at snapshot `95e97a1ee10e912119162931eb0878b39a4537e9b75c9c1e6de7667912565e86`, based on HEAD `035fc967ed9ba88550773ea8f757fd5ff905d23c` plus the approved uncommitted Phase4 changes. [Reviewed evidence](perf/phase-four/p4-9-progressive-integration-5-review.md) records 480 passing unit/science checks plus two expected diagnostics, 108 browser checks, four performance cases, three profiles and all three CPU pairs. No validation job remains running.

The [approved plan](PHASE_4_PLAN.md#5-phase-exit-matrix) required this final review of the changed user experience before Phase4 was marked complete. The steps below are retained for reproduction. Previously accepted science, appearance/source limitations and device coverage remain accepted.

Use the existing app at [localhost:3000](http://localhost:3000/). Refresh a previously open tab so it loads the current code. This is the development server; measured performance comes from the isolated production test run.

1. Open the [paused Earth link](http://localhost:3000/object/planet/earth?t=2026-09-22T00%3A00%3A00Z), then refresh. Earth should remain selected, its card should show physical measurements/provenance, and the timeline should remain paused at the linked UTC date. Select Mars through search, then use browser Back and Forward; selection and controls should agree with the restored URL.
2. Use keyboard search: open search, type a body, move through results with arrow keys and select with Enter. Escape should close the dialog and restore focus. Open the time picker, choose a distant UTC date, then try pause/play, reverse and Return to LIVE. The map should continue rendering during data arrival; an approximate/loading indicator may appear briefly for the affected object. Copy a share link and open it in another tab to check restoration.
3. At a narrow/mobile width, open search and a body card. Check that the search field and results, card Peek/Half/Full states, timeline, layers and close buttons remain reachable without horizontal scrolling. If convenient, repeat with the phone keyboard visible; desktop viewport checks do not replace that experience.
4. In Settings, change distance units and reduced motion, then refresh. The chosen settings should persist, the card should use the chosen units, and focus motion should respect the reduced-motion setting. Open Objects in view and select one of its entries.

The user's completed walkthrough satisfies this review; no special confirmation phrase or repeat is required. Report any later problem with the action, viewport/device and what happened. No additional automated run is planned unless a new defect or source change requires one.

To read the recorded validation status without starting tests:

```powershell
node tools/phase-four-status.mjs
```

Raw run output: `.tools/phase-four/p4-9/progressive-integration-5/`. Phase4 is accepted; Phase4B/5 and deployment remain outside this task.
