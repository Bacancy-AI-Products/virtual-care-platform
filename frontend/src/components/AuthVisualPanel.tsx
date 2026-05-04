'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Video, Shield, Clock } from 'lucide-react';

interface AuthVisualPanelProps {
    /** Headline text. Pass JSX to highlight a span with `text-brand-500`. */
    title: React.ReactNode;
    /** Short supporting copy (1–2 sentences). */
    description: string;
    /** Path to the page-specific SVG illustration in `/public`. */
    imageSrc: string;
    /** Alt text describing the page-specific illustration. */
    imageAlt: string;
}

/**
 * Right-side visual panel shared across auth pages (login, signup, forgot/reset password).
 *
 * Warm brand-tinted gradient backdrop with layered blur shapes for depth, a page-specific
 * SVG illustration, a headline, supporting copy, and three product highlights. Each consumer
 * passes its own illustration matching the page's intent (welcome, onboarding, recovery, reset).
 */
export function AuthVisualPanel({ title, description, imageSrc, imageAlt }: AuthVisualPanelProps) {
    return (
        <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12 xl:p-16 bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200/40">
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

                    <h3 className="text-3xl xl:text-4xl font-bold text-slate-900 mb-3 leading-tight">
                        {title}
                    </h3>

                    <p className="text-base text-slate-500 leading-relaxed mb-6">
                        {description}
                    </p>

                    <ul className="space-y-3">
                        <li className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                <Video className="w-4 h-4 text-brand-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                                Instant video consultations
                            </span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-4 h-4 text-brand-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                                Encrypted, secure records
                            </span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-4 h-4 text-brand-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                                24/7 access to care
                            </span>
                        </li>
                    </ul>
                </motion.div>
            </div>

            <div className="absolute top-0 right-0 w-[540px] h-[540px] bg-brand-300/30 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[480px] h-[480px] bg-brand-200/45 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
            <div className="absolute top-[18%] left-[8%] w-[200px] h-[200px] bg-brand-100 rounded-full blur-2xl opacity-90"></div>
            <div className="absolute bottom-[22%] right-[10%] w-[180px] h-[180px] bg-brand-200/45 rounded-full blur-2xl"></div>
        </div>
    );
}
