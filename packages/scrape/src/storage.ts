import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { S3 } from '@aws-sdk/client-s3';
import type { PreviewLanguage } from '@vscodethemes/shared';

export interface Storage {
  readonly kind: 'local' | 's3';
  put(
    key: string,
    body: string | Uint8Array,
    contentType: string,
  ): Promise<void>;
  has(key: string): Promise<boolean>;
}

export class LocalStorage implements Storage {
  readonly kind = 'local' as const;

  constructor(private readonly root: string) {}

  async put(
    key: string,
    body: string | Uint8Array,
    _contentType: string,
  ): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async has(key: string): Promise<boolean> {
    try {
      await access(join(this.root, key));
      return true;
    } catch {
      return false;
    }
  }
}

export class S3Storage implements Storage {
  readonly kind = 's3' as const;
  private readonly client: S3;

  constructor(
    private readonly bucket: string,
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    },
  ) {
    this.client = new S3({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }

  async put(
    key: string,
    body: string | Uint8Array,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
  }

  async has(key: string): Promise<boolean> {
    try {
      await this.client.headObject({ Bucket: this.bucket, Key: key });
      return true;
    } catch {
      return false;
    }
  }
}

type Env = Record<string, string | undefined>;

const S3_VARIABLES = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'BUCKET_NAME',
] as const;

export function selectStorage(env: Env, localRoot: string): Storage {
  const present = S3_VARIABLES.filter((name) => env[name]);
  if (present.length === 0) {
    return new LocalStorage(localRoot);
  }
  const missing = S3_VARIABLES.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`S3 storage needs ${missing.join(', ')} as well`);
  }
  return new S3Storage(env.BUCKET_NAME!, {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    region: env.AWS_REGION!,
  });
}

export function previewKey(
  theme: { displayName: string; slug: string },
  language: PreviewLanguage,
): string {
  const folder = theme.displayName
    .replace(/[/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${folder}/${theme.slug}-${language}.svg`;
}
