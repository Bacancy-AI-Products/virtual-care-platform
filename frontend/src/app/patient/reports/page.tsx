'use client';

/**
 * Patient Attachments: medical-document library.
 *
 * Patients upload lab reports, imaging, prescriptions from other clinics, and
 * any other paperwork that helps their doctors here at TeleCare understand
 * their history. Anything uploaded is visible to every doctor the patient
 * has an appointment with (via the `GET /files/patient/:patientId` endpoint
 * on the doctor side).
 *
 * The vitals-summary PDF that previously lived on this route now sits inside
 * `/patient/vitals` as the third "Report" tab, much closer to the data it
 * summarises and one fewer sidebar entry.
 */

import React from 'react';
import { format } from 'date-fns';
import {
    UploadCloud,
    Loader2,
    FileText,
    Image as ImageIcon,
    File as FileIcon,
    AlertCircle,
    CheckCircle2,
    Trash2,
    Download,
    Eye,
    Sparkles,
    X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi, type FileRecord } from '@/services/api';
import { LoadingState } from '@/components/ui/LoadingState';

const ACCEPT =
    'application/pdf,image/jpeg,image/png,image/gif,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_BYTES = 10 * 1024 * 1024; // matches backend multer limit

type Status = 'idle' | 'uploading' | 'success' | 'error';

