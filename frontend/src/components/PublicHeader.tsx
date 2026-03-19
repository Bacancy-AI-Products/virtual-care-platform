import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';

interface PublicHeaderProps {
    bordered?: boolean;
}

export function PublicHeader({ bordered }: PublicHeaderProps) {
    return (
        <nav
            className={`h-20 sm:h-24 flex items-center justify-between${
                bordered ? ' border-b border-slate-100' : ''
            }`}
        >
            <BrandLogo href="/doctors" />
            <div className="flex items-center gap-2 sm:gap-4">
                <Link
                    href="/login"
                    className="border border-slate-200 rounded-2xl px-4 sm:px-6 py-2 sm:py-3 text-slate-600 font-semibold hover:bg-slate-50 hover:text-brand-500 transition-all"
                >
                    Login
                </Link>
                <Link
                    href="/signup"
                    className="bg-brand-500 text-white font-bold rounded-2xl px-6 sm:px-8 py-2.5 sm:py-3 shadow-md hover:bg-brand-600 transition-all active:scale-95"
                >
                    Get Started
                </Link>
            </div>
        </nav>
    );
}
