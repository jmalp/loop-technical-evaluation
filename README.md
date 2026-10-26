# Loop Technical Evaluation: data-driven Playwright suite

[![CI](https://github.com/jmalp/loop-technical-evaluation/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jmalp/loop-technical-evaluation/actions/workflows/ci.yml?query=branch%3Amain)

A Playwright Test suite in TypeScript for a demo Asana-like app. It logs in, opens a project and checks that a task card sits in the expected board column with exactly the expected tags. Every board scenario is one object in [`tests/data/board-cases.json`](tests/data/board-cases.json), so adding a case means adding data, not code.

## Quick start

You need **Node.js 24** (LTS, pinned in [`.nvmrc`](.nvmrc); npm comes with it) and **git**. With nvm, `nvm install` picks up the version.

```bash
git clone https://github.com/jmalp/loop-technical-evaluation.git
cd loop-technical-evaluation
npm ci
npx playwright install chromium
cp .env.example .env
npm test
```

Expected result: `16 passed`, in a few seconds once the browser is installed.

- `.env.example` holds the app URL and the public demo login from the brief. `cp` makes your local, gitignored `.env` from it.
- On a fresh Linux machine, Chromium may also need system libraries: run `npx playwright install --with-deps chromium` instead.
- On Windows, run the commands in PowerShell or Git Bash, where `cp` works.

## View the report

```bash
npx playwright show-report
```

This opens the HTML report in `playwright-report/`. Each board test shows its steps: "Login to Demo App" (under the `loggedIn` fixture), "Navigate to project", "Verify column" and "Verify tags".

## What the suite checks

| Spec file                                                                    | Tests | What it proves                                                                                                                      |
| ---------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/board.spec.ts`](tests/board.spec.ts)                                 | 6     | One test per JSON case: log in, open the project, find the card inside the expected column, and check its exact tags.               |
| [`tests/login.spec.ts`](tests/login.spec.ts)                                 | 2     | A valid login shows the Logout button and hides the form. A wrong password shows "Invalid username or password" and keeps the form. |
| [`tests/unit/board-cases.data.spec.ts`](tests/unit/board-cases.data.spec.ts) | 8     | The data file passes validation, and the validator rejects bad data with clear messages. No browser starts.                         |

The six board cases come from the brief and are listed in [SPEC §5](docs/SPEC.md#5-test-data):

| ID    | Project            | Task                          | Column      | Tags                   |
| ----- | ------------------ | ----------------------------- | ----------- | ---------------------- |
| TC-01 | Web Application    | Implement user authentication | To Do       | Feature, High Priority |
| TC-02 | Web Application    | Fix navigation bug            | To Do       | Bug                    |
| TC-03 | Web Application    | Design system updates         | In Progress | Design                 |
| TC-04 | Mobile Application | Push notification system      | To Do       | Feature                |
| TC-05 | Mobile Application | Offline mode                  | In Progress | Feature, High Priority |
| TC-06 | Mobile Application | App icon design               | Done        | Design                 |

### Other commands

| Command                                           | What it does                                                    |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `npm run check`                                   | Typecheck, then ESLint, then the Prettier check (CI runs this). |
| `npx playwright test -g "TC-03"`                  | Runs one case, matched by its ID in the test title.             |
| `npx playwright test --repeat-each=3 --retries=0` | Runs the whole suite 3 times with no retries, to catch flakes.  |
| `npx playwright test --list`                      | Lists the generated tests without running them.                 |

## Project structure

```text
.
├── .github/workflows/ci.yml          CI: npm run check and npm test, then uploads the HTML report
├── .claude/agents/spec-reviewer.md   Reviewer subagent run at the end of every task
├── docs/
│   ├── SPEC.md                       Requirements, test data and acceptance criteria (source of truth)
│   ├── TASKS.md                      Task board, T01 to T07
│   └── discovery/                    Live-app notes (NOTES.md) and ARIA snapshots
├── src/
│   ├── config/env.ts                 The only place that reads BASE_URL and the credentials
│   ├── data/boardCases.ts            BoardCase type, COLUMNS, validateBoardCases and boardCases
│   ├── fixtures/test.ts              test and expect, with the loginPage, loggedIn and boardPage fixtures
│   └── pages/
│       ├── LoginPage.ts              Login form locators and actions
│       └── BoardPage.ts              Project, column, card and tag locators
├── tests/
│   ├── data/board-cases.json         The board cases: the only place scenarios live
│   ├── board.spec.ts                 One loop that generates one test per case
│   ├── login.spec.ts                 Valid and invalid login
│   └── unit/board-cases.data.spec.ts Data-integrity tests (no browser)
├── .env.example                      Public demo values; copy it to .env
├── AGENTS.md                         How each task session works
└── playwright.config.ts              Base URL, Chromium, retries, trace, screenshots and reporters
```

## How to add a case

1. On the live app, note the card's project, its exact title, its column and **every** tag on it.
2. Append one object to the array in [`tests/data/board-cases.json`](tests/data/board-cases.json), with a new, unique `id`. For example, this card is on the Marketing Campaign board:

   ```json
   {
     "id": "TC-07",
     "project": "Marketing Campaign",
     "task": "Email campaign",
     "column": "In Progress",
     "tags": ["Design", "High Priority"]
   }
   ```

3. Run it, then the whole suite:

   ```bash
   npx playwright test -g "TC-07"
   ```

   ```bash
   npm test
   ```

No code changes. The loop in [`tests/board.spec.ts`](tests/board.spec.ts) generates the new test and builds its title from the data, for example `TC-07: "Email campaign" is in "In Progress" on Marketing Campaign with tags Design, High Priority`.

The data is validated when it loads, so a bad row fails the run with a message naming the row and the field. The rules:

- `id`, `project`, `task` and `column` are non-empty strings, and every `id` is unique.
- `column` is exactly one of `To Do`, `In Progress`, `Review` or `Done`.
- `tags` is a non-empty list of unique, non-empty strings. It must list every tag on the card: an extra tag on the card fails the test.
- Use only these five fields. The data-integrity test checks that the validated data equals the file, so an extra field fails it.

The TC-07 row above is only an example. It passes against the live app, but the submitted data holds exactly the six cases from the brief.

## Design decisions

- **Page Object Model plus fixtures.** [`LoginPage`](src/pages/LoginPage.ts) and [`BoardPage`](src/pages/BoardPage.ts) own every locator and page action. [`src/fixtures/test.ts`](src/fixtures/test.ts) extends Playwright's `test` with `loginPage`, `loggedIn` and `boardPage`, and every spec imports `test` and `expect` from there. Specs build no locators of their own.
- **One loop, data only.** [`tests/board.spec.ts`](tests/board.spec.ts) has a single `for (const c of boardCases)` loop. Nothing in it names a case: no per-case code and no branching on IDs.
- **Validated data.** [`validateBoardCases`](src/data/boardCases.ts) checks the JSON when the module loads, before any test is generated, and returns it typed. An empty array is rejected too, because it would silently generate no board tests. [`tests/unit/board-cases.data.spec.ts`](tests/unit/board-cases.data.spec.ts) covers the validator without a browser.
- **Locator strategy.** Locators come from the live-app discovery in [`docs/discovery/NOTES.md`](docs/discovery/NOTES.md). The login form uses `getByLabel` and `getByRole`, and the invalid-login message uses `getByText` with `exact: true`. On the board, columns, cards and tags have no ARIA role, so `BoardPage` anchors on accessible headings and scopes column → card → tags:
  - A column is the innermost `div` in `main` that holds its level-2 heading. The heading's accessible name includes the card count (`To Do (2)`), so it is matched with an anchored pattern such as `^To Do \(\d+\)$`.
  - A card is the innermost `div` **inside that column** that holds a level-3 heading with the exact task title. A card in another column does not match.
  - A card's tags are the `span`s in its only `div` without an icon. The assignee and due date sit next to icons, so they are left out.

  There is no XPath, no `nth()`, `first()` or `last()`, and no styling-class selector. Each structural filter has a comment in the code saying why it is needed.

- **Exact tag matching.** "Design" is a tag, and also part of the titles "Design system updates" (TC-03) and "App icon design" (TC-06). So tags are never matched against the card's text. The test first checks that the number of tag elements equals the number of expected tags, then that each expected tag is a tag element whose full text matches exactly, case-sensitive. A missing or extra tag fails on the count; a wrong tag fails on its name.
- **Readable failures.** Every browser assertion is web-first (`await expect(locator)…`, which retries until it passes or times out), and there are no fixed waits. Each board assertion carries a message with the expected value, for example `Card "Offline mode" is in column "In Progress"`.
- **UI login in every board test.** The brief lists "Login to Demo App" as a step of every case. The `boardPage` fixture is built on `loggedIn`, which logs in through the form inside a `Login to Demo App` step and waits until login has succeeded. Each test runs in its own fresh page with no shared state, so tests run in parallel and in any order. With six board tests, reusing a saved `storageState` would save little time.
- **Credentials from env.** [`src/config/env.ts`](src/config/env.ts) is the only code that reads `BASE_URL`, `LOOP_EMAIL` and `LOOP_PASSWORD`. A missing or empty credential fails fast with `Missing required environment variable LOOP_EMAIL. Copy .env.example to .env.`, naming the variable but never a value. `BASE_URL` falls back to the app's URL when it is missing or empty. Values set in the shell win over `.env`.
- **CI.** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and every push to `main`: `npm ci`, install Chromium, `npm run check`, then `npm test` with the credentials from repository secrets. It uploads the HTML report as an artifact for 14 days. On CI a failed test is retried up to twice, and the first retry records a trace. Screenshots are kept only for failures.
- **Chromium only.** It keeps runs fast and stable against a shared demo app. Another browser is one more entry in `projects` in [`playwright.config.ts`](playwright.config.ts).

## How accuracy was checked

The project was built spec-first with Claude Code, one task per session, and every task was checked before it was merged:

- **Spec first.** [`docs/SPEC.md`](docs/SPEC.md) restates the brief as requirements and acceptance criteria, and §7 traces each criterion to the test or command that proves it. Any change to the spec needed the user's approval and is logged in §10.
- **Checked against the live app.** Before any test was written, a discovery run captured the app's structure and compared every value in the six cases with the live board: 6 of 6 rows match ([`docs/discovery/NOTES.md`](docs/discovery/NOTES.md)).
- **Independent review.** Each task ended with the [`spec-reviewer`](.claude/agents/spec-reviewer.md) subagent. It checks the change against the spec and the repo's testing rules, runs the checks and tests, and reruns the mutation checks. Every task's pull request records a PASS verdict. The final audit rechecked every acceptance criterion.
- **Mutation checks.** For each of the six cases, the column was changed to a wrong one, and then one tag was changed to a wrong one, one edit at a time. Every edit failed only its own case, with a message naming the expected value. The wrong tags for TC-03 and TC-06 were text taken from their own titles ("Design system updates" and "design"), and they still failed, which shows tags are matched on tag elements only. A wrong password fails the login test.
- **Repeat runs.** `npx playwright test --repeat-each=3 --retries=0` passed 48 of 48 (16 tests × 3).
- **CI** was green on every pull request.

## A note on real secrets

The demo credentials are public: they come from the brief and are committed in `.env.example`. The suite's own code never prints them. Playwright's HTML report, traces and failure error context, however, record what is typed into the login form, and Playwright has no documented way to mask it. That is accepted here only because the values are public ([SPEC §3](docs/SPEC.md#3-system-under-test)).

With real secrets, log in once through an API, save the session with `storageState` and reuse it, and do not upload reports or traces as CI artifacts.

## More documentation

- [`docs/SPEC.md`](docs/SPEC.md): requirements, test data and acceptance criteria (the source of truth).
- [`docs/TASKS.md`](docs/TASKS.md): the task board, with a pull request for each task.
- [`AGENTS.md`](AGENTS.md): how each task session works.
- [`docs/discovery/NOTES.md`](docs/discovery/NOTES.md): the live app's structure and the fact check.
