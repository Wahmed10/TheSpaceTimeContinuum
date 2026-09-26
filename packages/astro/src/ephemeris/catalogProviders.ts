import type { BodySpec, PositionProvider } from '@space/domain';
import { createBodyProvider } from './AstronomyEngineProvider';
import { JupiterMoonsProvider } from './JupiterMoonsProvider';
import type { GalileanMoon } from './JupiterMoonsProvider';
import { createOsculatingProvider } from './OsculatingElementsProvider';
/** Only validated models are available to the renderer. */
export function createCatalogProvider(body: BodySpec): PositionProvider {
  if (body.astronomyBody) return createBodyProvider(body.astronomyBody);
  const slug = body.id.split(':')[1]!;
  if (['io', 'europa', 'ganymede', 'callisto'].includes(slug))
    return new JupiterMoonsProvider(slug as GalileanMoon);
  if (
    body.provenance.providerId === 'jpl-horizons-orbital-elements' &&
    body.parentId
  )
    return createOsculatingProvider(
      body.id,
      body.parentId === 'star:sun'
        ? 'ICRF_HELIO'
        : `ICRF_BODY:${body.parentId.split(':')[1]!}`,
    );
  throw new Error(`No validated position provider for ${body.id}`);
}
