import { getCredentials } from '../src/config/env';
import { test } from '../src/fixtures/test';

// FR-1 and FR-3. These tests drive LoginPage directly; only board tests use the loggedIn
// fixture (NFR-08).
test.describe('Login', () => {
  test('logs in with valid credentials', async ({ loginPage }) => {
    const { username, password } = getCredentials();

    await loginPage.goto();
    await loginPage.login(username, password);

    await loginPage.expectLoggedIn();
  });

  test('shows an error for invalid credentials', async ({ loginPage }) => {
    // The real username with an obviously fake password, never derived from the real one.
    const { username } = getCredentials();

    await loginPage.goto();
    await loginPage.login(username, 'wrong-password');

    await loginPage.expectLoginError();
  });
});
