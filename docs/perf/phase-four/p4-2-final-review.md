# P4.2 reviewed validation — October 3, 2026

**Reviewed pass.** Candidate source snapshot `34f3b9e45ae924c3be93e1152c8fee8b03d9f9f5e34dcd2016ce73676313e3c3`, based on `508646c`. Runtime was uncommitted during validation; the source manifest and matching root/isolated hashes establish exactly what was tested. The [first failure](p4-2-first-review.md) remains preserved. Raw final/source/browser/review records and performance reports are adjacent `p4-2-*` files. Full local logs/captures remain in `.tools/phase-four/p4-2/retry-1/`.

- Verify: 255 tests plus two existing expected rejections, 36 files; typechecking, lint and package boundaries pass.
- Isolated production build and catalog pass. Engine gzip: 374,760 / 450,000 bytes. Assets: 79,961,515 / 80,000,000 bytes. All 72 production dependency licenses pass. No dependency/provider/asset/science-tolerance change.
- Browser: 14 passed, zero skips/failures/flakes/report errors. All six frame/MapState cases and corrected malformed-query LIVE startup pass. All eight original material screenshot references pass unchanged. Offset-date and layer-off selection behavior pass.
- Precision: 0.134356 px maximum / 0.5 px over 600 samples; all eleven depth probes pass. LOW retains 33 textures and 16,516,088 bytes of compressed mip storage over twenty focus changes. This is not total VRAM.
- Fixed-frame captures inspected: focus remains centered; elapsed time changes lighting/starfield/orbit projection, and reversed time restores the pose. Captures are functional renderer evidence; existing shell/card improvements remain scheduled for later steps.
- Fresh sequential Phase 2 reference `4409ef5` and candidate CPU reports match schema 2, Windows x64, Ryzen 7 8845HS, Chromium 153, WebGL2/SwiftShader, LOW, 1440×1000/DPR1, 21 bodies, date/rate, warmup/sample counts and scheduled clock/UI counts. All five paths pass the unchanged 20% mean/p95 threshold. Maximum mean increase: 3.41%; maximum p95 increase: 4.35%. CPU timings include render submission, not GPU execution or physical-device FPS.
- Root/isolated/reference source and all fourteen pre-existing generated evidence hashes match. Stage/wrapper stderr is empty except the unchanged license checker's Node DEP0190 shell-argument notice. Server logs include existing Three TSL deprecation notices. The wrapper stops only its own ports 3001/3002; port 3000 remains available.

P4.2 may be committed and P4.3 may proceed under the existing approved Phase 4 plan. No Phase 4B, new device gate, push or deployment is part of this review.
