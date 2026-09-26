# User device reports reviewed - September 25, 2026

Original downloads remain in `test-results/`. Byte-identical copies are preserved in this directory because Playwright normally clears its output directory. During this continuation, automated tests use `.tools/playwright-phase-two` instead.

## Phase 1 rerun

[Report](device-user-webgpu-ultra-2026-09-25.json): Windows Chrome 153, WebGPU, **ULTRA**, 21 entities. Five views each report approximately 164.7 average FPS and 6.2 ms p95 (161.3 FPS at p95), with no pending textures. Asset mip storage is 153,092,544 bytes, not total VRAM. Rendered precision: 0.107679693 px versus the unchanged 0.5 px threshold, 600 samples. All three depth checks pass.

The user says the earlier invalid run succeeded on retry. No failed report or exact error was supplied, so its cause is unconfirmed. The runner rejects hidden-tab runs; that remains a possible explanation, not a verified diagnosis. No validity guard was removed.

This is additional passing ULTRA evidence. Do not relabel it HIGH. Exact HIGH, forced WebGL2, physical mobile, backend visual parity and final gate signoff remain pending. Adapter identity is blank; `softwareRenderer: false` means the report did not detect a software-name match, not independent proof of a particular GPU.

SHA256: `D4970B62B38586AAEB6C8B5C7905231EF00E3A742020F000EBE3725E6CDC55FE`

## Phase 2 point-layer run

[Report](device-user-phase-two-points-webgpu.json): WebGPU, 10,000 points, 240 measured frames plus 30 warmup frames, 2560x1356 drawing buffer. Average 164.7107 FPS; p95 6.2 ms (161.3 FPS at p95). One incremental point draw, three total draws including the sphere/output pass. Partial GPU upload readback passes.

The submitted run exceeds the planned >=60 FPS target for this synthetic workload. Keep the short sampling window and absent GPU identity explicit. This does not replace full-scene performance, cross-device validation or visual LOD transition inspection. The earlier SwiftShader ~5 FPS report remains separate evidence.

SHA256: `9DBA7280A6FD4BEF4584A1CB766C0627B3AD1887B138513200A73733F713ED77`

## Samsung S23 Ultra / Brave mobile reports

The user confirmed the LAN page now works on their physical Samsung S23 Ultra in Brave. These reports predate the P2.7 orbit changes; they validate the earlier mobile startup and point-layer build.

[Phase 1 report](device-s23-brave-webgl2-phase-one.json): WebGL2, **ULTRA**, 411x728 CSS pixels at DPR 2. All five views have p95 frame times of 16.7-16.8 ms (at least 59.5 FPS at p95), exceeding the mobile 30 FPS target. All views report zero pending textures. The 600-sample precision result is 0.104706333 px against 0.5 px; all three depth checks pass. This is actual user-supplied mobile evidence, not viewport emulation. It is not a LOW/MEDIUM tier run. Device identity is user-attested: the privacy-reduced UA says Android 10/K, and the adapter field says Brave rather than a GPU model.

SHA256: `1336DFCE05D082A4AE9FC04781E1B5819889A7B73151F126F9A081242BFDB8D1`

[Phase 2 point report](device-s23-brave-webgl2-points.json): 10,000 points, 240 measured and 30 warmup frames, 822x1456 drawing buffer, 60.003 average FPS, 16.7 ms p95. One incremental point draw and three total draws; partial-upload GPU readback passes. The numerical mobile target passes for this short synthetic workload; full-scene sustained performance and new orbit rendering require separate evidence.

SHA256: `F5C604F0051BF96A7B2B2CEEE0AB43C5A96C43F3A6BC3B48CA6C77B347250BB1`

Exact desktop HIGH/forced-WebGL2, requested mobile LOW/MEDIUM tiers, remaining browsers and visual/backend signoff remain pending. Original downloads remain in `test-results/`.
