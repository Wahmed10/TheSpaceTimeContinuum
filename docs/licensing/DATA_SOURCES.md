# Data sources

| Source | Use | Credit / limitations |
|---|---|---|
| https://github.com/cosinekitty/astronomy | Analytic ephemerides and IAU rotations | MIT; exact pinned version required for residual tables |
| https://ssd.jpl.nasa.gov/horizons/ | Weekly residual corrections and separate reference vectors | NASA/JPL; sequential server-side acquisition, cached locally |
| https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc | Independent Mars orientation references | NASA/JPL NAIF, IAU 2015 model |
| https://svs.gsfc.nasa.gov/4720/ | LROC color and LOLA lunar terrain | NASA SVS, Ernie Wright, LRO/LROC/LOLA; display-resolution derivatives |
| https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/ | Mars normal map from topography | NASA GSFC/MGS MOLA team, 4 pixels/degree |
| https://svs.gsfc.nasa.gov/4851/ | Deep Star Maps 2020 faint-star background | NASA GSFC SVS, Ernie Wright; tone-mapped and KTX2 compressed |
| https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html | 9,096 fixed J2000 star directions | Hoffleit and Warren (1991), HEASARC; no proper motion or variability |
| https://www.solarsystemscope.com/textures/ | Other planetary textures | CC BY 4.0; based on NASA imagery, with enhanced colors and illustrative unmapped terrain |
| https://ssd.jpl.nasa.gov/planets/phys_par.html | Physical constants | NASA/JPL SSD |
| https://ssd.jpl.nasa.gov/sats/phys_par/ | Satellite radii | NASA/JPL SSD |
| https://hpiers.obspm.fr/iers/bul/bulc/bulletinc.dat | Leap-second review | IERS Bulletin C 72; no leap second in December 2026 |

Per-file credits are in `assets/ASSET_LICENSES.md`. Browser data requests stay on this application's origin. LIVE follows the device clock and does not imply telemetry. Body maps and celestial background are visualizations, not scientific image-analysis products. Later-phase ingestion, satellites, spacecraft and news are not implemented.
