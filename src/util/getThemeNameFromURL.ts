export function getThemeNameFromURL(url: string) {
  return url.split('/').pop()?.split('?')[0].replace('.svg', '');
}
