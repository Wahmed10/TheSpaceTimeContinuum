import { BODY_BY_ID, LAYERS } from '@space/domain';
import type { MapState } from '@space/domain';
import type { EngineApi } from '@space/engine';
import { parseExploreLocation, serializeExploreState } from '../lib/routeState';
import type {
  ExploreMapState,
  ExploreDebugFlags,
  RouteIssue,
} from '../lib/routeState';
import { withExploreDebug } from '../lib/exploreNavigation';

export type RouteWriteMode = 'push' | 'replace-route' | 'replace-query';
export interface RouteEngine extends Pick<
  EngineApi,
  'focus' | 'select' | 'back' | 'applyMapState' | 'getMapState' | 'isFollowing'
> {
  readonly focusedId: string;
  readonly clock: { mode: 'live' | 'playing' | 'paused' };
}
export interface RouteStateHost {
  location(): { pathname: string; search: string };
  appliedLocation(): string | null;
  markApplied(href: string): void;
  write(href: string, mode: RouteWriteMode): void;
  publish(
    state: ExploreMapState,
    selectedId: string | null,
    actual: MapState | null,
  ): void;
  issues(issues: readonly RouteIssue[]): void;
  currentTime(): string;
  schedule(callback: () => void, delay: number): number;
  cancel(handle: number): void;
}

/** Cold command ownership. No React, DOM, clock subscription or per-frame work. */
export class RouteStateController {
  private engine: RouteEngine | null = null;
  private accepted: ExploreMapState | null = null;
  private debug: ExploreDebugFlags = {
    forceWebGL: false,
    test: false,
    perf: false,
  };
  private selectedId: string | null = null;
  private overview = false;
  private restoring = false;
  private alive = true;
  private liveIntent = false;
  private revision = 0;
  private timer: number | undefined;
  private dirty = false;
  private pendingNavigation: string | null = null;
  private ownedNavigations = new Set<string>();

  constructor(private readonly host: RouteStateHost) {}
  get state(): ExploreMapState | null {
    return this.accepted;
  }
  activate() {
    this.alive = true;
  }

