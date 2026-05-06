'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
    MapPin,
    Stethoscope,
    ChevronDown,
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
import { getStates, getCities } from '@/constants/us-locations';

const SELECT_CLASS =
    'w-full appearance-none pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium text-slate-900 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

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
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {sub && (
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                        {sub}
                    </span>
                )}
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
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
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
            <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${appt.doctor.id}/100/100`}
                        alt={appt.doctor.user.name}
                        fill
                        className="rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900">{appt.doctor.user.name}</h4>
                    <p className="text-sm text-slate-500">{specializationLabel}</p>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock className="w-3 h-3" />
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </span>
                    </div>
                </div>
            </div>
            <Link
                href={`/patient/consultation/${appt.id}`}
                className="px-6 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 flex items-center gap-2"
            >
                <Video className="w-4 h-4" /> Join Call
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
            className="space-y-10"
        >
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        Hello, {user?.name ?? '...'} 👋
                    </h2>
                    <p className="text-slate-500 font-medium">
                        How are you feeling today? Here&apos;s your health summary.
                    </p>
                </div>
                <Link
                    href="/patient/doctors"
                    className="px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Book Appointment
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-slate-900">Upcoming Appointments</h3>
                        <Link
                            href="/patient/appointments"
                            className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
                        >
                            View All{' '}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h3>
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
                        <h3 className="text-xl font-bold text-slate-900 mb-6">
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
                            <h3 className="text-xl font-bold mb-3">Health Tip of the Day</h3>
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
