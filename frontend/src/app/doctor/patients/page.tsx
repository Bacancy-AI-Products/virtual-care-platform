'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    Search,
    Video,
    Calendar,
    Mail,
    Users,
    ChevronLeft,
    ChevronRight,
    ChevronRight as ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, type Appointment } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { FORM_CONTROL_SEARCH_ON_WHITE, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

const PAGE_SIZE = 9;

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

// ─── Derive unique patients from appointment list ─────────────────────────────

interface PatientRow {
    patientId: string;
    name: string;
    email: string;
    totalAppointments: number;
    lastAppointmentAt: string;
    lastStatus: string;
    lastAppointmentId: string;
}

function buildPatientRows(appointments: Appointment[]): PatientRow[] {
    const map = new Map<string, PatientRow>();

    for (const appt of appointments) {
        const pid = appt.patient.id;
        const existing = map.get(pid);
        const apptDate = new Date(appt.scheduledAt);

        if (!existing || apptDate > new Date(existing.lastAppointmentAt)) {
            map.set(pid, {
                patientId: pid,
                name: appt.patient.user.name,
                email: appt.patient.user.email,
                totalAppointments: (existing?.totalAppointments ?? 0) + 1,
                lastAppointmentAt: appt.scheduledAt,
                lastStatus: appt.status,
                lastAppointmentId: appt.id,
            });
        } else {
            map.set(pid, { ...existing, totalAppointments: existing.totalAppointments + 1 });
        }
    }

    return Array.from(map.values()).sort(
        (a, b) => new Date(b.lastAppointmentAt).getTime() - new Date(a.lastAppointmentAt).getTime(),
    );
}

function StatusPill({ status }: { status: string }) {
    const isActive = status === 'PENDING' || status === 'CONFIRMED';
    const isCompleted = status === 'COMPLETED';
    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
                isActive
                    ? 'bg-blue-50 text-blue-600'
                    : isCompleted
                      ? 'bg-green-50 text-green-600'
                      : 'bg-slate-100 text-slate-500'
            }`}
        >
            {isActive ? 'Active' : isCompleted ? 'Completed' : 'Cancelled'}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorPatients() {
    const { token } = useAuth();
    const [search, setSearch] = React.useState('');
    const [page, setPage] = React.useState(1);

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const showLoader = isLoading || (isFetching && !data);
    const showError = !showLoader && isError && !data;

    const patientRows = React.useMemo(() => buildPatientRows(data?.data ?? []), [data]);

    const filtered = search.trim()
        ? patientRows.filter(
              (p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()) ||
                  p.email.toLowerCase().includes(search.toLowerCase()),
          )
        : patientRows;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const paginationItems = React.useMemo(
        () => getPaginationItems(totalPages, page),
        [totalPages, page],
    );

    React.useEffect(() => {
        setPage(1);
    }, [search]);

    React.useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const subtitle = React.useMemo(() => {
        if (showLoader) return 'Loading...';
        const totalFiltered = filtered.length;
        const totalOverall = patientRows.length;
        const hasSearch = search.trim().length > 0;

        if (hasSearch && totalFiltered === 0) {
            return 'No patients match your search.';
        }

        const from = totalFiltered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
        const to = Math.min(page * PAGE_SIZE, totalFiltered);

        if (hasSearch) {
            if (totalPages <= 1) {
                return totalFiltered === 1
                    ? '1 matching patient'
                    : `${totalFiltered} matching patients`;
            }
            return `Showing ${from}–${to} of ${totalFiltered} matching patients`;
        }

        if (totalOverall === 0) {
            return 'Patients from your appointments will appear here.';
        }
        if (totalPages <= 1) {
            return totalOverall === 1
                ? '1 patient across all your appointments'
                : `${totalOverall} patients across all your appointments`;
        }
        return `Showing ${from}–${to} of ${totalOverall} patients across all your appointments`;
    }, [filtered.length, showLoader, page, patientRows.length, search, totalPages]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Patient Records
                    </h2>
                    <p className="text-slate-500 font-medium">{subtitle}</p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search patients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={FORM_CONTROL_SEARCH_ON_WHITE}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                </div>
            </div>

            {/* Loading */}
            {showLoader && <LoadingState message="Loading patient records…" />}

            {showError && <ErrorState message="Failed to load patient records." />}

            {!showLoader && filtered.length === 0 && (
                <EmptyState
                    icon={<Users className="w-12 h-12 text-slate-300" />}
                    title={
                        patientRows.length > 0 && search.trim() ? 'No matches' : 'No patients yet'
                    }
                    message={
                        patientRows.length > 0 && search.trim()
                            ? 'Try a different name or email to find a patient.'
                            : 'Patients who book appointments with you will appear here.'
                    }
                />
            )}

            {/* Desktop table */}
            {!showLoader && filtered.length > 0 && (
                <>
                    <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Patient
                                    </th>
                                    <th className="text-left px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="text-left px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Last Visit
                                    </th>
                                    <th className="text-left px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Visits
                                    </th>
                                    <th className="text-left px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-8 py-5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pagedRows.map((patient) => (
                                    <tr
                                        key={patient.patientId}
                                        className="hover:bg-slate-50 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <Link
                                                href={`/doctor/patients/${patient.patientId}`}
                                                className="flex items-center gap-4 w-full text-left"
                                            >
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    <Image
                                                        src={`https://picsum.photos/seed/${patient.patientId}/100/100`}
                                                        alt={patient.name}
                                                        fill
                                                        className="rounded-2xl object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                                                        {patient.name}
                                                    </p>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Mail className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate max-w-[160px]">
                                                    {patient.email}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {format(
                                                    new Date(patient.lastAppointmentAt),
                                                    'MMM d, yyyy',
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-sm font-bold text-slate-700">
                                                {patient.totalAppointments}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <StatusPill status={patient.lastStatus} />
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/doctor/consultation/${patient.lastAppointmentId}`}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                                >
                                                    <Video className="w-4 h-4" /> Join
                                                </Link>
                                                <Link
                                                    href={`/doctor/patients/${patient.patientId}`}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                                >
                                                    View <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-4">
                        {pagedRows.map((patient) => (
                            <Link
                                key={patient.patientId}
                                href={`/doctor/patients/${patient.patientId}`}
                                className="block bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <Image
                                            src={`https://picsum.photos/seed/${patient.patientId}/100/100`}
                                            alt={patient.name}
                                            fill
                                            className="rounded-2xl object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 truncate">
                                            {patient.name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {patient.email}
                                        </p>
                                    </div>
                                    <StatusPill status={patient.lastStatus} />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        Last visit:{' '}
                                        {format(new Date(patient.lastAppointmentAt), 'MMM d, yyyy')}
                                    </span>
                                    <span className="font-bold">
                                        {patient.totalAppointments} visit
                                        {patient.totalAppointments !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {totalPages > 1 && (
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
                </>
            )}
        </motion.div>
    );
}
