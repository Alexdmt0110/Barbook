import { defineConfig } from '@playwright/test';
import { join } from 'node:path';
import { requireTestDatabase } from '../backend/test/helpers/test-database';

requireTestDatabase();

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4200',
    locale: 'fr-FR',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1365, height: 900 } } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      name: 'API',
      command: 'npm run start:prod',
      cwd: join(__dirname, '../backend'),
      url: 'http://127.0.0.1:3000/api',
      reuseExistingServer: false,
      timeout: 30000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
    {
      name: 'Angular',
      command: 'npm start -- --host 127.0.0.1 --port 4200',
      cwd: join(__dirname, '../frontend'),
      url: 'http://127.0.0.1:4200/login',
      reuseExistingServer: false,
      timeout: 60000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
  ],
});
