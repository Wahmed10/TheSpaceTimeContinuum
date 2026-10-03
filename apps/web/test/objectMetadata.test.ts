import { expect, it } from 'vitest';
import { EXPLORABLE_BODIES } from '@space/domain';
import {
  objectMetadata,
  overviewMetadata,
  parseSiteOrigin,
} from '../src/lib/objectMetadata';
import {
  boundedSearchParams,
  friendlyRedirectHref,
  selectionHref,
} from '../src/lib/exploreNavigation';
import { parseExploreLocation } from '../src/lib/routeState';

it.each(EXPLORABLE_BODIES)(
  'builds catalog-only metadata for $id without inventing an origin',
  (body) => {
    const slug = body.id.split(':')[1]!;
    const metadata = objectMetadata(body.kind, slug)!;
    expect(metadata.title).toBe(`${body.name} — Continuum`);
    expect(metadata.description).toContain(body.description);
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      title: `${body.name} — Continuum`,
    });
    expect(metadata.other).toEqual({ 'continuum:object-type': body.kind });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).not.toHaveProperty('url');
    expect(metadata).not.toHaveProperty('metadataBase');
  },
);
it('uses a validated origin for canonical URLs with catalog paths only', () => {
  const metadata = objectMetadata(
    'moon',
    'charon',
    'https://continuum.example/',
  );
  expect(metadata?.alternates?.canonical).toBe(
    'https://continuum.example/object/moon/charon',
  );
  expect(metadata?.openGraph).toHaveProperty(
    'url',
    'https://continuum.example/object/moon/charon',
  );
  expect(
    overviewMetadata('https://continuum.example').alternates?.canonical,
  ).toBe('https://continuum.example/');
});
it.each([
  undefined,
  '',
  'not a url',
  'javascript:alert(1)',
  'ftp://example.com',
  'https://user:pass@example.com',
  'https://example.com/a',
  'https://example.com/?a=1',
  'https://example.com/#part',
])('omits an invalid/unconfigured origin: %s', (origin) => {
  expect(parseSiteOrigin(origin)).toBeUndefined();
  expect(objectMetadata('planet', 'mars', origin)?.alternates).toBeUndefined();
});
it('normalizes an explicit HTTP(S) origin and refuses unknown/future catalog routes', () => {
  expect(parseSiteOrigin(' https://CONTINUUM.example:443/ ')).toBe(
    'https://continuum.example',
  );
  expect(parseSiteOrigin('http://localhost:3000')).toBe(
    'http://localhost:3000',
  );
  expect(objectMetadata('planet', 'missing')).toBeNull();
  expect(objectMetadata('sat', '25544')).toBeNull();
});
it('friendly redirects preserve normalized public state and validated diagnostic flags', () => {
  const href = friendlyRedirectHref(
    'mars',
    '?t=2026-10-02T08%3A00%3A00-04%3A00&frame=earth-fixed&layers=&view=wide&renderer=webgl&test=1&unknown=drop',
  );
  const url = new URL(href!, 'https://continuum.example');
  expect(url.pathname).toBe('/object/planet/mars');
  expect(url.searchParams.get('t')).toBe('2026-10-02T12:00:00.000Z');
  expect(url.searchParams.get('layers')).toBe('');
  expect(url.searchParams.get('frame')).toBe('earth-fixed');
  expect(url.searchParams.get('renderer')).toBe('webgl');
  expect(url.searchParams.get('test')).toBe('1');
  expect(url.searchParams.has('unknown')).toBe(false);
  expect(friendlyRedirectHref('not-a-body', '')).toBeNull();
  expect(friendlyRedirectHref('mars/../earth', '')).toBeNull();
  expect(friendlyRedirectHref('mars', '?t=%FF&test=1')).toBe(
    '/object/planet/mars',
  );
});
it('selection creates a canonical close view while retaining accepted engine state', () => {
  const parsed = parseExploreLocation('/', '?renderer=webgl&test=1');
  const href = selectionHref('moon:europa', parsed, {
    focus: 'planet:earth',
    frame: 'ICRF_SSB',
    t: '2026-10-02T12:00:00Z',
    scale: 'true',
    layers: [],
  });
  expect(href).not.toBeNull();
  const url = new URL(href!, 'https://continuum.example');
  const restored = parseExploreLocation(url.pathname, url.search);
  expect(restored.state).toMatchObject({
    focus: 'moon:europa',
    scale: 'true',
    layers: [],
    camera: { preset: 'close' },
  });
  expect(restored.state.frame).toBeUndefined();
  expect(restored.state.t).toBe('2026-10-02T12:00:00.000Z');
  expect(restored.debug).toMatchObject({ test: true, forceWebGL: true });
  expect(selectionHref('sat:25544', parsed, null)).toBeNull();
});
it('bounds decoded server search input and retains duplicate rejection', () => {
  const search = boundedSearchParams({
    scale: ['true', 'explore'],
    layers: '',
    test: '1',
  });
  const parsed = parseExploreLocation('/object/planet/earth', search);
  expect(parsed.state.scale).toBe('explore');
  expect(parsed.issues).toContainEqual(
    expect.objectContaining({ field: 'scale', code: 'duplicate' }),
  );
  expect(parsed.state.layers).toEqual([]);
  expect(
    friendlyRedirectHref(
      'mars',
      boundedSearchParams({ t: '\uFFFD', test: '1' }),
    ),
  ).toBe('/object/planet/mars');
  expect(
    friendlyRedirectHref(
      'mars',
      boundedSearchParams({ ignored: 'x'.repeat(5000), test: '1' }),
    ),
  ).toBe('/object/planet/mars');
});
