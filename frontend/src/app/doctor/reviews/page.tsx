'use client';

import React from 'react';
import { format } from 'date-fns';
import { MessageSquare, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, reviewsApi, type DoctorReview, type ReviewsSummary } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { RatingStars } from '@/components/ui/RatingStars';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

type RatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;
const PAGE_SIZE = 20;

export default function DoctorReviewsPage() {
    const { token, user } = useAuth();
    const [filter, setFilter] = React.useState<RatingFilter>('all');

    const {
        data: profile,
        isLoading: profileLoading,
        isFetching: profileFetching,
        isError: profileError,
    } = useQuery({
        queryKey: ['doctor', 'me'],
        queryFn: () => doctorsApi.getMe(),
        enabled: !!token && user?.role === 'DOCTOR',
    });

    const doctorId = profile?.id;

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ['doctor', doctorId, 'reviews', 'all'],
        queryFn: () => reviewsApi.listByDoctor(doctorId!, { page: 1, limit: PAGE_SIZE }),
        enabled: !!doctorId,
    });

    const showLoader =
        profileLoading ||
        (profileFetching && !profile) ||
        isLoading ||
        (isFetching && !data) ||
        !profile;
    const showError = !showLoader && ((profileError && !profile) || (isError && !data));

    const summary = data?.summary;
    const allReviews = data?.data ?? [];
    const filtered = filter === 'all' ? allReviews : allReviews.filter((r) => r.rating === filter);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 sm:space-y-8"
        >
            <div>
                <h2 className="mb-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    Patient reviews
                </h2>
                <p className="text-slate-500 font-medium text-sm sm:text-base">
                    What patients say after a consultation with you.
                </p>
            </div>

            {showLoader && <LoadingState message="Loading reviews…" />}

            {showError && (
                <ErrorState message="Failed to load your reviews. Try again in a moment." />
            )}

            {!showLoader && !showError && summary && summary.reviewCount === 0 && (
                <EmptyState
                    icon={<MessageSquare className="w-12 h-12 text-slate-300" />}
                    title="No reviews yet"
                    message="Patients can leave a review after a completed consultation. Yours will appear here."
                />
            )}

            {!showLoader && !showError && summary && summary.reviewCount > 0 && (
                <>
                    <SummaryCard summary={summary} />

                    <RatingFilterRow
                        filter={filter}
                        onChange={setFilter}
                        distribution={summary.distribution}
                    />

                    {filtered.length === 0 ? (
                        <EmptyState
                            icon={<Star className="w-12 h-12 text-slate-300" />}
                            title="No reviews at this rating"
                            message="Try a different filter."
                        />
                    ) : (
                        <ul className="space-y-3 sm:space-y-4">
                            {filtered.map((r) => (
                                <ReviewRow key={r.id} review={r} />
                            ))}
                        </ul>
                    )}
                </>
            )}
        </motion.div>
    );
}

function SummaryCard({ summary }: { summary: ReviewsSummary }) {
    const max = Math.max(1, ...Object.values(summary.distribution));
    const avg = summary.averageRating ?? 0;

    return (
        <div className="grid sm:grid-cols-[220px_1fr] gap-6 sm:gap-8 items-start bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="text-center sm:text-left">
                <p className="text-4xl sm:text-5xl font-bold text-slate-900 leading-none">
                    {avg.toFixed(1)}
                </p>
                <div className="mt-2">
                    <RatingStars value={avg} size="md" />
                </div>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                    Based on {summary.reviewCount.toLocaleString()} review
                    {summary.reviewCount === 1 ? '' : 's'}
                </p>
            </div>
            <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5];
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-3 font-bold text-slate-500">{star}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="w-8 text-right font-semibold text-slate-500">
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RatingFilterRow({
    filter,
    onChange,
    distribution,
}: {
    filter: RatingFilter;
    onChange: (f: RatingFilter) => void;
    distribution: ReviewsSummary['distribution'];
}) {
    const total = Object.values(distribution).reduce((s, c) => s + c, 0);
    const options: Array<{ label: string; value: RatingFilter; count: number }> = [
        { label: 'All', value: 'all', count: total },
        { label: '5★', value: 5, count: distribution[5] },
        { label: '4★', value: 4, count: distribution[4] },
        { label: '3★', value: 3, count: distribution[3] },
        { label: '2★', value: 2, count: distribution[2] },
        { label: '1★', value: 1, count: distribution[1] },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {options.map((o) => {
                const active = filter === o.value;
                const disabled = o.count === 0 && o.value !== 'all';
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        onClick={() => onChange(o.value)}
                        disabled={disabled}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                            active
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-100'
                                : disabled
                                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {o.label}
                        <span
                            className={`${active ? 'text-white/80' : 'text-slate-400'} font-semibold`}
                        >
                            ({o.count})
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function ReviewRow({ review }: { review: DoctorReview }) {
    const initials = review.patient.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <li className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 sm:px-6 py-4 sm:py-5">
            <div className="flex gap-4">
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-sm">
                    {initials || '?'}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm sm:text-base font-bold text-slate-900">
                            {review.patient.name}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                            {format(new Date(review.createdAt), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div className="mt-1">
                        <RatingStars value={review.rating} size="sm" />
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
