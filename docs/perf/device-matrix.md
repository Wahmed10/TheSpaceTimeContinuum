# Phase 1 device matrix

| Environment | Backend / tier | Status |
|---|---|---|
| Windows Chromium / SwiftShader | WebGL2 LOW/MEDIUM | Local functional, precision/depth and screenshot evidence only |
| Chromium touch viewport | WebGL2 LOW | Emulated layout/input only |
| Mid-range desktop Chrome/Edge GPU | WebGPU HIGH | Required, pending |
| User's Windows Chrome 153 desktop | WebGPU LOW / ULTRA | Both reports received; ~161.3 FPS at p95, precision/depth pass; GPU model absent |
| Same desktop GPU | Forced WebGL2 HIGH | Required, pending |
| Desktop Firefox | WebGL2 | Required, pending |
| macOS Safari 26, if available | Available backend | Pending |
| iPhone Safari 26 | LOW/MEDIUM | Required, pending |
| Android Chrome | LOW/MEDIUM | Required, pending |

## Run and preserve evidence

1. Start pnpm dev; open /lab/probe. Record physical device, browser, adapter and backend. Software adapters do not satisfy hardware performance acceptance.
2. Open /lab/poc?perf=1. Record the AUTO-selected tier, then select HIGH in desktop Settings or LOW/MEDIUM on mobile.
3. Click **Run Phase 1 device checks**. Keep the tab visible without interacting for 1-4 minutes. Downloaded JSON contains five views, median/p95 frame times, asset mip storage/count, viewport/DPR, first-frame latency and 600-sample precision plus depth checks.
4. Repeat on the same desktop at /lab/poc?perf=1&renderer=webgl, HIGH. Preserve both JSON reports here with device/backend names.
5. Capture the five views and compare Earth day/night/limb, Moon terrain and Sun bloom across backends. Exercise LIVE, past/future, 1 day/s, reverse, focus and touch; note stutter/artifacts. Measure cold page load separately; JSON timing excludes navigation.
6. Every desktop WebGPU view needs 1000 / p95Ms >=60; forced WebGL2 needs >=50. Mobile needs >=30 FPS. Precision must be <0.5 px and all depth checks must pass. Record failures and follow the plan's fallback tree before signoff.

A phone cannot use the PC's localhost. Serve the same build on a reachable host; WebGPU requires a secure context (HTTPS except loopback). Never relabel viewport emulation as real mobile evidence.

The user supplied LOW and ULTRA reports (the latter was expected to be HIGH). Preserved copies and measured results are linked in gate-report.md. Phase 2 requires the user's explicit approval and has not been authorized.

node tools/run-device-checks.mjs --software reproduces the local download smoke test against a running dev server. Without --software it requests HIGH on the available adapter; inspect softwareRenderer and /lab/probe before counting it as hardware evidence.
