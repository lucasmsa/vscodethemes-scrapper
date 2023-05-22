import { getThemeNameFromURL } from '../util/urlOperations/getThemeNameFromURL';

describe('getThemeNameFromURL function', () => {
  test('should return theme name from given URL', () => {
    const url =
      'https://vscodethemes.com/e/teabyii.ayu/ayu-dark.svg?language=javascript';
    const expectedThemeName = 'ayu-dark';

    const themeName = getThemeNameFromURL(url);

    expect(themeName).toBe(expectedThemeName);
  });

  test('should return empty string if no theme name is present', () => {
    const url =
      'https://vscodethemes.com/e/teabyii.ayu/.svg?language=javascript';
    const expectedThemeName = '';

    const themeName = getThemeNameFromURL(url);

    expect(themeName).toBe(expectedThemeName);
  });
});
