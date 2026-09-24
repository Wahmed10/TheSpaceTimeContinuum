# P1.12 architecture gate - PENDING physical-device acceptance

Updated 2026-09-23. The strict gate remains in effect. Phase 2 must not start until acceptance passes and the user signs off.

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
| Actual WebGPU and backend visual parity | PENDING: adapter unavailable locally |
| Desktop HIGH WebGPU >=60 / WebGL2 >=50 FPS at p95 | PENDING: physical GPU required |
| Physical mobile LOW/MEDIUM >=30 FPS | PENDING |
| Visual signoff | Positive localhost review received; final P1.12 signoff pending |
| Hosted CI | Configured; no hosted run claimed |

Evidence: engine-bundle.json, ephemeris-benchmark.json, precision-webgl.json, texture-stability.json, react-profile.json, device-software.json and ../science/horizons-validation.json. Screenshots: screens/ and ../../e2e/visual-reference/.

The software report is a tooling smoke test, not a physical-performance PASS. Each view warms up for three seconds and runs for ten seconds; statistics use the last 240 frame intervals. FPS at p95 is 1000 / p95Ms; average FPS alone cannot establish the gate. First-frame timing starts at engine construction and ends after first render submission; it excludes navigation and is not a GPU-present timestamp. Memory reports compressed asset mips, excluding render targets and driver overhead.

Earlier science failures were resolved through independently tested residual corrections, not relaxed assertions. SwiftShader's slow FPS does not justify an architecture fallback. Follow [device-matrix.md](device-matrix.md) before deciding whether a fallback is necessary.
