import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4813', headless: true },
  webServer: [
    {
      command: 'npx vite preview --host 127.0.0.1 --port 4813 --strictPort',
      url: 'http://127.0.0.1:4813',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
