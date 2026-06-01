'use client';

import React from 'react';
import { MessageSquarePlus, ChevronDown, Loader2 } from 'lucide-react';

interface ResultRefinementProps {
    onRefinement: (additionalText: string) => void;
    isLoading: boolean;
}

const MAX_CHARS = 1000;

export function ResultRefinement({ onRefinement, isLoading }: ResultRefinementProps) {
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');

    const trimmed = text.trim();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!trimmed || isLoading) return;
        onRefinement(trimmed);
        setText('');
        setOpen(false);
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-100"
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <MessageSquarePlus className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                    Not satisfied? Add more detail
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
            </button>

            {/* Expandable form */}
            {open && (
                <form
                    onSubmit={handleSubmit}
                    className="px-5 pb-5 space-y-3 border-t border-slate-200 pt-4"
                >
                    <p className="text-xs text-slate-500">
                        Describe what's still unclear, mention symptoms you forgot, or ask a
                        follow-up question. We'll re-analyse with this extra context.
                    </p>
                    <div className="relative">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="e.g. The headache also comes with sensitivity to light…"
                            rows={3}
                            maxLength={MAX_CHARS}
                            disabled={isLoading}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-60"
                        />
                        <span className="absolute bottom-3 right-3 text-[11px] text-slate-400 pointer-events-none">
                            {text.length}/{MAX_CHARS}
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={!trimmed || isLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                Updating…
                            </>
                        ) : (
                            'Get updated advice'
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