export default function PatientReportsPage() {
    const qClient = useQueryClient();
    const [pickedFile, setPickedFile] = React.useState<File | null>(null);
    const [description, setDescription] = React.useState('');
    const [status, setStatus] = React.useState<Status>('idle');
    const [error, setError] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const { data: files = [], isLoading } = useQuery({
        queryKey: ['files', 'mine'],
        queryFn: () => filesApi.getAll(),
        staleTime: 1000 * 10,
    });

    // Documents I uploaded. Exclude avatars (FileType=IMAGE without an
    // appointment that I uploaded for myself) by showing only items where I'm
    // the uploader OR there's an appointment context. In practice everything
    // listed by /files/mine is already a medical doc; we still filter out
    // anything tagged as IMAGE that might be a stale avatar.
    const myReports = files.filter((f) => f.type !== 'IMAGE' || f.appointment || f.description);

    const uploadMutation = useMutation({
        mutationFn: ({ file, desc }: { file: File; desc: string }) =>
            filesApi.upload(file, { description: desc }),
        onSuccess: async () => {
            await qClient.invalidateQueries({
                queryKey: ['files', 'mine'],
                refetchType: 'all',
            });
            setStatus('success');
            setPickedFile(null);
            setDescription('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setStatus('idle'), 1500);
        },
        onError: (e: Error) => {
            console.error('Document upload failed:', e);
            setError(e.message || 'Upload failed');
            setStatus('error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => filesApi.deleteFile(id),
        onSuccess: () =>
            qClient.invalidateQueries({ queryKey: ['files', 'mine'], refetchType: 'all' }),
    });

    function validate(file: File): string | null {
        if (file.size > MAX_BYTES) {
            return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Max is 10 MB.`;
        }
        const okTypes = ACCEPT.split(',');
        if (!okTypes.includes(file.type)) {
            return 'Unsupported file type. Use PDF, JPG, PNG, or DOC.';
        }
        return null;
    }

    function pickFile(file: File | null) {
        setError(null);
        if (!file) {
            setPickedFile(null);
            return;
        }
        const v = validate(file);
        if (v) {
            setError(v);
            setPickedFile(null);
            return;
        }
        setPickedFile(file);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!pickedFile) {
            setError('Pick a file first.');
            return;
        }
        setStatus('uploading');
        setError(null);
        uploadMutation.mutate({ file: pickedFile, desc: description });
    }

    if (isLoading) return <LoadingState message="Loading your documents…" />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 sm:space-y-8"
        >
            {/* ─── Hero ────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[32px] border border-slate-100 bg-gradient-to-br from-white via-brand-50/30 to-white shadow-sm">
                <UploadHeroArt />
                <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 sm:h-16 sm:w-16">
                        <FileText className="h-7 w-7 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                            Attachments
                        </p>
                        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            Share documents with your doctors
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500 font-medium">
                            Lab results, scans, or prescriptions from another clinic. Anything you
                            upload here is visible to every doctor you have an appointment with so
                            they can review it before your visit.
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Uploader ────────────────────────────────────────────────── */}
            <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
                <header className="mb-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                        <UploadCloud className="h-4 w-4" />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            Upload a new document
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500">
                            PDF, JPG, PNG, or DOC. Up to 10 MB.
                        </p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Drop zone */}
                    <label
                        htmlFor="report-file"
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const f = e.dataTransfer.files?.[0] ?? null;
                            pickFile(f);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all ${
                            isDragging
                                ? 'border-brand-400 bg-brand-50/60'
                                : pickedFile
                                  ? 'border-emerald-200 bg-emerald-50/40'
                                  : 'border-slate-200 bg-slate-50/60 hover:border-brand-200 hover:bg-brand-50/30'
                        }`}
                    >
                        <input
                            id="report-file"
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPT}
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                        />
                        {pickedFile ? (
                            <>
                                <FilePreviewIcon mimeType={pickedFile.type} />
                                <p className="mt-1 max-w-full truncate text-sm font-bold text-slate-900">
                                    {pickedFile.name}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {(pickedFile.size / 1024).toFixed(0)} KB · {pickedFile.type}
                                </p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        pickFile(null);
                                    }}
                                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                                >
                                    <X className="h-3 w-3" />
                                    Choose another
                                </button>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-9 w-9 text-slate-400" />
                                <p className="text-sm font-bold text-slate-800">
                                    Drop a file here or click to browse
                                </p>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Lab report · X-ray · prescription · anything relevant
                                </p>
                            </>
                        )}
                    </label>

                    {/* Description */}
                    <div>
                        <label
                            htmlFor="report-desc"
                            className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                        >
                            What is this?{' '}
                            <span className="normal-case text-slate-300">(optional)</span>
                        </label>
                        <input
                            id="report-desc"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                            placeholder="e.g. CBC blood test from Apollo, July 2025"
                            className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-400 focus:bg-white focus:outline-none"
                        />
                        <p className="mt-1 text-[10px] text-slate-400 font-medium">
                            A short label helps your doctor find this faster.
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Uploaded. Your doctors can see it now.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!pickedFile || status === 'uploading'}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-100 transition-all hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                        {status === 'uploading' ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                            </>
                        ) : (
                            <>
                                <UploadCloud className="h-4 w-4" /> Upload document
                            </>
                        )}
                    </button>
                </form>
            </section>

            {/* ─── My documents list ───────────────────────────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        My documents
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400">
                        {myReports.length} file{myReports.length === 1 ? '' : 's'}
                    </p>
                </div>

                {myReports.length === 0 ? (
                    <EmptyDocumentsList />
                ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                        {myReports.map((f) => (
                            <DocumentRow
                                key={f.id}
                                file={f}
                                onDelete={(id) => {
                                    if (window.confirm('Delete this document?')) {
                                        deleteMutation.mutate(id);
                                    }
                                }}
                                isDeleting={
                                    deleteMutation.isPending && deleteMutation.variables === f.id
                                }
                            />
                        ))}
                    </ul>
                )}
            </section>
        </motion.div>
    );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function DocumentRow({
    file,
    onDelete,
    isDeleting,
}: {
    file: FileRecord;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) {
    const downloadUrl = filesApi.getDownloadUrl(file.id);
    const sizeKb = Math.round(Number(file.sizeBytes) / 1024);
    return (
        <li className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3 p-4">
                <FilePreviewIcon mimeType={file.mimeType} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                        {file.description || file.originalName}
                    </p>
                    {file.description && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                            {file.originalName}
                        </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {file.type}
                        </span>
                        <span>{sizeKb} KB</span>
                        <span>·</span>
                        <span>{format(new Date(file.createdAt), 'MMM d, yyyy')}</span>
                        {file.appointment && (
                            <>
                                <span>·</span>
                                <span className="text-brand-600">Linked to a visit</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <footer className="flex items-center gap-2 border-t border-slate-50 bg-slate-50/40 px-3 py-2">
                <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                </a>
                <a
                    href={downloadUrl}
                    download={file.originalName}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                    <Download className="h-3.5 w-3.5" />
                    Download
                </a>
                <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-1 rounded-xl border border-rose-200/70 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                    aria-label="Delete document"
                >
                    {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                    )}
                </button>
            </footer>
        </li>
    );
}

function FilePreviewIcon({ mimeType }: { mimeType: string }) {
    if (mimeType.startsWith('image/')) {
        return (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
                <ImageIcon className="h-4 w-4" />
            </span>
        );
    }
    if (mimeType === 'application/pdf') {
        return (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <FileText className="h-4 w-4" />
            </span>
        );
    }
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-100">
            <FileIcon className="h-4 w-4" />
        </span>
    );
}

function EmptyDocumentsList() {
    return (
        <div className="overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <svg viewBox="0 0 140 90" className="mx-auto mb-3 h-20 w-32" fill="none" aria-hidden>
                <rect x="20" y="14" width="80" height="62" rx="8" fill="#fff7ed" />
                <rect x="32" y="28" width="48" height="3" rx="1.5" fill="#fed7aa" />
                <rect x="32" y="38" width="58" height="3" rx="1.5" fill="#fed7aa" />
                <rect x="32" y="48" width="40" height="3" rx="1.5" fill="#fed7aa" />
                <rect x="32" y="58" width="52" height="3" rx="1.5" fill="#fed7aa" />
                <circle cx="108" cy="62" r="14" fill="#f58220" />
                <path
                    d="M104 62l3 3 6-7"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <p className="text-sm font-bold text-slate-700">No documents shared yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 font-medium">
                Upload a lab report or scan above. It&apos;ll show up here for your doctors.
            </p>
        </div>
    );
}

function UploadHeroArt() {
    return (
        <>
            <svg
                aria-hidden
                className="pointer-events-none absolute -right-12 top-1/2 hidden h-40 w-[460px] -translate-y-1/2 opacity-40 lg:block"
                viewBox="0 0 460 160"
                fill="none"
            >
                <defs>
                    <linearGradient id="reports-hero" x1="0" x2="460" y1="0" y2="0">
                        <stop offset="0%" stopColor="#f58220" stopOpacity="0" />
                        <stop offset="50%" stopColor="#f58220" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f58220" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <rect x="120" y="40" width="80" height="100" rx="8" fill="#fff" opacity="0.5" />
                <rect x="220" y="20" width="80" height="120" rx="8" fill="#fff" opacity="0.7" />
                <rect x="320" y="50" width="80" height="90" rx="8" fill="#fff" opacity="0.5" />
                <path
                    d="M0 80 L460 80"
                    stroke="url(#reports-hero)"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                />
            </svg>
            <Sparkles
                aria-hidden
                className="pointer-events-none absolute right-6 top-6 hidden h-5 w-5 text-brand-300 sm:block"
            />
        </>
    );
}
