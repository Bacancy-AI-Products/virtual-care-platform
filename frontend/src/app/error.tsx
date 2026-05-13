'use client';

import React from 'react';
import { RefreshCw, LifeBuoy } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [showDetails, setShowDetails] = React.useState(false);

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-brand-50">
            <div className="pointer-events-none absolute inset-0">
                <svg
                    className="absolute -left-20 -top-20 h-[320px] w-[320px] opacity-60"
                    viewBox="0 0 300 300"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M69.6,-56.1C90.1,-33.5,107,-4.2,102.7,20.5C98.4,45.1,73,65.1,44.4,76.8C15.8,88.4,-16,91.7,-41.3,80.4C-66.6,69,-85.5,43,-90.2,14.3C-94.9,-14.5,-85.3,-45.9,-65.7,-68.5C-46.1,-91.2,-16.5,-105.1,9.7,-112.8C35.9,-120.6,71.7,-122.2,69.6,-56.1Z"
                        transform="translate(150 150)"
                        fill="#38bdf8"
                    />
                </svg>
                <svg
                    className="absolute -bottom-28 -right-24 h-[360px] w-[360px] opacity-60"
                    viewBox="0 0 300 300"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M47.2,-74.3C61.8,-63.8,75,-51.9,87.1,-36.8C99.2,-21.7,110.3,-3.5,105.8,11.3C101.3,26,81.1,37.3,66.2,50.2C51.2,63.1,41.5,77.6,27.5,88.7C13.6,99.8,-4.5,107.6,-19.6,102.5C-34.7,97.4,-46.8,79.4,-60.4,65.4C-73.9,51.4,-89,41.4,-98.4,26.7C-107.8,12,-111.5,-7.4,-103.5,-21.2C-95.5,-35,-75.8,-43.2,-59.6,-53.8C-43.5,-64.4,-30.9,-77.3,-15,-83.2C0.9,-89.1,32.6,-87.9,47.2,-74.3Z"
                        transform="translate(150 150)"
                        fill="#f97316"
                    />
                </svg>
            </div>

            <header className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
                <BrandLogo href="/" />
            </header>

            <main className="relative z-10 flex min-h-[calc(100vh-84px)] items-center justify-center px-4 pb-8 sm:px-6 sm:pb-10">
                <div className="w-full max-w-5xl">
                    <div className="relative mx-auto w-full max-w-[900px]">
                        {/* Soft floor shadow — stays put while laptop floats */}
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 h-6 w-[88%] -translate-x-1/2 rounded-[50%] bg-slate-900/[0.18] blur-xl" />

                        <div className="relative rounded-[28px] bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_40px_120px_-60px_rgba(2,132,199,0.65)] ring-1 ring-white/20">
                            {/* Bezel highlight */}
                            <div className="pointer-events-none absolute inset-x-8 top-0 h-14 rounded-b-[22px] bg-gradient-to-b from-white/[0.07] to-transparent" />
                            {/* Camera lens */}
                            <div className="absolute left-1/2 top-3 flex h-2 w-2 -translate-x-1/2 items-center justify-center rounded-full bg-slate-800 ring-1 ring-slate-700/80 shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]">
                                <span className="h-0.5 w-0.5 rounded-full bg-slate-500/80" />
                            </div>
                            {/* Power indicator LED */}
                            <div className="absolute right-6 top-[15px] h-1 w-1 rounded-full bg-emerald-400/90 shadow-[0_0_4px_rgba(52,211,153,0.7)]" />

                            <div className="p-3 sm:p-4">
                                <div className="relative overflow-hidden rounded-[22px] bg-white">
                                    <div className="relative flex min-h-[360px] items-center justify-center px-6 py-9 sm:min-h-[400px] sm:px-10">
                                        <div className="w-full max-w-[560px] text-center">
                                            <svg
                                                className="mx-auto mb-4 h-16 w-16"
                                                viewBox="0 0 120 120"
                                                xmlns="http://www.w3.org/2000/svg"
                                                aria-hidden
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id="errBadge"
                                                        x1="0"
                                                        y1="0"
                                                        x2="1"
                                                        y2="1"
                                                    >
                                                        <stop offset="0%" stopColor="#0ea5e9" />
                                                        <stop offset="60%" stopColor="#f97316" />
                                                        <stop offset="100%" stopColor="#ef4444" />
                                                    </linearGradient>
                                                </defs>
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="44"
                                                    fill="url(#errBadge)"
                                                    opacity="0.16"
                                                />
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="30"
                                                    fill="none"
                                                    stroke="url(#errBadge)"
                                                    strokeWidth="6"
                                                />
                                                <path
                                                    d="M48 48 L72 72"
                                                    stroke="#ef4444"
                                                    strokeWidth="7"
                                                    strokeLinecap="round"
                                                />
                                                <path
                                                    d="M72 48 L48 72"
                                                    stroke="#ef4444"
                                                    strokeWidth="7"
                                                    strokeLinecap="round"
                                                />
                                            </svg>

                                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
                                                Something went wrong
                                            </p>
                                            <h1 className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                                                We couldn&apos;t load this screen
                                            </h1>
                                            <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                                                This can happen due to a temporary issue. Try again,
                                                or head back to safety and continue your care
                                                journey.
                                            </p>

                                            <div className="mx-auto mb-5 flex flex-col justify-center gap-2.5 sm:flex-row">
                                                <button
                                                    type="button"
                                                    onClick={() => reset()}
                                                    className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-600 active:scale-[0.98]"
                                                >
                                                    <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-90" />
                                                    Try again
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setShowDetails((v) => !v)}
                                                className="mx-auto inline-flex items-center gap-2 text-xs font-bold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                                            >
                                                <LifeBuoy className="h-4 w-4" />
                                                {showDetails
                                                    ? 'Hide error details'
                                                    : 'Show error details'}
                                            </button>

                                            {showDetails && (
                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                        Details
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                                        {error?.name ?? 'Error'}
                                                    </p>
                                                    <p className="mt-1 break-words text-sm text-slate-700">
                                                        {error?.message ?? 'Unknown error'}
                                                    </p>
                                                    {error?.digest && (
                                                        <p className="mt-2 text-xs font-medium text-slate-500">
                                                            Digest:{' '}
                                                            <span className="font-mono">
                                                                {error.digest}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hinge groove */}
                        <div
                            className="relative mx-auto h-1 w-[96%] bg-gradient-to-b from-slate-800/60 to-slate-900/40"
                            aria-hidden
                        />

                        {/* Base — aluminum unibody bottom */}
                        <div className="relative mx-auto h-8 w-[92%] rounded-b-[28px] bg-[linear-gradient(180deg,_#e2e8f0_0%,_#cbd5e1_45%,_#94a3b8_100%)] shadow-[0_22px_55px_-40px_rgba(15,23,42,0.55)]">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
                            <div className="pointer-events-none absolute inset-0 rounded-b-[28px] opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
                            <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-28 -translate-x-1/2 rounded-full bg-slate-500/30 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]" />
                            <div className="pointer-events-none absolute inset-x-4 bottom-0 h-1 rounded-b-[20px] bg-gradient-to-t from-slate-900/15 to-transparent" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
