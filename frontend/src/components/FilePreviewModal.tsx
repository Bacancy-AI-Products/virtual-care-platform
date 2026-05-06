'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { filesApi, type FileRecord } from '@/services/api';

interface Props {
    file: FileRecord | null;
    onClose: () => void;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

function ext(name: string) {
    return name.split('.').pop()?.toLowerCase() ?? '';
}

function fileKind(file: FileRecord): 'image' | 'pdf' | 'other' {
    if (file.mimeType.startsWith('image/') || IMAGE_EXTS.has(ext(file.originalName)))
        return 'image';
    if (file.mimeType === 'application/pdf' || ext(file.originalName) === 'pdf') return 'pdf';
    return 'other';
}

// ─── Outer shell — renders nothing when closed ────────────────────────────────
export function FilePreviewModal({ file, onClose }: Props) {
    if (!file) return null;
    return <FilePreviewDialogInner key={file.id} file={file} onClose={onClose} />;
}

// ─── Inner — always mounts with a real file, calls showModal() on mount ───────
function FilePreviewDialogInner({ file, onClose }: { file: FileRecord; onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    // Open the native dialog as soon as it mounts
    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    // Forward native Escape / close event back to parent
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        dialog.addEventListener('close', onClose);
        return () => dialog.removeEventListener('close', onClose);
    }, [onClose]);

    // Fetch blob; revoke on unmount
    useEffect(() => {
        let revoke: string | null = null;
        filesApi
            .fetchBlob(file.id)
            .then((url) => {
                revoke = url;
                setBlobUrl(url);
            })
            .catch(() => setFetchError(true))
            .finally(() => setLoading(false));
        return () => {
            if (revoke) URL.revokeObjectURL(revoke);
        };
    }, [file.id]);

    // Click on the backdrop (the dialog element itself) closes the modal
    const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) onClose();
    };

    const handleDownload = () => {
        if (!blobUrl) return;
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.originalName;
        a.click();
    };

    const kind = fileKind(file);

    return (
        <dialog
            ref={dialogRef}
            onClick={handleBackdropClick}
            className={[
                'm-auto w-full max-w-2xl rounded-[32px] bg-white shadow-2xl',
                'max-h-[90dvh] flex flex-col p-0 overflow-hidden',
                'backdrop:bg-slate-900/70 backdrop:backdrop-blur-sm',
                'open:animate-dialog-in',
            ].join(' ')}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate text-sm">
                            {file.originalName}
                        </p>
                        <p className="text-xs text-slate-400">Uploaded by {file.uploadedBy.name}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all flex-shrink-0"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-64 p-4">
                {loading && <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />}

                {!loading && fetchError && (
                    <div className="text-center space-y-2">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                        <p className="text-slate-500 font-medium text-sm">Could not load preview</p>
                    </div>
                )}

                {!loading && blobUrl && kind === 'image' && (
                    // blob: URLs aren't supported by next/image — regular img is correct here
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={blobUrl}
                        alt={file.originalName}
                        className="max-w-full max-h-[60dvh] object-contain rounded-xl"
                    />
                )}

                {!loading && blobUrl && kind === 'pdf' && (
                    <iframe
                        src={blobUrl}
                        title={file.originalName}
                        className="w-full h-[60dvh] rounded-xl border-0"
                    />
                )}

                {!loading && blobUrl && kind === 'other' && (
                    <div className="text-center space-y-3 py-10">
                        <FileText className="w-16 h-16 text-slate-200 mx-auto" />
                        <p className="text-slate-500 font-medium">No preview for this file type</p>
                        <p className="text-xs text-slate-400">Download the file to open it</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-5 border-t border-slate-100 flex-shrink-0">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-sm"
                >
                    Close
                </button>
                <button
                    onClick={handleDownload}
                    disabled={!blobUrl}
                    className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                    <Download className="w-4 h-4" /> Download
                </button>
            </div>
        </dialog>
    );
}
