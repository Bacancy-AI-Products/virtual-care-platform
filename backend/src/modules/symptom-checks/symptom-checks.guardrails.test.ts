/**
 * Pure-logic unit tests for the deterministic red-flag matrix.
 * No DB, no fixtures — just inputs in, outputs out.
 *
 * These tests are the safety net for prompt/regex edits: every red-flag
 * rule has at least one *positive* example that MUST fire, and at least
 * one *negative* example that MUST NOT.
 */
import { describe, expect, it } from 'vitest';
import {
    EMERGENCY_RECOMMENDATION,
    FALLBACK_SPECIALIZATION_ID,
    FALLBACK_SPECIALIZATION_NAME,
    ROUTINE_DEFAULT_RECOMMENDATION,
    URGENCY_ORDER,
    defaultDoctorHandoff,
    emergencyDoctorHandoff,
    isKnownAgeBand,
    maxUrgency,
    runRedFlagCheck,
} from './symptom-checks.guardrails';

// ─── maxUrgency ──────────────────────────────────────────────────────────────

describe('maxUrgency', () => {
    it('never lowers urgency', () => {
        expect(maxUrgency('SELF_CARE', 'EMERGENCY')).toBe('EMERGENCY');
        expect(maxUrgency('EMERGENCY', 'SELF_CARE')).toBe('EMERGENCY');
        expect(maxUrgency('URGENT', 'ROUTINE')).toBe('URGENT');
        expect(maxUrgency('ROUTINE', 'URGENT')).toBe('URGENT');
    });

    it('returns same urgency when both equal', () => {
        expect(maxUrgency('ROUTINE', 'ROUTINE')).toBe('ROUTINE');
    });

    it('orders the enum from least to most severe', () => {
        expect(URGENCY_ORDER).toEqual(['SELF_CARE', 'ROUTINE', 'URGENT', 'EMERGENCY']);
    });
});

// ─── red-flag matrix — positive + negative cases per rule ────────────────────

describe('runRedFlagCheck — positive cases (each rule MUST fire)', () => {
    it('CARDIAC_CHEST_PAIN — chest pain + shortness of breath', () => {
        const r = runRedFlagCheck(
            'I have severe chest pain and shortness of breath since this morning',
        );
        expect(r.fired).toBe(true);
        expect(r.matched).toContain('CARDIAC_CHEST_PAIN');
    });

    it('CARDIAC_CHEST_PAIN — chest pain radiating to arm', () => {
        const r = runRedFlagCheck('chest pain radiating to my left arm and jaw');
        expect(r.matched).toContain('CARDIAC_CHEST_PAIN');
    });

    it('STROKE_FAST — face droop + arm weakness', () => {
        const r = runRedFlagCheck('My face is drooping and I cannot lift my arm');
        expect(r.matched).toContain('STROKE_FAST');
    });

    it('STROKE_FAST — sudden severe headache', () => {
        const r = runRedFlagCheck('sudden worst headache of my life, comes out of nowhere');
        expect(r.matched).toContain('STROKE_FAST');
    });

    it('STROKE_FAST — numbness on one side', () => {
        const r = runRedFlagCheck('I feel numb on the left side of my body');
        expect(r.matched).toContain('STROKE_FAST');
    });

    it('ANAPHYLAXIS — throat swelling', () => {
        const r = runRedFlagCheck('my throat is swelling and I cannot swallow');
        expect(r.matched).toContain('ANAPHYLAXIS');
    });

    it('SUICIDAL_IDEATION — multiple phrasings', () => {
        expect(runRedFlagCheck('I want to die').matched).toContain('SUICIDAL_IDEATION');
        expect(runRedFlagCheck('thinking about suicide').matched).toContain('SUICIDAL_IDEATION');
        expect(runRedFlagCheck('I have been cutting myself').matched).toContain(
            'SUICIDAL_IDEATION',
        );
        // Gerund forms — "ending my life", "taking my own life", etc.
        expect(runRedFlagCheck('thinking about ending my life').matched).toContain(
            'SUICIDAL_IDEATION',
        );
        expect(runRedFlagCheck('I want to take my own life').matched).toContain(
            'SUICIDAL_IDEATION',
        );
    });

    it('PREGNANCY_BLEEDING — pregnancy + heavy bleeding', () => {
        const r = runRedFlagCheck('I am pregnant and have heavy bleeding');
        expect(r.matched).toContain('PREGNANCY_BLEEDING');
    });

    it('CHOKING — choking', () => {
        expect(runRedFlagCheck('I am choking on food').matched).toContain('CHOKING');
        expect(runRedFlagCheck("I can't breathe at all").matched).toContain('CHOKING');
    });

    it('UNCONSCIOUS_UNRESPONSIVE — describing another person', () => {
        const r = runRedFlagCheck('my husband is unresponsive and not waking up');
        expect(r.matched).toContain('UNCONSCIOUS_UNRESPONSIVE');
    });

    it('SEVERE_HEAD_TRAUMA — hit head + vomiting', () => {
        const r = runRedFlagCheck('I hit my head two hours ago and have been vomiting since');
        expect(r.matched).toContain('SEVERE_HEAD_TRAUMA');
    });

    it("UNCONTROLLED_BLEEDING — bleeding that won't stop", () => {
        const r = runRedFlagCheck('I cut my hand badly and the bleeding will not stop');
        expect(r.matched).toContain('UNCONTROLLED_BLEEDING');
    });

    it('INFANT_HIGH_FEVER — newborn with fever', () => {
        const r = runRedFlagCheck('my newborn has a fever and feels hot');
        expect(r.matched).toContain('INFANT_HIGH_FEVER');
    });
});

