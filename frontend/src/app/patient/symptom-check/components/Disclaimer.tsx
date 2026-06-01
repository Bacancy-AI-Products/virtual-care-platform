import { ShieldAlert } from 'lucide-react';

/**
 * Persistent disclaimer shown on every step of the symptom-check flow.
 * Required per docs/symptom-checker-plan.md §9.
 */
export function Disclaimer() {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <p className="text-xs leading-relaxed text-amber-800">
                <span className="font-bold">Not a diagnosis.</span> This is a triage suggestion to
                help you decide where to seek care. It does not replace professional medical advice.
                In an emergency, call your local emergency services immediately.
            </p>
        </div>
    );
}
