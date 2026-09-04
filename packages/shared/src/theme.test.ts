import { marketplaceUrl, previewUrl, themeId, themePageUrl } from './theme.ts';

const dracula = {
  id: 'dracula-theme.theme-dracula/dracula-theme',
  preview:
    'https://images.vscodethemes.com/dracula-theme.theme-dracula/dracula-theme-js-preview-DjUf.svg',
  extension: {
    slug: 'theme-dracula',
    displayName: 'Dracula Theme Official',
    publisher: 'dracula-theme',
    publisherDisplayName: 'Dracula Theme',
  },
};

describe('theme identity and urls', () => {
  it('builds the id from publisher, extension and theme slug', () => {
    expect(themeId('dracula-theme', 'theme-dracula', 'dracula-theme')).toBe(
      dracula.id,
    );
  });

  it('points at the vscodethemes.com page', () => {
    expect(themePageUrl(dracula)).toBe(
      'https://vscodethemes.com/e/dracula-theme.theme-dracula/dracula-theme',
    );
  });

  it('points at the marketplace item', () => {
    expect(marketplaceUrl(dracula)).toBe(
      'https://marketplace.visualstudio.com/items?itemName=dracula-theme.theme-dracula',
    );
  });

  it('swaps the language segment of a slug that itself contains "preview"', () => {
    const winter = {
      preview:
        'https://images.vscodethemes.com/winterx64.winteriscoding/winteriscoding-new-ergonomic-preview-js-preview-Dpnv.svg',
    };
    expect(previewUrl(winter, 'py')).toBe(
      'https://images.vscodethemes.com/winterx64.winteriscoding/winteriscoding-new-ergonomic-preview-py-preview-Dpnv.svg',
    );
  });

  it('swaps only the language segment of the preview url', () => {
    expect(previewUrl(dracula, 'py')).toBe(
      'https://images.vscodethemes.com/dracula-theme.theme-dracula/dracula-theme-py-preview-DjUf.svg',
    );
    const jsHeavy = {
      preview:
        'https://images.vscodethemes.com/a.b/my-js-theme-js-preview-XyZ1.svg',
    };
    expect(previewUrl(jsHeavy, 'go')).toBe(
      'https://images.vscodethemes.com/a.b/my-js-theme-go-preview-XyZ1.svg',
    );
  });
});
