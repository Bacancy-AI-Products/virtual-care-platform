'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Heart,
    Loader2,
    MessageSquare,
    Send,
    Sparkles,
    Stethoscope,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, reviewsApi, type Appointment, type MyReview } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { RatingStars, RatingStarsInput } from '@/components/ui/RatingStars';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FORM_CONTROL_GHOST, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

export default function PatientFeedbackPage() {
    const { token, user } = useAuth();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const {
        data: apptData,
        isLoading: loadingAppts,
        isError: errorAppts,
    } = useQuery({
        queryKey: ['appointments', 'patient', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 200 }),
        enabled: !!token && user?.role === 'PATIENT',
    });

    const {
        data: myReviewsData,
        isLoading: loadingReviews,
        isError: errorReviews,
    } = useQuery({
        queryKey: ['reviews', 'mine'],
        queryFn: () => reviewsApi.getMine({ limit: 100 }),
        enabled: !!token && user?.role === 'PATIENT',
    });

    const completed = React.useMemo(
        () => (apptData?.data ?? []).filter((a) => a.status === 'COMPLETED'),
        [apptData],
    );

    const reviewedIds = React.useMemo(
        () => new Set((myReviewsData?.data ?? []).map((r) => r.appointmentId)),
        [myReviewsData],
    );

    const pending = React.useMemo(
        () =>
            [...completed]
                .filter((a) => !reviewedIds.has(a.id))
                .sort(
                    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
                ),
        [completed, reviewedIds],
    );

    const headlineUnreviewed = pending[0] ?? null;
    const otherPending = pending.slice(1);
    const myReviews = myReviewsData?.data ?? [];

    if (!mounted || loadingAppts || loadingReviews) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (errorAppts || errorReviews) {
        return (
            <div className="py-10">
                <ErrorState message="Failed to load your feedback. Try again in a moment." />
            </div>
        );
    }

    const totalDone = completed.length;
    const totalSubmitted = myReviews.length;
    const avgGiven =
        myReviews.length > 0
            ? myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length
            : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 sm:space-y-8"
        >
            <FeedbackHero
                totalDone={totalDone}
                totalSubmitted={totalSubmitted}
                pendingCount={pending.length}
                avgGiven={avgGiven}
            />

            {headlineUnreviewed ? (
                <FeedbackForm appointment={headlineUnreviewed} />
            ) : completed.length > 0 ? (
                <AllCaughtUpCard />
            ) : (
                <NoVisitsYetCard />
            )}

            {otherPending.length > 0 && <OtherPendingCard appointments={otherPending} />}

            {myReviews.length > 0 && <MyReviewsCard reviews={myReviews} />}
        </motion.div>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function FeedbackHero({
    totalDone,
    totalSubmitted,
    pendingCount,
    avgGiven,
}: {
    totalDone: number;
    totalSubmitted: number;
    pendingCount: number;
    avgGiven: number | null;
}) {
    return (
        <div className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 text-white shadow-lg shadow-brand-100">
            <svg
                className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 sm:w-60 sm:h-60 opacity-25"
                viewBox="0 0 200 200"
                aria-hidden
            >
                <defs>
                    <radialGradient id="fbGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="90" fill="url(#fbGlow)" />
            </svg>

            <div className="relative p-4 sm:p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Your feedback
                    </p>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight leading-tight">
                        Your voice shapes better care
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-white/85">
                        Reviews help others choose &amp; give doctors useful signal
                        {avgGiven != null && (
                            <>
                                {' · '}
                                <span className="inline-flex items-center gap-1 font-bold">
                                    <Heart className="w-3 h-3" /> You give {avgGiven.toFixed(1)}/5
                                </span>
                            </>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <HeroMini label="Visits" value={totalDone.toString()} />
                    <HeroMini label="Reviewed" value={totalSubmitted.toString()} />
                    <HeroMini
                        label="To review"
                        value={pendingCount.toString()}
                        accent={pendingCount > 0}
                    />
                </div>
            </div>
        </div>
    );
}

function HeroMini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div
            className={`flex-1 sm:flex-initial rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 border ${accent ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/15'} backdrop-blur-md min-w-0`}
        >
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/70 truncate">
                {label}
            </p>
            <p className="text-lg sm:text-xl font-bold leading-none mt-0.5">{value}</p>
        </div>
    );
}

// ─── Inline feedback form ─────────────────────────────────────────────────────

function FeedbackForm({ appointment }: { appointment: Appointment }) {
    const qClient = useQueryClient();
    const [rating, setRating] = React.useState(0);
    const [comment, setComment] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);

    const mutation = useMutation({
        mutationFn: () =>
            reviewsApi.create(appointment.id, {
                rating,
                comment: comment.trim() || null,
            }),
        onSuccess: () => {
            setSuccess(true);
            setError(null);
            qClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
            qClient.invalidateQueries({ queryKey: ['doctor', appointment.doctor.id] });
        },
        onError: (err: Error) => setError(err.message),
    });

    if (success) {
        return (
            <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-emerald-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm mb-2">
                    <CheckCircle2 className="w-5 h-5" /> Thanks — your review is in
                </div>
                <p className="text-sm text-slate-600">
                    {appointment.doctor.user.name} will see your feedback in their reviews inbox.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 bg-amber-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700/80">
                            How was your last visit?
                        </p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            with {appointment.doctor.user.name}
                        </p>
                    </div>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 font-medium flex-shrink-0">
                    {format(new Date(appointment.scheduledAt), 'MMM d, yyyy')}
                </p>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setError(null);
                    if (rating < 1) {
                        setError('Please pick a star rating.');
                        return;
                    }
                    mutation.mutate();
                }}
                className="p-5 sm:p-8 space-y-5"
            >
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-3">
                        Tap a star to rate your experience
                    </p>
                    <RatingStarsInput
                        value={rating}
                        onChange={setRating}
                        disabled={mutation.isPending}
                    />
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                        {rating === 0
                            ? 'No rating selected'
                            : rating <= 2
                              ? 'Could be better'
                              : rating === 3
                                ? 'Good'
                                : rating === 4
                                  ? 'Very good'
                                  : 'Excellent'}
                    </p>
                </div>

                <div>
                    <p className="text-sm font-bold text-slate-700 mb-2">
                        Share a few words{' '}
                        <span className="font-medium text-slate-400">(optional)</span>
                    </p>
                    <textarea
                        rows={4}
                        placeholder="What worked well? What could have been better? Be respectful — your review is public."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={2000}
                        className={`${FORM_CONTROL_GHOST} resize-none`}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                    <p className="mt-1 text-xs text-slate-400 font-medium text-right">
                        {comment.length}/2000
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl text-red-500 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={rating < 1 || mutation.isPending}
                    className="w-full py-4 rounded-2xl font-bold text-base bg-brand-500 text-white shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {mutation.isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" /> Submit review
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

// ─── Empty / caught-up cards ──────────────────────────────────────────────────

function AllCaughtUpCard() {
    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-emerald-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-7">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1 text-center sm:text-left">
                <p className="text-base sm:text-lg font-bold text-slate-900">
                    All caught up — thank you!
                </p>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                    You&apos;ve reviewed every consultation. New visits will appear here once they
                    wrap up.
                </p>
            </div>
        </div>
    );
}

