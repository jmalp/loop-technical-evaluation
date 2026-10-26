# Loop Technical Evaluation: data-driven Playwright suite

This is a Playwright and TypeScript test suite for a demo Asana-like app. It logs in, then checks that given tasks sit in the expected board column with the expected tags. Every scenario is driven from a single JSON file, so adding a case means adding data, not code.

> **Work in progress.** Setup and run instructions arrive with T07. Until then:
>
> - [`docs/SPEC.md`](docs/SPEC.md): requirements, test data and acceptance criteria (source of truth)
> - [`docs/TASKS.md`](docs/TASKS.md): task board
> - [`AGENTS.md`](AGENTS.md): how work is done in this repo
