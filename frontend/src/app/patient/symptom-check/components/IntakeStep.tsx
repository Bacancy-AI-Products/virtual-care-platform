'use client';

import React from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { AGE_BANDS, type AgeBand, type Sex } from '@/services/api';
import { FORM_SELECT_CLASS } from '@/constants/form-controls';
import { twMerge } from 'tailwind-merge';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const MAX_CHARS = 2000;
const MIN_CHARS = 10;

interface IntakeStepProps {
    onSubmit: (symptomsText: string, ageBand: AgeBand | '', sex: Sex | '') => void;
    isLoading: boolean;
    error: Error | null;
}

export function IntakeStep({ onSubmit, isLoading, error }: IntakeStepProps) {
    const [symptomsText, setSymptomsText] = React.useState('');
    const [ageBand, setAgeBand] = React.useState<AgeBand | ''>('');
    const [sex, setSex] = React.useState<Sex | ''>('');

    const charCount = symptomsText.length;
    const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || isLoading) return;
        onSubmit(symptomsText, ageBand, sex);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reassurance heading */}
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Tell us what&apos;s going on.
                </h3>
                <p className="text-sm text-slate-500">
                    This usually takes under a minute. We&apos;ll route you to the right kind of
                    care.
                </p>
            </div>

            {/* Symptom textarea */}
            <div className="space-y-2">
                <label
                    htmlFor="symptoms-text"
                    className="block text-sm font-semibold text-slate-700"
                >
                    Describe your symptoms
                </label>
                <textarea
                    id="symptoms-text"
                    rows={5}
                    maxLength={MAX_CHARS}
                    placeholder="e.g. I've had a sharp pain in my lower back for two days, worse when I stand up..."
                    value={symptomsText}
                    onChange={(e) => setSymptomsText(e.target.value)}
                    disabled={isLoading}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
                <div className="flex items-center justify-between px-1">
                    {charCount > 0 && charCount < MIN_CHARS ? (
                        <p className="text-xs text-amber-600">
                            Please add a bit more detail ({MIN_CHARS - charCount} more chars
                            needed).
                        </p>
                    ) : (
                        <span />
                    )}
                    <span
                        className={`ml-auto text-xs font-medium ${
                            charCount > MAX_CHARS * 0.9 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                    >
                        {charCount} / {MAX_CHARS}
                    </span>
                </div>
            </div>

            {/* Optional age band + sex */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label
                        htmlFor="age-band"
                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                        Age band <span className="font-normal normal-case">(optional)</span>
                    </label>
                    <div className="relative">
                        <select
                            id="age-band"
                            value={ageBand}
                            onChange={(e) => setAgeBand(e.target.value as AgeBand | '')}
                            disabled={isLoading}
                            className={twMerge(FORM_SELECT_CLASS, 'py-2 text-sm')}
                        >
                            <option value="">Select</option>
                            {AGE_BANDS.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div>
                    <label
                        htmlFor="sex"
                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                        Sex <span className="font-normal normal-case">(optional)</span>
                    </label>
                    <div className="relative">
                        <select
                            id="sex"
                            value={sex}
                            onChange={(e) => setSex(e.target.value as Sex | '')}
                            disabled={isLoading}
                            className={twMerge(FORM_SELECT_CLASS, 'py-2 text-sm')}
                        >
                            <option value="">Select</option>
                            {SEX_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* API error */}
            {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error.message || 'Something went wrong. Please try again.'}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={!isValid || isLoading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-lg shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Checking your symptoms…
                    </>
                ) : (
                    'Continue'
                )}
            </button>
        </form>
    );
}
