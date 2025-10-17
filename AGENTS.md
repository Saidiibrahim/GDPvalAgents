# Repository Guidelines

## Project Structure & Module Organization
- `index.ts` hosts the TypeScript entry point for local prototyping; agents and tools live here.
- `lib/agents.ts` exposes a request handler for server-style agent interaction.
- `notebooks/` captures exploratory work; keep large artifacts (models, data dumps) out of version control.
- `main.py` and `pyproject.toml` support Python-side experiments; mirror logic here only when you need parity with the TypeScript flow.

## Build, Test, and Development Commands
- `npm install` installs the TypeScript toolchain (`tsx`, `typescript`, `@ai-sdk/*`). Run after pulling new dependencies.
- `npm start` (or `npx tsx index.ts`) runs the weather-agent demo end-to-end.
- `uv sync` installs Python dependencies declared in `pyproject.toml`; use `uv run python main.py` for quick Python checks.
- Update the `test` script before adding automated tests—currently it exits with a failure sentinel.

## Coding Style & Naming Conventions
- Follow idiomatic TypeScript with 2-space indentation, explicit `async/await`, and semicolons.
- Use PascalCase for classes/agents, camelCase for functions, kebab-case for filenames.
- Keep shared schemas and utilities in `lib/` to avoid duplication across entry points.
- Run `npx prettier "**/*.{ts,tsx,json}" --write` prior to review; add a `.prettierrc` if conventions evolve.

## Testing Guidelines
- Target unit coverage for agent tools and schema validation; aim for meaningful tests before extending workflows.
- Place future TypeScript specs under `tests/` (e.g., Vitest or Jest) and wire them into `npm test`.
- For Python explorations, prefer `pytest` under `tests/python/` once logic stabilizes.
- Gate pull requests on a green test run once the harness is in place.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat: add itinerary tool`, `fix: guard missing prompt`) to keep history searchable.
- Reference linked issues in the body, summarize behavior changes, and flag breaking changes explicitly.
- PRs should include: concise description, test evidence (command output or rationale for skipping), and screenshots for UX-facing updates.
- Document configuration changes (new env vars, external service toggles) within the PR and update this guide when needed.

## Environment & Secrets
- Create a local `.env` and set `OPENAI_API_KEY` or provider-specific tokens before running agents.
- Keep secrets out of git; prefer local `.env` files or your runner’s secure variables.
- When sharing notebooks, strip outputs or rely on `.gitignore`d checkpoint folders to avoid leaking data.
