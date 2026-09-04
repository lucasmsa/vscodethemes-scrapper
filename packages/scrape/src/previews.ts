import {
  PREVIEW_LANGUAGES,
  previewUrl,
  type PreviewLanguage,
  type Theme,
} from '@vscodethemes/shared';
import type { Http } from './http.ts';
import { previewKey, type Storage } from './storage.ts';

export interface PreviewEvents {
  onSaved?(theme: Theme, language: PreviewLanguage): void;
  onSkipped?(theme: Theme, language: PreviewLanguage): void;
  onError?(theme: Theme, language: PreviewLanguage, error: unknown): void;
}

export async function downloadPreviews(
  http: Http,
  storage: Storage,
  themes: Theme[],
  languages: readonly PreviewLanguage[] = PREVIEW_LANGUAGES,
  events: PreviewEvents = {},
): Promise<void> {
  await Promise.all(
    themes.flatMap((theme) =>
      languages.map(async (language) => {
        const key = previewKey(theme, language);
        if (await storage.has(key)) {
          events.onSkipped?.(theme, language);
          return;
        }
        try {
          const svg = await http.text(previewUrl(theme, language));
          await storage.put(key, svg, 'image/svg+xml');
          events.onSaved?.(theme, language);
        } catch (error) {
          events.onError?.(theme, language, error);
        }
      }),
    ),
  );
}
