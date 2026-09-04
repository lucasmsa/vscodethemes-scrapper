import type { Palette, PreviewLanguage } from './palette.ts';

export interface ThemeExtension {
  slug: string;
  displayName: string;
  publisher: string;
  publisherDisplayName: string;
  /** 1-based position of the extension in the site's installs-sorted index; lower is more installed. */
  rank?: number;
}

export interface Theme {
  id: string;
  slug: string;
  displayName: string;
  extension: ThemeExtension;
  palette: Palette;
  preview: string;
}

export function themeId(
  publisher: string,
  extensionSlug: string,
  themeSlug: string,
): string {
  return `${publisher}.${extensionSlug}/${themeSlug}`;
}

export function themePageUrl(theme: Pick<Theme, 'id'>): string {
  return `https://vscodethemes.com/e/${theme.id}`;
}

export function marketplaceUrl(theme: Pick<Theme, 'extension'>): string {
  const { publisher, slug } = theme.extension;
  return `https://marketplace.visualstudio.com/items?itemName=${publisher}.${slug}`;
}

/**
 * The language sits in the last "-<lang>-preview-<hash>.svg" segment, and a theme slug can
 * contain an earlier one: winteriscoding-new-ergonomic-preview is a real slug. The greedy
 * prefix forces the match to the last segment.
 */
const PREVIEW_LANGUAGE_PATTERN = /^(.*)-[a-z]+-preview-([A-Za-z0-9_-]+)\.svg$/;

export function previewUrl(
  theme: Pick<Theme, 'preview'>,
  language: PreviewLanguage,
): string {
  return theme.preview.replace(
    PREVIEW_LANGUAGE_PATTERN,
    `$1-${language}-preview-$2.svg`,
  );
}
