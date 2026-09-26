# Device evidence review - September 26, 2026

The user reported adding four results; six new files were present (four laptop and two Android), and all six were reviewed. Original downloads remain untouched in `test-results/`. Byte-identical copies retain their original names in this directory. [Machine-readable review and SHA256 hashes](device-review-2026-09-26.json) identify every file.

## Results

| Submitted environment | Recorded backend / tier | Five-view worst p95 | Precision | Depth probes | 10k-point average FPS |
|---|---|---|---|---|---|
| Laptop Chromium-family browser | WebGPU HIGH | 6.2 ms, about 161.3 FPS at p95 | 0.107680 px | 11/11 pass | 164.699 |
| Laptop Chromium-family browser, adapter reports Brave | WebGL2 MEDIUM | 6.2 ms, about 161.3 FPS at p95 | 0.107680 px | 11/11 pass | 164.711 |
| Android Brave (previously identified by user as Samsung S23 Ultra) | WebGL2 LOW, selected by AUTO | 16.8 ms, about 59.5 FPS at p95 | 0.104706 px | 11/11 pass | 60.012 |

All five-view reports have five views, 21 entities and zero pending textures in each view. Each precision run has 600 samples, below the unchanged 0.5 px limit. All 11 depth checks pass, including the new near/far orbit, camera-plane crossing and oblique ray/sphere checks; oblique mismatch arrays are empty. This extends the older three-probe reports with actual-device orbit-depth evidence on both desktop backends and Android WebGL2.

All three point reports contain 10,000 points, 240 measured frames, 30 warmup frames, one incremental point draw and passing partial-upload readback. Desktop results exceed the 60 average FPS point target; Android also exceeds 60 average FPS. Android point p95 is 16.8 ms (59.5 FPS at p95), so do not call it a 60-FPS-at-p95 result. Mobile full-scene acceptance is 30 FPS at p95 and passes comfortably.

The filename of the laptop WebGL2 five-view report says High, but every view records `tier: medium`. It is passing MEDIUM evidence, not a HIGH run. The current QualityManager defaults desktop WebGL2 AUTO to MEDIUM and does not cap explicit HIGH; the report alone does not establish why MEDIUM was used. Android's AUTO run records LOW in all views and satisfies that tier's numerical checks. Neither point-report format records a quality tier; do not assign one from filenames.

GPU model identity remains absent: the WebGPU adapter is blank and the WebGL2 adapters say Brave. All reports set softwareRenderer false, but this flag alone does not identify the GPU. Device identity comes from the user's filenames and conversation, not independent hardware attestation.

## Visual feedback and readiness

The user reports no issues after a visual check and explicitly says **do not start Phase 3**. Record this as positive user visual acceptance for the views they exercised, without inventing a screenshot comparison, detailed route checklist or untested browser coverage. No tested performance, precision, orbit-depth or upload failure was found in these submissions.

The implemented Phase 2 feature set has passing local checks and encouraging current-device evidence. It is suitable for planning Phase 3, but the strict full acceptance checklist is still not closed:

- Exact desktop forced-WebGL2 HIGH and mobile MEDIUM evidence are still missing.
- Android Chrome, desktop Firefox and iPhone Safari coverage remain unverified; macOS Safari is conditional on availability. Android Brave evidence must not be relabeled Chrome.
- Hosted CPU CI execution/calibration and the upstream transient-allocation requirement remain engineering work. This review does not close either item.

No Phase 3 code was started. The user can authorize proceeding later with the named checks carried forward, or retain the strict gate until they are resolved. Do not infer that authorization from this review request.
