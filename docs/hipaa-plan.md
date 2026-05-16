# TeleCare — HIPAA Technical Safeguards Implementation Plan

> **Last updated:** 2026-05-15
> **Scope:** Technical (code/infra) safeguards only.
> Legal items (BAAs, Security Officer, workforce training, written policies, annual risk assessments) are listed in the [Out of scope](#out-of-scope--hand-to-compliance--legal) section — those go to Bacancy's legal/compliance team.
>
> **Active constraints:**
> - File storage is currently DB-backed (`File.data Bytes`). S3 migration is planned but not yet implemented. See [`s3-hipaa-integration-plan.md`](./s3-hipaa-integration-plan.md) for the HIPAA work that will be needed when S3 is added.
> - Video consultations are migrating away from Daily.co to an open-source/free provider (TBD). BAA and video-module HIPAA notes in this plan use provider-neutral language and will be updated once the new provider is chosen.

---

## Phase 0 — Immediate (hours, do before anything else)

These are bleed-the-bucket fixes. Treat exposed secrets as compromised the moment the repo leaks.

| # | Task | Files |
|---|---|---|
| 0.1 | Confirm whether `.env` is git-tracked (`git ls-files \| grep .env`). If yes, remove with `git rm --cached`, scrub history with `git filter-repo`, force-push. | `.env`, `.gitignore` |
| 0.2 | **Rotate every secret** that was ever in the repo: `JWT_SECRET`, `SMTP_PASS`, `DB_PASSWORD`, and any video-provider API keys. Treat them as compromised. | external services |
| 0.3 | Add a pre-commit guard (`gitleaks` or a simple regex hook) to block future secret commits. | `.husky/pre-commit` |
| 0.4 | Verify `.env.example` has only placeholder values. | `backend/.env.example` |

---

## Phase 1 — Critical Technical Safeguards (week 1–2)

Covers §164.312(a)(2)(iv), §164.312(b), §164.312(e)(1).

### 1.1 Audit logging — Audit Controls (§164.312(b))

The single biggest HIPAA gap. Must record who accessed what PHI, when, and from where.

**Schema addition:**
```prisma
model AccessLog {
  id           String   @id @default(cuid())
  userId       String?
  actorRole    String?
  action       String
  resourceType String?
  resourceId   String?
  ip           String?
  userAgent    String?
  requestId    String?
  success      Boolean
  metadata     Json?
  prevHash     String?  // HMAC chain — tamper evidence
  hash         String?
  createdAt    DateTime @default(now())
}
```

**Middleware:** `backend/src/middleware/auditPhiAccess.ts`
Wrap all PHI routes:
- `backend/src/modules/files/index.ts` (download / upload / delete / list)
- `backend/src/modules/prescriptions/index.ts` (view / create)
- `backend/src/modules/messages/index.ts` (list)
- `backend/src/modules/appointments/index.ts` (getOne / list)
- `backend/src/modules/patients/index.ts` (doctor viewing patient profile)
- `backend/src/modules/video/index.ts` (token issued — provider-agnostic, logs the event regardless of video platform)

**Auth events** — log in `backend/src/modules/auth/auth.service.ts`:
`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `PASSWORD_RESET_REQUESTED`, `LOGOUT`, `TOKEN_REVOKED`

**Tamper-evidence:** Each row stores `prevHash` (HMAC of previous row's content, signed with `LOG_HMAC_KEY` env var). No `update`/`delete` permitted at DB level — enforce via Prisma middleware rejecting those operations on `AccessLog`.

**Retention:** 6-year minimum (HIPAA recommendation). Add a documented cron job that archives logs older than 6 years to cold storage rather than deleting.

**Verification:** Check `AccessLog` table after any PHI read/write — row must appear. Check auth events in log on login/logout.

---

### 1.2 Field-level encryption — Encryption at Rest (§164.312(a)(2)(iv))

Host-agnostic: encrypt fields **before** Prisma writes them so the cipher is independent of the DB host or storage layer.

**New module:** `backend/src/utils/crypto.ts`
- AES-256-GCM with envelope encryption.
- `MASTER_KEY` (32 bytes base64) from env → wraps per-record DEKs.
- `encryptField(plaintext) → { ciphertext, iv, tag, keyId }` and `decryptField(payload)`.
- `keyId` enables key rotation without re-encrypting everything at once.

**Fields to encrypt (Phase 1 priority):**

| Model | Fields |
|---|---|
| `Patient` | `address`, `phone`, `emergencyContactPhone`, `dateOfBirth`, `bloodGroup` |
| `Appointment` | `reason` |
| `Prescription` | `notes` |
| `PrescriptionItem` | `drugName`, `dosage`, `frequency`, `duration`, `instructions` |
| `Message` | `content` |
| `Notification` | `body`, `metadata` |

**Implementation:** Prisma middleware (`prisma.$use`) for transparent encrypt-on-write / decrypt-on-read.

**Backfill:** `backend/scripts/encrypt-existing.ts` — idempotent script that reads → encrypts → writes existing rows in batches. Skip rows where `keyId` is already set.

> ⚠️ **Trade-off to confirm:** Encrypted fields cannot be used in `WHERE … CONTAINS` queries. Verify none of the fields listed above are currently used in search/filter clauses before encrypting them. If any are, a blind-index pattern is needed first.

**Verification:** Inspect the raw DB value — must be ciphertext. Read the value via API — must be plaintext. Round-trip test: `encrypt → DB → decrypt === plaintext`.

---

### 1.3 File encryption (§164.312(a)(2)(iv) + §164.312(c)(1))

Files are the highest-value PHI in this app. Currently stored as `Bytes` in `File.data` (DB-backed).

**Schema additions:** `File.iv String?`, `File.tag String?`, `File.keyId String?`, `File.checksum String?`

**Service changes** in `backend/src/modules/files/files.service.ts`:
- On upload: encrypt buffer with AES-256-GCM before persisting; store `iv`, `tag`, `keyId`.
- On download: decrypt before streaming back; verify `checksum` (SHA-256) and log mismatch.

**Backfill:** Idempotent script — skip rows where `keyId` is already set.

**Content-Disposition fix:** Force `Content-Disposition: attachment` in `backend/src/modules/files/index.ts` (currently uses `inline`, which leaks PHI in browser previews).

> 📝 **S3 note:** When S3 is adopted, encryption must be applied at the app layer (not solely relying on SSE-S3) so we maintain key control. See [`s3-hipaa-integration-plan.md`](./s3-hipaa-integration-plan.md).

**Verification:** Download a file and verify it's the correct decrypted content. Check raw DB `data` column is ciphertext.

---

### 1.4 Encryption in transit / security headers (§164.312(e)(1))

App-layer, host-agnostic.

**Backend** (`backend/src/app.ts`):
```ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: false, // tune CSP separately for Next.js
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.set('trust proxy', 1); // for secure cookies behind any load balancer
```

**Cookies:** `secure: true, httpOnly: true, sameSite: 'lax'` on the auth cookie. Verify `auth-token` cookie flags match between server and `frontend/src/middleware.ts`.

**Startup guard:** Throw if `NODE_ENV=production` and `FRONTEND_URL` starts with `http://`. Document in README that production **must** terminate TLS (ALB / Caddy / nginx).

**Verification:** Open browser DevTools → Application → Cookies; confirm `httpOnly` and `Secure` flags are set.

---

## Phase 2 — Access Protection (week 2–3)

Covers §164.308(a)(5)(ii)(C/D), §164.312(a)(2)(iii).

### 2.1 Rate limiting & brute-force protection

**Package:** `express-rate-limit` + `rate-limit-redis` (Redis already in stack).

| Route | Limit |
|---|---|
| `POST /auth/login` | 5 / min per IP, 10 / hour per email |
| `POST /auth/forgot-password` | 3 / hour per email + per IP |
| `POST /auth/reset-password` | 5 / hour per IP |
| `POST /files` | 30 / hour per user |
| Global floor | 300 / min per IP |

Log to `AccessLog` when limiter trips (action: `RATE_LIMIT_TRIGGERED`).

---

### 2.2 Account lockout

**Schema additions:** `User.failedLoginCount Int @default(0)`, `User.lockedUntil DateTime?`

Lock for 15 min after 5 consecutive failures. Return `423 Locked`. Reset counter on successful login. Email user on lock (without revealing whether it was wrong password vs. wrong username).

---

### 2.3 Password complexity

**Zod refinement** in `backend/src/modules/auth/auth.schemas.ts`:
- Min 12 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 symbol.
- Reject top-1000 common passwords via `zxcvbn` library.
- Same rules client-side for UX; trusted only server-side.

---

### 2.4 Automatic logoff (§164.312(a)(2)(iii))

- **Frontend:** idle-detector hook — no mouse/keyboard for 15 min → calls `authStore.logout()`.
- **Backend:** sliding-expiry: `lastActivityAt` stored in Redis; if >15 min since last activity, force logout server-side on next request (defence in depth).

---

### 2.5 MFA (TOTP) — opt-in now, mandatory for ADMIN

**Library:** `otpauth`.

**Schema additions:** `User.mfaSecret String?`, `User.mfaEnabled Boolean @default(false)`, `User.mfaBackupCodes String[]` (each bcrypt-hashed).

**Login flow change:** After password OK → `{ mfaRequired: true, tempToken }` → `POST /auth/mfa/verify`.

**Enforcement:** ADMIN role cannot complete login without MFA enabled. DOCTOR/PATIENT: optional with an in-app banner prompting enrolment.

---

### 2.6 Move JWT off localStorage

Currently in Zustand + localStorage (XSS-readable). Move to httpOnly cookie.

- `frontend/src/services/api/client.ts` — drop `Authorization: Bearer` header for same-origin requests; rely on cookie.
- Add double-submit CSRF token for state-changing requests to mitigate the CSRF surface introduced by cookie-based auth (`sameSite: 'lax'` provides most of the protection).

---

## Phase 3 — Hardening (week 3–4)

### 3.1 File upload safety

- Magic-byte verification (`file-type` npm package) — reject if reported MIME ≠ detected MIME.
- Filename sanitisation — strip path traversal chars, normalise unicode, limit to 200 chars; store sanitised name alongside original.
- (Optional / defer if ops overhead too high) ClamAV daemon in docker-compose for async antivirus scanning via queue.

---

### 3.2 Integrity controls (§164.312(c)(1))

- File checksums (Phase 1.3) — verify on every download, log mismatch to `AccessLog`.
- Audit-log HMAC chain (Phase 1.1) — detect tampering by re-computing hash chain on demand.
- Optional: digital signature on `Prescription` rows so neither party can repudiate a prescribed item.

---

### 3.3 Breach-detection alerts (§164.404 readiness)

Background job evaluating `AccessLog` for anomalies:
- >50 patient records viewed by one doctor within 1 hour.
- >10 failed logins for a single account within 30 min.
- Login from a new IP/UA combined with a high data-export volume.
- Any admin accessing PHI records (always alert).

Email `SECURITY_OFFICER_EMAIL` (env var) and/or Slack webhook when triggered.

---

### 3.4 Right-to-be-forgotten / data destruction (§164.310(d))

**Endpoint:** `DELETE /users/me`

- Hard-delete `User` + cascade `Patient` / `DoctorProfile`.
- Soft-delete `Appointment` / `Prescription` / `Message` — replace PHI fields with `[redacted]`, keep audit trail intact.
- Log destruction event to `AccessLog` (action: `USER_DATA_DESTROYED`).
- Block doctor self-deletion while they have non-completed appointments — must reassign or cancel first.

---

### 3.5 Backup automation (local-path, host-agnostic)

> **S3 not yet in scope.** When S3 is adopted, see [`s3-hipaa-integration-plan.md`](./s3-hipaa-integration-plan.md) for the encrypted-backup additions needed.

**`backup.sh`:**
- Run `pg_dump` → encrypt with the master key → write to `BACKUP_DEST_PATH` (env var pointing to local volume or any mounted path).
- Docker-compose `backup` sidecar with cron entry.
- Monthly restore drill documented in `docs/disaster-recovery.md`.

---

## Phase 4 — Verification & Docs (week 4–5)

### 4.1 SECURITY.md

Threat model, controls in place, responsible-disclosure instructions.

### 4.2 HIPAA-CHECKLIST.md

Matrix: `§164.31x clause → implementation evidence (file:line) → test that verifies it`. This is what an auditor will ask for.

### 4.3 Automated security tests

- Patient A cannot read Patient B's file.
- Doctor X cannot read Patient Y's record (no appointment relationship).
- Rate limiter trips at the documented threshold.
- Locked account returns `423`.
- `encrypt → DB → decrypt === plaintext` round-trip.
- `AccessLog` row created on every PHI read.

### 4.4 Dependency hygiene

- `npm audit` baseline — fail CI on `--audit-level=high`.
- Dependabot enabled.

---

## Cross-cutting config

Add to `backend/.env.example`:

```
MASTER_KEY=           # 32 bytes base64 — AES-256-GCM envelope key
KEY_ID=               # Identifier for current master key (for rotation)
LOG_HMAC_KEY=         # 32 bytes base64 — audit-log HMAC chain key
SECURITY_OFFICER_EMAIL=
MFA_ISSUER=TeleCare
RATE_LIMIT_REDIS_URL=
BACKUP_DEST_PATH=     # Local mount path for encrypted backups
```

Add startup validation in `backend/src/config/index.ts` — refuse to boot if `MASTER_KEY` is missing or < 32 bytes in production.

---

## Out of scope — hand to compliance / legal

These cannot be solved in code:

1. **BAAs** with the chosen video-call provider (select a HIPAA-eligible provider), SMTP provider (e.g. SendGrid HIPAA tier), and the hosting provider (AWS, etc.).
2. Designate **Security Officer** and **Privacy Officer**.
3. Written **policies**: workforce sanctions, incident response, contingency, media disposal, access authorisation.
4. **Workforce training** — annual, with documented attendance.
5. Annual **risk assessment** + remediation tracking.
6. **Notice of Privacy Practices** shown to patients at sign-up.
7. Patient-rights flows requiring legal review (accounting of disclosures, amendment requests).

---

## Status tracker

| Phase | Status | Branch |
|---|---|---|
| 0 — Secrets hygiene | ✅ done | `chore/phase0-secrets-hygiene` |
| 1.1 — Audit logging | ✅ done | `feature/phase1-audit-logging` |
| 1.2 — Field encryption | ✅ done | `feature/phase1-field-encryption` |
| 1.3 — File encryption | ⬜ not started | — |
| 1.4 — Security headers | ⬜ not started | — |
| 2.1 — Rate limiting | ⬜ not started | — |
| 2.2 — Account lockout | ⬜ not started | — |
| 2.3 — Password policy | ⬜ not started | — |
| 2.4 — Auto logoff | ⬜ not started | — |
| 2.5 — MFA | ⬜ not started | — |
| 2.6 — JWT → cookie | ⬜ not started | — |
| 3.1 — File upload safety | ⬜ not started | — |
| 3.2 — Integrity controls | ⬜ not started | — |
| 3.3 — Breach detection | ⬜ not started | — |
| 3.4 — Data destruction | ⬜ not started | — |
| 3.5 — Backup (local) | ⬜ not started | — |
| 4 — Verification & docs | ⬜ not started | — |
