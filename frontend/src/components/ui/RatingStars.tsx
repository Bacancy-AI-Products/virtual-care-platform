import { Star } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface RatingStarsProps {
    /** 0–5; supports half stars (e.g. 4.3 → 4 full + half). */
    value: number;
    size?: 'sm' | 'md' | 'lg';
    /** Show the numeric value beside the stars. */
    showValue?: boolean;
    /** Show the review count after the stars, e.g. "(128)". */
    count?: number;
    className?: string;
}

const SIZE_CLASSES = {
    sm: { star: 'w-3.5 h-3.5', text: 'text-xs' },
    md: { star: 'w-4 h-4', text: 'text-sm' },
    lg: { star: 'w-5 h-5', text: 'text-base' },
} as const;

/**
 * Read-only star rating display. Renders 5 stars filled to the nearest half.
 * Use `RatingStarsInput` for interactive selection.
 */
export function RatingStars({
    value,
    size = 'md',
    showValue = false,
    count,
    className,
}: RatingStarsProps) {
    const clamped = Math.max(0, Math.min(5, value));
    const sizes = SIZE_CLASSES[size];

    return (
        <div
            className={twMerge('inline-flex items-center gap-1.5', className)}
            aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
        >
            <div className="inline-flex items-center">
                {[0, 1, 2, 3, 4].map((i) => {
                    const fill = Math.max(0, Math.min(1, clamped - i));
                    return (
                        <span key={i} className={`relative ${sizes.star}`}>
                            <Star className={`${sizes.star} text-slate-200`} />
                            <span
                                className="absolute inset-0 overflow-hidden"
                                style={{ width: `${fill * 100}%` }}
                                aria-hidden
                            >
                                <Star
                                    className={`${sizes.star} text-amber-400`}
                                    fill="currentColor"
                                />
                            </span>
                        </span>
                    );
                })}
            </div>
            {showValue && (
                <span className={`font-bold text-slate-900 ${sizes.text}`}>
                    {clamped.toFixed(1)}
                </span>
            )}
            {typeof count === 'number' && (
                <span className={`font-medium text-slate-400 ${sizes.text}`}>
                    ({count.toLocaleString()})
                </span>
            )}
        </div>
    );
}

interface RatingStarsInputProps {
    value: number; // 1–5
    onChange: (v: number) => void;
    size?: 'md' | 'lg';
    disabled?: boolean;
}

/** Interactive 1–5 star picker. */
export function RatingStarsInput({
    value,
    onChange,
    size = 'lg',
    disabled,
}: RatingStarsInputProps) {
    const sizes = SIZE_CLASSES[size];
    return (
        <div
            className="inline-flex items-center gap-1"
            role="radiogroup"
            aria-label="Rate from 1 to 5"
        >
            {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= value;
                return (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        disabled={disabled}
                        onClick={() => onChange(n)}
                        className={`p-1 rounded-md transition-all disabled:cursor-not-allowed ${
                            disabled ? 'opacity-60' : 'hover:scale-110 active:scale-95'
                        }`}
                    >
                        <Star
                            className={`${sizes.star} ${
                                active ? 'text-amber-400' : 'text-slate-200'
                            }`}
                            fill={active ? 'currentColor' : 'none'}
                        />
                    </button>
                );
            })}
        </div>
    );
}
