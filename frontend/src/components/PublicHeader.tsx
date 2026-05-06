import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

interface PublicHeaderProps {
    bordered?: boolean;
}

export function PublicHeader({ bordered }: PublicHeaderProps) {
    return (
        <nav
            className={`h-20 sm:h-24 flex items-center justify-between gap-3 sm:gap-6${
                bordered ? ' border-b border-slate-100' : ''
            }`}
        >
            <div className="min-w-0 flex-shrink">
                <BrandLogo href="/doctors" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border-2 border-slate-200/90 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm shadow-slate-200/30 transition-all hover:border-brand-300 hover:bg-brand-50/90 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 sm:px-6 sm:text-[15px] whitespace-nowrap"
                >
                    Login
                </Link>
                <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-300/35 ring-1 ring-brand-400/30 transition-all hover:from-brand-600 hover:to-brand-700 hover:shadow-lg hover:shadow-brand-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:px-7 sm:text-[15px] whitespace-nowrap"
                >
                    Get started
                </Link>
            </div>
        </nav>
    );
}
