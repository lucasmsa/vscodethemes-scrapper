export function replaceLanguageInURL(url: string, language: string) {
  return url.replace(/language=[^&]+/, `language=${language}`);
}
