# T03 discovery notes

Captured on 2026-10-26 against the SPEC §3 URL, using Playwright 1.64.1 with Chromium. A throwaway spec (`tests/discovery.tmp.spec.ts`, deleted before commit) did all the browsing. It read the credentials through `src/config/env.ts`, and only clicked the login form and the project buttons in the sidebar, so the app's data was never changed.

## Snapshots

Each file is `await page.locator('body').ariaSnapshot()`, written by code.

| File                          | State captured                                                                |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `login.aria.yml`              | The login page on first load, **before** anything was typed.                  |
| `after-login.aria.yml`        | The first page after a valid login (the app opens the Web Application board). |
| `web-application.aria.yml`    | After clicking "Web Application" in the sidebar. Identical to `after-login`.  |
| `mobile-application.aria.yml` | After clicking "Mobile Application" in the sidebar.                           |

**Reproducible.** The "Made in Bolt" badge (see [Other observations](#other-observations)) loads late, so the spec waits for it before each snapshot. Three full runs in a row wrote byte-identical files.

**Redaction.** Before writing any file, the spec replaced the `LOOP_EMAIL` value with `<LOOP_EMAIL>` and the `LOOP_PASSWORD` value with `<LOOP_PASSWORD>`, in code, as whole words and case-sensitive. It then reported each hit with the value masked. In the four committed snapshots both counts are **0**: the app never shows the logged-in username, and the login page was captured before typing. The only hit was the username field's value in the invalid-login capture, which is not committed; the excerpt below leaves out the typed values.

**Watch out:** an ARIA snapshot includes the value of every textbox, including the password field. Never take a snapshot while the login form is filled in.

## Login page

- Heading: `heading "Project Board Login" [level=1]`.
- Username field: `<label for="username">Username</label>` on `<input id="username" type="text" autocomplete="username" required>`. Its accessible name is "Username". The brief calls this field "Email"; the app labels it "Username" (as SPEC §3 notes).
- Password field: `<label for="password">Password</label>` on `<input id="password" type="password" required>`. Its accessible name is "Password".
- Submit: `<button type="submit">Sign in</button>`, accessible name "Sign in".
- Login is checked in the browser: clicking "Sign in" sends no network request, and the URL stays `/`.

## Post-login success signal

- The login form disappears, and the page shows a sidebar (`heading "Projects" [level=1]` and a `navigation` with one button per project), a `banner` with the current project's name (`heading [level=1]`) and a **"Logout" button**, and a `main` area with the board.
- The URL does not change (it stays `/` before and after login, and on every project), so `toHaveURL` cannot prove a login.
- Recommended signal: `getByRole('button', { name: 'Logout' })` is visible, and `getByLabel('Username')` (or `getByRole('button', { name: 'Sign in' })`) is hidden.

## Navigating to a project

- The sidebar `navigation` holds three `button`s: "Web Application", "Mobile Application" and "Marketing Campaign". Each contains a `heading [level=2]` with the project name and a `paragraph` with a description, so the button's accessible name is "name + description" (for example "Web Application Main web application development").
- After login, Web Application is already open. Tests should still click the project, so the step does not depend on that default.
- After a click, the `banner` heading (level 1) changes to the project name. There is no route change and no network request: all project and board data is in the app's JavaScript bundle.
- Heading level 2 is used both for project names in the sidebar and for column headings in `main`, so always scope column headings to `main` and project headings to `navigation`.

## Columns

- Every project shows four columns, in this order: **To Do, In Progress, Review, Done**. Empty columns still show, with a count of 0 (for example "Review (0)").
- A column is a plain `div` with no role (no region, list or group). It holds an `h2` and then the cards.
- The `h2` is `To Do <span>(2)</span>`. Its accessible name is **"To Do (2)"**: the column name, one space, then the number of cards in brackets. The text before the count span is exactly the SPEC column value plus one space.
- **Trap:** `getByRole('heading', { level: 2, name: 'To Do', exact: true })` matches **nothing**, because the count is part of the name. Use an anchored regex such as `/^To Do \(\d+\)$/`.

## Cards

- A card is a plain `div` with no role. Its children, in order: `h3` (title), `p` (description), a `div` holding the tag `span`s, and a `div` with the assignee and due date (each a `span` next to an `svg` icon, which has the `img` role).
- The title's accessible name and its `textContent` are both exactly the task title, with no extra whitespace.
- All 11 task titles across the three projects are different, so each SPEC §5 title appears exactly once on its own board and on no other board.

## Tags

- Tags are `span`s with no role and no accessible name, inside the card's tag `div`. The ARIA snapshot joins them into one line (for example `text: Feature High Priority`), so the snapshot alone does not show where one tag ends.
- The tag `div` is the only `div` in the card without an icon (`img`). The assignee and date are also `span`s, but they sit in the icon `div`s.
- Each tag `span`'s text is exactly the tag name. The tags seen anywhere in the app are `Feature`, `High Priority`, `Bug` and `Design`.
- **NFR-06 trap confirmed:** "Design" is a tag and also part of the titles "Design system updates" (TC-03) and "App icon design" (TC-06), and of the Marketing Campaign description "Design and implement Q2 email campaign".

## Recommended locators (NFR-04)

The app has no roles for columns, cards or tags. The structural filters below are the most accessible option there is, so each one needs a comment saying why. Every row was checked live against all six SPEC §5 cases. In the regexes, `escaped` is the name with regex special characters escaped.

| Target              | Recommended locator                                                                                                                                                                                                                                     | Live result                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Username / password | `page.getByLabel('Username')`, `page.getByLabel('Password')`                                                                                                                                                                                            | Fills both fields.                                                                                          |
| Submit              | `page.getByRole('button', { name: 'Sign in' })`                                                                                                                                                                                                         | One match.                                                                                                  |
| Logged in           | `page.getByRole('button', { name: 'Logout' })`                                                                                                                                                                                                          | Visible after a valid login, hidden after an invalid one.                                                   |
| Project button      | `page.getByRole('navigation').getByRole('button').filter({ has: page.getByRole('heading', { level: 2, name, exact: true }) })`                                                                                                                          | One match per project.                                                                                      |
| Project opened      | `page.getByRole('banner').getByRole('heading', { level: 1, name, exact: true })`                                                                                                                                                                        | Visible after the click.                                                                                    |
| Column heading      | `columnHeading` = ``page.getByRole('heading', { level: 2, name: new RegExp(`^${escaped} \\(\\d+\\)$`) })``. To use it on its own, scope it: `page.getByRole('main').getByRole('heading', …)`.                                                           | One match per column inside `main`.                                                                         |
| Column container    | `page.getByRole('main').locator('div').filter({ has: columnHeading }).filter({ hasNot: page.locator('div').filter({ has: columnHeading }) })`: the innermost `div` holding the heading. `columnHeading` is the **unscoped** locator from the row above. | Exactly 1 for every column used.                                                                            |
| Card, inside column | The same pattern inside the column, with `page.getByRole('heading', { level: 3, name: title, exact: true })`: the innermost `div` holding the title.                                                                                                    | 1 in the expected column, 0 in each of the other three columns, for all six cases.                          |
| All tags of a card  | `card.locator('div').filter({ hasNot: page.getByRole('img') }).locator('span')`: the spans in the card's only icon-free `div`.                                                                                                                          | Returns exactly the tag texts for all six cases (assignee and date are left out).                           |
| One tag, exact      | ``tags(card).filter({ hasText: new RegExp(`^${escaped}$`) })``, or `getByText(name, { exact: true })` scoped to the tag `div`                                                                                                                           | 1 for every expected tag. Lowercase versions ("design", "feature") match 0, so the match is case-sensitive. |

**Trap:** a locator passed to `has` or `hasNot` is searched inside each candidate element, not from the page root. If `columnHeading` starts with `getByRole('main')`, the container matches **0** columns, because no column `div` holds a `main`. The outer `page.getByRole('main').locator('div')` already limits the search to `main`.

The alternative for tags is the styling class `span.rounded-full`. It gives the same result, but NFR-04 bans styling-class selectors when there is a structural option, so it is not recommended.

## FR-3 evidence (invalid login)

- **Wrong password** (correct username, a deliberately wrong password): a plain `div` with the text **"Invalid username or password"** appears inside the form, between the password field and "Sign in". The form stays visible, "Logout" does not appear, and the URL stays `/`.
- **Unknown username** (and a wrong password): the same message.
- **Deterministic:** the same exact text appeared in 3 of 3 runs for each variant. Submitting sends no network request (only the page's own files load), and each whole check, page load included, took under 1 s.
- The message has no `alert` role and no `aria-live` (0 `alert` roles on the page). Locate it with `page.getByText('Invalid username or password', { exact: true })`.
- ARIA excerpt after a wrong password (typed values left out):

  ```yaml
  - heading "Project Board Login" [level=1]
  - text: Invalid username or password
  - button "Sign in"
  ```

- **Conclusion for T04:** FR-3 has a deterministic, visible error, so T04 can implement the invalid-login test (AC-19).

## Fact check: SPEC §5 against the live app

Observed values come from the DOM's exact `textContent` and the accessible names. ✓ means the value matches SPEC §5 character for character. "Tags" lists **every** tag element on the card, so an extra tag would show here.

| ID    | Project              | Task                            | Column        | Tags on the card (all)   | Result |
| ----- | -------------------- | ------------------------------- | ------------- | ------------------------ | ------ |
| TC-01 | Web Application ✓    | Implement user authentication ✓ | To Do ✓       | Feature, High Priority ✓ | ✓      |
| TC-02 | Web Application ✓    | Fix navigation bug ✓            | To Do ✓       | Bug ✓                    | ✓      |
| TC-03 | Web Application ✓    | Design system updates ✓         | In Progress ✓ | Design ✓                 | ✓      |
| TC-04 | Mobile Application ✓ | Push notification system ✓      | To Do ✓       | Feature ✓                | ✓      |
| TC-05 | Mobile Application ✓ | Offline mode ✓                  | In Progress ✓ | Feature, High Priority ✓ | ✓      |
| TC-06 | Mobile Application ✓ | App icon design ✓               | Done ✓        | Design ✓                 | ✓      |

All six rows match SPEC §5, so no spec change is needed. For each case: the card appears exactly once on its board, inside the expected column; it is in none of the other three columns; and its tag elements are exactly the SPEC tags, with no extras.

### Full board inventory

For checking near-matches. Columns are in display order, with the count shown in the heading.

| Project            | Column          | Task                          | Tags                   |
| ------------------ | --------------- | ----------------------------- | ---------------------- |
| Web Application    | To Do (2)       | Implement user authentication | Feature, High Priority |
| Web Application    | To Do (2)       | Fix navigation bug            | Bug                    |
| Web Application    | In Progress (1) | Design system updates         | Design                 |
| Web Application    | Review (1)      | API integration               | Feature, High Priority |
| Web Application    | Done (1)        | Update documentation          | Feature                |
| Mobile Application | To Do (1)       | Push notification system      | Feature                |
| Mobile Application | In Progress (1) | Offline mode                  | Feature, High Priority |
| Mobile Application | Review (0)      | (none)                        |                        |
| Mobile Application | Done (1)        | App icon design               | Design                 |
| Marketing Campaign | To Do (1)       | Social media calendar         | Feature                |
| Marketing Campaign | In Progress (1) | Email campaign                | Design, High Priority  |
| Marketing Campaign | Review (1)      | Landing page copy             | Design                 |
| Marketing Campaign | Done (0)        | (none)                        |                        |

## Other observations

- **"Review" column.** Every board has a fourth column, "Review", between In Progress and Done. No SPEC §5 case uses it, so §5 is unaffected. SPEC NFR-10 lists only `To Do`, `In Progress` and `Done` as valid columns, so a future case in Review would fail validation. This is raised as a follow-up for the user; T03 does not change SPEC.
- **Third project.** "Marketing Campaign" exists in the sidebar. No SPEC case uses it.
- **Third-party badge.** A "Made in Bolt" link and a "Hide the Made in Bolt badge" button come from `https://bolt.new/badge.js`, outside the app's `#root`, and load after the app. Never use them in locators. They did not block any click during discovery.
- **Timing.** The app is a client-side React (Vite) single-page app. Every page in discovery was ready within about 1 s, and web-first waits (`toBeVisible`) were enough; no fixed waits were needed.
- **No server state.** Login and board data make no network requests, so every new page starts from the same data. This helps test independence (NFR-08) and stability (NFR-12).
