import { afterEach, describe, expect, it, vi } from 'vitest';
import { PoliteFetch, IngestError } from '../src/politeFetch';

const host = 'provider.example';
const url = 'https://provider.example/data';
const options = {
  contact: 'https://example.com/contact',
  timeoutMs: 1000,
  maxResponseBytes: 100,
  onHttpError: vi.fn(async () => {}),
};
afterEach(() => vi.useRealTimers());
describe('polite provider transport', () => {
  it.each([301, 403, 404, 429, 500])(
    'persists HTTP %i pause and never fetches queued/repeated host requests',
    async (status) => {
      const fetchImpl = vi.fn(async () => new Response('error', { status }));
      const paused = vi.fn(async () => {});
      const client = new PoliteFetch({
        ...options,
        fetchImpl,
        onHttpError: paused,
      });
      const replies = await Promise.allSettled([
        client.json(url, host),
        client.json(url, host),
      ]);
      expect(replies.map((item) => item.status)).toEqual([
        'rejected',
        'rejected',
      ]);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(paused).toHaveBeenCalledWith(host, status);
      expect(fetchImpl.mock.calls[0]).toHaveLength(2);
      expect(
        (fetchImpl.mock.calls[0] as unknown as [URL, RequestInit])[1].redirect,
      ).toBe('manual');
      await expect(client.json(url, host)).rejects.toMatchObject({
        code: 'HOST_PAUSED',
      });
    },
  );
  it('serializes the entire response-body lifetime while allowing independent hosts', async () => {
    let finish!: () => void;
    let calls = 0;
    const blockedBody = new ReadableStream<Uint8Array>({
      start(controller) {
        finish = () => {
          controller.enqueue(new TextEncoder().encode('{}'));
          controller.close();
        };
      },
    });
    const fetchImpl: typeof fetch = vi.fn(async () =>
      ++calls === 1 ? new Response(blockedBody) : new Response('{}'),
    );
    const client = new PoliteFetch({ ...options, fetchImpl });
    const first = client.json(url, host);
    await Promise.resolve();
    const second = client.json(url, host);
    const independent = client.json(
      'https://other.example/data',
      'other.example',
    );
    await independent;
    expect(calls).toBe(2);
    finish();
    await Promise.all([first, second]);
    expect(calls).toBe(3);
  });
  it('bounds streamed bytes even when Content-Length is absent', async () => {
    const fetchImpl = vi.fn(async () => new Response('x'.repeat(101)));
    await expect(
      new PoliteFetch({ ...options, fetchImpl }).json(url, host),
    ).rejects.toMatchObject({ code: 'RESPONSE_TOO_LARGE' });
  });
  it('classifies body/request timeouts without leaking driver messages or retrying', async () => {
    vi.useFakeTimers();
    const fetchImpl: typeof fetch = vi.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener(
            'abort',
            () => reject(new Error('private-token')),
            { once: true },
          );
        }),
    );
    const client = new PoliteFetch({ ...options, fetchImpl });
    const result = client.json(url, host).catch((error: IngestError) => error);
    await vi.advanceTimersByTimeAsync(1001);
    expect(await result).toMatchObject({ code: 'TIMEOUT', message: 'TIMEOUT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('handles invalid JSON/UTF8 and rejects a mismatched or authenticated origin before requests', async () => {
    const fetchImpl = vi.fn(async () => new Response('{broken'));
    const client = new PoliteFetch({ ...options, fetchImpl });
    await expect(client.json(url, host)).rejects.toMatchObject({
      code: 'INVALID_PAYLOAD',
    });
    for (const bad of [
      'http://provider.example/data',
      'https://evil.example/data',
      'https://user:pass@provider.example/data',
    ])
      await expect(client.json(bad, host)).rejects.toMatchObject({
        code: 'INVALID_PAYLOAD',
      });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('retains HTTP failure identity if the pause write itself fails', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 403 }));
    const client = new PoliteFetch({
      ...options,
      fetchImpl,
      onHttpError: async () => {
        throw new Error('private database error');
      },
    });
    await expect(client.json(url, host)).rejects.toMatchObject({
      code: 'HTTP_NON_200',
      httpStatus: 403,
    });
    await expect(client.json(url, host)).rejects.toMatchObject({
      code: 'HOST_PAUSED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
