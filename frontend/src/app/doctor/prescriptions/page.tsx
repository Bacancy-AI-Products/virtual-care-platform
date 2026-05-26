'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    FileText,
    Search,
    Pill,
    Calendar,
    User as UserIcon,
    Video,
    ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { prescriptionsApi, type Prescription } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useScrollToTopOnPageChange } from '@/hooks/useScrollToTopOnPageChange';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { FORM_CONTROL_SEARCH_ON_WHITE, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

const PAGE_SIZE = 10;

interface PatientGroup {
    patientId: string;
    patientName: string;
    prescriptions: Prescription[];
    latestIssuedAt: string;
}

function buildGroups(list: Prescription[]): PatientGroup[] {
    const byPatient = new Map<string, PatientGroup>();
    for (const rx of list) {
        const pid = rx.patient?.id ?? rx.patientId;
        const existing = byPatient.get(pid);
        if (existing) {
            existing.prescriptions.push(rx);
            if (rx.createdAt > existing.latestIssuedAt) {
                existing.latestIssuedAt = rx.createdAt;
            }
        } else {
            byPatient.set(pid, {
                patientId: pid,
                patientName: rx.patient?.user.name ?? 'Unknown patient',
                prescriptions: [rx],
                latestIssuedAt: rx.createdAt,
            });
        }
    }
    // Sort each patient's prescriptions newest-first, then sort groups by latest visit
    const groups = Array.from(byPatient.values());
    for (const g of groups) {
        g.prescriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    groups.sort((a, b) => b.latestIssuedAt.localeCompare(a.latestIssuedAt));
    return groups;
}

export default function DoctorPrescriptionsPage() {
    const { token, user } = useAuth();
    const [search, setSearch] = React.useState('');
    const [expandedPatients, setExpandedPatients] = React.useState<Set<string>>(new Set());
    const [expandedRx, setExpandedRx] = React.useState<Set<string>>(new Set());
    const [page, setPage] = React.useState(1);
    useScrollToTopOnPageChange(page);

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ['prescriptions', 'mine'],
        queryFn: () => prescriptionsApi.getMine({ limit: 100 }),
        enabled: !!token && user?.role === 'DOCTOR',
    });

    const showLoader = isLoading || (isFetching && !data);
    const showError = !showLoader && isError && !data;

    const filteredList = React.useMemo(() => {
        const list = data?.prescriptions ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((rx) => {
            const patientName = rx.patient?.user.name.toLowerCase() ?? '';
            const drugMatch = rx.items.some((i) => i.drugName.toLowerCase().includes(q));
            const dateMatch = format(new Date(rx.createdAt), 'MMM d, yyyy')
                .toLowerCase()
                .includes(q);
            return patientName.includes(q) || drugMatch || dateMatch;
        });
    }, [data, search]);

    const groups = React.useMemo(() => buildGroups(filteredList), [filteredList]);
    const totalPrescriptions = filteredList.length;

    React.useEffect(() => {
        setPage(1);
    }, [search]);

    const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
    const pagedGroups = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const togglePatient = (patientId: string) => {
        setExpandedPatients((prev) => {
            const next = new Set(prev);
            if (next.has(patientId)) next.delete(patientId);
            else next.add(patientId);
            return next;
        });
    };

    const toggleRx = (id: string) => {
        setExpandedRx((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 sm:space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="mb-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Prescriptions
                    </h2>
                    <p className="text-slate-500 font-medium text-sm sm:text-base">
                        {showLoader
                            ? 'Loading...'
                            : `${groups.length} patient${groups.length === 1 ? '' : 's'} · ${totalPrescriptions} prescription${totalPrescriptions === 1 ? '' : 's'} issued${search.trim() ? ' (filtered)' : ''}`}
                    </p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search patient, drug, or date..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={FORM_CONTROL_SEARCH_ON_WHITE}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                </div>
            </div>

            {showLoader && <LoadingState message="Loading prescriptions…" />}

            {showError && <ErrorState message="Failed to load prescriptions." />}

            {!showLoader && !showError && groups.length === 0 && (
                <EmptyState
                    icon={<FileText className="w-12 h-12 text-slate-300" />}
                    title={search.trim() ? 'No matches' : 'No prescriptions yet'}
                    message={
                        search.trim()
                            ? 'Try a different patient name or drug.'
                            : 'Prescriptions you create during consultations will appear here.'
                    }
                />
            )}

            {!showLoader && !showError && groups.length > 0 && (
                <>
                    <ul className="space-y-3 sm:space-y-4">
                        {pagedGroups.map((group) => (
                            <PatientGroupRow
                                key={group.patientId}
                                group={group}
                                isExpanded={expandedPatients.has(group.patientId)}
                                onToggle={() => togglePatient(group.patientId)}
                                expandedRx={expandedRx}
                                onToggleRx={toggleRx}
                            />
                        ))}
                    </ul>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <p className="text-sm font-medium text-slate-500">
                                Page {page} of {totalPages}
                            </p>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}

function PatientGroupRow({
    group,
    isExpanded,
    onToggle,
    expandedRx,
    onToggleRx,
}: {
    group: PatientGroup;
    isExpanded: boolean;
    onToggle: () => void;
    expandedRx: Set<string>;
    onToggleRx: (id: string) => void;
}) {
    const count = group.prescriptions.length;
    const latest = format(new Date(group.latestIssuedAt), 'MMM d, yyyy');

    return (
        <li className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {group.patientName}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                            {count} prescription{count === 1 ? '' : 's'} · Latest {latest}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 text-xs flex-shrink-0">
                    {count > 1 && (
                        <span className="hidden sm:inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 font-bold text-brand-700">
                            {count} visits
                        </span>
                    )}
                    <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {isExpanded && (
                <ul className="border-t border-slate-50 px-3 sm:px-4 py-3 sm:py-4 space-y-2.5 bg-slate-50/40">
                    {group.prescriptions.map((rx) => (
                        <PrescriptionRow
                            key={rx.id}
                            rx={rx}
                            isExpanded={expandedRx.has(rx.id)}
                            onToggle={() => onToggleRx(rx.id)}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

function PrescriptionRow({
    rx,
    isExpanded,
    onToggle,
}: {
    rx: Prescription;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const issued = format(new Date(rx.createdAt), 'MMM d, yyyy');
    const visit = rx.appointment
        ? format(new Date(rx.appointment.scheduledAt), 'MMM d, yyyy')
        : null;

    return (
        <li className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {rx.items.length} medicine{rx.items.length === 1 ? '' : 's'} ·{' '}
                            {rx.items.map((i) => i.drugName).join(', ') || 'No medicines listed'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Issued {issued}
                            </span>
                            {visit && (
                                <span className="flex items-center gap-1">
                                    <Video className="w-3 h-3" /> Visit {visit}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="border-t border-slate-50 px-4 sm:px-5 py-4 space-y-3 bg-white">
                    <ul className="space-y-2">
                        {rx.items.map((it) => (
                            <li
                                key={it.id}
                                className="bg-slate-50/60 rounded-xl border border-slate-100 px-3.5 py-2.5"
                            >
                                <p className="font-bold text-sm text-slate-900">{it.drugName}</p>
                                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                    {it.dosage && (
                                        <span>
                                            <span className="text-slate-400">Dosage:</span>{' '}
                                            {it.dosage}
                                        </span>
                                    )}
                                    {it.frequency && (
                                        <span>
                                            <span className="text-slate-400">Frequency:</span>{' '}
                                            {it.frequency}
                                        </span>
                                    )}
                                    {it.duration && (
                                        <span>
                                            <span className="text-slate-400">Duration:</span>{' '}
                                            {it.duration}
                                        </span>
                                    )}
                                    {it.quantity && (
                                        <span>
                                            <span className="text-slate-400">Qty:</span>{' '}
                                            {it.quantity}
                                        </span>
                                    )}
                                </div>
                                {it.instructions && (
                                    <p className="mt-2 text-xs text-slate-500 italic">
                                        {it.instructions}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>

                    {rx.notes && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Doctor notes
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">{rx.notes}</p>
                        </div>
                    )}

                    {rx.appointment && (
                        <Link
                            href={`/doctor/consultation/${rx.appointment.id}`}
                            className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                        >
                            <Video className="w-3.5 h-3.5" /> Open consultation
                        </Link>
                    )}
                </div>
            )}
        </li>
    );
}
