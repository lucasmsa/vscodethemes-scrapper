import * as url from 'url';
import * as querystring from 'querystring';

export function replaceLanguageInURL(inputUrl: string, language: string) {
  const parsedUrl = url.parse(inputUrl, true);

  parsedUrl.query.language = language;
  parsedUrl.search = '?' + querystring.stringify(parsedUrl.query);

  return url.format(parsedUrl);
}
