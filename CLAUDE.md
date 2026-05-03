# CLAUDE.md — AI agent instructions for TeleCare

> Project context, tech stack, conventions, modules, API reference, run commands, and commit rules live in **[README.md](./README.md)** and **`docs/`**.
> This file is for rules that change *how Claude behaves* in this repo.

---

## Scope rules

- Always work strictly within this project directory only.
- Do not access, read, or modify any files outside this folder.
- Do not make requests to external URLs or APIs unless explicitly asked.
- Do not access GitHub repos other than this project's own repo.
- Scope all GitHub MCP operations to this repository only.
- Always ask before deleting or overwriting existing files.
- Prefer editing existing files over creating new ones until the LOC reached or not ideally needed.
- Follow the existing folder structure and naming conventions.

## GitHub access

Use the GitHub MCP server for all GitHub operations:

- push code
- create / update PRs
- read issues
- review branches and commits

Never ask for SSH keys, PAT tokens, or manual authentication unless MCP access fails.

## Testing & verification

- E2E tests live in `frontend/e2e/` (Playwright). Setup details in `frontend/e2e/README.md`.
- After non-trivial changes, decide whether to run targeted specs based on the diff:
  - `frontend/src/app/login/**` → `auth.spec.ts` + `smoke`
  - `frontend/src/app/signup/**` → `signup.spec.ts`
  - `frontend/src/app/patient/**` → `patient.spec.ts`
  - `frontend/src/app/doctor/**` → `doctor.spec.ts`
  - `backend/src/modules/appointments/**` → `appointment.spec.ts`
  - `frontend/src/middleware.ts` → `auth.spec.ts` (full)
  - `frontend/src/services/api.ts` → full suite
- Never auto-run E2E after every small edit — only at logical checkpoints (feature done, before commit/push).
- Suggest the relevant specs to the user; let them confirm before running, unless they've already opted into autorun for a session.

## Branches

Follow the convention documented in `README.md` → *Branch naming convention*. In summary:

- Format: `<type>/<short-kebab-description>` — lowercase, hyphens, 3–5 words.
- Types: `feature`, `fix`, `refactor`, `chore`, `docs`, `test`, `hotfix`.
- One branch per task. Branch off `develop` (or `main` if active).
- Always create a new branch before starting work — never commit directly to `main`/`develop`.
- Confirm the branch name with the user before creating it if the intent is ambiguous.

## Commit messages

Follow the convention documented in `README.md` → *Commit message convention*. In summary:

- `<type>: <short lowercase summary>` — under 60 chars, imperative, intent-focused.
- Types: `feature`, `fix`, `refactor`, `chore`, `docs`.

## Quick references

- Run commands, env vars, seed credentials → `README.md`.
- Architecture, database schema, product specs, roadmap → `docs/`.
- E2E test details → `frontend/e2e/README.md`.
