# BacancyTeleCare

A telemedicine platform connecting patients with doctors for online consultations — video calls, real-time chat, appointment booking, prescriptions, and medical file sharing. Built for Bacancy.

---

## Quick start (new dev)

Run these once after cloning the repo.

```bash
# 1. Start Postgres (via Docker)
docker-compose up -d postgres

# 2. Backend setup
cd backend
cp .env.example .env          # then fill in JWT_SECRET, DAILY_API_KEY, SMTP_*
npm install
npx prisma generate
npm run db:migrate            # applies all pending migrations
npm run seed                  # seeds users, doctors, an appointment

# 3. Frontend setup
cd ../frontend
npm install                   # auto-activates pre-push git hook
npx playwright install        # downloads Playwright browser binaries (E2E)
```

That's it — you're ready to develop.

---

## Daily dev — running the app

Open two terminals.

```bash
# Terminal 1 — backend (port 4001)
cd backend
npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend
npm run dev
```

Open http://localhost:3000 in the browser.

### Seed credentials

Password for everyone: `Demo@1234`

| Role    | Email                       |
| ------- | --------------------------- |
| Patient | john.doe@telecare.com       |
| Doctor  | sarah.johnson@telecare.dev  |

Full list in `backend/prisma/seed.ts`.

---

## Tech stack

**Frontend**
- Next.js 15 (App Router), React 19, TypeScript 5.8, TailwindCSS 4
- Zustand 5 (auth store)
- TanStack React Query 5 (data fetching)
- Socket.io-client 4.8 (real-time)
- Daily.co (`daily-js`, `daily-react`) (video)

**Backend**
- Node.js, Express 5, TypeScript
- PostgreSQL via Prisma ORM 6
- JWT auth (`jsonwebtoken` 9, 12h expiry)
- Zod 4 (validation)
- Nodemailer 8 (email)

**Tooling**
- Playwright (E2E)
- Docker / docker-compose
- ESLint, Prettier
- GitHub Actions (CI)

---

## Project structure

```
TeleCare/
├── frontend/              # Next.js 15 app (port 3000)
│   └── src/
│       ├── app/           # App Router pages — (public), patient/, doctor/, admin/
│       ├── components/    # Shared UI (Layout, ConsultationRoom, NotificationBell, etc.)
│       ├── services/      # api.ts (typed fetch client), socket.ts
│       ├── store/         # auth.ts — Zustand store (token + user)
│       ├── hooks/         # useAuth, useVideoCall, useConsultationChat
│       ├── providers/     # QueryProvider (TanStack Query)
│       ├── constants/     # Enums, role definitions
│       └── middleware.ts  # Next.js route protection (JWT-based)
│   └── e2e/               # Playwright E2E tests
├── backend/               # Express API (port 4001)
│   └── src/
│       ├── modules/       # auth, users, doctors, patients, appointments,
│       │                  # prescriptions, messages, files, video, notifications, admin
│       ├── middleware/    # auth.ts (requireAuth, requireRole), errorHandler.ts
│       ├── routes/        # index.ts — mounts all module routers at /api/v1/{resource}
│       ├── utils/         # JWT sign/verify, password hash/verify
│       ├── config/        # Env var loading and validation
│       └── db/            # Prisma client
│   └── prisma/
│       └── schema.prisma  # Full data model (source of truth)
├── docs/                  # architecture, database, product, roadmap notes
├── uploads/               # Local file storage (medical files)
├── .husky/                # Shared git hooks (pre-push smoke tests)
├── .github/workflows/     # CI pipelines (E2E, deploy)
└── docker-compose.yml
```

---

## Key conventions

- **Frontend import alias** — `@/*` maps to `./src/*` (e.g. `@/store/auth`, `@/components/Layout`).
- **API calls** — go through `frontend/src/services/api.ts`. Never call `fetch` directly in components.
- **Backend modules** — each module has `index.ts` (router), `*.schemas.ts` (Zod), `*.service.ts` (DB logic). No separate controller layer.
- **Naming** — PascalCase for components, camelCase for hooks/services.
- **Route protection** — `frontend/src/middleware.ts` checks the JWT cookie; `backend/src/middleware/auth.ts` validates the Bearer token.
- **State** — auth in Zustand (synced to `localStorage` + cookie). Server data via React Query.

---

## User roles

- **PATIENT** — Browse doctors, book appointments, join consultations, upload medical files, view prescriptions.
- **DOCTOR** — Manage availability, view patient list, join consultations, create prescriptions, end appointments.
- **ADMIN** — System administration (`/api/v1/admin` routes; admin portal at `/admin`).

---

## Core modules

- **Auth** — Signup (patient/doctor), login, forgot/reset password (token, 1h expiry).
- **Appointments** — Book, list, cancel; status flow `PENDING → CONFIRMED → COMPLETED`.
- **Doctors** — Profile, weekly availability slots (HH:mm), specialization search/filter.
- **Patients** — Health profile (DOB, blood group, height/weight, emergency contact).
- **Video** — Daily.co room creation and token generation per appointment.
- **Prescriptions** — Doctor creates; patient views; linked to appointment.
- **Messages** — In-consultation chat per appointment; real-time via Socket.io.
- **Files** — Medical file upload (report/image/document); per-appointment listing; download.
- **Notifications** — In-app bell; real-time push via Socket.io; read/unread state.

---

## API reference

