# TeleCare AI Symptom Checker — Session Handoff Brief

> **Purpose:** Drop this whole file into a fresh Sonnet chat as the first prompt. It's written for a model that hasn't seen any prior conversation. Covers the full context, environmental gotchas, exact state of the code, and a linear resume plan.
>
> **Status at handoff:** Phases 0–2 complete and green (uncommitted). Phase 3 partially wired (code temporarily broken; recoverable forward, not by rollback). Phases 4–6 not started.
>
> **Single branch:** All work lives on `feature/symptom-checker-foundation`. No intermediate commits. No commit at all until user gives explicit "yes" per CLAUDE.md HARD STOP.

---

## 1. Project context (read first)

You are working in `~/Documents/TeleCare`. This is a Node/Express + Next.js telemedicine app with a Postgres + Prisma backend. It has a `CLAUDE.md` file at the repo root that governs how you behave — **read it before doing anything**.

Critical rules from `CLAUDE.md` and from how we've been working:

1. **HARD STOP — never commit/push without explicit "yes" from the user.** Show diff, show plain-English summary of each file, *use the exact words* "Can I commit and push?", wait for "yes" or "go ahead". Words like "continue", "next", "proceed" do NOT count as commit approval.
2. **All Phase 0–6 work for the symptom checker lives on a single branch** — `feature/symptom-checker-foundation`. The user explicitly said "do all work in this branch only" — no intermediate commits between phases.
3. **After every phase, deliver a plain-English summary** with four sections:
   - What the threat/problem was before
   - What was built and how it works (assume the user is non-technical on AI specifically — explain LLM patterns simply)
   - What it does NOT protect against
   - What to tell an auditor / stakeholder
4. **Pause after each phase** for the user to give the "next" signal before starting the next one.

---

## 2. Environmental gotchas that will waste time if you don't know them

These have already cost us real session time. Internalise before doing git or test work.

### 2.1 `.git/index.lock` reappears

The repo is mounted into a Linux sandbox from macOS. Any `git` write op leaves a `.git/index.lock` that the sandbox cannot unlink due to mount permissions. When a git command fails with that error:

1. Call the `mcp__cowork__allow_cowork_file_delete` MCP tool with path `/sessions/<session>/mnt/TeleCare/.git/index.lock`.
2. Then in bash: `rm -f .git/index.lock`.
3. If the user rejects the delete permission, ask them to `rm .git/index.lock` in their own terminal.

### 2.2 Native bindings are darwin-only

Prisma engines, Rollup (used by Vitest), and the Anthropic SDK are installed for macOS. So:

- ✅ `npx tsc --noEmit` works in the sandbox — pure TypeScript.
- ❌ `npx prisma migrate`, `npx prisma format`, `npx prisma validate`, `npx vitest`, `npm install` — must run on the user's host (their macOS terminal). Don't try them in sandbox; you'll get "Failed to fetch sha256" or "Cannot find module @rollup/rollup-linux-x64-gnu" errors.

Ask the user to run those commands and paste output.

### 2.3 Two databases

- Dev DB (`telecare_db`): migrated by `npm run db:migrate`.
- Test DB (`telecare_test`): needs `npm run db:test:setup` *separately* — easy to forget after a schema change. If existing tests suddenly fail en masse after a schema change, this is almost certainly the reason.

---

## 3. Codebase conventions to match

`CLAUDE.md` mandates these — don't reinvent.

- **Backend module shape:** every module under `backend/src/modules/<name>/` has `index.ts` (Express router), `<name>.schemas.ts` (Zod), `<name>.service.ts` (DB + logic). Routes call services; services don't import routes.
- **No `process.env` in modules.** Add env vars to `backend/src/config/index.ts` and `.env.example`. Read via `config.foo.bar`.
- **Validation:** Zod `safeParse` + `toValidationError(err)` from `backend/src/utils/validation.ts`.
- **Auth:** `requireAuth, requireRole('PATIENT'), auditPhiAccess(AuditAction.X, 'Resource')` chain from `backend/src/middleware`.
- **Errors:** throw `AppError(msg, status, code)` from `backend/src/utils/errors.ts`.
- **PHI encryption:** `maybeEncrypt(value) ?? value` on write, `maybeDecrypt(value) ?? value` on read — helpers in `backend/src/utils/crypto.ts`. Used inline in services (see `appointments.service.ts` for the pattern).
- **Audit actions:** add constants to the `AuditAction` object in `backend/src/modules/audit/audit.service.ts`. We already added:
  - `SYMPTOM_CHECK_CREATED`
  - `SYMPTOM_CHECK_VIEWED`
  - `SYMPTOM_CHECK_LIST`
  - `SYMPTOM_CHECK_RED_FLAG_FIRED`
  - `SYMPTOM_CHECK_LLM_UNDER_TRIAGE`
  - `SYMPTOM_CHECK_RAW_PURGED`

