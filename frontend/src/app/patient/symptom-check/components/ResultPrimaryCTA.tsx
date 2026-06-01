import Link from 'next/link';
import { PhoneCall, ArrowRight } from 'lucide-react';
import { type TriageUrgency, type SuggestedDoctor } from '@/services/api';

interface ResultPrimaryCTAProps {
    urgency: TriageUrgency;
    doctors: SuggestedDoctor[];
}

export function ResultPrimaryCTA({ urgency, doctors }: ResultPrimaryCTAProps) {
    const topDoctor = doctors[0];

    if (urgency === 'EMERGENCY') {
        return (
            <div className="flex flex-col gap-3 sm:flex-row">
                <a
                    href="tel:911"
                    className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 text-base font-bold text-white shadow-xl shadow-red-100 transition-all hover:bg-red-600 active:scale-95"
                >
                    <PhoneCall className="h-5 w-5 shrink-0" aria-hidden />
                    Call 911 now
                </a>
                {topDoctor && (
                    <Link
                        href={`/patient/doctors/${topDoctor.id}`}
                        className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
                    >
                        View doctor profile
                        <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                )}
            </div>
        );
    }

    if (!topDoctor) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-center">
                <p className="text-sm font-semibold text-slate-500 mb-3">
                    No available doctors match this specialty right now.
                </p>
                <Link
                    href="/patient/doctors"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-95"
                >
                    Browse all doctors
                    <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
            </div>
        );
    }

    return (
        <Link
            href={`/patient/doctors/${topDoctor.id}`}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-base font-bold text-white shadow-xl shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95"
        >
            Book consultation now
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
    );
}
