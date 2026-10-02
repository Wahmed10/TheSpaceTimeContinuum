import { describe, expect, it } from 'vitest';
import { EXPLORABLE_BODIES, LAYERS } from '@space/domain';
import {
  AVAILABLE_LAYER_IDS,
  buildCompatibilityHref,
  parseExploreLocation,
  resolveObjectRoute,
  serializeExploreState,
} from '../src/lib/routeState';

describe('catalog route resolution', () => {
  it.each(EXPLORABLE_BODIES)(
    'resolves $id to its canonical object path',
    (body) => {
      const slug = body.id.split(':')[1]!;
      expect(resolveObjectRoute(body.kind, slug)).toMatchObject({
        status: 'object',
        body,
        pathname: `/object/${body.kind}/${slug}`,
      });
      const parsed = parseExploreLocation(`/object/${body.kind}/${slug}`, '');
      expect(parsed.state.focus).toBe(body.id);
      expect(parsed.selectedId).toBe(body.id);
      expect(parsed.state.camera.preset).toBe('close');
      expect(parsed.issues).toEqual([]);
    },
  );

  it.each(['sb', 'sat', 'sc', 'asteroid', 'satellite', 'spacecraft', 'comet'])(
    'does not invent future %s objects',
    (kind) => {
      expect(resolveObjectRoute(kind, 'mars').status).toBe('not-found');
    },
  );
  it('checks kind, slug and membership instead of manufacturing IDs', () => {
    for (const [kind, slug] of [
      ['moon', 'mars'],
      ['planet', 'unknown'],
      ['planet', '../mars'],
      ['planet', 'Mars'],
      ['planet', 'x'.repeat(101)],
    ]) {
      expect(resolveObjectRoute(kind!, slug!).status).toBe('not-found');
    }
    expect(parseExploreLocation('/object/moon/charon', '').state.focus).toBe(
      'moon:charon',
    );
    expect(parseExploreLocation('/mars', '').route.status).toBe('alias');
    expect(parseExploreLocation('/object/planet/%6dars/', '').state.focus).toBe(
      'planet:mars',
    );
  });
  it.each([
    '/object/planet/mars/extra',
    '/object/planet/%2Fmars',
    '/object%2Fplanet/mars',
    '//object/planet/mars',
    '/%FF',
    '/object/planet/%',
    '/unknown',
  ])('rejects malformed/unknown path %s', (path) => {
    expect(parseExploreLocation(path, '').route.status).toBe('not-found');
  });
});

describe('bounded query state', () => {
  it('defaults to LIVE solar overview without selecting a card', () => {
    const result = parseExploreLocation('/', '');
    expect(result.state).toEqual({
      focus: 'star:sun',
      scale: 'explore',
      layers: [...AVAILABLE_LAYER_IDS],
      camera: { preset: 'wide' },
    });
    expect(result.selectedId).toBeNull();
    expect(result.debug).toEqual({
      forceWebGL: false,
      test: false,
      perf: false,
    });
  });
  it('accepts legacy focus and gives canonical route focus precedence', () => {
    const legacy = parseExploreLocation('/', '?focus=planet%3Amars');
    expect(legacy.selectedId).toBe('planet:mars');
    expect(legacy.state.camera.preset).toBe('close');
    expect(
      parseExploreLocation('/object/moon/europa', '?focus=planet:mars').state
        .focus,
    ).toBe('moon:europa');
    expect(
      parseExploreLocation('/', '?focus=planet:unknown').selectedId,
    ).toBeNull();
  });
  it('distinguishes absent and empty layers, preserving known unavailable requests', () => {
    expect(parseExploreLocation('/', '?layers=').state.layers).toEqual([]);
    const result = parseExploreLocation(
      '/',
      '?layers=orbits,moons,moons,sat.stations,unknown',
    );
    expect(result.state.layers).toEqual(['moons', 'orbits', 'sat.stations']);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'layers', code: 'unknown' }),
    );
  });
  it('normalizes fixed time offsets and rejects invalid dates to LIVE', () => {
    expect(
      parseExploreLocation('/', '?t=2026-10-02T08%3A00%3A00-04%3A00').state.t,
    ).toBe('2026-10-02T12:00:00.000Z');
    for (const input of [
      'not-a-date',
      '2026-02-30T00:00:00Z',
      '2101-01-01T00:00:00Z',
      '2026-10-02T00:00:00',
    ]) {
      const result = parseExploreLocation(
        '/',
        `?t=${encodeURIComponent(input)}`,
      );
      expect(result.state.t).toBeUndefined();
      expect(result.issues.some((issue) => issue.field === 't')).toBe(true);
    }
  });
  it.each([
    ['focus', 'planet:mars', 'planet:earth'],
    ['t', '2000-01-01T00:00:00Z', '2026-10-02T00:00:00Z'],
    ['layers', 'moons', 'orbits'],
    ['scale', 'true', 'explore'],
    ['frame', 'earth', 'helio'],
    ['view', 'close', 'wide'],
  ])('rejects ambiguous repeated %s fields independently', (key, a, b) => {
    const result = parseExploreLocation(
      '/',
      `?${key}=${encodeURIComponent(a)}&${key}=${encodeURIComponent(b)}&scale=explore`,
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: key, code: 'duplicate' }),
    );
    const defaults = parseExploreLocation('/', '').state;
    if (key === 'view') expect(result.state.camera).toEqual(defaults.camera);
    else
      expect(result.state[key as keyof typeof result.state]).toEqual(
        defaults[key as keyof typeof defaults],
      );
  });
  it('uses enum defaults without forwarding arbitrary frame IDs', () => {
    const result = parseExploreLocation(
      '/',
      '?frame=FIXED:mars&scale=large&view=fit-both',
    );
    expect(result.state.frame).toBeUndefined();
    expect(result.state.scale).toBe('explore');
    expect(result.state.camera.preset).toBe('wide');
    expect(result.issues).toHaveLength(3);
  });
  it.each(['?t=%', '?t=%FF', '?t=%E0%A4%A', '?layers=moons&focus=%C0%AF'])(
    'safely rejects malformed encoding %s',
    (query) => {
      const result = parseExploreLocation('/object/planet/mars', query);
      expect(result.state.focus).toBe('planet:mars');
      expect(result.state.t).toBeUndefined();
      expect(result.state.layers).toEqual([...AVAILABLE_LAYER_IDS]);
      expect(result.issues.some((issue) => issue.code === 'encoding')).toBe(
        true,
      );
    },
  );
  it('bounds the whole URL and individual fields before processing', () => {
    expect(
      parseExploreLocation('/', `?ignored=${'x'.repeat(4096)}`).issues[0]
        ?.field,
    ).toBe('url');
    const result = parseExploreLocation(
      '/',
      `?focus=${'x'.repeat(101)}&t=${'x'.repeat(65)}&layers=${'x'.repeat(513)}`,
    );
    expect(
      result.issues.filter((issue) => issue.code === 'length'),
    ).toHaveLength(3);
    expect(result.state.t).toBeUndefined();
    expect(result.selectedId).toBeNull();
    expect(
      parseExploreLocation(
        '/object/planet/mars',
        `?ignored=${'x'.repeat(4096)}`,
      ).state.focus,
    ).toBe('planet:mars');
  });
  it('validates debug flags separately and confines the reference scenario to diagnostics', () => {
    expect(
      parseExploreLocation(
        '/lab/poc',
        '?renderer=webgl&test=1&perf&scenario=leo',
      ).debug,
    ).toEqual({ forceWebGL: true, test: true, perf: true, scenario: 'leo' });
    expect(
      parseExploreLocation(
        '/',
        '?test=0&perf=false&renderer=unknown&scenario=leo',
      ).debug,
    ).toEqual({ forceWebGL: false, test: false, perf: false });
    expect(parseExploreLocation('/', '?test=1&test=0').debug.test).toBe(false);
    expect(
      parseExploreLocation('/', '?test=1&scenario=leo').debug.scenario,
    ).toBe('leo');
    expect(parseExploreLocation('/', '?unrelated=value').issues).toEqual([]);
  });
});

