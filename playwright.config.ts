import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { getBaseUrl } from './src/config/env';

// Local runs read .env. Variables already set in the environment (CI secrets) win,
// because dotenv never overrides them.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    // process.env.BASE_URL || SPEC §3 default (see src/config/env.ts).
    baseURL: getBaseUrl(),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Chromium only (NFR-14). Another browser is one more entry here.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
