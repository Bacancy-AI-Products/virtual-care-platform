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
    AlertCircle,
    ArrowUpRight,
    BellRing,
    FolderHeart,
    Scale,
    Thermometer,
    Upload,
    X,
    Flame,
    TriangleAlert,
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
import { motion, useMotionValue, useMotionValueEvent, animate } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    prescriptionsApi,
    reviewsApi,
    vitalsApi,
    filesApi,
    type Appointment,
    type SpecializationOption,
    type VitalSeries,
    type VitalStatus,
    type VitalType,
    type FileRecord,
} from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
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

// ─── Welcome hero banner (greeting + daily wellness tip) ─────────────────────

/**
 * Wellness tips shown on the right half of the welcome hero. The displayed
 * tip rotates daily (keyed by day-of-month) so the patient sees fresh content
 * across visits without it changing on every render.
 */
const WELLNESS_TIPS: Array<{
    title: string;
    body: string;
    icon: LucideIcon;
    accent: string;
}> = [
    {
        title: 'Stay hydrated',
        body: 'Aim for 8 glasses of water a day. Energy levels and skin both notice.',
        icon: Droplets,
        accent: 'bg-sky-50 text-sky-600',
    },
    {
        title: 'Get morning sunlight',
        body: '15 minutes outdoors helps vitamin D and locks your sleep cycle in.',
        icon: Sun,
        accent: 'bg-amber-50 text-amber-600',
    },
    {
        title: 'Sleep 7 to 9 hours',
        body: 'Your immune system, memory, and mood depend on it.',
        icon: Moon,
        accent: 'bg-indigo-50 text-indigo-600',
    },
    {
        title: 'Move daily',
        body: 'A 20 minute walk after meals helps blood sugar and digestion.',
        icon: Activity,
        accent: 'bg-emerald-50 text-emerald-600',
    },
    {
        title: 'Take meds on time',
        body: 'Set a phone reminder if you struggle. Consistency beats perfection.',
        icon: Pill,
        accent: 'bg-brand-50 text-brand-600',
    },
    {
        title: 'Eat colorful meals',
        body: 'Half your plate veggies and fruit. Different colors = different nutrients your body needs.',
        icon: Leaf,
        accent: 'bg-emerald-50 text-emerald-600',
    },
    {
        title: 'Breathe deeply',
        body: '4-7-8 breathing (in 4, hold 7, out 8) calms the nervous system in under a minute.',
        icon: Sparkles,
        accent: 'bg-violet-50 text-violet-600',
    },
    {
        title: 'Stretch every hour',
        body: 'Long sits stiffen joints. A 2-minute stretch keeps your back and neck happy.',
        icon: Dumbbell,
        accent: 'bg-rose-50 text-rose-600',
    },
    {
        title: 'Limit added sugar',
        body: 'Aim to keep added sugar under 25g a day. Check the labels — it hides in surprising places.',
        icon: Heart,
        accent: 'bg-pink-50 text-pink-600',
    },
    {
        title: 'Connect with someone',
        body: 'A 10-minute chat with a friend or family member lowers stress and lifts mood.',
        icon: Smile,
        accent: 'bg-amber-50 text-amber-600',
    },
    {
        title: 'Unplug before bed',
        body: 'No screens 30 minutes before sleep. Your melatonin (and tomorrow-you) will thank you.',
        icon: Moon,
        accent: 'bg-indigo-50 text-indigo-600',
    },
];

/**
 * Patient-facing decorative SVG for the welcome hero. A clean, professional
 * "health monitor card" — a stylised vitals dashboard tile showing a pulse
 * trace, a heart-rate badge, and a small medical cross accent. Different
 * vocabulary from the doctor hero (which uses a stethoscope + ECG curve)
 * but stays unambiguously in the health domain.
 */
