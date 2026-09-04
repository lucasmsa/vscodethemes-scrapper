export const PALETTE_FIELDS = [
  'editorBackground',
  'editorForeground',
  'activityBarBackground',
  'activityBarForeground',
  'activityBarInActiveForeground',
  'activityBarBorder',
  'activityBarActiveBorder',
  'activityBarActiveBackground',
  'activityBarBadgeBackground',
  'activityBarBadgeForeground',
  'tabsContainerBackground',
  'tabsContainerBorder',
  'statusBarBackground',
  'statusBarForeground',
  'statusBarBorder',
  'tabActiveBackground',
  'tabInactiveBackground',
  'tabActiveForeground',
  'tabBorder',
  'tabActiveBorder',
  'tabActiveBorderTop',
  'titleBarActiveBackground',
  'titleBarActiveForeground',
  'titleBarBorder',
] as const;

export type PaletteField = (typeof PALETTE_FIELDS)[number];

export type Hex = `#${string}`;

export type Palette = Record<PaletteField, Hex | null>;

export const PREVIEW_LANGUAGES = [
  'js',
  'py',
  'go',
  'html',
  'css',
  'cpp',
  'java',
] as const;

export type PreviewLanguage = (typeof PREVIEW_LANGUAGES)[number];
