# Implementation Plan: Interactive 3D Space Map / Live Solar System Platform

> Source brief: `Notes_260922_152652.PDF` (119 pages, "MASTER PROJECT BRIEF"). I read all of it. Section numbers like §27 point to the brief.
> Plan written: 2026-09-22. Author role: lead architect / planner.
> Audience: you (a solo developer "vibe-coding" with AI assistants) **and the next AI model** that will implement this step by step.

---

## 0. How to use this document (read first — especially the next AI model)

1. **Work in order.** Phases 0, 1, and 2 are written as exact, file-by-file steps with commands and acceptance tests. Phases 3–11 are task-level. Before each later phase starts, the implementing model should expand that phase into file-level steps in the same style as Phase 1, and you should approve it first.
2. **One step per session/prompt.** Each step has an ID (e.g. `P1.4`). Ask the model to "Implement step P1.4 of the plan. Stop when its acceptance checks pass." See Appendix A for copy-paste prompts.
3. **Always finish a step with** `pnpm verify` (typecheck + lint + unit tests), then a git commit. Never start the next step with a red build.
4. **Architecture gate after Phase 1.** Do not start Phase 2 until the Renderer Proof-of-Concept passes the gate in §P1.12. If it fails, follow the fallback decision tree there.
5. **Legend used for facts:**
   - **[V]** = verified today from an official source or the npm registry.
   - **[R]** = reported by reputable secondary sources. Re-check it when the relevant step starts.
   - **[A]** = my assumption or recommendation. It may be wrong. Validate it.
6. **Do not build anything marked "post-MVP" or "non-goal"** unless you explicitly change the plan.

---

## 1. Executive Summary

**Recommended direction**

- **Web-first. TypeScript monorepo:** a Next.js app for the UI shell, content pages, and API, plus a **framework-free "Space Engine" package** built on **Three.js `WebGPURenderer`**. That renderer uses WebGPU where available and **falls back to WebGL 2 automatically** [V: three.js docs].
- **Do not use React Three Fiber for the engine.** React owns UI state only. The engine owns the frame loop. They talk through a small command/event bridge that is throttled and never runs per frame (§16).
- **Scientific core is pure TypeScript**, separate from rendering:
  - `astronomy-engine` (MIT [V]) for Sun, Moon, planets, Pluto, Galilean moons, rotation axes, and planetary events.
  - `satellite.js` (MIT [V]) for SGP4, running in a Web Worker.
  - Pre-computed **JPL Horizons** state tables for spacecraft and asteroid encounters, generated **server-side only**.
- **Canonical physics state:**
  - Time: **TDB seconds since J2000**.
  - Position: **ICRF-aligned axes, Solar-System-Barycentric origin, km, float64**.
  - Rendering is **camera-relative**: the camera always sits at the origin, and float64 values are subtracted on the CPU before float32 values go to the GPU. Add a **logarithmic depth buffer** and hierarchical frames (Earth-local satellites, etc.). **Physical coordinates are never mutated for display.** A separate `DisplayTransform` stage produces "Explore Scale".
- **Backend = "boring + cached":**
  - Provider adapters run as **scheduled ingestion jobs on GitHub Actions**. Vercel Hobby cron is only daily [R].
  - They normalize data into **Neon Postgres** (free tier) through Drizzle ORM.
  - Next.js route handlers expose a versioned internal API (`/api/v1/...`) with aggressive CDN caching.
  - **The browser never calls NASA/JPL/CelesTrak directly.** JPL explicitly forbids embedding its APIs in websites (CORS) and allows only one request at a time [V].
- **First milestone is an architecture gate, not the MVP:** a Sun/Earth/Moon/Mars proof-of-concept (Phase 1) that must look excellent, stay precise from 400 km altitude out to 50 AU, run LIVE/past/future time, and hit numeric FPS targets on WebGPU **and** forced WebGL 2, desktop and mobile.

**Where I disagree with or refine the brief (§74)**

| # | Brief says / implies | My recommendation | Why |
|---|---|---|---|
| 1 | 4 top-level areas: Explore, Live, News, Discoveries (§58) | **2 top-level areas: Explore (map) + News.** "Live" becomes a compact "Happening now" drawer inside Explore. "Discoveries" becomes a tab/filter inside News and the drawer. | Less navigation bloat. Live items are map-first by nature. |
| 2 | Launches as a planned feature (§34) | **Post-MVP**, except an *optional* stretch item: an "Upcoming launches" list with a "View launch site" action and **no trajectories**. | Launch Library 2 free tier is ~15 requests/hour [R], and commercial use needs an arrangement [R]. Authoritative trajectories mostly don't exist publicly, and faking them is forbidden by the brief. |
| 3 | Newly discovered NEOs appear automatically (§32) | MVP: ingest **designated** objects only (MPC/JPL SBDB). **Exclude unconfirmed NEOCP objects** (JPL Scout) from MVP. | NEOCP orbits are highly uncertain and can vanish. Showing them risks misleading users. |
| 4 | Vercel hosting | OK for development and pre-launch. **Vercel Hobby is non-commercial only** [R]. Budget for Vercel Pro (or move hosts) *before* any monetization. Scheduled jobs run on **GitHub Actions** because Hobby cron is once per day [R]. | Keeps you on free tiers now without painting yourself into a corner. |
| 5 | Asteroid "current position" for all NEOs | Two-body Kepler propagation from JPL SBDB osculating elements, **flagged by distance from element epoch**. For close-approach events, use **Horizons vectors for the encounter window**. | Two-body is fine near epoch and drifts for years-away dates. Encounters need real ephemerides. |
| 6 | Major moons "research whether" (§17) | **Include:** Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Triton, Charon, plus **Pluto and Ceres**. **Exclude** other dwarf planets and small moons in MVP. | High recognition and cheap to support. Galilean moons are analytic in astronomy-engine. The others use JPL mean elements, clearly labeled "approximate". |
| 7 | Satellites: many categories (§29) | Default **"Stations" only (ISS, Tiangong)**. The user can toggle Starlink / GNSS / Weather / Science / "Brightest". **Never** default to the ~15k+ active cloud. | Brief agrees. Also keeps CelesTrak downloads small, since they enforce limits on large sets [V]. |
| 8 | Graphics quality tiers as Phase 10 | Build **AUTO tier detection and a LOW path in Phase 1**. Phase 10 only tunes them. | The gate requires "acceptable mobile fallback", so it can't be deferred. |
| 9 | Babylon vs Three | **Three.js**, with **Babylon.js 9 as the documented fallback** if the precision gate fails. Babylon 9 ships built-in "Large World Rendering" (floating origin) [R]. | See §4. |

---

## 2. Repository Assessment

- `C:\Users\wahmed\Documents\COPILOT_TEST` contains only the PDF brief. **There is no repository, code, package files, CI, or config. This is a greenfield project.** (§72: "If repository is empty, say so.")
- No existing architecture exists to preserve. All conventions are defined in this plan (§Appendix B).
- Environment: Windows, PowerShell, git available. Commands in this plan are PowerShell-friendly.
- Constraints from you: **solo developer + AI**, **free tiers only**, **Vercel hosting**, **Markdown deliverable**.

---

## 3. Product Scope

### 3.1 MVP (must ship)
- Account-free, instant-load immersive 3D Solar System (Explore). The scene is nearly full-screen, with minimal UI.
- Bodies: Sun, 8 planets, Pluto, Ceres, and 10 moons (see table row 6). Realistic rendering for Sun/Earth/Moon/Mars. Good rendering for the others, including Saturn's rings.
- Global simulation clock: LIVE / past / future, play/pause, reverse, speeds from realtime to 1 year/s, date picker, smooth "Return to LIVE".
- Camera: orbit, zoom, pan (limited), select, focus, follow, cinematic fly-to, back/history, local reference frames (heliocentric, planet-centric, Earth-fixed).
- True Scale / Explore Scale toggle.
- Layers: Planets, Moons, Dwarf planets, Asteroids (NEOs), Satellites (by group), Spacecraft, Orbits.
- Earth satellites: CelesTrak GP (OMM JSON) plus SGP4 in a worker. Curated groups. Pass-over-Earth visualization only; no observer passes.
- NEOs: upcoming/recent close approaches (CNEOS CAD), notable NEOs, recently designated NEOs.
- Spacecraft (curated ~10): Voyager 1, Voyager 2, New Horizons, JWST, Parker Solar Probe, Juno, Europa Clipper, JUICE, Psyche, Lucy, BepiColombo. Each has trajectory status (reconstructed/predicted/planned).
- SpaceEvent system: close approaches, spacecraft milestones (curated), computed planetary events (oppositions, conjunctions, eclipses, via astronomy-engine). Each event has a "See it" button that sets up the map state.
- News: NASA + JPL + ESA RSS. Deterministic entity linking. "View in Space" buttons.
- Discoveries: a feed of newly designated NEOs with a "View in Space" button.
- Universal search: bodies, moons, spacecraft, satellites (name/NORAD), asteroids (designation), events.
- Compact object cards with provenance ("calculated / propagated / reconstructed / predicted").
- Shareable URLs: `/object/[id]`, `/event/[id]`, plus query state (`t`, `layers`, `scale`, `frame`).
- Adaptive quality: AUTO/LOW/MEDIUM/HIGH/ULTRA. Desktop-first, mobile-functional.
- Accessibility baseline, reduced motion, keyboard navigation.
- Observability baseline (Sentry free tier plus an ingestion status page).

### 3.2 Post-MVP (next)
- Launches with LL2 (paid tier/arrangement), launch site focus, countdown, trajectories where authoritative.
- Observer mode: "what's above me", ISS passes, rise/set, alt/az sky view.
- Accounts: saved views, followed objects, alerts, notifications.
- Additional dwarf planets and moons, comets, conjunction events between satellites (SOCRATES).
- Natural-language search (LLM-assisted, grounded on the search/event API).
- Unconfirmed NEOCP objects (Scout) with heavy uncertainty UI.
- SPICE-based high-accuracy moon and spacecraft ephemerides.

### 3.3 Long-term
Stellar neighborhood (Gaia subset), exoplanets, Milky Way, galaxies, WebXR, native wrappers (Capacitor/Tauri) (§62).

### 3.4 Explicit non-goals for MVP (§61)
Gravity sandbox, collisions, climate sim, planet editing, custom systems, billions of stars, Gaia, galaxies, social, native apps, VR/AR, telescope control, accounts, personalized alerts.

---

## 4. Rendering Technology Comparison (§14, §15)

| Criterion | Three.js `WebGPURenderer` (r186 [V: npm three@0.186.0]) | Three.js `WebGLRenderer` | React Three Fiber (9.7 [V]) | Babylon.js 9 (9.27 [V]) | CesiumJS (1.145 [V]) |
|---|---|---|---|---|---|
| WebGPU | Yes, primary target; auto WebGL2 fallback [V] | No | Wraps Three (either renderer) | Mature WebGPU, WGSL core shaders [R] | WebGL-centric |
| Shader authoring | **TSL** node language → WGSL/GLSL (one source for both backends) [R] | GLSL | Same as Three | Node Material / WGSL / GLSL | GLSL (custom is hard) |
| Post-processing | Node-based pipeline (bloom etc.) [R] | EffectComposer (mature) | Same | Mature default pipeline | Limited |
| Large-world precision | **DIY**: camera-relative + log depth (supported) | Same, plus reversed-Z via EXT_clip_control [R] | DIY | **Built-in Large World Rendering (floating origin, 9.0)** [R] | Excellent (RTC, globe-scale) but Earth-centric |
| Instancing / points | `InstancedMesh`, `Points`, storage buffers, compute | InstancedMesh | Same | Thin instances, SPS, compute | Point primitives |
| Bundle size | Moderate, tree-shakable | Moderate | + React reconciler | Larger (modular packages help) | Large (~several MB) |
| Ecosystem / examples | Largest; **best-known by AI coding models** | Largest | Large | Large, strong tooling (Inspector) | Geospatial niche |
| Debugging | Improving; Spector (WebGL), browser WebGPU devtools | Mature | Same | **Excellent Inspector** | Good |
| React integration | Manual bridge (preferred for us) | Manual | Native | Manual | Resium |
| License | MIT [V] | MIT | MIT [V] | Apache-2.0 [V] | Apache-2.0 [V] |
| Risk | TSL/WebGPU API still evolving between releases [R] | Legacy path, no compute | Per-frame React temptations | Different mental model, heavier | Wrong fit for heliocentric scale |

### 4.1 Recommendation
**Three.js `WebGPURenderer` with TSL, used directly (no R3F) inside a dedicated engine package. Pin an exact version (e.g. `three@0.186.0`) and upgrade deliberately.**

Justification:
1. One renderer object gives WebGPU where available and a WebGL2 fallback, from one shader source (TSL).
2. It has the biggest ecosystem and examples. The official `webgpu_tsl_earth` example is an MIT-licensed starting point for Earth, and AI assistants are most fluent in it. That matters a lot for a solo vibe-coder.
3. Precision is solvable with known techniques (camera-relative + log depth + frame hierarchy) that we control fully.
4. MIT license, no copyleft risk.

**Fallback (decision tree in §P1.12):** if camera-relative rendering or depth precision can't meet the gate in Three, spend one short spike on **Babylon.js 9 with `useLargeWorldRendering`** before going further.

**Why not R3F:** its value is declarative React scene graphs. We explicitly do not want React reconciliation driving the frame loop (§16), and we need imperative control of float64 → float32 transforms every frame. React stays for UI.

**Why not Cesium:** it's superb for Earth globes, but heliocentric, multi-body, cinematic rendering fights its architecture. It's heavy too.

