/**
 * Symptom checker — orchestration service (Phase 2: LLM single-pass).
 *
 * Pipeline (matches docs/symptom-checker-plan.md §4):
 *   STAGE 1 — Deterministic pre-filter (red-flag regex). Fires? Skip LLM.
 *   STAGE 2 — LLM call (constrained JSON output). Null on any failure.
 *   STAGE 3 — Deterministic post-filter:
 *               re-run red-flag regex, ratchet urgency UP if needed
 *               map LLM specialty name → Specialization.id (fallback to GP)
 *   STAGE 4 — Doctor matching with GP fallback.
 *   STAGE 5 — Persist (PHI encrypted, raw response auto-purges at +30 days)
 *               + audit log.
 *
 * When the LLM is disabled (no API key) the service degrades to the Phase 1
 * deterministic behaviour — safe but dumb: ROUTINE + General Physician for
 * anything the red-flag rules don't catch.
 */

import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeEncrypt, maybeDecrypt } from '../../utils/crypto';
import { config } from '../../config';
import { logAccess, AuditAction } from '../audit/audit.service';
import type { Prisma, Gender, TriageUrgency } from '../../../generated/prisma';
import {
    runRedFlagCheck,
    maxUrgency,
    EMERGENCY_RECOMMENDATION,
    ROUTINE_DEFAULT_RECOMMENDATION,
    defaultDoctorHandoff,
    emergencyDoctorHandoff,
    FALLBACK_SPECIALIZATION_ID,
    guessSpecializationFromText,
} from './symptom-checks.guardrails';
import type { CreateSymptomCheckInput, TriageLlmOutput } from './symptom-checks.schemas';
import { callTriageLLM } from './symptom-checks.llm';
import {
    resolveClarifyQuestions,
    buildContinuationText,
    type ClarifyQuestion,
} from './symptom-checks.questions';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Provenance tags used when the LLM is not consulted (deterministic-only path). */
const MODEL_VERSION_DETERMINISTIC = 'deterministic-1.0';
const PROMPT_VERSION_DETERMINISTIC = 'none-1.0';

/** Max doctors to suggest per check. */
const MAX_SUGGESTED_DOCTORS = 5;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SuggestedDoctor {
    id: string;
    name: string;
    specialization: string;
    city: string | null;
    state: string | null;
    consultationFee: Prisma.Decimal | null;
    verified: boolean;
    averageRating: number | null;
    reviewCount: number;
}

export interface SymptomCheckResult {
    id: string;
    patientId: string;
    urgency: TriageUrgency;
    specializationId: string | null;
    recommendation: string;
    doctorHandoffSummary: string;
    redFlags: string[];
    ageBand: string | null;
    sex: Gender | null;
    modelVersion: string;
    promptVersion: string;
    createdAt: Date;
    suggestedDoctors: SuggestedDoctor[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getPatientId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { patient: { select: { id: true } } },
    });
    const patientId = user?.patient?.id;
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }
    return patientId;
}

/**
 * Fetch the canonical Specialization roster. Used to inject into the LLM
 * prompt (so the model can only pick from valid choices) and to resolve the
 * LLM's returned name back to an id.
 */
async function getSpecializations(): Promise<{ id: string; name: string }[]> {
    return prisma.specialization.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    });
}

/**
 * Map an LLM-returned specialty name to a Specialization.id. Case-insensitive
 * exact match, then a permissive contains match as a safety net. Returns null
 * when no match — caller falls back to general_physician.
 */
function resolveSpecializationId(
    pickedName: string,
    roster: { id: string; name: string }[],
): string | null {
    const wanted = pickedName.trim().toLowerCase();
    if (!wanted) return null;
    const exact = roster.find((s) => s.name.toLowerCase() === wanted);
    if (exact) return exact.id;
    const contains = roster.find((s) => s.name.toLowerCase().includes(wanted));
    return contains?.id ?? null;
}

/** Compute when rawLlmResponse should be auto-purged (Phase 5 cron). */
function purgeAtFromTtl(): Date {
    const ms = config.symptomChecker.rawResponseTtlDays * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
}

