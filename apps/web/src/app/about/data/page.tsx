export default function Data() {
  return (
    <main className="document-page">
      <a href="/">← Back to the universe</a>
      <p className="eyebrow">THE SPACE TIME CONTINUUM</p>
      <h1>
        A little closer
        <br />
        to the real universe.
      </h1>
      <p>
        Continuum calculates planetary motion locally with astronomy-engine and
        precomputed JPL Horizons corrections, validated at independent dates.
        Every world shares one simulation clock. Positions are stored as
        double-precision kilometers in ICRF-aligned, solar-system-barycentric
        coordinates; the renderer subtracts the camera position before sending
        them to the GPU.
      </p>
      <h2>Calculated, never live telemetry</h2>
      <p>
        LIVE means the simulation follows your device clock. It does not mean a
        spacecraft is transmitting these positions. Dates before 1972 use an
        approximate historical UT1/TT conversion. Future leap seconds are
        unknown.
      </p>
      <h2>Sources & credits</h2>
      <ul>
        <li>
          <a href="https://svs.gsfc.nasa.gov/4851/">Deep Star Maps 2020</a> —
          NASA GSFC Scientific Visualization Studio, Ernie Wright. Faint-star
          background tone-mapped and compressed for display, aligned with the
          J2000 catalog.
        </li>
        <li>
          <a href="https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/">
            NASA MGS MOLA
          </a>{' '}
          — NASA GSFC/MOLA team. Mars normals derived from the 4
          pixels-per-degree topography product, shifted in longitude and
          compressed for display.
        </li>
        <li>
          <a href="https://svs.gsfc.nasa.gov/4720/">NASA CGI Moon Kit</a> — NASA
          SVS, LRO/LROC/LOLA and Ernie Wright. Lunar color, derived normals and
          displacement; resized and compressed for display.
        </li>
        <li>
          <a href="https://github.com/cosinekitty/astronomy">
            astronomy-engine
          </a>{' '}
          — analytic ephemerides and IAU rotations, MIT.
        </li>
        <li>
          <a href="https://ssd.jpl.nasa.gov/horizons/">NASA/JPL Horizons</a> —
          ephemeris correction tables and independent reference vectors for
          validation.
        </li>
        <li>
          <a href="https://www.solarsystemscope.com/textures/">
            Solar System Scope
          </a>{' '}
          — planetary maps and star background,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
          Resized and compressed to KTX2. Based on NASA imagery; colors enhanced
          and unmapped terrain may be illustrative.
        </li>
        <li>
          <a href="https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html">
            Bright Star Catalog, fifth edition
          </a>{' '}
          — Hoffleit and Warren (1991), distributed by NASA HEASARC. Fixed J2000
          directions; displayed colors and sizes are illustrative.
        </li>
        <li>
          <a href="https://threejs.org/">Three.js</a> — rendering, MIT.
        </li>
        <li>
          <a href="/third-party-notices.txt">Third-party software notices</a>
        </li>
      </ul>
      <h2>Architecture preview</h2>
      <p>
        This release implements the first renderer milestone: Sun, Earth, Moon,
        and Mars. The plan’s stricter scientific and real-device performance
        gates are tracked in the repository before further layers are enabled.
        No news, satellite, asteroid, or spacecraft positions are invented to
        fill missing data.
      </p>
      <h2>Privacy</h2>
      <p>
        This local preview has no accounts, analytics, external fonts, or
        tracking. Textures are served from this application.
      </p>
    </main>
  );
}
