import type { ApiMeta, Envelope } from '@space/domain';
export function responseMeta(
  sources: Envelope<unknown>['meta']['sources'] = [],
  stale = false,
): Envelope<unknown>['meta'] {
  return { generatedAt: new Date().toISOString(), sources, stale };
}
export function apiSuccess<T>(
  data: T,
  ttl: number,
  meta: ApiMeta = responseMeta(),
): Response {
  return Response.json(
    { data, meta },
    {
      headers: {
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${2 * ttl}`,
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
export type ApiErrorCode =
  | 'INVALID_QUERY'
  | 'INVALID_ID'
  | 'NOT_FOUND'
  | 'DATABASE_NOT_CONFIGURED'
  | 'DATA_UNAVAILABLE';
export function apiError(
  code: ApiErrorCode,
  status: 400 | 404 | 503,
): Response {
  return Response.json(
    { data: null, error: { code }, meta: responseMeta([], true) },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
