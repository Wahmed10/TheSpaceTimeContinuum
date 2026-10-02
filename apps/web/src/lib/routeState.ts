import { BODY_BY_ID, EXPLORABLE_BODIES, LAYERS } from '@space/domain';
import type { BodySpec, MapState } from '@space/domain';
import { parseUtcInstant } from './utcInput';

export type LayerId = (typeof LAYERS)[number]['id'];
export type PublicCameraFrame =
  'ICRF_BODY:earth' | 'ICRF_HELIO' | 'FIXED:earth';
export interface ExploreMapState extends MapState {
  layers: LayerId[];
  scale: 'explore' | 'true';
  frame?: PublicCameraFrame;
  camera: { preset: 'close' | 'wide' };
  secondary?: never;
  playback?: never;
}
export interface RouteIssue {
  field:
    | 'url'
    | 'path'
    | 'query'
    | 'focus'
    | 't'
    | 'layers'
    | 'scale'
    | 'frame'
    | 'view'
    | 'renderer'
    | 'test'
    | 'perf'
    | 'scenario';
  code:
    'length' | 'encoding' | 'duplicate' | 'unknown' | 'invalid' | 'unsupported';
  message: string;
}
export interface ExploreDebugFlags {
  forceWebGL: boolean;
  test: boolean;
  perf: boolean;
  scenario?: 'leo';
}
type ObjectRoute = { status: 'object'; body: BodySpec; pathname: string };
type MissingRoute = {
  status: 'not-found';
  reason: 'invalid-path' | 'unknown-object' | 'unsupported-kind';
};
export type ExploreRoute =
  | ObjectRoute
  | MissingRoute
  | { status: 'overview' }
  | { status: 'alias'; body: BodySpec; pathname: string }
  | { status: 'lab' };
export interface ParsedExploreLocation {
  route: ExploreRoute;
  state: ExploreMapState;
  selectedId: string | null;
  debug: ExploreDebugFlags;
  issues: RouteIssue[];
}

export const AVAILABLE_LAYER_IDS = [
  'planets',
  'moons',
  'dwarfs',
  'orbits',
] as const;
/** Future mappings are a contract, not a source of currently available entities. */
export const OBJECT_ROUTE_KINDS = {
  star: 'star',
  planet: 'planet',
  moon: 'moon',
  dwarf: 'dwarf',
  sb: 'asteroid',
  sat: 'satellite',
  sc: 'spacecraft',
} as const;
const CURRENT_KINDS = new Set(['star', 'planet', 'moon', 'dwarf']);
const FRAME_ALIASES: Record<string, PublicCameraFrame> = {
  earth: 'ICRF_BODY:earth',
  helio: 'ICRF_HELIO',
  'earth-fixed': 'FIXED:earth',
};
const knownLayers = new Set<string>(LAYERS.map((layer) => layer.id));

export function resolveObjectRoute(
  kind: string,
  slug: string,
): ObjectRoute | MissingRoute {
  if (!CURRENT_KINDS.has(kind))
    return { status: 'not-found', reason: 'unsupported-kind' };
  if (slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: 'not-found', reason: 'invalid-path' };
  }
  const body = BODY_BY_ID.get(`${kind}:${slug}`);
  if (!body || body.kind !== kind)
    return { status: 'not-found', reason: 'unknown-object' };
  return { status: 'object', body, pathname: `/object/${kind}/${slug}` };
}

function resolvePath(pathname: string): ExploreRoute {
  if (pathname === '/') return { status: 'overview' };
  if (pathname === '/lab/poc' || pathname === '/lab/precision')
    return { status: 'lab' };
  const object = /^\/object\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (object) return resolveObjectRoute(object[1]!, object[2]!);
  const alias = /^\/([a-z0-9-]+)\/?$/.exec(pathname);
  const body =
    alias &&
    EXPLORABLE_BODIES.find((body) => body.id.split(':')[1] === alias[1]);
  return body
    ? { status: 'alias', body, pathname: `/object/${body.kind}/${alias![1]}` }
    : { status: 'not-found', reason: 'invalid-path' };
}

