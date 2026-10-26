# Task board

Each task runs in **its own Claude Code session**, following `AGENTS.md`. Requirements (FR, NFR, AC IDs) come from `docs/SPEC.md`. A session does **only** its assigned task.

**Status values:** `todo` or `done`. The board on `main` only ever shows these two. A task's own PR sets its row to `done`, and the merge makes that true. Record the PR URL in the row in a follow-up commit after `gh pr create`.

| ID  | Title                                  | Depends on | Status | Branch                          | PR                    |
| --- | -------------------------------------- | ---------- | ------ | ------------------------------- | --------------------- |
| T01 | Spec and repo bootstrap                | none       | done   | `main` (initial commit)         | none (initial commit) |
| T02 | Scaffold, tooling and CI               | T01        | done   | `claude/t02-scaffold-ci-a31f71` |                       |
| T03 | Live app discovery and spec fact check | T02        | todo   | `task/T03-discovery`            |                       |
| T04 | Login automation (FR-1)                | T03        | todo   | `task/T04-login`                |                       |
| T05 | Data-driven skeleton with TC-01 (FR-2) | T04        | todo   | `task/T05-board-skeleton`       |                       |
| T06 | Test Cases 2–6                         | T05        | todo   | `task/T06-cases-2-6`            |                       |
| T07 | Docs, final audit and submission prep  | T06        | todo   | `task/T07-docs-audit`           |                       |

