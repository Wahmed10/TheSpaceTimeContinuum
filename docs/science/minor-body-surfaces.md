# Ceres and Triton appearance

September 27, 2026. Source base-color textures are extracted from NASA VTAD's published [Ceres model](https://science.nasa.gov/resource/ceres-3d-model/) and [Triton model](https://science.nasa.gov/resource/triton-3d-model/), under [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Credit: NASA Visualization Technology Applications and Development. These are visualization products, not calibrated albedo measurements.

Reproduce with `pnpm.cmd exec tsx tools/assets/build-galilean.ts --minor`, included in `assets:build`. The shared extractor follows the material's base-color reference. Ceres's first image is a normal map; its second image is the actual base color. The normal map is not used as color or displacement. Original GLBs remain in ignored `assets/source/`. Container/image SHA-256 hashes, source URLs and transformations are in `docs/licensing/minor-body-assets.json`.

Both source images are 4096x2048. Distribution uses one 1024x512 ETC1S map per body on all quality tiers, preserving the package budget without upsampling. Their combined size is 189,252 bytes; the total texture package is 79,537,936 / 80,000,000 bytes. Further resolution increases require budget work. Source color and pixel order are retained. Ceres is gray in this source; no artificial color is added. Triton's plain northern region marks missing imagery, not measured smooth terrain. Blurred transitions and uneven regional sharpness are source limitations. Neither body's brightness is used to invent elevation.

The existing spheres remain in use. Scientific orientation and landmark registration are still P3.4 work, so texture appearance does not certify geographic alignment. Phobos and Deimos remain pending: their NASA models have square texture atlases that must be paired with their irregular geometry, not mapped onto these spheres.

`e2e/body-detail.spec.ts` adds day/quarter captures on LOW/HIGH, resource and console checks, and verifies each map was loaded. Original reference/startup regressions run alongside it. Capture review and hardware rendering evidence are separate from software browser test success.
