'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Clock,
    Video,
    Star,
    MoreVertical,
    Loader2,
    Activity,
    Stethoscope,
    BadgeCheck,
    MessageSquare,
    Timer,
    TrendingUp,
    TrendingDown,
    Users,
    XCircle,
    ArrowUpRight,
    AlertCircle,
    RotateCw,
} from 'lucide-react';
import { format, isToday, startOfWeek, subWeeks, isAfter, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    reviewsApi,
    type Appointment,
    type ReviewsSummary,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { RatingStars } from '@/components/ui/RatingStars';
import { LoadingState } from '@/components/ui/LoadingState';

const WEEKS_BACK = 12;
const RECENT_COUNT = 5;

// ─── Today's Appointments card ────────────────────────────────────────────────

function TodayAppointmentsCard({ today, isLoading }: { today: Appointment[]; isLoading: boolean }) {
    return (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                        Today&apos;s Appointments
                    </h3>
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-50 text-brand-600 text-[11px] font-bold">
                        {today.length}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
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
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                </div>
            ) : today.length === 0 ? (
                <div className="p-6 sm:p-8 bg-white/60 rounded-2xl border border-dashed border-slate-200 text-center">
                    <Stethoscope className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">
                        No appointments scheduled for today.
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5 sm:space-y-3">
                    {today.map((appt) => (
                        <AppointmentRow key={appt.id} appt={appt} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({ appt }: { appt: Appointment }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${appt.patient.user.id}/100/100`}
                        alt={appt.patient.user.name}
                        fill
                        className="rounded-2xl object-cover border-4 border-slate-50 shadow-sm"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white z-10" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">
                        {appt.patient.user.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {format(new Date(appt.scheduledAt), 'hh:mm a')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-brand-50 text-brand-600">
                            <Video className="w-3 h-3" /> Video
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
                <Link
                    href={`/doctor/consultation/${appt.id}`}
                    className="px-4 py-2.5 bg-brand-500 text-white text-xs sm:text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-md shadow-brand-100 active:scale-95 flex items-center gap-2"
                >
                    <Video className="w-4 h-4" /> Start Call
                </Link>
                <button className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// ─── KPI card with sparkline ──────────────────────────────────────────────────

const ACCENTS = {
    brand: { text: 'text-brand-600', bg: 'bg-brand-50', color: '#22b8a4' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', color: '#f59e0b' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-50', color: '#0ea5e9' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50', color: '#f43f5e' },
    slate: { text: 'text-slate-600', bg: 'bg-slate-100', color: '#94a3b8' },
} as const;

function KpiCard({
    icon: Icon,
    accent,
    label,
    value,
    hint,
    series,
}: {
    icon: React.ElementType;
    accent: keyof typeof ACCENTS;
    label: string;
    value: string;
    hint: string;
    series: number[] | null;
}) {
    const palette = ACCENTS[accent];
    return (
        <div className="flex h-full items-start gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 overflow-hidden">
            {/* Icon */}
            <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${palette.bg}`}
            >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${palette.text}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-400 leading-tight break-words">
                    {label}
                </p>
                <p className="mt-1 text-2xl lg:text-3xl font-bold text-slate-900 leading-none break-words">
                    {value}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-snug break-words">
                    {hint}
                </p>
                {series && series.length > 1 && (
                    <div className="mt-2 -mx-1">
                        <Sparkline series={series} color={palette.color} />
                    </div>
                )}
            </div>
        </div>
    );
}

function Sparkline({ series, color }: { series: number[]; color: string }) {
    const w = 100;
    const h = 28;
    const max = Math.max(...series);
    const min = Math.min(...series);
    const range = Math.max(0.01, max - min);
    const points = series.map((v, i) => {
        const x = (i / (series.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${x},${y}`;
    });
    const linePath = `M${points.join(' L')}`;
    const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
    const gradId = `spark-${React.useId()}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ─── Trend area chart ─────────────────────────────────────────────────────────

function TrendCard({
    buckets,
    total,
    thisWeek,
    trendDelta,
    trendPct,
}: {
    buckets: WeekBucket[];
    total: number;
    thisWeek: number;
    trendDelta: number;
    trendPct: number;
}) {
    const TrendIcon = trendDelta >= 0 ? TrendingUp : TrendingDown;
    const trendColor =
        trendDelta > 0
            ? 'text-emerald-600 bg-emerald-50'
            : trendDelta < 0
              ? 'text-rose-600 bg-rose-50'
              : 'text-slate-500 bg-slate-100';
    return (
        <div className="bg-white rounded-[20px] sm:rounded-[28px] lg:rounded-[36px] border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-7 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
                <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Consultation trend
                    </p>
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
                        Completed visits — last {WEEKS_BACK} weeks
                    </h3>
                    <div className="mt-2 inline-flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-700">
                            This week: {thisWeek}
                        </span>
                        <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${trendColor}`}
                        >
                            <TrendIcon className="w-2.5 h-2.5" />
                            {trendDelta === 0
                                ? 'flat'
                                : trendDelta > 0
                                  ? `+${trendPct}%`
                                  : `${trendPct}%`}
                        </span>
                    </div>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                        {total}
                    </p>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
                        total
                    </p>
                </div>
            </div>

            <AreaChart buckets={buckets} />
        </div>
    );
}

function AreaChart({ buckets }: { buckets: WeekBucket[] }) {
    const w = 720;
    const h = 240;
    const padTop = 16;
    const padBottom = 36;
    const padLeft = 40;
    const padRight = 12;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;
    const max = Math.max(1, ...buckets.map((b) => b.count));

    const points = buckets.map((b, i) => {
        const x = padLeft + (i / Math.max(1, buckets.length - 1)) * chartW;
        const y = padTop + (1 - b.count / max) * chartH;
        return { x, y, count: b.count, weekStart: b.weekStart };
    });

    const linePath = `M${points.map((p) => `${p.x},${p.y}`).join(' L')}`;
    const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`;

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
        v: Math.round(max * (1 - f) * 10) / 10,
        y: padTop + f * chartH,
    }));

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
                <defs>
                    <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#22b8a4" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#22b8a4" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {ticks.map((t, i) => (
                    <g key={i}>
                        <line
                            x1={padLeft}
                            x2={w - padRight}
                            y1={t.y}
                            y2={t.y}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="2 4"
                        />
                        <text
                            x={padLeft - 6}
                            y={t.y + 4}
                            fontSize="12"
                            fill="#94a3b8"
                            fontWeight="600"
                            textAnchor="end"
                        >
                            {t.v}
                        </text>
                    </g>
                ))}

                <path d={areaPath} fill="url(#areaGrad)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="#22b8a4"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {points.map((p, i) => (
                    <g key={i}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill="white"
                            stroke="#22b8a4"
                            strokeWidth="2"
                        >
                            <title>{`Week of ${format(p.weekStart, 'MMM d')} · ${p.count} visit${p.count === 1 ? '' : 's'}`}</title>
                        </circle>
                    </g>
                ))}

                {points.map((p, i) =>
                    i % 3 === 0 || i === points.length - 1 ? (
                        <text
                            key={`l-${i}`}
                            x={p.x}
                            y={h - 10}
                            fontSize="13"
                            fill="#94a3b8"
                            fontWeight="700"
                            textAnchor="middle"
                        >
                            {format(p.weekStart, 'MMM d')}
                        </text>
                    ) : null,
                )}
            </svg>
        </div>
    );
}