function PatientHeroIllustration() {
    return (
        <svg
            viewBox="0 0 240 180"
            className="h-20 w-auto sm:h-24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <defs>
                <radialGradient id="ph-glow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="#22b8a4" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#22b8a4" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="ph-card" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
                <linearGradient id="ph-pulse" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22b8a4" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="ph-cross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22b8a4" />
                    <stop offset="100%" stopColor="#16876f" />
                </linearGradient>
            </defs>

            {/* Backdrop glow */}
            <circle cx="130" cy="90" r="80" fill="url(#ph-glow)" />

            {/* Floating medical cross badge (top-left) */}
            <g transform="translate(34 32)">
                <rect x="-14" y="-14" width="28" height="28" rx="8" fill="url(#ph-cross)" />
                <rect x="-7" y="-2" width="14" height="4" rx="1.5" fill="white" />
                <rect x="-2" y="-7" width="4" height="14" rx="1.5" fill="white" />
            </g>

            {/* Health-monitor card */}
            <g>
                {/* Card body */}
                <rect
                    x="64"
                    y="40"
                    width="150"
                    height="100"
                    rx="14"
                    fill="url(#ph-card)"
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                />
                {/* Card header */}
                <rect x="76" y="54" width="46" height="6" rx="3" fill="#cbd5e1" />
                <rect x="76" y="66" width="28" height="4" rx="2" fill="#e2e8f0" />

                {/* Heart-rate badge top-right of card */}
                <g transform="translate(190 60)">
                    <circle r="14" fill="#fee2e2" />
                    <path
                        d="M0 4 C0 4, -7 -1, -7 -6 C-7 -9, -5 -10.5, -3 -10 C-1.5 -9.5, -0.5 -8, 0 -7 C0.5 -8, 1.5 -9.5, 3 -10 C5 -10.5, 7 -9, 7 -6 C7 -1, 0 4, 0 4 Z"
                        fill="#f43f5e"
                    />
                </g>

                {/* Pulse trace */}
                <path
                    d="M76 110 L100 110 L108 96 L116 122 L124 86 L132 116 L140 110 L202 110"
                    stroke="url(#ph-pulse)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                {/* Endpoint dot on pulse */}
                <circle cx="202" cy="110" r="3.5" fill="white" stroke="#0ea5e9" strokeWidth="2" />

                {/* Bottom stat rows */}
                <rect x="76" y="124" width="34" height="4" rx="2" fill="#e2e8f0" />
                <rect x="116" y="124" width="22" height="4" rx="2" fill="#e2e8f0" />
                <rect x="144" y="124" width="26" height="4" rx="2" fill="#e2e8f0" />
            </g>

            {/* Floating pill capsule (bottom-right) */}
            <g transform="translate(204 150) rotate(35)">
                <rect x="-14" y="-6" width="28" height="12" rx="6" fill="#22b8a4" />
                <rect x="-14" y="-6" width="14" height="12" rx="6" fill="#16876f" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="white" strokeWidth="1" opacity="0.7" />
            </g>

            {/* Subtle particles */}
            <circle cx="32" cy="140" r="2.5" fill="#22b8a4" opacity="0.5" />
            <circle cx="220" cy="40" r="2" fill="#0ea5e9" opacity="0.5" />
        </svg>
    );
}

