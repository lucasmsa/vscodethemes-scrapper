import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(
  new URL('./fixtures/dracula-window.png', import.meta.url),
);
const lookalike = fileURLToPath(
  new URL('./fixtures/lookalike-window.jpg', import.meta.url),
);

async function loadPage(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByTestId('status-themes')).toContainText(
    /\d{1,3}(,\d{3})* themes/,
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('status-engine')).toContainText(
    'model + colors',
    { timeout: 60_000 },
  );
}

test('a Dracula window screenshot ranks Dracula Theme first and re-themes the page', async ({
  page,
}) => {
  await loadPage(page);
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
  // Dracula Theme Official is installs rank 5 and the most installed theme inside its
  // own palette band, so the readout would only repeat the first row.
  await expect(page.getByTestId('popular')).toHaveCount(0);
});

test('a screenshot whose top five tie on color names the most installed lookalike beside them', async ({
  page,
}) => {
  await loadPage(page);
  await page.getByTestId('file-input').setInputFiles(lookalike);

  const readout = page.getByTestId('popular');
  await expect(readout).toContainText('C/C++ Themes', { timeout: 30_000 });
  await expect(readout).toContainText('Most installed of');
  await expect(readout).toContainText('ΔE 2.3');

  const first = page.getByTestId('match-row').first();
  await expect(first).not.toContainText('C/C++ Themes');
});

test('the lookalike readout stays inside its card and off the page gutter at every width', async ({
  page,
}) => {
  await loadPage(page);
  await page.getByTestId('file-input').setInputFiles(lookalike);
  await expect(page.getByTestId('popular')).toContainText('C/C++ Themes', {
    timeout: 30_000,
  });

  for (const width of [
    1440, 1200, 1024, 900, 820, 700, 640, 560, 430, 390, 320,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const card = document.querySelector('.popular')!;
      const box = card.getBoundingClientRect();
      const escaped = [...card.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > box.right + 1)
        .map((el) => el.className || el.tagName);
      return {
        sideways: doc.scrollWidth - doc.clientWidth,
        cardWidth: Math.round(box.width),
        escaped,
      };
    });
    expect(layout.escaped, `at ${width}px`).toEqual([]);
    expect(layout.sideways, `at ${width}px`).toBe(0);
    expect(layout.cardWidth, `at ${width}px`).toBeGreaterThan(0);
  }
});
