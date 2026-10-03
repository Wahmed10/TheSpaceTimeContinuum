import { expect, it } from 'vitest';
import { RouteStateController } from '../src/engine-bridge/routeStateController';
import type {
  RouteEngine,
  RouteStateHost,
} from '../src/engine-bridge/routeStateController';
import type { MapState } from '@space/domain';

function setup(
  href = '/object/planet/earth?t=2026-10-02T12%3A00%3A00.000Z&test=1',
) {
  let location = new URL(href, 'https://example.com');
  let applied: string | null = null;
  let tickTime = '2026-10-02T12:00:00.000Z';
  let nextTimer = 0;
  const timers = new Map<number, () => void>();
  const writes: { href: string; mode: string }[] = [];
  const restores: MapState[] = [],
    focuses: string[] = [];
  let map: MapState = {
    focus: 'star:sun',
    layers: ['planets', 'moons', 'dwarfs', 'orbits'],
    scale: 'explore',
    frame: 'ICRF_SSB',
    camera: { preset: 'wide' },
  };
  let selected: string | null = null;
  let focusedId = 'star:sun';
  const engine: RouteEngine = {
    get focusedId() {
      return focusedId;
    },
    isFollowing: true,
    clock: { mode: 'live' },
    getMapState: () => ({ ...map, focus: selected ?? engine.focusedId }),
    focus: (id, options) => {
      focuses.push(id);
      focusedId = id;
      selected = options?.select === false ? null : id;
      map = {
        ...map,
        focus: id,
        camera: { preset: options?.wide ? 'wide' : 'close' },
      };
      controller.onSelection(selected);
      controller.coldChanged();
    },
    select: (id) => {
      selected = id;
      controller.onSelection(id);
      controller.coldChanged();
    },
    back: () => {
      focusedId = 'star:sun';
      map = {
        ...map,
        focus: 'star:sun',
        frame: 'ICRF_HELIO',
        camera: { preset: 'wide' },
      };
      selected = 'star:sun';
      controller.onSelection(selected);
      controller.coldChanged();
    },
    applyMapState: (state, options) => {
      restores.push(state);
      map = { ...state };
      focusedId = state.focus;
      selected = options?.select === false ? null : state.focus;
      engine.clock.mode = state.t ? 'paused' : 'live';
      controller.onSelection(selected);
      controller.coldChanged();
    },
  };
  const host: RouteStateHost = {
    location: () => ({ pathname: location.pathname, search: location.search }),
    appliedLocation: () => applied,
    markApplied: (href) => {
      applied = href;
    },
    write: (href, mode) => {
      writes.push({ href, mode });
      location = new URL(href, location);
    },
    publish: () => {},
    issues: () => {},
    currentTime: () => tickTime,
    schedule: (cb) => {
      const id = ++nextTimer;
      timers.set(id, cb);
      return id;
    },
    cancel: (id) => {
      timers.delete(id);
    },
  };
  const controller = new RouteStateController(host);
  controller.setEngine(engine);
  return {
    controller,
    engine,
    writes,
    restores,
    focuses,
    timers,
    setLocation: (href: string) => {
      location = new URL(href, location);
    },
    setMap: (state: Partial<MapState>) => {
      map = { ...map, ...state };
    },
    setTime: (iso: string) => {
      tickTime = iso;
      map = { ...map, t: iso };
    },
    fire: () => {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((cb) => cb());
    },
  };
}

