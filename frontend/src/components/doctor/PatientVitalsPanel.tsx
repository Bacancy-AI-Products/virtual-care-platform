'use client';

/**
 * Compact vitals panel rendered inside the doctor's patient detail page.
 * Shows the latest reading + a 30-day sparkline per vital type, plus a
 * critical-readings banner if any are out of range in the window.
 *
 * Reuses the brand-500 visual identity already used elsewhere in the doctor
 * dashboard so it feels like one app, not a bolt-on.
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Activity,
    Heart,
    Droplet,
    Wind,
    Thermometer,
    Scale,
    AlertCircle,
    HeartPulse,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { vitalsApi, type VitalSeries, type VitalStatus, type VitalType } from '@/services/api';

const VITAL_ICONS: Record<VitalType, React.ElementType> = {
    BP_SYSTOLIC: Heart,
    BP_DIASTOLIC: Heart,
    HEART_RATE: Activity,
    BLOOD_SUGAR: Droplet,
    SPO2: Wind,
    TEMPERATURE: Thermometer,
    WEIGHT: Scale,
};

const STATUS_STYLE: Record<VitalStatus, { pill: string; dot: string; label: string }> = {
    NORMAL: {
        pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        dot: 'bg-emerald-500',
        label: 'Normal',
    },
    WARNING: {
        pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
        dot: 'bg-amber-500',
        label: 'Watch',
    },
    CRITICAL: {
        pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        dot: 'bg-rose-500',
        label: 'Critical',
    },
};

const WINDOW_OPTIONS = [7, 30, 90] as const;
type Window = (typeof WINDOW_OPTIONS)[number];

interface Props {
    patientId: string;
}

export function PatientVitalsPanel({ patientId }: Props) {
    const [days, setDays] = React.useState<Window>(30);

    const {
        data: trends,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['vitals', 'doctor', patientId, 'trends', days],
        queryFn: () => vitalsApi.getTrendsForPatient(patientId, days),
        staleTime: 1000 * 30,
        enabled: !!patientId,
    });

    const seriesWithData = (trends?.series ?? []).filter((s) => s.points.length > 0);
    const criticalCount = (trends?.series ?? [])
        .flatMap((s) => s.points)
        .filter((p) => p.status === 'CRITICAL').length;
    const warningCount = (trends?.series ?? [])
        .flatMap((s) => s.points)
        .filter((p) => p.status === 'WARNING').length;

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center">
                        <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                            Vital Readings
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            Patient-logged metrics over the selected window.
                        </p>
                    </div>
                </div>
                <div className="inline-flex rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
                    {WINDOW_OPTIONS.map((d) => (
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
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Alert banner */}
            {!isLoading && trends && (criticalCount > 0 || warningCount > 0) && (
                <div
                    className={`flex items-start gap-3 rounded-2xl border p-4 ${
                        criticalCount > 0
                            ? 'border-rose-100 bg-rose-50/70'
                            : 'border-amber-100 bg-amber-50/70'
                    }`}
                >
                    <AlertCircle
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                            criticalCount > 0 ? 'text-rose-600' : 'text-amber-600'
                        }`}
                    />
                    <div className="min-w-0">
                        <p
                            className={`text-sm font-bold ${
                                criticalCount > 0 ? 'text-rose-900' : 'text-amber-900'
                            }`}
                        >
                            {criticalCount > 0
                                ? `${criticalCount} critical reading${criticalCount === 1 ? '' : 's'} in the last ${days} days`
                                : `${warningCount} reading${warningCount === 1 ? '' : 's'} outside normal range`}
                        </p>
                        <p
                            className={`mt-0.5 text-xs font-medium ${
                                criticalCount > 0 ? 'text-rose-700' : 'text-amber-700'
                            }`}
                        >
                            Review the trend cards below to see which vitals are affected.
                        </p>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="animate-pulse rounded-[28px] border border-slate-100 bg-white p-5 h-44"
                        />
                    ))}
                </div>
            )}

            {isError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    Couldn&apos;t load this patient&apos;s vitals.
                </div>
            )}

            {!isLoading && !isError && seriesWithData.length === 0 && (
                <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                    <Activity className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">
                        No vitals logged in the last {days} days
                    </p>
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                        Encourage the patient to log readings from their dashboard.
                    </p>
                </div>
            )}

            {!isLoading && !isError && seriesWithData.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {seriesWithData.map((s) => (
                        <DoctorTrendCard key={s.type} series={s} />
                    ))}
                </div>
            )}
        </section>
    );
}

function DoctorTrendCard({ series }: { series: VitalSeries }) {
    const Icon = VITAL_ICONS[series.type];
    const latest = series.latest;
    const statusStyle = latest ? STATUS_STYLE[latest.status] : null;
    const points = series.points;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = points.length > 0 ? values.reduce((s, v) => s + v, 0) / points.length : null;

    return (
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">
                            {series.label}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {series.unit}
                        </p>
                    </div>
                </div>
                {statusStyle && (
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle.pill}`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        {statusStyle.label}
                    </span>
                )}
            </div>

            <div className="mt-3 flex items-end gap-2.5">
                <p className="text-2xl font-bold leading-none text-slate-900 tabular-nums">
                    {latest ? formatNum(latest.value, series.reference.decimals) : 'N/A'}
                </p>
                {latest && (
                    <p className="pb-0.5 text-[11px] text-slate-400 font-medium">
                        {formatDistanceToNow(new Date(latest.recordedAt), { addSuffix: true })}
                    </p>
                )}
            </div>

            <div className="mt-3">
                <Sparkline series={series} />
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Min" value={formatNum(min, series.reference.decimals)} />
                <Stat
                    label="Avg"
                    value={avg != null ? formatNum(avg, series.reference.decimals) : 'N/A'}
                />
                <Stat label="Max" value={formatNum(max, series.reference.decimals)} />
            </dl>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 px-2 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </dt>
            <dd className="text-sm font-bold text-slate-800 tabular-nums">{value}</dd>
        </div>
    );
}

