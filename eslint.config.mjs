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
);