it('restores external state once without feedback and skips an owned location update', () => {
  const s = setup();
  expect(s.restores).toHaveLength(1);
  expect(s.writes).toEqual([]);
  s.controller.locationChanged();
  expect(s.restores).toHaveLength(1);
});
it('one selection adds one push and one focus, including canvas event feedback', () => {
  const s = setup();
  s.controller.select('planet:mars');
  expect(s.focuses).toEqual(['planet:mars']);
  expect(s.writes).toHaveLength(1);
  expect(s.writes[0]?.mode).toBe('push');
  s.controller.locationChanged();
  expect(s.restores).toHaveLength(1);
  s.controller.select('planet:mars');
  expect(s.writes).toHaveLength(1);
});
it('an engine focus selection does not cause a second focus flight', () => {
  const s = setup();
  s.engine.focus('planet:mars');
  expect(s.focuses).toEqual(['planet:mars']);
  expect(s.writes).toHaveLength(1);
});
it('debounces explicit state, flushes the old entry before a new selection and preserves empty layers', () => {
  const s = setup();
  s.setMap({ layers: [], scale: 'true', frame: 'FIXED:earth' });
  s.controller.coldChanged();
  expect(s.writes).toEqual([]);
  expect(s.timers.size).toBe(1);
  s.controller.select('planet:mars');
  expect(s.writes.map((w) => w.mode)).toEqual(['replace-query', 'push']);
  expect(s.writes[0]?.href).toContain('layers=');
  expect(s.writes[1]?.href).toContain('frame=earth-fixed');
});
it('a popstate invalidates a captured timer and restores authoritative state', () => {
  const s = setup();
  s.setMap({ scale: 'true' });
  s.controller.coldChanged();
  const stale = [...s.timers.values()][0]!;
  s.setLocation('/object/moon/europa?layers=');
  s.controller.locationChanged('pop');
  stale();
  expect(s.writes).toEqual([]);
  expect(s.controller.state).toMatchObject({
    focus: 'moon:europa',
    layers: [],
    scale: 'explore',
  });
});
it('Previous view calls camera history once and replaces the route without a browser push', () => {
  const s = setup();
  s.controller.previous();
  expect(s.writes.map((w) => w.mode)).toEqual(['replace-route']);
  expect(s.writes[0]?.href).toContain('/object/star/sun');
  expect(s.writes[0]?.href).toContain('frame=helio');
});
it('closing and reselecting a card adds no history or focus flight', () => {
  const s = setup();
  s.engine.select(null);
  s.fire();
  expect(s.writes).toEqual([]);
  s.controller.select('planet:earth');
  expect(s.focuses).toEqual([]);
  expect(s.writes).toEqual([]);
});
it('reselecting an unchanged card does not normalize an otherwise equivalent incoming query', () => {
  const s = setup('/object/planet/earth?test=1&t=2026-10-02T12%3A00%3A00Z');
  s.controller.select('planet:earth');
  s.fire();
  expect(s.writes).toEqual([]);
});
it('playback ticks and unrelated cold commands retain one time anchor; share captures simulated time', () => {
  const s = setup();
  s.engine.clock.mode = 'playing';
  s.controller.commitTime();
  s.fire();
  s.writes.length = 0;
  s.setTime('2026-10-03T12:00:00.000Z');
  expect(s.writes).toEqual([]);
  s.setMap({ scale: 'true' });
  s.controller.coldChanged();
  s.fire();
  expect(
    new URL(s.writes[0]!.href, 'https://example.com').searchParams.get('t'),
  ).toBe('2026-10-02T12:00:00.000Z');
  const shared = new URL(s.controller.shareHref(), 'https://example.com');
  expect(shared.searchParams.get('t')).toBe('2026-10-03T12:00:00.000Z');
  expect(shared.searchParams.has('test')).toBe(false);
});
it('LIVE intent omits t through its animation and compatibility keeps only its renderer flag', () => {
  const s = setup();
  s.engine.clock.mode = 'playing';
  s.controller.commitTime(true);
  s.fire();
  expect(s.controller.state?.t).toBeUndefined();
  const href = s.controller.shareHref(true);
  expect(href).toContain('renderer=webgl');
  expect(href).not.toContain('test=');
  expect(href).not.toContain('t=');
});
it('latest startup selection is retained before an engine exists', () => {
  const s = setup();
  s.controller.setEngine(null);
  s.controller.select('planet:mars');
  s.controller.select('moon:europa');
  expect(s.controller.state?.focus).toBe('moon:europa');
});
it('disposal cancels replacements even if a callback was already captured', () => {
  const s = setup();
  s.setMap({ layers: [] });
  s.controller.coldChanged();
  const stale = [...s.timers.values()][0]!;
  s.controller.dispose();
  stale();
  expect(s.writes).toEqual([]);
});
it('explicit settings during navigation survive its owned location notification', () => {
  const s = setup();
  s.controller.select('planet:mars');
  s.controller.command(() => s.setMap({ scale: 'true', layers: [] }));
  s.fire();
  expect(s.writes).toHaveLength(1);
  s.controller.locationChanged();
  s.fire();
  expect(s.writes.map((w) => w.mode)).toEqual(['push', 'replace-query']);
  expect(s.writes[1]?.href).toContain('scale=true');
  expect(s.writes[1]?.href).toContain('layers=');
  expect(s.restores).toHaveLength(1);
});
it('ignores an obsolete owned navigation after a newer selection', () => {
  const s = setup();
  s.controller.select('planet:mars');
  const obsolete = s.writes[0]!.href;
  s.controller.select('moon:europa');
  s.setLocation(obsolete);
  s.controller.locationChanged();
  expect(s.controller.state?.focus).toBe('moon:europa');
  expect(s.restores).toHaveLength(1);
});
it('Solar overview clears the card and pushes one wide root entry', () => {
  const s = setup();
  s.controller.solarOverview();
  expect(s.writes.map((w) => w.mode)).toEqual(['push']);
  expect(s.writes[0]?.href.startsWith('/?')).toBe(true);
  expect(s.controller.state).toMatchObject({
    focus: 'star:sun',
    camera: { preset: 'wide' },
  });
});
it('StrictMode effect replay keeps old callbacks cancelled and restores command ownership', () => {
  const s = setup();
  s.setMap({ scale: 'true' });
  s.controller.coldChanged();
  const obsolete = [...s.timers.values()][0]!;
  s.controller.dispose();
  s.controller.activate();
  s.controller.setEngine(s.engine);
  obsolete();
  s.controller.select('planet:mars');
  expect(s.writes.filter((w) => w.mode === 'push')).toHaveLength(1);
});
