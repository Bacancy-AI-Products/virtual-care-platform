'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Video,
    ArrowRight,
    Clock,
    Plus,
    ChevronRight,
    Loader2,
    Sparkles,
    HeartPulse,
    Heart,
    Stethoscope,
    Smile,
    Sun,
    Moon,
    Cloud,
    Pill,
    CheckCircle2,
    Star,
    Brain,
    Baby,
    Flower2,
    Bone,
    Dumbbell,
    Eye,
    Ear,
    Wind,
    Activity,
    Ribbon,
    Droplet,
    Droplets,
    Syringe,
    ScanLine,
    Microscope,
    Siren,
    Scissors,
    Leaf,
    type LucideIcon,
} from 'lucide-react';
import {
    format,
    isToday,
    isFuture,
    isTomorrow,
    isThisWeek,
    differenceInMinutes,
    differenceInDays,
} from 'date-fns';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    prescriptionsApi,
    reviewsApi,
    type Appointment,
    type SpecializationOption,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return { greeting: 'Good morning', Icon: Sun, accent: 'text-amber-500' };
    if (h < 17) return { greeting: 'Good afternoon', Icon: Cloud, accent: 'text-sky-500' };
    return { greeting: 'Good evening', Icon: Moon, accent: 'text-indigo-500' };
}

function dayPillLabel(date: Date): string {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d');
}

function formatCountdown(date: Date): string {
    const minutes = differenceInMinutes(date, new Date());
    if (minutes <= 0) return 'Starting now';
    if (minutes < 60) return `in ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (isToday(date)) return remMin === 0 ? `in ${hours}h` : `in ${hours}h ${remMin}m`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    if (isThisWeek(date)) return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d • h:mm a');
}

// ─── Inline decorative SVG (medical + signs + dots pattern) ───────────────────

function HeroDecoration() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 320 160"
            className="w-full h-full"
            preserveAspectRatio="xMaxYMid slice"
        >
            <defs>
                <linearGradient id="blobA" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffd4b8" />
                    <stop offset="100%" stopColor="#fff8f4" />
                </linearGradient>
                <linearGradient id="blobB" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a7f3d0" />
                    <stop offset="100%" stopColor="#f0fdfa" />
                </linearGradient>
            </defs>

            {/* Soft floating blobs */}
            <circle cx="240" cy="70" r="60" fill="url(#blobA)" opacity="0.85" />
            <circle cx="190" cy="110" r="40" fill="url(#blobB)" opacity="0.65" />

            {/* Floating dots */}
            <circle cx="120" cy="30" r="3.5" fill="#f58220" opacity="0.7" />
            <circle cx="290" cy="35" r="3" fill="#14b8a6" opacity="0.7" />
            <circle cx="150" cy="140" r="3" fill="#fbbf24" opacity="0.7" />
            <circle cx="280" cy="135" r="3.5" fill="#f58220" opacity="0.5" />
        </svg>
    );
}

// ─── Welcome hero banner ──────────────────────────────────────────────────────

function WelcomeHero({ name }: { name: string }) {
    const { greeting, Icon: TodIcon, accent } = timeOfDay();

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-medical-soft rounded-3xl border border-slate-100 shadow-sm">
            {/* Decorative SVG (right side) — hidden on mobile to keep text readable */}
            <div className="hidden sm:block absolute inset-y-0 right-0 w-1/2 opacity-90 pointer-events-none">
                <HeroDecoration />
            </div>

            {/* Floating icon bubbles for character (desktop only) */}
            <div className="hidden md:flex absolute right-8 top-4 w-10 h-10 rounded-xl bg-white shadow-md items-center justify-center rotate-[-8deg]">
                <Heart className="w-5 h-5 text-brand-500" />
            </div>
            <div className="hidden md:flex absolute right-24 top-10 w-9 h-9 rounded-xl bg-white shadow-md items-center justify-center rotate-[6deg]">
                <Stethoscope className="w-4 h-4 text-medical-teal" />
            </div>
            <div className="hidden md:flex absolute right-14 bottom-5 w-9 h-9 rounded-xl bg-white shadow-md items-center justify-center rotate-[10deg]">
                <Smile className="w-4 h-4 text-amber-500" />
            </div>

            <div className="relative p-5 sm:p-6">
                <div className="min-w-0 sm:max-w-xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm">
                        <TodIcon className={`w-3 h-3 ${accent}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {greeting}
                        </span>
                    </div>
                    <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 break-words">
                        Hello, <span className="text-brand-600">{name}</span> 👋
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 font-medium">
                        How are you feeling today? Let&apos;s find you the right care.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Animated Next Appointment hero ───────────────────────────────────────────

function NextAppointmentEmpty() {
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-brand-100/30 blur-3xl" />
            <div className="relative flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                    Next Up
                </p>
            </div>
            <div className="relative flex-1 flex flex-col">
                <h4 className="font-bold text-slate-900 text-base sm:text-lg mb-1.5">
                    Nothing on your schedule
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Book a consultation with a specialist whenever you&apos;re ready.
                </p>
                <Link
                    href="/patient/doctors"
                    className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-sm shadow-brand-100 active:scale-95 w-fit"
                >
                    <Plus className="w-4 h-4" />
                    Book a visit
                </Link>
            </div>
        </div>
    );
}

