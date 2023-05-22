import { replaceLanguageInURL } from '../util/urlOperations/replaceLanguageInURL';

describe('Replace Language In URL function', () => {
  test('should replace existing language parameter', () => {
    const url = `https://vscodethemes.com/?language=javascript&page=1`;
    const newLanguage = 'python';

    const newUrl = replaceLanguageInURL(url, newLanguage);

    expect(newUrl).toBe('https://vscodethemes.com/?language=python&page=1');
  });

  test('should add language parameter if not present', () => {
    const url = 'https://vscodethemes.com/?page=1';
    const newLanguage = 'javascript';

    const newUrl = replaceLanguageInURL(url, newLanguage);

    expect(newUrl).toBe('https://vscodethemes.com/?page=1&language=javascript');
  });
});
