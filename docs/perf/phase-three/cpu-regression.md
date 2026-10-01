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

## Optimized trial: still fails Earth LEO

Candidate `f57b42d41ba5df389f784ecf7ed51a774e05c0d0` passed all five selected browser tests (orientation integration, original references, precision and registration). Its fresh paired CPU capture still fails Earth LEO: mean ratio 1.1082, p95 ratio 1.2105 (reference 1.9 ms, candidate 2.3 ms). All other paths pass. Matching environment/configuration is retained in `cpu-reference-optimized-trial.json`, `cpu-current-optimized-trial-failed.json` and `cpu-optimized-trial-failed-comparison.json`.

The derivative optimization preserves correctness and removes verified redundant calls, but has not passed the complete performance gate. Do not describe the failure as a different browser error or accept it based on closeness to the threshold.

Next investigation collects separate Chrome CPU profiles of the Phase 2 reference and unchanged optimized candidate using `tools/profile-cpu-paths.mjs`. It samples the existing five paths at 100 microseconds and records function self/inclusive time plus per-path markers. Profiles and diagnostic timings remain under `.tools/cpu-phase-three/profiling/`. Profiler overhead means those durations cannot replace raw regression captures, change baselines or establish a gate pass. Review Earth LEO source-function attribution before selecting the next fix; no additional speculative runtime change is included in this investigation step.

## Profiles reviewed; visual updates follow mesh visibility

Both diagnostic captures completed successfully. Filtered Earth LEO samples beneath `SpaceEngine.frame` show 70.8 ms of physical-origin work in the candidate versus 71.7 ms in the reference over 150 warmup/measured frames. Candidate `pckOrientation` alone accounts for 6.385 ms of sampled self time; its visual-attitude path is identifiable separately. Frame own work and orbit update samples also increased. These noisy sampled totals include warmup, shader compilation and profiler overhead; they do not uniquely explain the p95 failure. Attribution is retained in `cpu-profile-attribution.json`; complete raw profiles remain under the ignored job directory.

Source inspection confirms that the surface attitude, cloud/material uniforms and mesh-detail updates ran for all 21 bodies, including bodies represented solely by points or disabled layers. Their point rendering consumes position, size and color, not mesh orientation. This is an avoidable portion of the profiled work.

The renderer now selects LOD/layer visibility first and updates surface state only for visible mesh groups. Every entity's scientific position, display position, size, point buffers, labels and orbits still update. On a transition to a visible mesh, its current absolute-time attitude/material/detail state is refreshed synchronously before rendering, so no accumulated spin or stale-frame catch-up is required. Scientific FIXED frames remain callable at every supported epoch.

The orientation browser test now checks actual visible meshes for all ten added bodies against the independent fixture epoch, then checks six-hour advancement. It also verifies hidden mesh attitudes are not refreshed merely because time advances. Original references, rings, body-detail/quality transitions and moon-system views must pass alongside a fresh unprofiled same-machine CPU comparison before this change is accepted. The two earlier failures remain preserved.
