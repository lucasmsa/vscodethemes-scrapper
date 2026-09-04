import pLimit from 'p-limit';

const USER_AGENT =
  'vscodethemes-scrape/2.0 (+https://github.com/lucasmsa/vscodethemes-scrapper)';

export interface HttpOptions {
  concurrency: number;
  retries: number;
  minDelayMs: number;
}

export const DEFAULT_HTTP: HttpOptions = {
  concurrency: 8,
  retries: 4,
  minDelayMs: 0,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RetryableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function createHttp(options: Partial<HttpOptions> = {}) {
  const config = { ...DEFAULT_HTTP, ...options };
  const limit = pLimit(config.concurrency);

  async function attempt(url: string, accept: string): Promise<Response> {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept },
    });
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableError(
        `${response.status} for ${url}`,
        response.status,
      );
    }
    if (!response.ok) {
      throw new Error(`${response.status} for ${url}`);
    }
    return response;
  }

  async function withRetry<T>(work: () => Promise<T>): Promise<T> {
    let delay = 500;
    for (let tries = 0; ; tries++) {
      try {
        return await work();
      } catch (error) {
        const retryable =
          error instanceof RetryableError || error instanceof TypeError;
        if (!retryable || tries >= config.retries) throw error;
        await sleep(delay + Math.random() * delay);
        delay *= 2;
      }
    }
  }

  const scheduled = <T>(work: () => Promise<T>) =>
    limit(async () => {
      const result = await withRetry(work);
      if (config.minDelayMs > 0) await sleep(config.minDelayMs);
      return result;
    });

  return {
    json: <T>(url: string) =>
      scheduled(
        async () =>
          (await attempt(url, 'application/json')).json() as Promise<T>,
      ),
    text: (url: string) =>
      scheduled(async () =>
        (await attempt(url, 'text/html,image/svg+xml')).text(),
      ),
    bytes: (url: string) =>
      scheduled(
        async () =>
          new Uint8Array(await (await attempt(url, '*/*')).arrayBuffer()),
      ),
  };
}

export type Http = ReturnType<typeof createHttp>;
