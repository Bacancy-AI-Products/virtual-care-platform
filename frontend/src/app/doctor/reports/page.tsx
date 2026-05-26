'use client';

/**
 * Doctor Reports: two tools in one screen.
 *
 *   1. Productivity dashboard (default tab): completed visits, response/duration
 *      averages, completion vs decline rate, day-by-day completed series.
 *   2. RPM Minutes ledger (second tab): per-patient minutes for a chosen month
 *      with derived CPT 99457 / 99458 columns and a CSV export.
 *
 * Visuals reuse the brand orange and existing card / pill conventions so the
 * page sits naturally next to the dashboard.
 */

import React from 'react';
import { format } from 'date-fns';
import {
    FileBarChart,
    TrendingUp,
    Timer,
    CheckCircle2,
    XCircle,
    Activity,
    Download,
    DollarSign,
    Loader2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, type RpmMinutesReport } from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';

type Tab = 'productivity' | 'rpm';
const PRODUCTIVITY_WINDOWS = [7, 30, 90] as const;

export default function DoctorReportsPage() {
    const [tab, setTab] = React.useState<Tab>('productivity');

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 sm:space-y-8"
        >
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                        <FileBarChart className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Reports
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 font-medium">
                            Performance metrics and billable RPM time, in one place.
                        </p>
                    </div>
                </div>

                <div className="inline-flex rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                    <TabButton
                        active={tab === 'productivity'}
                        onClick={() => setTab('productivity')}
                        icon={TrendingUp}
                    >
                        Productivity
                    </TabButton>
                    <TabButton
                        active={tab === 'rpm'}
                        onClick={() => setTab('rpm')}
                        icon={DollarSign}
                    >
                        RPM Minutes
                    </TabButton>
                </div>
            </header>

            {tab === 'productivity' ? <ProductivityPanel /> : <RpmMinutesPanel />}
        </motion.div>
    );
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                active
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-100'
                    : 'text-slate-500 hover:bg-slate-50'
            }`}
        >
            <Icon className="h-4 w-4" /> {children}
        </button>
    );
}

// ─── Productivity ─────────────────────────────────────────────────────────────

function ProductivityPanel() {
    const [days, setDays] = React.useState<(typeof PRODUCTIVITY_WINDOWS)[number]>(30);
    const { data, isLoading, isError } = useQuery({
        queryKey: ['reports', 'productivity', days],
        queryFn: () => reportsApi.getProductivity(days),
        staleTime: 1000 * 30,
    });

    if (isLoading) return <LoadingState message="Loading productivity…" />;
    if (isError || !data) {
        return (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                Couldn&apos;t load productivity data.
            </div>
        );
    }

    const a = data.appointments;
    return (
        <div className="space-y-6">
            {/* Window toggle */}
            <div className="inline-flex rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                {PRODUCTIVITY_WINDOWS.map((d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            days === d
                                ? 'bg-brand-500 text-white shadow-md shadow-brand-100'
                                : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        Last {d}d
                    </button>
                ))}
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Kpi
                    icon={Activity}
                    label="Completed visits"
                    value={a.completed.toString()}
                    hint={`${a.total} total scheduled`}
                />
                <Kpi
                    icon={Timer}
                    label="Avg duration"
                    value={data.avgConsultMinutes != null ? `${data.avgConsultMinutes}m` : 'N/A'}
                    hint="per visit"
                />
                <Kpi
                    icon={CheckCircle2}
                    label="Completion rate"
                    value={`${data.completionRate}%`}
                    hint="of decisions"
                    tone="emerald"
                />
                <Kpi
                    icon={XCircle}
                    label="Decline rate"
                    value={`${data.declineRate}%`}
                    hint="cancelled by you"
                    tone={data.declineRate > 25 ? 'rose' : 'slate'}
                />
            </div>

            {/* Breakdown bar */}
            <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">Outcome mix</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {a.total} appointments
                    </p>
                </div>
                <OutcomeBar
                    total={a.total}
                    items={[
                        { label: 'Completed', n: a.completed, color: '#10b981' },
                        {
                            label: 'Cancelled (you)',
                            n: a.cancelledByDoctor,
                            color: '#f43f5e',
                        },
                        {
                            label: 'Cancelled (patient)',
                            n: a.cancelledByPatient,
                            color: '#f59e0b',
                        },
                        { label: 'No-show', n: a.noShow, color: '#94a3b8' },
                    ]}
                />
            </div>

            {/* Daily completed area */}
            <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900">Daily completed</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        last {days} days
                    </p>
                </div>
                <div className="mt-4">
                    <DailyChart perDay={data.perDay} days={days} />
                </div>
            </div>
        </div>
    );
}

function Kpi({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'brand',
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    hint: string;
    tone?: 'brand' | 'emerald' | 'rose' | 'slate';
}) {
    const palette =
        tone === 'emerald'
            ? { bg: 'bg-emerald-50', fg: 'text-emerald-600' }
            : tone === 'rose'
              ? { bg: 'bg-rose-50', fg: 'text-rose-600' }
              : tone === 'slate'
                ? { bg: 'bg-slate-100', fg: 'text-slate-600' }
                : { bg: 'bg-brand-50', fg: 'text-brand-600' };
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.bg} ${palette.fg}`}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
                <p className="mt-1 text-2xl font-bold leading-none text-slate-900 tabular-nums">
                    {value}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-snug">{hint}</p>
            </div>
        </div>
    );
}

