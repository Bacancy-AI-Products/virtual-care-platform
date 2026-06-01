/**
 * Symptom checker — deterministic safety layers (Stage 1 + Stage 3).
 *
 * These rules are intentionally code, not AI. They run BEFORE the LLM
 * (pre-filter) and AFTER it (post-filter), and they only ever ratchet
 * urgency UP — never down. The list is curated and unit-tested.
 *
 * If a clinician asks to review or modify a rule, point them HERE.
 * Do not bury red-flag logic inside the LLM prompt.
 */

import { AGE_BANDS } from './symptom-checks.schemas';

export type TriageUrgency = 'SELF_CARE' | 'ROUTINE' | 'URGENT' | 'EMERGENCY';

/** Ordered for ratcheting comparisons — higher index = more urgent. */
export const URGENCY_ORDER: readonly TriageUrgency[] = [
    'SELF_CARE',
    'ROUTINE',
    'URGENT',
    'EMERGENCY',
] as const;

/** Return the more severe of two urgency levels. Never lowers. */
export function maxUrgency(a: TriageUrgency, b: TriageUrgency): TriageUrgency {
    return URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b;
}

/**
 * Each red flag is a *named* rule. The name is what we record in the
 * SymptomCheck.redFlags array and in the audit log — so when a clinician
 * asks "why did we flag this as emergency?" we can answer precisely.
 *
 * `matches()` returns true if the text describes the pattern. We avoid
 * making this a single mega-regex so each rule is independently testable
 * and reviewable.
 */
export interface RedFlagRule {
    id: string;
    description: string;
    matches: (text: string) => boolean;
}

/** Helper — case-insensitive whole-phrase match. */
function has(text: string, ...phrases: string[]): boolean {
    return phrases.some((p) => text.includes(p));
}

/** Helper — match a regex on the normalised lowercased text. */
function rx(text: string, re: RegExp): boolean {
    return re.test(text);
}

