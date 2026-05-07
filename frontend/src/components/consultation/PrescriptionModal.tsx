'use client';

import React, { useState, useCallback } from 'react';
import { FileText, X, Plus, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { filesApi, prescriptionsApi, FileRecord, VideoInfoResponse } from '@/services/api';
import { consultationSocket } from '@/services/socket';
import { buildPrescriptionPng } from '@/utils/prescriptionCanvas';
import {
    FORM_CONTROL_CLASS,
    FORM_CONTROL_COMPACT_CELL,
    FORM_CONTROL_COMPACT_ROW,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';

interface Props {
    appointmentId: string;
    appointmentInfo: VideoInfoResponse;
    onFileSaved: (file: FileRecord) => void;
    onClose: () => void;
}

type MedicineRow = { name: string; dosage: string; frequency: string; duration: string };

export function PrescriptionModal({ appointmentId, appointmentInfo, onFileSaved, onClose }: Props) {
    const [medicines, setMedicines] = useState<MedicineRow[]>([
        { name: '', dosage: '', frequency: '', duration: '' },
    ]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const updateMed = (i: number, field: keyof MedicineRow, value: string) =>
        setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

    const addMed = () =>
        setMedicines((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
    const removeMed = (i: number) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));

    const handleSave = useCallback(async () => {
        const validMeds = medicines.filter((m) => m.name.trim());
        if (validMeds.length === 0) return;

        setIsSaving(true);
        try {
            const blob = await buildPrescriptionPng({
                doctorName: appointmentInfo.doctor.name,
                specialization: appointmentInfo.doctor.specialization,
                patientName: appointmentInfo.patient.name,
                date: new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                }),
                medicines: validMeds,
                notes,
            });

            const pngFile = new File([blob], `prescription-${Date.now()}.png`, {
                type: 'image/png',
            });
            const uploaded = await filesApi.upload(pngFile, appointmentId);

            await prescriptionsApi.create(appointmentId, {
                notes: notes.trim() || null,
                items: validMeds.map((m) => ({
                    drugName: m.name,
                    dosage: m.dosage || null,
                    frequency: m.frequency || null,
                    duration: m.duration || null,
                })),
            });

            consultationSocket.shareFile(uploaded.id);
            onFileSaved(uploaded);
            onClose();
        } catch (err) {
            console.error('Failed to save prescription:', err);
        } finally {
            setIsSaving(false);
        }
    }, [medicines, notes, appointmentId, appointmentInfo, onFileSaved, onClose]);

    const canSave = medicines.some((m) => m.name.trim()) && !isSaving;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 flex flex-col max-h-[92vh] overflow-hidden"
            >
                {/* Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-brand-500 to-brand-600 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Digital Prescription</h3>
                            <p className="text-brand-100 text-xs">
                                For {appointmentInfo.patient.name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-8 space-y-6">
                    {/* Medicines */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900">Medicines</h4>
                            <button
                                type="button"
                                onClick={addMed}
                                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 px-3 py-1.5 bg-brand-50 rounded-xl transition-all"
                            >
                                <Plus className="w-3 h-3" /> Add Medicine
                            </button>
                        </div>

                        {medicines.map((med, i) => (
                            <div
                                key={i}
                                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-xs font-bold">
                                            {i + 1}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Medicine name (e.g. Paracetamol 500mg)"
                                        value={med.name}
                                        onChange={(e) => updateMed(i, 'name', e.target.value)}
                                        className={FORM_CONTROL_COMPACT_ROW}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                    {medicines.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMed(i)}
                                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 pl-9">
                                    <input
                                        type="text"
                                        placeholder="Dosage (e.g. 1-0-1)"
                                        value={med.dosage}
                                        onChange={(e) => updateMed(i, 'dosage', e.target.value)}
                                        className={FORM_CONTROL_COMPACT_CELL}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Frequency"
                                        value={med.frequency}
                                        onChange={(e) => updateMed(i, 'frequency', e.target.value)}
                                        className={FORM_CONTROL_COMPACT_CELL}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Duration (e.g. 5 days)"
                                        value={med.duration}
                                        onChange={(e) => updateMed(i, 'duration', e.target.value)}
                                        className={FORM_CONTROL_COMPACT_CELL}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Advice */}
                    <div className="space-y-2">
                        <h4 className="font-bold text-slate-900">Doctor's Advice</h4>
                        <textarea
                            placeholder="Additional instructions, diet advice, follow-up notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`${FORM_CONTROL_CLASS} h-28 resize-none`}
                            {...NO_BROWSER_INPUT_HELPERS}
                        />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                        <FileText className="w-5 h-5 text-brand-500 flex-shrink-0" />
                        <p className="text-xs text-brand-700 font-medium">
                            A prescription image will be generated and shared in the chat. The
                            patient can preview and download it.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-[17px] bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="flex-1 py-[17px] bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" /> Save & Send
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