function NextAppointmentHero({
    appt,
    specializationLabel,
}: {
    appt: Appointment;
    specializationLabel: string;
}) {
    const date = new Date(appt.scheduledAt);
    const countdown = formatCountdown(date);
    const minutesUntil = differenceInMinutes(date, new Date());
    const isStartingSoon = minutesUntil <= 15;
    const isImminent = minutesUntil <= 5;

    const countdownChip = isImminent
        ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
        : isStartingSoon
          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
          : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100';

    return (
        <div
            className={`relative overflow-hidden bg-gradient-to-br from-brand-50/60 via-white to-amber-50/40 p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm transition-shadow h-full flex flex-col ${
                isStartingSoon ? 'shadow-md' : ''
            }`}
        >
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-100/30 blur-3xl" />
            {isStartingSoon && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-brand-200/70 animate-pulse"
                />
            )}

            {/* Top row: Next Up label + countdown chip */}
            <div className="relative flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                    </span>
                    Next Up
                </span>
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${countdownChip} ${
                        isImminent ? 'animate-pulse' : ''
                    }`}
                >
                    {countdown}
                </span>
            </div>

            {/* Body: avatar + info on left, CTA on right (vertically centered) */}
            <div className="relative flex items-center gap-3 sm:gap-4 my-auto">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${appt.doctor.id}/100/100`}
                        alt={appt.doctor.user.name}
                        fill
                        className="rounded-2xl object-cover ring-2 ring-white shadow-md"
                        referrerPolicy="no-referrer"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-brand-500 ring-2 ring-white" />
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-lg font-bold text-slate-900 truncate leading-tight">
                        {appt.doctor.user.name}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">
                        {specializationLabel}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 font-semibold">
                        <Clock className="w-3 h-3" />
                        {format(date, 'h:mm a')}
                    </span>
                </div>

                <Link
                    href={`/patient/consultation/${appt.id}`}
                    aria-label={isStartingSoon ? 'Join call' : 'View appointment'}
                    className={`flex-shrink-0 inline-flex items-center justify-center gap-2 p-3 sm:px-5 sm:py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                        isStartingSoon
                            ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-100 animate-pulse'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                >
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">
                        {isStartingSoon ? 'Join Call' : 'View'}
                    </span>
                </Link>
            </div>
        </div>
    );
}

// ─── Care Journey horizontal timeline ─────────────────────────────────────────

function JourneyCard({
    appt,
    specializationLabel,
    index,
}: {
    appt: Appointment;
    specializationLabel: string;
    index: number;
}) {
    const date = new Date(appt.scheduledAt);
    const day = dayPillLabel(date);
    const pillTone = isToday(date)
        ? 'bg-brand-500 text-white'
        : isTomorrow(date)
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
        >
            <div className="flex items-center justify-between mb-3">
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${pillTone}`}
                >
                    {isToday(date) && (
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                    )}
                    {day}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                    <Clock className="w-3 h-3" />
                    {format(date, 'h:mm a')}
                </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${appt.doctor.id}/100/100`}
                        alt={appt.doctor.user.name}
                        fill
                        className="rounded-2xl object-cover ring-2 ring-slate-50"
                        referrerPolicy="no-referrer"
                    />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                        {appt.doctor.user.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{specializationLabel}</p>
                </div>
            </div>

            <Link
                href={`/patient/consultation/${appt.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-brand-50 text-brand-600 text-xs font-bold hover:bg-brand-100 transition-all"
            >
                <Video className="w-3.5 h-3.5" />
                {isToday(date) ? 'Join Call' : 'View Details'}
            </Link>
        </motion.div>
    );
}

