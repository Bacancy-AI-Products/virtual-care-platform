'use client';

import React, { useState } from 'react';
import { FileText, X, Paperclip, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { filesApi, FileRecord } from '@/services/api';
import { consultationSocket } from '@/services/socket';

interface Props {
    appointmentId: string;
    onFileSaved: (file: FileRecord) => void;
    onClose: () => void;
}

export function UploadModal({ appointmentId, onFileSaved, onClose }: Props) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) =>
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        try {
            for (const file of selectedFiles) {
                const uploaded = await filesApi.upload(file, appointmentId);
                consultationSocket.shareFile(uploaded.id);
                onFileSaved(uploaded);
            }
            onClose();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Upload Reports</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <label className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-4 hover:border-brand-500 hover:bg-brand-50/50 transition-all cursor-pointer block">
                        <input
                            type="file"
                            className="hidden"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileSelect}
                        />
                        <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center mx-auto">
                            <Paperclip className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-slate-500 font-medium">
                                PDF, JPG, or PNG (Max 10MB)
                            </p>
                        </div>
                    </label>

                    {selectedFiles.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Selected Files
                            </h4>
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-brand-500" />
                                        <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                            {file.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || isUploading}
                        className="flex-1 py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
                            </>
                        ) : (
                            'Upload & Share'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
