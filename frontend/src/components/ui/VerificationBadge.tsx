import { BadgeCheck } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface VerificationBadgeProps {
    /** Compact pill (just the checkmark) vs full label. */
    variant?: 'icon' | 'pill';
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Trust signal shown next to a doctor name. Means the platform verified the
 * doctor's credentials and registration number.
 */
export function VerificationBadge({
    variant = 'pill',
    size = 'md',
    className,
}: VerificationBadgeProps) {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    if (variant === 'icon') {
        return (
            <span
                className={twMerge(
                    'inline-flex items-center justify-center rounded-full bg-sky-500 text-white shadow-sm',
                    size === 'sm' ? 'w-5 h-5' : 'w-6 h-6',
                    className,
                )}
                title="Verified doctor"
                aria-label="Verified doctor"
            >
                <BadgeCheck className={iconSize} strokeWidth={2.5} />
            </span>
        );
    }
    return (
        <span
            className={twMerge(
                'inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-600 font-bold border border-sky-100',
                size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
                className,
            )}
            title="Credentials verified by BacancyTeleCare"
        >
            <BadgeCheck className={iconSize} /> Verified
        </span>
    );
}
