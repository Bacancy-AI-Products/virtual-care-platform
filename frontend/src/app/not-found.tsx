'use client';

import Link from 'next/link';
import { Calendar, FileText, Search, Stethoscope } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function NotFound() {
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
                    {/* Laptop */}
                    <div className="relative mx-auto w-full max-w-[900px]">
                        {/* Soft floor shadow — stays put while laptop floats above it */}
                        <div className="pointer-events-none absolute -bottom-8 left-1/2 h-6 w-[88%] -translate-x-1/2 rounded-[50%] bg-slate-900/[0.18] blur-xl" />

                        {/* Screen */}
                        <div className="relative rounded-[28px] bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_40px_120px_-60px_rgba(2,132,199,0.65)] ring-1 ring-white/20">
                            {/* Bezel highlight (top glass reflection) */}
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
                                        {/* Content directly on screen */}
                                        <div className="w-full max-w-[520px] text-center">
                                            <svg
                                                className="mx-auto mb-4 h-16 w-16"
                                                viewBox="0 0 120 120"
                                                xmlns="http://www.w3.org/2000/svg"
                                                aria-hidden
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id="nfBadge"
                                                        x1="0"
                                                        y1="0"
                                                        x2="1"
                                                        y2="1"
                                                    >
                                                        <stop offset="0%" stopColor="#0ea5e9" />
                                                        <stop offset="55%" stopColor="#14b8a6" />
                                                        <stop offset="100%" stopColor="#f97316" />
                                                    </linearGradient>
                                                </defs>
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="44"
                                                    fill="url(#nfBadge)"
                                                    opacity="0.16"
                                                />
                                                <circle
                                                    cx="60"
                                                    cy="60"
                                                    r="30"
                                                    fill="none"
                                                    stroke="url(#nfBadge)"
                                                    strokeWidth="6"
                                                />
                                                <path
                                                    d="M60 38 L76 74 H44 L60 38 Z"
                                                    fill="#0f172a"
                                                    opacity="0.08"
                                                />
                                                <path
                                                    d="M60 42 L74 72 H46 L60 42 Z"
                                                    fill="#ffffff"
                                                    stroke="#0f172a"
                                                    strokeWidth="4"
                                                    strokeLinejoin="round"
                                                />
                                                <path
                                                    d="M60 54 v18"
                                                    stroke="#0ea5e9"
                                                    strokeWidth="6"
                                                    strokeLinecap="round"
                                                />
                                                <circle cx="60" cy="78" r="4" fill="#f97316" />
                                            </svg>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">
                                                Error 404
                                            </p>
                                            <h1 className="mb-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                                                We couldn&apos;t find that page
                                            </h1>
                                            <p className="mx-auto mb-7 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
                                                The address may be outdated or the page may have
                                                moved. Use one of the options below to continue
                                                safely.
                                            </p>

                                            <div className="mx-auto mb-6 flex max-w-md flex-wrap items-center justify-center gap-2">
                                                <Link
                                                    href="/doctors"
                                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                                >
                                                    <Stethoscope className="h-3.5 w-3.5 text-medical-teal" />
                                                    Find specialists
                                                </Link>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                                    <Calendar className="h-3.5 w-3.5 text-brand-600" />
                                                    Book appointment
                                                </span>
                                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                                    <FileText className="h-3.5 w-3.5 text-orange-500" />
                                                    Medical records
                                                </span>
                                            </div>

                                            <div className="flex flex-col justify-center gap-2.5 sm:flex-row">
                                                <Link
                                                    href="/doctors"
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-600 active:scale-[0.98]"
                                                >
                                                    <Search className="h-4 w-4" /> Find a doctor
                                                </Link>
                                            </div>

                                            <p className="mt-5 text-xs font-medium text-slate-500">
                                                TeleCare tip: if you&apos;re trying to join a visit,
                                                open it from your dashboard or upcoming
                                                appointments.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hinge groove — separates screen from base */}
                        <div
                            className="relative mx-auto h-1 w-[96%] bg-gradient-to-b from-slate-800/60 to-slate-900/40"
                            aria-hidden
                        />

                        {/* Base — aluminum unibody bottom */}
                        <div className="relative mx-auto h-8 w-[92%] rounded-b-[28px] bg-[linear-gradient(180deg,_#e2e8f0_0%,_#cbd5e1_45%,_#94a3b8_100%)] shadow-[0_22px_55px_-40px_rgba(15,23,42,0.55)]">
                            {/* Top edge highlight */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" />
                            {/* Brushed metal hint — faint horizontal bands */}
                            <div className="pointer-events-none absolute inset-0 rounded-b-[28px] opacity-40 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_3px)]" />
                            {/* Trackpad-area notch indicator (subtle dimple where keyboard would be) */}
                            <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-28 -translate-x-1/2 rounded-full bg-slate-500/30 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]" />
                            {/* Bottom rim shadow */}
                            <div className="pointer-events-none absolute inset-x-4 bottom-0 h-1 rounded-b-[20px] bg-gradient-to-t from-slate-900/15 to-transparent" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
