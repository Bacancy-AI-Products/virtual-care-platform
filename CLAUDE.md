# Project: TeleCare

## Project Overview
TeleCare is a full-stack telemedicine platform built for Bacancy. It connects patients with doctors for online consultations via video calls (Daily.co), real-time chat, appointment booking, prescription management, and medical file sharing. The app has three roles (patient, doctor, admin) and appears to be in active MVP/demo stage with production-ready infrastructure (Docker, standalone Next.js output).

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript 5.8, TailwindCSS 4
- **State Management:** Zustand 5 (auth store)
- **Data Fetching:** TanStack React Query 5
- **Real-time:** Socket.io-client 4.8
- **Video:** Daily.co (daily-js + daily-react)
- **Backend:** Node.js, Express 5, TypeScript
- **Database:** PostgreSQL via Prisma ORM 6
- **Auth:** JWT (jsonwebtoken 9, 12h expiry)
- **Validation:** Zod 4 (backend schemas)
- **Email:** Nodemailer 8

## Project Structure
```
TeleCare/
├── frontend/       # Next.js 15 app (port 3000)
│   └── src/
│       ├── app/            # App Router pages (route groups: (public), doctor/, patient/, admin/)
│       ├── components/     # Shared UI components (Layout, ConsultationRoom, NotificationBell, etc.)
│       ├── services/       # api.ts (all endpoints + typed fetch client), socket.ts
│       ├── store/          # auth.ts — Zustand store (token + user, synced to localStorage + cookie)
│       ├── hooks/          # useAuth, useVideoCall, useConsultationChat
│       ├── providers/      # QueryProvider (TanStack Query)
│       ├── constants/      # Enums and role definitions
│       └── middleware.ts   # Next.js route protection (JWT-based redirects)
├── backend/        # Express API (port 4001)
│   └── src/
│       ├── modules/        # Feature modules (auth, users, doctors, patients, appointments,
│       │                   #   prescriptions, messages, files, video, notifications, admin)
│       ├── middleware/     # auth.ts (requireAuth, requireRole), errorHandler.ts
│       ├── routes/         # index.ts — mounts all module routers at /api/v1/{resource}
│       ├── utils/          # JWT sign/verify, password hash/verify
│       ├── config/         # Env var loading and validation
│       └── db/             # Prisma client instance
│   └── prisma/
│       └── schema.prisma   # Full data model (source of truth for DB)
├── uploads/        # Local file storage
├── docs/           # Project documentation
└── docker-compose.yml
```

## Key Conventions
- **Import alias:** Frontend uses `@/*` → `./src/*` (e.g. `@/store/auth`, `@/components/Layout`)
- **API calls:** All go through `frontend/src/services/api.ts`. Never call `fetch` directly in components.
- **Backend modules:** Each module has `index.ts` (router), `*.schemas.ts` (Zod), `*.service.ts` (DB logic). No separate controller layer.
- **Component naming:** PascalCase for components, camelCase for hooks/services
- **Route protection:** `frontend/src/middleware.ts` checks JWT cookie; `backend/src/middleware/auth.ts` validates Bearer token

## User Roles
- **PATIENT** — Browse doctors, book appointments, join consultations, upload medical files, view prescriptions
- **DOCTOR** — Manage availability, view patient list, join consultations, create prescriptions, end appointments
- **ADMIN** — System administration (routes exist at `/api/v1/admin`; frontend admin portal at `/admin`)

## Core Modules
- **Auth** — Signup (patient/doctor), login, forgot/reset password (token, 1h expiry)
- **Appointments** — Book, list, cancel, status transitions (PENDING → CONFIRMED → COMPLETED)
- **Doctors** — Profile, availability slots (weekly schedule, HH:mm), specialization search/filter
- **Patients** — Health profile (DOB, blood group, height/weight, emergency contact)
- **Video** — Daily.co room creation and token generation per appointment
- **Prescriptions** — Doctor creates; patient views; linked to appointment
- **Messages** — In-consultation chat stored per appointment; real-time via Socket.io
- **Files** — Medical file upload (report/image/document); per-appointment listing; download
- **Notifications** — In-app bell; real-time push via Socket.io; read/unread state

## API Info
- **Base URL:** `http://localhost:4001/api/v1` (override via `NEXT_PUBLIC_API_URL`)
- **Auth:** `Authorization: Bearer <token>` on every protected request
- **On 401:** Frontend auto-logs out and redirects to `/login`
- **Error format:** `{ error: { code: "UPPERCASE_CODE", message: "...", details?: {} } }`
- **Success format:** varies by endpoint — resource directly or wrapped in named key (e.g. `{ appointments: [...] }`)
- **Pagination:** default 20, max 100

## Environment & Run Commands
**Frontend:**
```
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
```
```bash
cd frontend && npm run dev     # dev server on :3000
cd frontend && npm run build   # production build
```

**Backend:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=4001
FRONTEND_URL=http://localhost:3000
DAILY_API_KEY=...
DAILY_DOMAIN=...
SMTP_HOST/PORT/USER/PASS/MAIL_FROM  # email
```
```bash
cd backend && npm run dev     # nodemon dev server on :4001
cd backend && npm run build   # compile TS → dist/
cd backend && npm run seed    # seed database
docker-compose up             # starts PostgreSQL + app containers
```

## Scope Rules
- Always work strictly within this project directory only
- Do not access, read, or modify any files outside this folder
- Do not make requests to external URLs or APIs unless explicitly asked
- Do not access GitHub repos other than this project's own repo
- Scope all GitHub MCP operations to this repository only
- Always ask before deleting or overwriting existing files
- Prefer editing existing files over creating new ones
- Follow the existing folder structure and naming conventions

## GitHub Access
Use the GitHub MCP server for all GitHub operations:
- push code
- create / update PRs
- read issues
- review branches and commits

Never ask for SSH keys, PAT tokens, or manual authentication unless MCP access fails.

## Commit Message Convention

Always generate concise, meaningful commit messages based on the primary intent of the change.

### Format
<type>: <short lowercase summary>

### Allowed types
- feat: new feature
- fix: bug fix
- refactor: code restructure without behavior change
- chore: tooling, config, maintenance
- docs: documentation only

### Rules
- keep under 60 characters
- use lowercase
- use imperative tone
- describe intent, not implementation
- focus on the most important change in the diff
- avoid vague words like update, changes, fixes, misc

### Good examples
feat: add appointment booking flow
fix: prevent login redirect loop
refactor: simplify doctor card state
chore: update mcp server config
docs: add local setup steps