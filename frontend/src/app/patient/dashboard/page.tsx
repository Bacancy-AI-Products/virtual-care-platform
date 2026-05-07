'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Calendar,
    Video,
    FileText,
    ArrowRight,
    Clock,
    Plus,
    ChevronRight,
    Activity,
    Heart,
    Thermometer,
    Search,
    Loader2,
} from 'lucide-react';
import { format, isToday, isFuture } from 'date-fns';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    type Appointment,
    type SpecializationOption,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    sub,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
    sub?: string;
}) {
    return (
        <div className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:rounded-3xl sm:p-5 lg:p-6">
            <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4">
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${color}`}
                >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                {sub && (
                    <span className="max-w-[58%] truncate rounded-full bg-green-50 px-2 py-0.5 text-center text-[10px] font-bold text-green-600 sm:max-w-[min(100%,11rem)] sm:py-1 sm:text-xs">
                        {sub}
                    </span>
                )}
            </div>
            <p className="mb-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
            <p className="break-words text-base font-bold text-slate-900 sm:text-lg lg:text-xl">
                {value}
            </p>
        </div>
    );
}

// ─── Upcoming appointment card ────────────────────────────────────────────────

function UpcomingCard({
    appt,
    specializationLabel,
}: {
    appt: Appointment;
    specializationLabel: string;
}) {
    return (
        <div className="group flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                    <Image
                        src={`https://picsum.photos/seed/${appt.doctor.id}/100/100`}
                        alt={appt.doctor.user.name}
                        fill
                        className="rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="min-w-0">
                    <h4 className="truncate font-bold text-slate-900">{appt.doctor.user.name}</h4>
                    <p className="truncate text-sm text-slate-500">{specializationLabel}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock className="h-3 w-3 shrink-0" />
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </span>
                    </div>
                </div>
            </div>
            <Link
                href={`/patient/consultation/${appt.id}`}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 sm:w-auto sm:px-6"
            >
                <Video className="h-4 w-4 shrink-0" /> Join Call
            </Link>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
    const { user, token } = useAuth();

    // Scoped to this user's id so cache never leaks between accounts
    const { data, isLoading } = useQuery({
        queryKey: ['appointments', 'patient', 'upcoming'],
        queryFn: () => appointmentsApi.list({ limit: 10 }),
        enabled: !!token,
    });

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

    const allAppointments = data?.data ?? [];

    const upcoming = allAppointments.filter(
        (a) =>
            (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
            (isFuture(new Date(a.scheduledAt)) || isToday(new Date(a.scheduledAt))),
    );

    const nextAppt = upcoming[0];
    const nextApptLabel = nextAppt ? format(new Date(nextAppt.scheduledAt), 'MMM d') : 'None';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full min-w-0 space-y-8 lg:space-y-10"
        >
            {/* Welcome */}
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                    <h2 className="mb-1.5 text-xl font-bold tracking-tight text-slate-900 sm:mb-2 sm:text-2xl">
                        Hello, {user?.name ?? '...'}
                    </h2>
                    <p className="text-sm font-medium text-slate-500 sm:text-base">
                        How are you feeling today? Here&apos;s your health summary.
                    </p>
                </div>
                <Link
                    href="/patient/doctors"
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-100 transition-all hover:bg-brand-600 active:scale-95 sm:py-4 sm:text-base md:w-auto"
                >
                    <Plus className="h-5 w-5 shrink-0" /> Book Appointment
                </Link>
            </div>

            {/* Stats — mobile: single column stack; tablet (sm+): 2×2; desktop (lg+): four across */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                <StatCard
                    icon={Heart}
                    label="Heart Rate"
                    value="72 bpm"
                    color="bg-red-50 text-red-500"
                    sub="+2% normal"
                />
                <StatCard
                    icon={Activity}
                    label="Blood Pressure"
                    value="120/80"
                    color="bg-blue-50 text-blue-500"
                    sub="Stable"
                />
                <StatCard
                    icon={Thermometer}
                    label="Temperature"
                    value="36.6 °C"
                    color="bg-orange-50 text-orange-500"
                />
                <StatCard
                    icon={Calendar}
                    label="Next Appointment"
                    value={nextApptLabel}
                    color="bg-brand-50 text-brand-500"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
                {/* Upcoming Appointments */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Upcoming Appointments
                        </h3>
                        <Link
                            href="/patient/appointments"
                            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-600 transition-colors hover:text-brand-700 group"
                        >
                            View All{' '}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="p-10 bg-white rounded-[32px] border border-dashed border-slate-200 text-center">
                            <p className="text-slate-400 font-medium mb-4">
                                No upcoming appointments.
                            </p>
                            <Link
                                href="/patient/doctors"
                                className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Book one now
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcoming.slice(0, 3).map((appt) => (
                                <UpcomingCard
                                    key={appt.id}
                                    appt={appt}
                                    specializationLabel={
                                        specializationNameById.get(appt.doctor.specialization) ??
                                        appt.doctor.specialization
                                    }
                                />
                            ))}
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="pt-4">
                        <h3 className="mb-6 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Quick Actions
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Link
                                href="/patient/doctors"
                                className="p-6 bg-brand-50 rounded-3xl border border-brand-100 hover:bg-brand-100 transition-all"
                            >
                                <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-100">
                                    <Search className="text-white w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">Find a Specialist</h4>
                                <p className="text-sm text-slate-500">
                                    Search for top-rated doctors.
                                </p>
                            </Link>
                            <Link
                                href="/patient/records"
                                className="p-6 bg-teal-50 rounded-3xl border border-teal-100 hover:bg-teal-100 transition-all"
                            >
                                <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-100">
                                    <FileText className="text-white w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">Medical Records</h4>
                                <p className="text-sm text-slate-500">
                                    Access your prescriptions and reports.
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Sidebar — Past consultations + tip */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                        <h3 className="mb-6 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Past Consultations
                        </h3>
                        {allAppointments.filter((a) => a.status === 'COMPLETED').length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">
                                No past consultations.
                            </p>
                        ) : (
                            <div className="space-y-5">
                                {allAppointments
                                    .filter((a) => a.status === 'COMPLETED')
                                    .slice(0, 3)
                                    .map((appt) => (
                                        <div
                                            key={appt.id}
                                            className="flex items-start gap-4 group cursor-pointer"
                                        >
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-brand-50 transition-colors flex-shrink-0">
                                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-brand-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">
                                                    {appt.doctor.user.name}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {specializationNameById.get(
                                                        appt.doctor.specialization,
                                                    ) ?? appt.doctor.specialization}{' '}
                                                    •{' '}
                                                    {format(
                                                        new Date(appt.scheduledAt),
                                                        'MMM d, yyyy',
                                                    )}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all mt-1 flex-shrink-0" />
                                        </div>
                                    ))}
                            </div>
                        )}
                        <Link
                            href="/patient/appointments"
                            className="w-full mt-6 py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                        >
                            View All Records
                        </Link>
                    </div>

                    <div className="bg-brand-600 p-8 rounded-[32px] text-white relative overflow-hidden shadow-xl shadow-brand-100">
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold mb-3">Health Tip of the Day</h3>
                            <p className="text-brand-100 text-sm leading-relaxed mb-6">
                                Drinking at least 8 glasses of water daily helps maintain energy
                                levels and improves skin health.
                            </p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
