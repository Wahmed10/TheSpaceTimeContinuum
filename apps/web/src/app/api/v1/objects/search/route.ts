import { objectSearchQuerySchema, searchResponseSchema } from '@space/domain';
import { readSearch, PublicDataError } from '../../../../../server/dataQueries';
import {
  apiError,
  apiSuccess,
  responseMeta,
} from '../../../../../server/apiResponse';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (request.url.length > 1500) return apiError('INVALID_QUERY', 400);
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some(
      (key) =>
        !['q', 'kinds', 'limit'].includes(key) ||
        params.getAll(key).length !== 1,
    )
  )
    return apiError('INVALID_QUERY', 400);
  const parsed = objectSearchQuerySchema.safeParse({
    q: params.get('q') ?? '',
    kinds: params.has('kinds') ? params.get('kinds')!.split(',') : [],
    limit: params.get('limit') ?? 20,
  });
  if (!parsed.success) return apiError('INVALID_QUERY', 400);
  try {
    const data = await readSearch(parsed.data);
    const sources = [
      ...new Map(
        data
          .filter((row) => row.provenance)
          .map((row) => [
            row.provenance!.providerId,
            {
              id: row.provenance!.providerId,
              ...(row.provenance!.sourceTimestamp
                ? { sourceTimestamp: row.provenance!.sourceTimestamp }
                : {}),
            },
          ]),
      ).values(),
    ];
    const meta = responseMeta(sources);
    const body = searchResponseSchema.parse({ data, meta });
    return apiSuccess(body.data, 300, body.meta);
  } catch (error) {
    return apiError(
      error instanceof PublicDataError ? error.code : 'DATA_UNAVAILABLE',
      503,
    );
  }
}
