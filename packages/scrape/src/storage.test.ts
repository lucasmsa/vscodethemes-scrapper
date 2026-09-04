import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorage, previewKey, selectStorage } from './storage.ts';

describe('selectStorage', () => {
  it('uses the local directory when no AWS credentials are set', () => {
    const storage = selectStorage({}, '/tmp/previews');
    expect(storage.kind).toBe('local');
  });

  it('uses S3 when the AWS variables and bucket are present', () => {
    const storage = selectStorage(
      {
        AWS_ACCESS_KEY_ID: 'a',
        AWS_SECRET_ACCESS_KEY: 'b',
        AWS_REGION: 'us-east-1',
        BUCKET_NAME: 'themes',
      },
      '/tmp/previews',
    );
    expect(storage.kind).toBe('s3');
  });

  it('refuses a half-configured S3', () => {
    expect(() =>
      selectStorage({ AWS_ACCESS_KEY_ID: 'a' }, '/tmp/previews'),
    ).toThrow(/AWS_SECRET_ACCESS_KEY/);
  });
});

describe('previewKey', () => {
  it('keeps the historical <OfficialName>/<slug>-<lang> layout with an svg extension', () => {
    expect(
      previewKey({ displayName: 'Dracula Theme', slug: 'dracula-theme' }, 'py'),
    ).toBe('Dracula Theme/dracula-theme-py.svg');
  });

  it('strips path separators from the display name', () => {
    expect(
      previewKey(
        {
          displayName: 'Dark (Visual Studio - C/C++)',
          slug: 'dark-visual-studio-c-c',
        },
        'js',
      ),
    ).toBe('Dark (Visual Studio - C C++)/dark-visual-studio-c-c-js.svg');
  });
});

describe('LocalStorage', () => {
  it('writes under the root and reports existing keys', async () => {
    const root = mkdtempSync(join(tmpdir(), 'previews-'));
    const storage = new LocalStorage(root);
    await storage.put('A/a-js.svg', '<svg/>', 'image/svg+xml');
    expect(readFileSync(join(root, 'A/a-js.svg'), 'utf8')).toBe('<svg/>');
    expect(await storage.has('A/a-js.svg')).toBe(true);
    expect(await storage.has('A/a-py.svg')).toBe(false);
    expect(existsSync(join(root, 'A'))).toBe(true);
  });
});
