# Phase 3 surface and atmosphere increment

September 27, 2026. This P3.3 increment covers Venus, Titan, Pluto and Charon. Ceres, Phobos, Deimos, the Galilean moons and Triton remain pending, as do the missing body orientations in P3.4.

## New Horizons maps

Sources: [NASA Pluto global color mosaic](https://science.nasa.gov/resource/pluto-global-color-map/) and the unannotated grayscale basemap linked by [JPL Charon's Surface in Detail](https://www.jpl.nasa.gov/images/pia21860-charons-surface-in-detail/). The color-coded elevation overlay is deliberately not used as Charon albedo. Credit: NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute. See the [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/); no endorsement implied.

`docs/licensing/new-horizons-assets.json` records acquisition URLs, original dimensions, SHA-256 hashes and modifications. Originals are retained in ignored `assets/source/`. `pnpm.cmd exec tsx tools/assets/build-new-horizons.ts` reproducibly generates 1024/2048-wide ETC1S KTX2 mipmapped derivatives. It stages files outside the public tree and checks the unchanged 80 MB package budget before publishing. Original four-hero textures are unchanged. New derivatives total 680,604 bytes, with the full texture package at 77,863,043 bytes.

Both mosaics cover the full cylindrical map grid but have varying resolution and missing southern imagery. The builder fills only black pixels connected vertically to the south edge with uniform neutral gray; dark interior markings are retained. Gray is a display placeholder, not measured albedo. A half-width shift converts source center 180 E to the engine's center-zero texture convention. Charon's original 12693x6347 dimensions include one-pixel rounding, normalized to exactly 2:1. Existing Pluto orientation is retained; Charon's scientifically validated orientation remains P3.4 work and must not be claimed complete from an attractive texture.

## Opaque atmospheres

Venus retains the existing Solar System Scope cloud texture, with softened illustrative visible-light color/contrast and an atmosphere rim. It does not expose a radar terrain map. Titan uses an opaque orange haze material with subtle procedural broad variation and a rim. These are display illustrations, not current weather or measured optical-depth profiles. The core opaque appearance remains on LOW; the extra rim follows existing high-detail/quality visibility rules. Shell thickness is a display parameter, not an atmospheric altitude measurement.

NASA references: [Venus cloud-top reflected light](https://www.nasa.gov/general/parker-solar-probe-captures-its-first-images-of-venus-surface-in-visible-light-confirmed/) and [Titan haze obscuring visible surface detail](https://science.nasa.gov/resource/purple-haze/). No surface displacement is inferred from photographic brightness.

## Verification

Asset checks include dimensions aligned to compression blocks, manifest sizes, source credits and the unchanged distribution budget. `e2e/body-detail.spec.ts` captures day/quarter views for all four bodies at LOW and HIGH, catches resource/shader errors and saves diagnostics. Captures require human/model visual review; no unreviewed golden references are created. Existing hero-reference and startup regressions are run alongside this increment.