function OutcomeBar({
    total,
    items,
}: {
    total: number;
    items: Array<{ label: string; n: number; color: string }>;
}) {
    if (total === 0) {
        return (
            <p className="mt-3 text-sm text-slate-400 font-medium">
                No appointments in this window.
            </p>
        );
    }
    return (
        <div className="mt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {items.map((it) => {
                    const pct = total === 0 ? 0 : (it.n / total) * 100;
                    if (pct === 0) return null;
                    return (
                        <span
                            key={it.label}
                            style={{ width: `${pct}%`, background: it.color }}
                            className="block h-full"
                            title={`${it.label}: ${it.n} (${Math.round(pct)}%)`}
                        />
                    );
                })}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {items.map((it) => {
                    const pct = total === 0 ? 0 : Math.round((it.n / total) * 100);
                    return (
                        <li key={it.label} className="flex items-center gap-2 text-xs">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: it.color }}
                            />
                            <span className="font-bold text-slate-700">{it.label}</span>
                            <span className="text-slate-400 font-medium">
                                {it.n} · {pct}%
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function DailyChart({
    perDay,
    days,
}: {
    perDay: Array<{ date: string; completed: number }>;
    days: number;
}) {
    // Fill missing days with 0 so the line shows continuity.
    const map = new Map(perDay.map((p) => [p.date, p.completed]));
    const series: Array<{ date: string; n: number }> = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - days + 1);
    for (let i = 0; i < days; i++) {
        const key = cursor.toISOString().slice(0, 10);
        series.push({ date: key, n: map.get(key) ?? 0 });
        cursor.setDate(cursor.getDate() + 1);
    }

    const w = 720;
    const h = 160;
    const padX = 30;
    const padY = 16;
    const chartW = w - padX * 2;
    const chartH = h - padY * 2;
    const max = Math.max(1, ...series.map((s) => s.n));
    const xs = series.map((_, i) =>
        series.length === 1 ? w / 2 : padX + (i / (series.length - 1)) * chartW,
    );
    const ys = series.map((s) => padY + (1 - s.n / max) * chartH);
    const linePath = `M${series.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' L')}`;
    const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${h - padY} L${xs[0].toFixed(1)},${h - padY} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id="daily-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f58220" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#f58220" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#daily-grad)" />
            <path
                d={linePath}
                fill="none"
                stroke="#f58220"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ─── RPM Minutes ──────────────────────────────────────────────────────────────

function RpmMinutesPanel() {
    const [month, setMonth] = React.useState<string>(currentMonthYYYYMM);
    const { data, isLoading, isError } = useQuery({
        queryKey: ['reports', 'rpm-minutes', month],
        queryFn: () => reportsApi.getRpmMinutes({ month }),
        staleTime: 1000 * 30,
    });

    if (isLoading) return <LoadingState message="Loading RPM minutes…" />;
    if (isError || !data) {
        return (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-medium text-rose-700">
                Couldn&apos;t load the RPM ledger.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Month picker + CSV */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Month
                    </label>
                    <input
                        type="month"
                        value={month}
                        max={currentMonthYYYYMM()}
                        onChange={(e) => setMonth(e.target.value)}
                        className="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 focus:border-brand-400 focus:bg-white focus:outline-none"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => downloadCsv(data)}
                    disabled={data.rows.length === 0}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Kpi
                    icon={Activity}
                    label="Patients"
                    value={data.totals.patients.toString()}
                    hint={data.label}
                />
                <Kpi
                    icon={Timer}
                    label="Total minutes"
                    value={data.totals.totalMinutes.toString()}
                    hint="across all patients"
                />
                <Kpi
                    icon={DollarSign}
                    label="99457 eligible"
                    value={data.totals.eligible99457.toString()}
                    hint="patients ≥ 20 min"
                    tone="emerald"
                />
                <Kpi
                    icon={DollarSign}
                    label="99458 units"
                    value={data.totals.units99458.toString()}
                    hint="extra 20-min blocks"
                    tone="emerald"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <Th>Patient</Th>
                                <Th align="right">Sessions</Th>
                                <Th align="right">Minutes</Th>
                                <Th align="center">99457</Th>
                                <Th align="right">99458 units</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-10 text-center text-sm text-slate-400 font-medium"
                                    >
                                        No completed sessions in {data.label}.
                                    </td>
                                </tr>
                            ) : (
                                data.rows.map((r) => (
                                    <tr key={r.patientId} className="hover:bg-slate-50/60">
                                        <td className="px-6 py-3 font-bold text-slate-900">
                                            {r.patientName}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-700 tabular-nums">
                                            {r.sessionsCount}
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-slate-900 tabular-nums">
                                            {r.totalMinutes}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {r.cpt99457Eligible ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                                                    <CheckCircle2 className="h-3 w-3" /> Eligible
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-700 tabular-nums">
                                            {r.cpt99458Units}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium leading-snug">
                CPT 99457 covers the first 20 minutes of clinician review per calendar month; CPT
                99458 covers each additional 20-minute block beyond that. This ledger is derived
                from completed video session start / end times.
            </p>
        </div>
    );
}

function Th({
    children,
    align = 'left',
}: {
    children: React.ReactNode;
    align?: 'left' | 'right' | 'center';
}) {
    return (
        <th
            className={`px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-${align}`}
        >
            {children}
        </th>
    );
}

function currentMonthYYYYMM(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function downloadCsv(report: RpmMinutesReport) {
    const rows = [
        ['Patient', 'Sessions', 'Minutes', 'CPT 99457', 'CPT 99458 units'],
        ...report.rows.map((r) => [
            r.patientName,
            r.sessionsCount,
            r.totalMinutes,
            r.cpt99457Eligible ? 'Eligible' : '',
            r.cpt99458Units,
        ]),
    ];
    const escaped = rows
        .map((row) =>
            row
                .map((cell) => {
                    const s = String(cell ?? '');
                    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                })
                .join(','),
        )
        .join('\n');
    const blob = new Blob([escaped], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpm-minutes-${report.month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Suppress unused import warnings for symbols only used in TabButton.
    void format;
    void Loader2;
}
