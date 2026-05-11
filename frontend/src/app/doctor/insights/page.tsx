'use client';

import React from 'react';
import { format, startOfWeek, subWeeks, isAfter, isSameDay } from 'date-fns';
import {
    Activity,
    ArrowUpRight,
    BadgeCheck,
    DollarSign,
    Loader2,
    MessageSquare,
    Sparkles,
    Star,
    Stethoscope,
    Timer,
    TrendingDown,
    TrendingUp,
    Users,
    Video,
    XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
    appointmentsApi,
    doctorsApi,
    reviewsApi,
    type Appointment,
    type ReviewsSummary,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { RatingStars } from '@/components/ui/RatingStars';
import { ErrorState } from '@/components/ui/ErrorState';

const WEEKS_BACK = 12;
const RECENT_COUNT = 5;

export default function DoctorInsightsPage() {
    const { token, user } = useAuth();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ['doctor', 'me'],
        queryFn: () => doctorsApi.getMe(),
        enabled: !!token && user?.role === 'DOCTOR',
    });

    const {
        data: apptData,
        isLoading: loadingAppts,
        isError,
    } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 500 }),
        enabled: !!token && user?.role === 'DOCTOR',
    });

    const { data: reviewsData } = useQuery({
        queryKey: ['doctor', profile?.id, 'reviews', 'insights'],
        queryFn: () => reviewsApi.listByDoctor(profile!.id, { page: 1, limit: 1 }),
        enabled: !!profile?.id,
    });

    const isLoading = loadingProfile || loadingAppts;
    const insights = React.useMemo(() => computeInsights(apptData?.data ?? []), [apptData]);

    if (!mounted) {
        // Defer until client hydration — every chart depends on `new Date()` and
        // locale-sensitive `date-fns` formatting, which can differ from the SSR pass.
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="py-10">
                <ErrorState message="Failed to load insights data. Try again in a moment." />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const stats = profile?.stats;
    const fee = profile?.consultationFee ? Number(profile.consultationFee) : 0;
    const revenue = fee * insights.completedCount;
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 sm:space-y-8"
        >
            <HeroCard
                doctorName={profile?.user.name ?? 'Doctor'}
                revenue={revenue}
                fee={fee}
                completedCount={insights.completedCount}
                thisWeek={insights.thisWeekCompleted}
                trendDelta={trendDelta}
                trendPct={trendPct}
                upcomingCount={insights.upcomingCount}
            />

            <KpiRow
                weeklyBuckets={insights.weeklyBuckets}
                averageRating={stats?.averageRating ?? null}
                reviewCount={stats?.reviewCount ?? 0}
                avgResponseMinutes={stats?.avgResponseMinutes ?? null}
                avgDurationMinutes={insights.avgDurationMinutes}
                declineRate={declineRate}
                declinedCount={insights.declinedCount}
            />

            <TrendCard buckets={insights.weeklyBuckets} total={insights.last12Total} />

            <div className="grid gap-6 lg:gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <StatusBreakdownCard breakdown={insights.statusBreakdown} />
                </div>
                <div className="lg:col-span-2">
                    <ReputationCard
                        averageRating={stats?.averageRating ?? null}
                        reviewCount={stats?.reviewCount ?? 0}
                        consultationCount={stats?.consultationCount ?? 0}
                        summary={reviewsData?.summary ?? null}
                    />
                </div>
            </div>

            <RecentActivityCard recent={insights.recentCompleted} fee={fee} />
        </motion.div>
    );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroCard({
    doctorName,
    revenue,
    fee,
    completedCount,
    thisWeek,
    trendDelta,
    trendPct,
    upcomingCount,
}: {
    doctorName: string;
    revenue: number;
    fee: number;
    completedCount: number;
    thisWeek: number;
    trendDelta: number;
    trendPct: number;
    upcomingCount: number;
}) {
    const TrendIcon = trendDelta >= 0 ? TrendingUp : TrendingDown;
    const trendColor =
        trendDelta > 0
            ? 'text-emerald-300 bg-emerald-500/15'
            : trendDelta < 0
              ? 'text-rose-300 bg-rose-500/15'
              : 'text-white/70 bg-white/10';
    return (
        <div className="relative overflow-hidden rounded-[20px] sm:rounded-[28px] bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 text-white shadow-lg shadow-brand-100">
            <svg
                className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 sm:w-60 sm:h-60 opacity-25"
                viewBox="0 0 200 200"
                aria-hidden
            >
                <defs>
                    <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="90" fill="url(#heroGlow)" />
            </svg>

            <div className="relative p-4 sm:p-5 lg:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Practice overview
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-0.5">
                        {fee > 0 ? 'Estimated revenue' : 'Completed visits'}
                    </p>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-none">
                        {fee > 0 ? `$${revenue.toLocaleString()}` : completedCount.toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/80">
                        {fee > 0
                            ? `${completedCount.toLocaleString()} visits · $${fee}/visit`
                            : 'Set a consultation fee in profile to track revenue'}
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <HeroMini label="This week" value={thisWeek.toString()}>
                        <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${trendColor}`}
                        >
                            <TrendIcon className="w-2.5 h-2.5" />
                            {trendDelta === 0
                                ? 'flat'
                                : trendDelta > 0
                                  ? `+${trendPct}%`
                                  : `${trendPct}%`}
                        </span>
                    </HeroMini>
                    <HeroMini label="Upcoming" value={upcomingCount.toString()}>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/80">
                            <Stethoscope className="w-2.5 h-2.5" />
                            booked
                        </span>
                    </HeroMini>
                </div>
            </div>
        </div>
    );
}

function HeroMini({
    label,
    value,
    children,
}: {
    label: string;
    value: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex-1 sm:flex-initial rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/70 truncate">
                {label}
            </p>
            <p className="text-lg sm:text-xl font-bold leading-none mt-0.5">{value}</p>
            {children && <div className="mt-1">{children}</div>}
        </div>
    );
}

// ─── KPI row with sparklines ──────────────────────────────────────────────────

function KpiRow({
    weeklyBuckets,
    averageRating,
    reviewCount,
    avgResponseMinutes,
    avgDurationMinutes,
    declineRate,
    declinedCount,
}: {
    weeklyBuckets: WeekBucket[];
    averageRating: number | null;
    reviewCount: number;
    avgResponseMinutes: number | null;
    avgDurationMinutes: number | null;
    declineRate: number;
    declinedCount: number;
}) {
    const series = weeklyBuckets.map((w) => w.count);
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
                icon={Stethoscope}
                accent="brand"
                label="Visits"
                value={series.reduce((s, n) => s + n, 0).toString()}
                hint={`Last ${WEEKS_BACK} weeks`}
                series={series}
            />
            <KpiCard
                icon={Star}
                accent="amber"
                label="Rating"
                value={averageRating != null ? `${averageRating.toFixed(1)}` : 'New'}
                hint={`${reviewCount} review${reviewCount === 1 ? '' : 's'}`}
                series={averageRating != null ? [4, 4.2, 3.9, 4.3, 4.1, 4.5, averageRating] : null}
            />
            <KpiCard
                icon={Timer}
                accent="sky"
                label="Response"
                value={avgResponseMinutes != null ? `${avgResponseMinutes}m` : '—'}
                hint="Avg join time"
                series={null}
            />
            <KpiCard
                icon={XCircle}
                accent={declineRate > 25 ? 'rose' : 'slate'}
                label="Decline rate"
                value={`${declineRate}%`}
                hint={`${declinedCount} declined · ${avgDurationMinutes ? `${avgDurationMinutes}m avg` : 'no duration'}`}
                series={null}
            />
        </div>
    );
}

const ACCENTS = {
    brand: {
        text: 'text-brand-600',
        bg: 'bg-brand-50',
        stroke: 'stroke-brand-500',
        fill: 'fill-brand-500',
        gradId: 'spark-brand',
        gradStart: '#22b8a4', // approximate brand-500
        gradEnd: '#22b8a4',
    },
    amber: {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        stroke: 'stroke-amber-500',
        fill: 'fill-amber-500',
        gradId: 'spark-amber',
        gradStart: '#f59e0b',
        gradEnd: '#f59e0b',
    },
    sky: {
        text: 'text-sky-600',
        bg: 'bg-sky-50',
        stroke: 'stroke-sky-500',
        fill: 'fill-sky-500',
        gradId: 'spark-sky',
        gradStart: '#0ea5e9',
        gradEnd: '#0ea5e9',
    },
    rose: {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        stroke: 'stroke-rose-500',
        fill: 'fill-rose-500',
        gradId: 'spark-rose',
        gradStart: '#f43f5e',
        gradEnd: '#f43f5e',
    },
    slate: {
        text: 'text-slate-600',
        bg: 'bg-slate-100',
        stroke: 'stroke-slate-400',
        fill: 'fill-slate-400',
        gradId: 'spark-slate',
        gradStart: '#94a3b8',
        gradEnd: '#94a3b8',
    },
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
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between">
                <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${palette.bg}`}
                >
                    <Icon className={`w-4 h-4 ${palette.text}`} />
                </div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
            </div>
            <div className="mt-3">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                    {value}
                </p>
                <p className="mt-1 text-xs text-slate-400 font-medium truncate">{hint}</p>
            </div>
            {series && series.length > 1 && (
                <div className="mt-3 -mx-1">
                    <Sparkline series={series} accent={accent} />
                </div>
            )}
        </div>
    );
}

