# P1.12 architecture gate ? OPEN, NOT PASSED

Updated 2026-09-23. User explicitly retained the strict gate. Phase 2 must not start yet.

| Check | Result |
|---|---|
| Original Horizons position thresholds | PASS: all 11 bodies; corrections documented in ADR 0008 |
| Independent off-grid checks | PASS: 24 epochs/body; separate geocentric Moon <20 km and <60 arcsec |
| Clock coverage | PASS: 100% branches (36/36) |
| CPU camera-relative precision | PASS: 600 sampled LEO positions, float32 error <0.5 px |
| Production build / typecheck / lint | PASS |
| Automated browser walkthroughs | PASS: desktop and touch/mobile viewport, forced WebGL2 |
| Texture asset budget / attribution | PASS: 75.89 MB / 80 MB, KTX2 manifest validated |
| Actual WebGPU backend | PENDING: local adapter unavailable |
| Desktop WebGPU >=60 FPS / WebGL2 >=50 FPS | PENDING: no representative physical GPU available |
| Physical mobile >=30 FPS | PENDING: viewport emulation is not hardware evidence |
| Depth / backend image comparisons / visual signoff | PENDING |
| Full specified materials / orientation reference checks | INCOMPLETE: see implementation status |
| Engine gzip <=450 KB | PENDING attribution; largest individual chunk 285,345 gzip bytes, not total engine weight |

Scientific failures from the earlier report were resolved with independently tested Horizons residual tables, not relaxed assertions. Machine-readable measurements: ../science/horizons-validation.json. They establish sampled accuracy, not a bound at every instant.

Screenshots use Playwright Chromium on Windows with SwiftShader. They demonstrate appearance and interaction only. Local unforced GPU probe also returned SwiftShader, with no WebGPU adapter (local-gpu-probe.json). Do not use those FPS values as physical GPU measurements.
