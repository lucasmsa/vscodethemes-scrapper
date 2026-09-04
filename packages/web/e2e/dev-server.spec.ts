import { expect, test } from '@playwright/test';

const DEV_URL = 'http://127.0.0.1:5175';

test('the dev server loads the model instead of falling back to colors', async ({
  page,
}) => {
  const serverErrors: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(response.url());
  });

  await page.goto(DEV_URL);
  await expect(page.getByTestId('status-engine')).toContainText(
    'model + colors',
    { timeout: 120_000 },
  );
  expect(serverErrors).toEqual([]);
});
