import type { BodySpec, PositionProvider } from '@space/domain';
import type { FrameId } from '@space/domain';

export type ProviderFactory = (entity: Readonly<BodySpec>) => PositionProvider;

/** Cold-path validation completes before the engine allocates/commits visuals.
 * Register parent batches first; providers may refer only to existing frames.
 */
export function prepareBodies(
  registry: {
    entries: { has(id: string): boolean };
    frames: { has(id: FrameId): boolean };
  },
  entities: readonly BodySpec[],
) {
  const ids = new Set<string>();
  const bodies = entities.map((body) => {
    if (!/^[a-z]+:[a-z0-9-]+$/.test(body.id) || body.id.length > 100)
      throw new Error(`Invalid entity ID ${body.id}`);
    if (ids.has(body.id) || registry.entries.has(body.id))
      throw new Error(`Duplicate entity ${body.id}`);
    if (registry.frames.has(`ICRF_BODY:registered/${body.id}`))
      throw new Error(`Duplicate entity frame ${body.id}`);
    ids.add(body.id);
    if (body.astronomyBody)
      throw new Error(
        'Custom entities must use the supplied provider, not astronomyBody',
      );
    if (!body.parentId || !registry.entries.has(body.parentId))
      throw new Error(`Register parent before ${body.id}`);
    if (
      !Number.isFinite(body.physical.meanRadiusKm) ||
      !(body.physical.meanRadiusKm! > 0)
    )
      throw new Error(`Positive radius required for ${body.id}`);
    if (
      body.physical.periodDays !== undefined &&
      (!Number.isFinite(body.physical.periodDays) ||
        body.physical.periodDays <= 0)
    )
      throw new Error(`Invalid period for ${body.id}`);
    if (
      !body.name.trim() ||
      !Number.isFinite(body.importance) ||
      !/^#[a-f0-9]{6}$/i.test(body.color)
    )
      throw new Error(`Invalid presentation for ${body.id}`);
    if (
      ![
        'star',
        'planet',
        'moon',
        'dwarf',
        'asteroid',
        'satellite',
        'spacecraft',
      ].includes(body.kind)
    )
      throw new Error(`Unsupported render kind ${body.kind}`);
    return {
      ...body,
      physical: { ...body.physical },
      provenance: { ...body.provenance },
      aliases: [...body.aliases],
      tags: [...body.tags],
    };
  });
  return bodies;
}

export function prepareEntities(
  registry: Parameters<typeof prepareBodies>[0],
  entities: readonly BodySpec[],
  factory: ProviderFactory,
) {
  return prepareBodies(registry, entities).map((body) => {
    const provider = factory(body);
    if (!registry.frames.has(provider.frame))
      throw new Error(`Unknown provider frame ${provider.frame}`);
    if (
      provider.validity !== 'unbounded' &&
      (!Number.isFinite(provider.validity.fromTdb) ||
        !Number.isFinite(provider.validity.toTdb) ||
        provider.validity.toTdb <= provider.validity.fromTdb)
    )
      throw new Error(`Invalid provider interval for ${body.id}`);
    return { body, provider };
  });
}
