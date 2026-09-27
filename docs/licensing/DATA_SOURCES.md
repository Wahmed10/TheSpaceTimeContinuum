# Data sources

| Source | Use | Credit / limitations |
|---|---|---|
| https://science.nasa.gov/resource/pluto-global-color-map/ | Pluto surface mosaic | NASA/JHUAPL/SwRI; New Horizons color mosaic, varying resolution, neutral gray for unmapped south; 1k/2k ETC1S derivatives |
| https://www.jpl.nasa.gov/images/pia21860-charons-surface-in-detail/ | Charon surface basemap | NASA/JHUAPL/SwRI; unannotated grayscale basemap, not topography overlay; neutral unmapped south; original hashes in new-horizons-assets.json |
| https://github.com/cosinekitty/astronomy | Analytic ephemerides and IAU rotations | MIT; exact pinned version required for residual tables |
| https://ssd.jpl.nasa.gov/horizons/ | Weekly residual corrections and separate reference vectors | NASA/JPL; sequential server-side acquisition, cached locally |
| https://ssd.jpl.nasa.gov/horizons/ | Phase 2 moon/NEO/spacecraft test fixtures and four-day Callisto residuals | NASA/JPL; recorded queries, API versions and acquisition dates; sampled validation is not a continuous accuracy guarantee |
| https://ssd.jpl.nasa.gov/horizons/ | Osculating-element tables for Phobos, Deimos, Titan, Triton, Charon and Ceres | NASA/JPL; offline sequential acquisition, ICRF-equatorial TDB records with per-file provenance; approximate propagated/blended positions |
| https://celestrak.org/publications/AIAA/2006-6753/AIAA-2006-6753.pdf | Independent TEME/J2000 numerical reference | Vallado et al. (2006), Appendix C; numerical test values, no software copied |
| https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc | Independent Mars orientation references | NASA/JPL NAIF, IAU 2015 model |
| https://svs.gsfc.nasa.gov/4720/ | LROC color and LOLA lunar terrain | NASA SVS, Ernie Wright, LRO/LROC/LOLA; display-resolution derivatives |
| https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/ | Mars normal map from topography | NASA GSFC/MGS MOLA team, 4 pixels/degree |
| https://svs.gsfc.nasa.gov/4851/ | Deep Star Maps 2020 faint-star background | NASA GSFC SVS, Ernie Wright; tone-mapped and KTX2 compressed |
| https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html | 9,096 fixed J2000 star directions | Hoffleit and Warren (1991), HEASARC; no proper motion or variability |
| https://www.solarsystemscope.com/textures/ | Other planetary textures | CC BY 4.0; based on NASA imagery, with enhanced colors and illustrative unmapped terrain |
| https://ssd.jpl.nasa.gov/planets/phys_par.html | Physical constants | NASA/JPL SSD |
| https://ssd.jpl.nasa.gov/sats/phys_par/ | Satellite radii | NASA/JPL SSD |
| https://ssd.jpl.nasa.gov/sats/elem/ | Experimental mean-element moon dataset | NASA/JPL, retrieved 2026-09-24; rounded approximate models, unresolved science discrepancies, not enabled in renderer |
| https://hpiers.obspm.fr/iers/bul/bulc/bulletinc.dat | Leap-second review | IERS Bulletin C 72; no leap second in December 2026 |

Per-file credits are in `assets/ASSET_LICENSES.md`. Browser data requests stay on this application's origin. LIVE follows the device clock and does not imply telemetry. Body maps and celestial background are visualizations, not scientific image-analysis products. Later-phase ingestion, satellites, spacecraft and news are not implemented.
