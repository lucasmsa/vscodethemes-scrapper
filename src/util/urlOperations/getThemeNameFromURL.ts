import { URL } from 'url';
import * as path from 'path';

export function getThemeNameFromURL(inputUrl: string) {
  const parsedUrl = new URL(inputUrl);
  const themeName = path.basename(parsedUrl.pathname).replace('.svg', '');

  return themeName;
}
