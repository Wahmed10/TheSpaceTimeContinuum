# Phase 4 accessibility test dependency

`@axe-core/playwright@4.13.0` is pinned exactly as a root development dependency. The lockfile resolves `axe-core@4.13.0` and the existing `playwright-core@1.63.0` peer. Registry metadata and both installed package manifests/LICENSE files were read; both axe packages declare MPL-2.0. No runtime dependency or production-license allowlist entry was added. The production license check remains unchanged.

The integration follows [Playwright's accessibility guide](https://playwright.dev/docs/accessibility-testing). Tests scan complete actual open pages, retain the full raw results including incomplete checks, require zero serious/critical and WCAG A/AA violations, and do not exclude elements or disable rules. Keyboard, focus, composition, viewport and reduced-motion checks supplement the scans. Automated results do not establish complete WCAG conformance or replace inclusive user assessment.

Complete-subtree React measurements use a separate isolated `next build --profile`, as documented in the installed Next CLI guide and [React's Profiler documentation](https://react.dev/reference/react/Profiler). An interaction must produce callbacks before the measured window starts; a disabled production Profiler cannot pass with an empty array. This profiling build adds overhead and is separate from normal production byte and response measurements.
