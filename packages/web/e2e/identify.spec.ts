import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(
  new URL('./fixtures/dracula-window.png', import.meta.url),
);

test('a Dracula window screenshot ranks Dracula Theme first and re-themes the page', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('status-themes')).toContainText(
    /\d{1,3}(,\d{3})* themes/,
    { timeout: 30_000 },
  );

  await expect(page.getByTestId('status-engine')).toContainText(
    'model + colors',
    { timeout: 60_000 },
  );

  await page.getByTestId('file-input').setInputFiles(fixture);

  const first = page.getByTestId('match-row').first();
  await expect(first).toContainText('Dracula Theme', { timeout: 30_000 });
  await expect(first).toContainText('Dracula Theme Official');

  const pageBackground = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue('--page-bg')
      .trim(),
  );
  expect(pageBackground).toMatch(/^#[0-9a-f]{6}$/);
  expect(pageBackground).not.toBe('#15151a');
  await expect(page.locator('html')).toHaveAttribute('data-themed', 'true');
  await expect(page.getByTestId('sampled-swatch')).toHaveCount(6);
  await expect(first).toContainText(/and \d+ identical palettes/);
  await expect(page.getByTestId('confidence')).toContainText(
    'whole editor windows',
  );
});
