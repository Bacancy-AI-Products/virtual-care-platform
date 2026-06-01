import { request } from './client';

// ─── Shared types ─────────────────────────────────────────────────────────────

export const AGE_BANDS = ['<18', '18-29', '30-44', '45-59', '60-74', '75+'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export type Sex = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface ClarifyQuestion {
    /** Stable ID — matches the server-side CLARIFY_QUESTION_IDS enum. */
    id: string;
    /** Patient-facing prompt text. */
    prompt: string;
    /** Chip-style answer options. */
    options: string[];
}

export interface SuggestedDoctor {
    id: string;
    name: string;
    specialization: string;
    city: string | null;
    state: string | null;
    consultationFee: string | number | null;
    verified: boolean;
    averageRating: number | null;
    reviewCount: number;
}

export type TriageUrgency = 'SELF_CARE' | 'ROUTINE' | 'URGENT' | 'EMERGENCY';

// ─── Response discriminated union ────────────────────────────────────────────

export interface ClarifyResponse {
    kind: 'clarify';
    questions: ClarifyQuestion[];
}

export interface TriageResponse {
    kind: 'triage';
    id: string;
    patientId: string;
    urgency: TriageUrgency;
    specializationId: string | null;
    recommendation: string;
    doctorHandoffSummary: string;
    redFlags: string[];
    ageBand: string | null;
    sex: string | null;
    modelVersion: string;
    promptVersion: string;
    createdAt: string;
    suggestedDoctors: SuggestedDoctor[];
}

export type SymptomCheckResponse = ClarifyResponse | TriageResponse;

// ─── Request ──────────────────────────────────────────────────────────────────

export interface CreateSymptomCheckInput {
    symptomsText: string;
    ageBand?: AgeBand;
    sex?: Sex;
    clarificationAnswers?: { questionId: string; answer: string }[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const symptomChecksApi = {
    create: (data: CreateSymptomCheckInput) =>
        request<SymptomCheckResponse>('/symptom-checks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};
