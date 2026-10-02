# Phase 3 laptop device report reviewed

October 1, 2026 local / October 2 UTC. User supplied `test-results/phase-three-webgpu-1790908597477.json` after running the new lab check on their laptop. The original remains untouched. A byte-identical copy is [preserved here](device-laptop-webgpu-high.json), with a [per-view review](device-laptop-webgpu-high-review.json).

**All measured checks pass.** Windows Chrome 153 reports WebGPU, HIGH in every view, 1707×904 CSS pixels at DPR 1.5. All 21 body close-ups and the three Saturn ring sides are present, with 240 samples each, no pending textures and visible focused meshes. This records the new Phase 3 appearance/ring workload separately from accepted Phase 2 coverage.

| Metric | Measured | Existing desktop budget |
|---|---:|---:|
| Mean frame rate across views | 161.33–164.71 FPS | ≥60 FPS |
| Worst p95 frame interval | 6.20 ms / 161.29 FPS | ≤16.7 ms |
| Maximum draw calls | 36 | ≤300 |
| Maximum detailed meshes | 3 | ≤12 |
| Maximum compressed asset mip storage | 119,844,112 bytes | HIGH ≤350 MB |
| Rendered precision error, 600 samples | 0.107680 px | <0.5 px |
| Depth probes | 11/11 pass | All pass |

The report's adapter string is blank. The user identifies this as their physical laptop; the browser reports no detected software renderer, but no particular GPU model is asserted. These statistics cover the final up to 240 RAF intervals after warmup/observation, rather than sustained thermal behavior or GPU execution time. Mip storage is not total VRAM. The 854 ms first-frame measurement excludes network navigation and is not a cold broadband startup measurement. The JSON does not embed a git revision; current renderer/lab code is unchanged from validated `749a506`, with later changes limited to documentation.

This accepts the submitted Windows laptop HIGH/WebGPU Phase 3 performance and precision/depth evidence. It does not claim new mobile/forced-WebGL2 hardware results or complete source geographic registration. Existing Phase 2 acceptance is unchanged. No renderer fix or repeat of this passing run is required.

SHA256 of original and preserved copy: `596614cc20b2af3d5ccc5f9621712b746d2e1fe813f8956c57457d7a58f13f90`.
