# 0008 — Horizons residuals preserve the accuracy gate

The plan's uncorrected astronomy-engine 2.1.19 states failed 10 of 11 five-epoch reference tests, principally in radial error. A renderer change cannot repair a scientific ephemeris error.

The engine now loads local, server-generated weekly Horizons-minus-astronomy-engine state tables covering 1900–2100 with guard samples. Cubic Hermite interpolation adds the residual positions and their derivatives to the analytic state. Each binary is about 252 KB; the four-body preview loads about 1 MB of data, separate from the JavaScript engine chunk. Browser requests stay on this application's origin. Original Horizons queries and API versions are retained beside the tables.

The correction grid is independent of test epochs. The original 30 arcsecond / 1e-5 relative-radius assertions remain unchanged. An additional 24 off-grid epochs per body span the complete supported timeline; a separate lunar test subtracts independently fetched barycentric Earth and Moon reference states and checks 20 km / 60 arcsecond limits.

This is a hybrid calculated ephemeris, not telemetry and not a navigation-grade DE kernel. The provider can still operate analytically without registered tables, but the application requires the tables before initializing its scene. Rebuilding requires the exact pinned astronomy-engine version. Upgrades must regenerate corrections and rerun hold-outs. No extrapolation outside table validity is allowed.

Reproduce with `pnpm exec tsx tools/fixtures/build-corrections.ts`, `pnpm exec tsx tools/fixtures/fetch-horizons.ts --holdout`, and `pnpm verify`. Do not treat these sampled tests as a proof of a maximum error at every instant.