---

## 4. Subtle facts that bit us

- **`DoctorProfile.specialization` stores the slug ID, not the name.** E.g. `"general_physician"`, `"cardiologist"`. The `Specialization` table has `id: <slug>` + `name: <display>`. Don't confuse them.
- **The fallback specialty is "General Physician" with slug `general_physician`**, not "General Practice". Defined in `symptom-checks.guardrails.ts` as `FALLBACK_SPECIALIZATION_ID`.
- **`createDoctor` test factory defaults to `verified: false`.** If you write tests that need a matched doctor, update verified=true after creation (see `seedSpecsAndDoctors` in `symptom-checks.service.test.ts`).
- **`resetDb` truncates every table before each test.** So if your test needs specializations or doctors seeded, do it in `beforeEach`.
- **Prompt-injection mitigation:** patient text is wrapped in `<patient_symptoms>...</patient_symptoms>` in the user message. Don't break that.

---

## 5. What's already done (Phases 0–2 — complete, green, uncommitted)

### Phase 0 — Schema

- `backend/prisma/schema.prisma`: added `TriageUrgency` enum + `SymptomCheck` model + inverse relations on `Patient`, `Specialization`, `Appointment`.
- Migration: `backend/prisma/migrations/20260525142217_add_symptom_check/migration.sql` (already applied to dev + test DBs).

### Phase 1 — Deterministic layer (no LLM)

- `backend/src/modules/symptom-checks/symptom-checks.guardrails.ts` — 10 red-flag rules:
  - `CARDIAC_CHEST_PAIN`, `STROKE_FAST`, `ANAPHYLAXIS`, `SUICIDAL_IDEATION`, `PREGNANCY_BLEEDING`, `CHOKING`, `UNCONSCIOUS_UNRESPONSIVE`, `SEVERE_HEAD_TRAUMA`, `UNCONTROLLED_BLEEDING`, `INFANT_HIGH_FEVER`.
  - Plus `maxUrgency` helper, copy templates, `FALLBACK_SPECIALIZATION_ID`.
- `symptom-checks.schemas.ts` — Zod input schemas (`createSymptomCheckSchema`, etc.).
- `symptom-checks.service.ts` — 5-stage pipeline (pre-filter → decide → match → persist → audit).
- `index.ts` — POST/GET routes (PATIENT-only for write, role-aware for read).
- Router mounted at `/api/v1/symptom-checks` in `backend/src/routes/index.ts`.
- `symptom-checks.guardrails.test.ts` — 30+ unit tests.
- Added `SYMPTOM_CHECKER_ENABLED` + `RAW_LLM_RESPONSE_TTL_DAYS` to config + `.env.example`.

### Phase 2 — LLM single-pass (green)

- Added `@anthropic-ai/sdk` to backend dependencies.
- Config: `ANTHROPIC_API_KEY`, `LLM_MODEL` (default `claude-sonnet-4-5`), `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES`, `LLM_MAX_OUTPUT_TOKENS`.
- `symptom-checks.prompt.ts` — system prompt with `PROMPT_VERSION = 'triage-v1.0'` (Phase 3 bumps this to `'triage-v2.0'`).
- `symptom-checks.llm.ts` — `callTriageLLM(input)` returns `{ output, rawResponse, modelVersion, promptVersion, failureReason? }`. Never throws on expected errors; returns null with reason instead.
- `symptom-checks.service.ts` rewritten as 5-stage pipeline (pre-filter → LLM → post-filter → match → persist). Persists `rawLlmResponse` encrypted with `rawResponsePurgeAt = now + 30 days`.
- `__fixtures__/triage-suite.ts` — 20 vignettes (5 per urgency level).
- `symptom-checks.service.test.ts` — mocks `callTriageLLM` via `vi.mock`, runs the suite, tests under-triage override, specialty mapping, LLM failure handling, persistence provenance.
- **60/60 tests green at the end of Phase 2.**

---

## 6. Phase 3 — IN-FLIGHT (this is where you're picking up)

**Goal:** one-round structured clarification (chip questions). The LLM may, on its first call only, return a small set of question IDs instead of a triage decision; the server resolves the IDs to a fixed bank of prompts/options; the FE shows chips; on the second call the LLM must commit to a triage.

### 6.1 Done in Phase 3 already

