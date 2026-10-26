# AGENTS.md: how to work in this repo

This repo is built **spec-first**, with **one task per session**:

- `docs/SPEC.md` says _what_ to build, and it is the source of truth.
- `docs/TASKS.md` splits the work into tasks T01–T07.
- This file says _how_ every session works.

If they conflict, SPEC wins on what to build and this file wins on process. Raise the conflict with the user; do not resolve it silently.

## 1. Start of every session

1. Read `AGENTS.md`, `docs/SPEC.md` and **your task's section** in `docs/TASKS.md`. Read `docs/discovery/NOTES.md` once it exists.
2. Do **only your assigned task**. If you notice anything else, list it as a follow-up in your summary or PR; do not fix it.
3. Check the task's dependencies are `done` in the task board. If they are not, stop and say so.
4. Stay inside this project folder. The only exceptions are your session scratchpad and the T07 clean-clone dry run.

## 2. Environment setup (from T02 onward)

A git worktree does not contain the gitignored `.env`. Run these once per worktree:

```bash
npm ci
```

```bash
cp .env.example .env
```

```bash
npx playwright install chromium
```

## 3. Development loop

1. **Branch.** Work on `task/<ID>-<slug>`, for example `task/T04-login`. If the app created your worktree on its own branch, keep it and record its name in the task board.
2. **Test or data first.** Write the failing test (or JSON data) for the task's acceptance criteria. Run it and **see it fail for the expected reason**.
3. **Implement** the smallest change that makes it pass (page object, fixture, config).
4. **Verify:**

   ```bash
   npm run check
   ```

   ```bash
   npm test
   ```

   Fix everything until both are green. Never weaken an assertion to get green; if the app disagrees with SPEC, go to §6.

   In T02 and T03, no committed tests exist yet (T04 adds the first one), so use `npm test -- --pass-with-no-tests` instead.

5. **Review.** Run the `spec-reviewer` subagent (`.claude/agents/spec-reviewer.md`) with your task ID. Fix every blocker and major finding and run it again, **until it returns PASS**. Minor findings and nits you leave open go in the PR, each with a reason.
6. **Update docs:**
   - In `docs/TASKS.md`, set the status and branch.
   - In `docs/SPEC.md` §7, fill in "Verified by" and "Status" for your ACs.
   - These are the only SPEC edits allowed without approval.
7. **Commit, push and open the PR:**
   - Use Conventional Commits (`feat:`, `test:`, `docs:`, `chore:`, `ci:`, `fix:`, `refactor:`), with the task ID in the subject, for example `test: add data-driven board spec with TC-01 (T05)`.
   - Every commit message ends with:

     ```
     Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
     ```

   - Stage only the files you changed. Push your branch.
   - Open the PR with `gh pr create`, filling in every section of `.github/pull_request_template.md`. The PR body ends with:

     ```
     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```

   - Add the PR URL to the task board row in a follow-up commit and push it.

8. **Check CI.** It must be green on the PR. If it fails, fix it on the branch.
9. **Summarize.** End the session with a short plain-language summary: what changed, how it was verified (commands and results, reviewer verdict, CI), the PR link, and any follow-ups.

## 4. Testing rules (from SPEC §6)

- **Data-driven (C-3, NFR-01, NFR-02):**
  - Board scenarios come only from `tests/data/board-cases.json`.
  - One loop in `tests/board.spec.ts` generates one test per case, with the title built from the data (including the case ID).
  - No per-case code, no `if`/`switch` on IDs, no copy-pasted tests.
  - Adding a case means adding one JSON object.
- **Validated data (NFR-10):** data goes through `validateBoardCases` before tests are generated, and the data-integrity test covers it.
- **Page Object Model plus fixtures (NFR-03):**
  - Locators and page actions live in `src/pages/*`.
  - Fixtures live in `src/fixtures/test.ts`.
  - Specs import `test` and `expect` from `src/fixtures/test.ts`, use page objects, and build no raw locators.
- **Locators (NFR-04):**
  - Use `getByRole`, `getByLabel` and `getByText`, scoped **column → card → tag**, so a card only matches inside its expected column.
  - No XPath.
  - No `nth()`, `first()`, `last()` or styling-class CSS selectors, unless there is no accessible alternative; then add a comment saying why.
- **Assertions (NFR-05):**
  - Web-first only: `await expect(locator).toBeVisible()`, `toHaveText`, `toHaveCount` and so on.
  - Never `page.waitForTimeout`, sleeps or `setTimeout`. Never `expect(await locator.isVisible())`.
  - No assertions inside `if`. No `try/catch` around assertions.
  - No `test.only`, and no `test.skip` without a reason.
- **Exact tags (NFR-06):**
  - Every expected tag matches one of the card's **tag elements** by full, case-sensitive text (`exact: true`), **and** the count of tag elements equals the expected count.
  - Never match a tag against the whole card's text: "Design" also appears in the titles of TC-03 and TC-06.
- **Steps (NFR-07):** wrap each brief step in `test.step`: "Login to Demo App", "Navigate to project", "Verify column", "Verify tags".
- **Independence (NFR-08):**
  - Every board test logs in through the `loggedIn` fixture.
  - The login spec drives `LoginPage` directly, and the data-integrity test uses no browser.
  - No shared mutable state, no `test.describe.serial`, no order dependence.
- **Types and style (NFR-11):** `strict` TypeScript and no `any`. No `@ts-ignore`, `@ts-expect-error` or `eslint-disable` without a written reason. `npm run check` must pass.
- **Tests must be able to fail (NFR-15):** every new or changed assertion gets a mutation check. Break the data or the input, watch the test fail with a readable message, then restore.

## 5. Guardrails

- **Never** push to, commit to or merge into `main`; the user merges PRs. The only exception is T01's initial commit, pushed with the user's explicit approval.
- **Never** change `docs/SPEC.md` beyond §7 traceability without the user's explicit approval (SPEC §10). Formatting-only changes, as SPEC §10 defines them, are the one exception.
- **Credentials:**
  - Read credentials only from env, through `src/config/env.ts`.
  - Never hardcode, print, log or echo them, including in commands, test titles, snapshots or reports you write.
  - Never commit `.env`. The only committed place for the demo values is `.env.example`.
  - Set CI secrets only with the user's approval, using `gh secret set -f .env.example`, which prints no values.
- **App discovery** goes only through Playwright code that reads credentials from env. Never type credentials into a browser pane or any other UI by hand.
- **Read-only:** never create, edit, move or delete anything in the demo app.
- **Stay in scope:** do not install dependencies, add files or refactor beyond your task. Note it as a follow-up instead.

## 6. When reality disagrees with the spec

If the live app differs from `docs/SPEC.md` (for example, a task is in a different column or has extra tags):

1. **Stop.** Do not change the test to match the app, and do not change SPEC.
2. Collect the evidence: an ARIA snapshot excerpt, a screenshot path, or the failing assertion output.
3. Ask the user, stating what SPEC says, what the app shows, and the change you propose.
4. Only after approval: update SPEC, add a §10 change-log entry with a version bump, then continue.

## 7. Definition of Done (every task)

- The task's DoD in `docs/TASKS.md` is met.
- `npm run check` and `npm test` are green locally (from T02; T02 and T03 use `npm test -- --pass-with-no-tests`), and CI is green on the PR.
- `spec-reviewer` returned **PASS**, including the mutation checks where they apply.
- `docs/TASKS.md` and SPEC §7 are updated.
- The PR is open with the template filled in, and nothing is left on `main`.
- A plain-language summary was given.
