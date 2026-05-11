import { GraduationCap } from 'lucide-react';
import type { Credential } from '@/services/api';

interface CredentialListProps {
    credentials: Credential[];
}

/** Vertical timeline-style list of degrees, fellowships, and board certifications. */
export function CredentialList({ credentials }: CredentialListProps) {
    if (!credentials.length) return null;
    const sorted = [...credentials].sort((a, b) => a.year - b.year);
    return (
        <ol className="space-y-4">
            {sorted.map((c, i) => (
                <li key={`${c.title}-${c.year}-${i}`} className="flex gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {c.title}
                        </p>
                        <p className="text-sm text-slate-500 leading-snug">{c.institution}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{c.year}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
