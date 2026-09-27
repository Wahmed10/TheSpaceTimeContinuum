# Phase 3 surface and atmosphere increment

September 27, 2026. P3.3 covers Venus, Titan, Pluto, Charon and now the four Galilean moons. Ceres, Phobos, Deimos and Triton remain pending, as do the missing body orientations in P3.4.

## Galilean visualization maps

### Current color maps for Europa, Ganymede and Callisto

The user requested colored variants instead of the initial grayscale mosaics. All three now use embedded base-color images from NASA VTAD's published [Europa](https://science.nasa.gov/resource/europa-3d-model/), [Ganymede](https://science.nasa.gov/resource/ganymede-3d-model/) and [Callisto](https://science.nasa.gov/resource/callisto-3d-model/) glTF models. The [NASA 3D collection](https://science.nasa.gov/3d-resources/) permits reuse under [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Credits: NASA Visualization Technology Applications and Development (VTAD).

The builder follows the model material's `baseColorTexture` reference to extract the embedded PNG, validates container layout and image dimensions, and records both GLB and image SHA-256 hashes. Source images are 4096x2048 (Europa) and 2048x1024 (Ganymede/Callisto). Distribution retains 1024/1440 tiers to preserve the 80 MB budget. Color and pixel order are retained; no tint, saturation boost or generated terrain is added. The globe uses the existing cylindrical texture mapping; landmark/rotation validation is still P3.4. These are NASA visualization assets, not a claim of calibrated true-color albedo. The old grayscale source descriptions below are historical.

Io's corrected run passed asset checks, verify, five browser tests and production build. The user accepts its remaining soft/smudged areas for now; the limitation is recorded in `docs/ENHANCEMENTS.md`.

### Io source correction after user review

The user screenshot showed severe mosaic joins and radial streaking around a pole in the legacy Io texture. These defects are present in the source image, not evidence of a failed texture download. The screenshot was inspected and deleted from `temp-pics/IO.png` as requested. The other three moons were visually approved; their grayscale appearance is a limitation of the selected source maps, not a claim that their surfaces have no color.

The replacement builder uses the [USGS Io Galileo SSI Global Color Merge Mosaic 1km](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km), credited USGS/NASA/JPL, under [USGS public-domain terms](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits). The reviewed browse image has much more coherent color and terrain across mosaic joins. The full TIFF is 11445x5723; it is downsampled to 1024/2048, normalizing the one-pixel cylindrical aspect rounding, with no generated terrain. The ISIS label specifies SimpleCylindrical, planetocentric latitude, center longitude zero, positive-west coordinates and domain -180..180. Source pixel order is retained; landmark registration remains P3.4 work.

USGS describes a false-color mosaic whose visible-eye colors would be more muted. It combines SSI color with higher-detail Voyager/Galileo imagery. Variable resolution and residual polar limitations remain; this is not a claim of uniform global photographic detail. The obsolete Io 1440 asset is removed only after successful conversion and the whole-package budget check. Replacement byte counts and rendered review are pending the correction job. The figures below describe the superseded initial increment.

NASA distributes the [Io color composite](https://science.nasa.gov/3d-resources/jupiter-io-b/), [Europa](https://science.nasa.gov/3d-resources/jupiter-europa/), [Ganymede](https://science.nasa.gov/3d-resources/jupiter-ganymede/) and [Callisto](https://science.nasa.gov/3d-resources/jupiter-callisto/) maps with credit to USGS/JPL/Caltech. The [NASA 3D resource collection](https://science.nasa.gov/3d-resources/) permits download and use subject to NASA media guidelines. [JPL's original catalog](https://maps.jpl.nasa.gov/tmaps/jupiter.html) identifies Voyager imagery and the added Galileo color for Io. These are legacy visualization mosaics, not calibrated albedo. The [catalog disclaimer](https://maps.jpl.nasa.gov/tmaps/) notes gaps and aesthetic alterations. Uneven sharpness, polar gaps and source processing remain visible; grayscale maps do not imply measured surface color. No elevations, invented markings, or new gap filling are derived from these images.

`tools/assets/build-galilean.ts` retains source pixel orientation/color and creates 1024-wide startup and native 1440-wide detail maps with ETC1S mipmaps. No upsampling: all original TIFFs are 1440x720. Both base sizes satisfy four-pixel compression alignment. Source TIFFs remain in ignored `assets/source/`; hashes, URLs and limitations are in `docs/licensing/galilean-assets.json`. Eight files add 1,288,963 bytes, bringing the texture package to 79,152,006 / 80,000,000 bytes. Files are encoded outside the public tree and published after the whole-package budget check.

These maps follow the source visualization layout; scientific landmark registration and body-fixed rotation validation remain P3.4 work. Do not infer validated surface longitude or synchronous spin from this appearance increment. Browser captures at LOW/HIGH day/quarter views and resource checks are required before accepting it.

## New Horizons maps

Sources: [NASA Pluto global color mosaic](https://science.nasa.gov/resource/pluto-global-color-map/) and the unannotated grayscale basemap linked by [JPL Charon's Surface in Detail](https://www.jpl.nasa.gov/images/pia21860-charons-surface-in-detail/). The color-coded elevation overlay is deliberately not used as Charon albedo. Credit: NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute. See the [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/); no endorsement implied.

`docs/licensing/new-horizons-assets.json` records acquisition URLs, original dimensions, SHA-256 hashes and modifications. Originals are retained in ignored `assets/source/`. `pnpm.cmd exec tsx tools/assets/build-new-horizons.ts` reproducibly generates 1024/2048-wide ETC1S KTX2 mipmapped derivatives. It stages files outside the public tree and checks the unchanged 80 MB package budget before publishing. Original four-hero textures are unchanged. New derivatives total 680,604 bytes, with the full texture package at 77,863,043 bytes.

Both mosaics cover the full cylindrical map grid but have varying resolution and missing southern imagery. The builder fills only black pixels connected vertically to the south edge with uniform neutral gray; dark interior markings are retained. Gray is a display placeholder, not measured albedo. A half-width shift converts source center 180 E to the engine's center-zero texture convention. Charon's original 12693x6347 dimensions include one-pixel rounding, normalized to exactly 2:1. Existing Pluto orientation is retained; Charon's scientifically validated orientation remains P3.4 work and must not be claimed complete from an attractive texture.

## Opaque atmospheres

Venus retains the existing Solar System Scope cloud texture, with softened illustrative visible-light color/contrast and an atmosphere rim. It does not expose a radar terrain map. Titan uses an opaque orange haze material with subtle procedural broad variation and a rim. These are display illustrations, not current weather or measured optical-depth profiles. The core opaque appearance remains on LOW; the extra rim follows existing high-detail/quality visibility rules. Shell thickness is a display parameter, not an atmospheric altitude measurement.

NASA references: [Venus cloud-top reflected light](https://www.nasa.gov/general/parker-solar-probe-captures-its-first-images-of-venus-surface-in-visible-light-confirmed/) and [Titan haze obscuring visible surface detail](https://science.nasa.gov/resource/purple-haze/). No surface displacement is inferred from photographic brightness.

## Verification

Asset checks include dimensions aligned to compression blocks, manifest sizes, source credits and the unchanged distribution budget. `e2e/body-detail.spec.ts` captures day/quarter views for all four bodies at LOW and HIGH, catches resource/shader errors and saves diagnostics. Captures require human/model visual review; no unreviewed golden references are created. Existing hero-reference and startup regressions are run alongside this increment.
