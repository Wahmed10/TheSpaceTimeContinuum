import { idSchema, objectResponseSchema } from '@space/domain';
import { readObject, PublicDataError } from '../../../../../server/dataQueries';
import {
  apiError,
  apiSuccess,
  responseMeta,
} from '../../../../../server/apiResponse';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return apiError('INVALID_ID', 400);
  try {
    const data = await readObject(id);
    if (!data) return apiError('NOT_FOUND', 404);
    const meta = responseMeta(
      data.provenance
        ? [
            {
              id: data.provenance.providerId,
              ...(data.provenance.sourceTimestamp
                ? { sourceTimestamp: data.provenance.sourceTimestamp }
                : {}),
            },
          ]
        : [],
    );
    const body = objectResponseSchema.parse({ data, meta });
    return apiSuccess(body.data, 3600, body.meta);
  } catch (error) {
    return apiError(
      error instanceof PublicDataError ? error.code : 'DATA_UNAVAILABLE',
      503,
    );
  }
}
