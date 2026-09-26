# Phase 1 device matrix

**Latest user decision:** the user accepts completed device coverage as sufficient. Additional tier/browser runs are waived as phase-transition prerequisites. Pending rows below remain untested, not passed; do not request those runs to unblock Phase 3. This does not waive the separate allocation requirement or authorize Phase 3 implementation.

| Environment | Backend / tier | Status |
|---|---|---|
| Windows Chromium / SwiftShader | WebGL2 LOW/MEDIUM | Local functional, precision/depth and screenshot evidence only |
| Chromium touch viewport | WebGL2 LOW | Emulated layout/input only |
| User laptop Chromium-family browser | WebGPU HIGH | September 26: five-view performance, precision and all 11 depth checks pass; GPU model absent |
| User's Windows Chrome 153 desktop | WebGPU LOW / ULTRA | Both reports received; ~161.3 FPS at p95, precision/depth pass; GPU model absent |
| Same desktop GPU | Forced WebGL2 HIGH | Required, pending |
| User laptop Chromium-family browser | WebGL2 MEDIUM | September 26: five-view performance, precision and all 11 depth checks pass; filename says High but recorded tier is MEDIUM |
| Samsung S23 Ultra / Android Brave, user-attested | WebGL2 LOW (AUTO) | September 26: five-view performance, precision and all 11 depth checks pass; MEDIUM remains pending |
| Desktop Firefox | WebGL2 | Required, pending |
| macOS Safari 26, if available | Available backend | Pending |
| iPhone Safari 26 | LOW/MEDIUM | Required, pending |
| Android Chrome | LOW/MEDIUM | Required, pending |

## Run and preserve evidence

Latest review: [September 26 reports](device-review-2026-09-26.md). Six new reports pass their measured checks; desktop points pass on both backends and Android points pass. User reports no visual issues. Full acceptance still has the tier/browser and engineering gaps listed in that review. Later updates supersede the historical pending statements below only for the exact tested environments.

1. Start pnpm dev; open /lab/probe. Record physical device, browser, adapter and backend. Software adapters do not satisfy hardware performance acceptance.
2. Open /lab/poc?perf=1. Record the AUTO-selected tier, then select HIGH in desktop Settings or LOW/MEDIUM on mobile.
3. Click **Run Phase 1 device checks**. Keep the tab visible without interacting for 1-4 minutes. Downloaded JSON contains five views, median/p95 frame times, asset mip storage/count, viewport/DPR, first-frame latency and 600-sample precision plus depth checks.
4. Repeat on the same desktop at /lab/poc?perf=1&renderer=webgl, HIGH. Preserve both JSON reports here with device/backend names.
5. Capture the five views and compare Earth day/night/limb, Moon terrain and Sun bloom across backends. Exercise LIVE, past/future, 1 day/s, reverse, focus and touch; note stutter/artifacts. Measure cold page load separately; JSON timing excludes navigation.
6. Every desktop WebGPU view needs 1000 / p95Ms >=60; forced WebGL2 needs >=50. Mobile needs >=30 FPS. Precision must be <0.5 px and all depth checks must pass. Record failures and follow the plan's fallback tree before signoff.

A phone cannot use the PC's localhost. Serve the same build on a reachable host; WebGPU requires a secure context (HTTPS except loopback). Never relabel viewport emulation as real mobile evidence.

The user supplied LOW and ULTRA reports (the latter was expected to be HIGH). Preserved copies and measured results are linked in gate-report.md. The user subsequently authorized Phase 2; missing physical-device evidence remains pending.

## Phase 2 point-layer evidence

At `/lab/poc`, **Run Phase 2 point checks** downloads a separate report for 10,000 Earth-local points with 64 partial record updates per frame. It records GPU readback verification, incremental point draw count, backend/adapter/software status and frame timing. The local `phase-two-points-webgl.json` is SwiftShader functional evidence (about 5 FPS), not a passed desktop performance gate. Physical desktop >=60 FPS and WebGPU visual/transition inspection remain pending. Preserve reports under distinct device/backend names.

node tools/run-device-checks.mjs --software reproduces the local download smoke test against a running dev server. Without --software it requests HIGH on the available adapter; inspect softwareRenderer and /lab/probe before counting it as hardware evidence.

## September 25 user reruns

New WebGPU ULTRA and Phase 2 point reports are preserved and reviewed in [device-review-2026-09-25.md](device-review-2026-09-25.md). The point workload records 164.7 FPS average and 6.2 ms p95, one point draw, and passing GPU upload readback. The submitted point run exceeds the numerical target; GPU identity is unavailable and visual/device matrix requirements remain explicit. The Phase 1 rerun is valid ULTRA evidence, not HIGH evidence.

## Physical Samsung mobile evidence

User-supplied Samsung S23 Ultra / Brave WebGL2 reports pass their measured checks: Phase 1 ULTRA p95 16.7-16.8 ms, precision 0.104706333 px and all three depth probes; Phase 2 10,000 points at 60.003 average FPS with one point draw and passing partial-upload readback. See [device review](device-review-2026-09-25.md) for preserved JSON and hashes. This confirms the user could load and test the application on their phone after the LAN fix. These reports predate P2.7; no new-orbit device pass is implied. LOW/MEDIUM mobile tier runs and remaining browser/backend requirements remain pending.
