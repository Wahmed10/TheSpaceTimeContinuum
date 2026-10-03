'use client';
import { Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Explore from './Explore';
import ExploreRouteObserver from '../engine-bridge/ExploreRouteObserver';
import { useEngineStore } from '../engine-bridge/useEngineStore';
import { parseExploreLocation } from '../lib/routeState';
import { selectionHref } from '../lib/exploreNavigation';

/** The shared route-group layout owns one renderer for the whole Explore visit. */
export default function ExploreRouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const route = parseExploreLocation(pathname, '').route;
  // A 404 inside this layout must not initialize a hidden background renderer.
  if (route.status !== 'overview' && route.status !== 'object') return children;
  function choose(id: string) {
    const parsed = parseExploreLocation(location.pathname, location.search);
    const href = selectionHref(
      id,
      parsed,
      useEngineStore.getState().engine?.getMapState() ?? null,
    );
    if (href) router.push(href, { scroll: false });
  }
  return (
    <>
      <Explore onChoose={choose} />
      <Suspense fallback={null}>
        <ExploreRouteObserver />
      </Suspense>
      {children}
    </>
  );
}