describe('public serialization', () => {
  it('round-trips all current objects, frame aliases, scales and view presets', () => {
    for (const body of EXPLORABLE_BODIES) {
      for (const frame of ['', 'earth', 'helio', 'earth-fixed']) {
        for (const scale of ['true', 'explore']) {
          for (const view of ['close', 'wide']) {
            const inputQuery = `?${frame ? `frame=${frame}&` : ''}scale=${scale}&view=${view}&layers=orbits,moons&t=2000-01-01T00%3A00%3A00Z`;
            const state = parseExploreLocation(
              `/object/${body.kind}/${body.id.split(':')[1]}`,
              inputQuery,
            ).state;
            const href = serializeExploreState(state);
            const [path, query = ''] = href.split('?');
            expect(parseExploreLocation(path!, query).state).toEqual(state);
            expect(
              serializeExploreState(parseExploreLocation(path!, query).state),
            ).toBe(href);
          }
        }
      }
    }
  });
  it('orders layers deterministically and preserves explicitly all-off links', () => {
    const state = parseExploreLocation('/', '?focus=planet:mars&layers=').state;
    const href = serializeExploreState(state);
    expect(href).toBe('/object/planet/mars?layers=');
    expect(
      parseExploreLocation('/object/planet/mars', '?layers=').state.layers,
    ).toEqual([]);
    expect(
      serializeExploreState({
        ...state,
        layers: [...LAYERS].reverse().map((layer) => layer.id),
      }),
    ).toContain(encodeURIComponent(LAYERS.map((layer) => layer.id).join(',')));
  });
  it('keeps compatibility state while removing unrelated diagnostic flags', () => {
    const state = parseExploreLocation(
      '/',
      '?focus=moon:europa&t=2026-10-02T00:00:00Z&layers=moons&scale=true&frame=earth&view=wide&test=1&perf=1&scenario=leo&renderer=webgl',
    ).state;
    const publicHref = serializeExploreState(state);
    expect(publicHref).not.toMatch(/test=|perf=|scenario=|renderer=/);
    const compatibility = buildCompatibilityHref(state);
    expect(compatibility).toContain('renderer=webgl');
    const [path, query] = compatibility.split('?');
    expect(parseExploreLocation(path!, query!).state).toEqual(state);
  });
  it('does not silently serialize states it cannot restore', () => {
    const state = parseExploreLocation('/', '').state;
    expect(() =>
      serializeExploreState({ ...state, focus: 'sat:25544' }),
    ).toThrow(RangeError);
    expect(() =>
      serializeExploreState({ ...state, t: '2026-02-30T00:00:00Z' }),
    ).toThrow(RangeError);
    expect(() =>
      serializeExploreState({
        ...state,
        frame: 'FIXED:mars' as NonNullable<typeof state.frame>,
      }),
    ).toThrow(RangeError);
  });
});