describe('runRedFlagCheck — negative cases (rules MUST NOT fire)', () => {
    it('mild cold + cough', () => {
        const r = runRedFlagCheck(
            'I have a mild cough and a runny nose for the past three days, no fever',
        );
        expect(r.fired).toBe(false);
    });

    it('mild headache', () => {
        const r = runRedFlagCheck('I have a mild headache that comes and goes');
        expect(r.fired).toBe(false);
    });

    it('exercise-induced breathlessness — should NOT trigger CHOKING', () => {
        const r = runRedFlagCheck(
            "I find I can't breathe well when I exercise but I'm fine at rest",
        );
        expect(r.matched).not.toContain('CHOKING');
    });

    it('chest pain alone — must NOT trigger cardiac without the partner symptom', () => {
        const r = runRedFlagCheck('mild chest soreness after lifting weights yesterday');
        expect(r.matched).not.toContain('CARDIAC_CHEST_PAIN');
    });

    it('pregnant + healthy — should NOT trigger pregnancy bleeding', () => {
        const r = runRedFlagCheck('I am pregnant and feeling well, just a bit nauseous');
        expect(r.matched).not.toContain('PREGNANCY_BLEEDING');
    });
});

describe('runRedFlagCheck — meta', () => {
    it('returns empty array when nothing matches', () => {
        const r = runRedFlagCheck('I sprained my ankle two days ago, walking is uncomfortable');
        expect(r.fired).toBe(false);
        expect(r.matched).toEqual([]);
    });

    it('returns multiple flags when multiple rules match', () => {
        const r = runRedFlagCheck(
            "I want to die. Also I have severe chest pain and can't breathe.",
        );
        expect(r.matched).toContain('SUICIDAL_IDEATION');
        expect(r.matched).toContain('CARDIAC_CHEST_PAIN');
    });

    it('is case-insensitive', () => {
        const r = runRedFlagCheck('I WANT TO DIE');
        expect(r.matched).toContain('SUICIDAL_IDEATION');
    });
});

// ─── Copy + helpers ──────────────────────────────────────────────────────────

describe('static copy', () => {
    it('EMERGENCY_RECOMMENDATION points to emergency services and does not name a diagnosis', () => {
        expect(EMERGENCY_RECOMMENDATION).toMatch(/emergency/i);
        expect(EMERGENCY_RECOMMENDATION).not.toMatch(/heart attack|stroke|infarction/i);
    });

    it('ROUTINE_DEFAULT_RECOMMENDATION mentions GP and uses reassuring tone', () => {
        expect(ROUTINE_DEFAULT_RECOMMENDATION).toMatch(/general physician/i);
        expect(ROUTINE_DEFAULT_RECOMMENDATION).toMatch(/let's/i);
    });
});

describe('doctor handoff summaries', () => {
    it('emergency handoff includes the matched rule names', () => {
        const out = emergencyDoctorHandoff('chest pain shortness of breath', [
            'CARDIAC_CHEST_PAIN',
        ]);
        expect(out).toContain('CARDIAC_CHEST_PAIN');
        expect(out).toMatch(/EMERGENCY/);
    });

    it('default handoff truncates very long inputs', () => {
        const long = 'x'.repeat(400);
        const out = defaultDoctorHandoff(long);
        // 200-char body cap + the surrounding template => under ~300 chars
        expect(out.length).toBeLessThan(320);
    });
});

describe('fallback specialty', () => {
    it('uses the seed slug for General Physician', () => {
        expect(FALLBACK_SPECIALIZATION_ID).toBe('general_physician');
        expect(FALLBACK_SPECIALIZATION_NAME).toBe('General Physician');
    });
});

describe('isKnownAgeBand', () => {
    it('accepts every banded value', () => {
        expect(isKnownAgeBand('<18')).toBe(true);
        expect(isKnownAgeBand('18-29')).toBe(true);
        expect(isKnownAgeBand('75+')).toBe(true);
    });

    it('rejects unknown values', () => {
        expect(isKnownAgeBand('20')).toBe(false);
        expect(isKnownAgeBand('')).toBe(false);
        expect(isKnownAgeBand(null)).toBe(false);
        expect(isKnownAgeBand(undefined)).toBe(false);
    });
});
