import { createWriteStream, existsSync, type WriteStream } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Theme } from '@vscodethemes/shared';

export class ThemeCache {
  private readonly themes = new Map<string, Theme>();
  private stream: WriteStream | null = null;

  private constructor(private readonly file: string) {}

  static async open(file: string): Promise<ThemeCache> {
    const cache = new ThemeCache(file);
    await mkdir(dirname(file), { recursive: true });
    if (existsSync(file)) {
      const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
      for (const line of lines) {
        const theme = JSON.parse(line) as Theme;
        cache.themes.set(theme.id, theme);
      }
    }
    cache.stream = createWriteStream(file, { flags: 'a' });
    return cache;
  }

  get size(): number {
    return this.themes.size;
  }

  has(id: string): boolean {
    return this.themes.has(id);
  }

  all(): Theme[] {
    return [...this.themes.values()];
  }

  async add(theme: Theme): Promise<void> {
    if (this.themes.has(theme.id)) return;
    this.themes.set(theme.id, theme);
    await new Promise<void>((resolve, reject) => {
      this.stream!.write(`${JSON.stringify(theme)}\n`, (error) =>
        error ? reject(error) : resolve(),
      );
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.stream!.end(resolve));
    this.stream = null;
  }
}
