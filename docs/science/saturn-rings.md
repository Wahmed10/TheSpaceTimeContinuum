# Saturn ring rendering model

September 27, 2026. Dimensions checked against [NASA NSSDCA Saturnian Rings Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html), last updated April 19, 2022. Values are stored in `packages/domain/data/saturn-rings.json` in km from Saturn's center.

The renderer represents the main C/B/A rings, from 74,658 to 136,780 km, with a Cassini division from 117,507 to 122,340 km. Faint D/E/F/G rings, ring thickness, eccentricity and fine ringlet dynamics are omitted. The annulus uses Saturn's existing Y-north texture frame; no second axial tilt is applied. Radii are divided by the catalog mean radius, matching the existing spherical planet model and Explore scaling. Saturn oblateness is not modeled in this increment.

The existing `saturn_ring_alpha` KTX2 asset supplies radial color/opacity. Its [Solar System Scope source](https://sunaeon.solarsystemscope.com/textures/) and CC BY 4.0 attribution were rechecked on September 27. It is an illustrative radial profile, not calibrated optical-depth data. An analytic mask places the broad division at the sourced dimensions; fine texture features are not independently registered scientific measurements. The asset already appears in the manifest and ASSET_LICENSES.md; no new binary was downloaded.

The two shadows use body-local rays toward the Sun: ring rays test closest distance to the unit sphere; surface rays intersect the equatorial plane and sample the same radial opacity/mask. Signed grazing-ray protection keeps equinox values finite. Shadow softening is a display approximation, not resolved solar-disk integration. Surface attenuation multiplies albedo, including ambient response; it is not a complete multiple-scattering solution.

Forward scattering uses a Henyey-Greenstein phase with illustrative g=0.65 and a small diffuse/transmitted contribution. The incoming photon direction is the negative Sun direction. LOW disables the forward term but retains rings and shadows. Gas-giant atmosphere rims are inexpensive illustrative Fresnel shells, not altitude-dependent atmospheric models.

The ring uses normal TSL node-material transforms and inherited logarithmic depth, two-sided single-pass transparency and no depth writing in gaps. It blends after orbit ribbons while respecting opaque planet depth. Transparent inter-object ordering, actual shadow appearance and grazing/edge views require the browser captures and later device review; passing TypeScript alone does not validate them.

## September 27 upload correction

The original width-only converter produced ring base levels of 1024x63 and 2048x125. These violate the portable 4x4 compressed-texture block alignment required by WebGPU. Rebuilt levels are 1024x64 and 2048x128; the radial horizontal coordinate is unchanged. `tools/check-assets.ts` now checks every shipped KTX2 base-level dimension. `build-ktx.ts --only=saturn_ring_alpha` rebuilds invalid existing strips and encodes outside public before renaming, avoiding a live Turbopack read of a toktx-locked Windows output file.

The original north-only surface-shadow fixture was not a valid visibility check: the Sun was north of the rings and the shaded surface was south. Lab cameras now use the sunward azimuth, and independent surface-shadow comparison uses the south view for June 2020. A LOW WebGL2 smoke comparison measured 14,922 changed pixels with no console errors or dimension warnings. The automated environment has no WebGPU adapter; this result is not a hardware WebGPU pass.