// ─── Status breakdown donut ───────────────────────────────────────────────────

interface StatusBreakdown {
    completed: number;
    upcoming: number;
    cancelled: number;
    noShow: number;
}

function StatusBreakdownCard({ breakdown }: { breakdown: StatusBreakdown }) {
    const total = breakdown.completed + breakdown.upcoming + breakdown.cancelled + breakdown.noShow;
    const segments = [
        { key: 'completed', label: 'Completed', value: breakdown.completed, color: '#22b8a4' },
        { key: 'upcoming', label: 'Upcoming', value: breakdown.upcoming, color: '#0ea5e9' },
        { key: 'cancelled', label: 'Cancelled', value: breakdown.cancelled, color: '#f43f5e' },
        { key: 'noShow', label: 'No-show', value: breakdown.noShow, color: '#f59e0b' },
    ];

    return (
        <div className="bg-white rounded-[20px] sm:rounded-[28px] lg:rounded-[36px] border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-7 h-full">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Distribution
            </p>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 sm:mb-5">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
                Appointment breakdown
            </h3>

            {total === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center font-medium">
                    No appointments yet.
                </p>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 lg:gap-8">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                        <Donut segments={segments} total={total} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                                {total}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                appointments
                            </p>
                        </div>
                    </div>
                    <ul className="flex-1 min-w-0 space-y-3 w-full">
                        {segments.map((s) => {
                            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                            return (
                                <li key={s.key}>
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ background: s.color }}
                                            />
                                            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
                                                {s.label}
                                            </span>
                                        </div>
                                        <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                                            {s.value}{' '}
                                            <span className="text-slate-400 font-medium">
                                                ({pct}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{ background: s.color, width: `${pct}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Donut({
    segments,
    total,
}: {
    segments: Array<{ key: string; label: string; value: number; color: string }>;
    total: number;
}) {
    const size = 160;
    const r = 60;
    const stroke = 18;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            {segments.map((s) => {
                if (s.value === 0) return null;
                const length = (s.value / total) * circumference;
                const dasharray = `${length} ${circumference - length}`;
                const el = (
                    <circle
                        key={s.key}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={stroke}
                        strokeDasharray={dasharray}
                        strokeDashoffset={-offset}
                        strokeLinecap="butt"
                    >
                        <title>{`${s.label}: ${s.value}`}</title>
                    </circle>
                );
                offset += length;
                return el;
            })}
        </svg>
    );
}

// ─── Reputation card ──────────────────────────────────────────────────────────

function ReputationCard({
    averageRating,
    reviewCount,
    consultationCount,
    summary,
}: {
    averageRating: number | null;
    reviewCount: number;
    consultationCount: number;
    summary: ReviewsSummary | null;
}) {
    const distribution = summary?.distribution ?? null;
    return (
        <div className="bg-white rounded-[20px] sm:rounded-[28px] lg:rounded-[36px] border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-7 h-full flex flex-col">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Reputation
            </p>
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 sm:mb-5">
                <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
                Patient sentiment
            </h3>

            {averageRating == null ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                    <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-900">No reviews yet</p>
                    <p className="mt-1 text-xs text-slate-500 font-medium max-w-xs">
                        Once patients submit reviews after completed consultations they&apos;ll
                        appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-end gap-4 sm:gap-5 mb-4 sm:mb-5">
                        <p className="text-4xl sm:text-5xl font-bold text-slate-900 leading-none tracking-tight">
                            {averageRating.toFixed(1)}
                        </p>
                        <div className="pb-1">
                            <RatingStars value={averageRating} size="md" />
                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                                {reviewCount.toLocaleString()} review
                                {reviewCount === 1 ? '' : 's'}
                                {consultationCount > 0 &&
                                    ` · ${consultationCount.toLocaleString()} served`}
                            </p>
                        </div>
                    </div>
                    {distribution && (
                        <ul className="space-y-1.5">
                            {([5, 4, 3, 2, 1] as const).map((star) => {
                                const count = distribution[star];
                                const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                                return (
                                    <li key={star} className="flex items-center gap-3 text-xs">
                                        <span className="w-3 font-bold text-slate-500">{star}</span>
                                        <Star
                                            className="w-3 h-3 text-amber-400"
                                            fill="currentColor"
                                        />
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="w-6 text-right font-semibold text-slate-500 tabular-nums">
                                            {count}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Recent activity ──────────────────────────────────────────────────────────

function RecentActivityCard({ recent }: { recent: Appointment[] }) {
    return (
        <div className="bg-white rounded-[20px] sm:rounded-[28px] lg:rounded-[36px] border border-slate-100 shadow-sm p-4 sm:p-5 lg:p-7">
            <div className="flex items-center justify-between mb-4 sm:mb-5 gap-4">
                <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Activity
                    </p>
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-brand-500" />
                        Recent completed visits
                    </h3>
                </div>
                {recent.length > 0 && (
                    <Link
                        href="/doctor/appointments"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                        See all <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>

            {recent.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center font-medium">
                    No completed visits yet.
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {recent.map((a) => {
                        const initials = a.patient.user.name
                            .split(' ')
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase();
                        const today = isSameDay(new Date(a.scheduledAt), new Date());
                        return (
                            <li key={a.id} className="py-3 flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                    {initials || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {a.patient.user.name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium truncate">
                                        {a.reason || 'Consultation completed'}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] sm:text-xs font-bold text-slate-700">
                                        {today
                                            ? `Today · ${format(new Date(a.scheduledAt), 'h:mm a')}`
                                            : format(new Date(a.scheduledAt), 'MMM d')}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ─── Compute insights ─────────────────────────────────────────────────────────

interface WeekBucket {
    weekStart: Date;
    count: number;
}

interface ComputedInsights {
    completedCount: number;
    upcomingCount: number;
    declinedCount: number;
    totalDecisions: number;
    thisWeekCompleted: number;
    avgDurationMinutes: number | null;
    weeklyBuckets: WeekBucket[];
    last12Total: number;
    statusBreakdown: StatusBreakdown;
    recentCompleted: Appointment[];
}

function computeInsights(appointments: Appointment[]): ComputedInsights {
    const completed = appointments.filter((a) => a.status === 'COMPLETED');
    const upcoming = appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED');
    const declined = appointments.filter((a) => a.status === 'CANCELLED_BY_DOCTOR');
    const cancelled = appointments.filter(
        (a) => a.status === 'CANCELLED_BY_PATIENT' || a.status === 'CANCELLED_BY_DOCTOR',
    );
    const noShow = appointments.filter((a) => a.status === 'NO_SHOW');

    const now = new Date();
    const weekZeroStart = startOfWeek(now, { weekStartsOn: 1 });
    const buckets: WeekBucket[] = [];
    for (let i = WEEKS_BACK - 1; i >= 0; i--) {
        buckets.push({ weekStart: subWeeks(weekZeroStart, i), count: 0 });
    }
    for (const appt of completed) {
        const t = new Date(appt.scheduledAt);
        for (let i = buckets.length - 1; i >= 0; i--) {
            if (isAfter(t, buckets[i].weekStart) || +t === +buckets[i].weekStart) {
                buckets[i].count += 1;
                break;
            }
        }
    }

    const durations: number[] = [];
    for (const a of completed) {
        if (a.sessionStartedAt && a.sessionEndedAt) {
            const minutes =
                (new Date(a.sessionEndedAt).getTime() - new Date(a.sessionStartedAt).getTime()) /
                60_000;
            if (minutes > 0 && minutes < 24 * 60) durations.push(minutes);
        }
    }
    const avgDurationMinutes =
        durations.length > 0
            ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
            : null;

    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekCompleted = completed.filter((a) =>
        isAfter(new Date(a.scheduledAt), thisWeekStart),
    ).length;

    const recentCompleted = [...completed]
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, RECENT_COUNT);

    return {
        completedCount: completed.length,
        upcomingCount: upcoming.length,
        declinedCount: declined.length,
        totalDecisions: completed.length + declined.length,
        thisWeekCompleted,
        avgDurationMinutes,
        weeklyBuckets: buckets,
        last12Total: buckets.reduce((s, w) => s + w.count, 0),
        statusBreakdown: {
            completed: completed.length,
            upcoming: upcoming.length,
            cancelled: cancelled.length,
            noShow: noShow.length,
        },
        recentCompleted,
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const isActive = (s: string) => s === 'PENDING' || s === 'CONFIRMED';

export default function DoctorDashboard() {
    const { user, token } = useAuth();
    const qClient = useQueryClient();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const {
        data,
        isLoading: loadingAppts,
        isFetching: fetchingAppts,
        isError: apptsError,
    } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 500 }),
        enabled: !!token,
    });

    const {
        data: doctorProfile,
        isLoading: loadingProfile,
        isFetching: fetchingProfile,
    } = useQuery({
        queryKey: ['doctor', 'me'],
        queryFn: () => doctorsApi.getMe(),
        enabled: !!token && user?.role === 'DOCTOR',
        staleTime: 1000 * 60 * 5,
    });

    const { data: reviewsData } = useQuery({
        queryKey: ['doctor', doctorProfile?.id, 'reviews', 'insights'],
        queryFn: () => reviewsApi.listByDoctor(doctorProfile!.id, { page: 1, limit: 1 }),
        enabled: !!doctorProfile?.id,
    });

    const allAppointments = React.useMemo(() => data?.data ?? [], [data]);

    const todayAppointments = React.useMemo(
        () => allAppointments.filter((a) => isToday(new Date(a.scheduledAt)) && isActive(a.status)),
        [allAppointments],
    );

    const insights = React.useMemo(() => computeInsights(allAppointments), [allAppointments]);

    const formatDoctorDisplayName = (name: string | null | undefined): string => {
        const raw = (name ?? '').trim();
        if (!raw) return 'Doctor';
        return /^dr\.?\s/i.test(raw) ? raw : `Dr. ${raw}`;
    };

    const stats = doctorProfile?.stats;
    const avgRating = stats?.averageRating ?? null;
    const reviewCount = stats?.reviewCount ?? 0;

    const declineRate =
        insights.totalDecisions > 0
            ? Math.round((insights.declinedCount / insights.totalDecisions) * 100)
            : 0;
    const lastWeekCount = insights.weeklyBuckets[insights.weeklyBuckets.length - 2]?.count ?? 0;
    const trendDelta = insights.thisWeekCompleted - lastWeekCount;
    const trendPct =
        lastWeekCount > 0
            ? Math.round((trendDelta / lastWeekCount) * 100)
            : insights.thisWeekCompleted > 0
              ? 100
              : 0;

    // Wait until: the component is mounted, auth has hydrated, and the primary
    // queries have either delivered data or are still in flight (incl. retries).
    // We deliberately do NOT gate on profile errors — profile is supplementary
    // and the page renders fine with sensible fallbacks.
    const apptsSettled = !loadingAppts && !fetchingAppts;
    const profileSettled = !loadingProfile && !fetchingProfile;
    const showLoader =
        !mounted ||
        !token ||
        (!apptsSettled && !data) ||
        (user?.role === 'DOCTOR' && !profileSettled && !doctorProfile);

    // Only surface the error banner when appointments truly failed (settled with
    // no data, no fetch in flight). Profile errors do not block the page.
    const showApptsError = apptsSettled && apptsError && !data;

    const retryAll = () => {
        qClient.invalidateQueries({ queryKey: ['appointments', 'doctor', 'all'] });
        qClient.invalidateQueries({ queryKey: ['doctor', 'me'] });
    };

    // After the loader, we always render the dashboard. If appointments failed
    // we show a small inline retry banner inside the page instead of replacing
    // it with a full-screen error.
    const isLoading = !apptsSettled;

    if (showLoader) {
        return <LoadingState message="Loading your dashboard…" />;
    }

    const visitsSeries = insights.weeklyBuckets.map((w) => w.count);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full min-w-0 space-y-4 sm:space-y-6 lg:space-y-8"
        >
            {/* Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h2 className="mb-1 sm:mb-1.5 text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900">
                        Welcome back, {formatDoctorDisplayName(user?.name)}
                    </h2>
                    <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium">
                        {isLoading
                            ? 'Loading your schedule...'
                            : `You have ${todayAppointments.length} appointment${todayAppointments.length === 1 ? '' : 's'} today.`}
                    </p>
                </div>
            </div>

            {/* Soft inline retry banner when appointments failed entirely */}
            {showApptsError && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-sm font-medium text-amber-900">
                            Some dashboard data couldn&apos;t load. The numbers below may be
                            incomplete.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={retryAll}
                        disabled={fetchingAppts}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {fetchingAppts ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RotateCw className="w-3.5 h-3.5" />
                        )}
                        Retry
                    </button>
                </div>
            )}

            {/* Top 4 KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KpiCard
                    icon={Stethoscope}
                    accent="brand"
                    label="Visits"
                    value={insights.last12Total.toString()}
                    hint={`Last ${WEEKS_BACK} weeks`}
                    series={visitsSeries}
                />
                <KpiCard
                    icon={Star}
                    accent="amber"
                    label="Rating"
                    value={avgRating != null ? avgRating.toFixed(1) : 'New'}
                    hint={`${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
                    series={avgRating != null ? [4, 4.2, 3.9, 4.3, 4.1, 4.5, avgRating] : null}
                />
                <KpiCard
                    icon={Timer}
                    accent="sky"
                    label="Response"
                    value={stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}m` : '—'}
                    hint="Avg join time"
                    series={null}
                />
                <KpiCard
                    icon={XCircle}
                    accent={declineRate > 25 ? 'rose' : 'slate'}
                    label="Decline rate"
                    value={`${declineRate}%`}
                    hint={`${insights.declinedCount} declined · ${insights.avgDurationMinutes ? `${insights.avgDurationMinutes}m avg` : 'no duration'}`}
                    series={null}
                />
            </div>

            {/* Today's Appointments */}
            <TodayAppointmentsCard today={todayAppointments} isLoading={isLoading} />

            {/* Breakdown + Reputation */}
            <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <StatusBreakdownCard breakdown={insights.statusBreakdown} />
                </div>
                <div className="lg:col-span-2">
                    <ReputationCard
                        averageRating={avgRating}
                        reviewCount={reviewCount}
                        consultationCount={stats?.consultationCount ?? 0}
                        summary={reviewsData?.summary ?? null}
                    />
                </div>
            </div>

            {/* Trend chart */}
            <TrendCard
                buckets={insights.weeklyBuckets}
                total={insights.last12Total}
                thisWeek={insights.thisWeekCompleted}
                trendDelta={trendDelta}
                trendPct={trendPct}
            />

            {/* Recent activity */}
            <RecentActivityCard recent={insights.recentCompleted} />
        </motion.div>
    );
}