function WelcomeHero({ name }: { name: string }) {
    const { greeting, Icon: TodIcon, accent } = timeOfDay();
    const tip = WELLNESS_TIPS[new Date().getDate() % WELLNESS_TIPS.length];
    const TipIcon = tip.icon;

    return (
        <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-brand-50 via-white to-medical-soft px-5 py-5 shadow-sm sm:px-6">
            <span
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-brand-100/45 blur-3xl"
            />

            <div className="relative min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <TodIcon className={`h-3 w-3 ${accent}`} />
                    <span>{greeting}</span>
                </div>

                <h1 className="mt-1.5 break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Hello, <span className="text-brand-600">{name}</span>
                </h1>

                <div className="mt-2.5 flex items-start gap-2.5">
                    <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tip.accent}`}
                    >
                        <TipIcon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm leading-snug text-slate-600">
                        <span className="font-bold text-slate-800">{tip.title}.</span>{' '}
                        <span className="text-slate-500">{tip.body}</span>
                    </p>
                </div>
            </div>

            <div className="relative hidden flex-shrink-0 sm:block">
                <PatientHeroIllustration />
            </div>
        </div>
    );
}

// ─── Care Journey horizontal timeline ─────────────────────────────────────────

function JourneyCard({
    appt,
    specializationLabel,
    index,
    featured = false,
}: {
    appt: Appointment;
    specializationLabel: string;
    index: number;
    /**
     * Marks the very next upcoming visit. Renders a "Next Up" badge,
     * countdown chip, and a primary-coloured Join button when the visit is
     * within 15 minutes. Replaces the old standalone `NextAppointmentHero`.
     */
    featured?: boolean;
}) {
    const date = new Date(appt.scheduledAt);
    const day = dayPillLabel(date);
    const minutesUntil = differenceInMinutes(date, new Date());
    const isStartingSoon = minutesUntil <= 15;
    const isImminent = minutesUntil <= 5;
    const pillTone = isToday(date)
        ? 'bg-brand-500 text-white'
        : isTomorrow(date)
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600';
    const countdown = featured ? formatCountdown(date) : null;
    const countdownChip = isImminent
        ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
        : isStartingSoon
          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
          : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`relative bg-white p-5 rounded-3xl shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${
                featured
                    ? 'border-2 border-brand-200 bg-gradient-to-br from-brand-50/40 via-white to-white'
                    : 'border border-slate-100'
            }`}
        >
            {featured && (
                <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-brand-100">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    Next Up
                </span>
            )}
            <div className="flex items-center justify-between mb-3">
                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${pillTone}`}
                >
                    {isToday(date) && !featured && (
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                    )}
                    {day}
                </span>
                {countdown ? (
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${countdownChip} ${
                            isImminent ? 'animate-pulse' : ''
                        }`}
                    >
                        {countdown}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                        <Clock className="w-3 h-3" />
                        {format(date, 'h:mm a')}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 flex-shrink-0">
                    <Image
                        src={`https://i.pravatar.cc/150?u=${appt.doctor.user.id}`}
                        alt={appt.doctor.user.name}
                        fill
                        className="rounded-2xl object-cover ring-2 ring-slate-50"
                        referrerPolicy="no-referrer"
                    />
                    {featured && isStartingSoon && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500 ring-2 ring-white" />
                        </span>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                        {appt.doctor.user.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{specializationLabel}</p>
                    {featured && (
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            {format(date, 'h:mm a')}
                        </p>
                    )}
                </div>
            </div>

            <Link
                href={`/patient/consultation/${appt.id}`}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    featured && isStartingSoon
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-100 hover:bg-brand-600 animate-pulse'
                        : featured
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                }`}
            >
                <Video className="w-3.5 h-3.5" />
                {featured && isStartingSoon ? 'Join Call' : isToday(date) ? 'Join Call' : 'View'}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                    {appointments.map((appt, i) => (
                        <JourneyCard
                            key={appt.id}
                            appt={appt}
                            index={i}
                            // The first card replaces the standalone "Next Up"
                            // hero with a compact featured variant.
                            featured={i === 0}
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
                                            src={`https://i.pravatar.cc/150?u=${entry.doctorId}`}
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
                                    src={`https://i.pravatar.cc/150?u=${entry.doctorId}`}
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

// ─── Vitals widgets (Phase A + B) ────────────────────────────────────────────

const VITAL_ICONS: Record<VitalType, LucideIcon> = {
    BP_SYSTOLIC: Heart,
    BP_DIASTOLIC: Heart,
    HEART_RATE: Activity,
    BLOOD_SUGAR: Droplet,
    SPO2: Wind,
    TEMPERATURE: Thermometer,
    WEIGHT: Scale,
};

const STATUS_PILL: Record<VitalStatus, { chip: string; dot: string; label: string }> = {
    NORMAL: {
        chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        dot: 'bg-emerald-500',
        label: 'In range',
    },
    WARNING: {
        chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
        dot: 'bg-amber-500',
        label: 'Watch',
    },
    CRITICAL: {
        chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        dot: 'bg-rose-500',
        label: 'Critical',
    },
};

/**
 * Top-of-dashboard alert when the patient has had one or more CRITICAL
 * readings in the last 7 days. Hidden otherwise so a healthy dashboard
 * stays uncluttered.
 */
function CriticalVitalsAlert({ criticalCount }: { criticalCount: number }) {
    if (criticalCount === 0) return null;
    return (
        <Link
            href="/patient/vitals"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-50/40 p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
        >
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <AlertCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-rose-900 sm:text-base">
                        {criticalCount} critical reading{criticalCount === 1 ? '' : 's'} in the last
                        7 days
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-rose-700">
                        Open Insights to review the affected vitals and consider booking a
                        follow-up.
                    </p>
                </div>
            </div>
            <span className="hidden items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-100 transition-transform group-hover:translate-x-0.5 sm:inline-flex">
                Review
                <ArrowRight className="h-3.5 w-3.5" />
            </span>
        </Link>
    );
}

// (VitalSnapshotCard merged into HealthOverviewCard further down — kept the
//  STATUS_PILL + VITAL_ICONS lookups above for reuse.)

/**
 * Subtle dismissible nudge when the patient hasn't logged a vital in 3+ days.
 * Dismissal is per-browser via localStorage; if the patient logs a reading
 * later the date check resets the suppression so it can show again after the
 * next dry spell.
 */
const NUDGE_STORAGE_KEY = 'telecare:vitals-nudge-dismissed-at';

function VitalsAdherenceNudge({ daysSinceLastReading }: { daysSinceLastReading: number | null }) {
    const [dismissed, setDismissed] = React.useState(false);

    // Hydrate dismissal state from localStorage and decide whether to honour it.
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedRaw = window.localStorage.getItem(NUDGE_STORAGE_KEY);
        if (!storedRaw) return;
        const storedAt = new Date(storedRaw);
        if (Number.isNaN(storedAt.getTime())) return;
        // Re-show if it's been more than a day since they dismissed it.
        const hoursSince = (Date.now() - storedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) setDismissed(true);
    }, []);

    if (dismissed) return null;
    if (daysSinceLastReading == null || daysSinceLastReading < 3) return null;

    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-medium text-amber-800">
            <div className="flex min-w-0 items-start gap-2.5">
                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                    <span className="font-bold">
                        It&apos;s been {daysSinceLastReading} days since your last reading.
                    </span>{' '}
                    A quick log helps your doctor stay on top of any changes.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Link
                    href="/patient/vitals"
                    className="hidden rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-amber-700 sm:inline-flex"
                >
                    Log now
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        setDismissed(true);
                        if (typeof window !== 'undefined') {
                            window.localStorage.setItem(
                                NUDGE_STORAGE_KEY,
                                new Date().toISOString(),
                            );
                        }
                    }}
                    className="rounded-lg p-1 text-amber-700 transition-colors hover:bg-amber-100"
                    aria-label="Dismiss"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

