'use client';

import Link from 'next/link';
import { Compass, ChevronLeft, Search } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                <BrandLogo />
            </header>

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
                <div className="max-w-xl w-full bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
                    <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <Compass className="w-10 h-10 text-brand-500" />
                    </div>

                    <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3">
                        Error 404
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                        We couldn&apos;t find that page
                    </h1>
                    <p className="text-slate-500 font-medium mb-10 max-w-md mx-auto leading-relaxed">
                        The page you&apos;re looking for may have moved, or never existed. Let&apos;s
                        get you back on track.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98] group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                            Back to home
                        </Link>
                        <Link
                            href="/doctors"
                            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
                        >
                            <Search className="w-5 h-5" /> Find a doctor
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
