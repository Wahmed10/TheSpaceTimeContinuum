'use client';
import dynamic from 'next/dynamic';
import { Profiler, useEffect, useRef, useState } from 'react';
import { EXPLORABLE_BODIES } from '@space/domain';
import { useEngineStore } from '../engine-bridge/useEngineStore';
import { useSearchRendering } from '../engine-bridge/useSearchRendering';
import { parseExploreLocation, serializeExploreState } from '../lib/routeState';
import {
  focusObject,
  goLive,
  PLAYBACK_RATES,
  previousView,
  publicViewHref,
  setPlaybackRate,
  togglePlayback,
} from '../engine-bridge/timeCommands';
import LinkStateNotice from './LinkStateNotice';
import Icon from './ui/Icon';
import ShareViewDialog from './ShareViewDialog';
import ObjectCard from './objects/ObjectCard';
import LayersPopover from './controls/LayersPopover';
import SettingsPopover from './controls/SettingsPopover';
import TimeBar from './controls/TimeBar';
import FieldGuide from './controls/FieldGuide';
import HappeningNow from './HappeningNow';
import ObjectsInView from './objects/ObjectsInView';
import { pageOwnsShortcut } from '../lib/shortcutPolicy';

declare global {
  interface Window {
    __spaceConsumerCommits?: number[];
  }
}
function recordConsumerCommit() {
  const commits = window.__spaceConsumerCommits;
  if (commits && commits.length < 10000) commits.push(performance.now());
}
const EngineCanvas = dynamic(() => import('../engine-bridge/EngineCanvas'), {
  ssr: false,
});
const EntitySearch = dynamic(() => import('./search/EntitySearch'), {
  ssr: false,
});
export default function Explore({
  onChoose,
}: { onChoose?: (id: string) => void } = {}) {
  const engine = useEngineStore((s) => s.engine),
    selectedId = useEngineStore((s) => s.selectedId),
    ready = useEngineStore((s) => s.ready),
    error = useEngineStore((s) => s.error),
    routeState = useEngineStore((s) => s.routeState);
  const [searchOpen, setSearchOpen] = useState(false),
    [help, setHelp] = useState(false),
    [objectsOpen, setObjectsOpen] = useState(false),
    [notice, setNotice] = useState(''),
    [shareUrl, setShareUrl] = useState<string | null>(null);
  const searchRef = useRef<HTMLButtonElement>(null),
    settingsRef = useRef<HTMLButtonElement>(null),
    searchReturnFocus = useRef<HTMLElement | null>(null),
    shareReturnFocus = useRef<HTMLElement | null>(null);
  const panelReturnFocus = useRef<HTMLElement | null>(null);
  useSearchRendering(searchOpen);
  const body = EXPLORABLE_BODIES.find((b) => b.id === selectedId);
  const compatibilityHref = serializeExploreState(
    routeState ?? parseExploreLocation('/', '').state,
    { renderer: 'webgl' },
  );
  function openSearch() {
    searchReturnFocus.current = searchRef.current;
    setSearchOpen(true);
  }
  function choose(id: string) {
    if (onChoose) onChoose(id);
    else focusObject(id);
    setSearchOpen(false);
  }
  function openObjects(trigger: HTMLElement | null) {
    panelReturnFocus.current = trigger;
    setObjectsOpen(true);
  }
  function openHelp(trigger: HTMLElement | null) {
    panelReturnFocus.current = trigger;
    setHelp(true);
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (!pageOwnsShortcut(e)) return;
      if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openObjects(e.target as HTMLElement);
      }
      if (e.key === '?') {
        e.preventDefault();
        openHelp(e.target as HTMLElement);
      }
      if (e.key === '/') {
        e.preventDefault();
        openSearch();
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
        const index = PLAYBACK_RATES.indexOf(
          Math.abs(engine?.clock.rate ?? 1) as (typeof PLAYBACK_RATES)[number],
        );
        setPlaybackRate(
          (PLAYBACK_RATES[
            Math.max(0, Math.min(7, index + (e.key === ']' ? 1 : -1)))
          ] ?? 1) * Math.sign(engine?.clock.rate || 1),
        );
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [engine, selectedId]);
  useEffect(() => {
    const viewport = window.visualViewport;
    function resize() {
      document.documentElement.style.setProperty(
        '--visible-height',
        `${viewport?.height ?? innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        '--visible-top',
        `${viewport?.offsetTop ?? 0}px`,
      );
    }
    resize();
    window.addEventListener('resize', resize);
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      window.removeEventListener('resize', resize);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      document.documentElement.style.removeProperty('--visible-height');
      document.documentElement.style.removeProperty('--visible-top');
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function share(trigger?: HTMLElement) {
    if (!engine) return;
    shareReturnFocus.current = trigger ?? settingsRef.current;
    const url = new URL(publicViewHref(), location.origin);
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice('Link copied. A little piece of the universe, shared.');
    } catch {
      setShareUrl(url.toString());
    }
  }
  return (
    <Profiler id="ConsumerExplore" onRender={recordConsumerCommit}>
      <main className="explore consumer-shell">
        <EngineCanvas />
        <LinkStateNotice />
        <header className="topbar">
          <div className="brand" role="group" aria-label="Space Time Continuum">
            <span className="brand-mark">✳</span>
            <span>
              CONTINUUM<small>SPACE & TIME, CONNECTED</small>
            </span>
          </div>
          <button
            className="search-trigger"
            aria-label="Find a world"
            ref={searchRef}
            onClick={openSearch}
          >
            <Icon name="search" />
            <span>Find a world</span>
            <kbd>/</kbd>
          </button>
          <div className="top-actions">
            <LayersPopover />
            <SettingsPopover
              triggerRef={settingsRef}
              onHelp={() => openHelp(settingsRef.current)}
              onObjects={() => openObjects(settingsRef.current)}
              onShare={() => void share()}
            />
          </div>
        </header>
        {!body && (
          <div className="map-intro">
            <p className="eyebrow">YOUR WINDOW TO THE COSMOS</p>
            <h1>
              A universe.
              <br />
              <em>Always in motion.</em>
            </h1>
            <p>Find a world. Travel through space and time.</p>
          </div>
        )}
        <HappeningNow />
        {body && (
          <ObjectCard
            key={body.id}
            body={body}
            onShare={(trigger) => void share(trigger)}
            returnFocus={searchRef}
          />
        )}
        <TimeBar />
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
              onClick={(e) => {
                e.preventDefault();
                location.assign(publicViewHref(true));
              }}
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
          returnFocus={shareReturnFocus}
        />
        {searchOpen && (
          <EntitySearch
            onChoose={choose}
            onClose={() => setSearchOpen(false)}
            returnFocus={searchReturnFocus}
          />
        )}
        <FieldGuide
          open={help}
          onOpenChange={setHelp}
          returnFocus={panelReturnFocus}
        />
        {objectsOpen && (
          <ObjectsInView
            onChoose={choose}
            onClose={() => setObjectsOpen(false)}
            returnFocus={panelReturnFocus}
          />
        )}
      </main>
    </Profiler>
  );
}
