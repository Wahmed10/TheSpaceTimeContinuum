import {
  decodeRuntimeChunk,
  runtimeChunkIndex,
  RUNTIME_CHUNK_SECONDS,
} from '@space/astro';
import type { DecodedRuntimeChunk, RuntimeChunkManifest } from '@space/astro';

type FetchChunk = (url: string, signal: AbortSignal) => Promise<ArrayBuffer>;
interface Request {
  index: number;
  priority: number;
  resolve(value: DecodedRuntimeChunk): void;
  reject(error: unknown): void;
  promise: Promise<DecodedRuntimeChunk>;
}
/** Fixed epoch keys; completed requests never publish a camera/date intent.
 * Current data outranks prefetch; prefetch outranks optional curve work. */
export class RuntimeChunkCache {
  private readonly cache = new Map<
    number,
    { chunk: DecodedRuntimeChunk; used: number }
  >();
  private readonly requests = new Map<number, Request>();
  private readonly failedUntil = new Map<number, number>();
  private readonly queue: Request[] = [];
  private readonly abort = new AbortController();
  private tick = 0;
  private running = 0;
  private disposed = false;
  private lastPrefetch = NaN;
  private currentIndex: number | undefined;
  private bytes = 0;
  private requestCount = 0;
  private readonly subscribers = new Set<(index: number) => void>();
  constructor(
    readonly manifest: RuntimeChunkManifest,
    private readonly fetchChunk: FetchChunk = async (url, signal) => {
      const response = await fetch(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        cache: 'force-cache',
      });
      if (!response.ok) throw Error(`Time chunk HTTP ${response.status}`);
      return response.arrayBuffer();
    },
    private readonly maxBytes = 8 * 1024 * 1024,
    private readonly concurrency = 4,
  ) {
    if (
      !/^[a-f0-9]{64}$/.test(manifest.version) ||
      !Number.isInteger(manifest.fromIndex) ||
      !Number.isInteger(manifest.toIndex) ||
      manifest.toIndex < manifest.fromIndex ||
      manifest.format !== 1 ||
      maxBytes < 16384 ||
      concurrency < 1 ||
      concurrency > 8
    )
      throw Error('Invalid time chunk cache configuration');
  }
  get(tdbSec: number): DecodedRuntimeChunk | undefined {
    const entry = this.cache.get(runtimeChunkIndex(tdbSec));
    if (entry) entry.used = ++this.tick;
    return entry?.chunk;
  }
  subscribe(callback: (index: number) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  load(index: number, priority = 0): Promise<DecodedRuntimeChunk> {
    if (this.disposed)
      return Promise.reject(Error('Time chunk cache disposed'));
    if (
      !Number.isInteger(index) ||
      index < this.manifest.fromIndex ||
      index > this.manifest.toIndex
    )
      return Promise.reject(Error('Date outside correction data coverage'));
    const cached = this.cache.get(index);
    if (cached) {
      cached.used = ++this.tick;
      return Promise.resolve(cached.chunk);
    }
    const pending = this.requests.get(index);
    if (pending) {
      pending.priority = Math.min(priority, pending.priority);
      this.pump();
      return pending.promise;
    }
    if ((this.failedUntil.get(index) ?? 0) > performance.now())
      return Promise.reject(Error('Time chunk retry delayed'));
    let resolve!: (value: DecodedRuntimeChunk) => void,
      reject!: (error: unknown) => void;
    const promise = new Promise<DecodedRuntimeChunk>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const request = { index, priority, resolve, reject, promise };
    this.requests.set(index, request);
    this.queue.push(request);
    this.pump();
    return promise;
  }
  /** Called on the cold control cadence, not once per rendered object/frame.
   * At one year/second the 2.5s lookahead covers 33 small bundles. */
  prefetch(tdbSec: number, rate: number, now = performance.now()): void {
    if (this.disposed || !Number.isFinite(tdbSec) || !Number.isFinite(rate))
      return;
    const index = runtimeChunkIndex(tdbSec);
    this.currentIndex = index;
    if (
      now - this.lastPrefetch < 100 &&
      index === runtimeChunkIndex(this.lastEpoch)
    )
      return;
    this.lastPrefetch = now;
    this.lastEpoch = tdbSec;
    // Drop queued obsolete playback work so a reversed/jumped date can lead.
    const ahead =
      tdbSec +
      Math.max(
        -64 * RUNTIME_CHUNK_SECONDS,
        Math.min(64 * RUNTIME_CHUNK_SECONDS, rate * 2.5),
      );
    const direction = rate < 0 ? -1 : 1;
    const end = runtimeChunkIndex(ahead),
      lower = Math.min(index, end + direction),
      upper = Math.max(index, end + direction);
    for (let n = this.queue.length - 1; n >= 0; n--) {
      const request = this.queue[n]!;
      if (
        request.priority === 1 &&
        (request.index < lower || request.index > upper)
      ) {
        this.queue.splice(n, 1);
        this.requests.delete(request.index);
        request.reject(Error('Obsolete playback prefetch'));
      }
    }
    const count = Math.abs(end - index);
    for (let n = 0; n <= count + 1; n++) {
      const next = index + n * direction;
      if (next < this.manifest.fromIndex || next > this.manifest.toIndex)
        continue;
      void this.load(next, n === 0 ? 0 : 1).catch(() => {
        /* Fresh analytic fallback / per-object loading remains valid. */
      });
    }
  }
  private lastEpoch = NaN;
  private pump(): void {
    while (
      !this.disposed &&
      this.running < this.concurrency &&
      this.queue.length
    ) {
      this.queue.sort((a, b) => a.priority - b.priority);
      // Optional curves leave a network slot for a newly requested date.
      if (this.queue[0]!.priority >= 2 && this.running >= Math.max(1, this.concurrency - 1)) break;
      const request = this.queue.shift()!;
      this.running++;
      this.requestCount++;
      const url = `/data/chunks/${this.manifest.version}/${request.index}.bin`;
      void this.fetchChunk(url, this.abort.signal)
        .then((buffer) => {
          if (this.disposed) throw Error('Time chunk cache disposed');
          const chunk = decodeRuntimeChunk(
            buffer,
            request.index,
            this.manifest,
          );
          this.failedUntil.delete(request.index);
          this.cache.set(request.index, { chunk, used: ++this.tick });
          this.bytes += chunk.bytes;
          while (this.bytes > this.maxBytes) {
            let oldestIndex: number | undefined,
              used = Infinity;
            for (const [i, entry] of this.cache)
              if (i !== this.currentIndex && entry.used < used) {
                oldestIndex = i;
                used = entry.used;
              }
            if (oldestIndex === undefined) break;
            this.bytes -= this.cache.get(oldestIndex)!.chunk.bytes;
            this.cache.delete(oldestIndex);
          }
          request.resolve(chunk);
          for (const callback of this.subscribers) callback(request.index);
        })
        .catch((error) => {
          if (!this.disposed)
            this.failedUntil.set(request.index, performance.now() + 1000);
          request.reject(error);
        })
        .finally(() => {
          this.requests.delete(request.index);
          this.running--;
          this.pump();
        });
    }
  }
  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    for (const request of this.requests.values())
      request.reject(Error('Time chunk cache disposed'));
    this.requests.clear();
    this.queue.length = 0;
    this.cache.clear();
    this.failedUntil.clear();
    this.subscribers.clear();
    this.bytes = 0;
  }
  get diagnostics() {
    return {
      cachedChunks: this.cache.size,
      cachedIndices: Array.from(this.cache.keys()),
      bytes: this.bytes,
      pending: this.requests.size,
      running: this.running,
      requests: this.requestCount,
    };
  }
}