1. **`backend/src/modules/symptom-checks/symptom-checks.questions.ts`** — new file.
   - `CLARIFY_QUESTION_IDS` enum (8 IDs: DURATION, SEVERITY, FEVER, PROGRESSION, LOCATION, RADIATION, TRIGGERS, ASSOCIATED_SYMPTOMS).
   - `CLARIFY_QUESTION_BANK` with prompt + options for each.
   - `resolveClarifyQuestions(ids)` — maps IDs to full `ClarifyQuestion[]` for the FE.
   - `buildContinuationText(symptomsText, answers)` — merges Q&A into the LLM input on continuation calls.

2. **`symptom-checks.schemas.ts`** — `triageLlmOutputSchema` is now a discriminated union:
   - `triageLlmTriageBranch` requires `kind: 'triage'`.
   - `triageLlmClarifyBranch` requires `kind: 'clarify'` + `questionIds: ClarifyQuestionId[]` (1–3).
   - `llmOutputSchema` = `z.discriminatedUnion('kind', [...])`.
   - `llmContinuationOutputSchema` = triage branch only (used on the second call).
   - Old `triageLlmOutputSchema` is now an alias to the triage branch for back-compat.

3. **`symptom-checks.prompt.ts`** — bumped to `PROMPT_VERSION = 'triage-v2.0'`. Two prompts:
   - `buildInitialSystemPrompt` — LLM may clarify OR triage.
   - `buildContinuationSystemPrompt` — LLM must triage; clarify branch forbidden and will be rejected by schema as defense-in-depth.
   - User-message builder unchanged.
   - Old `buildTriageSystemPrompt` is an alias to `buildInitialSystemPrompt` for back-compat.

4. **`symptom-checks.llm.ts`** — `callTriageLLM` now accepts `mode: 'initial' | 'continuation'`, picks the appropriate prompt + schema, returns `LlmOutput | null` (the union).

### 6.2 NOT done in Phase 3 — what you need to finish

#### A. Update `symptom-checks.service.ts`

The file currently uses Phase 2 logic and **will not type-check now that `llmResult.output` is `LlmOutput` (union) instead of `TriageLlmOutput`**.

Required changes:

- In `createSymptomCheck`, after the LLM call returns, narrow on `output.kind`:
  - `'clarify'` → return a result with `kind: 'clarify'`, the resolved questions from `resolveClarifyQuestions`, no DB persist.
  - `'triage'` → existing post-filter logic.
  - `null` → existing fallback.
- Detect continuation: if `input.clarificationAnswers` is non-empty, call `buildContinuationText(input.symptomsText, input.clarificationAnswers)` to merge, run pre-filter on the merged text (this is how continuation catches new red flags), call `callTriageLLM` with `mode: 'continuation'`. The continuation path always persists.
- Initial path: persist only when the triage branch is returned. Clarify branch responses are NOT persisted (stateless between calls — patient/FE holds the original text).
- Change return type of `createSymptomCheck` to a discriminated union:

```ts
Promise<
  | ({ kind: 'triage' } & SymptomCheckResult)
  | { kind: 'clarify'; questions: ClarifyQuestion[] }
>
```

#### B. Update existing Phase 2 test mocks

In `symptom-checks.service.test.ts`, every `ok({...})` call constructs a triage payload **without `kind: 'triage'`**. They'll now fail Zod validation in the LLM layer and TypeScript type-check at the test level. Add `kind: 'triage'` to every mock — there are ~6 of these.

Also: the `persistence` test asserts `promptVersion === 'triage-v1.0'`. After the bump to v2.0 this test will fail. Update the assertion to `'triage-v2.0'`.

#### C. Update the route handler in `index.ts`

The response shape diverges:

- On clarify, return `200 OK` with `{ kind: 'clarify', questions }`.
- On triage, keep the existing `201 Created` with the full result wrapped in `{ kind: 'triage', ...result }`.

The route should pass through whatever the service returns; status-code dispatch happens in the route, not the service.

#### D. Add new Phase 3 tests (in `symptom-checks.service.test.ts`)

1. LLM returns clarify branch on first call → response shape is `{ kind: 'clarify', questions: [...] }`, no SymptomCheck row persisted.
2. Second call with `clarificationAnswers` → LLM is called with `mode: 'continuation'`, returns triage, normal pipeline completes, row persisted.
3. Continuation pre-filter catches red flag that wasn't in the original text (e.g. original: "chest pain"; chip answers add: shortness of breath via ASSOCIATED_SYMPTOMS). Expected: EMERGENCY override.
4. LLM violates contract and returns clarify on continuation → schema rejects → fallback to ROUTINE+GP (the prompt enforces, but defense-in-depth via schema).

#### E. Verify

