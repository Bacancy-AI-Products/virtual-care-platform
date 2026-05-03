# E2E Tests (Playwright)

End-to-end tests for the TeleCare frontend.

## One-time setup

```bash
# 1. Install Playwright browser binaries
cd frontend
npx playwright install

# 2. Seed the database (creates test users, doctors, an appointment)
cd ../backend
npm run seed

# 3. Activate the pre-push git hook (smoke tests before every push)
cd ..
git config core.hooksPath .husky
```

## Run

```bash
cd frontend

npm run test:e2e          # all tests, headless
npm run test:e2e:ui       # interactive UI mode (recommended while developing)
npm run test:e2e:debug    # step through with inspector
npm run test:e2e:report   # open last HTML report
```

The Playwright config auto-starts both servers — backend on `:4001` and
frontend on `:3000`. If they're already running, it reuses them.

## Test config

All test config lives in `playwright.config.ts` — there is **no `.env` file**.
Test-only constants (URLs, credentials) are defined in:

- `playwright.config.ts` → `TEST_CONFIG` (URLs)
- `e2e/fixtures/credentials.ts` → seed users + password

## Structure

```
e2e/
├── fixtures/
│   ├── credentials.ts    seed users + shared password
│   └── auth.ts           loginAs() helper + patientPage / doctorPage fixtures
├── smoke.spec.ts         public pages load
├── signup.spec.ts        signup form rendering and validation
├── auth.spec.ts          login, validation, role redirect, protected routes
├── patient.spec.ts       patient navigation across protected pages
├── doctor.spec.ts        doctor navigation across protected pages
└── appointment.spec.ts   booking flow + appointment list assertions
```

## Seed credentials (from `backend/prisma/seed.ts`)

Password for everyone: `Demo@1234`

| Role    | Email                         | Notes                          |
| ------- | ----------------------------- | ------------------------------ |
| Patient | john.doe@telecare.com         | Has confirmed appt with Sarah  |
| Doctor  | sarah.johnson@telecare.dev    | General Physician              |

See `fixtures/credentials.ts` for the full set used in tests.

## Writing new tests

Use the auth fixtures so you don't repeat the login dance:

```ts
import { test, expect } from './fixtures/auth';

test('patient sees their appointments', async ({ patientPage: page }) => {
  await page.goto('/patient/appointments');
  await expect(page).toHaveURL(/\/patient\/appointments/);
});
```

For tests that don't need auth (smoke, signup, login form itself), import
from `@playwright/test` directly.

## Automation

| Trigger          | What runs                | Where             | Speed   |
| ---------------- | ------------------------ | ----------------- | ------- |
| `git push`       | Smoke spec only          | Local (pre-push)  | ~10–15s |
| Pull request     | Full suite               | GitHub Actions    | ~2–4min |
| Push to main     | Full suite               | GitHub Actions    | ~2–4min |
| Manual           | `npm run test:e2e`       | Local             | ~1–2min |

- **Pre-push hook:** `.husky/pre-push` (bare git hook, no npm dependency).
  Activate once with `git config core.hooksPath .husky`.
  Skip a single push with `git push --no-verify`.

- **GitHub Actions:** `.github/workflows/e2e.yml` runs on every PR + push to
  `main`/`develop`. Spins up Postgres, seeds DB, builds backend + frontend,
  runs full Playwright suite. Uploads HTML report + traces on failure.

## Notes

- Tests run **sequentially** (`workers: 1`) because they share seed data.
- Only **chromium** runs by default — enable `firefox` / `webkit` projects in
  the config when cross-browser coverage is needed.
- Tests marked `test.fixme(...)` are scaffolded but waiting on stable
  selectors (e.g. `data-testid` attrs in the booking modal).
- Run `npm run seed` again any time the DB is reset — the seed is idempotent.
