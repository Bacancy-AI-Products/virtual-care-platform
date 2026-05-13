'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInYears } from 'date-fns';
import {
    ChevronLeft,
    Mail,
    Calendar,
    Cake,
    User as UserIcon,
    Droplet,
    Ruler,
    Weight,
    Activity,
    Video,
    Stethoscope,
    Pill,
    FileText,
    ClipboardList,
    CheckCircle2,
    Clock,
    Loader2,
    AlertTriangle,
    NotebookPen,
    Phone,
    MapPin,
    Home,
    LifeBuoy,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    patientsApi,
    appointmentsApi,
    prescriptionsApi,
    type Appointment,
    type Prescription,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

function calculateAge(dob: string | null): number | null {
    if (!dob) return null;
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return null;
    const age = differenceInYears(new Date(), date);
    return age >= 0 ? age : null;
}

function calculateBMI(heightCm: number | null, weightKg: number | string | null): number | null {
    if (!heightCm || heightCm <= 0) return null;
    const w = typeof weightKg === 'string' ? parseFloat(weightKg) : weightKg;
    if (w == null || Number.isNaN(w) || w <= 0) return null;
    const heightM = heightCm / 100;
    return Math.round((w / (heightM * heightM)) * 10) / 10;
}

function bmiCategory(bmi: number | null): { label: string; color: string } | null {
    if (bmi == null) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600' };
    return { label: 'Obese', color: 'text-red-600' };
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
        PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-600', Icon: Clock },
        CONFIRMED: { label: 'Confirmed', cls: 'bg-blue-50 text-blue-600', Icon: Calendar },
        COMPLETED: { label: 'Completed', cls: 'bg-green-50 text-green-600', Icon: CheckCircle2 },
        NO_SHOW: { label: 'No-show', cls: 'bg-slate-100 text-slate-500', Icon: AlertTriangle },
        CANCELLED_BY_DOCTOR: {
            label: 'Cancelled',
            cls: 'bg-red-50 text-red-600',
            Icon: AlertTriangle,
        },
        CANCELLED_BY_PATIENT: {
            label: 'Cancelled',
            cls: 'bg-red-50 text-red-600',
            Icon: AlertTriangle,
        },
    };
    const entry = map[status] ?? {
        label: status,
        cls: 'bg-slate-100 text-slate-500',
        Icon: Clock,
    };
    const Icon = entry.Icon;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${entry.cls}`}
        >
            <Icon className="w-3.5 h-3.5" />
            {entry.label}
        </span>
    );
}

function isCompleted(status: string) {
    return status === 'COMPLETED';
}

function isActive(status: string) {
    return status === 'PENDING' || status === 'CONFIRMED';
}

export default function DoctorPatientDetailsPage() {
    const params = useParams<{ id: string }>();
    const patientId = params?.id ?? '';
    const router = useRouter();
    const { token } = useAuth();

    const {
        data: profile,
        isLoading: loadingProfile,
        isFetching: fetchingProfile,
        isError: errorProfile,
    } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => patientsApi.getById(patientId),
        enabled: !!token && !!patientId,
    });

    const showLoader = loadingProfile || (fetchingProfile && !profile);
    const showProfileError = !showLoader && errorProfile && !profile;

    const { data: appointmentsData, isLoading: loadingAppts } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const { data: prescriptionsData, isLoading: loadingRx } = useQuery({
        queryKey: ['prescriptions', 'mine'],
        queryFn: () => prescriptionsApi.getMine(),
        enabled: !!token,
    });

    const patientAppointments: Appointment[] = React.useMemo(() => {
        const all = appointmentsData?.data ?? [];
        return all
            .filter((a) => a.patient.id === patientId)
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    }, [appointmentsData, patientId]);

    const patientPrescriptions: Prescription[] = React.useMemo(() => {
        const all = prescriptionsData?.prescriptions ?? [];
        return all
            .filter((rx) => rx.patientId === patientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [prescriptionsData, patientId]);

    const totalVisits = patientAppointments.length;
    const completedVisits = patientAppointments.filter((a) => isCompleted(a.status)).length;
    const upcomingVisits = patientAppointments.filter((a) => isActive(a.status)).length;
    const lastCompleted = patientAppointments.find((a) => isCompleted(a.status));
    const nextUpcoming = [...patientAppointments]
        .reverse()
        .find((a) => isActive(a.status) && new Date(a.scheduledAt) >= new Date());

    if (showLoader) {
        return <LoadingState message="Loading patient…" />;
    }

    if (showProfileError || !profile) {
        return (
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 mb-6 text-slate-500 hover:text-brand-500 transition-colors font-bold group"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Patients
                </button>
                <ErrorState message="We couldn't load this patient. You may not have access, or the patient no longer exists." />
                <div className="mt-6 flex justify-center">
                    <Link
                        href="/doctor/patients"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-2xl shadow-sm hover:bg-brand-600 transition-all active:scale-[0.98]"
                    >
                        <ChevronLeft className="w-5 h-5" /> Back to all patients
                    </Link>
                </div>
            </div>
        );
    }

    const age = calculateAge(profile.dateOfBirth);
    const bmi = calculateBMI(profile.height, profile.weight);
    const bmiCat = bmiCategory(bmi);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 max-w-6xl mx-auto w-full"
        >
            {/* Back */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-bold group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Patients
            </button>

            {/* Hero card */}
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] lg:rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-center md:items-start">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                        <Image
                            src={`https://picsum.photos/seed/${profile.id}/200/200`}
                            alt={profile.user.name}
                            fill
                            className="rounded-[24px] sm:rounded-[28px] object-cover border-4 border-slate-50 shadow-xl"
                            referrerPolicy="no-referrer"
                        />
                    </div>

                    <div className="flex-1 min-w-0 w-full text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                {profile.user.name}
                            </h1>
                            {totalVisits > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600">
                                    <Stethoscope className="w-3.5 h-3.5" />
                                    {totalVisits} visit{totalVisits !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-500 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                                <Mail className="w-4 h-4" />
                                {profile.user.email}
                            </span>
                            {age != null && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Cake className="w-4 h-4" />
                                    {age} yrs
                                </span>
                            )}
                            {profile.gender && (
                                <span className="inline-flex items-center gap-1.5 capitalize">
                                    <UserIcon className="w-4 h-4" />
                                    {profile.gender.toLowerCase().replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                            {nextUpcoming ? (
                                <Link
                                    href={`/doctor/consultation/${nextUpcoming.id}`}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-sm shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                                >
                                    <Video className="w-4 h-4" />
                                    Join Upcoming Call
                                </Link>
                            ) : lastCompleted ? (
                                <Link
                                    href={`/doctor/consultation/${lastCompleted.id}`}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-sm shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                                >
                                    <Video className="w-4 h-4" />
                                    Last Consultation
                                </Link>
                            ) : null}
                            <Link
                                href="/doctor/prescriptions"
                                className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                <NotebookPen className="w-4 h-4" />
                                All Prescriptions
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Patient Overview — Demographics + Vitals */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Patient Overview
                    </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Demographics */}
                    <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-[28px] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Demographics
                            </p>
                        </div>
                        <dl className="divide-y divide-slate-50">
                            <div className="flex items-center justify-between py-3">
                                <dt className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Cake className="w-4 h-4 text-slate-400" />
                                    Date of Birth
                                </dt>
                                <dd className="text-sm font-bold text-slate-900">
                                    {profile.dateOfBirth
                                        ? format(new Date(profile.dateOfBirth), 'MMM d, yyyy')
                                        : '—'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <dt className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Activity className="w-4 h-4 text-slate-400" />
                                    Age
                                </dt>
                                <dd className="text-sm font-bold text-slate-900">
                                    {age != null ? `${age} yrs` : '—'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <dt className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                    Gender
                                </dt>
                                <dd className="text-sm font-bold text-slate-900 capitalize">
                                    {profile.gender
                                        ? profile.gender.toLowerCase().replace(/_/g, ' ')
                                        : '—'}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <dt className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                    <Droplet className="w-4 h-4 text-red-400" />
                                    Blood Group
                                </dt>
                                <dd>
                                    {profile.bloodGroup ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">
                                            {profile.bloodGroup}
                                        </span>
                                    ) : (
                                        <span className="text-sm font-bold text-slate-400">—</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Vitals */}
                    <div className="lg:col-span-3 bg-white p-6 sm:p-7 rounded-[28px] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-medical-soft text-medical-teal flex items-center justify-center">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Vitals
                                </p>
                            </div>
                            {bmiCat && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 ${bmiCat.color}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
                                    {bmiCat.label}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 overflow-hidden">
                                <Ruler className="w-4 h-4 text-slate-400 mb-2" />
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    Height
                                </p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                                    {profile.height ?? '—'}
                                    {profile.height && (
                                        <span className="text-sm font-semibold text-slate-400 ml-1">
                                            cm
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 overflow-hidden">
                                <Weight className="w-4 h-4 text-slate-400 mb-2" />
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    Weight
                                </p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                                    {profile.weight != null ? (
                                        <>
                                            {typeof profile.weight === 'string'
                                                ? parseFloat(profile.weight)
                                                : profile.weight}
                                            <span className="text-sm font-semibold text-slate-400 ml-1">
                                                kg
                                            </span>
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </p>
                            </div>
                            <div
                                className={`relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-brand-50 to-white border border-brand-100 overflow-hidden`}
                            >
                                <Activity className="w-4 h-4 text-brand-500 mb-2" />
                                <p className="text-[10px] sm:text-xs font-bold text-brand-600 uppercase tracking-wide">
                                    BMI
                                </p>
                                <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                                    {bmi != null ? bmi.toFixed(1) : '—'}
                                </p>
                                {bmiCat && (
                                    <p className={`mt-0.5 text-[11px] font-bold ${bmiCat.color}`}>
                                        {bmiCat.label}
                                    </p>
                                )}
                            </div>
                        </div>
                        {bmi == null && (
                            <p className="mt-4 text-xs text-slate-400">
                                BMI will calculate once height and weight are recorded.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Contact & Address */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                            <Phone className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Contact
                        </p>
                    </div>
                    <ul className="space-y-3 text-sm">
                        <li className="flex items-start gap-2.5">
                            <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700 break-all">{profile.user.email}</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                            <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            {profile.phone ? (
                                <a
                                    href={`tel:${profile.phone}`}
                                    className="text-slate-700 hover:text-brand-600 transition-colors"
                                >
                                    {profile.phone}
                                </a>
                            ) : (
                                <span className="text-slate-400">Phone not provided</span>
                            )}
                        </li>
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                            <LifeBuoy className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Emergency Contact
                        </p>
                    </div>
                    {profile.emergencyContactName || profile.emergencyContactPhone ? (
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-2.5">
                                <UserIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-700">
                                    {profile.emergencyContactName || (
                                        <span className="text-slate-400">Name not provided</span>
                                    )}
                                </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                {profile.emergencyContactPhone ? (
                                    <a
                                        href={`tel:${profile.emergencyContactPhone}`}
                                        className="text-slate-700 hover:text-brand-600 transition-colors"
                                    >
                                        {profile.emergencyContactPhone}
                                    </a>
                                ) : (
                                    <span className="text-slate-400">Phone not provided</span>
                                )}
                            </li>
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-400">No emergency contact on file.</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Home className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Address
                        </p>
                    </div>
                    {profile.address || profile.city || profile.state ? (
                        <ul className="space-y-3 text-sm">
                            {profile.address && (
                                <li className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-slate-700 leading-relaxed">
                                        {profile.address}
                                    </span>
                                </li>
                            )}
                            {(profile.city || profile.state) && (
                                <li className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0 opacity-0" />
                                    <span className="text-slate-500 font-medium">
                                        {[profile.city, profile.state].filter(Boolean).join(', ')}
                                    </span>
                                </li>
                            )}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-400">No address on file.</p>
                    )}
                </div>
            </section>

            {/* Visit summary */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Total Visits
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalVisits}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {completedVisits} completed · {upcomingVisits} upcoming
                    </p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Last Visit
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {lastCompleted
                            ? format(new Date(lastCompleted.scheduledAt), 'MMM d, yyyy')
                            : '—'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {lastCompleted?.reason || 'No reason recorded'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Next Appointment
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {nextUpcoming
                            ? format(new Date(nextUpcoming.scheduledAt), 'MMM d, yyyy')
                            : '—'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        {nextUpcoming
                            ? format(new Date(nextUpcoming.scheduledAt), 'h:mm a')
                            : 'No upcoming visits'}
                    </p>
                </div>
            </section>

            {/* Appointment history */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Appointment History
                    </h2>
                    {patientAppointments.length > 0 && (
                        <p className="text-sm text-slate-500 font-medium">
                            {patientAppointments.length} total
                        </p>
                    )}
                </div>

                {loadingAppts && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                )}

                {!loadingAppts && patientAppointments.length === 0 && (
                    <EmptyState
                        icon={<ClipboardList className="w-12 h-12 text-slate-300" />}
                        title="No appointments"
                        message="This patient hasn't had any appointments with you yet."
                    />
                )}

                {!loadingAppts && patientAppointments.length > 0 && (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Duration
                                        </th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {patientAppointments.map((appt) => (
                                        <tr
                                            key={appt.id}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {format(
                                                            new Date(appt.scheduledAt),
                                                            'MMM d, yyyy',
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {format(
                                                            new Date(appt.scheduledAt),
                                                            'h:mm a',
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                {appt.durationMinutes} min
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 max-w-[280px] truncate">
                                                {appt.reason || (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={appt.status} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isActive(appt.status) ||
                                                isCompleted(appt.status) ? (
                                                    <Link
                                                        href={`/doctor/consultation/${appt.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                                                    >
                                                        <Video className="w-4 h-4" />
                                                        Open
                                                    </Link>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {patientAppointments.map((appt) => (
                                <div
                                    key={appt.id}
                                    className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">
                                                {format(new Date(appt.scheduledAt), 'MMM d, yyyy')}
                                            </p>
                                            <p className="text-xs text-slate-500 inline-flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {format(
                                                    new Date(appt.scheduledAt),
                                                    'h:mm a',
                                                )} · {appt.durationMinutes} min
                                            </p>
                                        </div>
                                        <StatusBadge status={appt.status} />
                                    </div>
                                    {appt.reason && (
                                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                                            {appt.reason}
                                        </p>
                                    )}
                                    {(isActive(appt.status) || isCompleted(appt.status)) && (
                                        <Link
                                            href={`/doctor/consultation/${appt.id}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-xl transition-all"
                                        >
                                            <Video className="w-4 h-4" />
                                            Open consultation
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {/* Prescriptions */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Prescriptions
                    </h2>
                    {patientPrescriptions.length > 0 && (
                        <p className="text-sm text-slate-500 font-medium">
                            {patientPrescriptions.length} total
                        </p>
                    )}
                </div>

                {loadingRx && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    </div>
                )}

                {!loadingRx && patientPrescriptions.length === 0 && (
                    <EmptyState
                        icon={<Pill className="w-12 h-12 text-slate-300" />}
                        title="No prescriptions yet"
                        message="Prescriptions you write for this patient will appear here."
                    />
                )}

                {!loadingRx && patientPrescriptions.length > 0 && (
                    <div className="space-y-4">
                        {patientPrescriptions.map((rx) => (
                            <div
                                key={rx.id}
                                className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                                            <Pill className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">
                                                {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                                            </p>
                                            {rx.appointment && (
                                                <p className="text-xs text-slate-500">
                                                    Visit:{' '}
                                                    {format(
                                                        new Date(rx.appointment.scheduledAt),
                                                        'MMM d, yyyy',
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {rx.appointmentId && (
                                        <Link
                                            href={`/doctor/consultation/${rx.appointmentId}`}
                                            className="text-xs font-bold text-brand-600 hover:text-brand-700"
                                        >
                                            View visit
                                        </Link>
                                    )}
                                </div>

                                {rx.items.length === 0 ? (
                                    <p className="text-sm text-slate-500">No medicines listed.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {rx.items.map((item) => (
                                            <li
                                                key={item.id}
                                                className="px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-100"
                                            >
                                                <p className="font-bold text-slate-900 text-sm">
                                                    {item.drugName}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {[item.dosage, item.frequency, item.duration]
                                                        .filter(Boolean)
                                                        .join(' · ') || 'No dosage details'}
                                                </p>
                                                {item.instructions && (
                                                    <p className="text-xs text-slate-600 italic mt-1">
                                                        {item.instructions}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {rx.notes && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                                        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                                        <span>{rx.notes}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </motion.div>
    );
}
