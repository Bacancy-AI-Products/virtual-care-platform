'use client';

/**
 * Documents the patient has uploaded to TeleCare, rendered on the doctor's
 * patient-detail page. Access is gated server-side (`/files/patient/:id`):
 * only doctors with at least one appointment with this patient see any rows.
 */

import React from 'react';
import { format } from 'date-fns';
import {
    FolderHeart,
    FileText,
    Image as ImageIcon,
    File as FileIcon,
    Eye,
    Download,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { filesApi, type FileRecord } from '@/services/api';

interface Props {
    patientId: string;
}

export function PatientDocumentsPanel({ patientId }: Props) {
    const {
        data: files = [],
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['files', 'patient', patientId],
        queryFn: () => filesApi.getForPatient(patientId),
        staleTime: 1000 * 30,
        enabled: !!patientId,
    });

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <FolderHeart className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Patient documents
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Files uploaded by the patient for your review.
                    </p>
                </div>
            </div>

            {isLoading && (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-white"
                        />
                    ))}
                </div>
            )}

            {!isLoading && isError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    Couldn&apos;t load the patient&apos;s documents.
                </div>
            )}

            {!isLoading && !isError && files.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <FolderHeart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No documents shared yet</p>
                    <p className="mt-1 text-xs text-slate-500 font-medium">
                        Ask the patient to upload lab reports or scans from their Reports tab.
                    </p>
                </div>
            )}

            {!isLoading && !isError && files.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {files.map((f) => (
                        <DocumentTile key={f.id} file={f} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function DocumentTile({ file }: { file: FileRecord }) {
    const url = filesApi.getDownloadUrl(file.id);
    const sizeKb = Math.round(Number(file.sizeBytes) / 1024);
    return (
        <li className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3 p-4">
                <Icon mimeType={file.mimeType} />
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
                    </div>
                </div>
            </div>
            <footer className="flex items-center gap-2 border-t border-slate-50 bg-slate-50/40 px-3 py-2">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                </a>
                <a
                    href={url}
                    download={file.originalName}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                >
                    <Download className="h-3.5 w-3.5" />
                    Download
                </a>
            </footer>
        </li>
    );
}

function Icon({ mimeType }: { mimeType: string }) {
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