  private cancel() {
    this.revision++;
    if (this.timer !== undefined) this.host.cancel(this.timer);
    this.timer = undefined;
  }
  setEngine(engine: RouteEngine | null) {
    this.cancel();
    this.engine = engine;
    if (engine) this.locationChanged('startup');
  }
  locationChanged(source: 'location' | 'startup' | 'pop' = 'location') {
    if (!this.alive) return;
    const { pathname, search } = this.host.location();
    const href = pathname + search;
    const parsed = parseExploreLocation(pathname, search);
    if (parsed.route.status !== 'object' && parsed.route.status !== 'overview')
      return;
    if (
      source !== 'pop' &&
      this.pendingNavigation &&
      href !== this.pendingNavigation &&
      this.ownedNavigations.has(href)
    )
      return;
    if (
      source !== 'pop' &&
      this.accepted &&
      this.host.appliedLocation() === href
    ) {
      this.pendingNavigation = null;
      this.ownedNavigations.clear();
      this.normalizeLegacy(parsed);
      this.publish();
      if (this.dirty && this.timer === undefined) this.queue();
      return;
    }
    // Browser input wins over any delayed local replacement, including a
    // callback which has already been taken out of the timer queue.
    this.cancel();
    this.dirty = false;
    this.pendingNavigation = null;
    this.ownedNavigations.clear();
    this.accepted = parsed.state;
    this.debug = parsed.debug;
    this.overview =
      parsed.route.status === 'overview' && parsed.selectedId === null;
    this.selectedId = parsed.selectedId;
    this.liveIntent = false;
    this.host.issues(parsed.issues);
    if (this.engine) {
      if (this.host.appliedLocation() !== href || source === 'pop') {
        const restored =
          parsed.debug.test && !parsed.state.t
            ? { ...parsed.state, t: this.host.currentTime() }
            : parsed.state;
        this.guarded(() =>
          this.engine!.applyMapState(restored, {
            transition: source !== 'startup',
            select: parsed.selectedId !== null,
            recordHistory:
              source === 'location' &&
              this.engine!.focusedId !== restored.focus,
          }),
        );
      }
      // Controls expose accepted engine values if a requested command failed.
      this.accepted = this.snapshot(false, parsed.state.t);
      this.host.markApplied(href);
    }
    this.publish();
    this.normalizeLegacy(parsed);
  }
  private normalizeLegacy(parsed: ReturnType<typeof parseExploreLocation>) {
    if (
      !this.engine ||
      parsed.route.status !== 'overview' ||
      !parsed.selectedId
    )
      return;
    const href = withExploreDebug(
      serializeExploreState(parsed.state),
      parsed.debug,
    );
    this.overview = false;
    this.write(href, 'replace-route');
  }
  private guarded(action: () => void) {
    const previous = this.restoring;
    this.restoring = true;
    try {
      action();
    } finally {
      this.restoring = previous;
    }
  }
  private publish() {
    if (this.accepted)
      this.host.publish(
        this.accepted,
        this.selectedId,
        this.engine?.getMapState() ?? null,
      );
  }
  private snapshot(
    captureTime = false,
    preferredTime = this.accepted?.t,
  ): ExploreMapState {
    if (!this.accepted)
      throw new Error('Explore location has not been accepted');
    const actual = this.engine?.getMapState();
    const state: ExploreMapState = {
      ...this.accepted,
      layers: [...this.accepted.layers],
      camera: { ...this.accepted.camera },
    };
    if (!actual) return state;
    if (BODY_BY_ID.has(actual.focus)) state.focus = actual.focus;
    state.scale = actual.scale ?? state.scale;
    if (actual.layers)
      state.layers = LAYERS.filter((layer) =>
        actual.layers!.includes(layer.id),
      ).map((layer) => layer.id);
    if (actual.camera?.preset === 'close' || actual.camera?.preset === 'wide')
      state.camera = { preset: actual.camera.preset };
    delete state.frame;
    if (
      actual.frame === 'ICRF_BODY:earth' ||
      actual.frame === 'ICRF_HELIO' ||
      actual.frame === 'FIXED:earth'
    )
      state.frame = actual.frame;
    delete state.t;
    if (!this.liveIntent && this.engine!.clock.mode !== 'live') {
      const t = captureTime
        ? this.host.currentTime()
        : (preferredTime ?? actual.t);
      if (t) state.t = t;
    }
    return state;
  }
  private href(state = this.accepted!): string {
    return withExploreDebug(
      serializeExploreState(state, { overview: this.overview }),
      this.debug,
    );
  }
  private write(href: string, mode: RouteWriteMode) {
    if (!this.alive) return;
    if (this.engine) this.host.markApplied(href);
    if (mode !== 'replace-query') {
      this.pendingNavigation = href;
      this.ownedNavigations.add(href);
    }
    this.host.write(href, mode);
  }
  private queue() {
    this.cancel();
    this.dirty = true;
    const revision = this.revision;
    this.timer = this.host.schedule(() => {
      if (!this.alive || revision !== this.revision) return;
      this.timer = undefined;
      if (!this.pendingNavigation) this.flush();
    }, 500);
  }
  flush() {
    this.cancel();
    if (!this.dirty || !this.accepted || this.pendingNavigation) return;
    this.dirty = false;
    const href = this.href();
    const { pathname, search } = this.host.location();
    if (href === pathname + search) return;
    this.write(
      href,
      href.split('?')[0] === pathname ? 'replace-query' : 'replace-route',
    );
  }
  select(id: string, alreadySelected = false) {
    if (!this.alive || !BODY_BY_ID.has(id)) return;
    if (!this.accepted) this.locationChanged();
    if (!this.accepted) return;
    this.flush();
    this.cancel();
    const changed = this.accepted.focus !== id || this.overview;
    const previous = this.href();
    const state = this.snapshot();
    this.guarded(() => {
      if (
        this.engine &&
        (this.engine.focusedId !== id || state.camera.preset !== 'close')
      )
        this.engine.focus(id, { recordHistory: this.engine.focusedId !== id });
      else if (this.engine && !alreadySelected) this.engine.select(id);
    });
    this.selectedId = id;
    this.accepted = this.engine ? this.snapshot() : state;
    this.accepted = {
      ...this.accepted,
      focus: id,
      camera: { preset: 'close' },
    };
    this.overview = false;
    this.publish();
    const href = this.href();
    if (changed) this.write(href, 'push');
    else if (href !== previous) this.queue();
  }
  onSelection(id: string | null) {
    this.selectedId = id;
    if (id && !this.restoring) this.select(id, true);
    else this.publish();
  }
  coldChanged(explicit = false) {
    if (
      !this.alive ||
      this.restoring ||
      (!explicit && this.pendingNavigation) ||
      !this.accepted
    )
      return;
    const previous = this.href();
    this.accepted = this.snapshot();
    this.publish();
    if (previous !== this.href()) this.queue();
  }
  command(action: () => void) {
    if (!this.alive) return;
    this.guarded(action);
    this.coldChanged(true);
  }
  commitTime(live = false) {
    if (!this.alive || !this.accepted) return;
    this.liveIntent = live;
    this.accepted = this.snapshot(true);
    this.publish();
    this.queue();
  }
  previous() {
    if (!this.engine || !this.accepted) return;
    this.flush();
    this.cancel();
    this.guarded(() => this.engine!.back());
    this.accepted = this.snapshot();
    this.overview = false;
    this.publish();
    const href = this.href();
    if (href !== this.host.location().pathname + this.host.location().search)
      this.write(href, 'replace-route');
  }
  solarOverview() {
    if (!this.engine || !this.accepted) return;
    this.flush();
    this.cancel();
    const changed = !this.overview || this.accepted.focus !== 'star:sun';
    this.guarded(() => {
      this.engine!.focus('star:sun', {
        wide: true,
        select: false,
        recordHistory: this.engine!.focusedId !== 'star:sun',
      });
      this.engine!.select(null);
    });
    this.accepted = this.snapshot();
    this.selectedId = null;
    this.overview = true;
    this.publish();
    if (changed) this.write(this.href(), 'push');
    else this.queue();
  }
  shareHref(compatibility = false): string {
    this.accepted = this.snapshot(true);
    this.publish();
    this.dirty = true;
    this.flush();
    return serializeExploreState(
      this.accepted,
      compatibility ? { renderer: 'webgl' } : {},
    );
  }
  dispose() {
    this.cancel();
    this.alive = false;
    this.engine = null;
  }
}
