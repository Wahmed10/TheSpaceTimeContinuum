import { expect, expectTypeOf, it, vi } from 'vitest';
import type { BodySpec, PositionProvider } from '@space/domain';
import { EXPLORABLE_BODIES } from '@space/domain';
import type { SpaceEngine, ProviderFactory } from '../src';
import { prepareEntities } from '../src/scene/prepareEntities';
import { FrameTree } from '@space/astro';
import { LayerRegistry } from '../src/layers/LayerRegistry';

const body: BodySpec = {
  ...EXPLORABLE_BODIES.find((entry) => entry.id === 'dwarf:ceres')!,
  id: 'asteroid:test',
  kind: 'asteroid',
  parentId: 'star:sun',
  physical: { meanRadiusKm: 1 },
  color: '#aabbcc',
};
const registry = { entries: new Set(['star:sun']), frames: new FrameTree() };
const provider: PositionProvider = {
  id: 'test',
  frame: 'ICRF_SSB',
  method: 'static',
  validity: 'unbounded',
  certaintyAt: () => 'computed',
  stateAt: (_tdb, out) => {
    out.fill(0);
    return { ok: true, frame: 'ICRF_SSB', certainty: 'computed', stale: false };
  },
};

it('validates the complete batch before invoking provider factories', () => {
  const factory = vi.fn(() => provider);
  expect(() => prepareEntities(registry, [body, body], factory)).toThrow(
    'Duplicate',
  );
  expect(factory).not.toHaveBeenCalled();
  expect(() =>
    prepareEntities(
      registry,
      [{ ...body, parentId: 'planet:missing' }],
      factory,
    ),
  ).toThrow('parent');
  expect(() =>
    prepareEntities(
      registry,
      [{ ...body, physical: { meanRadiusKm: NaN } }],
      factory,
    ),
  ).toThrow('radius');
  expect(() =>
    prepareEntities(registry, [{ ...body, id: 'star:sun' }], factory),
  ).toThrow('Duplicate');
});

it('rejects unknown frames and invalid intervals without changing the registry', () => {
  expect(() =>
    prepareEntities(registry, [body], () => ({
      ...provider,
      frame: 'ICRF_BODY:missing',
    })),
  ).toThrow('frame');
  expect(() =>
    prepareEntities(registry, [body], () => ({
      ...provider,
      validity: { fromTdb: 10, toTdb: 1 },
    })),
  ).toThrow('interval');
  expect(registry.entries.size).toBe(1);
});

it('snapshots caller-owned rendering metadata while preserving the provider', () => {
  const input = {
    ...body,
    physical: { meanRadiusKm: 2 },
    aliases: ['Example'],
  };
  const [entry] = prepareEntities(registry, [input], () => provider);
  input.physical.meanRadiusKm = 100;
  input.aliases.push('Changed');
  expect(entry!.body.physical.meanRadiusKm).toBe(2);
  expect(entry!.body.aliases).toEqual(['Example']);
  expect(entry!.provider).toBe(provider);
});

it('activates previously unavailable resources while retaining saved visibility requests', async () => {
  const layers = new LayerRegistry();
  const visible = vi.fn();
  const load = vi.fn();
  layers.register({
    id: 'neo',
    label: 'NEOs',
    category: 'small-bodies',
    defaultOn: false,
    available: false,
    bands: ['solar'],
    load,
    setVisible: visible,
  });
  await layers.setVisible('neo', true);
  expect(layers.has('neo')).toBe(false);
  layers.activate('neo');
  expect(layers.has('neo')).toBe(true);
  await layers.setVisible('neo', false);
  await layers.setVisible('neo', true);
  expect(load).not.toHaveBeenCalled();
  layers.dispose();
  expect(() => layers.activate('neo')).toThrow('disposed');
});

it('exports the provider registration signature from the package root', () => {
  expectTypeOf<SpaceEngine['registerEntities']>()
    .parameter(0)
    .toEqualTypeOf<readonly BodySpec[]>();
  expectTypeOf<SpaceEngine['registerEntities']>()
    .parameter(1)
    .toEqualTypeOf<ProviderFactory>();
  expectTypeOf<SpaceEngine['registerEntities']>().returns.toBeVoid();
});