function Sparkline({ series, accent }: { series: number[]; accent: keyof typeof ACCENTS }) {
    const palette = ACCENTS[accent];
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
    const gradId = `${palette.gradId}-${React.useId()}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={palette.gradStart} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={palette.gradStart} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
                d={linePath}
                fill="none"
                stroke={palette.gradStart}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ─── Trend area chart ─────────────────────────────────────────────────────────

function TrendCard({ buckets, total }: { buckets: WeekBucket[]; total: number }) {
    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7 overflow-hidden">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Consultation trend
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-500" />
                        Completed visits — last {WEEKS_BACK} weeks
                    </h3>
                </div>
                <div className="text-right">
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

    // gridlines: 4 horizontal at evenly-spaced max fractions
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

                {/* gridlines */}
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

                {/* area + line */}
                <path d={areaPath} fill="url(#areaGrad)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="#22b8a4"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* points */}
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

                {/* x-axis labels: every 3rd tick to avoid overlap on small screens */}
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
    upcoming: number; // pending + confirmed
    cancelled: number; // patient + doctor
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
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7 h-full">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Distribution
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
                <Users className="w-5 h-5 text-brand-500" />
                Appointment breakdown
            </h3>

            {total === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center font-medium">
                    No appointments yet.
                </p>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    <div className="relative w-40 h-40 flex-shrink-0">
                        <Donut segments={segments} total={total} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-3xl font-bold text-slate-900 leading-none">
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
                                            <span className="text-sm font-bold text-slate-700 truncate">
                                                {s.label}
                                            </span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 tabular-nums">
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
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7 h-full flex flex-col">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Reputation
            </p>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
                <BadgeCheck className="w-5 h-5 text-brand-500" />
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
                    <div className="flex items-end gap-5 mb-5">
                        <p className="text-5xl font-bold text-slate-900 leading-none tracking-tight">
                            {averageRating.toFixed(1)}
                        </p>
                        <div className="pb-1">
                            <RatingStars value={averageRating} size="md" />
                            <p className="text-xs text-slate-500 font-medium mt-1">
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

function RecentActivityCard({ recent, fee }: { recent: Appointment[]; fee: number }) {
    return (
        <div className="bg-white rounded-[28px] sm:rounded-[36px] border border-slate-100 shadow-sm p-5 sm:p-7">
            <div className="flex items-center justify-between mb-5 gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Activity
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Video className="w-5 h-5 text-brand-500" />
                        Recent completed visits
                    </h3>
                </div>
                {recent.length > 0 && (
                    <a
                        href="/doctor/appointments"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                        See all <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
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
                                    <p className="text-xs font-bold text-slate-700">
                                        {today
                                            ? `Today · ${format(new Date(a.scheduledAt), 'h:mm a')}`
                                            : format(new Date(a.scheduledAt), 'MMM d')}
                                    </p>
                                    {fee > 0 && (
                                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5 inline-flex items-center gap-0.5">
                                            <DollarSign className="w-3 h-3" />
                                            {fee}
                                        </p>
                                    )}
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

    // 12-week buckets (oldest → newest).
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

    // Avg session duration from sessionStartedAt → sessionEndedAt.
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
