'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { type ClarifyQuestion } from '@/services/api';

interface ClarifyStepProps {
    questions: ClarifyQuestion[];
    onSubmit: (answers: { questionId: string; answer: string }[]) => void;
    isLoading: boolean;
    error: Error | null;
}

export function ClarifyStep({ questions, onSubmit, isLoading, error }: ClarifyStepProps) {
    const [answers, setAnswers] = React.useState<Record<string, string>>({});

    const answeredCount = Object.keys(answers).length;
    const hasAnyAnswer = answeredCount > 0;

    const handleChip = (questionId: string, option: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: prev[questionId] === option ? '' : option,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        const payload = Object.entries(answers)
            .filter(([, v]) => v !== '')
            .map(([questionId, answer]) => ({ questionId, answer }));
        onSubmit(payload);
    };

    const handleSkip = () => {
        if (isLoading) return;
        onSubmit([]);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Heading */}
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                    A couple of quick questions
                </h3>
                <p className="text-sm text-slate-500">
                    These help us route you more accurately. Tap a chip to answer — or skip.
                </p>
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {questions.map((q) => (
                    <div key={q.id} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-800">{q.prompt}</p>
                        <div className="flex flex-wrap gap-2">
                            {q.options.map((option) => {
                                const selected = answers[q.id] === option;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => handleChip(q.id, option)}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                                            selected
                                                ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-100'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                                        }`}
                                        aria-pressed={selected}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* API error */}
            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error.message || 'Something went wrong. Please try again.'}
                </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    type="submit"
                    disabled={!hasAnyAnswer || isLoading}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-lg shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            Getting your result…
                        </>
                    ) : (
                        'Continue'
                    )}
                </button>
                <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 sm:flex-initial"
                >
                    Skip all questions
                </button>
            </div>
        </form>
    );
}
