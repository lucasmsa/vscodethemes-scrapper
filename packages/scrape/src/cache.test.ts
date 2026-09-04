import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThemeCache } from './cache.ts';
import type { Theme } from '@vscodethemes/shared';
import { PALETTE_FIELDS } from '@vscodethemes/shared';

const palette = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Theme['palette'];
const theme = (id: string): Theme => ({
  id,
  slug: id.split('/')[1]!,
  displayName: id,
  extension: {
    slug: 'e',
    displayName: 'E',
    publisher: 'p',
    publisherDisplayName: 'P',
  },
  palette,
  preview: `https://images.vscodethemes.com/p.e/${id.split('/')[1]}-js-preview-AAAA.svg`,
});

describe('ThemeCache', () => {
  it('appends themes and resumes from disk, deduplicating by id', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cache-'));
    const file = join(dir, 'themes.ndjson');
    const first = await ThemeCache.open(file);
    await first.add(theme('p.e/a'));
    await first.add(theme('p.e/b'));
    await first.add(theme('p.e/a'));
    await first.close();

    const second = await ThemeCache.open(file);
    expect(second.size).toBe(2);
    expect(second.has('p.e/a')).toBe(true);
    expect(second.has('p.e/c')).toBe(false);
    expect(second.all().map((t) => t.id)).toEqual(['p.e/a', 'p.e/b']);
    await second.close();
  });
});
