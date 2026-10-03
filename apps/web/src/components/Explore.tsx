'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import { EXPLORABLE_BODIES } from '@space/domain';
import type { CameraFrame, QualitySetting } from '@space/engine';
import { useEngineStore } from '../engine-bridge/useEngineStore';
import LinkStateNotice from './LinkStateNotice';
import ShareViewDialog from './ShareViewDialog';
import { parseExploreLocation, serializeExploreState } from '../lib/routeState';
import {
  focusObject,
  goLive,
  mapCommand,
  previousView,
  publicViewHref,
  reversePlayback,
  setDateInput,
  setPlaybackRate,
  solarOverview,
  togglePlayback,
} from '../engine-bridge/timeCommands';
const EngineCanvas = dynamic(() => import('../engine-bridge/EngineCanvas'), {
  ssr: false,
});
const bodies = EXPLORABLE_BODIES;
const destinations = bodies.filter((body) =>
  ['planet:earth', 'moon:moon', 'planet:mars', 'planet:jupiter'].includes(
    body.id,
  ),
);
const rates = [1, 10, 60, 100, 3600, 86400, 2629800, 31557600];
const rateLabels = [
  '1×',
  '10×',
  '1 min / s',
  '100×',
  '1 hour / s',
  '1 day / s',
  '1 month / s',
  '1 year / s',
];
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: 'm21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0a8.5 8.5 0 0 1 17 0',
    layers: 'm12 3 10 6-10 6L2 9z M2 14l10 6 10-6 M2 19l10 6 10-6',
    settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    close: 'm6 6 12 12 M6 18 18 6',
    back: 'M19 12H5 M11 6l-6 6 6 6',
    focus: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M9 12h6 M12 9v6',
    share: 'M12 16V3 M7 8l5-5 5 5 M5 13v8h14v-8',
    help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    orbit: 'M20 4C15-1-3 15 3 21S26 10 20 4 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  };
  return (
    <svg
      viewBox="0 0 24 26"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.orbit} />
    </svg>
  );
}
export default function Explore({
  onChoose,
}: { onChoose?: (id: string) => void } = {}) {
  const engine = useEngineStore((s) => s.engine),
    selectedId = useEngineStore((s) => s.selectedId),
    ready = useEngineStore((s) => s.ready),
    error = useEngineStore((s) => s.error),
    mode = useEngineStore((s) => s.mode),
    rate = useEngineStore((s) => s.rate),
    scale = useEngineStore((s) => s.scale),
    following = useEngineStore((s) => s.following),
    mapState = useEngineStore((s) => s.mapState),
    routeState = useEngineStore((s) => s.routeState),
    utcDate = useEngineStore((s) => s.utcDate);
  const [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(''),
    [help, setHelp] = useState(false),
    [notice, setNotice] = useState(''),
    [dateDraft, setDateDraft] = useState<string | null>(null),
    [shareUrl, setShareUrl] = useState<string | null>(null),
    [details, setDetails] = useState(false),
    [reduced, setReduced] = useState(false),
    [unit, setUnit] = useState<'km' | 'mi' | 'AU'>('km');
  const body = bodies.find((b) => b.id === selectedId);
  const dateRef = useRef<HTMLInputElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const accepted = routeState ?? parseExploreLocation('/', '').state;
  const enabled = new Set(mapState?.layers ?? accepted.layers);
  const layers = ['planets', 'moons', 'dwarfs', 'orbits'].map((id) => ({
    id,
    on: enabled.has(id),
  }));
  const compatibilityHref = serializeExploreState(accepted, {
    renderer: 'webgl',
  });
  function compatibility(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    location.assign(publicViewHref(true));
  }
  function choose(id: string) {
    if (onChoose) onChoose(id);
    else engine?.focus(id);
    setSearchOpen(false);
    setDetails(false);
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches('input,select,textarea')) return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayback();
      }
      if (e.key.toLowerCase() === 'l') goLive();
      if (e.key.toLowerCase() === 'f' && selectedId) focusObject(selectedId);
      if (e.key === 'Escape') engine?.select(null);
      if (e.key === 'Backspace') {
        e.preventDefault();
        previousView();
      }
      if (e.key === '[' || e.key === ']') {
        const index = rates.indexOf(Math.abs(engine?.clock.rate ?? 1));
        setPlaybackRate(
          (rates[Math.max(0, Math.min(7, index + (e.key === ']' ? 1 : -1)))] ??
            1) * Math.sign(engine?.clock.rate || 1),
        );
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [engine, selectedId]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function share() {
    if (!engine) return;
    const url = new URL(publicViewHref(), location.origin);
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice('Link copied. A little piece of the universe, shared.');
    } catch {
      setShareUrl(url.toString());
    }
  }
  const filtered = bodies.filter((b) =>
    `${b.name} ${b.aliases.join(' ')}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <main className="explore">
      <EngineCanvas />
      <LinkStateNotice />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Space Time Continuum home">
          <span className="brand-mark">✳</span>
          <span>
            CONTINUUM<small>SPACE & TIME, CONNECTED</small>
          </span>
        </Link>
        <div className="nav-segment">
          <span className="nav-active">Explore</span>
          <Link href="/about/data">
            About the data <span>↗</span>
          </Link>
        </div>
        <div className="top-actions">
          <button
            className="search-trigger"
            aria-label="Find a world"
            onClick={() => setSearchOpen(true)}
          >
            <Icon name="search" />
            <span>Find a world</span>
            <kbd>/</kbd>
          </button>
          <Popover.Root>
            <Popover.Trigger className="icon-button" aria-label="Layers">
              <Icon name="layers" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="popover" sideOffset={14} align="end">
                <h3>Make space your own</h3>
                <p>Choose what appears on the map.</p>
                {layers.map(({ id, on }) => (
                  <label className="setting-row" key={id}>
                    <span>
                      {id === 'orbits'
                        ? 'Orbital paths'
                        : id[0]!.toUpperCase() + id.slice(1)}
                    </span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        mapCommand((engine) =>
                          engine.setLayer(id, e.target.checked),
                        );
                      }}
                    />
                  </label>
                ))}
                <div className="popover-foot">
                  More moons and small bodies are being validated.
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <Popover.Root>
            <Popover.Trigger className="icon-button" aria-label="Settings">
              <Icon name="settings" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="popover" sideOffset={14} align="end">
                <h3>Your observatory</h3>
                <label className="setting-row">
                  Graphics
                  <select
                    defaultValue="auto"
                    onChange={(e) =>
                      engine?.setQuality(e.target.value as QualitySetting)
                    }
                  >
                    {['auto', 'low', 'medium', 'high', 'ultra'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="setting-row">
                  Distances
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as typeof unit)}
                  >
                    <option>km</option>
                    <option>mi</option>
                    <option>AU</option>
                  </select>
                </label>
                <label className="setting-row">
                  Reduced motion
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={(e) => {
                      setReduced(e.target.checked);
                      engine?.setReducedMotion(e.target.checked);
                    }}
                  />
                </label>
                <label className="setting-row">
                  Reference frame
                  <select
                    aria-label="Reference frame"
                    value={mapState?.frame ?? 'ICRF_SSB'}
                    onChange={(event) =>
                      mapCommand((engine) =>
                        engine.setFrame(event.target.value as CameraFrame),
                      )
                    }
                  >
                    <option value="ICRF_SSB">Solar system barycentre</option>
                    <option value="ICRF_HELIO">Sun centred</option>
                    <option value="ICRF_BODY:earth">Earth inertial</option>
                    <option value="FIXED:earth">Earth fixed</option>
                  </select>
                </label>
                <label className="setting-row">
                  View preset
                  <select
                    aria-label="View preset"
                    value={mapState?.camera?.preset ?? 'wide'}
                    onChange={(event) =>
                      mapCommand((engine) =>
                        engine.focus(engine.focusedId, {
                          wide: event.target.value === 'wide',
                          select: selectedId !== null,
                          recordHistory: false,
                        }),
                      )
                    }
                  >
                    <option value="close">Close</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                <a
                  className="small-link"
                  href={compatibilityHref}
                  onClick={compatibility}
                >
                  Use WebGL2 compatibility mode ↗
                </a>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </header>
      <section className="intro">
        <div className="eyebrow">
          <span className="tiny-line" /> YOUR WINDOW TO THE COSMOS
        </div>
        <h1>
          A universe.
          <br />
          <em>Always in motion.</em>
        </h1>
        <p>
          Follow a world. Find a new perspective.
          <br />
          Travel through space, and through time.
        </p>
      </section>
      <div className="map-caption">
        <span className="status-dot" />{' '}
        {mode === 'live' ? 'THE SOLAR SYSTEM, NOW' : 'TRAVELLING THROUGH TIME'}
        <span className="caption-line" />
        <span>
          ICRF · {scale === 'explore' ? 'EXPLORE SCALE' : 'TRUE SCALE'}
        </span>
      </div>
      {body && (
        <aside className="object-card" aria-label={`${body.name} details`}>
          <div className="card-top">
            <span className="eyebrow">
              {body.kind === 'star'
                ? 'OUR STAR'
                : body.kind === 'moon'
                  ? 'NATURAL SATELLITE'
                  : 'TERRESTRIAL PLANET'}
            </span>
            <button
              className="icon-button"
              aria-label="Close object card"
              onClick={() => engine?.select(null)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2>
            {body.name}
            <span style={{ background: body.color }} />
          </h2>
          <p className="description">{body.description}</p>
          <Metrics id={body.id} unit={unit} />
          <div className="card-actions">
            <button
              className="primary-button"
              onClick={() => focusObject(body.id)}
            >
              <Icon name="focus" /> Get closer
            </button>
            <button
              className={'secondary-button ' + (following ? 'active' : '')}
              onClick={() => {
                mapCommand((engine) =>
                  engine.follow(following ? null : body.id),
                );
              }}
            >
              {following ? '◎ Following' : '○ Follow'}
            </button>
          </div>
          <button
            className="detail-toggle"
            onClick={() => setDetails(!details)}
          >
            {details ? 'Less' : 'More'} about this world{' '}
            <span>{details ? '−' : '+'}</span>
          </button>
          {details && (
            <div className="detail-body">
              <p>
                Mean radius: {body.physical.meanRadiusKm?.toLocaleString()} km
              </p>
              {body.physical.periodDays && (
                <p>
                  Orbital period: {body.physical.periodDays.toLocaleString()}{' '}
                  Earth days
                </p>
              )}
              <p>
                {body.astronomyBody || body.id === 'moon:callisto'
                  ? 'Positions combine an analytic ephemeris with JPL Horizons corrections.'
                  : body.provenance.certainty === 'approximate'
                    ? 'Positions use approximate orbital models between JPL Horizons snapshots.'
                    : 'Positions use a local analytic ephemeris.'}{' '}
                These are calculated positions, not spacecraft telemetry.
                {body.provenance.uncertaintyNote &&
                  ` ${body.provenance.uncertaintyNote}`}
              </p>
              <a
                href={body.provenance.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {body.provenance.providerId === 'jpl-horizons-orbital-elements'
                  ? 'NASA/JPL'
                  : 'astronomy-engine'}{' '}
                · method & source ↗
              </a>
            </div>
          )}
          <div className="provenance">
            <span className="provenance-dot" /> CALCULATED POSITION{' '}
            <span>
              {body.astronomyBody || body.id === 'moon:callisto'
                ? 'JPL-corrected ephemeris'
                : body.provenance.certainty === 'approximate'
                  ? 'Approximate orbit'
                  : 'Analytic ephemeris'}
            </span>
          </div>
        </aside>
      )}
      <div className="view-tools">
        <button
          className="icon-button"
          onClick={previousView}
          aria-label="Previous view"
        >
          <Icon name="back" />
        </button>
        <button
          className="icon-button"
          onClick={solarOverview}
          aria-label="Solar system overview"
        >
          <Icon name="orbit" />
        </button>
        <span />
        <button
          className={'scale-button ' + (scale === 'explore' ? 'active' : '')}
          onClick={() => {
            const next = scale === 'explore' ? 'true' : 'explore';
            mapCommand((engine) => engine.setScale(next));
          }}
          title="Explore scale enlarges distant bodies; physical distances stay unchanged"
        >
          {scale === 'explore' ? 'Explore scale' : 'True scale'}
        </button>
        <button
          className="icon-button"
          onClick={share}
          ref={shareRef}
          aria-label="Share this view"
        >
          <Icon name="share" />
        </button>
      </div>
      <section className="bottom-dock">
        <div className="destinations">
          <span>GO SOMEWHERE</span>
          {destinations.map((b) => (
            <button
              key={b.id}
              className={selectedId === b.id ? 'chosen' : ''}
              onClick={() => choose(b.id)}
              disabled={!ready}
            >
              <i style={{ background: b.color }} />
              {b.name}
              <span>↗</span>
            </button>
          ))}
        </div>
        <div className="timeline">
          <button
            className={'live-button ' + (mode === 'live' ? 'is-live' : '')}
            onClick={goLive}
          >
            <span /> LIVE
          </button>
          <div className="time-block">
            <span className="time-label">UNIVERSAL TIME</span>
            <button
              id="clock-readout"
              onClick={() => dateRef.current?.showPicker()}
              aria-label="Choose simulation date"
            >
              Connecting to the cosmos…
            </button>
          </div>
          <input
            className="date-input"
            ref={dateRef}
            type="datetime-local"
            aria-label="Simulation date in UTC"
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
            value={dateDraft ?? utcDate}
            onChange={(e) => {
              const value = e.target.value;
              setDateDraft(value);
              if (setDateInput(value)) setDateDraft(null);
              else setNotice('Choose a valid UTC date from 1900 through 2100.');
            }}
            onBlur={() => setDateDraft(null)}
          />
          <div className="playback">
            <button
              className="icon-button"
              aria-label="Reverse time"
              onClick={reversePlayback}
            >
              ↶
            </button>
            <button
              className="play-button"
              aria-label={mode === 'paused' ? 'Play' : 'Pause'}
              onClick={togglePlayback}
            >
              {mode === 'paused' ? '▶' : 'Ⅱ'}
            </button>
            <select
              aria-label="Playback speed"
              value={Math.abs(rate)}
              onChange={(e) =>
                setPlaybackRate(Number(e.target.value) * Math.sign(rate || 1))
              }
            >
              {rates.map((r, i) => (
                <option key={r} value={r}>
                  {rate < 0 ? '−' : ''}
                  {rateLabels[i]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="dock-foot">
          <span>
            Drag to orbit <b>·</b> Scroll to explore <b>·</b> Double-click to
            focus
          </span>
          <button onClick={() => setHelp(true)}>
            <Icon name="help" /> Field guide
          </button>
        </div>
      </section>
      <footer className="map-footer">
        <span>
          THE SPACE TIME CONTINUUM <b>/</b> ARCHITECTURE PREVIEW
        </span>
        <RenderStatus />
      </footer>
      {!ready && !error && (
        <div className="loading-screen">
          <span className="loader-orbit" />
          <p>Finding our place in the universe</p>
          <small>Preparing the renderer and planetary maps</small>
        </div>
      )}
      {error && (
        <div className="error-panel" role="alert">
          <h2>A different way to explore</h2>
          <p>Your graphics session could not start.</p>
          <p>{error}</p>
          <a
            className="primary-button"
            href={compatibilityHref}
            onClick={compatibility}
          >
            Try compatibility mode
          </a>
          <a href="/about/data">Read about the solar system data</a>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {body ? `Selected ${body.name}. ${body.description}` : ''}
      </span>
      <ShareViewDialog
        url={shareUrl}
        onClose={() => setShareUrl(null)}
        returnFocus={shareRef}
      />
      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="search-dialog">
            <Dialog.Title className="sr-only">Find a world</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search the four worlds available in this architecture preview.
            </Dialog.Description>
            <div className="search-box">
              <Icon name="search" />
              <input
                autoFocus
                placeholder="Where would you like to go?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered[0]) choose(filtered[0].id);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document
                      .querySelector<HTMLButtonElement>('.search-result')
                      ?.focus();
                  }
                }}
              />
              <Dialog.Close aria-label="Close search">
                <kbd>esc</kbd>
              </Dialog.Close>
            </div>
            <div className="search-heading">
              WORLDS TO EXPLORE <span>{filtered.length} destinations</span>
            </div>
            {filtered.map((b) => (
              <button
                className="search-result"
                key={b.id}
                onClick={() => choose(b.id)}
              >
                <i style={{ background: b.color }} />
                <span>
                  {b.name}
                  <small>{b.kind} · Solar system</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
            {!filtered.length && (
              <p className="empty-search">
                No worlds found. Try Jupiter, Europa, Pluto, or Earth.
              </p>
            )}
            <div className="search-foot">
              ↑ ↓ Tab to navigate <span>↵ to explore</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={help} onOpenChange={setHelp}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="help-dialog">
            <Dialog.Title>Your field guide</Dialog.Title>
            <Dialog.Description>
              A few simple ways to travel.
            </Dialog.Description>
            {[
              ['Drag / arrow keys', 'Orbit your destination'],
              ['Scroll / + − / pinch', 'Move closer or farther away'],
              ['Shift + drag', 'Pan the view'],
              ['F', 'Focus the selected world'],
              ['Space', 'Play or pause time'],
              ['L', 'Return to live time'],
              ['[ / ]', 'Change playback speed'],
              ['Backspace', 'Return to your previous view'],
              ['/', 'Find a world'],
            ].map(([a, b]) => (
              <div className="setting-row" key={a}>
                <kbd>{a}</kbd>
                <span>{b}</span>
              </div>
            ))}
            <p>
              Explore scale enlarges distant worlds for visibility. True scale
              preserves their physical radii. Object card measurements always
              use physical coordinates.
            </p>
            <Dialog.Close className="primary-button">
              Ready to explore
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
function Metrics({ id, unit }: { id: string; unit: 'km' | 'mi' | 'AU' }) {
  const engine = useEngineStore((s) => s.engine);
  useEngineStore((s) => s.perf);
  const m = engine?.getMetrics(id);
  const format = (km: number) => {
    const n =
      unit === 'mi' ? km * 0.621371 : unit === 'AU' ? km / 149597870.7 : km;
    return `${n > 1e6 ? (n / 1e6).toFixed(2) + ' M' : n.toLocaleString(undefined, { maximumFractionDigits: unit === 'AU' ? 3 : 0 })} ${unit}`;
  };
  return (
    <dl className="metrics">
      <div>
        <dt>FROM THE SUN</dt>
        <dd>{m ? format(m.distanceSunKm) : '—'}</dd>
      </div>
      <div>
        <dt>FROM EARTH</dt>
        <dd>{m ? format(m.distanceEarthKm) : '—'}</dd>
      </div>
      <div>
        <dt>ORBITAL SPEED · SSB</dt>
        <dd>{m ? m.speedKmPerSec.toFixed(2) + ' km/s' : '—'}</dd>
      </div>
      <div>
        <dt>MEAN DIAMETER</dt>
        <dd>{m ? format(m.radiusKm * 2) : '—'}</dd>
      </div>
    </dl>
  );
}
function RenderStatus() {
  const backend = useEngineStore((s) => s.backend),
    perf = useEngineStore((s) => s.perf);
  const [debug, setDebug] = useState(false);
  useEffect(
    () => setDebug(new URLSearchParams(location.search).has('perf')),
    [],
  );
  return (
    <span className="render-status">
      <i />
      {backend.toUpperCase()}
      {debug && perf
        ? ` · ${perf.fps.toFixed(0)} FPS · p95 ${perf.p95Ms.toFixed(1)} ms · ${perf.drawCalls} draws · ${perf.tier}`
        : ' · BUILT TO WANDER'}
    </span>
  );
}
