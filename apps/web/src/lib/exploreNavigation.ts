import { BODY_BY_ID, LAYERS } from '@space/domain';
import type { MapState } from '@space/domain';
import { parseExploreLocation, serializeExploreState } from './routeState';
import type {
  ExploreDebugFlags,
  ExploreMapState,
  ParsedExploreLocation,
  PublicCameraFrame,
} from './routeState';

/** Explicit diagnostic navigation; public sharing uses serializeExploreState directly. */
export function withExploreDebug(
  href: string,
  debug: ExploreDebugFlags,
): string {
  const [pathname, search] = href.split('?');
  const query = new URLSearchParams(search);
  if (debug.forceWebGL) query.set('renderer', 'webgl');
  if (debug.test) query.set('test', '1');
  if (debug.perf) query.set('perf', '1');
  if (debug.scenario) query.set('scenario', debug.scenario);
  return `${pathname}${query.size ? `?${query}` : ''}`;
}

export function friendlyRedirectHref(
  alias: string,
  rawSearch: string,
): string | null {
  const parsed = parseExploreLocation(
    `/${encodeURIComponent(alias)}`,
    rawSearch,
  );
  if (parsed.route.status !== 'alias') return null;
  return withExploreDebug(serializeExploreState(parsed.state), parsed.debug);
}

/** Next provides decoded searchParams. Bound reconstruction before passing to the shared codec. */
export function boundedSearchParams(
  values: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  let size = 0;
  for (const [key, value] of Object.entries(values)) {
    for (const item of value === undefined
      ? []
      : Array.isArray(value)
        ? value
        : [value]) {
      size += key.length + item.length + 2;
      if (size > 4096) return '?'.padEnd(4097, 'x');
      // A replacement character means Next already discarded malformed UTF-8.
      if (key.includes('\uFFFD') || item.includes('\uFFFD')) return '?%FF';
      query.append(key, item);
    }
  }
  const search = query.toString();
  return search.length > 4096 ? '?'.padEnd(4097, 'x') : `?${search}`;
}

export function selectionHref(
  id: string,
  parsed: ParsedExploreLocation,
  actual: MapState | null,
): string | null {
  if (!BODY_BY_ID.has(id)) return null;
  const state: ExploreMapState = {
    ...parsed.state,
    focus: id,
    camera: { preset: 'close' },
  };
  if (actual) {
    delete state.t;
    delete state.frame;
    if (actual.t) state.t = actual.t;
    if (
      actual.frame === 'ICRF_BODY:earth' ||
      actual.frame === 'ICRF_HELIO' ||
      actual.frame === 'FIXED:earth'
    )
      state.frame = actual.frame as PublicCameraFrame;
    state.scale = actual.scale ?? 'explore';
    if (actual.layers)
      state.layers = LAYERS.filter((layer) =>
        actual.layers!.includes(layer.id),
      ).map((layer) => layer.id);
  }
  return withExploreDebug(serializeExploreState(state), parsed.debug);
}
