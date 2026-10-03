import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseExploreLocation, serializeExploreState } from './lib/routeState';
import { withExploreDebug } from './lib/exploreNavigation';

/** Validate friendly links before Next decodes away malformed query escapes. */
export function proxy(request: NextRequest) {
  const parsed = parseExploreLocation(
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (parsed.route.status !== 'alias') return NextResponse.next();
  const href = withExploreDebug(
    serializeExploreState(parsed.state),
    parsed.debug,
  );
  return NextResponse.redirect(new URL(href, request.url), 307);
}

// Only one-segment paths: no object pages, renderer files or asset requests.
export const config = { matcher: '/:alias' };
