'use client';

/**
 * Patient Vitals: vital-tile model with tabs.
 *
 * Layout:
 *
 *   ┌─ Hero strip ───────────────────────────────────────────┐
 *   │  brand SVG illustration                                │
 *   │  My Vitals                                             │
 *   │  Logs this week · % in normal range                    │
 *   └────────────────────────────────────────────────────────┘
 *   [ Log vitals ] [ Activity ]   ← tabs
 *
 *   Log tab → grid of 7 vital tiles, each tile shows latest
 *             value, status, normal-range badge, trend Δ, and
 *             expands inline into a quick-log composer.
 *   Activity tab → chronological day-grouped feed of every
 *             reading in the last 14 days.
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
    Loader2,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Plus,
    X,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    HeartPulse,
    NotebookPen,
    Bluetooth,
    BluetoothSearching,
    RefreshCw,
    FileBarChart,
    Download,
    BarChart3,
    ListChecks,
    TriangleAlert,
    ShieldAlert,
} from 'lucide-react';
import {
    connectBPCuff,
    isBluetoothSupported,
    type BPCuffConnection,
    type BPReading,
} from '@/services/bluetooth/bp';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    vitalsApi,
    reportsApi,
    type VitalType,
    type VitalReference,
    type VitalReading,
    type VitalStatus,
    type VitalSeries,
} from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { FORM_CONTROL_CLASS, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

// ─── Visual lookup tables ─────────────────────────────────────────────────────

const VITAL_ICONS: Record<VitalType, React.ElementType> = {
    BP_SYSTOLIC: Heart,
    BP_DIASTOLIC: Heart,
    HEART_RATE: Activity,
    BLOOD_SUGAR: Droplet,
    SPO2: Wind,
    TEMPERATURE: Thermometer,
    WEIGHT: Scale,
};

/**
 * Per-vital visual identity. Lets every tile read as itself first, with the
 * green/amber/rose status pill being a secondary signal. This is what shifts
 * the grid away from a status-color wall toward a more "stock-ticker" feel.
 */
interface VitalTheme {
    iconBg: string;
    iconFg: string;
    ringHover: string;
    tint: string;
    accent: string;
}

const VITAL_THEME: Record<VitalType, VitalTheme> = {
    BP_SYSTOLIC: {
        iconBg: 'bg-rose-50',
        iconFg: 'text-rose-600',
        ringHover: 'group-hover:ring-rose-200',
        tint: 'from-rose-50/60',
        accent: '#f43f5e',
    },
    BP_DIASTOLIC: {
        iconBg: 'bg-rose-50',
        iconFg: 'text-rose-500',
        ringHover: 'group-hover:ring-rose-200',
        tint: 'from-rose-50/60',
        accent: '#fb7185',
    },
    HEART_RATE: {
        iconBg: 'bg-pink-50',
        iconFg: 'text-pink-600',
        ringHover: 'group-hover:ring-pink-200',
        tint: 'from-pink-50/60',
        accent: '#ec4899',
    },
    BLOOD_SUGAR: {
        iconBg: 'bg-amber-50',
        iconFg: 'text-amber-600',
        ringHover: 'group-hover:ring-amber-200',
        tint: 'from-amber-50/60',
        accent: '#f59e0b',
    },
    SPO2: {
        iconBg: 'bg-sky-50',
        iconFg: 'text-sky-600',
        ringHover: 'group-hover:ring-sky-200',
        tint: 'from-sky-50/60',
        accent: '#0ea5e9',
    },
    TEMPERATURE: {
        iconBg: 'bg-orange-50',
        iconFg: 'text-orange-600',
        ringHover: 'group-hover:ring-orange-200',
        tint: 'from-orange-50/60',
        accent: '#f97316',
    },
    WEIGHT: {
        iconBg: 'bg-indigo-50',
        iconFg: 'text-indigo-600',
        ringHover: 'group-hover:ring-indigo-200',
        tint: 'from-indigo-50/60',
        accent: '#6366f1',
    },
};

const VITAL_ORDER: VitalType[] = [
    'BP_SYSTOLIC',
    'BP_DIASTOLIC',
    'HEART_RATE',
    'BLOOD_SUGAR',
    'SPO2',
    'TEMPERATURE',
    'WEIGHT',
];

interface StatusVisual {
    edge: string;
    chip: string;
    dot: string;
    label: string;
    ring: string;
    softBg: string;
}

const STATUS: Record<VitalStatus, StatusVisual> = {
    NORMAL: {
        edge: 'bg-emerald-400',
        chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
        dot: 'bg-emerald-500',
        label: 'In range',
        ring: 'ring-emerald-100',
        softBg: 'bg-emerald-50/30',
    },
    WARNING: {
        edge: 'bg-amber-400',
        chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
        dot: 'bg-amber-500',
        label: 'Watch',
        ring: 'ring-amber-100',
        softBg: 'bg-amber-50/30',
    },
    CRITICAL: {
        edge: 'bg-rose-500',
        chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
        dot: 'bg-rose-500',
        label: 'Critical',
        ring: 'ring-rose-100',
        softBg: 'bg-rose-50/30',
    },
};

const NEUTRAL_EDGE = 'bg-slate-200';

// Cross-browser spinner-hiding for the value input (fix unit overlapping the
// browser's native number stepper).
const NUMBER_NO_SPINNER =
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0';