/**
 * Doctor matching — Phase 1 keeps this deliberately simple:
 *   - filter by specialization slug + verified + isActive
 *   - rank by averageRating desc, then by consultationCount desc
 *   - fall back to General Physician when the requested specialty has 0 hits
 *
 * Phase 2 leaves this unchanged (matching is independent of how urgency was
 * decided). Phase 3+ may add availability windows and locale.
 */
async function findMatchingDoctors(specializationId: string): Promise<SuggestedDoctor[]> {
    const candidates = await prisma.doctorProfile.findMany({
        where: {
            specialization: specializationId,
            verified: true,
            isActive: true,
        },
        select: {
            id: true,
            specialization: true,
            consultationFee: true,
            verified: true,
            city: true,
            state: true,
            user: { select: { name: true } },
            reviews: { select: { rating: true } },
            appointments: { where: { status: 'COMPLETED' }, select: { id: true } },
        },
        take: 50, // wide net before scoring
    });

    const scored = candidates.map((d) => {
        const reviewCount = d.reviews.length;
        const averageRating =
            reviewCount === 0
                ? null
                : d.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
        const consultationCount = d.appointments.length;
        return { d, averageRating, reviewCount, consultationCount };
    });

    scored.sort((a, b) => {
        const ar = a.averageRating ?? 0;
        const br = b.averageRating ?? 0;
        if (br !== ar) return br - ar;
        return b.consultationCount - a.consultationCount;
    });

    return scored.slice(0, MAX_SUGGESTED_DOCTORS).map(({ d, averageRating, reviewCount }) => ({
        id: d.id,
        name: d.user.name,
        specialization: d.specialization,
        city: d.city,
        state: d.state,
        consultationFee: d.consultationFee,
        verified: d.verified,
        averageRating,
        reviewCount,
    }));
}

/**
 * If the requested specialty has 0 matching doctors, fall back to General
 * Physician. Returns the (possibly-rewritten) specializationId we ended up
 * matching against, and the doctor list.
 */
async function matchWithFallback(
    requestedSpecializationId: string,
): Promise<{ specializationId: string; doctors: SuggestedDoctor[] }> {
    let doctors = await findMatchingDoctors(requestedSpecializationId);
    if (doctors.length > 0) {
        console.log(
            `[symptom-checks] matched ${doctors.length} doctor(s) for specialty "${requestedSpecializationId}"`,
        );
        return { specializationId: requestedSpecializationId, doctors };
    }
    if (requestedSpecializationId === FALLBACK_SPECIALIZATION_ID) {
        console.warn(
            `[symptom-checks] no verified doctors found for "${requestedSpecializationId}" (fallback exhausted)`,
        );
        return { specializationId: requestedSpecializationId, doctors: [] };
    }
    console.warn(
        `[symptom-checks] no verified doctors for "${requestedSpecializationId}", falling back to general_physician`,
    );
    doctors = await findMatchingDoctors(FALLBACK_SPECIALIZATION_ID);
    return { specializationId: FALLBACK_SPECIALIZATION_ID, doctors };
}

// ─── Pipeline composition ────────────────────────────────────────────────────

/**
 * Internal: compose the decided fields from a deterministic-only path
 * (red-flag fired OR LLM disabled/failed).
 */
