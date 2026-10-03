import type { Metadata } from 'next';
import { resolveObjectRoute } from './routeState';

/** Optional deployment origin; never infer it from an untrusted request host. */
export function parseSiteOrigin(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  try {
    const url = new URL(input.trim());
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function pageMetadata(
  title: string,
  description: string,
  path: string,
  siteUrl?: string,
): Metadata {
  const origin = parseSiteOrigin(siteUrl);
  const url = origin ? `${origin}${path}` : undefined;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description, ...(url ? { url } : {}) },
    ...(url ? { alternates: { canonical: url } } : {}),
  };
}

export function overviewMetadata(siteUrl?: string): Metadata {
  return pageMetadata(
    'Continuum — Space & Time, Connected',
    'An interactive window into our solar system. Explore worlds, follow their motion, and travel through time.',
    '/',
    siteUrl,
  );
}

/** Catalog facts only: no engine import, request-time measurements or invented telemetry. */
export function objectMetadata(
  kind: string,
  slug: string,
  siteUrl?: string,
): Metadata | null {
  const route = resolveObjectRoute(kind, slug);
  if (route.status !== 'object') return null;
  return {
    ...pageMetadata(
      `${route.body.name} — Continuum`,
      route.body.description,
      route.pathname,
      siteUrl,
    ),
    other: { 'continuum:object-type': route.body.kind },
  };
}
