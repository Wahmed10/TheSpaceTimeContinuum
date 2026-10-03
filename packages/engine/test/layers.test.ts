import { expect, it, vi } from 'vitest';
import {
  LayerRegistry,
  type LayerDefinition,
} from '../src/layers/LayerRegistry';
function definition(overrides: Partial<LayerDefinition> = {}): LayerDefinition {
  return {
    id: 'test',
    label: 'Test',
    category: 'bodies',
    defaultOn: false,
    bands: ['solar', 'local'],
    load: vi.fn(),
    setVisible: vi.fn(),
    dispose: vi.fn(),
    ...overrides,
  };
}
it('loads once across repeated toggles and retains resources until disposal', async () => {
  const registry = new LayerRegistry(),
    layer = definition();
  registry.register(layer);
  for (let i = 0; i < 20; i++) {
    await registry.setVisible('test', true);
    await registry.setVisible('test', false);
  }
  expect(layer.load).toHaveBeenCalledOnce();
  expect(layer.dispose).not.toHaveBeenCalled();
  registry.dispose();
  registry.dispose();
  expect(layer.dispose).toHaveBeenCalledOnce();
});
it('shares an in-flight load and obeys the latest visibility/band request', async () => {
  let finish!: () => void;
  const layer = definition({
    load: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    ),
  });
  const registry = new LayerRegistry();
  registry.register(layer);
  const a = registry.setVisible('test', true),
    b = registry.setVisible('test', true);
  await Promise.resolve();
  await registry.setVisible('test', false);
  finish();
  await Promise.all([a, b]);
  expect(layer.load).toHaveBeenCalledOnce();
  expect(registry.has('test')).toBe(false);
  expect(layer.setVisible).toHaveBeenLastCalledWith(false);
  await registry.setVisible('test', true);
  registry.setBand('planetary');
  expect(registry.has('test')).toBe(false);
  registry.setBand('local');
  expect(registry.has('test')).toBe(true);
});
it('allows retry after load failure and preserves unknown URL compatibility', async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(undefined);
  const registry = new LayerRegistry();
  registry.register(definition({ load }));
  await expect(registry.setVisible('test', true)).rejects.toThrow('offline');
  expect(registry.has('test')).toBe(false);
  await registry.restore(['test', 'future:unknown']);
  expect(registry.enabledIds()).toEqual(['test']);
  expect(registry.has('test')).toBe(true);
  expect(() => registry.register(definition())).toThrow('Duplicate');
});
it('never reveals a load completed after disposal and cleans it up once', async () => {
  let finish!: () => void;
  const layer = definition({
    load: () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  });
  const registry = new LayerRegistry();
  registry.register(layer);
  const pending = registry.setVisible('test', true);
  await Promise.resolve();
  registry.dispose();
  finish();
  await pending;
  expect(layer.setVisible).not.toHaveBeenCalled();
  expect(layer.dispose).toHaveBeenCalledOnce();
});

it('settles the latest requested loads and surfaces a requested load failure', async () => {
  let finish!: () => void;
  const registry = new LayerRegistry();
  registry.register(
    definition({
      load: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    }),
  );
  const loading = registry.setVisible('test', true);
  await Promise.resolve();
  let settled = false;
  const waiting = registry.whenSettled().then(() => {
    settled = true;
  });
  await Promise.resolve();
  expect(settled).toBe(false);
  await registry.setVisible('test', false);
  await registry.whenSettled(); // An unrequested resource need not finish.
  await waiting;
  expect(settled).toBe(true);
  finish();
  await loading;
  await waiting;
  expect(registry.snapshot()[0]).toMatchObject({
    label: 'Test',
    requested: false,
    loaded: true,
    visible: false,
  });
  const broken = new LayerRegistry();
  broken.register(
    definition({
      load: () => {
        throw new Error('offline');
      },
    }),
  );
  await expect(broken.setVisible('test', true)).rejects.toThrow('offline');
  await expect(broken.whenSettled()).rejects.toThrow('offline');
  await broken.setVisible('test', false);
  await broken.whenSettled();
});