function deterministicOutcome(args: {
    symptomsText: string;
    redFlagResult: ReturnType<typeof runRedFlagCheck>;
}): {
    urgency: TriageUrgency;
    recommendation: string;
    doctorHandoffSummary: string;
    targetSpecializationId: string;
    redFlags: string[];
    modelVersion: string;
    promptVersion: string;
} {
    if (args.redFlagResult.fired) {
        return {
            urgency: 'EMERGENCY',
            recommendation: EMERGENCY_RECOMMENDATION,
            doctorHandoffSummary: emergencyDoctorHandoff(
                args.symptomsText,
                args.redFlagResult.matched,
            ),
            targetSpecializationId: FALLBACK_SPECIALIZATION_ID,
            redFlags: args.redFlagResult.matched,
            modelVersion: MODEL_VERSION_DETERMINISTIC,
            promptVersion: PROMPT_VERSION_DETERMINISTIC,
        };
    }
    // Keyword routing: try to pick a relevant specialty even without LLM.
    // Falls back to general_physician when no keyword rule matches.
    const targetSpecializationId = guessSpecializationFromText(args.symptomsText);
    return {
        urgency: 'ROUTINE',
        recommendation: ROUTINE_DEFAULT_RECOMMENDATION,
        doctorHandoffSummary: defaultDoctorHandoff(args.symptomsText),
        targetSpecializationId,
        redFlags: [],
        modelVersion: MODEL_VERSION_DETERMINISTIC,
        promptVersion: PROMPT_VERSION_DETERMINISTIC,
    };
}

/**
 * Internal: apply the Stage 3 post-filter to an LLM result. Returns the
 * cleaned-up triage decision; never lowers urgency.
 */
