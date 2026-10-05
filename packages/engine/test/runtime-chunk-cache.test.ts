import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { RUNTIME_CHUNK_SECONDS, runtimeChunkIndex } from '@space/astro';
import type { RuntimeChunkManifest } from '@space/astro';
import manifestJson from '../src/assets/runtime-chunks.json';
import { RuntimeChunkCache } from '../src/assets/RuntimeChunkCache';
const manifest = manifestJson as RuntimeChunkManifest,
  index = runtimeChunkIndex(8e8),
  caches: RuntimeChunkCache[] = [];
function bytes(i: number) {
  const b = readFileSync(
    `apps/web/public/data/chunks/${manifest.version}/${i}.bin`,
  );
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
function controlled(maxBytes = 8 * 1024 * 1024, concurrency = 1) {
  const pending = new Map<number, (buffer: ArrayBuffer) => void>(),
    urls: string[] = [],
    signals: AbortSignal[] = [];
  const fetch = vi.fn(
    (url: string, signal: AbortSignal) =>
      new Promise<ArrayBuffer>((resolve) => {
        urls.push(url);
        signals.push(signal);
        pending.set(Number(url.split('/').pop()!.split('.')[0]), resolve);
      }),
  );
  const cache = new RuntimeChunkCache(manifest, fetch, maxBytes, concurrency);
  caches.push(cache);
  return { cache, fetch, pending, urls, signals };
}
async function flush() {
  for (let n = 0; n < 8; n++) await Promise.resolve();
}
afterEach(() => {
  for (const cache of caches.splice(0)) cache.dispose();
});
it('reserves a date-jump slot while optional curves are waiting on the network', async () => {
  const { cache, pending, fetch } = controlled(8 * 1024 * 1024, 4);
  const curves = [0, 1, 2, 3].map((n) => cache.load(index + n, 2));
  expect(fetch).toHaveBeenCalledTimes(3);
  const current = cache.load(index + 50, 0);
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(pending.has(index + 50)).toBe(true);
  pending.get(index + 50)!(bytes(index + 50));
  await current;
  await flush();
  const promoted = cache.load(index + 3, 0);
  expect(promoted).toBe(curves[3]);
  expect(fetch).toHaveBeenCalledTimes(5);
  pending.get(index + 3)!(bytes(index + 3));
  await promoted;
  for (const n of [0, 1, 2]) pending.get(index + n)!(bytes(index + n));
  await Promise.all(curves.slice(0, 3));
});
it('deduplicates fixed epoch keys and uses immutable versioned URLs', async () => {
  const { cache, pending, fetch, urls } = controlled();
  const a = cache.load(index),
    b = cache.load(index);
  expect(a).toBe(b);
  expect(fetch).toHaveBeenCalledTimes(1);
  pending.get(index)!(bytes(index));
  await a;
  expect(urls[0]).toBe(`/data/chunks/${manifest.version}/${index}.bin`);
  expect(await cache.load(index)).toBe(
    cache.get(index * RUNTIME_CHUNK_SECONDS),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('date jumps outrank queued curve/prefetch work and late old responses keep separate keys', async () => {
  const { cache, pending, urls } = controlled();
  const old = cache.load(index, 2),
    curve = cache.load(index + 1, 2),
    ahead = cache.load(index + 2, 1),
    current = cache.load(index + 50, 0);
  pending.get(index)!(bytes(index));
  await old;
  await flush();
  expect(urls[1]).toContain(`/${index + 50}.bin`);
  pending.get(index + 50)!(bytes(index + 50));
  await current;
  await flush();
  expect(cache.get((index + 50) * RUNTIME_CHUNK_SECONDS)!.index).toBe(
    index + 50,
  );
  pending.get(index + 2)!(bytes(index + 2));
  await ahead;
  await flush();
  pending.get(index + 1)!(bytes(index + 1));
  await curve;
  expect(cache.get((index + 50) * RUNTIME_CHUNK_SECONDS)!.index).toBe(
    index + 50,
  );
});
it('prefetches ahead at one year/second and reverses pending work on the next date intent', async () => {
  const { cache, pending, urls } = controlled(),
    epoch = index * RUNTIME_CHUNK_SECONDS;
  cache.prefetch(epoch, 365.25 * 86400, 0);
  expect(cache.diagnostics.pending).toBeGreaterThan(30);
  cache.prefetch(epoch, -365.25 * 86400, 250);
  pending.get(index)!(bytes(index));
  await flush();
  expect(urls[1]).toContain(`/${index - 1}.bin`);
  // Disposal rejects the remaining requests; prefetch owns their catch handlers.
});
it('evicts old chunks within a byte cap without evicting the newly requested epoch', async () => {
  const { cache, pending } = controlled(16384);
  let p = cache.load(index);
  pending.get(index)!(bytes(index));
  await p;
  await flush();
  p = cache.load(index + 1);
  pending.get(index + 1)!(bytes(index + 1));
  await p;
  expect(cache.get(index * RUNTIME_CHUNK_SECONDS)).toBeUndefined();
  expect(cache.get((index + 1) * RUNTIME_CHUNK_SECONDS)).toBeDefined();
  expect(cache.diagnostics.bytes).toBeLessThanOrEqual(16384);
});
it('keeps the current date pinned while a distant curve exceeds the cache capacity', async () => {
  const { cache, pending } = controlled(32768);
  cache.prefetch(index * RUNTIME_CHUNK_SECONDS, 0, 0);
  pending.get(index)!(bytes(index));
  await flush();
  pending.get(index + 1)!(bytes(index + 1));
  await flush();
  for (let n = 2; n < 15; n++) {
    const request = cache.load(index + n, 2);
    pending.get(index + n)!(bytes(index + n));
    await request;
    await flush();
  }
  expect(cache.get(index * RUNTIME_CHUNK_SECONDS)).toBeDefined();
  expect(cache.diagnostics.cachedChunks).toBeLessThan(5);
  expect(cache.diagnostics.bytes).toBeLessThanOrEqual(32768);
});
it('rejects corrupt/outside buffers without admitting them to cache', async () => {
  const { cache, pending, fetch } = controlled();
  await expect(cache.load(manifest.toIndex + 1)).rejects.toThrow('coverage');
  expect(fetch).not.toHaveBeenCalled();
  const p = cache.load(index),
    assertion = expect(p).rejects.toThrow();
  pending.get(index)!(bytes(index + 1));
  await assertion;
  expect(cache.get(index * RUNTIME_CHUNK_SECONDS)).toBeUndefined();
  await expect(cache.load(index)).rejects.toThrow('retry delayed');
});
it('aborts disposal and rejects pending work without caching a late response', async () => {
  const { cache, pending, signals } = controlled();
  const p = cache.load(index),
    assertion = expect(p).rejects.toThrow('disposed');
  cache.dispose();
  await assertion;
  expect(signals[0]!.aborted).toBe(true);
  pending.get(index)!(bytes(index));
  await flush();
  expect(cache.diagnostics.bytes).toBe(0);
  expect(cache.diagnostics.cachedChunks).toBe(0);
});
