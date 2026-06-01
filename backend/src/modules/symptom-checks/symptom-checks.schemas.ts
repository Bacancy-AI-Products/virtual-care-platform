import { z } from 'zod';
import { config } from '../../config';

const uuidSchema = z.string().uuid('Invalid symptom check ID format');

// ─── LLM output contract ─────────────────────────────────────────────────────

import { CLARIFY_QUESTION_IDS } from './symptom-checks.questions';

/**
 * The "triage" branch — final decision returned by the LLM. Used on a
 * single-pass call OR on a continuation (after clarifying chip answers).
 *
 * `specialization` is a free string because the LLM may produce slight
 * variations on the canonical name. The post-filter maps it to a known
 * Specialization.id or falls back to General Physician.
 */
export const triageLlmTriageBranch = z.object({
    kind: z.literal('triage'),
    urgency: z.enum(['SELF_CARE', 'ROUTINE', 'URGENT', 'EMERGENCY']),
    specialization: z.string().min(1).max(200),
    recommendation: z.string().min(20).max(500),
    doctorHandoffSummary: z.string().min(20).max(280),
    redFlags: z.array(z.string().min(1).max(80)).max(10).default([]),
});

/**
 * The "clarify" branch — LLM may return this on its FIRST call only.
 * It picks up to 3 question IDs from a fixed enum; the server resolves them
 * to the actual prompts/options from CLARIFY_QUESTION_BANK.
 */
export const triageLlmClarifyBranch = z.object({
    kind: z.literal('clarify'),
    questionIds: z.array(z.enum(CLARIFY_QUESTION_IDS)).min(1).max(3),
});

/** Discriminated union — the LLM returns exactly one branch. */
export const llmOutputSchema = z.discriminatedUnion('kind', [
    triageLlmTriageBranch,
    triageLlmClarifyBranch,
]);

/**
 * Triage-only schema used on continuation calls — clarify branch is rejected.
 */
export const llmContinuationOutputSchema = triageLlmTriageBranch;

export type TriageLlmOutput = z.infer<typeof triageLlmTriageBranch>;
export type ClarifyLlmOutput = z.infer<typeof triageLlmClarifyBranch>;
export type LlmOutput = z.infer<typeof llmOutputSchema>;

/**
 * Back-compat — older tests / code paths import triageLlmOutputSchema and
 * expect a flat triage object. Keep this alias so we don't break callers
 * while we migrate.
 */
export const triageLlmOutputSchema = triageLlmTriageBranch;

/**
 * Banded age range. We deliberately do NOT collect exact DOB here — the LLM
 * only needs a coarse band to triage, and HIPAA minimum-necessary
 * (§164.502(b)) says we should send the least amount of identifying info.
 */
export const AGE_BANDS = ['<18', '18-29', '30-44', '45-59', '60-74', '75+'] as const;
export const ageBandSchema = z.enum(AGE_BANDS);

/**
 * Body for POST /api/v1/symptom-checks.
 * The `continuesCheckId` + `clarificationAnswers` pair is reserved for the
 * one-round clarification turn (Phase 3). Phase 1 only handles the
 * first-call shape.
 */
export const createSymptomCheckSchema = z.object({
    symptomsText: z
        .string()
        .min(10, 'Please describe your symptoms in more detail (at least 10 characters).')
        .max(2000, 'Symptom description must be 2000 characters or fewer.'),
    ageBand: ageBandSchema.optional(),
    sex: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    // Reserved for Phase 3 (one-round clarification).
    continuesCheckId: z.string().uuid().optional(),
    clarificationAnswers: z
        .array(
            z.object({
                questionId: z.string().min(1).max(40),
                answer: z.string().max(120),
            }),
        )
        .max(3)
        .optional(),
});

export type CreateSymptomCheckInput = z.infer<typeof createSymptomCheckSchema>;

export const symptomCheckIdParamSchema = z.object({
    id: uuidSchema,
});

export const listSymptomChecksQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(config.pagination.maxLimit)
        .default(config.pagination.defaultLimit),
});
