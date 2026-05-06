'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Users,
    Calendar,
    Clock,
    Video,
    TrendingUp,
    Star,
    ArrowRight,
    MoreVertical,
    Loader2,
} from 'lucide-react';
import { format, isToday } from 'date-fns';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, type Appointment } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    trend,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
    trend?: string;
}) {
    return (
        <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-between gap-2 mb-3 sm:mb-6">
                <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] sm:rounded-[24px] flex items-center justify-center ${color}`}
                >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-50 px-2.5 py-1.5 rounded-full">
                        <TrendingUp className="w-3 h-3" /> {trend}
                    </div>
                )}
            </div>
            <p className="text-[11px] sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5">
                {label}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
        </div>
    );
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({ appt }: { appt: Appointment }) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${appt.patient.user.id}/100/100`}
                        alt={appt.patient.user.name}
                        fill
                        className="rounded-2xl object-cover border-4 border-slate-50 shadow-sm"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-4 border-white z-10" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{appt.patient.user.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-brand-50 text-brand-600">
                            <Video className="w-3 h-3" /> Video
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 justify-end">
                <Link
                    href={`/doctor/consultation/${appt.id}`}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-500 text-white text-xs sm:text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 flex items-center gap-2"
                >
                    <Video className="w-4 h-4" /> Start Call
                </Link>
                <button className="p-2.5 sm:p-3 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
    const { user, token } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const allAppointments = data?.data ?? [];

    const todayAppointments = allAppointments.filter(
        (a) =>
            isToday(new Date(a.scheduledAt)) &&
            (a.status === 'PENDING' || a.status === 'CONFIRMED'),
    );

    // Unique patients derived from all appointments (most recent first)
    const recentPatients = Array.from(
        new Map(
            allAppointments
                .sort(
                    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
                )
                .map((a) => [a.patient.user.id, a.patient]),
        ).values(),
    ).slice(0, 3);

    const totalPatients = new Set(allAppointments.map((a) => a.patient.user.id)).size;
    const totalAppointments = allAppointments.length;

    const formatDoctorDisplayName = (name: string | null | undefined): string => {
        const raw = (name ?? '').trim();
        if (!raw) return 'Doctor';
        return /^dr\.?\s/i.test(raw) ? raw : `Dr. ${raw}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 lg:space-y-10"
        >
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                <div>
                    <h2 className="mb-1.5 text-xl font-bold tracking-tight text-slate-900 sm:mb-2 sm:text-2xl">
                        Welcome back, {formatDoctorDisplayName(user?.name)}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">
                        {isLoading
                            ? 'Loading your schedule...'
                            : `You have ${todayAppointments.length} appointment${todayAppointments.length === 1 ? '' : 's'} today.`}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                <StatCard
                    icon={Users}
                    label="Total Patients"
                    value={isLoading ? '—' : String(totalPatients)}
                    color="bg-brand-50 text-brand-500"
                />
                <StatCard
                    icon={Calendar}
                    label="Total Appointments"
                    value={isLoading ? '—' : String(totalAppointments)}
                    color="bg-purple-50 text-purple-500"
                />
                <StatCard
                    icon={Star}
                    label="Avg. Rating"
                    value="4.9"
                    color="bg-amber-50 text-amber-500"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Today's Sessions"
                    value={isLoading ? '—' : String(todayAppointments.length)}
                    color="bg-green-50 text-green-500"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
                {/* Today's Appointments */}
                <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-1 sm:px-2">
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Today&apos;s Appointments
                        </h3>
                        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                            <span className="font-bold text-slate-400 uppercase tracking-widest">
                                {format(new Date(), 'MMM d, yyyy')}
                            </span>
                            <Link
                                href="/doctor/appointments"
                                className="font-bold text-brand-600 hover:text-brand-700 whitespace-nowrap"
                            >
                                View All
                            </Link>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                        </div>
                    ) : todayAppointments.length === 0 ? (
                        <div className="p-10 bg-white rounded-[32px] border border-dashed border-slate-200 text-center">
                            <p className="text-slate-400 font-medium">
                                No appointments scheduled for today.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            {todayAppointments.map((appt) => (
                                <AppointmentRow key={appt.id} appt={appt} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Patients */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                    <h3 className="mb-6 text-xl font-bold tracking-tight text-slate-900 sm:mb-8 sm:text-2xl">
                        Recent Patients
                    </h3>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                        </div>
                    ) : recentPatients.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No patients yet.</p>
                    ) : (
                        <div className="space-y-6 sm:space-y-8">
                            {recentPatients.map((patient) => (
                                <Link
                                    key={patient.user.id}
                                    href="/doctor/patients"
                                    className="flex items-center justify-between gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                                            <Image
                                                src={`https://picsum.photos/seed/${patient.user.id}/100/100`}
                                                fill
                                                className="rounded-2xl object-cover shadow-sm"
                                                alt={patient.user.name}
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                                                {patient.user.name}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium truncate">
                                                {patient.user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                            ))}
                        </div>
                    )}
                    <Link
                        href="/doctor/patients"
                        className="w-full mt-8 sm:mt-10 py-3.5 sm:py-4 bg-slate-50 text-slate-600 text-sm sm:text-base font-bold rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                    >
                        View All Patients
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
