import { utcMsToTdb, tdbToIso, MIN_UTC_MS, MAX_UTC_MS } from '@space/astro';
import { useEngineStore } from './useEngineStore';
import { parseUtcDateInput } from '../lib/utcInput';
import type { EngineApi } from '@space/engine';
import { LAYERS } from '@space/domain';
import { parseExploreLocation, serializeExploreState } from '../lib/routeState';
function timeCommand(action: (engine: EngineApi) => void, live = false) {
  const { engine, routeController } = useEngineStore.getState();
  if (!engine) return;
  if (routeController) {
    routeController.command(() => action(engine));
    routeController.commitTime(live);
  } else action(engine);
  const t = engine.clock.tick();
  useEngineStore.setState({
    mode: engine.clock.mode,
    rate: engine.clock.rate,
    utcDate: tdbToIso(t).slice(0, 16),
  });
}
export function setDateUtc(ms: number) {
  if (!Number.isFinite(ms) || ms < MIN_UTC_MS || ms > MAX_UTC_MS) return;
  timeCommand((engine) => engine.clock.setTime(utcMsToTdb(ms)));
}
export function setDateInput(value: string): boolean {
  const parsed = parseUtcDateInput(value);
  if (!parsed.ok) return false;
  setDateUtc(parsed.utcMs);
  return true;
}
export function togglePlayback() {
  timeCommand((engine) =>
    engine.clock.mode === 'paused' ? engine.clock.play() : engine.clock.pause(),
  );
}
export function setPlaybackRate(rate: number) {
  timeCommand((engine) => engine.clock.setRate(rate));
}
export function reversePlayback() {
  timeCommand((engine) => engine.clock.setRate(-engine.clock.rate));
}
export function goLive() {
  timeCommand((engine) => engine.clock.goLive(), true);
}
export function previousView() {
  const { engine, routeController } = useEngineStore.getState();
  if (routeController) routeController.previous();
  else engine?.back();
}
export function focusObject(id: string) {
  const { engine, routeController } = useEngineStore.getState();
  if (routeController) routeController.select(id);
  else engine?.focus(id);
}
export function mapCommand(action: (engine: EngineApi) => void) {
  const { engine, routeController } = useEngineStore.getState();
  if (!engine) return;
  if (routeController) routeController.command(() => action(engine));
  else action(engine);
}
export function solarOverview() {
  const { engine, routeController } = useEngineStore.getState();
  if (routeController) routeController.solarOverview();
  else {
    engine?.focus('star:sun', { wide: true, select: false });
    engine?.select(null);
  }
}
export function publicViewHref(compatibility = false): string {
  const { routeController, engine } = useEngineStore.getState();
  if (routeController) return routeController.shareHref(compatibility);
  const state = parseExploreLocation(location.pathname, location.search).state;
  if (engine) {
    const actual = engine.getMapState();
    state.focus = actual.focus;
    state.scale = actual.scale ?? state.scale;
    if (actual.layers)
      state.layers = LAYERS.filter((layer) =>
        actual.layers!.includes(layer.id),
      ).map((layer) => layer.id);
    state.camera = {
      preset: actual.camera?.preset === 'wide' ? 'wide' : 'close',
    };
    delete state.frame;
    delete state.t;
    if (
      actual.frame === 'ICRF_BODY:earth' ||
      actual.frame === 'ICRF_HELIO' ||
      actual.frame === 'FIXED:earth'
    )
      state.frame = actual.frame;
    if (engine.clock.mode !== 'live') state.t = tdbToIso(engine.clock.tick());
  }
  return serializeExploreState(
    state,
    compatibility ? { renderer: 'webgl' } : {},
  );
}
