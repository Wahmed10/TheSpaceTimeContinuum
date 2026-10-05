import { statusResponseSchema } from '@space/domain';
import { readStatus, PublicDataError } from '../../../../server/dataQueries';
import {
  apiError,
  apiSuccess,
  responseMeta,
} from '../../../../server/apiResponse';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(): Promise<Response> {
  try {
    const providers = await readStatus();
    const meta = responseMeta(
      providers.map((provider) => ({ id: provider.providerId })),
      providers.some((provider) => provider.freshness !== 'fresh'),
    );
    const data = { providers };
    const body = statusResponseSchema.parse({ data, meta });
    return apiSuccess(body.data, 60, body.meta);
  } catch (error) {
    return apiError(
      error instanceof PublicDataError ? error.code : 'DATA_UNAVAILABLE',
      503,
    );
  }
}
