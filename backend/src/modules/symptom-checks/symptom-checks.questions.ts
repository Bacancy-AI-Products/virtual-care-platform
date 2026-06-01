/**
 * Symptom checker — clarifying question bank (Phase 3).
 *
 * One-round clarification turn: when the LLM is uncertain on its first pass,
 * it may return up to THREE question IDs from this fixed enum. The server then
 * looks up the patient-facing prompt and chip options here and returns them.
 *
 * Why a server-owned bank instead of letting the LLM author the question text:
 *   1. Safety — patient never sees free-text from the LLM mid-flow.
 *   2. Consistency — chip options are stable, so analytics + telemetry work.
 *   3. Prompt-injection — the LLM cannot smuggle instructions into the question.
 *   4. The LLM picks the ID; the wording is ours.
 *
 * To add a new question:
 *   1. Add the ID to `CLARIFY_QUESTION_IDS`.
 *   2. Add an entry to `CLARIFY_QUESTION_BANK` below.
 *   3. Add the ID to the enum hint in the system prompt.
 *   4. Add a unit-test that the formatter renders it correctly.
 */

export const CLARIFY_QUESTION_IDS = [
    'DURATION',
    'SEVERITY',
    'FEVER',
    'PROGRESSION',
    'LOCATION',
    'RADIATION',
    'TRIGGERS',
    'ASSOCIATED_SYMPTOMS',
] as const;

export type ClarifyQuestionId = (typeof CLARIFY_QUESTION_IDS)[number];

export interface ClarifyQuestion {
    /** Stable identifier — what the LLM picks. */
    id: ClarifyQuestionId;
    /** Plain-English question shown to the patient. */
    prompt: string;
    /** Chip-style answer options. Patient can pick exactly one OR skip. */
    options: readonly string[];
}

export const CLARIFY_QUESTION_BANK: Record<ClarifyQuestionId, ClarifyQuestion> = {
    DURATION: {
        id: 'DURATION',
        prompt: 'How long has this been going on?',
        options: ['Less than 24 hours', '1–3 days', '4–7 days', '1–4 weeks', 'More than a month'],
    },
    SEVERITY: {
        id: 'SEVERITY',
        prompt: 'How severe does it feel?',
        options: [
            'Mild — annoying but I can carry on',
            'Moderate — affecting my day',
            'Severe — hard to function',
            'Worst I’ve ever had',
        ],
    },
    FEVER: {
        id: 'FEVER',
        prompt: 'Do you have a fever?',
        options: ['No', 'Mild (around 37.5–38°C)', 'High (38°C+)', 'I’m not sure'],
    },
    PROGRESSION: {
        id: 'PROGRESSION',
        prompt: 'Is it getting better, the same, or worse?',
        options: ['Getting better', 'About the same', 'Getting worse', 'Comes and goes'],
    },
    LOCATION: {
        id: 'LOCATION',
        prompt: 'Where exactly do you feel it?',
        options: [
            'Head / face',
            'Throat / neck',
            'Chest',
            'Abdomen / stomach',
            'Back',
            'Arms or legs',
            'Somewhere else',
        ],
    },
    RADIATION: {
        id: 'RADIATION',
        prompt: 'Does the pain or feeling spread anywhere?',
        options: [
            'No, stays in one place',
            'To my arm or jaw',
            'To my back',
            'Down my legs',
            'Elsewhere',
        ],
    },
    TRIGGERS: {
        id: 'TRIGGERS',
        prompt: 'Does anything make it noticeably worse or better?',
        options: [
            'Movement or activity',
            'Eating or drinking',
            'Stress / emotions',
            'Lying down',
            'Nothing in particular',
        ],
    },
    ASSOCIATED_SYMPTOMS: {
        id: 'ASSOCIATED_SYMPTOMS',
        prompt: 'Are any of these also happening?',
        options: [
            'Nausea or vomiting',
            'Dizziness or fainting',
            'Shortness of breath',
            'Sweating',
            'None of these',
        ],
    },
};

/**
 * Resolve a list of question IDs into the full ClarifyQuestion[] the FE
 * needs to render the chip step.
 */
export function resolveClarifyQuestions(ids: readonly ClarifyQuestionId[]): ClarifyQuestion[] {
    return ids.map((id) => CLARIFY_QUESTION_BANK[id]);
}

/**
 * Format the patient's chip answers into a short narrative the LLM can read on
 * its second (continuation) call. The original symptom text is prepended;
 * the Q&A pairs are appended in a consistent, parseable shape.
 *
 *   "I have chest pain.
 *
 *    Follow-up answers:
 *    - How long has this been going on? Less than 24 hours
 *    - Is it getting better, the same, or worse? Getting worse"
 */
export function buildContinuationText(
    symptomsText: string,
    answers: readonly { questionId: string; answer: string }[],
): string {
    if (answers.length === 0) return symptomsText;
    const lines = answers.map((a) => {
        const known = (CLARIFY_QUESTION_BANK as Record<string, ClarifyQuestion | undefined>)[
            a.questionId
        ];
        const prompt = known?.prompt ?? `Follow-up (${a.questionId})`;
        return `- ${prompt} ${a.answer}`;
    });
    return `${symptomsText}\n\nFollow-up answers:\n${lines.join('\n')}`;
}
