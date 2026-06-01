import { AlertTriangle, PhoneCall, Clock, Stethoscope, Smile } from 'lucide-react';
import { type TriageUrgency } from '@/services/api';

const URGENCY_CONFIG: Record<
    TriageUrgency,
    {
        label: string;
        sublabel: string;
        icon: typeof AlertTriangle;
        containerClass: string;
        iconClass: string;
        labelClass: string;
        badgeClass: string;
    }
> = {
    EMERGENCY: {
        label: 'Emergency — act now',
        sublabel:
            'Please call emergency services or go to your nearest emergency room immediately.',
        icon: PhoneCall,
        containerClass: 'border-red-200 bg-red-50',
        iconClass: 'text-red-500',
        labelClass: 'text-red-800',
        badgeClass: 'bg-red-500 text-white',
    },
    URGENT: {
        label: 'Urgent — see a doctor today',
        sublabel: 'You should be seen within the next 24 hours.',
        icon: AlertTriangle,
        containerClass: 'border-amber-200 bg-amber-50',
        iconClass: 'text-amber-500',
        labelClass: 'text-amber-800',
        badgeClass: 'bg-amber-500 text-white',
    },
    ROUTINE: {
        label: 'Routine — book an appointment',
        sublabel: 'A doctor can help — a consult in the next few days is appropriate.',
        icon: Stethoscope,
        containerClass: 'border-brand-200 bg-brand-50',
        iconClass: 'text-brand-500',
        labelClass: 'text-brand-800',
        badgeClass: 'bg-brand-500 text-white',
    },
    SELF_CARE: {
        label: 'Self-care — manage at home',
        sublabel: 'This looks manageable at home for now. A doctor can still help if you prefer.',
        icon: Smile,
        containerClass: 'border-emerald-200 bg-emerald-50',
        iconClass: 'text-emerald-500',
        labelClass: 'text-emerald-800',
        badgeClass: 'bg-emerald-500 text-white',
    },
};

// Fallback for unknown urgency values that might come from the backend
const UNKNOWN_CONFIG = {
    label: 'See a doctor',
    sublabel: 'Please consult a medical professional.',
    icon: Clock,
    containerClass: 'border-slate-200 bg-slate-50',
    iconClass: 'text-slate-500',
    labelClass: 'text-slate-800',
    badgeClass: 'bg-slate-500 text-white',
};

interface ResultUrgencyBannerProps {
    urgency: TriageUrgency;
}

export function ResultUrgencyBanner({ urgency }: ResultUrgencyBannerProps) {
    const cfg = URGENCY_CONFIG[urgency] ?? UNKNOWN_CONFIG;
    const Icon = cfg.icon;

    return (
        <div
            className={`flex items-start gap-4 rounded-2xl border p-4 sm:p-5 ${cfg.containerClass}`}
            role="status"
            aria-live="polite"
        >
            <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.badgeClass}`}
            >
                <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-base font-bold ${cfg.labelClass}`}>{cfg.label}</p>
                <p className={`mt-0.5 text-sm ${cfg.labelClass} opacity-80`}>{cfg.sublabel}</p>
            </div>
        </div>
    );
}
