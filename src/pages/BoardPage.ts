import type { Locator, Page } from '@playwright/test';

/** Escapes regex special characters, so a name from the data is matched literally. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A project's board after login (SPEC FR-2). Locators follow docs/discovery/NOTES.md and are
 * scoped column → card → tags (NFR-04), so a card only matches inside its expected column.
 *
 * The app gives columns, cards and tags no role, so those three use structural filters around
 * the accessible headings. Each one says why where it is built.
 */
export class BoardPage {
  constructor(private readonly page: Page) {}

  /** Opens a project from the sidebar. Its buttons are named "name + description", so match the project heading inside. */
  async openProject(name: string): Promise<void> {
    await this.page
      .getByRole('navigation')
      .getByRole('button')
      .filter({
        has: this.page.getByRole('heading', { level: 2, name, exact: true }),
      })
      .click();
  }

  /** The banner heading that shows `name` once that project is open. The URL never changes. */
  openedProject(name: string): Locator {
    return this.page
      .getByRole('banner')
      .getByRole('heading', { level: 1, name, exact: true });
  }

  /**
   * A column's container. Its heading's accessible name ends in the card count ("To Do (2)"),
   * so it is matched by an anchored, escaped pattern rather than `exact: true`.
   */
  column(name: string): Locator {
    // Unscoped on purpose: `has`/`hasNot` search inside each candidate, and no column holds `main`.
    const heading = this.page.getByRole('heading', {
      level: 2,
      name: new RegExp(`^${escapeRegExp(name)} \\(\\d+\\)$`),
    });
    // No role exists for a column: take the innermost div in `main` that holds its heading.
    return this.page
      .getByRole('main')
      .locator('div')
      .filter({ has: heading })
      .filter({ hasNot: this.page.locator('div').filter({ has: heading }) });
  }

  /** A task card, found only inside the given column. */
  card(columnName: string, taskTitle: string): Locator {
    const title = this.page.getByRole('heading', {
      level: 3,
      name: taskTitle,
      exact: true,
    });
    // No role exists for a card: take the innermost div in the column that holds its title.
    return this.column(columnName)
      .locator('div')
      .filter({ has: title })
      .filter({ hasNot: this.page.locator('div').filter({ has: title }) });
  }

  /** All of a card's tag elements, never the whole card: "Design" also appears in titles (NFR-06). */
  tags(card: Locator): Locator {
    // Tags are role-less spans in the card's only div without an icon; the assignee and due
    // date spans sit in divs with an icon (img), so this leaves them out.
    return card
      .locator('div')
      .filter({ hasNot: this.page.getByRole('img') })
      .locator('span');
  }

  /** The one tag element whose full text is exactly `name`, case-sensitive (NFR-06). */
  tag(card: Locator, name: string): Locator {
    return this.tags(card).filter({
      hasText: new RegExp(`^${escapeRegExp(name)}$`),
    });
  }
}
