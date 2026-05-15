# /hipaa-check — HIPAA Compliance Review

Perform a focused HIPAA compliance review of the current working changes.

## What to do

1. **Get the diff** — Run `git diff HEAD` (or `git diff main...HEAD` if on a feature branch) to see all pending changes. If the user passes a file path or module name as an argument, scope the review to that path only.

2. **Cross-reference `docs/hipaa-plan.md`** — Open the plan and check which phases are "not started". Any change that touches PHI-adjacent code is a signal to call out what plan items are now relevant.

3. **Run through each check below** and report findings. For each finding, state: **PASS**, **WARN** (needs attention before merge), or **BLOCK** (must be fixed before this code can handle real PHI).

---

## Checks

### A. New PHI fields
- Did any Prisma schema change add a new field to `Patient`, `Appointment`, `Prescription`, `PrescriptionItem`, `Message`, `Notification`, or `File`?
- If yes → does the field contain PHI (names, dates, diagnoses, contact info, clinical notes, any health data)?
- If PHI → is it scheduled for field-level encryption per `hipaa-plan.md` Phase 1.2?
- **WARN** if the field is not yet encrypted but is in the encryption queue. **BLOCK** if the field is being written to production without encryption and no plan item covers it.

### B. New or changed routes touching PHI
- Does the diff add or modify any route handler that reads or writes PHI models?
- If yes → is the `auditPhiAccess` middleware applied (or scheduled to be applied in Phase 1.1)?
- **WARN** if the middleware is not yet applied but is in the plan. **BLOCK** if a new route exposes PHI without any audit trail and there is no open plan item for it.

### C. Auth / session changes
- Does the diff touch `auth.service.ts`, `middleware.ts`, JWT handling, cookie config, or session logic?
- If yes → check for impact on: account lockout (Phase 2.2), automatic logoff (Phase 2.4), MFA flow (Phase 2.5), or the JWT-to-cookie migration (Phase 2.6).
- **WARN** for any regression in existing safeguards. **BLOCK** if an existing lockout/logoff mechanism is removed without a replacement.

### D. New external dependencies or services
- Does the diff add a new npm package, API integration, or service that will receive PHI (e.g. logging service, analytics, error tracker, email provider, SMS, video provider)?
- If yes → **WARN** that a BAA is required before that service can process real PHI. List the service name and flag it for legal/compliance review.

### E. Secrets / credentials
- Does the diff introduce any hardcoded secrets, API keys, passwords, or tokens (even test/placeholder values)?
- If yes → **BLOCK**. Remove the secret, rotate it, and use an env var instead.

### F. File handling changes
- Does the diff touch `files.service.ts` or `files/index.ts`?
- Check: is `Content-Disposition: attachment` still enforced? Is encrypt-on-upload / decrypt-on-download logic intact or scheduled?
- **WARN** if `inline` content disposition is used for PHI files.

### G. Video module changes
- The video module is in active migration from Daily.co to a new provider. Does the diff touch `video/`?
- If yes → remind that: (1) the new provider needs a BAA before going to production, (2) the audit log for token issuance must be preserved regardless of provider.

### H. Encryption key / config
- Does the diff touch `backend/src/utils/crypto.ts` or the `MASTER_KEY` / `KEY_ID` config?
- If yes → verify key rotation logic is safe (old `keyId` still decryptable, new `keyId` set for writes).

---

## Output format

```
## HIPAA Check — <date>
**Branch:** <branch name>
**Files reviewed:** <count> files changed

### Findings
| # | Check | Status | Detail |
|---|---|---|---|
| 1 | New PHI fields | PASS / WARN / BLOCK | ... |
| 2 | PHI routes & audit log | ... | ... |
| 3 | Auth/session changes | ... | ... |
| 4 | New external dependencies | ... | ... |
| 5 | Secrets | ... | ... |
| 6 | File handling | ... | ... |
| 7 | Video module | ... | ... |
| 8 | Encryption config | ... | ... |

### Action items
- [ ] <any WARN or BLOCK items with suggested fix>

### Plan items now relevant
- Phase X.Y — <description> — triggered by <file/change>
```

If all checks pass with no warnings, say so clearly so the team has a record.
