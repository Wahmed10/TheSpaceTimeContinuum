# P1.12 architecture gate - PENDING physical-device acceptance

Updated 2026-09-23. The strict gate remains in effect. The user explicitly instructed that Phase 2 must not start without their approval, even after acceptance checks pass.

| Check | Local result |
|---|---|
| Original Horizons thresholds | PASS: all 11 bodies, unchanged tolerances; ADR 0008 |
| Independent off-grid science | PASS: 24 epochs/body; geocentric Moon <20 km and <60 arcsec |
| Time / clock coverage | PASS: sampled round trips <1 microsecond; 100% branches (36/36) |
| Four-body CPU computation | PASS: 0.116 ms/frame / 0.2 ms, 10,000 frames |
| Earth / Mars orientation | PASS: Greenwich noon; NAIF Mars fixtures <0.01 degree |
| Rendered precision | PASS on SwiftShader WebGL2: 600 samples, max 0.1344 px / 0.5 px |
| Opaque depth ordering | PASS on SwiftShader: 10 km cloud shell near/far; Moon behind Earth |
| Texture assets / attribution | PASS: 77.17 MB / 80 MB; manifest and credits validated |
| LOW compressed mip storage | PASS: 8,039,512 bytes / 128 MiB; 15 textures, stable over 20 focus changes |
| Complete engine gzip | PASS: 443,741 bytes / 450,000 bytes |
| Material regression | Eight deterministic WebGL2 references including day/night/limb/full Moon and bloom |
| Typecheck / lint / unit tests | PASS: 46 tests |
| Production build | PASS: all six application routes generated |
| Browser acceptance suite | PASS: 6 tests, including 8 screenshot comparisons |
| React playback profile | PASS: 82 commits / 30.031 seconds = 2.73 Hz, below 4 Hz |
| Runtime licensing | PASS: 72 production dependencies |
| Actual WebGPU | User reports received: LOW and ULTRA, all five views; adapter identity absent |
| Desktop WebGPU >=60 FPS at p95 | PASS in submitted LOW/ULTRA runs: about 161.3 FPS in every view; exact HIGH run not supplied |
| Desktop HIGH forced WebGL2 >=50 FPS at p95 / backend visual parity | PENDING |
| Physical mobile LOW/MEDIUM >=30 FPS | PENDING |
| Visual signoff | Positive localhost review received; final P1.12 signoff pending |
| Hosted CI | Configured; no hosted run claimed |

Evidence: engine-bundle.json, ephemeris-benchmark.json, precision-webgl.json, texture-stability.json, react-profile.json, device-software.json and ../science/horizons-validation.json. Screenshots: screens/ and ../../e2e/visual-reference/.

The software report is a tooling smoke test, not a physical-performance PASS. Each view warms up for three seconds and runs for ten seconds; statistics use the last 240 frame intervals. FPS at p95 is 1000 / p95Ms; average FPS alone cannot establish the gate. First-frame timing starts at engine construction and ends after first render submission; it excludes navigation and is not a GPU-present timestamp. Memory reports compressed asset mips, excluding render targets and driver overhead.

Earlier science failures were resolved through independently tested residual corrections, not relaxed assertions. SwiftShader's slow FPS does not justify an architecture fallback. Follow [device-matrix.md](device-matrix.md) before deciding whether a fallback is necessary.

## User-supplied WebGPU runs

Original downloads are preserved byte-for-byte as [LOW](device-user-webgpu-low.json) and [ULTRA](device-user-webgpu-ultra.json), copied out of the ignored test-results directory. Both were supplied by the user from Windows Chrome 153 on September 23 (timestamps September 24 UTC). The second run records ULTRA in all five views, despite the user's expectation of HIGH; it must not be relabeled HIGH.

| Report | Viewport / DPR | Average FPS, all views | p95 frame time, all views | Asset mip storage | Precision |
|---|---|---|---|---|---|
| LOW | 1707 x 904 / 1 | approximately 165 | 6.2 ms (~161.3 FPS) | 8,389,056 bytes (8 MiB) | 0.10768 px, 600 samples |
| ULTRA | 1707 x 904 / 1.5 | approximately 165 | 6.2 ms (~161.3 FPS) | 153,092,544 bytes (146 MiB) | 0.10768 px, 600 samples |

Both report WebGPU, zero pending textures in every view and all three depth checks passing. Their softwareRenderer flag is false, but adapter is empty; GPU model is not established by these files. Both carry the same 484 ms first-frame value, so these are not two independent cold-load measurements. ULTRA provides encouraging evidence above the 60 FPS target, but does not fill the exact HIGH, forced-WebGL2, mobile or visual-parity rows. Phase 2 remains explicitly unapproved.

## September 25 continuation evidence

The user authorized Phase 2 previously. A new WebGPU ULTRA rerun passes all five view thresholds, rendered precision and depth checks; the Phase 2 10k-point run also exceeds 60 FPS and passes partial-upload readback. See [dated review](device-review-2026-09-25.md) for reports, hashes and limitations. Adapter names are blank. Exact HIGH/forced WebGL2/mobile and visual signoff requirements remain pending; the historical table above is not relabeled or silently passed.

## Physical Samsung mobile evidence

User-supplied Samsung S23 Ultra / Brave WebGL2 reports pass their measured checks: Phase 1 ULTRA p95 16.7-16.8 ms, precision 0.104706333 px and all three depth probes; Phase 2 10,000 points at 60.003 average FPS with one point draw and passing partial-upload readback. See [device review](device-review-2026-09-25.md) for preserved JSON and hashes. This confirms the user could load and test the application on their phone after the LAN fix. These reports predate P2.7; no new-orbit device pass is implied. LOW/MEDIUM mobile tier runs and remaining browser/backend requirements remain pending.
