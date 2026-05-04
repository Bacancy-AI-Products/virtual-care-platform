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
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <Link
                    href="/login"
                    className="border border-slate-200 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-slate-600 font-semibold hover:bg-slate-50 hover:text-brand-500 transition-all whitespace-nowrap"
                >
                    Login
                </Link>
                <Link
                    href="/signup"
                    className="bg-brand-500 text-white font-bold rounded-xl sm:rounded-2xl px-3.5 sm:px-8 py-2 sm:py-3 text-sm sm:text-base shadow-md hover:bg-brand-600 transition-all active:scale-95 whitespace-nowrap"
                >
                    Get Started
                </Link>
            </div>
        </nav>
    );
}
