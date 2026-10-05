'use client';
import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { tdbToIso } from './uiTimeAdapter';
import { RouteStateController } from './routeStateController';
import { useEngineStore } from './useEngineStore';

export default function RouteStateBridge() {
  const pathname = usePathname(),
    search = useSearchParams(),
    router = useRouter();
  const engine = useEngineStore((state) => state.engine);
  const controller = useMemo(
    () =>
      new RouteStateController({
        location: () => ({
          pathname: location.pathname,
          search: location.search,
        }),
        appliedLocation: () => useEngineStore.getState().appliedLocation,
        markApplied: (appliedLocation) =>
          useEngineStore.setState({ appliedLocation }),
        write: (href, mode) => {
          // Next copies its internal history state and updates navigation hooks.
          // Passing __NA ourselves would bypass that integration.
          if (mode === 'replace-query') history.replaceState(null, '', href);
          else if (mode === 'push') router.push(href, { scroll: false });
          else router.replace(href, { scroll: false });
        },
        publish: (routeState, selectedId, actual) =>
          useEngineStore.setState({
            routeState,
            selectedId,
            mapState: actual ?? routeState,
            scale: routeState.scale,
            following: useEngineStore.getState().engine?.isFollowing ?? false,
          }),
        issues: (linkIssues) => useEngineStore.setState({ linkIssues }),
        currentTime: () =>
          tdbToIso(useEngineStore.getState().engine!.clock.tick()),
        schedule: (callback, delay) => window.setTimeout(callback, delay),
        cancel: (handle) => window.clearTimeout(handle),
      }),
    [router],
  );
  useEffect(() => {
    controller.activate();
    useEngineStore.setState({ routeController: controller });
    const pop = () => controller.locationChanged('pop');
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      controller.dispose();
      if (useEngineStore.getState().routeController === controller)
        useEngineStore.setState({ routeController: null, routeState: null });
    };
  }, [controller]);
  useEffect(() => {
    const unsubs = engine
      ? [
          engine.on('select', (id) => controller.onSelection(id)),
          engine.on('mapStateChange', () => controller.coldChanged()),
        ]
      : [];
    controller.setEngine(engine);
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      controller.setEngine(null);
    };
  }, [engine, controller]);
  useEffect(() => {
    controller.locationChanged();
  }, [pathname, search, controller]);
  return null;
}