type Tab = 'log' | 'insights';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientVitalsPage() {
    const [tab, setTab] = React.useState<Tab>('log');

    const { data: reference, isLoading: loadingRef } = useQuery({
        queryKey: ['vitals', 'reference'],
        queryFn: () => vitalsApi.getReference(),
        staleTime: 1000 * 60 * 60,
    });

    const { data: trends } = useQuery({
        queryKey: ['vitals', 'mine', 'trends', 30],
        queryFn: () => vitalsApi.getMyTrends(30),
        staleTime: 1000 * 30,
    });

    const { data: recentList } = useQuery({
        queryKey: ['vitals', 'mine', 'recent', 14],
        queryFn: () => {
            const since = new Date();
            since.setDate(since.getDate() - 14);
            return vitalsApi.listMine({ from: since.toISOString(), limit: 50 });
        },
        staleTime: 1000 * 30,
    });

    if (loadingRef) return <LoadingState message="Loading vitals…" />;

    const refByType = new Map<VitalType, VitalReference>();
    reference?.data.forEach((r) => refByType.set(r.type, r));

    const seriesByType = new Map<VitalType, VitalSeries>();
    trends?.series.forEach((s) => seriesByType.set(s.type, s));

    const recent = recentList?.data ?? [];
    const totalThisWeek = recent.filter((r) => new Date(r.recordedAt) > sevenDaysAgo()).length;
    const normalThisWeek = recent.filter(
        (r) => new Date(r.recordedAt) > sevenDaysAgo() && r.status === 'NORMAL',
    ).length;
    const pctNormal =
        totalThisWeek === 0 ? null : Math.round((normalThisWeek / totalThisWeek) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 sm:space-y-8"
        >
            <HeroStrip totalThisWeek={totalThisWeek} pctNormal={pctNormal} />

            <Tabs tab={tab} setTab={setTab} />

            <AnimatePresence mode="wait" initial={false}>
                {tab === 'log' && (
                    <motion.div
                        key="log"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                    >
                        {VITAL_ORDER.map((type) => {
                            const ref = refByType.get(type);
                            if (!ref) return null;
                            return (
                                <VitalTile
                                    key={type}
                                    reference={ref}
                                    series={seriesByType.get(type) ?? null}
                                />
                            );
                        })}
                        <DerivedBpTiles
                            sys={seriesByType.get('BP_SYSTOLIC') ?? null}
                            dia={seriesByType.get('BP_DIASTOLIC') ?? null}
                        />
                    </motion.div>
                )}
                {tab === 'insights' && (
                    <motion.div
                        key="insights"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                    >
                        <InsightsPanel refByType={refByType} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Hero strip (compact horizontal bar) ──────────────────────────────────────

function HeroStrip({
    totalThisWeek,
    pctNormal,
}: {
    totalThisWeek: number;
    pctNormal: number | null;
}) {
    const normalTone =
        pctNormal == null
            ? 'slate'
            : pctNormal >= 80
              ? 'emerald'
              : pctNormal >= 50
                ? 'amber'
                : 'rose';
    return (
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-r from-brand-50/60 via-white to-white px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
            <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-200/30 blur-3xl"
            />
            <div className="relative flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-100">
                    <HeartPulse className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                        My Vitals
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500">
                        Log readings and track your trends
                    </p>
                </div>
            </div>

            <div className="relative flex items-center gap-2">
                <HeroChip
                    icon={ListChecks}
                    value={totalThisWeek.toString()}
                    label={totalThisWeek === 1 ? 'log this week' : 'logs this week'}
                    tone="slate"
                />
                <HeroChip
                    icon={CheckCircle2}
                    value={pctNormal == null ? '—' : `${pctNormal}%`}
                    label="in range"
                    tone={normalTone}
                />
            </div>
        </div>
    );
}

function HeroChip({
    icon: Icon,
    value,
    label,
    tone,
}: {
    icon: React.ElementType;
    value: string;
    label: string;
    tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
    const palette =
        tone === 'emerald'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : tone === 'amber'
              ? 'bg-amber-50 text-amber-700 ring-amber-100'
              : tone === 'rose'
                ? 'bg-rose-50 text-rose-700 ring-rose-100'
                : 'bg-slate-100 text-slate-700 ring-slate-200';
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ring-1 ${palette}`}
        >
            <Icon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{value}</span>
            <span className="hidden font-medium opacity-80 sm:inline">{label}</span>
        </span>
    );
}

// ─── Tabs (underline style with descriptive subtitle) ────────────────────────

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
    return (
        <div role="tablist" aria-label="Vitals view" className="border-b border-slate-200/70">
            <nav className="-mb-px flex gap-6 sm:gap-10">
                <TabBtn
                    active={tab === 'log'}
                    onClick={() => setTab('log')}
                    icon={NotebookPen}
                    label="Log vitals"
                    subtitle="Record a new reading"
                />
                <TabBtn
                    active={tab === 'insights'}
                    onClick={() => setTab('insights')}
                    icon={FileBarChart}
                    label="Insights"
                    subtitle="History, trends and PDF export"
                />
            </nav>
        </div>
    );
}

function TabBtn({
    active,
    onClick,
    icon: Icon,
    label,
    subtitle,
    badge,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    subtitle: string;
    badge?: string;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`group relative flex items-center gap-3 border-b-2 px-1 pb-3.5 pt-2 text-left transition-colors ${
                active ? 'border-brand-500' : 'border-transparent hover:border-slate-200'
            }`}
        >
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    active
                        ? 'bg-brand-500/10 text-brand-600'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                }`}
            >
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                    <span
                        className={`text-sm font-bold leading-tight ${
                            active ? 'text-slate-900' : 'text-slate-700'
                        }`}
                    >
                        {label}
                    </span>
                    {badge && (
                        <span
                            className={`inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                active ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                        >
                            {badge}
                        </span>
                    )}
                </span>
                <span className="hidden text-[11px] font-medium text-slate-400 leading-tight sm:block">
                    {subtitle}
                </span>
            </span>
        </button>
    );
}

// ─── Vital tile ───────────────────────────────────────────────────────────────

function VitalTile({
    reference,
    series,
}: {
    reference: VitalReference;
    series: VitalSeries | null;
}) {
    const [composerOpen, setComposerOpen] = React.useState(false);
    const [bpOpen, setBpOpen] = React.useState(false);
    const Icon = VITAL_ICONS[reference.type];
    const latest = series?.latest ?? null;
    const status = latest?.status ?? null;
    const visual = status ? STATUS[status] : null;
    const points = series?.points ?? [];

    // Δ vs previous reading. Only set when we actually have a previous reading.
    const previous = points.length >= 2 ? points[points.length - 2].value : null;
    const delta = latest && previous != null ? latest.value - previous : null;
    const deltaPct =
        latest && previous != null && previous !== 0
            ? Math.round(((latest.value - previous) / previous) * 100)
            : null;

    // Sparkline becomes the visual centerpiece — generous height, area fill.
    const sparkPoints = points.slice(-12).map((p) => p.value);
    const showSpark = sparkPoints.length >= 2;

    const showCuffCta = reference.type === 'BP_SYSTOLIC' && isBluetoothSupported();

    const composerActive = composerOpen || bpOpen;
    const theme = VITAL_THEME[reference.type];

    return (
        <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br ${theme.tint} via-white to-white shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-200`}
        >
            {/* Decorative themed glow that strengthens on hover */}
            <span
                aria-hidden
                className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-60`}
                style={{ backgroundColor: theme.accent + '33' }}
            />

            <div className="relative flex flex-1 flex-col p-4">
                {/* Header: themed icon + prominent vital name + status pill */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition-all ${theme.iconBg} ${theme.iconFg} ${theme.ringHover} group-hover:scale-105`}
                        >
                            <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight tracking-tight text-slate-900 truncate">
                                {reference.label}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                {reference.unit} · Normal{' '}
                                {formatNum(reference.normalMin, reference.decimals)}–
                                {formatNum(reference.normalMax, reference.decimals)}
                            </p>
                        </div>
                    </div>
                    {visual && (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${visual.chip}`}
                        >
                            <span className={`h-1 w-1 rounded-full ${visual.dot}`} />
                            {visual.label}
                        </span>
                    )}
                </div>

                {/* Value + delta row */}
                {latest ? (
                    <div className="mt-3.5 flex items-baseline gap-1.5">
                        <p className="text-[1.75rem] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
                            {formatNum(latest.value, reference.decimals)}
                        </p>
                        <p className="text-xs font-bold text-slate-400">{reference.unit}</p>
                        {delta != null && (
                            <span className="ml-auto">
                                <DeltaPill
                                    delta={delta}
                                    pct={deltaPct}
                                    decimals={reference.decimals}
                                />
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="mt-3.5 flex items-baseline gap-1.5">
                        <p className="text-[1.75rem] font-bold leading-none text-slate-300 tabular-nums">
                            ––
                        </p>
                        <p className="text-xs font-bold text-slate-300">{reference.unit}</p>
                    </div>
                )}
                {latest && (
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatDistanceToNow(new Date(latest.recordedAt), { addSuffix: true })}
                    </p>
                )}

                {/* Sparkline — themed by vital identity, not just status */}
                <div className="mt-3 -mx-1">
                    {showSpark ? (
                        <BigSparkline
                            values={sparkPoints}
                            status={status}
                            reference={reference}
                            themeColor={theme.accent}
                        />
                    ) : (
                        <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50">
                            <p className="text-[10px] font-medium text-slate-400">
                                Trend appears after 2+ readings
                            </p>
                        </div>
                    )}
                </div>

                {/* Action panel — slot pinned to the bottom */}
                <div className={`${composerActive ? 'mt-3' : 'mt-3'}`}>
                    <AnimatePresence mode="wait" initial={false}>
                        {composerOpen ? (
                            <motion.div
                                key="composer"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                            >
                                <QuickLogComposer
                                    reference={reference}
                                    onClose={() => setComposerOpen(false)}
                                />
                            </motion.div>
                        ) : bpOpen ? (
                            <motion.div
                                key="bp"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                            >
                                <BluetoothBPPanel onClose={() => setBpOpen(false)} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="triggers"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5"
                            >
                                <button
                                    type="button"
                                    onClick={() => setComposerOpen(true)}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 py-2 text-[11px] font-bold text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99]"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Log reading
                                </button>
                                {showCuffCta && (
                                    <button
                                        type="button"
                                        onClick={() => setBpOpen(true)}
                                        title="Use Bluetooth cuff"
                                        className="flex items-center justify-center rounded-xl border border-brand-200 bg-white px-2.5 py-2 text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99]"
                                    >
                                        <Bluetooth className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Two read-only "derived" vitals computed from the patient's BP readings:
 *   • Pulse Pressure (PP)  = Systolic − Diastolic, normal 30–50 mmHg
 *   • Mean Arterial Pressure (MAP) = Diastolic + (Systolic − Diastolic) / 3,
 *     normal 70–100 mmHg
 *
 * Both are clinically meaningful (PP correlates with arterial stiffness, MAP
 * with organ perfusion) and need no backend changes — they ride entirely on
 * the existing BP series the patient already logs. Rendered with the same
 * tile vocabulary as the primary vitals, minus the "Log reading" button so
 * the patient can't manually add a derived value.
 */
function DerivedBpTiles({ sys, dia }: { sys: VitalSeries | null; dia: VitalSeries | null }) {
    if (!sys?.latest || !dia?.latest) return null;
    // Pair the most-recent N points from each series. We zip from the tail so
    // a single missing reading doesn't shift the alignment forward.
    const n = Math.min(sys.points.length, dia.points.length);
    const ppHist: number[] = [];
    const mapHist: number[] = [];
    for (let i = 0; i < n; i++) {
        const s = sys.points[sys.points.length - n + i].value;
        const d = dia.points[dia.points.length - n + i].value;
        ppHist.push(s - d);
        mapHist.push(d + (s - d) / 3);
    }
    const ppLatest = sys.latest.value - dia.latest.value;
    const mapLatest = dia.latest.value + (sys.latest.value - dia.latest.value) / 3;

    return (
        <>
            <DerivedTile
                label="Pulse Pressure"
                unit="mmHg"
                value={ppLatest}
                history={ppHist}
                normalMin={30}
                normalMax={50}
                icon={Activity}
                hint="Systolic − Diastolic"
            />
            <DerivedTile
                label="Mean Arterial Pressure"
                unit="mmHg"
                value={mapLatest}
                history={mapHist}
                normalMin={70}
                normalMax={100}
                icon={HeartPulse}
                hint="Avg pressure your organs see"
            />
        </>
    );
}

function DerivedTile({
    label,
    unit,
    value,
    history,
    normalMin,
    normalMax,
    icon: Icon,
    hint,
}: {
    label: string;
    unit: string;
    value: number;
    history: number[];
    normalMin: number;
    normalMax: number;
    icon: React.ElementType;
    hint: string;
}) {
    const status: VitalStatus = value < normalMin || value > normalMax ? 'WARNING' : 'NORMAL';
    const visual = STATUS[status];
    const showSpark = history.length >= 2;
    const prev = history.length >= 2 ? history[history.length - 2] : null;
    const delta = prev != null ? value - prev : null;

    return (
        <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
            <span className={`h-1 w-full ${visual.edge}`} aria-hidden />
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-bold leading-tight text-slate-900">
                                    {label}
                                </p>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                                    Derived
                                </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400">
                                Normal {normalMin}–{normalMax}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${visual.chip}`}
                    >
                        <span className={`h-1 w-1 rounded-full ${visual.dot}`} />
                        {visual.label}
                    </span>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                    <p className="text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">
                        {value.toFixed(0)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">{unit}</p>
                    {delta != null && Math.abs(delta) >= 1 && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {delta > 0 ? '↑' : '↓'}
                            {Math.abs(delta).toFixed(0)}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-[10px] font-medium text-slate-400">{hint}</p>

                <div className="mt-3 -mx-1">
                    {showSpark ? (
                        <BigSparkline
                            values={history.slice(-12)}
                            status={status}
                            reference={{
                                type: 'BP_SYSTOLIC',
                                label,
                                unit,
                                normalMin,
                                normalMax,
                                validMin: 0,
                                validMax: 999,
                                decimals: 0,
                            }}
                        />
                    ) : (
                        <div className="flex h-12 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                            <p className="text-[10px] font-medium text-slate-400">
                                Updates with your BP readings
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * Sparkline used as the visual focus of each VitalTile. Shows a faded
 * normal-range band, an area-filled trace tinted by current status, and
 * highlighted dots for out-of-range points.
 */
function BigSparkline({
    values,
    status,
    reference,
    themeColor,
}: {
    values: number[];
    status: VitalStatus | null;
    reference: VitalReference;
    themeColor?: string;
}) {
    const w = 220;
    const h = 56;
    const padY = 6;
    const min = Math.min(...values, reference.normalMin);
    const max = Math.max(...values, reference.normalMax);
    const range = Math.max(0.01, max - min);
    const xs = values.map((_, i) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w));
    const ys = values.map((v) => padY + (1 - (v - min) / range) * (h - padY * 2));
    const linePath = `M${values.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' L')}`;
    const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${h} L${xs[0].toFixed(1)},${h} Z`;
    const normalTop = padY + (1 - (reference.normalMax - min) / range) * (h - padY * 2);
    const normalBottom = padY + (1 - (reference.normalMin - min) / range) * (h - padY * 2);
    // Status colours still win when the latest reading is out of range —
    // that's the moment the patient most needs the alarm signal. Otherwise
    // the trace uses the per-vital identity colour so each tile reads as
    // itself rather than as a generic "green/amber/red" card.
    const stroke =
        status === 'CRITICAL'
            ? '#f43f5e'
            : status === 'WARNING'
              ? '#f59e0b'
              : (themeColor ?? '#22b8a4');
    const gradId = `tile-spark-${reference.type}-${React.useId()}`;
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            className="h-12 w-full"
            preserveAspectRatio="none"
            aria-hidden
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect
                x="0"
                y={Math.min(normalTop, normalBottom)}
                width={w}
                height={Math.abs(normalBottom - normalTop)}
                fill="#10b981"
                fillOpacity="0.07"
            />
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
                d={linePath}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {/* Endpoint dot */}
            <circle
                cx={xs[xs.length - 1]}
                cy={ys[ys.length - 1]}
                r="2.6"
                fill="white"
                stroke={stroke}
                strokeWidth="2"
            />
        </svg>
    );
}

/**
 * Inline state-machine panel inside the BP Systolic tile.
 *
 * Stages:
 *   idle      → "Pair cuff" button
 *   pairing   → "Pairing…" with cancel
 *   ready     → "Press start on your cuff…" with cancel
 *   saving    → "Saving 120/80…" spinner
 *   saved     → "Saved" confirmation + Take another / Done
 *   error     → message + Retry
 *
 * One cuff reading saves THREE vitals: BP_SYSTOLIC, BP_DIASTOLIC, and (if the
 * cuff reports it) HEART_RATE, all with `entryMethod: BLUETOOTH_DEVICE` and a
 * device-name note so the doctor can tell it's instrument-measured.
 */
function BluetoothBPPanel({ onClose }: { onClose: () => void }) {
    type Stage = 'idle' | 'pairing' | 'ready' | 'saving' | 'saved' | 'error';
    const qClient = useQueryClient();
    const [stage, setStage] = React.useState<Stage>('idle');
    const [error, setError] = React.useState<string | null>(null);
    const [deviceName, setDeviceName] = React.useState<string | null>(null);
    const [lastReading, setLastReading] = React.useState<BPReading | null>(null);
    const connRef = React.useRef<BPCuffConnection | null>(null);

    React.useEffect(() => {
        return () => {
            // Clean up the GATT connection if the tile unmounts mid-flow.
            connRef.current?.disconnect();
            connRef.current = null;
        };
    }, []);

    async function pair() {
        setStage('pairing');
        setError(null);
        try {
            const conn = await connectBPCuff();
            connRef.current = conn;
            setDeviceName(conn.deviceName);
            setStage('ready');

            conn.onReading(async (reading) => {
                setLastReading(reading);
                setStage('saving');
                try {
                    const recordedAt = (reading.timestamp ?? new Date()).toISOString();
                    const note = `Auto-imported from ${conn.deviceName}`;
                    const calls = [
                        vitalsApi.create({
                            type: 'BP_SYSTOLIC',
                            value: reading.systolic,
                            entryMethod: 'BLUETOOTH_DEVICE',
                            recordedAt,
                            notes: note,
                        }),
                        vitalsApi.create({
                            type: 'BP_DIASTOLIC',
                            value: reading.diastolic,
                            entryMethod: 'BLUETOOTH_DEVICE',
                            recordedAt,
                            notes: note,
                        }),
                    ];
                    if (reading.pulse != null && Number.isFinite(reading.pulse)) {
                        calls.push(
                            vitalsApi.create({
                                type: 'HEART_RATE',
                                value: reading.pulse,
                                entryMethod: 'BLUETOOTH_DEVICE',
                                recordedAt,
                                notes: note,
                            }),
                        );
                    }
                    await Promise.all(calls);
                    // Invalidate the entire ['vitals', 'mine'] prefix so every
                    // child key (trends, recent, list, list-by-window) refetches.
                    await qClient.invalidateQueries({
                        queryKey: ['vitals', 'mine'],
                        refetchType: 'all',
                    });
                    setStage('saved');
                } catch (e) {
                    console.error('BP save failed:', e);
                    setError(e instanceof Error ? e.message : 'Save failed');
                    setStage('error');
                }
            });
        } catch (e: unknown) {
            const err = e as { name?: string; message?: string };
            // Patient cancelling the OS picker is not an error; bounce to idle.
            if (err?.name === 'NotFoundError') {
                setStage('idle');
                return;
            }

            console.error('BP pair failed:', e);
            setError(err?.message ?? 'Could not connect to the cuff.');
            setStage('error');
        }
    }

    function dismiss() {
        connRef.current?.disconnect();
        connRef.current = null;
        setStage('idle');
        setError(null);
        setDeviceName(null);
        setLastReading(null);
        onClose();
    }

    return (
        <div className="space-y-3 rounded-2xl bg-gradient-to-b from-brand-50/70 to-white p-4 ring-1 ring-brand-100/70">
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-500 text-white">
                        <Bluetooth className="h-3.5 w-3.5" />
                    </span>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            Bluetooth cuff
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                            Saves systolic, diastolic & pulse in one go.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                    aria-label="Close"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </header>

            {stage === 'idle' && (
                <button
                    type="button"
                    onClick={pair}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-600 active:scale-[0.99]"
                >
                    <BluetoothSearching className="h-3.5 w-3.5" />
                    Pair a cuff
                </button>
            )}

            {stage === 'pairing' && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                    Pairing… pick your cuff in the browser prompt.
                </div>
            )}

            {stage === 'ready' && (
                <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <div>
                            <p className="font-bold text-slate-900">
                                Connected to {deviceName ?? 'cuff'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                                Press the start button on your cuff. The reading will save here
                                automatically.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {stage === 'saving' && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
                    Saving{' '}
                    {lastReading
                        ? `${lastReading.systolic}/${lastReading.diastolic}${lastReading.pulse ? `, pulse ${lastReading.pulse}` : ''}`
                        : 'reading'}
                    …
                </div>
            )}

            {stage === 'saved' && lastReading && (
                <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <div>
                            <p className="font-bold">
                                Saved {lastReading.systolic} / {lastReading.diastolic}{' '}
                                {lastReading.unit}
                                {lastReading.pulse != null
                                    ? ` · pulse ${lastReading.pulse} bpm`
                                    : ''}
                            </p>
                            <p className="mt-0.5 text-[11px] text-emerald-700/80">
                                Each value appears in its tile above.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setStage('ready');
                                setLastReading(null);
                            }}
                            className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50"
                        >
                            Take another
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-brand-600"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {stage === 'error' && (
                <div className="space-y-2">
                    <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {error}
                    </div>
                    <button
                        type="button"
                        onClick={pair}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-600"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}

function DeltaPill({
    delta,
    pct,
    decimals,
}: {
    delta: number;
    pct: number | null;
    decimals: number;
}) {
    const flat = Math.abs(delta) < Math.pow(10, -decimals);
    const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
    const abs = Math.abs(delta);
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            <Icon className="h-3 w-3" />
            {sign}
            {formatNum(abs, decimals)}
            {pct != null && pct !== 0 ? ` (${sign}${Math.abs(pct)}%)` : ''} vs last
        </span>
    );
}

// ─── Quick-log composer (inline, friendlier polish) ───────────────────────────

function QuickLogComposer({
    reference,
    onClose,
}: {
    reference: VitalReference;
    onClose: () => void;
}) {
    const qClient = useQueryClient();
    const [valueStr, setValueStr] = React.useState('');
    const [recordedAt, setRecordedAt] = React.useState(toLocalInput(new Date()));
    const [notes, setNotes] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [savedAt, setSavedAt] = React.useState<Date | null>(null);
    const Icon = VITAL_ICONS[reference.type];

    const numeric = valueStr.trim() === '' ? null : Number(valueStr);
    const validNumber = numeric != null && Number.isFinite(numeric);
    const liveStatus: VitalStatus | null = validNumber ? localStatus(numeric, reference) : null;

    const mutation = useMutation({
        mutationFn: vitalsApi.create,
        onSuccess: async () => {
            // Invalidate every vitals-bound query and WAIT for the active ones
            // to refetch so the tile shows the new value the moment the
            // composer closes. Without the await the close can fire before the
            // refetch lands, so the user sees no update.
            // Invalidate the entire `['vitals', 'mine']` prefix so trends,
            // recent, and list (the Insights panel's window-scoped readings)
            // all refetch in one call.
            await qClient.invalidateQueries({
                queryKey: ['vitals', 'mine'],
                refetchType: 'all',
            });
            setSavedAt(new Date());
            setError(null);
            // Reset the form fields, then close after a short confirmation pause.
            setValueStr('');
            setNotes('');
            setRecordedAt(toLocalInput(new Date()));
            setTimeout(() => onClose(), 800);
        },
        onError: (e: Error) => {
            // Surface to the user; also log to the console so a failed POST
            // (validation, auth, etc.) is debuggable from devtools.

            console.error('Vital save failed:', e);
            setError(e.message || 'Could not save. Please try again.');
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validNumber) {
            setError('Enter a numeric value.');
            return;
        }
        setError(null);
        mutation.mutate({
            type: reference.type,
            value: numeric!,
            recordedAt: new Date(recordedAt).toISOString(),
            notes: notes.trim() ? notes.trim() : undefined,
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3.5 rounded-2xl bg-gradient-to-b from-brand-50/60 to-slate-50 p-4 ring-1 ring-brand-100/60"
        >
            <header className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
                        <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Quick log
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                            Normal {formatNum(reference.normalMin, reference.decimals)}–
                            {formatNum(reference.normalMax, reference.decimals)} {reference.unit}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                    aria-label="Close"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </header>

            {/* Value input: spinner-free so the unit chip on the right is unobstructed. */}
            <div className="relative">
                <input
                    type="number"
                    inputMode="decimal"
                    step={
                        reference.decimals
                            ? Math.pow(10, -reference.decimals).toFixed(reference.decimals)
                            : '1'
                    }
                    value={valueStr}
                    onChange={(e) => setValueStr(e.target.value)}
                    placeholder={examplePlaceholder(reference)}
                    className={`${FORM_CONTROL_CLASS} ${NUMBER_NO_SPINNER} pr-14 text-base font-bold`}
                    {...NO_BROWSER_INPUT_HELPERS}
                    autoFocus
                    required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {reference.unit}
                </span>
            </div>

            {liveStatus && (
                <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[liveStatus].chip}`}
                    aria-live="polite"
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS[liveStatus].dot}`} />
                    {STATUS[liveStatus].label}
                </div>
            )}

            <div className="grid gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    When
                </label>
                <input
                    type="datetime-local"
                    value={recordedAt}
                    onChange={(e) => setRecordedAt(e.target.value)}
                    max={toLocalInput(new Date())}
                    className={FORM_CONTROL_CLASS}
                />
            </div>

            <div className="grid gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Notes <span className="normal-case text-slate-300">(optional)</span>
                </label>
                <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Symptoms, activity, time since last meal…"
                    className={`${FORM_CONTROL_CLASS} resize-none`}
                    maxLength={2000}
                />
            </div>

            {error && (
                <div className="flex items-start gap-1.5 rounded-xl border border-rose-100 bg-rose-50 p-2 text-[11px] font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    {error}
                </div>
            )}

            {savedAt && !mutation.isPending && !error && (
                <div className="flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                </div>
            )}

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={mutation.isPending || !validNumber}
                    className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-100 transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                    {mutation.isPending ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                        </>
                    ) : (
                        <>
                            <Plus className="h-3.5 w-3.5" /> Save reading
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

// ─── Activity feed (per-vital cards + filter chips) ───────────────────────────

/**
 * InsightsPanel: the combined History + Report view.
 *
 * Owns the window selector (7/30/90 days) at the panel level so every nested
 * dataset (trends, readings list, PDF summary) stays in sync. Subsumes the
 * old `ActivityFeed` and `VitalsReportPanel` so the patient sees one screen
 * instead of two near-identical ones.
 */
function InsightsPanel({ refByType }: { refByType: Map<VitalType, VitalReference> }) {
    const qClient = useQueryClient();
    const [days, setDays] = React.useState<7 | 30 | 90>(30);
    const [filter, setFilter] = React.useState<VitalType | 'ALL'>('ALL');
    const [downloading, setDownloading] = React.useState(false);
    const [downloadedAt, setDownloadedAt] = React.useState<Date | null>(null);
    const [downloadError, setDownloadError] = React.useState<string | null>(null);

    // Readings within the selected window. Drives the per-vital cards' reading
    // lists, the toolbar's count, and the KPI strip.
    //
    // `limit: 100` matches the backend's configured max page size — anything
    // higher returns 400 VALIDATION_ERROR. 100 is plenty for the Insights
    // view (~3 readings/day over 30 days) and avoids paginating inside a
    // grouped-per-vital surface.
    const {
        data: listData,
        isLoading,
        isFetching,
        isError,
        error: listError,
    } = useQuery({
        queryKey: ['vitals', 'mine', 'list', days],
        queryFn: () => {
            const since = new Date();
            since.setDate(since.getDate() - days);
            return vitalsApi.listMine({ from: since.toISOString(), limit: 100 });
        },
        staleTime: 1000 * 30,
        retry: 1,
    });
    const readings = React.useMemo(() => listData?.data ?? [], [listData]);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => vitalsApi.delete(id),
        onSuccess: async () => {
            await qClient.invalidateQueries({
                queryKey: ['vitals', 'mine'],
                refetchType: 'all',
            });
        },
    });

    async function downloadPdf() {
        setDownloading(true);
        setDownloadError(null);
        try {
            const blob = await reportsApi.downloadVitalsSummaryPdf(days);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vitals-summary-${days}d.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setDownloadedAt(new Date());
        } catch (e) {
            setDownloadError(e instanceof Error ? e.message : 'Download failed');
        } finally {
            setDownloading(false);
        }
    }

    const byType = React.useMemo(() => {
        const map = new Map<VitalType, VitalReading[]>();
        for (const r of readings) {
            const arr = map.get(r.type) ?? [];
            arr.push(r);
            map.set(r.type, arr);
        }
        for (const arr of map.values()) {
            arr.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
        }
        return map;
    }, [readings]);

    const trackedTypes = VITAL_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0);
    const visibleTypes = filter === 'ALL' ? trackedTypes : [filter];
    const totalReadings = readings.length;
    const criticalTotal = readings.filter((r) => r.status === 'CRITICAL').length;
    const warningTotal = readings.filter((r) => r.status === 'WARNING').length;
    const normalTotal = readings.filter((r) => r.status === 'NORMAL').length;
    const normalPct = totalReadings === 0 ? 0 : Math.round((normalTotal / totalReadings) * 100);

    return (
        <div className="space-y-5">
            {/* ── Toolbar: clean white card replacing the orange banner ── */}
            <InsightsToolbar
                days={days}
                setDays={setDays}
                totalReadings={totalReadings}
                isFetching={isFetching && !isLoading}
                downloading={downloading}
                onDownload={downloadPdf}
                downloadDisabled={totalReadings === 0}
            />

            {downloadedAt && !downloadError && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Downloaded. Check your downloads folder.
                </div>
            )}
            {downloadError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {downloadError}
                </div>
            )}

            {/* Surface backend errors instead of silently rendering the empty
                state. The most common failure mode is a Zod validation error
                on the query params; without this the user has no way to tell
                the request even ran. */}
            {isError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Couldn&apos;t load your readings.{' '}
                        {listError instanceof Error ? listError.message : 'Please try again.'}
                    </span>
                </div>
            )}

            {/* ── KPI strip ── */}
            <KpiStrip
                total={totalReadings}
                normal={normalTotal}
                warning={warningTotal}
                critical={criticalTotal}
                normalPct={normalPct}
                days={days}
            />

            {/* Loading skeleton on the first fetch only; later refetches keep
                the existing cards visible to avoid flicker. */}
            {isLoading ? (
                <InsightsSkeleton />
            ) : totalReadings === 0 ? (
                <EmptyActivity />
            ) : (
                <>
                    {/* Filter chip rail */}
                    <div
                        role="tablist"
                        aria-label="Filter by vital"
                        className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar"
                    >
                        <FilterChip
                            active={filter === 'ALL'}
                            onClick={() => setFilter('ALL')}
                            label="All vitals"
                            count={readings.length}
                        />
                        {trackedTypes.map((t) => {
                            const ref = refByType.get(t);
                            const count = byType.get(t)?.length ?? 0;
                            return (
                                <FilterChip
                                    key={t}
                                    active={filter === t}
                                    onClick={() => setFilter(t)}
                                    label={ref?.label ?? t}
                                    count={count}
                                    icon={VITAL_ICONS[t]}
                                />
                            );
                        })}
                    </div>

                    <div className="space-y-5">
                        {visibleTypes.map((type) => {
                            const ref = refByType.get(type);
                            const list = byType.get(type) ?? [];
                            if (!ref || list.length === 0) return null;
                            return (
                                <VitalActivityCard
                                    key={type}
                                    reference={ref}
                                    readings={list}
                                    onDelete={(id) => deleteMutation.mutate(id)}
                                    deletingId={deleteMutation.variables ?? null}
                                    isDeleting={deleteMutation.isPending}
                                />
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Toolbar: clean white bar with window selector + PDF download ───────────

function InsightsToolbar({
    days,
    setDays,
    totalReadings,
    isFetching,
    downloading,
    onDownload,
    downloadDisabled,
}: {
    days: 7 | 30 | 90;
    setDays: (d: 7 | 30 | 90) => void;
    totalReadings: number;
    isFetching: boolean;
    downloading: boolean;
    onDownload: () => void;
    downloadDisabled: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                    <BarChart3 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                        Insights · last {days} days
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500">
                        {totalReadings} reading{totalReadings === 1 ? '' : 's'} tracked
                        {isFetching ? ' · refreshing…' : ''}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div
                    className="inline-flex rounded-xl border border-slate-100 bg-slate-50 p-0.5"
                    role="tablist"
                    aria-label="Time window"
                >
                    {([7, 30, 90] as const).map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => setDays(d)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                days === d
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onDownload}
                    disabled={downloading || downloadDisabled}
                    className="flex items-center gap-2 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-brand-100 transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:px-4 sm:text-sm"
                >
                    {downloading ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Preparing…</span>
                        </>
                    ) : (
                        <>
                            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>Download PDF</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── KPI strip: four cards summarising the window ─────────────────────────

function KpiStrip({
    total,
    normal,
    warning,
    critical,
    normalPct,
    days,
}: {
    total: number;
    normal: number;
    warning: number;
    critical: number;
    normalPct: number;
    days: 7 | 30 | 90;
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiCard
                icon={ListChecks}
                label="Total readings"
                value={total}
                hint={`in ${days} days`}
                tone="slate"
            />
            <KpiCard
                icon={CheckCircle2}
                label="In range"
                value={normal}
                hint={total === 0 ? 'N/A' : `${normalPct}% of total`}
                tone="emerald"
            />
            <KpiCard
                icon={TriangleAlert}
                label="Watch"
                value={warning}
                hint={warning === 0 ? 'all good' : 'outside normal'}
                tone={warning > 0 ? 'amber' : 'slate'}
            />
            <KpiCard
                icon={ShieldAlert}
                label="Critical"
                value={critical}
                hint={critical === 0 ? 'none flagged' : 'needs follow-up'}
                tone={critical > 0 ? 'rose' : 'slate'}
            />
        </div>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    hint,
    tone,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    hint: string;
    tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
    const palette =
        tone === 'emerald'
            ? { bg: 'bg-emerald-50', fg: 'text-emerald-600', ring: 'ring-emerald-100' }
            : tone === 'amber'
              ? { bg: 'bg-amber-50', fg: 'text-amber-600', ring: 'ring-amber-100' }
              : tone === 'rose'
                ? { bg: 'bg-rose-50', fg: 'text-rose-600', ring: 'ring-rose-100' }
                : { bg: 'bg-slate-100', fg: 'text-slate-600', ring: 'ring-slate-100' };
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${palette.bg} ${palette.fg} ring-1 ${palette.ring}`}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
                <p className="mt-0.5 text-2xl font-bold leading-none text-slate-900 tabular-nums">
                    {value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 leading-snug">{hint}</p>
            </div>
        </div>
    );
}

// ─── Skeleton shown only on the very first fetch ──────────────────────────

function InsightsSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-9 w-72 animate-pulse rounded-xl bg-slate-100" />
            <div className="grid gap-3 md:grid-cols-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-44 animate-pulse rounded-2xl border border-slate-100 bg-white"
                    />
                ))}
            </div>
        </div>
    );
}

function CardHeaderArt() {
    // Tiny brand-orange pulse glyph in the top-right corner of each per-vital
    // card header. Pure decoration, screen-readers ignore it.
    return (
        <>
            <svg
                viewBox="0 0 200 80"
                className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-60"
                preserveAspectRatio="none"
                aria-hidden
            >
                <defs>
                    <linearGradient id="card-pulse" x1="0" x2="200" y1="0" y2="0">
                        <stop offset="0%" stopColor="#f58220" stopOpacity="0" />
                        <stop offset="60%" stopColor="#f58220" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#f58220" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0 44 L60 44 L72 24 L84 64 L96 12 L108 68 L120 44 L200 44"
                    stroke="url(#card-pulse)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                />
            </svg>
            {/* Faint corner blob in the brand color */}
            <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-200/30 blur-2xl"
            />
        </>
    );
}

function FilterChip({
    active,
    onClick,
    label,
    count,
    icon: Icon,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    icon?: React.ElementType;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-all ${
                active
                    ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-700'
            }`}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
            <span
                className={`inline-flex h-4 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                }`}
            >
                {count}
            </span>
        </button>
    );
}

function VitalActivityCard({
    reference,
    readings,
    onDelete,
    deletingId,
    isDeleting,
}: {
    reference: VitalReference;
    readings: VitalReading[];
    onDelete: (id: string) => void;
    deletingId: string | null;
    isDeleting: boolean;
}) {
    const Icon = VITAL_ICONS[reference.type];
    const [showAll, setShowAll] = React.useState(false);

    // Stats over this vital's window.
    const values = readings.map((r) => r.value);
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
    const criticalCount = readings.filter((r) => r.status === 'CRITICAL').length;
    const warningCount = readings.filter((r) => r.status === 'WARNING').length;
    const latest = readings[0]; // already sorted newest-first by parent

    const visible = showAll ? readings : readings.slice(0, 5);
    const buckets = React.useMemo(() => groupByDay(visible), [visible]);

    return (
        <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            {/* Card header: brand-tinted, with a faint pulse glyph in the corner */}
            <header className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-brand-50/70 via-white to-white p-5 sm:p-6">
                <CardHeaderArt />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-100">
                            <Icon className="h-5 w-5" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 leading-tight">
                                {reference.label}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {readings.length} reading{readings.length === 1 ? '' : 's'} in the
                                last 14 days · Normal{' '}
                                {formatNum(reference.normalMin, reference.decimals)}–
                                {formatNum(reference.normalMax, reference.decimals)}{' '}
                                {reference.unit}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {criticalCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {criticalCount} critical
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                {warningCount} watch
                            </span>
                        )}
                    </div>
                </div>

                {/* Latest snapshot + stats grid + sparkline */}
                <div className="relative mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                        <ActivityStat
                            label="Latest"
                            value={formatNum(latest.value, reference.decimals)}
                            unit={reference.unit}
                            status={latest.status}
                        />
                        <ActivityStat
                            label="Min"
                            value={min == null ? 'N/A' : formatNum(min, reference.decimals)}
                            unit={reference.unit}
                        />
                        <ActivityStat
                            label="Avg"
                            value={avg == null ? 'N/A' : formatNum(avg, reference.decimals)}
                            unit={reference.unit}
                        />
                        <ActivityStat
                            label="Max"
                            value={max == null ? 'N/A' : formatNum(max, reference.decimals)}
                            unit={reference.unit}
                        />
                    </dl>
                    <ActivitySparkline readings={readings} reference={reference} />
                </div>
            </header>

            {/* Day-grouped reading rows */}
            <ol className="divide-y divide-slate-100">
                {buckets.map(([dayKey, items]) => (
                    <li key={dayKey} className="p-5 sm:p-6">
                        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {dayLabel(dayKey)} · {items.length}
                        </p>
                        <ul className="space-y-1.5">
                            {items.map((r) => {
                                const visual = STATUS[r.status];
                                const isThisDeleting = isDeleting && deletingId === r.id;
                                return (
                                    <li
                                        key={r.id}
                                        className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-100 px-3.5 py-3 transition-all hover:border-brand-200 hover:shadow-sm ${visual.softBg}`}
                                    >
                                        {/* Status accent strip */}
                                        <span
                                            className={`absolute left-0 top-0 h-full w-[3px] ${visual.edge}`}
                                            aria-hidden
                                        />
                                        <div className="ml-1 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                <p className="text-lg font-bold text-slate-900 tabular-nums leading-none">
                                                    {formatNum(r.value, reference.decimals)}
                                                    <span className="ml-1 text-[11px] font-bold text-slate-400">
                                                        {reference.unit}
                                                    </span>
                                                </p>
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${visual.chip}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${visual.dot}`}
                                                    />
                                                    {visual.label}
                                                </span>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    {format(new Date(r.recordedAt), 'h:mm a')} ·{' '}
                                                    {formatDistanceToNow(new Date(r.recordedAt), {
                                                        addSuffix: true,
                                                    })}
                                                </p>
                                            </div>
                                            {r.notes && (
                                                <p className="mt-1.5 rounded-xl bg-white/70 px-2.5 py-1.5 text-xs text-slate-600 leading-snug ring-1 ring-slate-100">
                                                    “{r.notes}”
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (
                                                    !isThisDeleting &&
                                                    window.confirm('Delete this reading?')
                                                ) {
                                                    onDelete(r.id);
                                                }
                                            }}
                                            disabled={isThisDeleting}
                                            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 group-hover:text-slate-500 disabled:opacity-50"
                                            aria-label="Delete reading"
                                        >
                                            {isThisDeleting ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </li>
                ))}
            </ol>

            {readings.length > 5 && (
                <footer className="flex items-center justify-center border-t border-slate-100 px-5 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="text-xs font-bold text-brand-600 transition-colors hover:text-brand-700"
                    >
                        {showAll ? 'Show recent only' : `Show all ${readings.length} readings`}
                    </button>
                </footer>
            )}
        </section>
    );
}

function ActivityStat({
    label,
    value,
    unit,
    status,
}: {
    label: string;
    value: string;
    unit: string;
    status?: VitalStatus;
}) {
    const visual = status ? STATUS[status] : null;
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </p>
                {visual && (
                    <span className={`h-1.5 w-1.5 rounded-full ${visual.dot}`} aria-hidden />
                )}
            </div>
            <p className="mt-1 text-lg font-bold leading-none text-slate-900 tabular-nums">
                {value}
                <span className="ml-1 text-[10px] font-bold text-slate-400">{unit}</span>
            </p>
        </div>
    );
}

/**
 * Compact SVG sparkline drawn over the vital's normal range. Points outside
 * normal range are coloured by their status so a glance shows trouble spots.
 */
function ActivitySparkline({
    readings,
    reference,
}: {
    readings: VitalReading[];
    reference: VitalReference;
}) {
    const w = 220;
    const h = 64;
    const padX = 6;
    const padY = 8;
    const ordered = [...readings].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    if (ordered.length === 0) return null;
    const values = ordered.map((r) => r.value);
    const minY = Math.min(...values, reference.normalMin);
    const maxY = Math.max(...values, reference.normalMax);
    const range = Math.max(0.01, maxY - minY);
    const xs = ordered.map((_, i) =>
        ordered.length === 1 ? w / 2 : padX + (i / (ordered.length - 1)) * (w - padX * 2),
    );
    const ys = ordered.map((r) => padY + (1 - (r.value - minY) / range) * (h - padY * 2));
    const linePath = `M${ordered.map((_, i) => `${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' L')}`;
    const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${h - padY} L${xs[0].toFixed(1)},${h - padY} Z`;

    const normalTop = padY + (1 - (reference.normalMax - minY) / range) * (h - padY * 2);
    const normalBottom = padY + (1 - (reference.normalMin - minY) / range) * (h - padY * 2);

    const gradId = `vital-act-${reference.type}`;
    return (
        <div className="w-full max-w-[220px] lg:w-[220px]">
            <svg
                viewBox={`0 0 ${w} ${h}`}
                className="h-16 w-full"
                preserveAspectRatio="none"
                aria-hidden
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f58220" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#f58220" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Normal-range band */}
                <rect
                    x="0"
                    y={Math.min(normalTop, normalBottom)}
                    width={w}
                    height={Math.abs(normalBottom - normalTop)}
                    fill="#10b981"
                    fillOpacity="0.06"
                />
                <path d={areaPath} fill={`url(#${gradId})`} />
                <path
                    d={linePath}
                    fill="none"
                    stroke="#f58220"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                {ordered.map((r, i) => (
                    <circle
                        key={r.id}
                        cx={xs[i]}
                        cy={ys[i]}
                        r="2.2"
                        fill="white"
                        stroke={
                            r.status === 'CRITICAL'
                                ? '#f43f5e'
                                : r.status === 'WARNING'
                                  ? '#f59e0b'
                                  : '#f58220'
                        }
                        strokeWidth="1.6"
                    />
                ))}
            </svg>
            <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                14-day trend
            </p>
        </div>
    );
}

function EmptyActivity() {
    return (
        <div className="rounded-[28px] border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
            <svg viewBox="0 0 120 80" className="mx-auto mb-3 h-20 w-32" fill="none" aria-hidden>
                <rect x="14" y="20" width="92" height="44" rx="10" fill="#fff7ed" />
                <path
                    d="M22 42h16l5-10 7 22 6-30 7 26 5-8h30"
                    stroke="#f58220"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                />
                <circle cx="98" cy="42" r="4" fill="#f58220" />
            </svg>
            <p className="text-sm font-bold text-slate-700">Nothing logged yet</p>
            <p className="mt-1 text-xs text-slate-500 font-medium">
                Switch to the “Log vitals” tab and add your first reading.
            </p>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localStatus(value: number, ref: VitalReference): VitalStatus {
    if (value < ref.validMin || value > ref.validMax) return 'CRITICAL';
    if (value < ref.normalMin || value > ref.normalMax) return 'WARNING';
    return 'NORMAL';
}

function formatNum(value: number, decimals: number): string {
    return value.toFixed(decimals);
}

function examplePlaceholder(ref: VitalReference): string {
    const mid = (ref.normalMin + ref.normalMax) / 2;
    return formatNum(mid, ref.decimals);
}

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sevenDaysAgo(): Date {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
}

function groupByDay(readings: VitalReading[]): Array<[string, VitalReading[]]> {
    const sorted = [...readings].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    const byKey = new Map<string, VitalReading[]>();
    for (const r of sorted) {
        const key = format(new Date(r.recordedAt), 'yyyy-MM-dd');
        const arr = byKey.get(key) ?? [];
        arr.push(r);
        byKey.set(key, arr);
    }
    return Array.from(byKey.entries());
}

function dayLabel(key: string): string {
    const d = new Date(key);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (format(today, 'yyyy-MM-dd') === key) return 'Today';
    if (format(yesterday, 'yyyy-MM-dd') === key) return 'Yesterday';
    return format(d, 'EEEE, MMM d');
}
