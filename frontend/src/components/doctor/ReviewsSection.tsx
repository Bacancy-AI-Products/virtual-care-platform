'use client';

import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reviewsApi, type DoctorReview, type ReviewsSummary } from '@/services/api';
import { RatingStars } from '@/components/ui/RatingStars';
import { EmptyState } from '@/components/ui/EmptyState';
import { useScrollToTopOnPageChange } from '@/hooks/useScrollToTopOnPageChange';

const PAGE_SIZE = 5;

interface ReviewsSectionProps {
    doctorId: string;
}

/**
 * Patient-facing reviews block: aggregate header + paginated review list.
 * Designed for both the public and patient-side doctor profile pages.
 */
export function ReviewsSection({ doctorId }: ReviewsSectionProps) {
    const [page, setPage] = React.useState(1);
    const sectionRef = React.useRef<HTMLDivElement>(null);
    useScrollToTopOnPageChange(page, sectionRef);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['doctor', doctorId, 'reviews', page],
        queryFn: () => reviewsApi.listByDoctor(doctorId, { page, limit: PAGE_SIZE }),
    });

    const reviews = data?.data ?? [];
    const summary = data?.summary;
    const total = data?.total ?? 0;
    const hasMore = page * PAGE_SIZE < total;
    const hasPrev = page > 1;

    return (
        <div
            ref={sectionRef}
            className="bg-white p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] lg:rounded-[48px] border border-slate-100 shadow-sm space-y-6 sm:space-y-8"
        >
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Patient reviews</h2>
                {summary && summary.reviewCount > 0 && (
                    <span className="text-sm font-semibold text-slate-400">
                        {summary.reviewCount.toLocaleString()} total
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
            )}

            {!isLoading && isError && (
                <p className="text-sm text-red-500 font-medium">
                    Couldn&apos;t load reviews. Try again in a moment.
                </p>
            )}

            {!isLoading && !isError && summary && summary.reviewCount === 0 && (
                <EmptyState
                    icon={<MessageSquare className="w-10 h-10 text-slate-300" />}
                    title="No reviews yet"
                    message="This doctor hasn't received any patient reviews yet. Be the first after your consultation."
                />
            )}

            {!isLoading && !isError && summary && summary.reviewCount > 0 && (
                <>
                    <SummaryBar summary={summary} />
                    <ul className="space-y-5">
                        {reviews.map((r) => (
                            <ReviewItem key={r.id} review={r} />
                        ))}
                    </ul>

                    {(hasPrev || hasMore) && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={!hasPrev}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <p className="text-sm font-medium text-slate-500">
                                Showing {(page - 1) * PAGE_SIZE + 1}–
                                {Math.min(page * PAGE_SIZE, total)} of {total}
                            </p>
                            <button
                                type="button"
                                onClick={() => setPage((p) => p + 1)}
                                disabled={!hasMore}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SummaryBar({ summary }: { summary: ReviewsSummary }) {
    const max = Math.max(1, ...Object.values(summary.distribution));
    const avg = summary.averageRating ?? 0;
    return (
        <div className="grid sm:grid-cols-[200px_1fr] gap-6 sm:gap-8 items-start bg-slate-50 rounded-3xl p-5 sm:p-6">
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
            <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star as 1 | 2 | 3 | 4 | 5];
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-3 font-bold text-slate-500">{star}</span>
                            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
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

function ReviewItem({ review }: { review: DoctorReview }) {
    const initials = review.patient.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    return (
        <li className="flex gap-4 border-b border-slate-100 last:border-b-0 pb-5 last:pb-0">
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
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                )}
            </div>
        </li>
    );
}