function CareJourney({
    appointments,
    specializationNameById,
}: {
    appointments: Appointment[];
    specializationNameById: Map<string, string>;
}) {
    return (
        <section>
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Your Care Journey
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {appointments.length === 0
                            ? 'Visits will appear here once booked.'
                            : `${appointments.length} visit${appointments.length === 1 ? '' : 's'} ahead`}
                    </p>
                </div>
                <Link
                    href="/patient/appointments"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 group"
                >
                    All visits
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            {appointments.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
                    <Sparkles className="w-10 h-10 text-brand-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium mb-4">No upcoming visits yet.</p>
                    <Link
                        href="/patient/doctors"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 text-white font-bold rounded-2xl text-sm hover:bg-brand-600 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Book a visit
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {appointments.map((appt, i) => (
                        <JourneyCard
                            key={appt.id}
                            appt={appt}
                            index={i}
                            specializationLabel={
                                specializationNameById.get(appt.doctor.specialization) ??
                                appt.doctor.specialization
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ─── Care Team strip ─────────────────────────────────────────────────────────

interface CareTeamEntry {
    doctorId: string;
    name: string;
    specialization: string;
    lastVisit: Date;
    lastAppointmentId: string;
}

function CareTeam({ entries }: { entries: CareTeamEntry[] }) {
    return (
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Your Care Team
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {entries.length === 0
                            ? 'Doctors you visit will appear here.'
                            : `${entries.length} doctor${entries.length === 1 ? '' : 's'} you've seen`}
                    </p>
                </div>
                <Link
                    href="/patient/doctors"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 group"
                >
                    Find more
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            {entries.length === 0 ? (
                <div className="flex flex-col items-center text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-400 flex items-center justify-center mb-3">
                        <Stethoscope className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium mb-4">
                        Book your first visit to start building your care team.
                    </p>
                    <Link
                        href="/patient/doctors"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Find a specialist
                    </Link>
                </div>
            ) : (
                <ul className="divide-y divide-slate-50">
                    {entries.map((entry) => {
                        const daysAgo = differenceInDays(new Date(), entry.lastVisit);
                        const lastVisitLabel =
                            daysAgo === 0
                                ? 'Today'
                                : daysAgo === 1
                                  ? 'Yesterday'
                                  : daysAgo < 30
                                    ? `${daysAgo}d ago`
                                    : format(entry.lastVisit, 'MMM d');
                        return (
                            <li key={entry.doctorId}>
                                <Link
                                    href="/patient/doctors"
                                    className="group flex items-center gap-3 py-3 -mx-2 px-2 rounded-2xl hover:bg-slate-50 transition-colors"
                                >
                                    <div className="relative w-11 h-11 flex-shrink-0">
                                        <Image
                                            src={`https://picsum.photos/seed/${entry.doctorId}/100/100`}
                                            alt={entry.name}
                                            fill
                                            className="rounded-2xl object-cover ring-2 ring-slate-50 shadow-sm"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                                            {entry.name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {entry.specialization}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                            {lastVisitLabel}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Book again
                                            <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ─── Health Tip card with SVG ─────────────────────────────────────────────────

const TIPS = [
    {
        title: 'Stay hydrated',
        body: 'Drinking 8 glasses of water daily helps energy levels and skin health.',
    },
    {
        title: 'Move every hour',
        body: 'A 5-minute walk every hour improves circulation and posture.',
    },
    {
        title: 'Sleep matters',
        body: 'Aim for 7–9 hours of sleep — your immune system depends on it.',
    },
    {
        title: 'Breathe deeply',
        body: '4-7-8 breathing for two minutes lowers stress and clears the mind.',
    },
];

function HealthTipCard() {
    const today = new Date();
    const tipIndex = (today.getMonth() * 31 + today.getDate()) % TIPS.length;
    const tip = TIPS[tipIndex];

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-medical-soft via-white to-brand-50/30 p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
            {/* Decorative SVG */}
            <svg
                aria-hidden
                viewBox="0 0 200 160"
                className="absolute inset-0 w-full h-full opacity-50 pointer-events-none"
                preserveAspectRatio="xMaxYMid slice"
            >
                <defs>
                    <linearGradient id="tipBlob" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#fff8f4" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <circle cx="170" cy="55" r="65" fill="url(#tipBlob)" />
                <circle cx="185" cy="115" r="3" fill="#14b8a6" opacity="0.6" />
                <circle cx="150" cy="135" r="2" fill="#f58220" opacity="0.5" />
                <circle cx="180" cy="25" r="2" fill="#fbbf24" opacity="0.7" />
            </svg>

            <div className="relative flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-medical-soft text-medical-teal flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-medical-teal">
                    Daily Wellness
                </p>
            </div>
            <div className="relative flex-1">
                <h4 className="font-bold text-slate-900 text-base sm:text-lg mb-1.5">
                    {tip.title}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">{tip.body}</p>
            </div>
        </div>
    );
}

// ─── Browse Specialties horizontal carousel ───────────────────────────────────

/** Pick a recognizable Lucide icon for a medical specialty based on its id/name. */
function getSpecialtyIcon(idOrName: string): LucideIcon {
    const k = idOrName.toLowerCase();

    // Order matters — more specific matches first.
    if (/cardiac|cardio|heart/.test(k)) return /surg/.test(k) ? HeartPulse : Heart;
    if (/vascular/.test(k)) return HeartPulse;
    if (/critical|icu|intensive/.test(k)) return HeartPulse;
    if (/neuro|brain/.test(k)) return Brain;
    if (/psych|mental|therap/.test(k)) return Brain;
    if (/pediatric|paed|child/.test(k)) return Baby;
    if (/gyne|obst|fertility|matern/.test(k)) return Flower2;
    if (/dermat|cosmet|tricho|skin|hair/.test(k)) return Sparkles;
    if (/plastic/.test(k)) return Sparkles;
    if (/ortho(?!dont)|rheum|bone|joint/.test(k)) return Bone;
    if (/sport|fitness/.test(k)) return Dumbbell;
    if (/ophthal|optom|eye|vision/.test(k)) return Eye;
    if (/dent|orthodont|oral|tooth/.test(k)) return Smile;
    if (/ent|otolaryngol|ear|nose|throat/.test(k)) return Ear;
    if (/pulm|lung|respira/.test(k)) return Wind;
    if (/onco|cancer|tumor/.test(k)) return Ribbon;
    if (/hema|blood/.test(k)) return Droplet;
    if (/nephro|kidney/.test(k)) return Droplets;
    if (/uro|bladder/.test(k)) return Droplet;
    if (/hepa|liver/.test(k)) return Activity;
    if (/gastro|digest|stomach/.test(k)) return Activity;
    if (/endo|thyroid/.test(k)) return Activity;
    if (/diabet/.test(k)) return Syringe;
    if (/radio|imag/.test(k)) return ScanLine;
    if (/path/.test(k)) return Microscope;
    if (/emergency|trauma/.test(k)) return Siren;
    if (/surg/.test(k)) return Scissors;
    if (/ayurveda|homeo|unani|siddha|natur|altern/.test(k)) return Leaf;

    return Stethoscope; // general physician, family medicine, internal medicine, fallback
}

function BrowseSpecialties({ specialties }: { specialties: SpecializationOption[] }) {
    if (specialties.length === 0) return null;

    const shown = specialties.slice(0, 8);

    return (
        <section>
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Explore Specialties
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Find the right care, fast.
                    </p>
                </div>
                <Link
                    href="/patient/doctors"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 group"
                >
                    Browse all
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                {shown.map((s) => {
                    const Icon = getSpecialtyIcon(s.id || s.name);
                    return (
                        <Link
                            key={s.id}
                            href={`/patient/doctors?specialty=${s.id}`}
                            className="group flex-shrink-0 w-[150px] sm:w-[170px] bg-white border border-slate-100 p-4 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3 group-hover:bg-brand-100 transition-colors">
                                <Icon className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
                                {s.name}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

// ─── Active prescriptions card ───────────────────────────────────────────────

interface MiniPrescription {
    id: string;
    createdAt: string;
    doctorName: string | null;
    medicineSummary: string;
    itemCount: number;
}

function ActivePrescriptionsCard({ prescriptions }: { prescriptions: MiniPrescription[] }) {
    const recent = prescriptions.slice(0, 3);

    return (
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Active Prescriptions
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {prescriptions.length === 0
                            ? 'Prescriptions will appear after a visit.'
                            : `${prescriptions.length} on file`}
                    </p>
                </div>
                <Link
                    href="/patient/records"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 group"
                >
                    Records
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
            </div>

            {recent.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                        <Pill className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No prescriptions yet.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {recent.map((rx) => (
                        <li
                            key={rx.id}
                            className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-50 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Pill className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {rx.medicineSummary}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {rx.itemCount > 1 ? `${rx.itemCount} medicines · ` : ''}
                                    {rx.doctorName ? `By ${rx.doctorName} · ` : ''}
                                    {format(new Date(rx.createdAt), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ─── Pending reviews card ─────────────────────────────────────────────────────

interface PendingReviewEntry {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
    specialization: string;
    visitDate: Date;
}

function PendingReviewsCard({ pending }: { pending: PendingReviewEntry[] }) {
    const shown = pending.slice(0, 3);

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-50/60 via-white to-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-amber-100/40 blur-3xl" />

            <div className="relative flex items-end justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Share Your Experience
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {pending.length === 0
                            ? 'You’re all caught up on reviews.'
                            : `${pending.length} visit${pending.length === 1 ? '' : 's'} awaiting your rating`}
                    </p>
                </div>
                {pending.length > 0 && (
                    <Link
                        href="/patient/feedback"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 group flex-shrink-0"
                    >
                        All
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                )}
            </div>

            {shown.length === 0 ? (
                <div className="relative flex-1 flex flex-col items-center justify-center text-center py-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        Thanks — every visit has been reviewed.
                    </p>
                </div>
            ) : (
                <ul className="relative space-y-3">
                    {shown.map((entry) => (
                        <li
                            key={entry.appointmentId}
                            className="flex items-center gap-3 p-2 -mx-1 rounded-2xl"
                        >
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <Image
                                    src={`https://picsum.photos/seed/${entry.doctorId}/100/100`}
                                    alt={entry.doctorName}
                                    fill
                                    className="rounded-2xl object-cover ring-2 ring-white shadow-sm"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                    {entry.doctorName}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                    {entry.specialization} · {format(entry.visitDate, 'MMM d')}
                                </p>
                            </div>
                            <Link
                                href={`/patient/appointments/${entry.appointmentId}/review`}
                                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-all shadow-sm shadow-amber-100 flex-shrink-0"
                            >
                                <Star className="w-3 h-3" />
                                Rate
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
    const { user, token } = useAuth();

    const { data, isLoading } = useQuery({
        queryKey: ['appointments', 'patient', 'upcoming'],
        queryFn: () => appointmentsApi.list({ limit: 50 }),
        enabled: !!token,
    });

    const { data: specializationData } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const { data: prescriptionsData } = useQuery({
        queryKey: ['prescriptions', 'mine'],
        queryFn: () => prescriptionsApi.getMine({ limit: 50 }),
        enabled: !!token,
    });

    const { data: reviewsData } = useQuery({
        queryKey: ['reviews', 'mine'],
        queryFn: () => reviewsApi.getMine({ limit: 100 }),
        enabled: !!token,
    });

    const specializationNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        specializationData?.data.forEach((s: SpecializationOption) => {
            map.set(s.id, s.name);
        });
        return map;
    }, [specializationData]);

    const allAppointments = React.useMemo(() => data?.data ?? [], [data]);

    const upcoming = React.useMemo(
        () =>
            allAppointments
                .filter(
                    (a) =>
                        (a.status === 'PENDING' || a.status === 'CONFIRMED') &&
                        (isFuture(new Date(a.scheduledAt)) || isToday(new Date(a.scheduledAt))),
                )
                .sort(
                    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
                ),
        [allAppointments],
    );

    const nextAppt = upcoming[0] ?? null;
    const journeyVisits = nextAppt ? upcoming.slice(1) : upcoming;

    // Build care team from past completed visits (unique by doctor, latest first)
    const careTeam = React.useMemo<CareTeamEntry[]>(() => {
        const map = new Map<string, CareTeamEntry>();
        const completed = allAppointments
            .filter((a) => a.status === 'COMPLETED')
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        for (const appt of completed) {
            if (map.has(appt.doctor.id)) continue;
            map.set(appt.doctor.id, {
                doctorId: appt.doctor.id,
                name: appt.doctor.user.name,
                specialization:
                    specializationNameById.get(appt.doctor.specialization) ??
                    appt.doctor.specialization,
                lastVisit: new Date(appt.scheduledAt),
                lastAppointmentId: appt.id,
            });
        }
        return Array.from(map.values()).slice(0, 8);
    }, [allAppointments, specializationNameById]);

    // Recent prescriptions (latest first), with a short medicine summary
    const recentPrescriptions = React.useMemo<MiniPrescription[]>(() => {
        const all = prescriptionsData?.prescriptions ?? [];
        return [...all]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((rx) => ({
                id: rx.id,
                createdAt: rx.createdAt,
                doctorName: rx.doctor?.user.name ?? null,
                itemCount: rx.items.length,
                medicineSummary:
                    rx.items
                        .map((i) => i.drugName)
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(', ') || 'Prescription',
            }));
    }, [prescriptionsData]);

    // Completed visits that haven't been reviewed yet
    const pendingReviews = React.useMemo<PendingReviewEntry[]>(() => {
        const reviewedIds = new Set((reviewsData?.data ?? []).map((r) => r.appointmentId));
        return allAppointments
            .filter((a) => a.status === 'COMPLETED' && !reviewedIds.has(a.id))
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .slice(0, 5)
            .map((a) => ({
                appointmentId: a.id,
                doctorId: a.doctor.id,
                doctorName: a.doctor.user.name,
                specialization:
                    specializationNameById.get(a.doctor.specialization) ?? a.doctor.specialization,
                visitDate: new Date(a.scheduledAt),
            }));
    }, [allAppointments, reviewsData, specializationNameById]);

    const specialties = specializationData?.data ?? [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full min-w-0 space-y-4 sm:space-y-6 lg:space-y-8"
        >
            {/* Welcome hero */}
            <WelcomeHero name={user?.name ?? 'there'} />

            {/* Daily Wellness + Next Appointment — same row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                <HealthTipCard />
                {isLoading ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex justify-center items-center min-h-[180px]">
                        <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                    </div>
                ) : nextAppt ? (
                    <NextAppointmentHero
                        appt={nextAppt}
                        specializationLabel={
                            specializationNameById.get(nextAppt.doctor.specialization) ??
                            nextAppt.doctor.specialization
                        }
                    />
                ) : (
                    <NextAppointmentEmpty />
                )}
            </div>

            {/* Explore Specialties */}
            <BrowseSpecialties specialties={specialties} />

            {/* Care Journey + Care Team — both scale with sparse data */}
            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                    <div className="lg:col-span-2">
                        <CareJourney
                            appointments={journeyVisits}
                            specializationNameById={specializationNameById}
                        />
                    </div>
                    <CareTeam entries={careTeam} />
                </div>
            )}

            {/* Active Prescriptions + Pending Reviews */}
            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                    <ActivePrescriptionsCard prescriptions={recentPrescriptions} />
                    <PendingReviewsCard pending={pendingReviews} />
                </div>
            )}
        </motion.div>
    );
}
