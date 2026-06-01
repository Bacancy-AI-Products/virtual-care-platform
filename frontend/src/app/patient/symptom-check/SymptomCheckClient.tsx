'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCw, Stethoscope } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
    symptomChecksApi,
    type AgeBand,
    type Sex,
    type TriageResponse,
    type ClarifyQuestion,
    type CreateSymptomCheckInput,
} from '@/services/api';
import { IntakeStep } from './components/IntakeStep';
import { ClarifyStep } from './components/ClarifyStep';
import { ResultUrgencyBanner } from './components/ResultUrgencyBanner';
import { ResultRecommendation } from './components/ResultRecommendation';
import { ResultPrimaryCTA } from './components/ResultPrimaryCTA';
import { ResultDoctorList } from './components/ResultDoctorList';
import { ResultRefinement } from './components/ResultRefinement';
import { Disclaimer } from './components/Disclaimer';

type Step = 'intake' | 'clarify' | 'result';

export function SymptomCheckClient() {
    const [step, setStep] = React.useState<Step>('intake');
    // Preserved across the clarification round-trip.
    const [symptomsText, setSymptomsText] = React.useState('');
    const [ageBand, setAgeBand] = React.useState<AgeBand | ''>('');
    const [sex, setSex] = React.useState<Sex | ''>('');
    // Populated when the LLM returns the clarify branch.
    const [clarifyQuestions, setClarifyQuestions] = React.useState<ClarifyQuestion[]>([]);
    // Populated when the LLM returns the triage branch.
    const [triageResult, setTriageResult] = React.useState<TriageResponse | null>(null);

    const mutation = useMutation({
        mutationFn: (data: CreateSymptomCheckInput) => symptomChecksApi.create(data),
        onSuccess: (data) => {
            if (data.kind === 'clarify') {
                setClarifyQuestions(data.questions);
                setStep('clarify');
            } else {
                setTriageResult(data);
                setStep('result');
            }
        },
    });

    // ── Step handlers ──────────────────────────────────────────────────────────

    const handleIntakeSubmit = (text: string, band: AgeBand | '', s: Sex | '') => {
        setSymptomsText(text);
        setAgeBand(band);
        setSex(s);
        mutation.mutate({
            symptomsText: text,
            ageBand: band || undefined,
            sex: s || undefined,
        });
    };

    const handleClarifySubmit = (answers: { questionId: string; answer: string }[]) => {
        mutation.mutate({
            symptomsText,
            ageBand: ageBand || undefined,
            sex: sex || undefined,
            clarificationAnswers: answers.length > 0 ? answers : undefined,
        });
    };

    // Called from the result screen when the patient adds more detail.
    // Appends the new text to the original symptoms and re-runs triage in-place
    // (no step transition — the result panel updates when the mutation resolves).
    const handleRefinement = (additionalText: string) => {
        const combined = `${symptomsText}\n\nAdditional context: ${additionalText}`;
        setSymptomsText(combined);
        mutation.mutate({
            symptomsText: combined,
            ageBand: ageBand || undefined,
            sex: sex || undefined,
        });
    };

    const handleStartOver = () => {
        setStep('intake');
        setSymptomsText('');
        setAgeBand('');
        setSex('');
        setClarifyQuestions([]);
        setTriageResult(null);
        mutation.reset();
    };

    // ── Step progress indicator ────────────────────────────────────────────────

    const stepLabels: Record<Step, string> = {
        intake: 'Describe symptoms',
        clarify: 'Quick follow-up',
        result: 'Your result',
    };
    const stepOrder: Step[] = ['intake', 'clarify', 'result'];
    // If we never hit the clarify step (LLM triaged directly), jump from intake → result.
    const visibleSteps: Step[] =
        step === 'result' && clarifyQuestions.length === 0 ? ['intake', 'result'] : stepOrder;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full space-y-6"
        >
            {/* Page header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Stethoscope className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            Symptom Check
                        </h2>
                    </div>
                    <p className="text-sm text-slate-500">
                        AI-assisted intake and routing — not a diagnosis.
                    </p>
                </div>
                {step !== 'intake' && (
                    <button
                        type="button"
                        onClick={handleStartOver}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition-all hover:bg-slate-50 active:scale-95"
                    >
                        <RotateCw className="h-3.5 w-3.5" aria-hidden />
                        Start over
                    </button>
                )}
            </div>

            {/* Step breadcrumb */}
            <div className="flex items-center gap-2">
                {visibleSteps.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`h-2 w-2 rounded-full transition-all ${
                                    s === step
                                        ? 'bg-brand-500 scale-125'
                                        : stepOrder.indexOf(s) < stepOrder.indexOf(step)
                                          ? 'bg-brand-300'
                                          : 'bg-slate-200'
                                }`}
                            />
                            <span
                                className={`text-xs font-semibold ${
                                    s === step ? 'text-brand-600' : 'text-slate-400'
                                }`}
                            >
                                {stepLabels[s]}
                            </span>
                        </div>
                        {i < visibleSteps.length - 1 && (
                            <div className="h-px flex-1 bg-slate-200" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Main card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
                <AnimatePresence mode="wait">
                    {step === 'intake' && (
                        <motion.div
                            key="intake"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25 }}
                        >
                            <IntakeStep
                                onSubmit={handleIntakeSubmit}
                                isLoading={mutation.isPending}
                                error={mutation.isError ? (mutation.error as Error) : null}
                            />
                        </motion.div>
                    )}

                    {step === 'clarify' && (
                        <motion.div
                            key="clarify"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25 }}
                        >
                            <ClarifyStep
                                questions={clarifyQuestions}
                                onSubmit={handleClarifySubmit}
                                isLoading={mutation.isPending}
                                error={mutation.isError ? (mutation.error as Error) : null}
                            />
                        </motion.div>
                    )}

                    {step === 'result' && triageResult && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-5"
                        >
                            <ResultUrgencyBanner urgency={triageResult.urgency} />
                            <ResultRecommendation
                                recommendation={triageResult.recommendation}
                                urgency={triageResult.urgency}
                            />
                            <ResultPrimaryCTA
                                urgency={triageResult.urgency}
                                doctors={triageResult.suggestedDoctors}
                            />
                            <ResultDoctorList doctors={triageResult.suggestedDoctors} />
                            <ResultRefinement
                                onRefinement={handleRefinement}
                                isLoading={mutation.isPending}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Persistent disclaimer — shown on every step */}
            <Disclaimer />
        </motion.div>
    );
}