If your session starts on an app-generated worktree branch, keep that branch (renaming can break the app's PR tracking) and record its real name in the Branch column.

---

## T01: Spec and repo bootstrap

- **Goal:** set down the spec, the task board, the agent workflow and the reviewer agent, then publish the public repo.
- **Scope:**
  - Files: `.gitignore`, `docs/SPEC.md`, `docs/TASKS.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents/spec-reviewer.md`, `.github/pull_request_template.md`, a stub `README.md`.
  - Run `git init -b main` and make one initial commit.
  - With the user's approval, create the public GitHub repo `loop-technical-evaluation` and push `main`.
  - No `package.json` and no code.
- **ACs:** AC-01.
- **DoD:**
  - All files above exist.
  - A reviewer subagent checked SPEC, TASKS and AGENTS line by line against the brief and returned PASS.
  - The initial commit is on `main`, and the public repo exists with `main` pushed.

---

## T02: Scaffold, tooling and CI

- **Goal:** a TypeScript Playwright project with linting, formatting and CI, ready for tests.
- **Depends on:** T01.
- **ACs:** AC-02, AC-03, AC-04, AC-05.
- **Scope:**
  - `package.json` with dev dependencies `@playwright/test`, `typescript`, `@types/node`, `dotenv`, `eslint`, `typescript-eslint`, `eslint-plugin-playwright` and `prettier`. Set `"type": "module"` only if all the tooling works with it. Pin Node **24** in `.nvmrc`.
  - npm scripts:
    - `test`: `playwright test`
    - `typecheck`: `tsc --noEmit`
    - `lint`: `eslint .`
    - `format`: `prettier --write .`
    - `format:check`: `prettier --check .`
    - `check`: typecheck, then lint, then format:check, stopping at the first failure.
  - `tsconfig.json`: `strict: true`, `noEmit`, `resolveJsonModule: true`. It covers `src/`, `tests/` and `playwright.config.ts`.
  - `eslint.config.mjs`: a flat config with typescript-eslint (type-checked rules) and `eslint-plugin-playwright`'s recommended rules for `tests/**`. Ignore the generated folders.
  - `.prettierrc` and `.prettierignore` (generated folders plus `docs/discovery/*.yml` if needed). The T01 Markdown files are already formatted with Prettier 3 defaults, so `format:check` must pass on them without content changes. Keep Prettier's Markdown defaults: do not set `proseWrap`.
  - `playwright.config.ts`:
    - Load `.env` with `dotenv`.
    - `testDir: './tests'`, `fullyParallel: true`, `forbidOnly: !!process.env.CI`.
    - `retries`: 2 on CI, 0 locally.
    - `use.baseURL` = `process.env.BASE_URL || <SPEC §3 URL>`. Use `||`, not `??`: CI passes an unset secret as an empty string, and that must fall back to the default too.
    - `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`.
    - Reporters: `list` plus `html` (`open: 'never'`) locally; `github`, `list` and `html` on CI.
    - One project, `chromium` (Desktop Chrome).
  - `src/config/env.ts`: a typed, **lazy** accessor (for example `getCredentials()`). It reads `LOOP_EMAIL` and `LOOP_PASSWORD`, and throws `Missing required environment variable LOOP_EMAIL. Copy .env.example to .env.` (naming the variable, never the value) if one is unset, **empty or whitespace only**. Because it is lazy, `--list` and the data-only tests run without credentials.
  - `.env.example` with `BASE_URL`, `LOOP_EMAIL` and `LOOP_PASSWORD` set to the demo values from the brief. The session gets these values from the user or the orchestrator session; they are in the brief, not in this repo yet.
  - `.github/workflows/ci.yml`:
    - Triggers: `pull_request`, and `push` to `main`.
    - Steps: `ubuntu-latest`, `actions/checkout`, `actions/setup-node` (with `node-version-file: .nvmrc` and npm cache), `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`, `npm test`.
    - Env from `secrets.LOOP_EMAIL`, `secrets.LOOP_PASSWORD` and `secrets.BASE_URL`.
    - Upload `playwright-report/` as an artifact with `if: ${{ !cancelled() }}` and 14-day retention.
    - Until tests exist, the test step passes `--pass-with-no-tests`. T04 removes that flag.
  - **No tests exist in T02**, so a plain `npm test` exits 1 with "No tests found". In T02 and T03 (until T04 adds the first test), run locally (and in the reviewer) `npm test -- --pass-with-no-tests` and `npx playwright test --list --pass-with-no-tests`.
  - Repository secrets: **ask the user first**, then run `gh secret set -f .env.example`. This sets every key without printing any value.
- **Out of scope:** any test, page object or fixture.
- **DoD:**
  - `npm run check` passes locally, with no content changes to the T01 docs.
  - `npm test -- --pass-with-no-tests` and `npx playwright test --list --pass-with-no-tests` exit 0.
  - A missing env var gives the clear error (shown by a quick command, not a committed test).
  - CI is green on the PR.
  - spec-reviewer returns PASS.
  - AC-02 to AC-05 traceability is filled in SPEC §7.

---

## T03: Live app discovery and spec fact check

- **Goal:** learn the real DOM and accessibility structure of the app before writing locators, and confirm every SPEC §5 value against the live app.
- **Depends on:** T02.
- **ACs:** AC-06. Also provides the evidence for FR-3 / AC-19 that T04 needs.
- **Scope:**
  - Write a **throwaway** Playwright spec (for example `tests/discovery.tmp.spec.ts`). Delete it before committing; it must not appear in the diff. It reads credentials from env through `src/config/env.ts`. **Never type credentials into a browser pane.**
  - The spec saves `await page.locator('body').ariaSnapshot()` to `docs/discovery/` for:
    - `login.aria.yml`: the login page **before** anything is typed, so no values are captured.
    - `after-login.aria.yml`: the first page after login.
    - `web-application.aria.yml`: the Web Application board.
    - `mobile-application.aria.yml`: the Mobile Application board.
  - **Redaction:** if the logged-in username value (from `LOOP_EMAIL`) appears in a snapshot as the user's identity, the throwaway spec replaces it **in code**, using the env value, with the placeholder `<LOOP_EMAIL>` before writing the file. Never by hand, because that would put the value in a command. Say so in `NOTES.md`. Do not redact unrelated words that happen to contain the same letters. Check with a case-sensitive, whole-word search, and inspect each hit.
  - Optionally, try one deliberately wrong password to see whether a deterministic error message appears (evidence for FR-3). Record what happened, not the values typed.
  - `docs/discovery/NOTES.md` covers:
    - the login form's labels and roles and the submit button
    - the post-login success signal
    - how to navigate to a project
    - how columns are exposed (heading, region or list)
    - card and tag structure
    - the recommended locator for each, following NFR-04
    - FR-3 evidence
    - a **fact-check table** for TC-01 to TC-06: expected (SPEC §5) against observed, with ✓ or ✗ for project, task, column and tags (including any extra tags on the card)
- **If anything differs from SPEC §5, stop.** Report the evidence to the user and wait for approval before any SPEC change (SPEC §10).
- **Out of scope:** page objects, fixtures and real tests.
- **DoD:**
  - The four snapshots and `NOTES.md` are committed.
  - The snapshots contain no credential values; the username is redacted as `<LOOP_EMAIL>` where it appeared.
  - All six rows are ✓, or a spec change has been approved and logged.
  - The temporary spec is gone.
  - `npm run check` and `npm test -- --pass-with-no-tests` are green.
  - spec-reviewer returns PASS.

---

## T04: Login automation (FR-1)

- **Goal:** automated login through the UI as a page object and a reusable fixture.
- **Depends on:** T03. Use `docs/discovery/NOTES.md` for locators.
- **ACs:** AC-07, AC-08, AC-19, and the login half of AC-14.
- **Scope (test first):**
  1. Write `tests/login.spec.ts` first: "logs in with valid credentials". It opens the app, submits the credentials through `LoginPage`, asserts the post-login signal is visible and asserts the login form is hidden. Watch it fail before the page object exists.
  2. `src/pages/LoginPage.ts`: locators (NFR-04) plus `goto()`, `login(username, password)` and `expectLoggedIn()`. `expectLoggedIn()` does a web-first assertion that the post-login signal from discovery NOTES is visible and the login form is hidden. The page object owns those locators, so the test and the fixture never build their own.
  3. `src/fixtures/test.ts`: extend Playwright's `test` with a `loginPage` fixture and a `loggedIn` fixture. `loggedIn` performs the UI login inside `test.step('Login to Demo App', …)` using `getCredentials()`, then awaits `expectLoggedIn()`, so a board test never starts before login has succeeded. Export `test` and `expect` from it; specs import only from there.
  4. FR-3: if T03 found a deterministic error, add "shows an error for invalid credentials" and mark AC-19 done. Otherwise mark AC-19 "not implemented: no deterministic error (see discovery NOTES)".
  5. Remove `--pass-with-no-tests` from CI.
- **Mutation check:** `LOOP_PASSWORD=wrong-password npx playwright test tests/login.spec.ts` must fail. dotenv does not override variables already set in the environment.
- **DoD:**
  - Login tests are green locally and in CI.
  - The mutation check fails as expected.
  - spec-reviewer returns PASS.
  - SPEC §7 is updated for AC-07, AC-08 and AC-19, and AC-14 is noted as partly done.

---

## T05: Data-driven skeleton with TC-01 (FR-2)

- **Goal:** the full data-driven design working end to end, with **only TC-01** in the data.
- **Depends on:** T04.
- **ACs:** AC-09, AC-10, AC-11, AC-12, and part of AC-14.
- **Scope (test first):**
  1. Write `tests/unit/board-cases.data.spec.ts` first. It is browser-free: no `page` fixture, so no browser launches. It checks that the real data passes validation. It also checks that the validator rejects bad input with clear messages: a duplicate ID, an empty field, an unknown column, empty tags and duplicate tags. Watch it fail.
  2. `src/data/boardCases.ts` exports:
     - the `BoardCase` type
     - a `COLUMNS` constant (`To Do`, `In Progress`, `Done`)
     - a `validateBoardCases(input: unknown): BoardCase[]` function
     - `boardCases`, the validated contents of `tests/data/board-cases.json`
  3. `tests/data/board-cases.json` with exactly the TC-01 object from SPEC §5.
  4. `src/pages/BoardPage.ts` (locators from discovery NOTES, scoped per NFR-04) exposes:
     - `openProject(name)`
     - `column(name)`
     - `card(columnName, taskTitle)`, found **inside** the column
     - `tags(card)`, a locator for all of the card's **tag elements** (not the whole card)
     - `tag(card, name)`, one tag element whose **full** text equals `name`, case-sensitive. Use either `getByText(name, { exact: true })` scoped to the card's tag container, or `tags(card).filter({ hasText: <anchored regex for name> })`, whichever fits the DOM in discovery NOTES.

     **Trap:** "Design" is a substring of TC-03's title and TC-06's title, so a tag must never be matched against the whole card's text (NFR-06).

  5. Add a `boardPage` fixture to `src/fixtures/test.ts`.
  6. `tests/board.spec.ts`: **one loop**, `for (const c of boardCases) test(<title from data, including c.id>, …)`.
     - Each test uses the `loggedIn` fixture.
     - Steps: `test.step('Navigate to project')`, `test.step('Verify column')` (card visible inside the column) and `test.step('Verify tags')`. The tags step checks that `boardPage.tag(card, t)` is visible for each expected tag, then that `boardPage.tags(card)` has a count equal to `c.tags.length`.
     - Web-first assertions only.

- **Mutation check:**
  - Change TC-01's column to another valid column: the test must fail.
  - Change one of its tags to a wrong value: the test must fail.
  - Add an extra tag: it must fail on the count.
  - Each failure message must show the expected value. Restore with `git restore`.
- **DoD:**
  - The data test and TC-01 are green locally and in CI.
  - The mutation checks behave as described.
  - The reviewer confirms that adding a case needs no code change.
  - spec-reviewer returns PASS.
  - SPEC §7 is updated.

---

## T06: Test Cases 2–6

- **Goal:** prove the design scales. Add TC-02 to TC-06 as **data only**.
- **Depends on:** T05.
- **ACs:** AC-13, AC-14 (fully done), AC-15.
- **Scope:**
  - Add the five SPEC §5 rows to `tests/data/board-cases.json`, with exact values.
  - `git diff --stat main...HEAD` must show only the JSON file and docs. **Any code change is a design failure:** stop and report it.
  - Run the full suite.
  - Do a mutation check on every row (wrong column, then wrong tag). Each one must fail only its own case.
  - Run `npx playwright test --repeat-each=3 --retries=0`.
  - Update SPEC §7.
- **DoD:**
  - Login plus TC-01 to TC-06 are green 3 times in a row.
  - Every row's mutations fail as expected.
  - CI is green.
  - spec-reviewer returns PASS.

---

## T07: Docs, final audit and submission prep

- **Goal:** a repo a reviewer can understand and run in minutes, and a full audit against the spec.
- **Depends on:** T06.
- **ACs:** AC-16, AC-17, AC-18, plus a re-audit of every AC.
- **Scope:**
  - `README.md` covers:
    - purpose
    - CI badge
    - prerequisites (Node LTS)
    - setup, exactly: `npm ci`, `npx playwright install chromium`, `cp .env.example .env`, `npm test`
    - how to view the report (`npx playwright show-report`)
    - project structure
    - how to add a case (one JSON object, with an example)
    - design decisions (POM plus fixtures, data validation, locator strategy, exact tag matching, UI login per test, env-based credentials, CI)
    - how accuracy was checked (spec, reviewer agent, mutation checks, repeat runs)
  - `docs/VIDEO_NOTES.md`: a 2–3 minute walkthrough outline with rough timings. It covers:
    - the problem
    - repo tour
    - the data file and the single loop
    - page objects and fixtures
    - a live demo of adding a case
    - the run, the report and CI
    - how correctness was verified
  - **Full audit:** spec-reviewer checks **every** AC in SPEC §7 and re-runs every mutation check.
  - **Clean-clone dry run:** clone the public repo into the session scratchpad, check out this task's branch, and follow the README steps exactly as written. The suite must be green.
- **DoD:**
  - The README and video notes are complete.
  - The full audit returns PASS.
  - The dry run is green.
  - Every SPEC §7 row is `done` (or carries the reason it is not implemented, for AC-19).
  - The final summary reminds the user of the two user-owned submission steps (SPEC §11): put the public repo link in the Google Form, and record and upload the 2–3 minute video.