### 4.2 WebGPU strategy (§15)
- WebGPU is on by default in Chrome/Edge 113+ (desktop), Chrome Android 121+ (Android 12+, Qualcomm/ARM GPUs), Safari 26+ (macOS/iOS/iPadOS), and Firefox 141+ Windows / 147+ macOS. Firefox Linux/Android was not yet on by default in early 2026 [R].
- **Strategy (confirmed):** WebGPU preferred → WebGL 2 fallback, via `WebGPURenderer` automatic backend selection. **No WebGL 1 support.** Show a friendly "Your browser can't run 3D" page instead.
- Add a `?renderer=webgl` URL flag and a settings toggle to force WebGL2 (`forceWebGL: true`) for testing and user workarounds.
- Every custom material is TSL-only so it compiles on both backends. **No raw GLSL/WGSL** unless it's behind a backend check with a TSL fallback.
- The fallback is tested continuously: CI visual smoke tests run with forced WebGL. WebGPU is verified manually on real devices each phase.

---

## 5. Technology Stack (§7 deliverable)

| Area | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | Everywhere |
| Package manager / monorepo | **pnpm workspaces** (via `corepack enable`) | Simple; no Nx/Turborepo needed in MVP |
| Runtime | Node.js 22 or 24 LTS [A] | Check with `node -v` |
| Web framework | **Next.js 16 App Router** (next@16.3 [V]), React 19 [V] | SSR/SSG for content and SEO pages; engine is client-only |
| Styling / UI primitives | Tailwind CSS v4 + Radix UI primitives | Accessible popovers/dialogs/sliders; MIT |
| Client UI state | **Zustand 5** [V] | Tiny; subscribe-outside-React for the bridge |
| 3D | **three@0.186.0 pinned** (`three/webgpu`, `three/tsl`) | No R3F |
| Astronomy | **astronomy-engine 2.1.x** (MIT [V]) | Planets, Moon, Pluto, Jupiter moons, rotation axes, events |
| Satellites | **satellite.js 7.1** (MIT [V]) | `json2satrec` for OMM JSON [R]; runs in a Web Worker |
| Workers | Native Web Workers + **Comlink** (Apache-2.0) | Only for SGP4 and bulk parsing in MVP |
| Client search | **MiniSearch 7** (MIT [V]) | Instant local search for core bodies/spacecraft |
| Validation | **Zod** | API DTOs and provider payload validation |
| DB | **Neon Postgres (free)** + **Drizzle ORM** (Apache-2.0 [V]) + `pg_trgm` | Free: ~0.5–1 GB storage, limited compute hours [R] |
| Ingestion runtime | Node scripts in `packages/ingest`, run by **GitHub Actions cron** | Cron minimum 5 min; 2,000 free min/month for private repos (unlimited public) [R] |
| RSS parsing | fast-xml-parser 5 (MIT [V]) | |
| Hosting | **Vercel Hobby** now → Pro before commercial use | CDN caching of `/api/v1` responses |
| Errors / perf telemetry | **Sentry** (free developer tier) + small custom FPS beacon (sampled) | Keep minimal |
| Unit tests | **Vitest 5** [V] | Scientific tests live here |
| E2E / smoke / visual | **Playwright 1.63** [V] | Forced-WebGL runs in CI |
| Lint / format | ESLint (flat config) + `eslint-plugin-boundaries` or `dependency-cruiser` + Prettier | Enforce package dependency rules |
| Asset pipeline | `@gltf-transform/cli` (MIT), `toktx`/KTX-Software (Apache-2.0) for KTX2/Basis | Compressed GPU textures |
| CI | GitHub Actions: `verify.yml` (PR) and `ingest.yml` (cron) | |

---

## 6. Scientific Data Sources (§8 deliverable)

> Rule for all providers: **server/CI-side only**, cached, one request at a time where required, custom `User-Agent: SpaceMap/<version> (contact: <your email>)`, **stop on non-200 and alert** (CelesTrak explicitly requires this [V]).

| Provider | Data | Access | Limits / terms | Freshness (our schedule) | License / attribution | Fallback |
|---|---|---|---|---|---|---|
| **astronomy-engine** (library) | Sun, Moon, planets, Pluto, Galilean moons, rotation axes, eclipses, oppositions | Local computation (client + server) | None | Computed on demand | MIT; credit in About page | n/a (offline) |
| **JPL Horizons API** `ssd.jpl.nasa.gov/api/horizons.api` | Spacecraft vectors, asteroid encounter vectors, **validation fixtures** | HTTPS GET, `format=json`, `EPHEM_TYPE=VECTORS`, `REF_PLANE=FRAME`, `REF_SYSTEM=ICRF`, `CENTER=500@0` | **One request at a time; no website embedding (CORS); User-Agent required; cache; check `version` field** [V] | Spacecraft: weekly. Encounters: on event creation | U.S. Gov work, generally public domain; attribute "NASA/JPL-Caltech Horizons" [A] | Keep last good table; mark stale; hide beyond validity |
| **JPL SBDB API** `ssd-api.jpl.nasa.gov/sbdb.api` | Per-object orbit elements, physical params, discovery | HTTPS JSON | Same fair-use policy [V] | Daily for tracked NEOs | Attribute NASA/JPL SSD | Keep last elements; show epoch age |
| **JPL SBDB Query API** `sbdb_query.api` | Lists of NEOs (e.g. PHAs, recent) | HTTPS JSON | Same | Daily | Same | Same |
| **CNEOS CAD API** `ssd-api.jpl.nasa.gov/cad.api` | Close approaches (dist, time, v_rel, H) | HTTPS JSON (`date-min`, `date-max`, `dist-max`, `body=Earth`) | Same | Daily (window: −30 d … +60 d; `dist-max=0.05` AU) | Attribute NASA/JPL CNEOS | Keep last list |
| **Minor Planet Center** (MPC Explorer / MPC APIs / MPEC RSS) | New designations, MPECs, identifications, orbits | HTTPS APIs + RSS (docs.minorplanetcenter.net/mpc-ops-docs/apis) [R] | Check current MPC docs; be polite; cache [A] | Every 6 h (recent MPECs) | Attribute IAU Minor Planet Center | Fall back to SBDB "recent" query |
| **CelesTrak GP** `celestrak.org/NORAD/elements/gp.php?GROUP=<g>&FORMAT=JSON` | OMM mean elements per group | HTTPS JSON/CSV (no key) | **Download once per update (~2 h); stop on any non-200 or be firewalled; big groups (active, starlink) rate-enforced; use JSON/CSV since TLE can't encode 6-digit catalog numbers (≥100000 as of 2026-07-11)** [V] | Every 2 h, groups: `stations`, `visual`, `starlink`, `gnss`, `weather`, `science`, `geo` [A: confirm group names on CelesTrak] | Free; credit "CelesTrak / T.S. Kelso"; consider donating | Keep last snapshot; show element age; degrade satellite accuracy label |
| **NASA RSS** (nasa.gov/rss-feeds, e.g. `nasa.gov/news-release/feed/` [A: confirm current URLs]) | News headlines, summaries, images | RSS | Poll politely | Every 2 h | NASA media generally not copyrighted; **no logos, no implied endorsement**; credit "NASA" [R] | Hide section on failure; show cached |
| **JPL News RSS** (`jpl.nasa.gov/feeds/news` [R]) | News | RSS | Same | Every 2 h | NASA/JPL-Caltech credit; check per-image credits | Same |
| **ESA RSS** (`esa.int/rssfeed/...` [R]) | News | RSS | Same | Every 2 h | ESA images are often **CC BY-SA 3.0 IGO** (share-alike) [R]. **Store headline + link + short snippet only; do not rehost ESA images in MVP** | Same |
| **The Space Devs LL2** (post-MVP) | Launches | REST | ~15 req/h free [R]; commercial terms need contact | Hourly (1 request) | Attribution required [R] | Hide launches |
| **Yale Bright Star Catalog (BSC5)** via NASA HEASARC/VizieR | ~9,100 stars for background | Static file | n/a | Static | Public scientific catalog [A: confirm] | Texture skybox |
| **JPL Planetary Satellite Mean Elements** `ssd.jpl.nasa.gov/sats/elem/` | Phobos, Deimos, Titan, Triton, Charon orbits | Static transcription into repo JSON with source URL/date | n/a | Static; review yearly | Attribute NASA/JPL SSD | n/a |

**Avoid:** HYG star database (CC BY-SA → share-alike risk for a proprietary product) [A], random texture sites, scraping news HTML.

---

## 7. Licensing Audit (§3, §27 deliverable)

### 7.1 Dependencies
All recommended runtime dependencies are **MIT or Apache-2.0** (permissive): three, astronomy-engine, satellite.js, next, react, zustand, drizzle-orm, minisearch, fast-xml-parser, comlink, zod, radix-ui, tailwind. [V for those queried on npm]
- **Rule:** CI runs `pnpm licenses list --prod` (or `license-checker-rseidelsohn`). The build **fails on GPL/AGPL/LGPL/SSPL/CC-BY-SA/unknown** in production dependencies. Keep an allowlist in `docs/licensing/allowlist.json`.
- Apache-2.0 requires shipping NOTICE files where present. Generate `public/third-party-notices.txt` at build.

### 7.2 Textures / models (store the provenance of every file in `assets/ASSET_LICENSES.md`: file, source URL, license, credit line, date downloaded, modifications)
| Asset | Recommended source | License [R unless noted] | Credit |
|---|---|---|---|
| Earth day | NASA Visible Earth **Blue Marble Next Generation** (monthly, 21600×10800) | Public domain (U.S. Gov) | "NASA Earth Observatory / Blue Marble" |
| Earth night lights | NASA **Black Marble 2016/2012** | Public domain | "NASA Earth Observatory / Black Marble" |
| Earth clouds | NASA Visible Earth cloud composites | Public domain | NASA |
| Earth topography/normal | NASA/USGS SRTM/GEBCO-derived bump; or generate from NASA "Topography" map | Public domain (GEBCO has its own attribution terms: check) | NASA |
| Moon color + displacement | **NASA SVS "CGI Moon Kit"** (LRO LROC color + LOLA displacement) | Public domain | "NASA's Scientific Visualization Studio" |
| Mars color | **USGS Astrogeology Viking MDIM2.1 color mosaic** + **MOLA** elevation | Public domain | "NASA/JPL/USGS" |
| Other planets | NASA/JPL/USGS mosaics where available; else **Solar System Scope** textures | SSS = **CC BY 4.0** (commercial OK with attribution) | "Solar System Scope (CC BY 4.0)" |
| Saturn rings | Solar System Scope ring texture (CC BY 4.0) or Cassini-derived NASA data | As above | As above |
| Milky Way background | **NASA SVS "Deep Star Maps 2020"** | NASA SVS (credit required) | "NASA/Goddard Space Flight Center Scientific Visualization Studio" |
| Spacecraft models | **NASA 3D Resources** (`nasa3d.arc.nasa.gov` / GitHub nasa/NASA-3D-Resources) | Public domain generally; **check each model** | NASA |

**Never** use NASA insignia ("meatball"/"worm") or imply endorsement [R].

### 7.3 Data
NASA/JPL data is generally U.S. Government work [A]. CelesTrak asks for responsible usage and credit [V]. MPC requires attribution [A]. ESA content can be CC BY-SA IGO [R]. Keep a per-provider `license` and `attribution` string in the `data_sources` table, and render attribution in the object card "Source" section plus an `/about/data` page.


---

## 8. Domain Architecture (§9 deliverable, §49)

### 8.1 Canonical IDs
`<kind>:<slug>` strings. They're stable and URL-safe:
- `star:sun`, `planet:earth`, `moon:europa`, `dwarf:pluto`
- `sb:2024-yr4` (small body; slug derived from the SBDB designation), `sb:433-eros`
- `sat:25544` (NORAD catalog number; 6-digit numbers are supported)
- `sc:voyager-1` (spacecraft), `event:<uuid or slug>`, `news:<hash>`

URLs use the slug part with a kind prefix route (see §20).

### 8.2 Core TypeScript types (`packages/domain/src`)
```ts
export type EntityKind = 'star'|'planet'|'moon'|'dwarf'|'asteroid'|'comet'|'satellite'|'spacecraft'|'barycenter';
export type Certainty = 'computed'|'propagated'|'reconstructed'|'observed'|'predicted'|'planned'|'approximate';
export type PositionMethod = 'analytic-ephemeris'|'sampled-ephemeris'|'kepler-2body'|'mean-elements'|'sgp4'|'static';
export type FrameId = 'ICRF_SSB'|'ICRF_HELIO'|'ICRF_EMB'|`ICRF_BODY:${string}`|`FIXED:${string}`|'TEME_EARTH';

export interface Provenance {
  providerId: string;          // 'jpl-horizons' | 'celestrak' | 'astronomy-engine' | ...
  providerObjectId?: string;   // e.g. Horizons '-31', NORAD '25544'
  sourceTimestamp?: string;    // ISO, when provider produced it
  ingestedAt?: string;         // ISO
  epoch?: string;              // element/ephemeris epoch (ISO TDB/UTC stated)
  method: PositionMethod;
  certainty: Certainty;
  validFrom?: string; validTo?: string;
  uncertaintyNote?: string;    // human-readable
  reference?: string;          // DE440, SGP4 (Vallado 2006), etc.
}

export interface PhysicalProps { meanRadiusKm?: number; equatorialRadiusKm?: number; polarRadiusKm?: number;
  massKg?: number; diameterKmEstimate?: [min:number,max:number]; absoluteMagnitudeH?: number; albedo?: number; }

export interface SpaceEntity {
  id: string; kind: EntityKind; name: string; aliases: string[];
  parentId?: string;            // 'planet:earth' for sat/moon; 'star:sun' for planets
  physical?: PhysicalProps;
  position: PositionSourceRef;  // how to obtain state (see 8.3)
  provenance: Provenance;
  tags: string[];               // 'pha','neo','station','starlink','mission-active'
  metadata?: Record<string, unknown>; // kind-specific (mission status, launch date, NORAD info)
}
```
Use kind-specific *metadata interfaces* (e.g. `SpacecraftMeta`, `SatelliteMeta`) discriminated by `kind`. That avoids "one giant universal table" and also avoids "totally separate schemas".

