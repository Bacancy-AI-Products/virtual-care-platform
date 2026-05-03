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
    RotateCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    type Appointment,
    type SpecializationOption,
} from '@/services/api';

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
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cfg.className}`}
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
        <div className="bg-white px-8 py-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all group grid grid-cols-[260px_1fr_auto] items-center gap-8">
            {/* ── Doctor info – fixed 260px ── */}
            <div className="flex items-center gap-4 min-w-0">
                <img
                    src={`https://picsum.photos/seed/${appt.doctor.id}/100/100`}
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm flex-shrink-0"
                    alt={appt.doctor.user.name}
                    referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate leading-snug">
                        {appt.doctor.user.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5 mb-2">
                        {specializationLabel}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full">
                        <Video className="w-3 h-3" /> Video Consultation
                    </div>
                </div>
            </div>

            {/* ── Info columns – always anchored at same x ── */}
            <div className="flex items-center border-l border-slate-100 pl-8">
                <div className="w-[130px]">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Date
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                        {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                    </p>
                </div>

                <div className="w-[110px]">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        <Clock className="w-3.5 h-3.5" /> Time
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                        {format(new Date(appt.scheduledAt), 'hh:mm a')}
                    </p>
                </div>

                <div className="w-[190px]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Status
                    </p>
                    <StatusBadge status={appt.status} />
                </div>

                <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                            ? "Doctor's Reason"
                            : '\u00A0'}
                    </p>
                    <p className="text-sm text-slate-600 italic leading-snug">
                        {appt.status === 'CANCELLED_BY_DOCTOR' && appt.declineReason
                            ? `"${appt.declineReason}"`
                            : ''}
                    </p>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center gap-2">
                {appt.status === 'CONFIRMED' && (
                    <Link
                        href={`/patient/consultation/${appt.id}`}
                        className="px-5 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 text-sm flex items-center gap-2"
                    >
                        <Video className="w-4 h-4" /> Join Call
                    </Link>
                )}
                {appt.status === 'PENDING' && (
                    <span className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold rounded-xl whitespace-nowrap">
                        <AlertCircle className="w-3.5 h-3.5" /> Awaiting confirmation
                    </span>
                )}
                {isUpcoming && (
                    <button
                        onClick={onCancel}
                        disabled={cancelling}
                        className="px-4 py-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-bold disabled:opacity-50"
                    >
                        {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                    </button>
                )}
                <button className="p-2.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                    <MoreVertical className="w-4 h-4" />
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
    const [visibleCount, setVisibleCount] = React.useState(10);

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

    const { data, isLoading, isError } = useQuery({
        queryKey: ['appointments', 'patient', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
    });

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
    const visible = filtered.slice(0, visibleCount);

    React.useEffect(() => {
        setVisibleCount(10);
    }, [activeTab, all.length]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">My Appointments</h2>
                    <p className="text-slate-500 font-medium">
                        Keep track of your upcoming and past consultations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            qClient.invalidateQueries({
                                queryKey: ['appointments', 'patient', 'all'],
                            })
                        }
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                        <RotateCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <Link
                        href="/patient/doctors"
                        className="px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> Book New Appointment
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-200">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 text-sm font-bold transition-all relative ${
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
            {isLoading && (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            )}

            {isError && (
                <div className="p-12 bg-red-50 rounded-[40px] text-center">
                    <p className="text-red-500 font-bold">Failed to load appointments.</p>
                </div>
            )}

            {!isLoading && !isError && (
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
                    {filtered.length > visibleCount && (
                        <div className="flex justify-center pt-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setVisibleCount((prev) => Math.min(prev + 10, filtered.length))
                                }
                                className="px-6 py-2.5 rounded-full border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Load more ({visibleCount}/{filtered.length})
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