function defaults(route: ExploreRoute): ParsedExploreLocation {
  const body =
    route.status === 'object' || route.status === 'alias'
      ? route.body
      : undefined;
  return {
    route,
    selectedId: body?.id ?? null,
    state: {
      focus: body?.id ?? 'star:sun',
      scale: 'explore',
      layers: [...AVAILABLE_LAYER_IDS],
      camera: { preset: body ? 'close' : 'wide' },
    },
    debug: { forceWebGL: false, test: false, perf: false },
    issues: [],
  };
}

/** Cold-path, bounded and renderer-free. Bad query input never throws at startup. */
export function parseExploreLocation(
  pathname: string,
  search: string,
): ParsedExploreLocation {
  if (pathname.length > 4096) {
    const result = defaults({ status: 'not-found', reason: 'invalid-path' });
    result.issues.push({
      field: 'url',
      code: 'length',
      message: 'The link is too long; default settings were used.',
    });
    return result;
  }
  let decodedPath: string;
  try {
    const segments = pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment));
    if (segments.some((segment) => segment.includes('/')))
      throw new URIError('Encoded path separator');
    decodedPath = segments.join('/');
  } catch {
    const result = defaults({ status: 'not-found', reason: 'invalid-path' });
    result.issues.push({
      field: 'path',
      code: 'encoding',
      message: 'The object path is malformed.',
    });
    return result;
  }
  const result = defaults(resolvePath(decodedPath));
  if (pathname.length + search.length > 4096) {
    result.issues.push({
      field: 'url',
      code: 'length',
      message: 'The link settings are too long; defaults were used.',
    });
    return result;
  }
  // URLSearchParams replaces invalid UTF-8 and accepts bad percent escapes.
  // Validate first; rejecting the complete query also prevents malformed duplicates
  // from leaving a different valid occurrence in control of a field.
  try {
    decodeURIComponent(search.replace(/\+/g, ' '));
  } catch {
    result.issues.push({
      field: 'query',
      code: 'encoding',
      message: 'The link settings are malformed; defaults were used.',
    });
    return result;
  }
  const query = new URLSearchParams(search);
  function issue(
    field: RouteIssue['field'],
    code: RouteIssue['code'],
    message: string,
  ) {
    result.issues.push({ field, code, message });
  }
  function read(
    field: RouteIssue['field'],
    maxLength: number,
  ): string | undefined {
    const values = query.getAll(field);
    if (values.length > 1) {
      issue(
        field,
        'duplicate',
        `The ${field} setting was repeated; its default was used.`,
      );
      return undefined;
    }
    const value = values[0];
    if (value !== undefined && value.length > maxLength) {
      issue(
        field,
        'length',
        `The ${field} setting is too long; its default was used.`,
      );
      return undefined;
    }
    return value;
  }
  const focus = read('focus', 100);
  if (focus !== undefined) {
    const body = BODY_BY_ID.get(focus);
    if (!body)
      issue(
        'focus',
        'unknown',
        'The linked object is not available in this catalog.',
      );
    else if (
      result.route.status !== 'object' &&
      result.route.status !== 'alias' &&
      result.route.status !== 'not-found'
    ) {
      result.state.focus = body.id;
      result.selectedId = body.id;
      result.state.camera.preset = 'close';
    }
  }
  const time = read('t', 64);
  if (time !== undefined) {
    const parsed = parseUtcInstant(time);
    if (parsed.ok) result.state.t = parsed.iso;
    else
      issue(
        't',
        'invalid',
        'The date is invalid or outside 1900–2100; LIVE time was used.',
      );
  }
  const layers = read('layers', 512);
  if (layers !== undefined) {
    const requested = layers === '' ? [] : layers.split(',');
    if (requested.some((id) => !knownLayers.has(id)))
      issue('layers', 'unknown', 'Unknown layers were omitted.');
    const ids = new Set(requested);
    result.state.layers = LAYERS.filter((layer) => ids.has(layer.id)).map(
      (layer) => layer.id,
    );
  }
  const scale = read('scale', 16);
  if (scale === 'explore' || scale === 'true') result.state.scale = scale;
  else if (scale !== undefined)
    issue(
      'scale',
      'invalid',
      'The scale setting is invalid; Explore scale was used.',
    );
  const frame = read('frame', 32);
  if (frame !== undefined) {
    if (Object.hasOwn(FRAME_ALIASES, frame))
      result.state.frame = FRAME_ALIASES[frame]!;
    else
      issue(
        'frame',
        'invalid',
        'The reference-frame setting is invalid; the default was used.',
      );
  }
  const view = read('view', 16);
  if (view === 'close' || view === 'wide') result.state.camera.preset = view;
  else if (view !== undefined)
    issue(
      'view',
      'invalid',
      'The view setting is invalid; the default was used.',
    );

  const renderer = read('renderer', 16);
  if (renderer === 'webgl') result.debug.forceWebGL = true;
  else if (renderer !== undefined)
    issue(
      'renderer',
      'invalid',
      'The compatibility setting is invalid; automatic graphics selection was used.',
    );
  for (const flag of ['test', 'perf'] as const) {
    const value = read(flag, 5);
    if (value === '' || value === '1' || value === 'true')
      result.debug[flag] = true;
    else if (value !== undefined && value !== '0' && value !== 'false')
      issue(flag, 'invalid', `The ${flag} diagnostic flag was ignored.`);
  }
  const scenario = read('scenario', 16);
  if (
    scenario === 'leo' &&
    (result.route.status === 'lab' || result.debug.test || result.debug.perf)
  ) {
    result.debug.scenario = 'leo';
  } else if (scenario !== undefined)
    issue(
      'scenario',
      'unsupported',
      'The diagnostic camera scenario was ignored.',
    );
  return result;
}

