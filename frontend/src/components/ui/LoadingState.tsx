'use client';

import React from 'react';

interface LoadingStateProps {
    message?: string;
    /** Tailwind padding-y class for the wrapper. Default "py-24". */
    padding?: string;
}

export function LoadingState({ message = 'Loading…', padding = 'py-24' }: LoadingStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center ${padding}`}
            role="status"
            aria-live="polite"
        >
            <span
                className="inline-block w-10 h-10 rounded-full border-[3px] border-slate-200 border-t-brand-500 animate-spin"
                aria-hidden="true"
            />
            <p className="mt-3 text-xs sm:text-sm font-bold text-slate-500">{message}</p>
            <span className="sr-only">{message}</span>
        </div>
    );
}
