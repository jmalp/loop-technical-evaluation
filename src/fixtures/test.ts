import { test as base, type Page } from '@playwright/test';
import { getCredentials } from '../config/env';
import { LoginPage } from '../pages/LoginPage';

/**
 * Custom fixtures (NFR-03). Specs import `test` and `expect` from this file only.
 */
interface Fixtures {
  /** The login page object, for specs that drive the login form themselves (FR-1, FR-3). */
  loginPage: LoginPage;
  /**
   * The page after a successful UI login (FR-1, SPEC D-1). A board test that uses it never
   * starts before login has succeeded. It yields the page, not `void`, so a test or fixture
   * that needs a logged-in page depends on it by using it: an unused destructured fixture
   * fails `@typescript-eslint/no-unused-vars`.
   */
  loggedIn: Page;
}

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  loggedIn: async ({ page, loginPage }, use) => {
    await test.step('Login to Demo App', async () => {
      const { username, password } = getCredentials();
      await loginPage.goto();
      await loginPage.login(username, password);
      await loginPage.expectLoggedIn();
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
