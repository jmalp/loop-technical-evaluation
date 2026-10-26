// @ts-check
import { defineConfig } from 'eslint/config';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'test-results/',
      'playwright-report/',
      'blob-report/',
      'playwright/.cache/',
      // Other Claude Code worktrees live here when ESLint runs from the main checkout.
      '.claude/',
    ],
  },
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Tool config files written in JS (C-1) are not in tsconfig, so skip type-aware rules there.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['tests/**'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // NFR-05 forbids hard waits outright; recommended only warns.
      'playwright/no-wait-for-timeout': 'error',
    },
  },
  {
    // Page objects and fixtures drive the page too, so they get the Playwright rules that
    // make sense outside test files (NFR-04, NFR-05), as errors. Test-only rules such as
    // expect-expect and no-standalone-expect stay limited to tests/**.
    files: ['src/**'],
    plugins: {
      playwright: playwright.configs['flat/recommended'].plugins.playwright,
    },
    rules: {
      'playwright/missing-playwright-await': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
      'playwright/no-force-option': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-wait-for-selector': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
);
