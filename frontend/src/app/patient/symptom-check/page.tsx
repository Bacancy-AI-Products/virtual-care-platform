import { SymptomCheckClient } from './SymptomCheckClient';

/**
 * /patient/symptom-check
 *
 * Server shell — the layout wraps this in the patient auth context.
 * All interactive state lives in SymptomCheckClient ('use client').
 */
export default function SymptomCheckPage() {
    return <SymptomCheckClient />;
}
