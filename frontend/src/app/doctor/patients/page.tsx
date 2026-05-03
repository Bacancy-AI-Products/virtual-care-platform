'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Video, Calendar, Mail, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    appointmentsApi,
    type Appointment,
    patientsApi,
    prescriptionsApi,
    type Prescription,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Derive unique patients from appointment list ─────────────────────────────

interface PatientRow {
    userId: string;
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
        const uid = appt.patient.user.id;
        const existing = map.get(uid);
        const apptDate = new Date(appt.scheduledAt);

        if (!existing || apptDate > new Date(existing.lastAppointmentAt)) {
            map.set(uid, {
                userId: uid,
                name: appt.patient.user.name,
                email: appt.patient.user.email,
                totalAppointments: (existing?.totalAppointments ?? 0) + 1,
                lastAppointmentAt: appt.scheduledAt,
                lastStatus: appt.status,
                lastAppointmentId: appt.id,
            });
        } else {
            // Just increment count
            map.set(uid, { ...existing, totalAppointments: existing.totalAppointments + 1 });
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
    const { user, token } = useAuth();
    const [search, setSearch] = React.useState('');
    const [selectedPatient, setSelectedPatient] = React.useState<PatientRow | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const patientRows = React.useMemo(() => buildPatientRows(data?.data ?? []), [data]);

    const filtered = search.trim()
        ? patientRows.filter(
              (p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()) ||
                  p.email.toLowerCase().includes(search.toLowerCase()),
          )
        : patientRows;

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
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Patient Records</h2>
                    <p className="text-slate-500 font-medium">
                        {isLoading
                            ? 'Loading...'
                            : `${patientRows.length} patients across all your appointments`}
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search patients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl focus:border-brand-500 focus:bg-white outline-none transition-all font-medium text-sm"
                    />
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            )}

            {isError && (
                <div className="p-12 bg-red-50 rounded-[40px] text-center">
                    <p className="text-red-500 font-bold">Failed to load patient records.</p>
                </div>
            )}

            {!isLoading && !isError && filtered.length === 0 && (
                <div className="p-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-slate-900 mb-2">No patients yet</h4>
                    <p className="text-slate-500">
                        Patients who book appointments with you will appear here.
                    </p>
                </div>
            )}

            {/* Desktop table */}
            {!isLoading && !isError && filtered.length > 0 && (
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
                                {filtered.map((patient) => (
                                    <tr
                                        key={patient.userId}
                                        className="hover:bg-slate-50 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPatient(patient)}
                                                className="flex items-center gap-4 w-full text-left"
                                            >
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    <Image
                                                        src={`https://picsum.photos/seed/${patient.userId}/100/100`}
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
                                            </button>
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
                                            <Link
                                                href={`/doctor/consultation/${patient.lastAppointmentId}`}
                                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                            >
                                                <Video className="w-4 h-4" /> Join Last Call
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-4">
                        {filtered.map((patient) => (
                            <div
                                key={patient.userId}
                                className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <Image
                                            src={`https://picsum.photos/seed/${patient.userId}/100/100`}
                                            alt={patient.name}
                                            fill
                                            className="rounded-2xl object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPatient(patient)}
                                            className="font-bold text-slate-900 truncate text-left hover:text-brand-600"
                                        >
                                            {patient.name}
                                        </button>
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
                            </div>
                        ))}
                    </div>
                </>
            )}
            {selectedPatient && (
                <PatientDetailsSheet
                    patient={selectedPatient}
                    onClose={() => setSelectedPatient(null)}
                />
            )}
        </motion.div>
    );
}

function PatientDetailsSheet({ patient, onClose }: { patient: PatientRow; onClose: () => void }) {
    const { token } = useAuth();

    const {
        data: profile,
        isLoading: loadingProfile,
        isError: errorProfile,
    } = useQuery({
        queryKey: ['patient', patient.userId],
        queryFn: () => patientsApi.getById(patient.userId),
        enabled: !!token,
    });

    const {
        data: prescriptions,
        isLoading: loadingRx,
        isError: errorRx,
    } = useQuery({
        queryKey: ['prescriptions', 'mine'],
        queryFn: () => prescriptionsApi.getMine(),
        enabled: !!token,
    });

    const patientPrescriptions: Prescription[] =
        prescriptions?.prescriptions.filter((rx) => rx.patientId === profile?.id) ?? [];

    return (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/40">
            <div className="w-full md:max-w-xl bg-white rounded-t-3xl md:rounded-3xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{patient.name}</h3>
                        <p className="text-xs text-slate-500">{patient.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                        Close
                    </button>
                </div>
                <div className="px-6 py-4 space-y-4 overflow-y-auto">
                    {loadingProfile && <p className="text-sm text-slate-500">Loading profile...</p>}
                    {errorProfile && (
                        <p className="text-sm text-red-500">Failed to load full patient profile.</p>
                    )}
                    {profile && (
                        <>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Demographics
                                </p>
                                <p className="text-sm text-slate-600">
                                    DOB:{' '}
                                    {profile.dateOfBirth
                                        ? format(new Date(profile.dateOfBirth), 'MMM d, yyyy')
                                        : '—'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Gender: {profile.gender ?? '—'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Blood group: {profile.bloodGroup ?? '—'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Medical history
                                </p>
                                <p className="text-sm text-slate-600">
                                    Allergies: {profile.allergies || 'Not documented'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Chronic conditions:{' '}
                                    {profile.chronicConditions || 'Not documented'}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Prescriptions
                        </p>
                        {loadingRx && (
                            <p className="text-sm text-slate-500">Loading prescriptions...</p>
                        )}
                        {errorRx && (
                            <p className="text-sm text-red-500">
                                Failed to load prescriptions for this patient.
                            </p>
                        )}
                        {!loadingRx && !errorRx && patientPrescriptions.length === 0 && (
                            <p className="text-sm text-slate-500">No prescriptions found.</p>
                        )}
                        {!loadingRx && !errorRx && patientPrescriptions.length > 0 && (
                            <ul className="space-y-2">
                                {patientPrescriptions.map((rx) => (
                                    <li
                                        key={rx.id}
                                        className="border border-slate-100 rounded-2xl px-3 py-2 text-xs text-slate-600"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-slate-800">
                                                {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                                            </span>
                                            {rx.appointment && (
                                                <span className="text-slate-400">
                                                    Visit:{' '}
                                                    {format(
                                                        new Date(rx.appointment.scheduledAt),
                                                        'MMM d, yyyy',
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <p className="line-clamp-2">
                                            {rx.items.map((i) => i.drugName).join(', ') ||
                                                'No medicines listed'}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