- Sandbox: `npx tsc --noEmit` must be clean.
- Ask user to run on their host: `cd ~/Documents/TeleCare/backend && npx vitest run src/modules/symptom-checks/`.

#### F. Deliver the Phase 3 plain-English summary

Same four-section format as before. The user is non-technical on AI specifically; explain the **discriminated union / one-round clarification pattern** as a teachable thing. Why server-owned question bank (safety, consistency, no prompt injection)? Why is continuation forbidden from clarifying (UX cap, prevents loops)? Why is it stateless between calls (simplicity, no schema change)?

---

## 7. Things a fresh Sonnet session is likely to miss

- **The schema rename "broke" Phase 2 tests but type-check might still pass** because `triageLlmOutputSchema` is aliased. Runtime Zod validation against the mocks will fail. Test mocks need `kind: 'triage'` added regardless. Run vitest, don't trust tsc alone.
- **Don't add a Prisma migration for this phase.** The clarification flow is stateless between calls — no schema change needed. The patient/FE holds the original `symptomsText` and re-sends it with the answers. The `continuesCheckId` field that's currently in `createSymptomCheckSchema` is unused; either delete it or repurpose it for audit linking — ask the user.
- **`PROMPT_VERSION` change has a side effect:** the `persistence` test asserts `'triage-v1.0'`. Update to `'triage-v2.0'`.
- **The vignette suite uses LLM responses without `kind`.** Same fix — add `kind: 'triage'` everywhere `ok({...})` is called.
- **Don't introduce an LLM call for the EMERGENCY vignettes.** Phase 2's trick: for EMERGENCY vignettes the mock is set to *throw* if called, which proves the deterministic pre-filter is short-circuiting. Preserve this in any new tests.
- **The user prefers minimal formatting** — natural prose, no over-bulleting in conversation. But for technical handoffs and code reviews, structure helps. Read the room.
- **All work is on `feature/symptom-checker-foundation`**. Don't create new branches per phase. Don't commit until the user has reviewed and explicitly said "yes" to a commit (likely at the end of all phases, not after each one).

---

## 8. Resume plan — linear

```
1. Read CLAUDE.md, docs/symptom-checker-plan.md (v2), and this brief.

2. Read the four Phase 3 files already changed:
     backend/src/modules/symptom-checks/symptom-checks.questions.ts
     backend/src/modules/symptom-checks/symptom-checks.schemas.ts
     backend/src/modules/symptom-checks/symptom-checks.prompt.ts
     backend/src/modules/symptom-checks/symptom-checks.llm.ts

3. Update symptom-checks.service.ts to handle the discriminated LLM output
   and the continuation path. Return type becomes a discriminated union.

4. Update the route in symptom-checks/index.ts to pass through the new shape
   (201 on triage, 200 on clarify).

5. Update Phase 2 test mocks: add kind:'triage' to every ok({...}) call;
   update the promptVersion assertion to 'triage-v2.0'.

6. Add 4 new test cases for Phase 3 (clarify branch, continuation happy
   path, continuation red-flag override, contract-violation fallback).

7. Sandbox: npx tsc --noEmit. Must be clean.

8. Ask user to run on their host:
     cd ~/Documents/TeleCare/backend
     npx vitest run src/modules/symptom-checks/

9. After green, deliver the Phase 3 plain-English summary
   (problem before / what built / doesn't protect / auditor pitch).

10. Pause. Wait for the user's "next" before starting Phase 4 (frontend).
```

---

## 9. What comes after Phase 3

Per `docs/symptom-checker-plan.md`:

- **Phase 4 — Frontend.** `/patient/symptom-check` page in Next.js, two-step flow with chip questions, reassurance copy, "Book consultation now" primary CTA. Reuses existing `DoctorCard`. Persistent disclaimer footer on every screen.
- **Phase 5 — Encryption + audit wiring + raw-response purge cron.** Most of this is already wired inline — only the purge cron is genuinely new.
- **Phase 6 — Soft launch.** Tiny 20-vignette safety suite job on PR (LLM mocked); feature-flag rollout; legal sign-off; BAA signed.

### Open questions still to close before Phase 6

1. **Which LLM provider gets the BAA** for production (Anthropic via Bedrock vs Azure OpenAI vs OpenAI direct)? User chose "Anthropic direct" for dev; prod BAA decision is open.
2. **Does the doctor's appointment view show the full SymptomCheck record or just the handoff sentence?** Currently the doctor read-path is gated on a linked appointment but returns the full record. The product call on what UI to show is pending.

---

**End of brief.** The code is in a temporarily-broken-but-recoverable state (Phase 3 partially wired). Fast path is forward, not rollback — finishing items A–F above takes maybe an hour of focused work in a fresh session.
