# Uncorrected analytic ephemeris audit — October 4, 2026

The ten original failures reproduce. Planetary angular errors are small; most failures are against the separate 10 parts-per-million radius target. The direct pinned library agrees with the uncorrected application adapter within 0.000027 km. No application time-scale, origin, units or reference-plane mismatch was found.

| Body | Original max angle, arcsec | Original max radial error, ppm | Original max vector error, km | Original combined gate |
|---|---:|---:|---:|---|
| Sun | 120.816 | 2391.998 | 1394.230 | Fail |
| Mercury | 16.857 | 32.154 | 4135.799 | Fail |
| Venus | 5.537 | 9.335 | 2903.914 | Pass |
| Moon | 2.020 | 10.657 | 1944.584 | Fail |
| Earth | 2.015 | 10.749 | 1959.148 | Fail |
| Mars | 3.205 | 11.578 | 4072.408 | Fail |
| Jupiter | 7.536 | 32.892 | 37309.243 | Fail |
| Saturn | 19.206 | 23.412 | 131787.466 | Fail |
| Uranus | 16.330 | 17.068 | 224534.973 | Fail |
| Neptune | 15.355 | 35.425 | 372467.639 | Fail |
| Pluto | 7.729 | 33.861 | 308785.962 | Fail |

These maxima can occur at different dates. The raw JSON retains every date, signed-free error magnitude, 24 independent holdouts per body, source hashes and negative time-conversion comparisons. Across all 29 dates per body, planetary angular maxima remain below 24 arcseconds, while the Sun reaches 578.492 arcseconds from the SSB origin. This does not mean its direction from Earth has that error.

The library's [documented design](https://github.com/cosinekitty/astronomy) truncates VSOP87 for roughly one-arcminute accuracy. Inspection of the pinned `BaryState` and `major_bodies_t` implementations confirms that its barycentric Sun is approximated using only Jupiter, Saturn, Uranus and Neptune. The full-vector Sun discrepancy is at most 1,419.702 km in this audit; an angle measured about the much smaller Sun–SSB displacement magnifies that offset. This is a library-model limitation, not a UTC/TT or ecliptic/equatorial conversion applied by this app.

[Horizons conventions](https://ssd.jpl.nasa.gov/horizons/manual.html#reference-frames) place ICRF within 0.02 arcseconds of the older FK5/J2000 dynamical axes, far below the measured errors. Fixtures and retained original query payloads identify geometric SSB, ICRF/FRAME, KM-S and TDB. The independent conversion uses explicit TT; the maximum difference from the app is 3.637978807091713e-12 days.

The strict original corrected tests remain 30 arcseconds / 1e-5 relative radius; lunar geocentric holdouts remain 20 km / 60 arcseconds. Compact coefficient chunks preserve the accepted correction polynomial. Missing chunks use fresh local analytics marked approximate and cannot be counted as a corrected-accuracy pass. This finite audit does not prove a bound at every instant.

Reproduce without network access: `pnpm.cmd exec tsx tools/audit-analytic-ephemeris.ts`. Full evidence: [JSON](analytic-ephemeris-audit.json).
