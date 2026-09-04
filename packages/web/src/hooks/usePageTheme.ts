import { useEffect } from 'react';
import type { RankedMatch } from '../workers/protocol.ts';
import { applyPageTheme, pageThemeFromPalette } from '../lib/retheme.ts';

export function usePageTheme(topMatch: RankedMatch | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    if (!topMatch) {
      root.removeAttribute('style');
      return;
    }
    applyPageTheme(pageThemeFromPalette(topMatch.theme.palette), root);
    root.dataset.themed = 'true';
    return () => {
      delete root.dataset.themed;
    };
  }, [topMatch]);
}