export const RED_FLAG_RULES: readonly RedFlagRule[] = [
    {
        id: 'CARDIAC_CHEST_PAIN',
        description:
            'Chest pain combined with shortness of breath, sweating, or radiation to arm/jaw — classic ACS pattern.',
        matches: (t) =>
            (has(t, 'chest pain', 'chest pressure', 'chest tightness', 'crushing chest') &&
                has(
                    t,
                    'short of breath',
                    'shortness of breath',
                    "can't breathe",
                    'cannot breathe',
                    'sweating',
                    'sweat',
                    'arm pain',
                    'left arm',
                    'jaw pain',
                    'jaw',
                    'nausea',
                )) ||
            rx(t, /chest pain.*(radiat|spread)/),
    },
    {
        id: 'STROKE_FAST',
        description:
            'Stroke FAST signs — face droop, arm weakness, slurred speech, or sudden severe headache.',
        matches: (t) =>
            has(
                t,
                'face droop',
                'face is drooping',
                'one side of my face',
                'arm weakness',
                'cannot lift my arm',
                "can't lift my arm",
                'slurred speech',
                'speech is slurred',
                'cannot speak',
                "can't speak properly",
            ) ||
            (has(t, 'sudden') &&
                has(t, 'worst headache', 'severe headache', 'thunderclap headache')) ||
            rx(t, /(numb|weak).*(one side|left side|right side)/),
    },
    {
        id: 'ANAPHYLAXIS',
        description: 'Severe allergic reaction — throat / tongue swelling, anaphylaxis.',
        matches: (t) =>
            has(
                t,
                'anaphylaxis',
                'throat swelling',
                'throat is swelling',
                'tongue swelling',
                'tongue is swelling',
                'cannot swallow',
                "can't swallow",
            ) || rx(t, /(allergic|allergy).*(reaction).*(severe|bad|swelling|breathing)/),
    },
    {
        id: 'SUICIDAL_IDEATION',
        description:
            'Suicidal ideation or self-harm statements — emergency + crisis-line escalation.',
        matches: (t) =>
            has(
                t,
                'suicide',
                'suicidal',
                'kill myself',
                'killing myself',
                'want to die',
                'wanna die',
                'no reason to live',
                'self harm',
                'self-harm',
                'cutting myself',
                'hurt myself',
                'end it all',
                'ending it all',
            ) ||
            // Variants of "end/ending/ended/take/taking my (own) life"
            rx(t, /(end(ing|ed)?|take|taking|took)\s+(my|his|her|their)\s+(own\s+)?life/),
    },
    {
        id: 'PREGNANCY_BLEEDING',
        description: 'Pregnancy + heavy bleeding or severe abdominal pain.',
        matches: (t) =>
            has(t, 'pregnant', 'pregnancy') &&
            has(
                t,
                'bleeding',
                'heavy bleeding',
                'gushing',
                'severe abdominal pain',
                'severe pain in stomach',
                'severe cramps',
            ),
    },
    {
        id: 'CHOKING',
        description: 'Choking / cannot breathe.',
        matches: (t) =>
            has(t, 'choking', 'choke', 'something stuck in my throat') ||
            (has(t, 'cannot breathe', "can't breathe", 'unable to breathe') &&
                !has(t, 'when i exercise', 'after running', 'when i walk uphill')),
    },
    {
        id: 'UNCONSCIOUS_UNRESPONSIVE',
        description: 'Describing an unresponsive or unconscious person.',
        matches: (t) =>
            has(
                t,
                'unconscious',
                'unresponsive',
                'not responding',
                'passed out',
                'fainted and not waking',
            ) || rx(t, /(won't|will not|wont) wake up/),
    },
    {
        id: 'SEVERE_HEAD_TRAUMA',
        description:
            'Head trauma combined with vomiting, confusion, or loss of consciousness — possible intracranial injury.',
        matches: (t) =>
            (has(t, 'hit my head', 'head injury', 'banged my head', 'fell on my head') &&
                has(
                    t,
                    'vomit',
                    'throwing up',
                    'confused',
                    'confusion',
                    'cannot remember',
                    "can't remember",
                    'passed out',
                    'blacked out',
                )) ||
            has(t, 'severe head trauma'),
    },
    {
        id: 'UNCONTROLLED_BLEEDING',
        description: "Active heavy bleeding that won't stop.",
        matches: (t) =>
            rx(
                t,
                /(bleeding|blood).*(won['t]? stop|will not stop|cannot stop|can't stop|won't stop|gushing|spurting|profuse)/,
            ) ||
            has(t, 'heavy bleeding', 'bleeding heavily', 'losing a lot of blood', 'spurting blood'),
    },
    {
        id: 'INFANT_HIGH_FEVER',
        description:
            'Infant under 3 months with any fever — always emergency per pediatric guidance.',
        matches: (t) =>
            (has(t, 'baby', 'newborn', 'infant') &&
                rx(t, /(\d+)\s*(week|day|month)s?\s*old/) &&
                has(t, 'fever', 'temperature', 'hot to touch')) ||
            rx(t, /(newborn|infant).*(fever|hot|temperature)/),
    },
] as const;

/**
 * Result of running the Stage 1 pre-filter (and the Stage 3 post-filter,
 * which uses the same matrix).
 */
export interface RedFlagCheckResult {
    /** Names of every rule that matched. Empty array when none. */
    matched: string[];
    /** True if at least one rule matched. */
    fired: boolean;
}

/**
 * Normalise free-text input for matching. We lowercase and collapse whitespace.
 * No stemming, no stop-word removal — patient phrasing is what we match against.
 */
function normalise(input: string): string {
    return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Run every red-flag rule against the input. Returns which (if any) fired.
 * Used by both the pre-filter (Stage 1) and the post-filter (Stage 3).
 */
export function runRedFlagCheck(symptomsText: string): RedFlagCheckResult {
    const normalised = normalise(symptomsText);
    const matched: string[] = [];
    for (const rule of RED_FLAG_RULES) {
        if (rule.matches(normalised)) {
            matched.push(rule.id);
        }
    }
    return { matched, fired: matched.length > 0 };
}

/**
 * Patient-facing copy when the pre-filter fires. Deliberately calm, action-first,
 * no condition-naming. We resolve the actual phone number from the patient's
 * locale in the service layer when available.
 */
export const EMERGENCY_RECOMMENDATION =
    "Based on what you've described, this needs urgent medical attention right away. " +
    'Please call your local emergency services or go to the nearest emergency room now. ' +
    'If you are with someone, ask them to help you.';

/**
 * Patient-facing copy when nothing red-flagged and the LLM is not (yet) available
 * — Phase 1's "deterministic-only" default. Reassuring + action-first.
 */
export const ROUTINE_DEFAULT_RECOMMENDATION =
    "Based on what you've shared, this doesn't look like an emergency. " +
    'A General Physician can take a proper look and help figure out next steps. ' +
    "Let's get you booked.";

/**
 * Doctor-facing handoff sentence for the Phase 1 default path.
 * Phase 2 will replace this with the LLM's structured summary.
 */
export function defaultDoctorHandoff(symptomsText: string): string {
    const summary = symptomsText.slice(0, 200).replace(/\s+/g, ' ').trim();
    return `Patient self-reported: "${summary}". No red-flag patterns detected by the deterministic pre-filter. Routed to GP for triage.`;
}

/**
 * Doctor-facing handoff sentence when the pre-filter fires.
 * Lists which rule(s) matched so the doctor knows the basis.
 */
export function emergencyDoctorHandoff(symptomsText: string, matched: string[]): string {
    const summary = symptomsText.slice(0, 160).replace(/\s+/g, ' ').trim();
    return `EMERGENCY pre-filter triggered: ${matched.join(', ')}. Patient self-reported: "${summary}". Patient was advised to contact emergency services.`;
}

/**
 * Canonical fallback specialty when:
 *   - the LLM picks something we don't recognise (Phase 2+)
 *   - no matching specialists are available
 *   - confidence is otherwise too low to commit to a specialty
 * Slug matches Specialization.id from the seed (general_physician).
 */
export const FALLBACK_SPECIALIZATION_ID = 'general_physician';
export const FALLBACK_SPECIALIZATION_NAME = 'General Physician';

/**
 * Validate that the given age band is one we accept. Used as a defensive
 * check on the boundary between LLM/free-text inputs and our enum.
 */
export function isKnownAgeBand(value: string | null | undefined): boolean {
    if (!value) return false;
    return (AGE_BANDS as readonly string[]).includes(value);
}

// ─── Keyword-based specialty routing (deterministic fallback) ─────────────────

/**
 * Lightweight keyword → specializationId map used when the LLM is unavailable
 * (no API key in dev) or has failed. Rules are checked top-to-bottom; the
 * first match wins. IDs must match Specialization.id values from the seed.
 *
 * Deliberately simple — not a replacement for LLM reasoning. The goal is to
 * route "chest pain" away from GP in a dev/demo environment, not to diagnose.
 */
const KEYWORD_SPECIALTY_RULES: ReadonlyArray<{
    keywords: readonly string[];
    specializationId: string;
}> = [
    {
        keywords: [
            'chest pain',
            'chest pressure',
            'chest tightness',
            'heart',
            'palpitation',
            'irregular heartbeat',
            'cardiac',
        ],
        specializationId: 'cardiologist',
    },
    {
        keywords: [
            'rash',
            'skin',
            'acne',
            'eczema',
            'psoriasis',
            'hives',
            'itching',
            'dermatitis',
            'lesion',
        ],
        specializationId: 'dermatologist',
    },
    {
        keywords: [
            'child',
            'infant',
            'baby',
            'toddler',
            'pediatric',
            'paediatric',
            'newborn',
            'kid',
            'my son',
            'my daughter',
        ],
        specializationId: 'pediatrician',
    },
    {
        keywords: [
            'tooth',
            'teeth',
            'dental',
            'gum',
            'mouth pain',
            'toothache',
            'cavity',
            'jaw pain',
        ],
        specializationId: 'dentist',
    },
    {
        keywords: ['eye', 'vision', 'blurry', 'blurred', 'sight', 'eye pain', 'retina'],
        specializationId: 'ophthalmologist',
    },
    {
        keywords: [
            'bone',
            'joint',
            'knee',
            'hip',
            'fracture',
            'back pain',
            'spine',
            'shoulder',
            'wrist',
            'ankle',
            'sports injury',
            'ligament',
        ],
        specializationId: 'orthopedic_doctor',
    },
    {
        keywords: [
            'stomach',
            'abdomen',
            'abdominal',
            'digest',
            'nausea',
            'vomiting',
            'bowel',
            'constipation',
            'diarrhea',
            'bloating',
            'ibs',
            'gastric',
        ],
        specializationId: 'gastroenterologist',
    },
    {
        keywords: [
            'lung',
            'breathing',
            'wheeze',
            'wheezing',
            'asthma',
            'copd',
            'shortness of breath',
            'coughing blood',
            'bronch',
        ],
        specializationId: 'pulmonologist',
    },
    {
        keywords: [
            'headache',
            'migraine',
            'seizure',
            'memory loss',
            'dizziness',
            'vertigo',
            'numbness',
            'tingling',
            'nerve',
            'stroke',
            'tremor',
        ],
        specializationId: 'neurologist',
    },
    {
        keywords: [
            'anxiety',
            'depression',
            'mental health',
            'panic attack',
            'mood',
            'suicidal',
            'hallucin',
            'psychosis',
            'bipolar',
        ],
        specializationId: 'psychiatrist',
    },
    {
        keywords: [
            'diabetes',
            'blood sugar',
            'insulin',
            'diabetic',
            'glucose',
            'hyperglycemia',
            'hypoglycemia',
        ],
        specializationId: 'diabetologist',
    },
    {
        keywords: ['thyroid', 'hormone', 'endocrine', 'adrenal', 'pituitary'],
        specializationId: 'endocrinologist',
    },
    {
        keywords: [
            'ear',
            'nose',
            'throat',
            'sinus',
            'sinusitis',
            'hearing',
            'tonsil',
            'nasal',
            'ent',
            'otitis',
        ],
        specializationId: 'ent_specialist',
    },
    {
        keywords: ['kidney', 'renal', 'nephro', 'creatinine', 'dialysis'],
        specializationId: 'nephrologist',
    },
    {
        keywords: ['bladder', 'prostate', 'urinary', 'urine', 'urolog', 'kidney stone'],
        specializationId: 'urologist',
    },
    {
        keywords: [
            'pregnant',
            'pregnancy',
            'gynecol',
            'menstrual',
            'period',
            'fertility',
            'obstetric',
            'vaginal',
            'ovarian',
            'uterus',
            'ovary',
        ],
        specializationId: 'gynecologist_obstetrician',
    },
    {
        keywords: ['oncol', 'cancer', 'tumor', 'tumour', 'chemotherapy', 'lymphoma', 'leukemia'],
        specializationId: 'oncologist',
    },
] as const;

/**
 * Return the best-guess specializationId from free-form symptom text.
 * Falls back to FALLBACK_SPECIALIZATION_ID when no rule matches.
 *
 * Used only in the deterministic path (LLM unavailable/failed) to avoid
 * routing every non-emergency case to General Physician.
 */
export function guessSpecializationFromText(text: string): string {
    const lower = text.toLowerCase();
    for (const rule of KEYWORD_SPECIALTY_RULES) {
        if (rule.keywords.some((k) => lower.includes(k))) {
            return rule.specializationId;
        }
    }
    return FALLBACK_SPECIALIZATION_ID;
}
