# Phase 3 CPU regression investigation

October 1, 2026. Initial sequential local comparison of accepted Phase 2 `4409ef5d8f97299d9058360c97d560493d067c1c` against Phase 3 `1868950e6867b75a1ec533f163fa8cdd4eaea804` failed the unchanged 20% mean/p95 gate on Earth LEO. Both captures used Windows x64, Ryzen 7 8845HS, Chromium 153.0.8010.12, Node 24.12.0, SwiftShader WebGL2 LOW, True scale, 21 entities, five paths, 30 warmup/120 measured frames, fixed 60 Hz scheduling and eight clock/UI events per path.

| Path | Mean ratio | p95 ratio | Result |
|---|---:|---:|---|
| Solar orbit | 0.9872 | 1.1364 | Pass |
| Earth LEO | 1.1879 | 1.2222 | Fail |
| Moon orbit | 1.0695 | 1.1765 | Pass |
| Mars orbit | 1.0581 | 0.9048 | Pass |
| Earth–Moon zoom | 1.0897 | 1.1765 | Pass |

Earth LEO p95 increased from 1.8 ms to 2.2 ms. Raw reference, failed candidate and comparison are preserved in this directory as `cpu-reference-initial.json`, `cpu-current-initial-failed.json`, `cpu-initial-failed-comparison.json`. Original job logs/provenance remain in `.tools/cpu-phase-three/`. Do not relabel this failure, raise thresholds or overwrite its reference.

## Implementation fix, awaiting measured verification

`FrameTree.resolveTextureOrientation` previously resolved the full state of every FIXED frame. Besides the required attitude sample, that evaluated attitudes at ±0.5 seconds and composed derivative matrices even when the renderer requested only a quaternion. Adding ten body attitudes increased this work.

Zero-origin render frames now cache the central attitude separately. Their parent resolves through the normal state path, preserving ephemeris coverage checks. A later origin/state transform at the same epoch calculates the complete derivative and rotating-frame transport velocity, reusing the central attitude sample. Frames with their own origin continue through the full resolver. Epoch or explicit stamp changes invalidate both caches. All buffers remain caller-owned/reused; no per-call objects were introduced.

The call-count test verifies one rotation evaluation for repeated renderer requests and two additional evaluations when transport velocity is subsequently requested. Numerical tests retain scientific tolerances and independently checked SPICE matrices. This identifies and removes redundant work; it does not by itself prove that it accounts for every part of the measured regression. The optimized browser checks and a fresh paired CPU comparison must pass before performance acceptance.
