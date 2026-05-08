'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    Calendar,
    Clock,
    Video,
    CheckCircle2,
    XCircle,
    Loader2,
    ClockIcon,
    PhoneCall,
    AlertTriangle,
    RotateCw,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, type Appointment } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

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

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'Upcoming' | 'Past' | 'Cancelled';

function getTab(status: string): Tab {
    if (status === 'PENDING' || status === 'CONFIRMED') return 'Upcoming';
    if (status === 'COMPLETED' || status === 'NO_SHOW') return 'Past';
    return 'Cancelled';
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string; className: string }> = {
        PENDING: {
            label: 'Awaiting Response',
            className: 'bg-amber-50 text-amber-600 border border-amber-200',
        },
        CONFIRMED: {
            label: 'Confirmed',
            className: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
        },
        COMPLETED: {
            label: 'Completed',
            className: 'bg-slate-50 text-slate-600 border border-slate-200',
        },
        NO_SHOW: {
            label: 'No Show',
            className: 'bg-orange-50 text-orange-600 border border-orange-200',
        },
        CANCELLED_BY_PATIENT: {
            label: 'Cancelled by Patient',
            className: 'bg-red-50 text-red-500 border border-red-200',
        },
        CANCELLED_BY_DOCTOR: {
            label: 'Declined',
            className: 'bg-red-50 text-red-500 border border-red-200',
        },
    };
    const cfg = configs[status] ?? {
        label: status,
        className: 'bg-slate-50 text-slate-500 border border-slate-200',
    };
    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cfg.className}`}
        >
            {cfg.label}
        </span>
    );
}

// ─── Decline reason modal ─────────────────────────────────────────────────────

function DeclineModal({
    patient,
    onConfirm,
    onCancel,
    loading,
}: {
    patient: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [reason, setReason] = React.useState('');
    const trimmed = reason.trim();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2 }}
                className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8 z-10"
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-6 mx-auto">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                    Decline Appointment
                </h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                    You're declining <span className="font-semibold text-slate-700">{patient}</span>
                    's request. Please provide a reason so they can find alternative care.
                </p>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Reason for declining <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. I'm not available at this time, please rebook for another slot…"
                        rows={4}
                        className="w-full rounded-xl px-3 py-2 border border-slate-200 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none transition-all"
                        maxLength={500}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                    <p className="text-xs text-slate-400 text-right mt-1">{reason.length}/500</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(trimmed)}
                        disabled={loading || !trimmed}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        Decline Request
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Request card (PENDING — Accept / Decline) ────────────────────────────────

function RequestCard({
    appt,
    onAccept,
    onDecline,
    accepting,
    declining,
}: {
    appt: Appointment;
    onAccept: () => void;
    onDecline: () => void;
    accepting: boolean;
    declining: boolean;
}) {
    const busy = accepting || declining;
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white rounded-[28px] border border-amber-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
        >
            {/* Amber top strip */}
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Patient info */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img
                            src={`https://picsum.photos/seed/${appt.patient.user.id}/100/100`}
                            className="w-14 h-14 rounded-2xl object-cover shadow-sm"
                            alt={appt.patient.user.name}
                            referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-0.5">
                            New Request
                        </p>
                        <h4 className="text-base font-bold text-slate-900">
                            {appt.patient.user.name}
                        </h4>
                        <p className="text-xs text-slate-400">{appt.patient.user.email}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Date
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Time
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" /> Duration
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {appt.durationMinutes} min
                        </p>
                    </div>
                    {appt.reason && (
                        <div className="max-w-[200px]">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Reason
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-2">{appt.reason}</p>
                        </div>
                    )}
                </div>

                {/* Accept / Decline */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={onAccept}
                        disabled={busy}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {accepting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        Accept
                    </button>
                    <button
                        onClick={onDecline}
                        disabled={busy}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {declining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <XCircle className="w-4 h-4" />
                        )}
                        Decline
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Scheduled card (CONFIRMED — Start Call / Cancel) ─────────────────────────

function ScheduledCard({
    appt,
    onCancel,
    cancelling,
}: {
    appt: Appointment;
    onCancel: () => void;
    cancelling: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
        >
            <div className="h-1 bg-gradient-to-r from-brand-400 to-indigo-400" />

            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Patient info */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img
                            src={`https://picsum.photos/seed/${appt.patient.user.id}/100/100`}
                            className="w-14 h-14 rounded-2xl object-cover shadow-sm"
                            alt={appt.patient.user.name}
                            referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-0.5">
                            Scheduled
                        </p>
                        <h4 className="text-base font-bold text-slate-900">
                            {appt.patient.user.name}
                        </h4>
                        <p className="text-xs text-slate-400">{appt.patient.user.email}</p>
                    </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Date
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Time
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Status
                        </p>
                        <StatusBadge status={appt.status} />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                        href={`/doctor/consultation/${appt.id}`}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-brand-100"
                    >
                        <Video className="w-4 h-4" /> Start Call
                    </Link>
                    <button
                        onClick={onCancel}
                        disabled={cancelling}
                        className="px-4 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold border border-slate-100 disabled:opacity-50"
                    >
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Read-only card (Past / Cancelled) ────────────────────────────────────────

function ReadOnlyCard({ appt }: { appt: Appointment }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white px-5 py-5 sm:px-8 sm:py-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center opacity-75"
        >
            {/* Patient info – fixed 260px */}
            <div className="flex items-center gap-4 min-w-0">
                <img
                    src={`https://picsum.photos/seed/${appt.patient.user.id}/100/100`}
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm grayscale flex-shrink-0"
                    alt={appt.patient.user.name}
                    referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-600 truncate leading-snug">
                        {appt.patient.user.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5 mb-2">
                        {appt.patient.user.email}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                        <Video className="w-3 h-3" /> Video Consultation
                    </div>
                </div>
            </div>

            {/* Info columns */}
            <div className="flex flex-wrap gap-4 sm:gap-6 md:flex-nowrap md:items-center md:border-l md:border-slate-100 md:pl-8">
                <div className="w-1/2 min-w-[140px] sm:w-auto">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date
                    </p>
                    <p className="text-sm font-bold text-slate-500">
                        {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                    </p>
                </div>
                <div className="w-1/2 min-w-[120px] sm:w-auto">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <Clock className="w-3.5 h-3.5" /> Time
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                        {format(new Date(appt.scheduledAt), 'hh:mm a')}{' '}
                        <span className="text-xs font-semibold text-slate-400">
                            ({appt.durationMinutes} min)
                        </span>
                    </p>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[180px]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Status
                    </p>
                    <StatusBadge status={appt.status} />
                </div>
                <div className="flex-1 min-w-full sm:min-w-[200px]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                            ? 'Your Reason'
                            : '\u00A0'}
                    </p>
                    <p className="text-sm text-slate-500 italic leading-snug">
                        {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                            ? `"${appt.declineReason}"`
                            : ''}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: Tab[] = ['Upcoming', 'Past', 'Cancelled'];

export default function DoctorAppointments() {
    const { user, token } = useAuth();
    const qClient = useQueryClient();
    const [activeTab, setActiveTab] = React.useState<Tab>('Upcoming');
    const [actionId, setActionId] = React.useState<{ id: string; action: string } | null>(null);
    const [pendingDecline, setPendingDecline] = React.useState<{
        id: string;
        patientName: string;
    } | null>(null);
    const [page, setPage] = React.useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const all = data?.data ?? [];

    const statusMutation = useMutation({
        mutationFn: ({
            id,
            status,
            declineReason,
        }: {
            id: string;
            status: 'CONFIRMED' | 'CANCELLED_BY_DOCTOR';
            declineReason?: string;
        }) => appointmentsApi.updateStatus(id, status, declineReason),
        onMutate: ({ id, status }) =>
            setActionId({ id, action: status === 'CONFIRMED' ? 'accept' : 'decline' }),
        onSettled: () => {
            setActionId(null);
            setPendingDecline(null);
        },
        onSuccess: () => qClient.invalidateQueries({ queryKey: ['appointments', 'doctor', 'all'] }),
        onError: (err: Error) => alert(err.message),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => appointmentsApi.cancel(id),
        onMutate: (id) => setActionId({ id, action: 'cancel' }),
        onSettled: () => setActionId(null),
        onSuccess: () => qClient.invalidateQueries({ queryKey: ['appointments', 'doctor', 'all'] }),
        onError: (err: Error) => alert(err.message),
    });

    const counts = React.useMemo(
        () => ({
            Upcoming: all.filter((a) => getTab(a.status) === 'Upcoming').length,
            Past: all.filter((a) => getTab(a.status) === 'Past').length,
            Cancelled: all.filter((a) => getTab(a.status) === 'Cancelled').length,
            pendingRequests: all.filter((a) => a.status === 'PENDING').length,
        }),
        [all],
    );

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
            transition={{ duration: 0.4 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Appointments
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Review requests and manage your consultations.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            qClient.invalidateQueries({
                                queryKey: ['appointments', 'doctor', 'all'],
                            })
                        }
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        <RotateCw className="w-4 h-4" />
                        Refresh
                    </button>
                    {counts.pendingRequests > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <p className="text-sm font-bold text-amber-600">
                                {counts.pendingRequests} pending{' '}
                                {counts.pendingRequests === 1 ? 'request' : 'requests'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-2 px-4 pb-4 pt-1 text-sm font-bold transition-all relative ${
                            activeTab === tab
                                ? 'text-brand-600'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                        {counts[tab] > 0 && (
                            <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    tab === 'Cancelled'
                                        ? 'bg-red-100 text-red-500'
                                        : 'bg-brand-50 text-brand-600'
                                }`}
                            >
                                {counts[tab]}
                            </span>
                        )}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="doctorActiveTab"
                                className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            )}

            {/* Error */}
            {isError && <ErrorState message="Failed to load appointments." />}

            {/* Content */}
            {!isLoading && !isError && (
                <div className="space-y-4">
                    <div className="grid gap-4">
                        <AnimatePresence mode="popLayout">
                            {filtered.length === 0 ? (
                                <EmptyState
                                    icon={
                                        activeTab === 'Upcoming' ? (
                                            <PhoneCall className="w-8 h-8 text-slate-300" />
                                        ) : activeTab === 'Past' ? (
                                            <CheckCircle2 className="w-8 h-8 text-slate-300" />
                                        ) : (
                                            <XCircle className="w-8 h-8 text-slate-300" />
                                        )
                                    }
                                    message={
                                        activeTab === 'Upcoming'
                                            ? 'No upcoming requests or scheduled calls.'
                                            : activeTab === 'Past'
                                              ? 'No past appointments yet.'
                                              : 'No cancelled appointments.'
                                    }
                                />
                            ) : activeTab === 'Upcoming' ? (
                                <div className="contents">
                                    {visible
                                        .filter((appt) => appt.status === 'PENDING')
                                        .map((appt) => (
                                            <RequestCard
                                                key={appt.id}
                                                appt={appt}
                                                onAccept={() =>
                                                    statusMutation.mutate({
                                                        id: appt.id,
                                                        status: 'CONFIRMED',
                                                    })
                                                }
                                                onDecline={() =>
                                                    setPendingDecline({
                                                        id: appt.id,
                                                        patientName: appt.patient.user.name,
                                                    })
                                                }
                                                accepting={
                                                    actionId?.id === appt.id &&
                                                    actionId?.action === 'accept'
                                                }
                                                declining={
                                                    actionId?.id === appt.id &&
                                                    actionId?.action === 'decline'
                                                }
                                            />
                                        ))}
                                    {visible
                                        .filter((appt) => appt.status === 'CONFIRMED')
                                        .map((appt) => (
                                            <ScheduledCard
                                                key={appt.id}
                                                appt={appt}
                                                onCancel={() => cancelMutation.mutate(appt.id)}
                                                cancelling={
                                                    actionId?.id === appt.id &&
                                                    actionId?.action === 'cancel'
                                                }
                                            />
                                        ))}
                                </div>
                            ) : (
                                visible.map((appt) => <ReadOnlyCard key={appt.id} appt={appt} />)
                            )}
                        </AnimatePresence>
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

            {/* Decline reason modal */}
            <AnimatePresence>
                {pendingDecline && (
                    <DeclineModal
                        patient={pendingDecline.patientName}
                        loading={
                            actionId?.id === pendingDecline.id && actionId?.action === 'decline'
                        }
                        onConfirm={(reason) =>
                            statusMutation.mutate({
                                id: pendingDecline.id,
                                status: 'CANCELLED_BY_DOCTOR',
                                declineReason: reason,
                            })
                        }
                        onCancel={() => setPendingDecline(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