function Sparkline({ series }: { series: VitalSeries }) {
    const w = 240;
    const h = 50;
    const padY = 6;
    if (series.points.length === 0) {
        return <div className="h-[50px] rounded-xl bg-slate-50" />;
    }
    const vals = series.points.map((p) => p.value);
    const minY = Math.min(...vals, series.reference.normalMin);
    const maxY = Math.max(...vals, series.reference.normalMax);
    const range = Math.max(0.01, maxY - minY);
    const xs = series.points.map((_, i) =>
        series.points.length === 1 ? w / 2 : (i / (series.points.length - 1)) * w,
    );
    const ys = series.points.map((p) => h - padY - ((p.value - minY) / range) * (h - 2 * padY));
    const line = `M${series.points.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' L')}`;
    const area = `${line} L${xs[xs.length - 1].toFixed(1)},${h} L${xs[0].toFixed(1)},${h} Z`;
    const gradId = `doc-vital-${series.type}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[50px] w-full" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f58220" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#f58220" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gradId})`} />
            <path
                d={line}
                fill="none"
                stroke="#f58220"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {series.points.map((p, i) => (
                <circle
                    key={p.id}
                    cx={xs[i]}
                    cy={ys[i]}
                    r="2.2"
                    fill="white"
                    stroke={
                        p.status === 'CRITICAL'
                            ? '#f43f5e'
                            : p.status === 'WARNING'
                              ? '#f59e0b'
                              : '#f58220'
                    }
                    strokeWidth="1.6"
                >
                    <title>
                        {`${formatNum(p.value, series.reference.decimals)} ${series.unit} · ${format(new Date(p.recordedAt), 'MMM d, h:mm a')}`}
                    </title>
                </circle>
            ))}
        </svg>
    );
}

function formatNum(value: number, decimals: number): string {
    return value.toFixed(decimals);
}