### 8.3 Position providers (the core abstraction, §18: "Where is X at time T?")
```ts
export interface StateResult { ok: true; frame: FrameId; certainty: Certainty; stale: boolean; }
export type StateFailure = { ok: false; reason: 'out-of-validity'|'no-data'|'loading' };

export interface PositionProvider {
  readonly id: string;
  readonly frame: FrameId;                 // frame the raw state is expressed in
  readonly validity: { fromTdb: number; toTdb: number } | 'unbounded';
  readonly method: PositionMethod;
  /** Writes [x,y,z,vx,vy,vz] (km, km/s) into out at offset. Must not allocate. */
  stateAt(tdbSec: number, out: Float64Array, offset?: number): StateResult | StateFailure;
  certaintyAt(tdbSec: number): Certainty;  // e.g. spacecraft: reconstructed before 'now', predicted after
}
```
Implementations: `AstronomyEngineProvider`, `SampledEphemerisProvider` (Hermite-interpolated tables), `KeplerProvider` (SBDB elements), `MeanElementsProvider` (JPL sat elements), `Sgp4BatchProvider` (worker-backed, batch), `StaticProvider`.

---

## 9. Time Architecture (§10 deliverable, §18–20)

### 9.1 Time scales (`packages/astro/src/time`)
- **Canonical simulation time:** `tdb` = TDB seconds since J2000.0 (2000-01-01T12:00:00 TT), as a float64. Float64 precision is ~microseconds across ±10,000 years.
- Conversions (pure functions, fully tested):
  - `utcMsToTai(ms)` via a **leap-second table** (`leapSeconds.ts`, IERS Bulletin C, last entry 2017-01-01 TAI−UTC=37 s). Include a test that fails if the table's "valid until" date is in the past, so it gets reviewed.
  - `TT = TAI + 32.184 s`.
  - `TDB ≈ TT + 0.001657·sin(g) + 0.000014·sin(2g)`, with `g = 357.53° + 0.98560028°·d`. Accuracy is ~µs–ms, fine for visualization.
  - `jdTdb = 2451545.0 + tdb/86400`.
  - `utcToUt1 ≈ UTC` (|UT1−UTC| < 0.9 s) [A: document this; ΔUT1 isn't needed at our accuracy].
- **astronomy-engine** takes `AstroTime` built from UT. Adapter: `toAstroTime(tdb)` → `Astronomy.MakeTime(utcDate)`. Document the < 1 s mismatch; it's irrelevant visually. Tests compare against Horizons within tolerance.
- **satellite.js** takes a JS `Date` (UTC). Adapter: `tdbToUtcDate(tdb)`.

### 9.2 SimulationClock (`packages/astro/src/clock/SimulationClock.ts`), pure and deterministic
```ts
type ClockMode = 'live'|'playing'|'paused';
interface ClockState { mode: ClockMode; rate: number /* sim s per real s, may be negative */;
  anchorRealMs: number; anchorTdb: number; }
tdbAt(realMs) = anchorTdb + rate * (realMs - anchorRealMs)/1000   // mode !== 'paused'
```
- `live`: `rate=1`, and anchorTdb is re-synced to wall clock. Any user scrub/speed change switches to `playing`/`paused`.
- API: `play(rate)`, `pause()`, `setTime(tdb)`, `setRate(rate)`, `goLive({animate:true})`, `tick(realMs)` (called once per frame by the engine; returns tdb), `subscribe(cb, {hz})` (throttled UI notifications; default 4 Hz).
- **Smooth return to LIVE:** if |Δt| < 1 day, animate `tdb` with an ease-in-out over 1.2 s. Otherwise do a 0.4 s cross-fade (dim, jump, undim) plus a toast "Jumped to now". The camera keeps the same target (object-relative), so the jump doesn't feel spatial.
- Clamp to a **global validity range** (default 1900-01-01 … 2100-12-31 for MVP). The UI shows why.
- Preset speeds: `1, 10, 100, 60 (1 min/s), 3600, 86400, 2.6298e6 (1 mo/s), 3.15576e7 (1 yr/s)`, each also negative.
- Every time-dependent system reads `tdb` from **one** `clock.tick()` result per frame, passed down as `FrameContext`. **No feature keeps its own timer.**

### 9.3 Certainty by type (§19): rendered and stored, never implied
| Type | Past | Now | Future |
|---|---|---|---|
| Planets/major moons (astronomy-engine / DE-based) | computed | computed | computed (within validity) |
| Mean-element moons | approximate | approximate | approximate |
| Asteroids (2-body from elements) | propagated; confidence decays with \|t−epoch\| | propagated | propagated/predicted |
| Earth satellites (SGP4) | propagated; warn if \|t−epoch\| > 3 days; hide if > 30 days [A] | propagated | propagated; same thresholds |
| Spacecraft (Horizons tables) | reconstructed | reconstructed/predicted | predicted/planned (dashed line + badge) |

---

## 10. Coordinate Architecture (§11 deliverable, §22–23)

- **Canonical inertial frame:** ICRF axes (≈ J2000 mean equator/equinox, what astronomy-engine calls **EQJ**). Origin: **Solar System Barycenter (SSB)**. Units: **km, km/s**. Storage: float64.
- **Frame tree** (`packages/astro/src/frames/FrameTree.ts`). Each node has an origin (a position provider relative to its parent) and an orientation (identity for inertial frames, a time-dependent rotation for body-fixed ones):
  ```
  ICRF_SSB
   ├─ ICRF_HELIO (Sun)
   ├─ ICRF_EMB (Earth-Moon barycenter)
   │   ├─ ICRF_BODY:earth ──┬─ FIXED:earth (ITRF≈ via ERA + precession/nutation)
   │   │                    └─ TEME_EARTH (SGP4 output)
   │   └─ ICRF_BODY:moon ── FIXED:moon (IAU rotation)
   ├─ ICRF_BODY:mars ── FIXED:mars ; children: phobos, deimos
   ├─ ICRF_BODY:jupiter ── io, europa, ganymede, callisto
   └─ ... future: ICRF_STAR:<id> → galactic frame
  ```
- **Transforms live only in `packages/astro`**: `transformState(state, fromFrame, toFrame, tdb, out)`. No other package does frame math (lint rule).
- **Body orientation:** `Astronomy.RotationAxis(body, time)` gives pole RA/Dec + spin angle W (IAU WGCCRE). Build the quaternion ICRF→body-fixed from it. Earth uses precise Earth-rotation (ERA/GAST via astronomy-engine `SiderealTime` + `Rotation_EQJ_EQD`).
- **TEME → ICRF (satellites):** TEME ≈ true equator/equinox of date. Use `Rotation_EQD_EQJ(time)` from astronomy-engine. The equation-of-equinoxes difference is < 1 arcsec, i.e. ~0.03 km at GEO. That's fine; document it and test against a known reference. Do the rotation **in the worker** in batch.
- **Topocentric / observer (future):** `FIXED:earth` + geodetic lat/lon/height (WGS-84) → ENU → alt/az. Reserve `FrameId` `TOPO:<lat>,<lon>,<h>`. It's not built in MVP but the frame tree supports it.
- **Display coordinates are separate** (§21): `DisplayTransform` maps physical state → render state (see §12.4). It never writes back to physical state.

---

## 11. Precision / Large-World Architecture (§12 deliverable, §24)

**Problem:** float32 on the GPU has ~7 significant digits. At 1 AU (1.5e8 km) absolute resolution is ~10–20 km, so jitter is visible when orbiting a satellite 400 km up while Earth sits at 1 AU from the world origin.

**Solution (layered):**
1. **Float64 CPU world, camera at origin (camera-relative rendering).** The camera's world position `C` is float64. For each rendered object, `rel = P_obj − C` is computed in float64, then written into `mesh.position` (float32). The GPU never sees large absolute coordinates. The Three.js camera stays at (0,0,0), with only its orientation set.
2. **Hierarchical local groups:** bulk objects near a body (satellites around Earth, moons around Jupiter) store float32 positions **relative to their parent** (max ~400,000 km, ≈0.03 km resolution). They render inside a `THREE.Group` whose position is the parent's camera-relative float64→float32 offset. That keeps per-frame updates to one group transform instead of thousands of points.
3. **Depth precision:** enable `logarithmicDepthBuffer: true` on `WebGPURenderer` [R: supported]. In P1.6, measure z-fighting at: Earth surface ↔ cloud layer (10 km gap) viewed from 400 km and from 1e6 km; Saturn rings; far planets. If log depth costs too much, or breaks a TSL material, evaluate **reversed-Z** (`reversedDepthBuffer`) [A: verify availability in r186 WebGPU and WebGL backends].
4. **Scaled-space proxies for very far objects** (only if needed after step 3): an object at distance `d > D_proxy` (e.g. 1e7 km) renders at `d' = D_proxy + log10(d/D_proxy)·k`, with radius scaled by `d'/d`. Angular size and direction stay identical. It's a common space-sim technique, and depth ranges stay small.
5. **Dynamic near/far:** `near = clamp(0.001 · distanceToNearestSurface, 0.001 km, 1000 km)`, `far = 1e12 km`, recomputed per frame.
6. **Render units: 1 unit = 1 km** (simple and debuggable). With camera-relative rendering, Voyager at ~2.5e10 km still fits float32 range; relative precision only matters near the camera.
7. **Future stellar scale:** add frame nodes with their own local origins (`ICRF_STAR:*`, pc/ly units) and the same camera-relative subtraction per node. No redesign needed.

**Tests (P1.6):** automated "jitter probe": place the camera 400 km above Earth with Earth at its real 1 AU position, orbit for 10 s, and assert per-frame screen-space jitter of a surface marker < 0.5 px (read back via projected coordinates in float64 vs float32 path).

---

## 12. Rendering Architecture (§13 deliverable, §25–28, §42–44)

### 12.1 Engine package layout (`packages/engine/src`)
```
SpaceEngine.ts           // public facade: init, dispose, commands, events
core/FrameLoop.ts        // renderer.setAnimationLoop; builds FrameContext {tdb, dtReal, camera, quality}
core/FrameContext.ts
render/RendererFactory.ts// WebGPURenderer create/init, backend detection, forceWebGL, device-lost handling
render/PostFX.ts         // bloom + tone mapping (node pipeline), tier-dependent
scene/EntityRegistry.ts  // id -> RenderEntity (representation, provider, parent group)
scene/SceneGraph.ts      // local groups per frame node; camera-relative update pass
scene/DisplayTransform.ts// True/Explore scale mapping
bodies/PlanetFactory.ts  // builds body meshes from BodyVisualSpec
bodies/materials/*.ts    // TSL materials: earth, cloud, atmosphere, moon, mars, sun, gasGiant, rings
bodies/Starfield.ts      // BSC5 points + Milky Way sky
lod/LodSystem.ts         // point -> sprite -> mesh -> detail per entity
layers/PointLayer.ts     // instanced/Points bulk renderer (satellites, asteroids)
layers/OrbitLayer.ts     // orbit polylines (fat lines), styles by certainty
labels/LabelSystem.ts    // DOM label pool + screen-space declutter grid
camera/CameraController.ts, camera/Transitions.ts, camera/Input.ts
picking/Picker.ts        // CPU ray/sphere + screen-space nearest-point for bulk layers
quality/QualityManager.ts// tier detection, adaptive DPR, budgets
assets/AssetManager.ts   // KTX2/texture loading, caching, tier-based resolution, dispose
perf/PerfMonitor.ts      // fps, frame time, draw calls, triangles, textures, GPU mem estimate
bridge/EngineEvents.ts   // typed event emitter (selection, hover, fps, errors, clock)
```

### 12.2 Frame update order (single loop, zero allocations in hot path)
1. `tdb = clock.tick(now)`
2. Input → camera controller integrates (float64 camera state in target frame).
3. Resolve frame-tree node world positions at `tdb` (cache per frame).
4. Evaluate providers for **visible/near** entities only. Bulk layers get their results from workers asynchronously (double-buffered).
5. `DisplayTransform` → display positions/radii.
6. Camera-relative pass: set group/mesh float32 positions; set sun-light direction per body.
7. LOD + culling (frustum + angular size), labels (every 2nd frame at 30 Hz is fine).
8. `renderer.render` via post-processing pipeline.
9. PerfMonitor sample. Emit throttled events (≤ 4 Hz) to the UI.

Rules: reuse `Vector3`/`Float64Array` scratch objects; **no `new` inside the loop** (lint check via code review + a perf test measuring GC pauses).

### 12.3 LOD (§26)
| Apparent size on screen | Representation |
|---|---|
| < 2 px | Point in a bulk `Points`/instanced layer (or skipped by semantic zoom) |
| 2–12 px | Billboard sprite with color/glow; label candidate |
| 12–200 px | Sphere mesh (64 segments), 1–2k textures |
| > 200 px | High-detail mesh (128–256 segments), 4k–8k textures (tier-dependent), atmosphere, clouds |

Hysteresis of ±15% prevents flicker. Textures load progressively: a 1k placeholder is embedded, then 4k/8k stream in via KTX2.

### 12.4 True Scale vs Explore Scale (§21)
- **True:** radii and positions are physical.
- **Explore:** positions stay physical. **Radius boost** `b(d) = clamp((d / (R·Kfade))^α, 1, Bmax)`, with `Kfade=50`, `α≈0.6`, `Bmax` ≈ 1000 for planets and 200 for moons [A: tune]. The boost fades to 1 near the body. Children of a boosted parent (moons) get **radial offset boosted by the same `b` of the parent** so they stay outside it. Markers have a minimum pixel size. Orbit lines stay physical.
- Mode is part of URL state (`scale=true|explore`). The default is Explore. The object card always shows **physical** values.

### 12.5 Planet rendering (§27), all TSL, based on the three.js `webgpu_tsl_earth` example pattern
- **Earth:** day albedo (Blue Marble), night lights (Black Marble) blended by a smoothstep on N·L at the terminator; ocean specular mask; normal map; cloud shell (+0.3% radius), rotating independently, with optional cloud shadows (sample the cloud texture offset along the sun direction); **atmosphere shell** with single-scattering approximation (Rayleigh + Mie phase, view-ray thickness via analytic sphere intersection) and a fresnel rim. Axial tilt and rotation come from the frame tree.
- **Moon:** LROC color + LOLA displacement/normal. **Lommel–Seeliger/Hapke-like** lunar BRDF for a flat full-moon look.
- **Mars:** Viking MDIM color + MOLA normal, a thin dusty-orange atmosphere rim (cheap fresnel variant).
- **Sun:** emissive sphere with animated 3D noise granulation and limb darkening, a corona billboard, and bloom. The Sun is a `PointLight` at its camera-relative position (decay 0). Per-body shading uses the sun direction per fragment.
- **Later (Phase 3):** Jupiter/Saturn/Uranus/Neptune band textures and atmosphere rim, **Saturn rings** with Mie forward scattering and planet shadow on rings plus ring shadow on planet (analytic).
- **Tone mapping:** ACES/AgX, exposure auto-adjusted by distance to the Sun (subtle).
- **Stars:** BSC5 points sized by magnitude, color by B−V, plus a Milky Way equirect background (Deep Star Maps, 4k/8k by tier).

### 12.6 Semantic zoom and labels (§25, §42)
- The **scale band** comes from camera distance to the focus body: `SATELLITE (<50 km from selected sat)`, `EARTH_ORBIT (< 1e5 km of Earth)`, `EARTH_MOON (< 2e6 km)`, `PLANETARY (< 1e8 km of a planet)`, `SOLAR_SYSTEM`. Each layer declares visibility per band.
- **Labels:** pooled DOM elements (`transform: translate3d`), updated at ~30 Hz. **Greedy declutter** on a screen grid by priority: selected > hovered > major body > event-related > layer objects. Satellite layer: no labels except the selected one. Labels are `aria-hidden`. Accessible names come from the object list/search (§23).

### 12.7 Orbits (§44)
- Planets: subtle (opacity 0.25), computed once per ~orbit period, sampled with adaptive curvature.
- Minor objects: hidden, except the selected one (and the hovered one, briefly).
- Style by certainty: **solid** = computed/reconstructed; **dashed** = predicted; **dotted + fading** = uncertain/approximate. The past portion is dimmer than the future portion for spacecraft.

### 12.8 Picking
Meshes use a CPU ray-sphere test in float64. Bulk points pick in screen space: the nearest projected point within 12 px desktop / 24 px touch, computed from the worker's latest positions. No GPU readback is needed in MVP.

---

## 13. Camera Architecture (§14 deliverable, §12–13)

- **State (float64):** `targetId`, `frameId` (inertial `ICRF_BODY:x` or `FIXED:x`), `distance`, `azimuth`, `elevation`, `roll=0`, `panOffset` (small, clamped). The world position is derived through the frame tree each frame.
- **Zoom:** exponential. `distance *= exp(−wheelDelta·k)`, with inertia (critically damped spring).
  - `minDistance = R_display·1.05` (surface "collision").
  - `maxDistance = 200 AU` (Solar-System band). Zoom speed ∝ distance, so it scales from km to AU.
- **Orbit:** drag → az/el with damping; elevation clamped to ±89.5°.
- **Pan:** limited to 0.5×distance around the target. Double-click/tap recenters.
- **Focus/fly-to (`Transitions.ts`):**
  1. Compute start and end camera states in a **common parent frame** (the lowest common ancestor in the frame tree).
  2. Interpolate **log(distance)** and target position along an arc: rise to `max(d0,d1, |P0−P1|·0.6)` mid-way for a "zoom out, travel, zoom in" feel.
  3. Duration `= clamp(1.2 + 0.6·|log10(d_end/d_start)| + 0.4·log10(1+|P0−P1|/1e6), 1.2, 6) s`. Easing is ease-in-out cubic on a normalized path parameter.
  4. At the end, switch `frameId` to the target's frame **without a visual jump**: recompute az/el/distance so the pose is identical.
  5. **Reduced motion:** duration 0.3 s cross-fade instead.
- **Follow:** camera state is expressed in the target's inertial frame (or fixed frame for "ride along"), so moving targets stay framed.
- **History:** stack of `{targetId, frameId, distance, az, el}`. Back button / `Backspace` pops with a transition.
- **Input:** Pointer Events (mouse/touch/pen unified), pinch = two-pointer distance, wheel. No hover needed on touch. Keyboard: arrows orbit, `+/-` zoom, `F` focus selected, `Esc` deselect, `Space` play/pause, `L` live, `[`/`]` speed, `/` search.

---

## 14. Backend Architecture (§15 deliverable, §45–48)

```
 Providers (JPL, CelesTrak, MPC, RSS)
        │  (GitHub Actions cron, Node, one request at a time, UA header, stop on non-200)
        ▼
 packages/ingest: Provider adapters → Zod validate → normalize → domain model
        │
        ▼
 Neon Postgres (Drizzle)  ── ingestion_runs, provider_state (freshness)
        │
        ▼
 apps/web route handlers /api/v1/*  (read-only, Zod DTOs, Cache-Control s-maxage + SWR)
        │   Vercel CDN
        ▼
 Browser: UI (React) + Space Engine + Workers
```
- **Adapters** (`packages/ingest/src/providers/*`): `CelesTrakProvider`, `JplSbdbProvider`, `JplCadProvider`, `JplHorizonsProvider`, `MpcRecentProvider`, `NasaNewsProvider`, `JplNewsProvider`, `EsaNewsProvider`, `LaunchProvider` (stub, post-MVP). Each implements:
  ```ts
  interface ProviderAdapter<Raw, Norm> { id: string; schedule: { minIntervalMin: number };
    fetch(ctx: FetchCtx): Promise<Raw>;      // uses shared politeFetch (UA, timeout, 1-at-a-time queue, backoff, stop-on-non-200)
    validate(raw: unknown): Raw;             // zod
    normalize(raw: Raw): Norm[];             // → domain records + provenance
    persist(norm: Norm[], db: Db): Promise<PersistResult>; }
  ```
- **Runner:** `pnpm ingest:due` reads `provider_state.next_run_at` and runs due providers **sequentially**. It records `ingestion_runs` and updates `provider_state` (last_success_at, last_error, consecutive_failures, next_run_at with exponential backoff). One GitHub Actions workflow runs every 2 h (`cron: '17 */2 * * *'`); the runner decides what's due, so Actions minutes stay small.
- **Snapshots:** satellite groups are stored as **one JSONB snapshot row per group per update** (`layer_snapshots`) and served as-is. Spacecraft/encounter trajectories are stored as **binary Float64 tables** (`trajectories.samples bytea`), served with an immutable `?v=<hash>` URL.
- **Free-tier protection:** every `/api/v1` GET sets `Cache-Control: public, s-maxage=<ttl>, stale-while-revalidate=<2·ttl>`, so most traffic never reaches Neon.
- **Static data in the repo:** body physical constants, visual specs, mean-element moons, curated spacecraft list, curated mission milestones (`packages/domain/data/*.json`, each record with a source URL).

---

## 15. Database Proposal (§16 deliverable, §50)

Postgres (Neon) with extensions `pg_trgm` and `unaccent`. No PostGIS in MVP (nothing geospatial on Earth's surface yet). Revisit for observer features.

```sql
create table data_sources (id text primary key, name text not null, homepage text, license text not null,
  attribution text not null, terms_url text, notes text);

create table objects (id text primary key,                -- 'planet:mars', 'sat:25544'
  kind text not null, name text not null, parent_id text references objects(id),
  status text,                                             -- active, decayed, retired, planned
  physical jsonb not null default '{}', metadata jsonb not null default '{}',
  tags text[] not null default '{}', importance smallint not null default 0,  -- search/label ranking
  created_at timestamptz default now(), updated_at timestamptz default now());
create index on objects (kind); create index objects_tags_gin on objects using gin(tags);

create table object_aliases (object_id text references objects(id) on delete cascade, alias text not null,
  alias_norm text not null, alias_type text not null,     -- name, designation, norad, cospar, horizons_id, mission
  primary key (object_id, alias_norm));
create index object_aliases_trgm on object_aliases using gin (alias_norm gin_trgm_ops);

create table provider_records (id bigserial primary key, object_id text references objects(id) on delete cascade,
  source_id text references data_sources(id), provider_object_id text, source_timestamp timestamptz,
  ingested_at timestamptz default now(), payload_hash text, raw jsonb);   -- raw kept small or pruned (30 d)

create table orbit_elements (object_id text references objects(id) on delete cascade, source_id text,
  epoch_tdb_jd double precision not null, frame text not null,          -- 'ICRF_HELIO ecliptic J2000' etc.
  e double precision, a_km double precision, q_km double precision, i_deg double precision,
  om_deg double precision, w_deg double precision, ma_deg double precision, n_deg_per_day double precision,
  uncertainty jsonb, condition_code text, valid_from timestamptz, valid_to timestamptz,
  ingested_at timestamptz default now(), primary key (object_id, source_id, epoch_tdb_jd));

create table trajectories (id text primary key, object_id text references objects(id) on delete cascade,
  source_id text, center_frame text not null, t0_tdb double precision, t1_tdb double precision,
  certainty text not null,                                  -- reconstructed|predicted|planned
  sample_count int, format text not null default 'f64:t,x,y,z,vx,vy,vz',
  samples bytea not null, content_hash text not null, generated_at timestamptz default now());

create table layer_snapshots (layer text not null, group_key text not null, source_id text,
  source_timestamp timestamptz, ingested_at timestamptz default now(), record_count int,
  content_hash text, payload jsonb not null, primary key (layer, group_key, ingested_at));

create table events (id text primary key, type text not null, title text not null, summary text,
  start_time timestamptz not null, end_time timestamptz, peak_time timestamptz,
  status text not null default 'scheduled',                 -- scheduled|occurred|cancelled|estimated
  confidence text, source_id text, source_url text, map_state jsonb not null,
  importance smallint default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create index on events (start_time); create index on events (type);

create table event_objects (event_id text references events(id) on delete cascade,
  object_id text references objects(id) on delete cascade, role text not null,  -- primary|secondary|observer
  primary key (event_id, object_id));

create table news_items (id text primary key,               -- sha1(url)
  source_id text references data_sources(id), url text not null unique, title text not null,
  summary text, published_at timestamptz not null, image_url text, image_credit text, image_license text,
  fetched_at timestamptz default now());
create index on news_items (published_at desc);

create table news_object_links (news_id text references news_items(id) on delete cascade,
  object_id text references objects(id) on delete cascade, method text not null,  -- alias|designation|mission|manual
  confidence real not null, primary key (news_id, object_id));
create table news_event_links (news_id text references news_items(id) on delete cascade,
  event_id text references events(id) on delete cascade, method text not null, confidence real not null,
  primary key (news_id, event_id));
create table link_overrides (news_id text, target_id text, action text check (action in ('add','remove')),
  note text, created_at timestamptz default now(), primary key (news_id, target_id));

create table discoveries (object_id text primary key references objects(id) on delete cascade,
  designated_at timestamptz, discovery_date date, discovery_site text, mpec_id text, source_id text,
  created_at timestamptz default now());

create table provider_state (provider_id text primary key, last_run_at timestamptz, last_success_at timestamptz,
  next_run_at timestamptz, consecutive_failures int default 0, last_error text, last_http_status int);
create table ingestion_runs (id bigserial primary key, provider_id text, started_at timestamptz, finished_at timestamptz,
  ok boolean, records_in int, records_upserted int, http_status int, error text);
```
**Future accounts:** add `users`, `saved_views`, `follows`, and `alert_prefs` referencing `objects.id` / `events.id`. Nothing in the MVP schema assumes anonymity.

**Where things live (§50):**
| Location | Contents |
|---|---|
| Postgres | Objects, aliases, elements, trajectories, snapshots, events, news, links, freshness, runs |
| CDN cache (Vercel) | All `/api/v1` GET responses (TTL by resource) |
| Static assets (`apps/web/public`, CDN) | Textures (KTX2), star catalog binary, curated JSON, mean elements |
| Object storage | Not needed in MVP. If textures exceed repo/deploy limits, move them to Cloudflare R2 (free tier, zero egress) [A] |
| Client memory | Current snapshot of layers, provider caches, search index, textures on GPU, IndexedDB cache for satellite snapshots (≤ 2 h) |

---

## 16. Internal API (§51)

All routes are under `/api/v1`, read-only, with Zod-validated query params and a response envelope `{ data, meta: { generatedAt, sources:[{id, sourceTimestamp}], stale:boolean } }`.

| Endpoint | Purpose | Cache TTL |
|---|---|---|
| `GET /objects/search?q=&kinds=&limit=` | Universal search (aliases, trigram + prefix, ranked by importance) | 300 s |
| `GET /objects/:id` | Entity + physical + provenance + related events/news (ids) | 3600 s |
| `GET /objects/:id/position-source` | How the client computes position: provider descriptor + elements or trajectory URL | 3600 s |
| `GET /objects/:id/state?t=ISO` | Server-computed state (for SSR/share cards/tests, not used per frame) | 60 s |
| `GET /layers/satellites?group=stations` | OMM snapshot (+ sourceTimestamp) | 1800 s |
| `GET /layers/asteroids?set=close-approaches|notable|recent` | Elements + metadata list | 3600 s |
| `GET /trajectories/:id?v=hash` | Binary samples (`application/octet-stream`) | immutable (1 y) |
| `GET /events?from=&to=&type=` / `GET /events/:id` | Events with map_state | 600 s |
| `GET /news?cursor=&source=` / `GET /news/:id` | News items + linked objects/events | 600 s |
| `GET /discoveries?limit=` | Recently designated NEOs | 1800 s |
| `GET /status` | Provider freshness (public, human-readable page also at `/status`) | 60 s |

No third-party payloads pass through: DTOs are ours (§51).

---

## 17. Event Architecture (§17 deliverable, §35)
```ts
interface SpaceEvent { id; type: 'close-approach'|'launch'|'conjunction'|'arrival'|'flyby'|'discovery'|'reentry'|'eclipse'|'milestone'|'planetary';
  title; summary?; startTime; endTime?; peakTime?; status; confidence?; source: {id, url?};
  objects: {id, role}[]; mapState: MapState; relatedNewsIds: string[]; importance: number; }
interface MapState { t: string /*ISO UTC*/; focus: string; secondary?: string; frame?: FrameId;
  layers?: string[]; scale?: 'true'|'explore'; playback?: { from: string; to: string; rate: number };
  camera?: { preset: 'fit-both'|'close'|'wide' } }
```
- **Generators:**
  1. CAD → close-approach events. Map state: Earth + asteroid, `frame=ICRF_BODY:earth`, playback ±2 days around the peak at 1 h/s. It also triggers a Horizons encounter-trajectory job.
  2. Curated milestones YAML (`packages/domain/data/milestones.yaml`) for spacecraft arrivals/flybys.
  3. astronomy-engine computed events for the next 12 months: oppositions (`SearchRelativeLongitude`), lunar/solar eclipses (`SearchLunarEclipse`, `SearchGlobalSolarEclipse`), planetary conjunctions. They're generated nightly and stored.
  4. Discoveries → `discovery` events.
- **"See it" flow:** the UI calls `engine.applyMapState(mapState)` → sets clock time (animated if near), enables layers, loads providers, runs the camera fit-transition, then optionally starts playback.

---

## 18. News Architecture (§18 deliverable, §36–38)
- Ingest RSS (NASA, JPL, ESA). Store title, URL, date, summary (sanitized plain text, ≤ 400 chars), and an image URL **only when the license allows** (NASA: yes with credit; ESA: no image in MVP).
- **Entity linking (deterministic):**
  1. Normalize the text (lowercase, unaccent).
  2. Match against `object_aliases` (word-boundary, longest-first; ambiguous short aliases like "Io" or "Mars" need context words or a title match).
  3. Match the designation regex for small bodies (`\b(19|20)\d{2}\s?[A-Z]{2}\d{0,3}\b`, numbered `\(\d+\)\s?Name`).
  4. Match the mission-name dictionary (spacecraft aliases).
  5. Compute confidence: title match 0.9, body match 0.6, ambiguous 0.3. Show links with ≥ 0.6.
  6. Apply `link_overrides`.
- Buttons: "View in Space" (object), "See encounter" (event), with the map state built from the linked target.
- **Never scrape article HTML.** RSS content only, and link out to the source.

---

## 19. Search Architecture (§19 deliverable, §39)
- **Client instant search:** a MiniSearch index of the ~40 core bodies/spacecraft (static, bundled) plus currently loaded satellites (names, NORAD). Results in < 16 ms.
- **Server search:** `/objects/search` over `object_aliases` (trigram similarity + prefix + importance boost) for asteroids/events/everything else. The client merges both result sets, deduplicating by id.
- **Selecting a result** → `engine.select(id)` → `flyTo` → open the compact card → optionally change frame (satellites → Earth frame).
- **NL-ready:** search and events are exposed as typed functions (`searchEntities`, `findEvents({type, from, to, near})`, `buildMapState`) so a future LLM layer can call them as tools. No LLM in MVP.

---

## 20. Shareable Universe State (§52)
- Routes: `/` (Explore), `/object/[kind]/[slug]` (e.g. `/object/planet/mars`, `/object/sb/2024-yr4`, `/object/sat/25544`, `/object/sc/voyager-1`), plus friendly aliases `/mars` → redirect. Also `/event/[id]`, `/news`, `/news/[id]`, `/about/data`, `/status`.
- Query params (stable): `t=2026-09-22T19:00:00Z` (absent = LIVE), `layers=sat.stations,neo`, `scale=explore|true`, `frame=earth|helio|earth-fixed`, `view=close|wide`. The camera's exact floats are **not** serialized.
- The URL updates via `history.replaceState` (debounced 500 ms) on meaningful changes only, with `pushState` on selection change.
- SSR generates `<title>`/OpenGraph tags per object/event for link previews (server computes the description, e.g. "Mars is 1.52 AU from the Sun").

---

## 21. Observer Architecture (§20 deliverable, §30): future, designed now
- Frame `TOPO:<lat>,<lon>,<h>` child of `FIXED:earth`.
- `ObserverContext` store (lat/lon from a user input or geolocation, *later*). Rise/set/culmination via astronomy-engine `SearchRiseSet`, `Horizon`. Satellite passes via SGP4 + topocentric look angles (satellite.js `ecfToLookAngles`).
- Camera "sky view" mode = camera in the TOPO frame looking outward. It reuses the same engine.
- Nothing hardwires heliocentric viewing: the camera always operates in an arbitrary frame-tree node.

---

## 22. Performance Budget (§21 deliverable, §53): measure rather than guess
| Metric | Desktop target (mid-range: RTX 3060 / Apple M1, 1440p, HIGH) | Mobile target (iPhone 13 / Pixel 7, MEDIUM/LOW) |
|---|---|---|
| FPS (steady, Solar System view) | ≥ 60 (p95 frame time ≤ 16.7 ms) | ≥ 30 (p95 ≤ 33 ms) |
| FPS (Earth close-up, atmosphere + clouds) | ≥ 60 | ≥ 30 |
| Initial JS (gzip) for route shell | ≤ 200 KB | same |
| Engine chunk (lazy, gzip) | ≤ 450 KB | same |
| Time to first rendered frame (cold, broadband / 4G) | ≤ 2.5 s | ≤ 5 s |
| Texture GPU memory | ≤ 600 MB ULTRA, ≤ 350 MB HIGH | ≤ 128 MB |
| Draw calls (typical view) | ≤ 300 | ≤ 150 |
| Satellites rendered (points) | 10,000 at 60 fps (stretch 30,000) | 2,000 |
| Asteroids rendered (points) | 5,000 | 1,000 |
| Detailed meshes simultaneously | ≤ 12 | ≤ 6 |
| SGP4 update cadence | full batch 2 Hz, in-view interpolated per frame | 1 Hz |
| Main-thread long tasks during navigation | 0 > 50 ms | 0 > 100 ms |
| GC pauses in loop | none > 5 ms during 60 s orbit | same |

`PerfMonitor` + `?perf=1` overlay + a Playwright perf script (headless measures CPU-side only; GPU numbers come from the manual device matrix in `docs/perf/device-matrix.md`).

## 23. Mobile Strategy (§22, §57)
AUTO tier picks LOW/MEDIUM on mobile. DPR is capped at 1.5 (LOW 1.0). 2k textures, no cloud shadows, simpler atmosphere, bloom off on LOW. The bottom sheet object card uses snap points. The compact timeline collapses to date + play + speed. Tap selects with a larger pick radius. Double-tap focuses. No hover-dependent features. Test on real iOS Safari 26 and Android Chrome.

## 24. Accessibility (§23, §56)
Semantic HTML UI, all controls keyboard-reachable with visible focus, Radix primitives, WCAG AA contrast. `prefers-reduced-motion` means no cinematic flights (cross-fade instead) plus a setting toggle. An offscreen `aria-live` region announces the selection ("Selected Mars, 1.52 AU from the Sun"). Object cards are fully readable text. The canvas has `role="application"` with instructions. The "Objects in view" list (screen-reader alternative) is reachable via keyboard shortcut.

## 25. Security (§24, §65)
No secrets on the client. `DATABASE_URL` lives only in Vercel env and GitHub Actions secrets. The API is read-only with Zod-validated params (length limits, enum checks); SQL goes through Drizzle, parameterized. Feed text is sanitized (strip HTML, plain text only). Image URLs must match an allowlist of hosts. CSP headers: `default-src 'self'`, allow CDN image hosts, `worker-src 'self' blob:`. Basic rate limiting on `/objects/search` (Vercel middleware + in-memory token bucket per IP; upgrade later). No user data is stored in MVP.

## 26. Reliability (§25, §64)
| Failure | Behavior |
|---|---|
| JPL/MPC/CelesTrak/news down | Serve last snapshot, `meta.stale=true`, card shows "Data last updated 9 h ago". The ingestion runner backs off exponentially and stops on non-200 (CelesTrak rule) |
| Satellite elements stale | Warning > 3 d; hide the object > 30 d with an explanation |
| Spacecraft ephemeris out of range | Hide from scene at that time; card says "No trajectory data for this date" |
| WebGPU unavailable / device lost | Auto WebGL2; on `device.lost` re-init renderer once, else show a WebGL2-forced reload prompt |
| GPU memory constrained / low FPS | QualityManager drops tier (adaptive DPR first, then textures/effects), with a toast |
| No WebGL2 | Static fallback page with news and search (non-3D) |

## 27. Observability (§66)
Sentry (client + server) for errors, including tags `renderer.backend`, `quality.tier`, `gpu.vendor`. Sampled perf beacon (5% of sessions, once after 30 s: backend, tier, median FPS, p95 frame time) → `/api/v1/telemetry` → a `perf_samples` table with row pruning at 30 days to respect free limits. `/status` page from `provider_state`. The GitHub Actions ingestion job fails loudly (email notification) on provider errors. Search failures and broken event links (map_state targets missing) get logged to Sentry as warnings.

## 28. Testing Strategy (§26 deliverable, §67–68)
**Scientific (Vitest, `packages/astro/test`)**, with reference fixtures generated **once** by `tools/fixtures/fetch-horizons.ts` (sequential requests, committed JSON with query + Horizons version):
| Test | Reference | Tolerance [A: tighten after first run] |
|---|---|---|
| UTC→TT→TDB, JD | Known epochs incl. J2000 (JD 2451545.0 TT), leap second 2016-12-31T23:59:60 | exact / < 1e-6 s |
| Planet positions (SSB, ICRF), 1950, 2000, 2026, 2050, 2099 | Horizons vectors | angular error (from SSB) < 30″; distance rel. error < 1e-5 |
| Moon geocentric | Horizons | < 60″, distance < 20 km |
| Galilean moons (jovicentric) | Horizons | < 500 km |
| Body orientation (Earth ERA/GAST, Mars, Moon) | Horizons/IAU values | < 0.01° |
| SGP4 | Vallado/AIAA 2006 verification vectors (satellite.js test set) | < 1e-3 km |
| TEME→ICRF | Reference case from Vallado | < 0.1 km at LEO |
| Kepler 2-body | Horizons for a NEO at epoch ±30 d | < 1,000 km at ±30 d (documented drift beyond) |
| Hermite interpolation of trajectories | Hold-out Horizons samples | < 1 km (cruise), < 0.1 km (flyby window) |
| Provider normalization | Recorded provider payloads (fixtures) | Snapshot equality |
**Software:** unit (all packages), integration (ingest → local Postgres via Docker or Neon branch), API contract tests (Zod schemas), render smoke (Playwright, forced WebGL, `?test=1` deterministic time and camera, screenshot diff threshold 1–2%), deep-link routing tests, mobile emulation (Playwright iPhone/Pixel profiles), and a **manual real-device checklist** per phase (WebGPU on Chrome/Edge/Safari 26/Android Chrome; WebGL2 on Firefox/Linux).

## 29. Risk Register (§28)
| # | Risk | Sev | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Precision/depth artifacts at multi-scale distances | High | Med | Camera-relative, local groups, log depth, proxies; gate P1.12; Babylon fallback |
| R2 | TSL/WebGPU API churn in three.js | Med | High | Pin version; upgrade in dedicated branches; wrap in `render/` module |
| R3 | WebGL2 fallback visuals/perf diverge | Med | Med | TSL-only materials; CI forced-WebGL screenshots; tier caps |
| R4 | Mobile GPU perf/memory | High | Med | AUTO tiers, KTX2, DPR caps, adaptive quality early (P1.9) |
| R5 | Provider blocking (CelesTrak firewall, JPL throttling) | High | Low-Med | Server-only, schedule ≥ policy, stop-on-non-200, UA, caching, stale UI |
| R6 | Vercel Hobby non-commercial clause | Med | Certain (if monetized) | Upgrade to Pro before launch/monetization; architecture is portable |
| R7 | Free DB limits (storage/compute) | Med | Med | CDN caching; prune raw payloads; snapshots only for curated groups |
| R8 | Asset licensing mistakes | High | Low | `ASSET_LICENSES.md` gate in CI (file must be listed), no unknown sources |
| R9 | Misleading certainty (users think it's telemetry) | High | Med | Provenance model, certainty styles, copy review |
| R10 | Scope creep for a solo dev | High | High | Phase gates, non-goals list, one-step-per-prompt workflow |
| R11 | AI-generated code eroding architecture | Med | High | Package boundary lint rules, strict TS, tests-first for astro math, ADRs |
| R12 | Texture weight hurting load time | Med | Med | Progressive KTX2, 1k placeholders, lazy per-body loading |
| R13 | Entity-linking false positives ("Io", "Mercury" car/element) | Low | High | Confidence thresholds, context rules, overrides |
| R14 | GitHub Actions cron delays/minutes | Low | Med | Runner decides due tasks; keep job < 2 min; public repo option |
| R15 | Horizons one-request-at-a-time makes bulk jobs slow | Low | High | Weekly jobs, sequential queue, only curated objects |


---

## 30. Implementation Phases (§29 deliverable, §76)

Revised order versus the brief: **Phase 0 → 1 (gate) → 2 → 3 → 4 → 4B (data platform, new) → 5 → 6 → 7 → 8 → 9 → 10 → 11.** Adaptive quality basics move into Phase 1, and accessibility/testing are threaded through every phase.

### Repository layout (created in Phase 0)
```
space-map/
  apps/web/                    Next.js 16 (UI shell, routes, API route handlers)
    src/app/(explore)/page.tsx, object/[kind]/[slug]/page.tsx, event/[id]/page.tsx, news/..., lab/poc/page.tsx
    src/app/api/v1/...         route handlers
    src/components/            React UI (time bar, cards, search, layers)
    src/engine-bridge/         EngineProvider, useEngineStore (zustand), commands
    public/assets/textures/    processed KTX2 textures (by tier)   public/data/  static catalogs
  packages/domain/             types, zod schemas, static curated data (bodies.json, spacecraft.json, milestones.yaml)
  packages/astro/              pure math: time, clock, frames, ephemeris/providers, orbits, interpolation (NO three, NO DOM)
  packages/engine/             SpaceEngine (three/webgpu), depends on astro + domain
  packages/ingest/             provider adapters + runner (Node only)
  packages/db/                 drizzle schema, migrations, query functions
  tools/fixtures/              Horizons fixture fetcher     tools/assets/  texture pipeline
  docs/adr/  docs/licensing/  docs/perf/  docs/science/
  .github/workflows/verify.yml  ingest.yml
```
**Dependency rules (enforced by lint):** `domain` → nothing. `astro` → `domain`, `astronomy-engine`, `satellite.js`. `engine` → `astro`, `domain`, `three`. `db` → `domain`. `ingest` → `domain`, `db`, `astro`. `apps/web` → all (but `engine` only from client components, and `db` only from server code). `apps/web/src/components` must never import `astro` math directly for per-frame work.

---

### PHASE 0 — Foundation & Research Artifacts (granular)

**P0.1 Prerequisites**
```powershell
node -v            # need v22.x or v24.x LTS; install from nodejs.org if missing
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
git --version
```
Create a **private GitHub repo** `space-map` (or public, for unlimited Actions minutes; decide in Open Questions). Clone it to e.g. `C:\Users\wahmed\Documents\space-map`.
*Accept:* `pnpm -v` prints a version, and the repo is cloned.

**P0.2 Monorepo root files**
- `package.json` (private, `"packageManager": "pnpm@<version>"`, scripts: `dev`, `build`, `typecheck` = `pnpm -r typecheck`, `lint` = `eslint .`, `test` = `vitest run`, `verify` = `pnpm typecheck && pnpm lint && pnpm test`, `ingest:due`, `fixtures:horizons`, `assets:build`, `licenses:check`).
- `pnpm-workspace.yaml`: `packages: ['apps/*','packages/*','tools/*']`.
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: "bundler"`, `target: ES2022`, `verbatimModuleSyntax`.
- `.gitignore` (node_modules, .next, coverage, `assets/source/**`, `.env*`), `.editorconfig`, `.nvmrc`, `.prettierrc`.
- `vitest.workspace.ts` (or `vitest.config.ts` with `projects`) covering `packages/*`.
- `eslint.config.mjs` (flat): typescript-eslint strict, `eslint-plugin-boundaries` with the rules above, `no-restricted-imports` blocking `three` outside `packages/engine` and `apps/web/src/engine-bridge`.
*Accept:* `pnpm install` succeeds, and `pnpm verify` runs (0 tests OK).

**P0.3 Next.js app**
```powershell
pnpm create next-app@latest apps/web --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm
```
Then set `next.config.ts` → `transpilePackages: ['@space/domain','@space/astro','@space/engine']`, and add security headers (CSP as in §25; relax during dev).
*Accept:* `pnpm --filter web dev` serves http://localhost:3000.

**P0.4 Package skeletons.** For each of `domain`, `astro`, `engine`, `ingest`, `db`:
`packages/<name>/package.json` (`"name": "@space/<name>"`, `"type": "module"`, `"exports": {".": "./src/index.ts"}`, script `typecheck: tsc --noEmit`), `tsconfig.json` extending base, `src/index.ts`, and `test/smoke.test.ts`.
Install pinned deps:
```powershell
pnpm --filter @space/astro add astronomy-engine@2.1.19 satellite.js@7.1.0
pnpm --filter @space/engine add three@0.186.0
pnpm --filter @space/engine add -D @types/three
pnpm --filter @space/domain add zod
pnpm --filter web add zustand @radix-ui/react-popover @radix-ui/react-dialog @radix-ui/react-slider comlink minisearch
pnpm add -Dw vitest @playwright/test typescript eslint typescript-eslint eslint-plugin-boundaries prettier
```
*Accept:* `pnpm verify` is green, and a smoke test imports each package.

**P0.5 CI: `.github/workflows/verify.yml`.** On PR/push: checkout, pnpm setup, `pnpm install --frozen-lockfile`, `pnpm verify`, `pnpm licenses:check`, Playwright (added in P1.10).
*Accept:* the workflow is green on GitHub.

**P0.6 ADRs (`docs/adr/`).** Write short ADRs (Context/Decision/Consequences) copying decisions from this plan:
0001 renderer (Three WebGPURenderer, no R3F), 0002 precision strategy, 0003 time scales & clock, 0004 canonical frames & units, 0005 backend/ingestion/hosting (Vercel + GH Actions + Neon), 0006 licensing policy, 0007 package boundaries.
*Accept:* files exist; each is under 1 page.

**P0.7 Licensing scaffolding.** `docs/licensing/allowlist.json` (MIT, Apache-2.0, BSD-2/3, ISC, 0BSD, CC0-1.0, Unlicense, BlueOak-1.0.0, MPL-2.0 dev-only [A]), `tools/check-licenses.ts` (runs `pnpm licenses list --prod --json`, fails on anything not allowed), `assets/ASSET_LICENSES.md` table header, `docs/licensing/DATA_SOURCES.md` (copy §6).
*Accept:* `pnpm licenses:check` passes.

**P0.8 Horizons fixtures fetcher (`tools/fixtures/fetch-horizons.ts`)**
- Sequential (await each), 1.5 s delay between requests, header `User-Agent: SpaceMap-fixtures/0.1 (contact: <email>)`.
- Query (GET `https://ssd.jpl.nasa.gov/api/horizons.api`): `format=json`, `COMMAND='<id>'`, `OBJ_DATA='NO'`, `MAKE_EPHEM='YES'`, `EPHEM_TYPE='VECTORS'`, `CENTER='500@0'` (SSB; also `'500@399'` for geocentric Moon), `REF_SYSTEM='ICRF'`, `REF_PLANE='FRAME'`, `VEC_TABLE='2'`, `OUT_UNITS='KM-S'`, `TIME_TYPE='TDB'`, `CSV_FORMAT='YES'`, `TLIST='<JD list>'` (quote per Horizons docs).
- Bodies: 10 (Sun), 199, 299, 399, 301, 499, 599, 699, 799, 899, 999; later 501–504, 401, 402, 606, 801, 901.
- Epochs (JD TDB): 2433282.5 (1950), 2451545.0 (J2000), 2461305.5 (2026-09-22), 2469807.5 (2050), 2488069.5 (2099-12-31).
- Parse the `result` text between `$$SOE` and `$$EOE`. Write `packages/astro/test/fixtures/horizons/<body>_<center>.json` with `{query, horizonsVersion, generatedAt, rows:[{jdTdb,x,y,z,vx,vy,vz}]}`.
*Accept:* fixtures committed; a re-run produces the same numbers.

**P0.9 Asset acquisition & pipeline (`tools/assets/`)**
- Download masters manually into `assets/source/` (gitignored), recording each in `ASSET_LICENSES.md`: Blue Marble NG (one month, e.g. September), Black Marble, NASA clouds, Earth normal/topo, SVS CGI Moon Kit (color + displacement), USGS Viking MDIM color + MOLA, Deep Star Maps 2020 (equirect), Solar System Scope for gas giants and Saturn rings (CC BY 4.0), BSC5 catalog.
- `tools/assets/build-textures.ts` (uses `sharp` to resize to 1k/2k/4k/8k and calls `toktx` from KTX-Software, which must be installed):
  - Color maps: `toktx --t2 --encode uastc --uastc_quality 2 --zcmp 18 --genmipmap --assign_oetf srgb out.ktx2 in.png`
  - Data/normal maps: `--assign_oetf linear` (normals: `--normal_mode`)
- Output `apps/web/public/assets/textures/<body>/<map>_<res>.ktx2` plus `manifest.json` `{body, map, res, bytes, license, credit}`.
- `tools/assets/build-stars.ts`: BSC5 → `public/data/stars.bin` (Float32: unit vector xyz ICRF, magnitude, B−V).
- CI check: every file under `public/assets` must appear in `ASSET_LICENSES.md`.
*Accept:* textures for Sun/Earth/Moon/Mars at 1k/2k/4k exist, plus 8k for Earth day/night. Total committed ≤ 80 MB (keep 8k masters out of git if needed).

**P0.10 WebGPU probe page `/lab/probe`**: client page showing `navigator.gpu` presence, adapter info/limits, and the three.js backend chosen (`renderer.backend.isWebGPUBackend`). It's used on every test device in P1.12.
*Accept:* opening the page on your devices records their results in `docs/perf/device-matrix.md`.

---

### PHASE 1 — Renderer / Architecture Proof-of-Concept (the gate) (granular)
Scope (§69): Sun, Earth, Moon, Mars. Every step adds tests or a visual check. Code goes into the **real packages** (not a throwaway), in line with §70's "not disposable programmer art".

**P1.1 Time scales (`packages/astro/src/time/`)**
- Files: `constants.ts` (J2000_JD=2451545.0, SEC_PER_DAY, TT_MINUS_TAI=32.184, AU_KM=149597870.7), `leapSeconds.ts` (table of `[utcMs, taiMinusUtc]` since 1972 + `LEAP_TABLE_VALID_UNTIL`), `scales.ts`: `utcMsToTaiSec`, `utcMsToTdb`, `tdbToUtcMs` (iterative inverse, 2 iterations), `tdbToJd`, `jdToTdb`, `tdbToIso`, `isoToTdb`.
- Tests `test/time.test.ts`: J2000 identities; 2017-01-01 leap boundary; round-trip error < 1 µs over 1900–2100 (random 10k samples); TDB−TT amplitude ≤ 1.7 ms.
*Accept:* all pass; there are no Date objects in hot functions (only numbers).

**P1.2 Simulation clock (`packages/astro/src/clock/SimulationClock.ts`)** as specified in §9.2, with an injectable `nowMs()` for tests.
- Tests: live tracks wall clock; pause holds; `setRate(-3600)` runs backward; rate changes keep continuity (no jump); `goLive` from +5 h animates to now within 1.2 s (tick through a fake clock) and ends in `live`; clamping at the range limits emits a `clamped` event; subscribers get ≤ hz notifications.
*Accept:* 100% branch coverage on the clock.

**P1.3 Ephemeris provider (`packages/astro/src/ephemeris/AstronomyEngineProvider.ts`)**
- `createBodyProvider(body: 'Sun'|'Mercury'|...|'Pluto'|'Moon'|'EMB')` implements `PositionProvider` (§8.3) with frame `ICRF_SSB`. Use `Astronomy.BaryState(body, time)` (AU, AU/day, EQJ) → km, km/s. For the Moon: `BaryState('EMB')` + `GeoMoonState` with the Earth/Moon mass ratio, or `BaryState('Moon')` if supported [A: check the API in astronomy-engine 2.1.19 docs].
- Cache the AstroTime per `tdb` within a frame (the FrameContext passes `astroTime`).
- Tests vs P0.8 fixtures with the §28 tolerances; a micro-benchmark shows 4 bodies < 0.2 ms per frame.
*Accept:* tests pass at all 5 epochs.

**P1.4 Orientation (`packages/astro/src/orientation/`)**
- `bodyOrientation(body, tdb, outQuat: Float64Array(4))` from `Astronomy.RotationAxis` (pole RA/Dec + spin W). Earth: GAST-based rotation `Rotation_EQJ_EQD` · Rz(GAST). Also axis tilt for display.
- Tests: Earth's prime meridian faces the Sun at ~12:00 UT at lon 0 (within 1°, equation of time considered); Mars W vs Horizons/IAU value < 0.01°.
*Accept:* passes.

**P1.5 Engine skeleton (`packages/engine`) + `/lab/poc` page**
- `render/RendererFactory.ts`:
  ```ts
  import * as THREE from 'three/webgpu';
  export async function createRenderer(canvas: HTMLCanvasElement, opts:{forceWebGL:boolean; dpr:number}) {
    const r = new THREE.WebGPURenderer({ canvas, antialias: true, forceWebGL: opts.forceWebGL, logarithmicDepthBuffer: true });
    await r.init(); r.setPixelRatio(opts.dpr);
    const backend = (r.backend as any).isWebGPUBackend ? 'webgpu' : 'webgl2';
    return { renderer: r, backend };
  }
  ```
  [A: check exact option names against r186 docs/examples.]
- `core/FrameLoop.ts` (`renderer.setAnimationLoop(cb)`), `SpaceEngine.ts` facade: `static async create(canvas, options)`, `dispose()`, `on(event, cb)`, `resize()`.
- `perf/PerfMonitor.ts`: rolling frame times (ring buffer, no allocation), fps, p95, `renderer.info` (calls, triangles, textures).
- `apps/web/src/app/lab/poc/page.tsx` + `EngineCanvas.tsx` (`'use client'`, `dynamic(() => import(...), { ssr:false })`), full-viewport canvas, `?renderer=webgl` flag, `?perf=1` overlay.
- Handle `resize` via ResizeObserver, `visibilitychange` (pause the loop when hidden), WebGPU device-lost → re-create once.
*Accept:* black scene with a test cube renders at 60 fps. The overlay shows backend `webgpu` on Chrome and `webgl2` with the flag. No console errors.

**P1.6 Scene graph, camera-relative rendering, precision validation**
- `scene/EntityRegistry.ts`, `scene/SceneGraph.ts`, `scene/DisplayTransform.ts` (identity/True for now).
- Registry entries for Sun/Earth/Moon/Mars with providers from P1.3, radii from `packages/domain/data/bodies.json` (IAU values with source URL). Each has a basic `MeshStandardNodeMaterial` sphere.
- Camera-relative pass per §11 (float64 subtraction → float32 mesh positions; the three.js camera stays at the origin and only rotates).
- `lab/precision` scenario (`?scenario=leo`): camera 400 km above Earth, orbiting. Log per-frame projected-pixel jitter of a surface marker, computed both via float64 CPU projection and from the GPU path (render a marker and compare against the expected screen position in a test hook).
- Depth tests: cloud shell 10 km above the surface from 400 km and from 1e6 km; Moon behind Earth; Mars at ~2 AU. Run with log depth **on**, and note any artifacts. If there are artifacts, try `reversedDepthBuffer` and write the findings into ADR-0002.
*Accept:* jitter < 0.5 px; no z-fighting in the listed views on WebGPU and forced WebGL2. ADR-0002 is updated with measured results.

**P1.7 Camera controller (`packages/engine/src/camera/`)**
- `math.ts` (pure, tested): spherical ↔ cartesian, exponential zoom, damping spring, transition path (log-distance arc), duration formula (§13).
- `CameraController.ts`: state per §13, `orbit(dx,dy)`, `zoom(delta)`, `pan(dx,dy)`, `focus(id,{transition})`, `follow(id|null)`, `back()`, frame switching without a jump.
- `Input.ts`: pointer events (mouse, touch, pinch), wheel (with trackpad-friendly normalization), double-click/double-tap focus, keyboard map (§13). Uses `touch-action: none` on the canvas.
- Tests: `math.test.ts` (transition endpoints exact, monotonic distance in zoom phases, no NaN at 0/poles); frame-switch pose continuity (< 1e-6 relative).
*Accept:* manually, Earth → Moon → Mars → Sun flights feel continuous. No teleport, no clipping into surfaces. Follow keeps Earth centered while time runs at 1 day/s.

**P1.8 Materials (split into three sub-steps, each committed separately)**
- **P1.8a Sun + sky:** `SunMaterial` (TSL: emissive, 3D-noise granulation animated by real time, limb darkening `I = 1 − u(1−μ)`, u≈0.6), corona billboard (additive, radial falloff), `Starfield.ts` (points from `stars.bin`, size/brightness by magnitude, color from B−V), Milky Way background sphere (Deep Star Maps texture, dim), bloom node (threshold on HDR luminance) + ACES/AgX tone mapping.
- **P1.8b Earth:** start from the three.js `webgpu_tsl_earth` example structure. Day/night blend on the terminator (`smoothstep(-0.1, 0.2, dot(N,L))`), city lights ×(1−day), ocean specular (mask from day texture or a separate specular map), normal map, cloud shell with its own rotation rate and alpha from the cloud map, cloud shadows (HIGH+), atmosphere shell: back-side sphere with scattering approximation (Rayleigh color `(5.8,13.5,33.1)e-6`-style tint, Mie forward lobe g≈0.76, fresnel rim), twilight color at the terminator.
- **P1.8c Moon + Mars:** Moon BRDF (Lommel–Seeliger blend with Lambert, 70/30 [A: tune]), displacement at HIGH+ only (normal map otherwise). Mars color + normal plus a thin atmosphere rim (tan color, low intensity).
- For each: a reference screenshot set in `docs/perf/screens/` (Earth day, terminator, night side, limb; Moon full/quarter; Mars close; Sun with bloom) on WebGPU and WebGL2.
*Accept (visual review by you):* "Could this become Universe Sandbox-level?" is answered **yes**, or improvement items are logged. There's no visible seam at the texture date line, no banding in the atmosphere, and parity between WebGPU and WebGL2 screenshots (small differences OK).

**P1.9 Quality & assets**
- `quality/QualityManager.ts`: tiers LOW/MEDIUM/HIGH/ULTRA + AUTO. AUTO inputs: backend, `navigator.userAgentData?.mobile`/UA, `devicePixelRatio`, screen size, adapter limits (maxTextureDimension2D), `navigator.deviceMemory`, and a **3 s warm-up FPS probe**.
- Tier table (textures 2k/4k/4k/8k; DPR cap 1.0/1.5/2.0/2.0; bloom off/on/on/on; cloud shadows off/off/on/on; atmosphere steps 0/8/16/32 [A]; sphere segments 48/64/128/256).
- Adaptive runtime: if p95 > 1.25× budget for 5 s → lower DPR by 0.25 → then drop a tier. Recover after 20 s of headroom.
- `assets/AssetManager.ts`: `KTX2Loader` (transcoder files copied to `public/basis/`) with `detectSupport(renderer)`, per-tier URL resolution from `manifest.json`, progressive load (1k first), reference-counted dispose, GPU memory estimate (w·h·bpp·1.33).
*Accept:* AUTO picks HIGH on the desktop and LOW/MEDIUM on the phone. Forcing LOW on the desktop cuts GPU texture memory to ≤ 128 MB. No texture leaks after 20 focus changes (the `renderer.info.memory.textures` count is stable).

**P1.10 Minimal UI + React bridge**
- `apps/web/src/engine-bridge/`: `EngineProvider.tsx` (creates the engine once), `useEngineStore.ts` (zustand: `selectedId`, `clockMode`, `rate`, `backend`, `tier`, `scale`, `following`). The engine emits throttled events (≤ 4 Hz) → store. **The time display updates via a ref + `requestAnimationFrame` writing `textContent`, not React state.**
- Components (Tailwind + Radix, keyboard-accessible): `TimeBar` (bottom-center: date/time, play/pause, reverse, speed menu, LIVE button, date picker), `QuickFocus` (Sun/Earth/Moon/Mars chips), `FollowToggle`, `ScaleToggle`, `QualityMenu`, `PerfOverlay`.
- Playwright: `e2e/poc.spec.ts` with `?renderer=webgl&test=1&t=2026-09-22T00:00:00Z`: loads, a canvas exists, clicking Earth focus changes the store selection, a screenshot is compared.
*Accept:* React DevTools Profiler shows **no React commits per frame** during 30 s of playback at 1 day/s (only ≤ 4 Hz store updates). E2E passes in CI.

**P1.11 Explore Scale (4 bodies)**: `DisplayTransform` implements §12.4 (radius boost + child radial boost). Toggle in UI. Tests: physical state is unchanged after display mapping (property test); the Moon stays outside the boosted Earth at all zooms.
*Accept:* passes. From the Solar-System view all 4 bodies are visible and clickable.

**P1.12 Profiling & ARCHITECTURE GATE**
- Run the device matrix (desktop Chrome WebGPU, desktop Chrome forced WebGL2, Firefox, Safari 26 macOS if available, iPhone Safari 26, Android Chrome). Record in `docs/perf/gate-report.md`: backend, tier, fps median/p95 for 5 scripted views (Solar System, Earth close, Earth terminator at LEO, Moon close, Mars close), GPU texture memory, time-to-first-frame, JS sizes (`next build` output), and screenshots.
- **Gate passes if all are true:**
  1. Desktop HIGH ≥ 60 fps p95 in all 5 views on WebGPU **and** ≥ 50 fps on forced WebGL2.
  2. Mobile ≥ 30 fps on LOW/MEDIUM.
  3. Precision: jitter < 0.5 px at LEO; no z-fighting.
  4. Positions pass the P1.3 tests.
  5. LIVE/past/future and accelerated time work without stutter.
  6. You judge the visuals "on track for Universe Sandbox-level".
  7. Engine chunk ≤ 450 KB gzip.
- **If it fails, use this decision tree:**
  - Precision/depth failure → implement scaled-space proxies (§11.4). If it still fails → 2-day **Babylon.js 9 Large World Rendering** spike reproducing the Earth LEO + Solar-System views. Compare and decide via ADR.
  - WebGPU visuals fine but WebGL2 poor → reduce WebGL2 to a MEDIUM cap. Acceptable.
  - Mobile perf failure → lower LOW tier further (no atmosphere shell, 1k textures, DPR 1). If still failing, mark mobile "basic mode" and discuss.
  - Visual quality shortfall → iterate on P1.8 before proceeding. **Do not move to Phase 2 with known foundational flaws.**
*Accept:* `gate-report.md` states PASS, and you sign off.

---

### PHASE 2 — Core Space Engine (granular)

**P2.1 Frame tree (`packages/astro/src/frames/`)**: `FrameTree.ts` with nodes per §10, `resolveOrigin(frameId, tdb, out)` (memoized per frame via a `frameStamp`), `transformPosition/State(from, to, tdb, in, out)` including rotations for `FIXED:*` and `TEME_EARTH`. Tests: round trips (A→B→A < 1e-9 relative); Earth-fixed point on the equator rotates 360.9856°/day; TEME→ICRF matches the reference.
*Accept:* passes; engine code calls only the FrameTree APIs.

**P2.2 Provider set (`packages/astro/src/ephemeris/`)**:
- `AstronomyEngineProvider` for all planets + Pluto.
- `JupiterMoonsProvider` (`Astronomy.JupiterMoons`).
- `MeanElementsProvider` (JPL sat mean elements with apsidal/nodal precession rates) for Phobos, Deimos, Titan, Triton, Charon (data in `packages/domain/data/moon-elements.json` with source URL + retrieval date).
- `KeplerProvider` (elliptic/hyperbolic solver, Newton + Danby starter, tested for e up to 0.99 and hyperbolic).
- `SampledEphemerisProvider` (cubic Hermite on t,x,v; binary search on segments; certainty per segment).
Tests vs Horizons fixtures (extend the P0.8 fetch list for moons).
*Accept:* all within §28 tolerances; zero allocations per `stateAt` (verified by a test that runs 1e5 calls and checks heap growth < 1 MB).

**P2.3 Catalog & registry**: `packages/domain/data/bodies.json` (Sun, planets, Pluto, Ceres, 10 moons: id, name, aliases, parentId, radii, rotation source, visual spec keys, importance). A `buildCatalog()` Zod-validates it. `EntityRegistry.loadCatalog()` creates render entities with providers.
*Accept:* all bodies are positioned. The overlay lists 21 entities.

**P2.4 LOD system + PointLayer**: `lod/LodSystem.ts` (angular-size thresholds with hysteresis, §12.3), `layers/PointLayer.ts` (a single `Points`/instanced sprite draw for N items, float32 buffer relative to the layer's parent frame group, per-point color/size attributes, `updateRange` partial uploads), sprite representation, generic `PlanetFactory` for non-hero bodies (simple lit texture + optional rim).
*Accept:* 10k synthetic points around Earth render at ≥ 60 fps desktop. LOD switching shows no popping flicker (visual check).

**P2.5 LabelSystem**: DOM pool (max 64 visible), priority + grid declutter (cell 96×32 px), fade in/out 150 ms, semantic-band rules per layer, `aria-hidden`.
*Accept:* Solar-System view shows the planets without overlap. Zooming to Earth shows Earth/Moon labels only.

**P2.6 LayerEngine**: `layers/LayerRegistry.ts` with `{id, label, category, defaultOn, bands, load(), setVisible()}`. MVP layer IDs: `planets`, `moons`, `dwarfs`, `orbits`, `neo`, `sat.stations`, `sat.starlink`, `sat.gnss`, `sat.weather`, `sat.science`, `sat.brightest`, `spacecraft`.
*Accept:* toggling layers doesn't reallocate GPU buffers repeatedly (reuse).

**P2.7 Orbit rendering**: `layers/OrbitLayer.ts` using fat lines (`Line2`/`LineSegments2` in the node system [A: verify WebGPU support in r186], else a custom screen-space ribbon in TSL). Adaptive sampling. Styles per certainty (§12.7). Orbits are drawn in the parent frame and camera-relative.
*Accept:* planet orbits are subtle, the selected body's orbit is highlighted, and there's no jitter at LEO scale (Moon orbit viewed from Earth).

**P2.8 Picking & selection**: `picking/Picker.ts` per §12.8. Emits `select`/`hover` events. Touch radius 24 px.
*Accept:* click/tap works on meshes and points. There's no hover dependency on touch.

**P2.9 Public engine API (freeze v1)**:
```ts
engine.clock (SimulationClock) ; engine.select(id|null) ; engine.focus(id, opts) ; engine.follow(id|null)
engine.applyMapState(state) ; engine.getMapState() ; engine.setLayer(id, on) ; engine.setScale('true'|'explore')
engine.setQuality(tier|'auto') ; engine.on('select'|'hover'|'clock'|'perf'|'error'|'tier', cb)
engine.registerEntities(entities, providerFactory) ; engine.registerPointLayer(id, source)
```
Documented in `packages/engine/README.md`. Plus a type test (`tsd`/`expectTypeOf`).
*Accept:* `apps/web` uses only this API (lint rule: no deep imports into `@space/engine/src/*`).

**P2.10 Perf regression harness**: a Playwright script runs 5 scripted camera paths with `?perf=1&test=1`, exports CPU frame-time stats to JSON, and CI compares against a baseline (fail if > 20% worse). The manual GPU matrix is updated in `docs/perf/`.
*Accept:* it runs in CI (WebGL2/SwiftShader numbers are indicative only).

---

### PHASE 3 — Full Solar System (task-level)
- Hero-grade materials for Jupiter/Saturn (bands, subtle animated flow optional), Saturn rings (Mie forward scattering, planet↔ring shadows), Uranus/Neptune atmospheres, Venus clouds, Mercury, Pluto/Charon, Ceres.
- Axial tilts and rotations for all bodies. Moon systems visible at planetary band.
- Orbit visualization for all planets/moons. True/Explore scale tuned for all.
- Tests: all bodies vs Horizons fixtures; screenshots per body.
*Exit:* all 21 bodies render within the perf budget and pass their position tests.

### PHASE 4 — Core Consumer UX (task-level)
- Routing (`/object/...`, `/event/...`, query-state sync §20), OpenGraph metadata.
- Universal search UI (`/` shortcut, combobox, keyboard nav). Client MiniSearch now, server search in 4B.
- Compact object card (bottom sheet on mobile) with progressive "More details" and a provenance section (§41 example copy: "Position calculated for Sep 22, 2026 19:00 UTC · Source: NASA/JPL · Method: DE-based analytic ephemeris").
- Layers popover. Settings (quality, reduced motion, units km/mi/AU). Help overlay with shortcuts. "Objects in view" accessible list.
- Explore shell layout: nearly full-screen canvas. Top-left logo + search, top-right layers/settings, bottom-center time bar, right drawer "Happening now" (placeholder until Phase 8).
- E2E: deep links restore target/time/layers; back/forward navigation; mobile emulation.
*Exit:* acceptance items 1–8 and 16–19 (§31) are demonstrable with planets only.

### PHASE 4B — Data Platform Foundation (new)
- `packages/db`: Drizzle schema per §15, migrations (`drizzle-kit generate/migrate`), Neon project + dev branch, `DATABASE_URL` in `.env.local` / Vercel / GitHub secrets.
- `packages/ingest`: `politeFetch` (UA, timeout 30 s, single-flight queue per host, exponential backoff, **stop on non-200 and mark provider paused**), runner `ingest:due`, `provider_state`/`ingestion_runs` bookkeeping.
- `.github/workflows/ingest.yml`: cron `17 */2 * * *` + `workflow_dispatch`, Node setup, `pnpm ingest:due`, fail → email.
- `/api/v1` scaffolding: envelope, Zod DTOs, cache headers helper, `/status` page. Seed `objects`/`aliases` from `bodies.json` + spacecraft list.
- Server search endpoint (trigram).
*Exit:* a scheduled run succeeds end-to-end with a dummy provider, and `/status` shows freshness.

### PHASE 5 — Earth Satellites
- `CelesTrakProvider`: groups (confirm names on CelesTrak), JSON (OMM), schedule ≥ 2 h, one snapshot row per group, and a `sat:<norad>` object + aliases for curated/brightest objects only (don't create objects for every Starlink).
- Client: `Sgp4Worker` (Comlink): `json2satrec` for each OMM, batch propagate at 2 Hz (TEME → ICRF_BODY:earth via `Rotation_EQD_EQJ`), transferable Float32Array (Earth-relative km). The main thread interpolates linearly between batches per frame. IndexedDB cache.
- Earth-orbit band rendering, group colors, selected-satellite orbit (one period ahead/behind, dashed future), card fields (NORAD, COSPAR, epoch age, altitude, velocity, period, "propagated from elements N h old").
- Tests: SGP4 verification vectors; worker throughput benchmark (10k sats < 20 ms per batch on desktop [A: measure]).
*Exit:* ISS is searchable and followable, with correct position vs a reference (e.g. Horizons `-125544` or CelesTrak) within 5 km at element epoch.

### PHASE 6 — Asteroids / NEOs
- `JplCadProvider` (−30 d…+60 d, `dist-max=0.05`), `JplSbdbProvider` (elements + physical for each CAD object + notable list: Apophis, Bennu, Eros, Didymos, 2024 YR4, etc.), `MpcRecentProvider` (recent MPECs → new NEO designations → SBDB lookup), `discoveries` rows.
- Client `KeplerProvider` from elements. Confidence decays with |t − epoch| (badge). Encounter trajectories via Horizons (geocentric, ±10 d, 1 h step; ±1 d at 5 min) as `trajectories`.
- Close-approach events (Phase 8 schema is used early).
*Exit:* "See encounter" for an upcoming close approach shows Earth + asteroid with the Horizons trajectory, playing through closest approach with correct distance (vs CAD) ±1%.

### PHASE 7 — Spacecraft
- Curated `spacecraft.json` (Horizons IDs, e.g. Voyager 1 = −31, Voyager 2 = −32, New Horizons = −98, JWST = −170, Parker = −96, Juno = −61, Europa Clipper = −159, JUICE = −28, Psyche = −255, Lucy = −49, BepiColombo = −121 [A: verify each ID via the Horizons lookup API]).
- `JplHorizonsProvider` weekly: adaptive-step tables (1 d cruise; 10 min within ±5 d of flybys from milestones), segments tagged reconstructed/predicted by date vs `sourceTimestamp`. Stored as `trajectories` binary.
- Rendering: sprite/marker by default, NASA 3D model for selected (≤ 2 MB glTF, Draco/Meshopt via gltf-transform). Trajectory line styled by certainty. Mission card (status, launch date, destination, milestones).
*Exit:* Voyager 1 distance from the Sun matches Horizons within 0.01% for today; future segments render dashed with a "Predicted" badge.

### PHASE 8 — Events
- `events` pipeline: CAD → close-approach; milestones YAML → arrival/flyby; astronomy-engine → eclipses/oppositions/conjunctions (nightly generator, 12 months ahead); discoveries → discovery.
- "Happening now" drawer (Live experience §59): next 7 days + ongoing, sorted by importance, each with a "See it" button.
- `/event/[id]` pages with SSR summary + auto map state.
- Launch architecture: `LaunchProvider` interface + event type only (no ingestion unless the stretch is approved).
*Exit:* acceptance item 15 (§31).

### PHASE 9 — News / Discoveries
- RSS providers (NASA, JPL, ESA), sanitization, image policy, entity linking (§18) + overrides, `/news` list with a Discoveries tab, "View in Space"/"See encounter" buttons, news in object cards ("Related news").
- Tests: linking precision on a hand-labeled set of 50 articles (target precision ≥ 0.9, recall ≥ 0.6 [A]).
*Exit:* acceptance items 13–14.

### PHASE 10 — Performance / Mobile
- Tune tiers per the device matrix, worker usage review (measure; add workers only where main-thread > 4 ms), GC audit, texture streaming, bundle splitting (engine chunk, per-layer chunks), mobile gestures polish, bottom sheets, battery-aware (pause when hidden, cap FPS at 30 on LOW).
*Exit:* all §22 budgets are met on the device matrix.

### PHASE 11 — Production Hardening
- Sentry, perf beacon, `/status`, alerting on ingestion failures, stale-data UX audit, CSP tightening, rate limiting, browser compatibility sweep, accessibility audit (axe + manual screen reader), full scientific validation suite in CI, legal/attribution page, **upgrade Vercel plan before any commercial launch**, custom domain, backups (Neon PITR not on free → nightly `pg_dump` to a GitHub Actions artifact [A]).
*Exit:* all MVP acceptance criteria pass; launch checklist signed off.

---

## 31. MVP Acceptance Criteria (§30 deliverable, §77): a precise checklist
1. [ ] `/` loads without an account. First frame in ≤ 2.5 s desktop / ≤ 5 s mobile 4G.
2. [ ] The initial view shows a lit, textured Solar System with Explore Scale, and ≥ 60 fps desktop HIGH.
3. [ ] Orbit/zoom/pan/focus/follow/back work with mouse, trackpad, touch, and keyboard.
4. [ ] Search finds Mars, Europa, ISS (`iss`, `25544`), Voyager 1, JWST, a CAD asteroid by designation, and an event, each in ≤ 300 ms.
5. [ ] Selecting any result flies smoothly (no teleport) and opens the card.
6. [ ] The card shows name, type, distance (from Earth and Sun), velocity, size, and period, with "More details" for the rest.
7. [ ] The card shows provenance: source, method, epoch/updated time, and certainty wording. Nothing propagated is labeled as live telemetry.
8. [ ] The time bar supports LIVE, pause, reverse, 8 speeds, and a date picker, over 1900–2100. Return to LIVE is smooth.
9. [ ] Planet positions match Horizons within tolerance (automated tests green).
10. [ ] The satellite layer can be enabled (Stations default; other groups toggle) with correct positions (ISS ±5 km at epoch).
11. [ ] NEO layer: upcoming/recent close approaches, notable NEOs, and recently designated NEOs, with an uncertainty badge.
12. [ ] ≥ 10 curated spacecraft with trajectories; reconstructed vs predicted are visually distinct.
13. [ ] The News page lists NASA/JPL/ESA items with attribution. Linked items show "View in Space".
14. [ ] "View in Space" from news opens the correct object/time.
15. [ ] Events drawer: "See it" sets time, layers, and camera, and plays the event (e.g. a close approach).
16. [ ] Shared URLs (`/object/...?...t=...&layers=...`) reproduce the target, time, layers, and scale.
17. [ ] Desktop HIGH visual quality meets the gate standard (Sun/Earth/Moon/Mars reference screenshots).
18. [ ] Mobile (iOS Safari 26, Android Chrome): load, navigate, select, search, card, timeline, news, and layers all work at ≥ 30 fps.
19. [ ] UI clutter: in the default view, ≤ 6 persistent controls are visible; labels don't overlap.
20. [ ] Certainty is communicated everywhere (card badge + line style + tooltips/text).
21. [ ] Accessibility: keyboard-only flow for search→select→card→time; reduced motion respected; axe shows no critical issues.
22. [ ] Provider outage simulation (block each host) → stale banners and no crashes.
23. [ ] License check passes. `ASSET_LICENSES.md` and `/about/data` are complete.

## 32. Post-MVP Roadmap (§31 deliverable)
1. **v1.1:** Launches (LL2 key/arrangement), launch-site focus, countdowns, launch events.
2. **v1.2:** Observer mode: location, "what's above me", ISS passes, rise/set, sky view (TOPO frame).
3. **v1.3:** Accounts (auth provider TBD), saved views, follows, alerts (email/web push).
4. **v1.4:** More moons/dwarf planets/comets, SPICE-grade ephemerides, Scout/NEOCP with uncertainty clouds.
5. **v2.0:** Natural-language exploration (LLM tool-calling over search/events/mapState APIs).
6. **v2.x:** Stellar neighborhood (Gaia subset within ~100 ly), exoplanet systems, galactic frame, WebXR, native wrappers.

## 33. Open Product Questions (§32): these genuinely need your input later
1. **Product name / domain**, needed for the User-Agent string, OG tags, and branding. (A placeholder like "SpaceMap" is fine until then.)
2. **When do you expect commercial use?** It triggers the Vercel Pro upgrade, the LL2 commercial arrangement, and ESA image decisions.
3. **Repo public or private?** Public = unlimited GitHub Actions minutes and "source-visible" code (still proprietary if licensed so). Private = 2,000 min/month [R].
4. **Analytics & privacy:** OK with cookieless analytics (Vercel Web Analytics / Plausible-style) and Sentry? Any EU users needing a consent banner?
5. **Units default:** km vs miles (Toronto example suggests metric + optional imperial).
6. **Languages:** English only for MVP?
7. **Launch list stretch in MVP** (list-only, no trajectories): yes/no?

---

## Appendix A — Copy-paste prompts for the next AI model
**Starting a step:**
> You are implementing the Space Map project. Read `IMPLEMENTATION_PLAN.md` sections 0, 30 (repository layout + dependency rules) and the step **P1.3** in full. Implement **only P1.3**. Follow the file names, APIs, and tolerances exactly. Write the tests first, then the code. Run `pnpm verify` and fix all failures. Do not modify other packages unless the step says so. When done, summarize changed files, test results, and any deviation from the plan (with reasons), then stop.

**Expanding a task-level phase:**
> Read `IMPLEMENTATION_PLAN.md` fully. Expand **Phase 5** into granular steps (P5.1, P5.2, …) in the same format as Phase 1 (files, APIs, commands, tests, acceptance). Re-verify any provider facts marked [R]/[A] against official docs and mark them [V] with the URL. Don't write code yet.

**Reviewing:**
> Review the diff for step P2.4 against the plan: package-boundary violations, allocations in the frame loop, React per-frame updates, missing tests, licensing of new deps/assets. Report issues only.

## Appendix B — Conventions
- Files: `PascalCase.ts` for classes, `camelCase.ts` for modules. One exported class per file in `engine`.
- Units are always in names: `distanceKm`, `tdbSec`, `rateSimSecPerSec`, `angleRad`. Never bare numbers without a unit suffix in public APIs.
- There are no magic constants: physical constants go in `packages/astro/src/time/constants.ts` / `packages/domain/data/*.json` with a source URL.
- Hot path: no allocations, no closures created per frame, no `Array.map` in the loop.
- Errors: providers return typed failures (`StateFailure`) instead of throwing in the render loop.
- Git: one commit per step: `P1.3: astronomy-engine provider + Horizons tests`. Keep `main` green.
- Every new dependency: check its license with `pnpm licenses:check`; add an ADR note if it's significant.
- Every new asset: add it to `ASSET_LICENSES.md` in the same commit.

## Appendix C — Verification log (facts checked while writing this plan, 2026-09-22)
- [V] npm registry: three 0.186.0 (MIT), @react-three/fiber 9.7.0 (MIT), @babylonjs/core 9.27.1 (Apache-2.0), astronomy-engine 2.1.19 (MIT), satellite.js 7.1.0 (MIT), next 16.3.6, react 19.3.0, zustand 5.0.15, drizzle-orm 0.45.3 (Apache-2.0), vitest 5.0.1, @playwright/test 1.63.0, cesium 1.145.0 (Apache-2.0), fast-xml-parser 5.11.1, minisearch 7.2.0.
- [V] three.js docs: `WebGPURenderer` defaults to WebGPU and falls back to a WebGL 2 backend.
- [V] JPL SSD API fair-use policy: one request at a time, no embedding in websites (NASA CORS policy), app-specific User-Agent, cache results, check the `version` field, best-effort service.
- [V] CelesTrak usage policy (updated 2026-05-22): download once per update, enforcement on large sets (Active, Starlink), stop on any non-200 or risk firewalling. 5-digit catalog numbers ran out on 2026-07-11, so TLE can't carry new objects; use CSV/JSON (OMM).
- [R] WebGPU default-on versions (Chrome/Edge 113+, Chrome Android 121+, Safari 26, Firefox 141 Win / 147 macOS); Babylon 9 Large World Rendering; LL2 15 req/h; Vercel Hobby non-commercial + daily cron; Neon/Supabase free limits; GitHub Actions 2,000 min; texture licenses; ESA CC BY-SA 3.0 IGO. **Re-verify each when its phase starts.**
