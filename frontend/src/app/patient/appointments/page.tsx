'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    Calendar,
    Clock,
    Video,
    MoreVertical,
    AlertCircle,
    Plus,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    type Appointment,
    type SpecializationOption,
} from '@/services/api';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useScrollToTopOnPageChange } from '@/hooks/useScrollToTopOnPageChange';

const PAGE_SIZE = 6;

/** Compact pagination: all pages if ≤9, otherwise 1 … window … last. */
function getPaginationItems(totalPages: number, currentPage: number): Array<number | 'ellipsis'> {
    if (totalPages <= 1) return [];
    if (totalPages <= 9) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
        if (i >= 1 && i <= totalPages) pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const out: Array<number | 'ellipsis'> = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            out.push('ellipsis');
        }
        out.push(sorted[i]);
    }
    return out;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type Tab = 'Upcoming' | 'Past' | 'Cancelled';

function getTab(status: string): Tab {
    if (status === 'PENDING' || status === 'CONFIRMED') return 'Upcoming';
    if (status === 'COMPLETED' || status === 'NO_SHOW') return 'Past';
    return 'Cancelled';
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string; className: string }> = {
        PENDING: {
            label: 'Awaiting Confirmation',
            className: 'bg-amber-50 text-amber-600 border border-amber-200',
        },
        CONFIRMED: {
            label: 'Confirmed',
            className: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        },
        COMPLETED: {
            label: 'Completed',
            className: 'bg-slate-50 text-slate-500 border border-slate-200',
        },
        NO_SHOW: {
            label: 'No Show',
            className: 'bg-orange-50 text-orange-600 border border-orange-200',
        },
        CANCELLED_BY_PATIENT: {
            label: 'Cancelled',
            className: 'bg-red-50 text-red-500 border border-red-200',
        },
        CANCELLED_BY_DOCTOR: {
            label: 'Declined by Doctor',
            className: 'bg-red-50 text-red-500 border border-red-200',
        },
    };
    const cfg = configs[status] ?? {
        label: status,
        className: 'bg-slate-50 text-slate-500 border border-slate-200',
    };
    return (
        <span
            className={`inline-flex max-w-full items-center justify-center whitespace-normal break-words rounded-full px-3 py-1 text-center text-xs font-bold ${cfg.className}`}
        >
            {cfg.label}
        </span>
    );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function AppointmentCard({
    appt,
    specializationLabel,
    onCancel,
    cancelling,
}: {
    appt: Appointment;
    specializationLabel: string;
    onCancel: () => void;
    cancelling: boolean;
}) {
    const isUpcoming = getTab(appt.status) === 'Upcoming';

    return (
        <div className="group flex min-w-0 flex-col gap-4 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-6 lg:grid lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-8 lg:py-6 xl:gap-8">
            {/* Doctor */}
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <img
                    src={`https://i.pravatar.cc/150?u=${appt.doctor.user.id}`}
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm sm:h-14 sm:w-14"
                    alt={appt.doctor.user.name}
                    referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                    <h4 className="truncate text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-brand-600">
                        {appt.doctor.user.name}
                    </h4>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{specializationLabel}</p>
                    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600 sm:px-3 sm:text-xs">
                        <Video className="h-3 w-3 shrink-0" />
                        <span className="truncate">Video Consultation</span>
                    </div>
                </div>
            </div>

            {/* Date / time / status / reason — stack on mobile; single row on lg via lg:contents */}
            <div className="min-w-0 border-t border-slate-100 pt-4 lg:flex lg:items-center lg:gap-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 xl:gap-8">
                <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:contents">
                    <div className="min-w-0 lg:w-[130px] lg:shrink-0">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <Calendar className="h-3.5 w-3.5 shrink-0" /> Date
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                            {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                        </p>
                    </div>

                    <div className="min-w-0 lg:w-[110px] lg:shrink-0">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <Clock className="h-3.5 w-3.5 shrink-0" /> Time
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </p>
                    </div>

                    <div className="col-span-2 min-w-0 lg:col-span-1 lg:w-[190px] lg:shrink-0">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Status
                        </p>
                        <div className="min-w-0">
                            <StatusBadge status={appt.status} />
                        </div>
                    </div>

                    <div className="col-span-2 min-w-0 lg:col-span-1 lg:flex-1">
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                                ? "Doctor's Reason"
                                : '\u00A0'}
                        </p>
                        <p className="text-sm italic leading-snug text-slate-600 break-words">
                            {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                                ? `"${appt.declineReason}"`
                                : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 lg:justify-end">
                {appt.status === 'CONFIRMED' && (
                    <Link
                        href={`/patient/consultation/${appt.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 sm:flex-initial sm:px-5"
                    >
                        <Video className="h-4 w-4 shrink-0" /> Join Call
                    </Link>
                )}
                {appt.status === 'COMPLETED' && (
                    <Link
                        href={`/patient/appointments/${appt.id}/review`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition-all hover:bg-amber-100 active:scale-95 sm:flex-initial sm:px-5"
                    >
                        <Star className="h-4 w-4 shrink-0" /> Rate visit
                    </Link>
                )}
                {appt.status === 'PENDING' && (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-600">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />{' '}
                        <span className="min-w-0 sm:whitespace-nowrap">Awaiting confirmation</span>
                    </span>
                )}
                {isUpcoming && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={cancelling}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-red-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                        {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
                    </button>
                )}
                <button
                    type="button"
                    className="rounded-xl p-2.5 text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-500"
                    aria-label="More options"
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ['Upcoming', 'Past', 'Cancelled'];

export default function PatientAppointments() {
    const qClient = useQueryClient();
    const [activeTab, setActiveTab] = React.useState<Tab>('Upcoming');
    const [cancellingId, setCancellingId] = React.useState<string | null>(null);
    const [page, setPage] = React.useState(1);
    useScrollToTopOnPageChange(page);

    const { data: specializationData } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const specializationNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        specializationData?.data.forEach((s: SpecializationOption) => {
            map.set(s.id, s.name);
        });
        return map;
    }, [specializationData]);

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ['appointments', 'patient', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
    });

    const showLoader = isLoading || (isFetching && !data);
    const showError = !showLoader && isError && !data;

    const cancelMutation = useMutation({
        mutationFn: (id: string) => appointmentsApi.cancel(id),
        onMutate: (id) => setCancellingId(id),
        onSettled: () => setCancellingId(null),
        onSuccess: () =>
            qClient.invalidateQueries({ queryKey: ['appointments', 'patient', 'all'] }),
        onError: (err: Error) => alert(err.message),
    });

    const all = data?.data ?? [];
    const filtered = all.filter((a) => getTab(a.status) === activeTab);
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const paginationItems = React.useMemo(
        () => getPaginationItems(totalPages, page),
        [totalPages, page],
    );

    React.useEffect(() => {
        setPage(1);
    }, [activeTab]);

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full min-w-0 space-y-6 sm:space-y-8"
        >
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h2 className="mb-1.5 text-xl font-bold tracking-tight text-slate-900 sm:mb-2 sm:text-2xl">
                        My Appointments
                    </h2>
                    <p className="text-sm font-medium text-slate-500 sm:text-base">
                        Keep track of your upcoming and past consultations.
                    </p>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <Link
                        href="/patient/doctors"
                        className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-xl shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 sm:w-auto"
                    >
                        <Plus className="h-5 w-5 shrink-0" /> Book New Appointment
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="no-scrollbar -mx-1 flex min-w-0 items-center gap-4 overflow-x-auto border-b border-slate-200 px-1 pb-px sm:gap-8">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative shrink-0 whitespace-nowrap pb-4 text-sm font-bold transition-all ${
                            activeTab === tab
                                ? 'text-brand-600'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {showLoader && <LoadingState message="Loading appointments…" />}

            {showError && <ErrorState message="Failed to load appointments." />}

            {!showLoader && !showError && (
                <div className="space-y-4">
                    <div className="grid gap-6">
                        {filtered.length === 0 ? (
                            <div className="p-16 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 font-medium mb-4">
                                    No {activeTab.toLowerCase()} appointments.
                                </p>
                                {activeTab === 'Upcoming' && (
                                    <Link
                                        href="/patient/doctors"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Book one now
                                    </Link>
                                )}
                            </div>
                        ) : (
                            visible.map((appt) => (
                                <AppointmentCard
                                    key={appt.id}
                                    appt={appt}
                                    specializationLabel={
                                        specializationNameById.get(appt.doctor.specialization) ??
                                        appt.doctor.specialization
                                    }
                                    onCancel={() => cancelMutation.mutate(appt.id)}
                                    cancelling={cancellingId === appt.id}
                                />
                            ))
                        )}
                    </div>
                    {filtered.length > 0 && totalPages > 1 && (
                        <nav
                            className="flex flex-col items-stretch gap-4 border-t border-slate-100 pt-6"
                            aria-label="Pagination"
                        >
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
                                <p className="order-2 text-sm text-slate-500 sm:order-1">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="order-1 flex items-center gap-2 sm:order-2">
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-4 w-4" aria-hidden />
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" aria-hidden />
                                    </button>
                                </div>
                            </div>
                            <div
                                className="flex flex-wrap items-center justify-center gap-1.5"
                                role="group"
                                aria-label="Go to page"
                            >
                                {paginationItems.map((item, idx) =>
                                    item === 'ellipsis' ? (
                                        <span
                                            key={`e-${idx}`}
                                            className="px-1.5 py-2 text-sm font-semibold text-slate-400"
                                            aria-hidden
                                        >
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setPage(item)}
                                            aria-current={page === item ? 'page' : undefined}
                                            className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition-all ${
                                                page === item
                                                    ? 'bg-brand-500 text-white shadow-brand-100 ring-2 ring-brand-500/20'
                                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    ),
                                )}
                            </div>
                        </nav>
                    )}
                </div>
            )}
        </motion.div>
    );
}
