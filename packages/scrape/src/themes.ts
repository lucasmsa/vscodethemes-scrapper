import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import type { Theme } from '@vscodethemes/shared';

/**
 * The dataset is committed gzipped: 35 MB of JSON is a poor thing to keep in git, and
 * five Marketplace publisher ids are 52-character base32 strings that GitHub's secret
 * scanner reads as Azure tokens. An uncommitted plain file is used when present.
 */
export const THEMES_GZ = 'data/themes.json.gz';
export const THEMES_JSON = 'data/themes.json';

export async function readThemes(root: string): Promise<Theme[]> {
  const plain = `${root}/${THEMES_JSON}`;
  if (existsSync(plain))
    return JSON.parse(await readFile(plain, 'utf8')) as Theme[];
  const gz = `${root}/${THEMES_GZ}`;
  if (!existsSync(gz))
    throw new Error(
      `no ${THEMES_JSON} or ${THEMES_GZ} under ${root}; run the scrape first`,
    );
  return JSON.parse(gunzipSync(await readFile(gz)).toString('utf8')) as Theme[];
}

export async function writeThemes(
  root: string,
  themes: Theme[],
): Promise<{ bytes: number; gzipped: number }> {
  const json = `[\n${themes.map((t) => JSON.stringify(t)).join(',\n')}\n]\n`;
  const gzipped = gzipSync(json, { level: 9 });
  await writeFile(`${root}/${THEMES_GZ}`, gzipped);
  await writeFile(`${root}/${THEMES_JSON}`, json);
  return { bytes: json.length, gzipped: gzipped.length };
}
