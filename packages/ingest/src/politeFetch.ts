export type IngestErrorCode =
  | 'HTTP_NON_200'
  | 'HOST_PAUSED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'RESPONSE_TOO_LARGE'
  | 'INVALID_PAYLOAD'
  | 'PERSISTENCE';
export class IngestError extends Error {
  constructor(
    readonly code: IngestErrorCode,
    readonly httpStatus?: number,
  ) {
    super(code);
  }
}
export interface FetchOptions {
  contact: string;
  timeoutMs: number;
  maxResponseBytes: number;
  fetchImpl?: typeof fetch;
  onHttpError(host: string, status: number): Promise<void>;
}
/** In-process single-flight; the store's host lease enforces cross-process exclusivity. */
export class PoliteFetch {
  private tails = new Map<string, Promise<void>>();
  private paused = new Set<string>();
  constructor(private options: FetchOptions) {}
  json = async (
    url: string,
    expectedHost: string,
  ): Promise<{ body: unknown; bytes: number }> => {
    const target = new URL(url);
    if (
      target.protocol !== 'https:' ||
      target.hostname !== expectedHost ||
      target.username ||
      target.password
    )
      throw new IngestError('INVALID_PAYLOAD');
    const previous = this.tails.get(expectedHost) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.tails.set(expectedHost, tail);
    await previous;
    try {
      if (this.paused.has(expectedHost)) throw new IngestError('HOST_PAUSED');
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), this.options.timeoutMs);
      try {
        const response = await (this.options.fetchImpl ?? fetch)(target, {
          redirect: 'manual',
          signal: abort.signal,
          headers: {
            'User-Agent': `SpaceMap/0.1 (${this.options.contact})`,
            Accept: 'application/json',
          },
        });
        if (response.status !== 200) {
          this.paused.add(expectedHost);
          try {
            await this.options.onHttpError(expectedHost, response.status);
          } finally {
            try {
              await response.body?.cancel();
            } catch {
              /* Original HTTP pause always wins. */
            }
            throw new IngestError('HTTP_NON_200', response.status);
          }
        }
        const declared = Number(response.headers.get('content-length'));
        if (
          Number.isFinite(declared) &&
          declared > this.options.maxResponseBytes
        ) {
          await response.body?.cancel();
          throw new IngestError('RESPONSE_TOO_LARGE');
        }
        const reader = response.body?.getReader();
        if (!reader) throw new IngestError('INVALID_PAYLOAD');
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            length += chunk.value.byteLength;
            if (length > this.options.maxResponseBytes) {
              await reader.cancel();
              throw new IngestError('RESPONSE_TOO_LARGE');
            }
            chunks.push(chunk.value);
          }
        } finally {
          reader.releaseLock();
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        try {
          return {
            body: JSON.parse(
              new TextDecoder('utf-8', { fatal: true }).decode(bytes),
            ),
            bytes: length,
          };
        } catch {
          throw new IngestError('INVALID_PAYLOAD');
        }
      } catch (error) {
        if (error instanceof IngestError) throw error;
        throw new IngestError(abort.signal.aborted ? 'TIMEOUT' : 'NETWORK');
      } finally {
        clearTimeout(timer);
      }
    } finally {
      release();
      if (this.tails.get(expectedHost) === tail)
        this.tails.delete(expectedHost);
    }
  };
}
