'use client';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { tdbToIso } from '@space/astro';
import { parseExploreLocation, serializeExploreState } from '../lib/routeState';
import { withExploreDebug } from '../lib/exploreNavigation';
import { useEngineStore } from './useEngineStore';

/** Cold URL commands only. Continuous state-to-URL and sharing arrive in P4.4. */
export default function ExploreRouteObserver() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const engine = useEngineStore((state) => state.engine);
  useEffect(() => {
    if (!engine) return;
    // Read the raw query: URLSearchParams has already replaced malformed UTF-8.
    const signature = location.pathname + location.search;
    const parsed = parseExploreLocation(location.pathname, location.search);
    if (parsed.route.status !== 'overview' && parsed.route.status !== 'object')
      return;
    if (useEngineStore.getState().appliedLocation !== signature) {
      const state =
        parsed.debug.test && !parsed.state.t
          ? { ...parsed.state, t: tdbToIso(engine.clock.state.tdbSec) }
          : parsed.state;
      useEngineStore.setState({
        linkIssues: parsed.issues,
        appliedLocation: signature,
      });
      engine.applyMapState(state, {
        transition: true,
        select: parsed.selectedId !== null,
        recordHistory: engine.getMapState().focus !== state.focus,
      });
    }
    if (parsed.route.status === 'overview' && parsed.selectedId) {
      const canonical = withExploreDebug(
        serializeExploreState(parsed.state),
        parsed.debug,
      );
      // The same startup state is already applied; normalizing a legacy path
      // updates server metadata without repeating focus or recording history.
      useEngineStore.setState({ appliedLocation: canonical });
      router.replace(canonical, { scroll: false });
    }
  }, [pathname, search, engine, router]);
  return null;
}
