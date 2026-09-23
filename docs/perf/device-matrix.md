# Device matrix

| Environment | Backend | Evidence | Status |
|---|---|---|---|
| Windows / Playwright Chromium 153 / SwiftShader | Forced WebGL2 | Automated walkthrough and screenshots | Functional emulation only |
| Chromium, 390×844, touch input | Forced WebGL2 | Mobile layout walkthrough | Emulation, not real mobile GPU |
| Mid-range desktop Chrome/Edge GPU | WebGPU | Not measured | Required |
| Mid-range desktop GPU | WebGL2 | Not measured | Required |
| macOS Safari | WebGPU | Not measured | Required |
| iPhone 13 Safari | WebGPU or WebGL2 | Not measured | Required |
| Pixel 7 Chrome | WebGPU or WebGL2 | Not measured | Required |

Use `/lab/probe` to record adapter capabilities and `/lab/poc?perf=1` for the overlay. Add `renderer=webgl` to force the fallback, and `scenario=leo` for the 400 km Earth setup. Record five steady views after warm-up, not cold shader-compilation frames.
