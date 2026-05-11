'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ChevronLeft, CheckCircle2, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { appointmentsApi, reviewsApi } from '@/services/api';
import { RatingStarsInput, RatingStars } from '@/components/ui/RatingStars';
import { FORM_CONTROL_GHOST, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

export default function ReviewAppointmentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const qClient = useQueryClient();

    const {
        data: appointment,
        isLoading: loadingAppt,
        isError: errorAppt,
    } = useQuery({
        queryKey: ['appointment', id],
        queryFn: () => appointmentsApi.getById(id),
        enabled: !!id,
    });

    const { data: existing, isLoading: loadingExisting } = useQuery({
        queryKey: ['appointment', id, 'review'],
        queryFn: () => reviewsApi.getForAppointment(id),
        enabled: !!id,
    });

    const [rating, setRating] = React.useState<number>(0);
    const [comment, setComment] = React.useState('');
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    const submitMutation = useMutation({
        mutationFn: () => reviewsApi.create(id, { rating, comment: comment.trim() || null }),
        onSuccess: () => {
            qClient.invalidateQueries({ queryKey: ['appointment', id, 'review'] });
            qClient.invalidateQueries({ queryKey: ['doctor'] });
            if (appointment?.doctor.id) {
                qClient.invalidateQueries({
                    queryKey: ['doctor', appointment.doctor.id, 'reviews'],
                });
            }
            router.push('/patient/appointments');
        },
        onError: (err: Error) => setSubmitError(err.message),
    });

    if (loadingAppt || loadingExisting) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (errorAppt || !appointment) {
        return (
            <div className="max-w-xl mx-auto py-12">
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Appointment not found
                    </h2>
                    <p className="text-slate-500 font-medium mb-8">
                        We couldn&apos;t load this appointment. It may have been removed.
                    </p>
                    <Link
                        href="/patient/appointments"
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                    >
                        <ChevronLeft className="w-5 h-5" /> Back to appointments
                    </Link>
                </div>
            </div>
        );
    }

    const canReview = appointment.status === 'COMPLETED' && !existing?.data;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto w-full space-y-6"
        >
            <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-bold group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back
            </button>

            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] lg:rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                        {existing?.data ? 'Your review' : 'How was your consultation?'}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        with{' '}
                        <span className="font-bold text-slate-900">
                            {appointment.doctor.user.name}
                        </span>{' '}
                        on {format(new Date(appointment.scheduledAt), 'MMM d, yyyy')}
                    </p>
                </div>

                {existing?.data ? (
                    <SubmittedReview
                        rating={existing.data.rating}
                        comment={existing.data.comment}
                        createdAt={existing.data.createdAt}
                    />
                ) : appointment.status !== 'COMPLETED' ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        You can only review a consultation once it has been marked completed.
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setSubmitError(null);
                            if (rating < 1) {
                                setSubmitError('Please select a star rating.');
                                return;
                            }
                            submitMutation.mutate();
                        }}
                        className="space-y-6"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-3">
                                Tap a star to rate your experience
                            </p>
                            <RatingStarsInput
                                value={rating}
                                onChange={setRating}
                                disabled={submitMutation.isPending}
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
                                rows={5}
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

                        {submitError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl text-red-500 text-sm font-medium">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {submitError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!canReview || rating < 1 || submitMutation.isPending}
                            className="w-full py-4 rounded-2xl font-bold text-base bg-brand-500 text-white shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {submitMutation.isPending ? (
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
                )}
            </div>
        </motion.div>
    );
}

function SubmittedReview({
    rating,
    comment,
    createdAt,
}: {
    rating: number;
    comment: string | null;
    createdAt: string;
}) {
    return (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 px-5 py-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Review submitted
            </div>
            <div>
                <RatingStars value={rating} size="lg" showValue />
                <p className="mt-1 text-xs font-semibold text-emerald-700/70">
                    Posted {format(new Date(createdAt), 'MMM d, yyyy')}
                </p>
            </div>
            {comment && (
                <p className="text-sm text-emerald-900 leading-relaxed italic">“{comment}”</p>
            )}
            <p className="text-xs font-medium text-emerald-700/70">
                Thanks for sharing — your feedback helps other patients choose the right doctor.
            </p>
        </div>
    );
}