function NoVisitsYetCard() {
    return (
        <EmptyState
            icon={<Stethoscope className="w-12 h-12 text-slate-300" />}
            title="No consultations yet"
            message="Once you complete a video consultation, you'll be able to share feedback here."
        >
            <Link
                href="/patient/doctors"
                className="inline-flex items-center gap-2 mt-3 px-5 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all"
            >
                Find a doctor <ArrowRight className="w-4 h-4" />
            </Link>
        </EmptyState>
    );
}

// ─── Other pending reviews ────────────────────────────────────────────────────

function OtherPendingCard({ appointments }: { appointments: Appointment[] }) {
    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Awaiting your feedback
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        Other completed visits
                    </h3>
                </div>
                <span className="rounded-full bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 text-xs font-bold">
                    {appointments.length} pending
                </span>
            </div>

            <ul className="divide-y divide-slate-100">
                {appointments.map((a) => {
                    const initials = a.doctor.user.name
                        .replace(/^Dr\.?\s*/, '')
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase();
                    return (
                        <li key={a.id} className="py-3 flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {initials || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {a.doctor.user.name}
                                </p>
                                <p className="text-xs text-slate-500 font-medium truncate">
                                    {a.doctor.specialization} ·{' '}
                                    {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <Link
                                href={`/patient/appointments/${a.id}/review`}
                                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all"
                            >
                                Rate visit <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ─── Submitted reviews ────────────────────────────────────────────────────────

function MyReviewsCard({ reviews }: { reviews: MyReview[] }) {
    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Submitted
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Your reviews</h3>
                </div>
                <span className="rounded-full bg-brand-50 text-brand-600 border border-brand-100 px-2.5 py-1 text-xs font-bold">
                    {reviews.length} total
                </span>
            </div>

            <ul className="space-y-3 sm:space-y-4">
                {reviews.map((r) => (
                    <MyReviewRow key={r.id} review={r} />
                ))}
            </ul>
        </div>
    );
}

function MyReviewRow({ review }: { review: MyReview }) {
    const initials = review.doctor.name
        .replace(/^Dr\.?\s*/, '')
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    return (
        <li className="rounded-3xl border border-slate-100 bg-slate-50/40 p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                {review.doctor.name}
                            </p>
                            <p className="text-xs text-slate-500 font-medium truncate">
                                {review.doctor.specialization} · Visit{' '}
                                {format(new Date(review.visitDate), 'MMM d, yyyy')}
                            </p>
                        </div>
                        <p className="text-xs text-slate-400 font-medium flex-shrink-0">
                            Posted {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div className="mt-1.5">
                        <RatingStars value={review.rating} size="sm" showValue />
                    </div>
                    {review.comment && (
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                            {review.comment}
                        </p>
                    )}
                </div>
            </div>
        </li>
    );
}