- **Base URL** — `http://localhost:4001/api/v1` (override via `NEXT_PUBLIC_API_URL`).
- **Auth header** — `Authorization: Bearer <token>` on every protected request.
- **On 401** — frontend auto-logs out and redirects to `/login`.
- **Error format** — `{ error: { code: "UPPERCASE_CODE", message: "...", details?: {} } }`.
- **Success format** — varies by endpoint (resource directly, or wrapped in a named key like `{ appointments: [...] }`).
- **Pagination** — default 20, max 100.

---

## Testing

E2E tests live in `frontend/e2e/` (Playwright). They run automatically on push and in CI — you rarely run them by hand.

```bash
cd frontend

npm run test:e2e          # all tests, headless
npm run test:e2e:ui       # interactive UI mode (recommended while debugging)
npm run test:e2e:debug    # step through with inspector
npm run test:e2e:report   # open last HTML report
```

The Playwright config auto-starts both backend and frontend before tests, so you don't need to start them manually.

### Automation

| Trigger         | What runs                       | Where             | Speed   |
| --------------- | ------------------------------- | ----------------- | ------- |
| `git commit`    | Prettier + ESLint on staged files | Local (pre-commit) | ~2–5s  |
| `git push`      | E2E smoke tests                 | Local (pre-push)  | ~10–15s |
| Pull request    | ESLint, Prettier check, full E2E| GitHub Actions    | ~3–5min |
| Push to main    | ESLint, Prettier check, full E2E| GitHub Actions    | ~3–5min |
| Manual          | Whatever you ask                | Local             | varies  |

Skip a hook for one operation (rare):
- `git commit --no-verify` — skip pre-commit
- `git push --no-verify` — skip pre-push

See `frontend/e2e/README.md` for spec-by-spec details.

---

## Useful commands

```bash
# Database
cd backend && npx prisma studio              # GUI for inspecting the DB
cd backend && npm run seed                   # re-seed (idempotent)
cd backend && npm run db:migrate:status      # check pending migrations
cd backend && npm run db:migrate             # apply pending migrations (dev)
cd backend && npm run db:migrate:deploy      # apply migrations (prod/CI)

# Adding a schema change
# 1. Edit backend/prisma/schema.prisma
# 2. npm run db:migrate -- --name <descriptive_name>   ← generates + applies migration
# 3. Commit the new folder under backend/prisma/migrations/
#
# ⚠ Never run `npx prisma db push` in this repo — it bypasses migration history.

# Lint / format
cd frontend && npm run lint                # check ESLint errors
cd frontend && npm run lint:fix            # auto-fix ESLint errors
cd frontend && npm run format              # run Prettier on the whole repo
cd frontend && npx prettier --check .      # check formatting (CI uses this)

# Build production bundles
cd backend && npm run build
cd frontend && npm run build

# Docker (postgres + app stack)
docker-compose up -d         # start everything in background
docker-compose down          # stop
docker-compose logs -f       # tail logs
```

---

## Environment variables

### Backend (`backend/.env`)

```
DATABASE_URL=postgresql://...
JWT_SECRET=<random-32-chars>
PORT=4001
FRONTEND_URL=http://localhost:3000
DAILY_API_KEY=<from daily.co>
DAILY_DOMAIN=<your-subdomain>.daily.co
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=no-reply@telecare.test
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
```

Defaults work for local dev; only override if you change ports.

---

## Branch naming convention

Create one branch per piece of work — meaningful, short, and consistent.

**Format**

```
<type>/<short-kebab-description>
```

**Allowed types**

- `feature/` — new feature
- `fix/` — bug fix
- `refactor/` — code restructure without behavior change
- `chore/` — tooling, config, maintenance
- `docs/` — documentation only
- `test/` — tests only
- `hotfix/` — urgent production fix

**Rules**

- Lowercase, kebab-case (use hyphens, not underscores or spaces).
- Keep description **3–5 words max**.
- Describe intent, not implementation.
- Branch off `develop` (or `main` if that's the active line).
- One branch per task — don't reuse stale branches.
- Delete branches after merge.

**Examples**

```
feature/appointment-booking
feature/doctor-availability
fix/login-redirect-loop
fix/socket-reconnect
refactor/doctor-card
chore/playwright-setup
docs/api-reference
test/auth-flows
hotfix/jwt-expiry-bug
```

**Avoid**

```
my-changes              ← no type, no intent
feature/new-stuff          ← vague
FEATURE/Booking-Flow       ← wrong case
fix/fix-the-thing       ← redundant
feature/booking_v2_final   ← snake_case + version cruft
```

---

## Commit message convention

Generate concise, meaningful commit messages based on the primary intent of the change.

**Format**

```
<type>: <short lowercase summary>
```

**Allowed types**

- `feature:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructure without behavior change
- `chore:` — tooling, config, maintenance
- `docs:` — documentation only

**Rules**

- Keep under 60 characters.
- Use lowercase and imperative tone.
- Describe intent, not implementation.
- Focus on the most important change in the diff.
- Avoid vague words like *update*, *changes*, *fixes*, *misc*.

**Examples**

```
feature: add appointment booking flow
fix: prevent login redirect loop
refactor: simplify doctor card state
chore: update mcp server config
docs: add local setup steps
```

---

## Notes

- The pre-push hook is auto-activated by `npm install` in `frontend/`. No extra command needed.
- The seed is idempotent — safe to re-run after DB resets.
- E2E tests share seed data, so they run sequentially (`workers: 1`).
- Docker is optional — only Postgres needs to run; backend/frontend can run via `npm run dev`.

For deeper architecture, DB schema, product specs, and roadmap, see `docs/`.