function applyPostFilter(args: {
    llmOutput: TriageLlmOutput;
    symptomsText: string;
    roster: { id: string; name: string }[];
}): {
    urgency: TriageUrgency;
    recommendation: string;
    doctorHandoffSummary: string;
    targetSpecializationId: string;
    redFlags: string[];
    underTriaged: boolean;
} {
    // Re-run the deterministic red-flag check against the input. This is the
    // defence-in-depth that catches LLM under-triage.
    const recheck = runRedFlagCheck(args.symptomsText);
    const recheckUrgency: TriageUrgency = recheck.fired ? 'EMERGENCY' : args.llmOutput.urgency;
    const finalUrgency = maxUrgency(args.llmOutput.urgency, recheckUrgency);
    const underTriaged = finalUrgency !== args.llmOutput.urgency;

    // Map specialty name → id. Falls back to General Physician on unknown.
    const resolvedSpecId =
        resolveSpecializationId(args.llmOutput.specialization, args.roster) ??
        FALLBACK_SPECIALIZATION_ID;

    // If we ratcheted to EMERGENCY, override the LLM's gentler copy with the
    // fixed emergency wording so the patient never sees a calm message under
    // a missed red flag.
    const recommendation = underTriaged ? EMERGENCY_RECOMMENDATION : args.llmOutput.recommendation;
    const doctorHandoffSummary = underTriaged
        ? emergencyDoctorHandoff(args.symptomsText, recheck.matched)
        : args.llmOutput.doctorHandoffSummary;

    // Combine the LLM-noted red flags with anything our regex spotted (deduped).
    const redFlagSet = new Set<string>([...args.llmOutput.redFlags, ...recheck.matched]);
    return {
        urgency: finalUrgency,
        recommendation,
        doctorHandoffSummary,
        targetSpecializationId: resolvedSpecId,
        redFlags: [...redFlagSet],
        underTriaged,
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a symptom check and return the triage result + suggested doctors,
 * OR a clarify response (Phase 3: one-round clarification).
 *
 * Return type is a discriminated union:
 *   { kind: 'triage', ...SymptomCheckResult }  — persisted, full result
 *   { kind: 'clarify', questions: ClarifyQuestion[] } — stateless, no DB row
 */
export async function createSymptomCheck(
    userId: string,
    input: CreateSymptomCheckInput,
): Promise<
    ({ kind: 'triage' } & SymptomCheckResult) | { kind: 'clarify'; questions: ClarifyQuestion[] }
> {
    if (!config.symptomChecker.enabled) {
        throw new AppError(
            'The symptom checker is currently unavailable.',
            503,
            'FEATURE_DISABLED',
        );
    }

    const patientId = await getPatientId(userId);

    // Detect whether this is a continuation (patient answered chip questions).
    const isContinuation = (input.clarificationAnswers?.length ?? 0) > 0;

    // For continuation: merge original symptoms + Q&A answers before filtering/LLM.
    // The continuation text is what the pre-filter and LLM both see; the original
    // symptomsText is still what we persist (stateless between calls).
    const textToProcess = isContinuation
        ? buildContinuationText(input.symptomsText, input.clarificationAnswers!)
        : input.symptomsText;

    // Stage 1 — deterministic pre-filter on the (possibly merged) text.
    // Running on the merged text lets us catch red flags that appear only in
    // chip answers (e.g. "chest pain" original + "shortness of breath" chip).
    const preFilter = runRedFlagCheck(textToProcess);

    let decided: {
        urgency: TriageUrgency;
        recommendation: string;
        doctorHandoffSummary: string;
        targetSpecializationId: string;
        redFlags: string[];
        modelVersion: string;
        promptVersion: string;
    };
    let rawLlmResponse: string | null = null;

    if (preFilter.fired) {
        // Emergency short-circuit — never call the LLM for confirmed red flags.
        decided = deterministicOutcome({ symptomsText: textToProcess, redFlagResult: preFilter });
        void logAccess({
            userId,
            action: AuditAction.SYMPTOM_CHECK_RED_FLAG_FIRED,
            resourceType: 'SymptomCheck',
            success: true,
            metadata: { matched: preFilter.matched },
        });
    } else {
        // Stage 2 — call the LLM. Returns null on any expected failure.
        const roster = await getSpecializations();
        const llmResult = await callTriageLLM({
            symptomsText: textToProcess,
            ageBand: input.ageBand,
            sex: input.sex,
            specializationNames: roster.map((r) => r.name),
            mode: isContinuation ? 'continuation' : 'initial',
        });

        if (llmResult.output !== null) {
            if (llmResult.output.kind === 'clarify') {
                // Clarify branch — stateless, no DB persist. Return resolved
                // questions to the FE; the patient/FE holds the original text
                // and re-sends it with chip answers on the next call.
                const questions = resolveClarifyQuestions(llmResult.output.questionIds);
                return { kind: 'clarify', questions };
            }

            // Triage branch — Stage 3 post-filter.
            const post = applyPostFilter({
                llmOutput: llmResult.output,
                symptomsText: textToProcess,
                roster,
            });
            decided = {
                urgency: post.urgency,
                recommendation: post.recommendation,
                doctorHandoffSummary: post.doctorHandoffSummary,
                targetSpecializationId: post.targetSpecializationId,
                redFlags: post.redFlags,
                modelVersion: llmResult.modelVersion,
                promptVersion: llmResult.promptVersion,
            };
            rawLlmResponse = llmResult.rawResponse;

            if (post.underTriaged) {
                void logAccess({
                    userId,
                    action: AuditAction.SYMPTOM_CHECK_LLM_UNDER_TRIAGE,
                    resourceType: 'SymptomCheck',
                    success: true,
                    metadata: {
                        llmUrgency: llmResult.output.urgency,
                        finalUrgency: post.urgency,
                        matched: post.redFlags,
                    },
                });
            }
        } else {
            // LLM disabled / failed — fall back to deterministic ROUTINE + GP.
            decided = deterministicOutcome({
                symptomsText: textToProcess,
                redFlagResult: preFilter,
            });
            rawLlmResponse = llmResult.rawResponse; // may still be non-null on schema failure
            if (llmResult.failureReason && llmResult.failureReason !== 'DISABLED') {
                console.warn(
                    `[symptom-checks] LLM call failed (${llmResult.failureReason}); using deterministic fallback`,
                );
            }
        }
    }

    // Stage 4 — doctor matching.
    const { specializationId: matchedSpecializationId, doctors } = await matchWithFallback(
        decided.targetSpecializationId,
    );

    // Stage 5 — persist. Store original symptomsText (not the merged continuation
    // text) so the patient record reflects what they actually typed.
    const created = await prisma.symptomCheck.create({
        data: {
            patientId,
            symptomsText: maybeEncrypt(input.symptomsText) ?? input.symptomsText,
            ageBand: input.ageBand ?? null,
            sex: input.sex ?? null,
            urgency: decided.urgency,
            specializationId: matchedSpecializationId,
            recommendation: maybeEncrypt(decided.recommendation) ?? decided.recommendation,
            doctorHandoffSummary:
                maybeEncrypt(decided.doctorHandoffSummary) ?? decided.doctorHandoffSummary,
            redFlags: decided.redFlags,
            modelVersion: decided.modelVersion,
            promptVersion: decided.promptVersion,
            rawLlmResponse: rawLlmResponse
                ? (maybeEncrypt(rawLlmResponse) ?? rawLlmResponse)
                : null,
            rawResponsePurgeAt: rawLlmResponse ? purgeAtFromTtl() : null,
        },
        select: {
            id: true,
            patientId: true,
            urgency: true,
            specializationId: true,
            redFlags: true,
            ageBand: true,
            sex: true,
            modelVersion: true,
            promptVersion: true,
            createdAt: true,
        },
    });

    return {
        kind: 'triage',
        id: created.id,
        patientId: created.patientId,
        urgency: created.urgency,
        specializationId: created.specializationId,
        // Plaintext from memory — avoids a pointless encrypt → decrypt round-trip.
        recommendation: decided.recommendation,
        doctorHandoffSummary: decided.doctorHandoffSummary,
        redFlags: created.redFlags,
        ageBand: created.ageBand,
        sex: created.sex,
        modelVersion: created.modelVersion,
        promptVersion: created.promptVersion,
        createdAt: created.createdAt,
        suggestedDoctors: doctors,
    };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

const symptomCheckSelect = {
    id: true,
    patientId: true,
    symptomsText: true,
    ageBand: true,
    sex: true,
    urgency: true,
    specializationId: true,
    recommendation: true,
    doctorHandoffSummary: true,
    redFlags: true,
    modelVersion: true,
    promptVersion: true,
    resultingAppointmentId: true,
    createdAt: true,
} as const;

type SymptomCheckRow = Prisma.SymptomCheckGetPayload<{ select: typeof symptomCheckSelect }>;

/** Decrypt PHI fields before returning to the caller. */
function decryptSymptomCheck(row: SymptomCheckRow) {
    return {
        ...row,
        symptomsText: maybeDecrypt(row.symptomsText) ?? row.symptomsText,
        recommendation: maybeDecrypt(row.recommendation) ?? row.recommendation,
        doctorHandoffSummary: maybeDecrypt(row.doctorHandoffSummary) ?? row.doctorHandoffSummary,
    };
}

/**
 * Fetch one symptom check by id.
 * - Patient: must own the check.
 * - Doctor: only when the check is linked to one of their appointments.
 * - Admin: full access.
 */
export async function getSymptomCheck(id: string, userId: string, role: string) {
    const row = await prisma.symptomCheck.findUnique({
        where: { id },
        select: { ...symptomCheckSelect, resultingAppointment: { select: { doctorId: true } } },
    });
    if (!row) throw new AppError('Symptom check not found', 404, 'NOT_FOUND');

    if (role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!patient || row.patientId !== patient.id) {
            throw new AppError('Symptom check not found', 404, 'NOT_FOUND');
        }
    } else if (role === 'DOCTOR') {
        const doctor = await prisma.doctorProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        const linkedDoctorId = row.resultingAppointment?.doctorId ?? null;
        if (!doctor || linkedDoctorId !== doctor.id) {
            throw new AppError('Symptom check not found', 404, 'NOT_FOUND');
        }
    }
    // ADMIN falls through.

    const { resultingAppointment, ...selectFields } = row;
    void resultingAppointment;
    return decryptSymptomCheck(selectFields);
}

/**
 * List the calling patient's own symptom checks, newest first.
 */
export async function listMySymptomChecks(userId: string, params: { page: number; limit: number }) {
    const patientId = await getPatientId(userId);
    const { page, limit } = params;

    const [rows, total] = await Promise.all([
        prisma.symptomCheck.findMany({
            where: { patientId },
            select: symptomCheckSelect,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.symptomCheck.count({ where: { patientId } }),
    ]);

    return {
        data: rows.map(decryptSymptomCheck),
        total,
        page,
        limit,
    };
}
