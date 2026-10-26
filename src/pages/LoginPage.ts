import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The app's login form (SPEC FR-1, FR-3). Locators follow docs/discovery/NOTES.md.
 *
 * The URL stays `/` before and after login, so `toHaveURL` cannot prove a login. The Logout
 * button, which only exists once logged in, is the post-login signal instead.
 */
export class LoginPage {
  /** The brief calls this field "Email"; the app labels it "Username" (SPEC §3). */
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly logoutButton: Locator;
  /** A plain div with no alert role or live region, so it is found by its exact text. */
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByLabel('Username', { exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.signInButton = page.getByRole('button', {
      name: 'Sign in',
      exact: true,
    });
    this.logoutButton = page.getByRole('button', {
      name: 'Logout',
      exact: true,
    });
    this.errorMessage = page.getByText('Invalid username or password', {
      exact: true,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /** Login succeeded: the Logout button is visible and the login form is gone. */
  async expectLoggedIn(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
    await expect(this.usernameInput).toBeHidden();
    await expect(this.passwordInput).toBeHidden();
    await expect(this.signInButton).toBeHidden();
  }

  /** Login refused (FR-3): the error shows, the login form stays and Logout never appears. */
  async expectLoginError(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.logoutButton).toBeHidden();
  }
}
