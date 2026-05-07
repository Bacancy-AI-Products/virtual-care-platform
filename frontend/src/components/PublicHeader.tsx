import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

interface PublicHeaderProps {
    bordered?: boolean;
}

export function PublicHeader({ bordered }: PublicHeaderProps) {
    return (
        <nav
            className={`flex items-center justify-between gap-4 py-3 sm:gap-8 sm:py-3.5${
                bordered ? ' border-b border-slate-200/50' : ''
            }`}
        >
            <div className="min-w-0 shrink">
                <BrandLogo href="/doctors" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2 sm:px-4 sm:text-[15px] whitespace-nowrap"
                >
                    Log in
                </Link>
                <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:px-5 sm:text-[15px] whitespace-nowrap"
                >
                    Get started
                </Link>
            </div>
        </nav>
    );
}
