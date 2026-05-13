'use client';

import React from 'react';

interface LoadingStateProps {
    message?: string;
    /** Tailwind padding-y class for the wrapper. Default "py-24". */
    padding?: string;
}

// Time-based simulated progress: climbs quickly at first, then asymptotically
// approaches (but never reaches) 99% until the loader unmounts.
// Real progress isn't available for fetch JSON responses, so this gives users
// visible feedback while a request is in flight or retrying.
export function LoadingState({ message = 'Loading…', padding = 'py-24' }: LoadingStateProps) {
    const [percent, setPercent] = React.useState(8);

    React.useEffect(() => {
        let cancelled = false;
        const start = Date.now();
        const tick = () => {
            if (cancelled) return;
            const elapsed = (Date.now() - start) / 1000;
            // 1 - e^(-t/τ): smooth ease-out toward 99%.
            const target = 99 * (1 - Math.exp(-elapsed / 3.5));
            setPercent((prev) => Math.max(prev, Math.min(99, Math.round(target))));
        };
        tick();
        const id = window.setInterval(tick, 200);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, []);

    const size = 64;
    const stroke = 6;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference * (1 - percent / 100);

    return (
        <div className={`flex flex-col items-center justify-center ${padding}`}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth={stroke}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="#22b8a4"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        className="transition-[stroke-dashoffset] duration-200 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {percent}%
                    </span>
                </div>
            </div>
            <p className="mt-3 text-xs sm:text-sm font-bold text-slate-500">{message}</p>
        </div>
    );
}
