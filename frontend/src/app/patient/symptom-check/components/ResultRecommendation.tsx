import { type TriageUrgency } from '@/services/api';

interface ResultRecommendationProps {
    recommendation: string;
    urgency: TriageUrgency;
}

export function ResultRecommendation({ recommendation, urgency }: ResultRecommendationProps) {
    // For EMERGENCY, the recommendation text is the main action copy.
    // For others, it accompanies the booking CTA.
    const isEmergency = urgency === 'EMERGENCY';

    return (
        <div
            className={`rounded-2xl border px-5 py-4 ${
                isEmergency ? 'border-red-100 bg-white' : 'border-slate-100 bg-white'
            }`}
        >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {isEmergency ? 'What to do right now' : 'Our suggestion'}
            </p>
            <p className="text-sm leading-relaxed text-slate-700">{recommendation}</p>
        </div>
    );
}
