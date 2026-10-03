# P4.5 first retry: functional checks pass, response gate fails

October 3, 2026. Base `7199ddb`; source SHA256 `4e47b79c40197ca2f8182cd3ee9af5af6bca1e94d9394fc58a5d38fa339ea214`. Run `.tools/phase-four/p4-5/retry-1/` finished `2026-10-03T15:34:17.760Z`. Source/root/candidate and all fourteen preserved generated-evidence hashes matched independently before the next corrections. The original candidate remains unchanged. Adjacent hashed source/validation/browser/review and response JSONs preserve this failed result.

All **41 functional browser cases pass**, including corrected LAN hydration/search, active-option history/focus, all body names/aliases/IDs, routes/lifetime, IME/touch, history/sharing, science/material/precision/storage regressions. No skips, flakes or report errors. Both timing cases fail. Production build/budgets/licenses, clean server logs, final source integrity and warm 1000-sample lookup pass.

Disabling trace/video/screenshot recording alone did not meet the unchanged 300 ms target:

| Profile | Maximum input response | Maximum selection response | Maximum input DOM commit | Maximum selection semantic commit |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 345.0 ms | 767.0 ms | 4.2 ms | 92.9 ms |
| Phone | 253.2 ms | 759.5 ms | 2.1 ms | 153.1 ms |

Desktop has 26 input samples, phone 24; both have six selections. Subsequent frame waits reach 703.6 ms. Long tasks are recorded, including 1393 ms on desktop and 507 ms on phone. These measurements establish delay after the UI commits; they do not prove a JavaScript stack attribution. Background rendering contention is the working diagnosis for the next correction. Neither DOM-only latency nor passing phone input permits acceptance.

The production correction adds a cold public rendering-suspension lease. Search holds the resident scene's last frame while its modal owns interaction, with clock wall-time and focus/history commands continuing. The bridge waits for the accepted canonical route/card and a paint boundary before releasing. Nested releases, hidden-tab restoration, disposal, reopened dialogs and captured stale callbacks are guarded and tested. Two one-shot paint callbacks do not introduce a React frame subscription. The engine frame callback, physics/providers/allocations/assets are untouched, so the accepted P4.2 paired CPU evidence remains separate.

The next run adds a browser regression proving no new submissions during search, continued simulation time, and resumption after Escape and canonical selection with the same engine. The benchmark invokes normal production search; it does not suspend rendering through a test-only call. All existing response samples still use the same next-UI-frame measurement and maximum 300 ms gate. P4.5 remains pending isolated production validation and review. Preserve both failed runs.