/** Public links carry only the supported semantic state, never arbitrary camera floats. */
export function serializeExploreState(
  state: ExploreMapState,
  options: { overview?: boolean; renderer?: 'webgl' } = {},
): string {
  const body = BODY_BY_ID.get(state.focus);
  if (
    !body ||
    !CURRENT_KINDS.has(body.kind) ||
    state.secondary !== undefined ||
    state.playback !== undefined
  ) {
    throw new RangeError('Unsupported public object state');
  }
  if (state.scale !== 'explore' && state.scale !== 'true')
    throw new RangeError('Unsupported scale');
  if (state.camera.preset !== 'close' && state.camera.preset !== 'wide')
    throw new RangeError('Unsupported camera preset');
  const route =
    options.overview && state.focus === 'star:sun'
      ? '/'
      : `/object/${body.kind}/${body.id.split(':')[1]!}`;
  const query = new URLSearchParams();
  if (state.t !== undefined) {
    const time = parseUtcInstant(state.t);
    if (!time.ok) throw new RangeError('Unsupported date');
    query.set('t', time.iso);
  }
  if (state.layers.some((id) => !knownLayers.has(id)))
    throw new RangeError('Unsupported layer');
  const requested = new Set(state.layers);
  const layers = LAYERS.filter((layer) => requested.has(layer.id)).map(
    (layer) => layer.id,
  );
  if (layers.join(',') !== AVAILABLE_LAYER_IDS.join(','))
    query.set('layers', layers.join(','));
  if (state.scale !== 'explore') query.set('scale', state.scale);
  if (state.frame !== undefined) {
    const frame = Object.entries(FRAME_ALIASES).find(
      ([, id]) => id === state.frame,
    )?.[0];
    if (!frame) throw new RangeError('Unsupported public reference frame');
    query.set('frame', frame);
  }
  if (state.camera.preset !== (route === '/' ? 'wide' : 'close'))
    query.set('view', state.camera.preset);
  if (options.renderer) query.set('renderer', options.renderer);
  const search = query.toString();
  const href = `${route}${search ? `?${search}` : ''}`;
  if (href.length > 4096) throw new RangeError('Public link is too long');
  return href;
}

export function buildCompatibilityHref(state: ExploreMapState): string {
  return serializeExploreState(state, { renderer: 'webgl' });
}