/**
 * Compact shortcut tile linking to /patient/reports (Attachments). Counts the
 * patient's uploaded documents and shows the most recent one.
 */
function AttachmentsShortcutCard({ files }: { files: FileRecord[] }) {
    const count = files.length;
    const latest = files[0] ?? null; // /files/mine is already createdAt-desc

    return (
        <Link
            href="/patient/reports"
            className="group flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
        >
            <header className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                        <FolderHeart className="h-5 w-5" />
                    </span>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                            Attachments
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500">
                            Reports shared with your doctors
                        </p>
                    </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </header>

            <div className="mt-4 flex flex-1 flex-col justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold leading-none text-slate-900 tabular-nums">
                        {count}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                        document{count === 1 ? '' : 's'}
                    </p>
                </div>

                {latest ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Most recent
                        </p>
                        <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                            {latest.description || latest.originalName}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400">
                            {formatDistanceToNow(new Date(latest.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[11px] font-medium text-slate-500">
                        <Upload className="h-3.5 w-3.5 text-slate-400" />
                        Upload lab reports, scans, or referrals to share with your doctor.
                    </div>
                )}
            </div>
        </Link>
    );
}

// ─── Health Tracker (overall "how am I doing?" overview) ─────────────────────

interface HealthScore {
    /** 0-100 composite score, null when there are no readings. */
    value: number | null;
    label: 'excellent' | 'good' | 'watch' | 'attention' | 'new';
    headline: string;
    summary: string;
    color: { ring: string; bgSoft: string; text: string; gradient: string };
}

const SCORE_PALETTES: Record<HealthScore['label'], HealthScore['color']> = {
    excellent: {
        ring: '#10b981',
        bgSoft: 'bg-emerald-50',
        text: 'text-emerald-700',
        gradient: 'from-emerald-50/70',
    },
    good: {
        ring: '#22b8a4',
        bgSoft: 'bg-brand-50',
        text: 'text-brand-700',
        gradient: 'from-brand-50/70',
    },
    watch: {
        ring: '#f59e0b',
        bgSoft: 'bg-amber-50',
        text: 'text-amber-700',
        gradient: 'from-amber-50/70',
    },
    attention: {
        ring: '#f43f5e',
        bgSoft: 'bg-rose-50',
        text: 'text-rose-700',
        gradient: 'from-rose-50/70',
    },
    new: {
        ring: '#94a3b8',
        bgSoft: 'bg-slate-100',
        text: 'text-slate-700',
        gradient: 'from-slate-50',
    },
};

/**
 * Compute a composite weekly health score from the patient's vital readings.
 *
 *   base = % of readings in NORMAL status
 *   − 8 points per CRITICAL reading (capped at 60)
 *   − 3 points per WARNING reading (capped at 30)
 *
 * The cap stops a single bad day from zeroing the score out, while still
 * pushing it into "attention" territory the moment a critical reading lands.
 */
function computeHealthScore(series: VitalSeries[]): HealthScore & {
    normal: number;
    warning: number;
    critical: number;
    total: number;
    streakDays: number;
} {
    let normal = 0;
    let warning = 0;
    let critical = 0;
    const dayKeys = new Set<string>();
    for (const s of series) {
        for (const p of s.points) {
            if (p.status === 'NORMAL') normal++;
            else if (p.status === 'WARNING') warning++;
            else if (p.status === 'CRITICAL') critical++;
            dayKeys.add(new Date(p.recordedAt).toDateString());
        }
    }
    const total = normal + warning + critical;
    if (total === 0) {
        return {
            value: null,
            label: 'new',
            headline: 'Start tracking',
            summary: 'Log a reading to see your weekly health score.',
            color: SCORE_PALETTES.new,
            normal: 0,
            warning: 0,
            critical: 0,
            total: 0,
            streakDays: 0,
        };
    }
    const base = Math.round((normal / total) * 100);
    const criticalPenalty = Math.min(60, critical * 8);
    const warningPenalty = Math.min(30, warning * 3);
    const value = Math.max(0, Math.min(100, base - criticalPenalty - warningPenalty));

    let label: HealthScore['label'];
    let headline: string;
    let summary: string;
    if (critical > 0) {
        label = 'attention';
        headline = 'Needs attention';
        summary = `${critical} critical reading${critical === 1 ? '' : 's'} this week. Consider checking in with your doctor.`;
    } else if (value >= 90) {
        label = 'excellent';
        headline = 'Excellent';
        summary = 'Your vitals are tracking beautifully. Keep it going.';
    } else if (value >= 75) {
        label = 'good';
        headline = 'Looking good';
        summary =
            warning > 0
                ? `${warning} reading${warning === 1 ? '' : 's'} just outside normal — worth watching.`
                : 'Most of your readings are in a healthy range.';
    } else {
        label = 'watch';
        headline = 'Some watch-points';
        summary = `${warning} reading${warning === 1 ? '' : 's'} outside normal. Log consistently to spot the pattern.`;
    }

    return {
        value,
        label,
        headline,
        summary,
        color: SCORE_PALETTES[label],
        normal,
        warning,
        critical,
        total,
        streakDays: dayKeys.size,
    };
}

/**
 * Single combined "Your Health" panel. Merges what used to be two cards
 * (overall weekly score + per-vital snapshot tiles) since they shared one
 * purpose and one destination (the Vitals page). One card, one CTA, clearer
 * hierarchy: score and headline up top, individual readings below, streak
 * meta at the foot.
 */
function HealthOverviewCard({ series }: { series: VitalSeries[] }) {
    const score = React.useMemo(() => computeHealthScore(series), [series]);
    const empty = score.value == null;

    // Top-4 vitals by activity. Tiles read as drill-downs from the gauge.
    const rankedVitals = React.useMemo(
        () =>
            [...series]
                .filter((s) => s.latest != null)
                .sort((a, b) => b.points.length - a.points.length)
                .slice(0, 4),
        [series],
    );

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br ${score.color.gradient} via-white to-white shadow-sm`}
        >
            {/* Slow-breathing decorative glow: tells the patient this panel is "live" */}
            <motion.span
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl"
                style={{ backgroundColor: score.color.ring + '22' }}
                initial={{ opacity: 0.35, scale: 0.95 }}
                animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Header */}
            <header className="relative flex items-start justify-between gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
                <div className="flex items-center gap-3">
                    <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${score.color.bgSoft} ${score.color.text}`}
                    >
                        <HeartPulse className="h-5 w-5" />
                    </span>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                            Your Health
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500">
                            Weekly score · latest readings · trends
                        </p>
                    </div>
                </div>
                <Link
                    href="/patient/vitals"
                    className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold text-brand-600 transition-colors hover:bg-brand-50"
                >
                    Open vitals
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </header>

            {empty ? (
                <div className="relative m-5 mt-4 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center sm:m-6 sm:mt-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700">
                            Start tracking your health
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-500">
                            Log your first reading and we&apos;ll show you a weekly score and
                            per-vital trends here.
                        </p>
                    </div>
                    <Link
                        href="/patient/vitals"
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-100 transition-all hover:bg-brand-600"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Log a reading
                    </Link>
                </div>
            ) : (
                <>
                    {/* Score + status row */}
                    <div className="relative grid items-center gap-5 px-5 pt-5 sm:grid-cols-[auto_1fr] sm:gap-6 sm:px-6 sm:pt-5">
                        <div className="flex justify-center sm:justify-start">
                            <HealthGauge value={score.value ?? 0} color={score.color.ring} />
                        </div>

                        <div className="min-w-0">
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                                className={`text-lg font-bold tracking-tight ${score.color.text}`}
                            >
                                {score.headline}
                            </motion.p>
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.22 }}
                                className="mt-0.5 text-xs font-medium text-slate-600"
                            >
                                {score.summary}
                            </motion.p>

                            <motion.ul
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: {},
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.07,
                                            delayChildren: 0.3,
                                        },
                                    },
                                }}
                                className="mt-4 grid grid-cols-3 gap-2"
                            >
                                <ScoreStat
                                    icon={CheckCircle2}
                                    value={score.normal}
                                    label="In range"
                                    tone="emerald"
                                />
                                <ScoreStat
                                    icon={TriangleAlert}
                                    value={score.warning}
                                    label="Watch"
                                    tone={score.warning > 0 ? 'amber' : 'slate'}
                                />
                                <ScoreStat
                                    icon={AlertCircle}
                                    value={score.critical}
                                    label="Critical"
                                    tone={score.critical > 0 ? 'rose' : 'slate'}
                                />
                            </motion.ul>
                        </div>
                    </div>

                    {/* Divider */}
                    {rankedVitals.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.45 }}
                            className="relative mx-5 mt-5 flex items-center gap-3 sm:mx-6"
                        >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Latest readings
                            </p>
                            <span className="h-px flex-1 bg-slate-200/70" />
                        </motion.div>
                    )}

                    {/* Per-vital tiles — stagger in after the divider */}
                    {rankedVitals.length > 0 && (
                        <motion.ul
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: {},
                                visible: {
                                    transition: {
                                        staggerChildren: 0.08,
                                        delayChildren: 0.55,
                                    },
                                },
                            }}
                            className="relative grid grid-cols-2 gap-2.5 px-5 pt-3 sm:grid-cols-4 sm:gap-3 sm:px-6"
                        >
                            {rankedVitals.map((s) => {
                                const latest = s.latest;
                                if (!latest) return null;
                                const Icon = VITAL_ICONS[s.type];
                                const style = STATUS_PILL[latest.status];
                                return (
                                    <motion.li
                                        key={s.type}
                                        variants={{
                                            hidden: { opacity: 0, y: 10, scale: 0.96 },
                                            visible: {
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                                transition: {
                                                    duration: 0.35,
                                                    ease: [0.22, 1, 0.36, 1],
                                                },
                                            },
                                        }}
                                        whileHover={{ y: -2 }}
                                    >
                                        <Link
                                            href="/patient/vitals"
                                            className="group flex flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3 transition-shadow hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600">
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${style.chip}`}
                                                >
                                                    <span
                                                        className={`h-1 w-1 rounded-full ${style.dot}`}
                                                    />
                                                    {style.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500 leading-tight">
                                                {s.label}
                                            </p>
                                            <div className="flex items-baseline gap-1.5">
                                                <p className="text-xl font-bold leading-none text-slate-900 tabular-nums">
                                                    {latest.value.toFixed(s.reference.decimals)}
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    {s.unit}
                                                </p>
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-400">
                                                {formatDistanceToNow(new Date(latest.recordedAt), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </Link>
                                    </motion.li>
                                );
                            })}
                        </motion.ul>
                    )}

                    {/* Meta foot strip — fades in last */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.85 }}
                        className="relative mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white/60 px-5 py-3 backdrop-blur-sm sm:px-6"
                    >
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                            <span className="font-bold text-slate-700">{score.streakDays}</span> day
                            {score.streakDays === 1 ? '' : 's'} logged
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <Activity className="h-3.5 w-3.5 text-brand-500" />
                            <span className="font-bold text-slate-700">{score.total}</span> reading
                            {score.total === 1 ? '' : 's'} this week
                        </span>
                    </motion.div>
                </>
            )}
        </motion.section>
    );
}

/**
 * Stat tile shown inside the HealthOverviewCard breakdown row. Small, tonal,
 * always three across so the patient sees Normal / Watch / Critical at a glance.
 */
function ScoreStat({
    icon: Icon,
    value,
    label,
    tone,
}: {
    icon: LucideIcon;
    value: number;
    label: string;
    tone: 'emerald' | 'amber' | 'rose' | 'slate';
}) {
    const palette =
        tone === 'emerald'
            ? { bg: 'bg-emerald-50', fg: 'text-emerald-600', text: 'text-emerald-700' }
            : tone === 'amber'
              ? { bg: 'bg-amber-50', fg: 'text-amber-600', text: 'text-amber-700' }
              : tone === 'rose'
                ? { bg: 'bg-rose-50', fg: 'text-rose-600', text: 'text-rose-700' }
                : { bg: 'bg-slate-100', fg: 'text-slate-500', text: 'text-slate-600' };
    return (
        <motion.li
            variants={{
                hidden: { opacity: 0, y: 8, scale: 0.96 },
                visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                },
            }}
            whileHover={{ y: -1 }}
            className={`flex items-center gap-2 rounded-xl ${palette.bg} px-2.5 py-2`}
        >
            <Icon className={`h-3.5 w-3.5 ${palette.fg}`} />
            <div className="min-w-0">
                <p className={`text-sm font-bold leading-none tabular-nums ${palette.text}`}>
                    {value}
                </p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
            </div>
        </motion.li>
    );
}

/**
 * SVG circular gauge for the weekly health score. The ring fills from 0 →
 * value on mount, while the centre number counts up in sync. Both share a
 * single motion value so the animation feels like one beat, not two.
 */
function HealthGauge({ value, color }: { value: number; color: string }) {
    const size = 120;
    const stroke = 11;
    const r = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, value));

    // Shared motion value drives both the ring offset and the number.
    const progress = useMotionValue(0);
    const [display, setDisplay] = React.useState(0);
    const [dashOffset, setDashOffset] = React.useState(circumference);

    useMotionValueEvent(progress, 'change', (latest) => {
        setDisplay(Math.round(latest));
        setDashOffset(circumference - (latest / 100) * circumference);
    });

    React.useEffect(() => {
        const controls = animate(progress, clamped, {
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1],
        });
        return () => controls.stop();
    }, [clamped, progress]);

    return (
        <div className="relative h-28 w-28 sm:h-32 sm:w-32">
            {/* Subtle pulsing outer halo for the "live monitoring" feel */}
            <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ opacity: 0.18, scale: 0.92 }}
                animate={{ opacity: [0.12, 0.22, 0.12], scale: [0.92, 1.04, 0.92] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p
                    className="text-3xl font-bold leading-none tabular-nums sm:text-4xl"
                    style={{ color }}
                >
                    {display}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    /100
                </p>
            </div>
        </div>
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

    // Vitals trends powering the Critical alert, Vital snapshot, and the
    // adherence nudge. 7-day window covers "what happened this week".
    const { data: trendsData } = useQuery({
        queryKey: ['vitals', 'mine', 'trends', 7],
        queryFn: () => vitalsApi.getMyTrends(7),
        enabled: !!token && user?.role === 'PATIENT',
        staleTime: 1000 * 60,
    });

    // Uploaded medical documents for the Attachments shortcut tile.
    const { data: filesData } = useQuery({
        queryKey: ['files', 'mine'],
        queryFn: () => filesApi.getAll(),
        enabled: !!token && user?.role === 'PATIENT',
        staleTime: 1000 * 60,
    });

    const vitalSeries = React.useMemo(() => trendsData?.series ?? [], [trendsData]);
    const criticalCountThisWeek = React.useMemo(
        () =>
            vitalSeries.reduce(
                (sum, s) => sum + s.points.filter((p) => p.status === 'CRITICAL').length,
                0,
            ),
        [vitalSeries],
    );
    // Most recent reading timestamp across every vital. Plain const (not
    // memoised) because `Date.now()` is impure; the dashboard renders
    // infrequently so recomputing on every render is harmless.
    const latestReadingMs: number | null = (() => {
        let latest: number | null = null;
        for (const s of vitalSeries) {
            if (!s.latest) continue;
            const t = new Date(s.latest.recordedAt).getTime();
            if (latest == null || t > latest) latest = t;
        }
        return latest;
    })();
    // `Date.now()` is "impure" by React's strict purity rule, but the resulting
    // staleness (off by one render frame) is harmless for a "days ago" age
    // display. Disabling the rule for this one line keeps the code readable.
    const daysSinceLastReading: number | null =
        latestReadingMs == null
            ? null
            : // eslint-disable-next-line react-hooks/purity
              Math.floor((Date.now() - latestReadingMs) / (1000 * 60 * 60 * 24));

    // Only count documents the patient themselves uploaded. Appointment-
    // scoped files attached by the doctor live in their own surface.
    const myDocuments = React.useMemo<FileRecord[]>(
        () => (filesData ?? []).filter((f) => f.uploadedBy.role === 'PATIENT'),
        [filesData],
    );

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

    // The standalone "Next Up" hero was retired. Care Journey now renders
    // every upcoming visit, with the first one styled as featured. Keeping
    // `journeyVisits` as a simple alias documents the intent.
    const journeyVisits = upcoming;

    // Build care team from past completed visits (unique by doctor, latest first)
    const careTeam = React.useMemo<CareTeamEntry[]>(() => {
        const map = new Map<string, CareTeamEntry>();
        const completed = allAppointments
            .filter((a) => a.status === 'COMPLETED')
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        for (const appt of completed) {
            if (map.has(appt.doctor.id)) continue;
            map.set(appt.doctor.id, {
                doctorId: appt.doctor.user.id,
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
                doctorId: a.doctor.user.id,
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

            {/* Critical-reading alert (only when needed) */}
            <CriticalVitalsAlert criticalCount={criticalCountThisWeek} />

            {/* Single combined "Your Health" panel — weekly score, latest
                readings per vital, and the logging streak. Replaces the
                separate Health Tracker + My Vitals cards. */}
            <HealthOverviewCard series={vitalSeries} />

            {/* Adherence nudge (only when 3+ days dormant) */}
            <VitalsAdherenceNudge daysSinceLastReading={daysSinceLastReading} />

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

            {/* Active Prescriptions + Pending Reviews + Attachments shortcut */}
            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
                    <ActivePrescriptionsCard prescriptions={recentPrescriptions} />
                    <PendingReviewsCard pending={pendingReviews} />
                    <AttachmentsShortcutCard files={myDocuments} />
                </div>
            )}
        </motion.div>
    );
}
