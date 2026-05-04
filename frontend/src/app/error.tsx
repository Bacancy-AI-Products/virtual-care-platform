'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCw } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    React.useEffect(() => {
        console.error('Unhandled application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                <BrandLogo />
            </header>

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
                <div className="max-w-xl w-full bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>

                    <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">
                        Something went wrong
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                        We hit an unexpected error
                    </h1>
                    <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto leading-relaxed">
                        The page couldn&apos;t finish loading. You can try again, or head back to a
                        safe place.
                    </p>

                    {error?.digest && (
                        <p className="text-xs text-slate-400 font-mono mb-8">
                            Reference: {error.digest}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                        >
                            <RotateCw className="w-5 h-5" /> Try again
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                        >
                            <Home className="w-5 h-5" /> Back to home
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
