'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Video, Shield, Clock, ShieldCheck } from 'lucide-react';

interface AuthVisualPanelProps {
    /** Headline text. Pass JSX to highlight a span with `text-brand-500`. */
    title: React.ReactNode;
    /** Short supporting copy (1–2 sentences). */
    description: string;
    /** Path to the page-specific SVG illustration in `/public`. */
    imageSrc: string;
    /** Alt text describing the page-specific illustration. */
    imageAlt: string;
    /**
     * When true: teal→orange accent above title, hero-aligned trust pills, teal-tinted decor,
     * and feature copy tuned to match the landing page tone.
     */
    landingAligned?: boolean;
}

const TRUST_PILLS = [
    { icon: Shield, label: 'HIPAA-aligned safeguards' },
    { icon: ShieldCheck, label: 'Secure sessions' },
] as const;

/**
 * Right-side visual panel shared across auth pages (login, signup, forgot/reset password).
 *
 * Warm brand-tinted gradient backdrop with layered blur shapes for depth, a page-specific
 * SVG illustration, a headline, supporting copy, and three product highlights. Each consumer
 * passes its own illustration matching the page's intent (welcome, onboarding, recovery, reset).
 */
export function AuthVisualPanel({
    title,
    description,
    imageSrc,
    imageAlt,
    landingAligned = false,
}: AuthVisualPanelProps) {
    const iconShell =
        landingAligned
            ? 'w-9 h-9 rounded-xl bg-gradient-to-br from-brand-50 to-medical-soft flex items-center justify-center flex-shrink-0 ring-1 ring-brand-100/80'
            : 'w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0';

    const highlights = landingAligned
        ? [
              { icon: Video, text: 'Video visits with verified doctors' },
              { icon: Shield, text: 'Encrypted records and secure visits' },
              { icon: Clock, text: 'Book care when it works for you' },
          ]
        : [
              { icon: Video, text: 'Instant video consultations' },
              { icon: Shield, text: 'Encrypted, secure records' },
              { icon: Clock, text: '24/7 access to care' },
          ];

    return (
        <div
            className={`hidden lg:flex flex-1 relative min-h-0 overflow-hidden items-center justify-center p-12 xl:p-16 ${
                landingAligned
                    ? 'bg-gradient-to-br from-medical-soft/50 via-brand-50 to-brand-200/40'
                    : 'bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200/40'
            }`}
        >
            <div className="relative z-10 max-w-md w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="relative aspect-[4/5] w-full max-w-[280px] xl:max-w-[320px] mx-auto mb-8">
                        <Image
                            src={imageSrc}
                            alt={imageAlt}
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>

                    {landingAligned ? (
                        <div className="flex justify-center mb-4">
                            <span className="h-1 w-12 rounded-full bg-gradient-to-r from-medical-teal to-brand-500" />
                        </div>
                    ) : null}

                    <h3 className="text-2xl xl:text-3xl font-bold text-slate-900 mb-3 leading-tight">
                        {title}
                    </h3>

                    <p className="text-base text-slate-500 leading-relaxed mb-6">{description}</p>

                    {landingAligned ? (
                        <ul
                            className="flex flex-wrap gap-2 mb-6"
                            aria-label="Security and compliance highlights"
                        >
                            {TRUST_PILLS.map(({ icon: Icon, label }) => (
                                <li key={label}>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm shadow-slate-200/25 ring-1 ring-white/80 xl:text-xs">
                                        <Icon
                                            className="h-3.5 w-3.5 shrink-0 text-medical-teal"
                                            aria-hidden
                                        />
                                        {label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    <ul className="space-y-3">
                        {highlights.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <div className={iconShell}>
                                    <Icon className="w-4 h-4 text-brand-500" aria-hidden />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{text}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>

            <div className="absolute top-0 right-0 w-[540px] h-[540px] bg-brand-300/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[480px] h-[480px] bg-brand-200/45 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            <div
                className={`absolute top-[18%] left-[8%] w-[200px] h-[200px] rounded-full blur-2xl opacity-90 ${
                    landingAligned ? 'bg-medical-teal/25' : 'bg-brand-100'
                }`}
            ></div>
            <div className="absolute bottom-[22%] right-[10%] w-[180px] h-[180px] bg-brand-200/45 rounded-full blur-2xl"></div>
        </div>
    );
}
