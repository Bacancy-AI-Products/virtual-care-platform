import type { LucideIcon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface StatTileProps {
    icon: LucideIcon;
    label: string;
    value: string;
    /** Optional sub-line shown under the value (e.g. "Avg. response"). */
    hint?: string;
    className?: string;
}

/**
 * Compact stat block used in the doctor profile trust strip.
 * Visually matches the existing inline tiles on the profile page but is reusable.
 */
export function StatTile({ icon: Icon, label, value, hint, className }: StatTileProps) {
    return (
        <div
            className={twMerge(
                'min-w-0 p-3 sm:p-4 bg-slate-50 rounded-2xl sm:rounded-3xl text-center overflow-hidden',
                className,
            )}
        >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm text-brand-500">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide truncate">
                {label}
            </p>
            <p className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 truncate">
                {value}
            </p>
            {hint && (
                <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                    {hint}
                </p>
            )}
        </div>
    );
}
