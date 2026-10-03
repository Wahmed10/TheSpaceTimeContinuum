# P4.5 second retry: one desktop selection still exceeds response gate

October 3, 2026. Base `7199ddb`; source SHA256 `837af947bf441ca3b29e2a8c126828b012fc68c94c6b99c83a5e9d55573a9ec0`. Run `.tools/phase-four/p4-5/retry-2/` finished `2026-10-03T16:03:19.542Z`. All 295 root/candidate source files and fourteen preserved generated-evidence hashes independently match. Adjacent hashed source/validation/browser/review/response records preserve this failed result.

**43 passed / one failed / zero skips, flakes or report errors.** All 42 functional cases pass, including search rendering ownership, continuing simulation time, Escape/canonical-selection release and stable engine identity. The complete phone latency case passes. Production build/budgets/licenses/server/source checks pass; the engine gzip is 374840 / 450000 bytes and assets remain 79961515 / 80000000 bytes, with 72 checked production dependencies.

| Profile | Maximum input response | Maximum selection response |
| --- | ---: | ---: |
| Desktop | 144.1 ms | 742.3 ms (failed) |
| Phone | 90.0 ms | 283.1 ms |

Each profile has 27 input samples and six selections. Desktop Charon is the only selection above 300 ms: semantic commitment 71.9 ms followed by a 670.4 ms frame wait. All samples and long tasks remain preserved. Input improvements support the rendering-contention diagnosis, but the remaining failure forbids acceptance. The hold/clock/release browser regression passes.

Desktop active-option and phone short-viewport captures were inspected. The input focus outline, bounded list and reachable dismissal/selection controls fit their viewports; the phone Charon result remains readable at 390×430. Exact keyboard active-state/Enter selection and focus return are asserted. Original material references, GPU precision (0.134356 px, eleven depth scenarios) and LOW compressed texture storage (33 resident textures / 16516088 mip bytes after twenty focus changes) pass their existing functional thresholds. This is SwiftShader evidence, not physical GPU throughput or total VRAM.

Focused diagnostics use the immutable built candidate and runtime logging wrappers to record hold/release, actual frame entry, coherent route/card/target and the next UI frame. These diagnostic runs do not establish acceptance. Investigate the exact benchmark sequence and preserve its timeline before changing scheduling or composition. Keep the 300 ms maximum and all existing response samples. P4.5 remains unaccepted; P4.6 awaits a passing isolated review.
