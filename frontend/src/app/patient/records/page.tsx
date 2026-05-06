'use client';

import React, { useState } from 'react';
import {
    Download,
    Search,
    Calendar,
    Loader2,
    AlertCircle,
    Pill,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    prescriptionsApi,
    doctorsApi,
    type Prescription,
    type SpecializationOption,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Canvas prescription generator ───────────────────────────────────────────

async function downloadPrescriptionPng(
    rx: Prescription,
    specializationLabel: string,
): Promise<void> {
    const doctorName = rx.doctor?.user.name ?? 'Doctor';
    const date = format(new Date(rx.createdAt), 'dd MMM yyyy');
    const W = 800;
    const PAD = 48;

    const validMeds = rx.items.filter((i) => i.drugName?.trim());
    const medsH = validMeds.length * 56 + 60;
    const notesH = rx.notes?.trim() ? Math.ceil(rx.notes.length / 90) * 20 + 80 : 0;
    const totalH = 240 + medsH + notesH + 80;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, totalH);
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, W, 6);

    let y = 44;

    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText('℞', PAD, y + 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BacancyTeleCare Medical Consultation', W - PAD, y + 10);
    ctx.textAlign = 'left';

    y += 52;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Arial, sans-serif';
    const displayDoctorName = /^dr\.?\s/i.test(doctorName) ? doctorName : `Dr. ${doctorName}`;
    ctx.fillText(displayDoctorName, PAD, y);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText(specializationLabel, PAD, y + 20);

    y += 50;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();

    y += 22;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText('DATE', PAD, y);
    y += 16;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(date, PAD, y);

    y += 28;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 24;

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText('MEDICINES', PAD, y);
    y += 22;

    validMeds.forEach((med) => {
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(PAD + 5, y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText(med.drugName, PAD + 18, y + 9);
        y += 24;
        const parts: string[] = [];
        if (med.dosage) parts.push(`Dosage: ${med.dosage}`);
        if (med.frequency) parts.push(`Frequency: ${med.frequency}`);
        if (med.duration) parts.push(`Duration: ${med.duration}`);
        if (parts.length) {
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Arial, sans-serif';
            ctx.fillText(parts.join('   ·   '), PAD + 18, y);
            y += 18;
        }
        y += 12;
    });

    if (rx.notes?.trim()) {
        y += 8;
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(W - PAD, y);
        ctx.stroke();
        y += 22;
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.fillText("DOCTOR'S ADVICE", PAD, y);
        y += 18;
        ctx.fillStyle = '#475569';
        ctx.font = 'italic 13px Arial, sans-serif';
        const words = rx.notes.split(' ');
        let line = '';
        for (const word of words) {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > W - PAD * 2 && line) {
                ctx.fillText(line.trim(), PAD, y);
                line = word + ' ';
                y += 20;
            } else {
                line = test;
            }
        }
        if (line.trim()) {
            ctx.fillText(line.trim(), PAD, y);
            y += 20;
        }
        y += 10;
    }

    y += 24;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
    y += 18;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        'Digital prescription generated via BacancyTeleCare • Not a substitute for professional medical advice',
        W / 2,
        y,
    );

    canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prescription-${rx.id.slice(0, 8)}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// ─── Prescription card ────────────────────────────────────────────────────────

function PrescriptionCard({
    rx,
    specializationLabel,
}: {
    rx: Prescription;
    specializationLabel: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await downloadPrescriptionPng(rx, specializationLabel);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Card header */}
            <div className="p-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Pill className="w-6 h-6 text-brand-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                                Prescription
                            </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">
                            {/^dr\.?\s/i.test(rx.doctor?.user.name ?? '')
                                ? (rx.doctor?.user.name ?? 'Doctor')
                                : `Dr. ${rx.doctor?.user.name ?? 'Doctor'}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{specializationLabel}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(rx.createdAt), 'MMM d, yyyy • h:mm a')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="p-2.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                        title="Download prescription"
                    >
                        {downloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                    >
                        {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Medicines preview (always shown, first 2) */}
            <div className="px-6 pb-4 space-y-2">
                {rx.items.slice(0, expanded ? undefined : 2).map((item) => (
                    <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
                    >
                        <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-slate-800">{item.drugName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {[item.dosage, item.frequency, item.duration]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        </div>
                    </div>
                ))}
                {!expanded && rx.items.length > 2 && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 pl-1"
                    >
                        +{rx.items.length - 2} more medicine{rx.items.length - 2 > 1 ? 's' : ''}
                    </button>
                )}
            </div>

            {/* Expanded notes */}
            <AnimatePresence>
                {expanded && rx.notes && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6">
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                                    Doctor's Advice
                                </p>
                                <p className="text-sm text-amber-900 leading-relaxed font-medium italic">
                                    "{rx.notes}"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MedicalRecords() {
    const { token } = useAuth();
    const [search, setSearch] = useState('');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['prescriptions', 'mine', 50],
        queryFn: () => prescriptionsApi.getMine({ limit: 50 }),
        enabled: !!token,
    });

    const prescriptions = data?.prescriptions ?? [];

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

    const getSpecializationLabel = (spec: string | null | undefined) =>
        specializationNameById.get(spec ?? '') ?? spec ?? '';

    const filtered = search.trim()
        ? prescriptions.filter((rx) => {
              const term = search.toLowerCase();
              const specLabel = getSpecializationLabel(rx.doctor?.specialization).toLowerCase();
              return (
                  rx.doctor?.user.name.toLowerCase().includes(term) ||
                  rx.items.some((i) => i.drugName.toLowerCase().includes(term)) ||
                  specLabel.includes(term)
              );
          })
        : prescriptions;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-1">Medical Records</h2>
                    <p className="text-slate-500 font-medium">
                        {isLoading
                            ? 'Loading...'
                            : `${prescriptions.length} prescription${prescriptions.length !== 1 ? 's' : ''} from your consultations`}
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by doctor or medicine..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:border-brand-500 outline-none transition-all font-medium text-sm shadow-sm"
                    />
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-24">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="p-12 bg-red-50 rounded-[32px] text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <p className="text-red-600 font-bold">Failed to load records</p>
                </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && filtered.length === 0 && (
                <div className="p-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                    <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-slate-900 mb-2">No prescriptions yet</h4>
                    <p className="text-slate-500">
                        Prescriptions from your consultations will appear here.
                    </p>
                </div>
            )}

            {/* Prescriptions grid */}
            {!isLoading && !isError && filtered.length > 0 && (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((rx) => (
                        <PrescriptionCard
                            key={rx.id}
                            rx={rx}
                            specializationLabel={getSpecializationLabel(rx.doctor?.specialization)}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
