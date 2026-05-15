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

**Push / PR / merge workflow — mandatory:**

- **Never push, create a PR, or merge a branch without first summarising the changes and receiving explicit user confirmation.** Show a diff summary (files changed, key changes, branch name, target branch) and wait for a "yes / go ahead" before executing.
- If CI is running, wait for the full pipeline to pass before calling merge. Fix failures on the branch first.
- This rule overrides any implicit "go ahead" — always ask, every time.

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

## HIPAA awareness

TeleCare handles Protected Health Information (PHI). After **any** code change, check whether it touches PHI-related functionality and proactively flag implications. Specifically, for every non-trivial change:

- If new fields are added to patient, appointment, prescription, message, notification, or file models → note whether they need field-level encryption (see `docs/hipaa-plan.md` Phase 1.2).
- If new routes read or write PHI → confirm audit-log middleware (`auditPhiAccess`) will be applied once Phase 1.1 lands.
- If auth or session logic changes → flag impact on automatic logoff / account-lockout controls.
- If a new external service or dependency is introduced that will receive PHI → call out that a BAA is required before it can be used in production.
- Use `/hipaa-check` slash command for a thorough on-demand review of a diff.

## Backend module conventions

Each feature module under `backend/src/modules/<module>/` must follow this layout:

- **`<module>.schemas.ts`** — Zod validation schemas only. Never define schemas inline in routes.
- **`<module>.service.ts`** — Business logic (DB queries, external calls, orchestration). Routes call service functions; services do not import routes.
- **`index.ts`** — Route definitions only. Import schemas and service; wire HTTP → validate → service → response.

All new env vars go in `backend/src/config/index.ts` and are exported via `config`. Never read `process.env` directly in modules. Add every new var to `.env.example`.

## Before building — mandatory checklist

Before implementing any feature, fix, or refactor:

1. **Read the relevant code** — trace callers and dependents with grep/search before touching anything.
2. **Preserve existing behaviour** — verify changes do not regress current functionality; run dependent code paths mentally or via tests.
3. **Follow established patterns** — match the architecture of the nearest similar module; use existing utilities (`toValidationError`, `requireAuth`, `requireRole`, `config`) instead of inventing new ones.
4. **No quick patches** — implement proper solutions; no one-off hacks that bypass architecture.
5. **Centralise config** — single source of truth in `backend/src/config/index.ts`.

## Reuse existing patterns

Before creating any new table, endpoint, helper, component, constant, or module:

- Search both backend **and** frontend for similar implementations first.
- Extend existing modules rather than creating parallel ones (e.g. doctor-related APIs go in the `doctors` module).
- Follow existing `react-query` usage patterns already present in other screens.
- Only create a new pattern when no equivalent exists **and** the new functionality cannot logically fit into an existing module.

For database-related work, always follow this order: schema change → seed data → backfill existing records → update application code → remove legacy fields.

## Quick references

- Run commands, env vars, seed credentials → `README.md`.
- Architecture, database schema, product specs, roadmap → `docs/`.
- E2E test details → `frontend/e2e/README.md`.
- HIPAA implementation plan → `docs/hipaa-plan.md`.
- Future S3 HIPAA requirements → `docs/s3-hipaa-integration-plan.md`.
