'use client';

import React from 'react';
import Image from 'next/image';
import { MessageSquare, X, FileText, Download, Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { VideoInfoResponse } from '@/services/api';
import { useConsultationChat } from '@/hooks/useConsultationChat';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { FORM_CONTROL_CHAT_COMPOSER, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

interface Props {
    appointmentInfo: VideoInfoResponse | null;
    chat: ReturnType<typeof useConsultationChat>;
    onClose: () => void;
}

export function ChatPanel({ appointmentInfo, chat, onClose }: Props) {
    const {
        messages,
        historicalMessages,
        historicalFiles,
        sharedFiles,
        historyLoaded,
        isLoadingHistory,
        remoteTyping,
        message,
        previewFile,
        setPreviewFile,
        messagesEndRef,
        loadHistory,
        handleSendMessage,
        handleTyping,
    } = chat;

    const isDoctor = appointmentInfo?.isDoctor ?? false;
    const myRole = isDoctor ? 'DOCTOR' : 'PATIENT';

    return (
        <>
            <motion.aside
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                className="fixed inset-y-0 right-0 w-full lg:w-[400px] lg:relative lg:inset-auto bg-white flex flex-col shadow-2xl z-30"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Consultation Chat</h3>
                    </div>
                    <button
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={onClose}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    {/* Load history button */}
                    {!historyLoaded && (
                        <div className="text-center">
                            <button
                                onClick={loadHistory}
                                disabled={isLoadingHistory}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-2xl transition-all disabled:opacity-50"
                            >
                                {isLoadingHistory ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" /> Loading
                                        history...
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="w-3 h-3" /> Load previous
                                        conversation
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Historical messages */}
                    {historyLoaded && historicalMessages.length > 0 && (
                        <>
                            <div className="space-y-4">
                                {historicalMessages.map((msg) => {
                                    const isOwn = msg.sender.role === myRole;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium opacity-60 ${
                                                    isOwn
                                                        ? 'bg-brand-500 text-white rounded-tr-none'
                                                        : 'bg-slate-100 text-slate-700 rounded-tl-none'
                                                }`}
                                            >
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-3 py-1">
                                <div className="flex-1 h-px bg-slate-100" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                    This session
                                </span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>
                        </>
                    )}

                    {/* Empty states */}
                    {messages.length === 0 && historyLoaded && historicalMessages.length === 0 && (
                        <div className="text-center py-6">
                            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No previous messages.</p>
                        </div>
                    )}
                    {messages.length === 0 && !historyLoaded && (
                        <div className="text-center py-6">
                            <p className="text-slate-400 text-sm">Start the conversation!</p>
                        </div>
                    )}

                    {/* Current session messages */}
                    {messages.map((msg) => {
                        const isOwn = msg.sender.role === myRole;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${
                                        isOwn
                                            ? 'bg-brand-500 text-white rounded-tr-none'
                                            : 'bg-slate-100 text-slate-700 rounded-tl-none'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {remoteTyping && (
                        <div className="flex items-start">
                            <div className="bg-slate-100 text-slate-500 p-4 rounded-3xl rounded-tl-none text-sm">
                                <span className="flex gap-1">
                                    <span
                                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '0ms' }}
                                    />
                                    <span
                                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '150ms' }}
                                    />
                                    <span
                                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                        style={{ animationDelay: '300ms' }}
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Shared Files */}
                {(sharedFiles.length > 0 || historicalFiles.length > 0) && (
                    <div className="p-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Shared Files
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {sharedFiles.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => setPreviewFile(file)}
                                    className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-left"
                                >
                                    <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">
                                            {file.originalName}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            by {file.uploadedBy.name}
                                        </p>
                                    </div>
                                    <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                </button>
                            ))}
                            {historicalFiles
                                .filter((hf) => !sharedFiles.some((sf) => sf.id === hf.id))
                                .map((file) => (
                                    <button
                                        key={file.id}
                                        onClick={() => setPreviewFile(file)}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-left opacity-60"
                                    >
                                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-600 truncate">
                                                {file.originalName}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                by {file.uploadedBy.name} · past
                                            </p>
                                        </div>
                                        <Download className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                    </button>
                                ))}
                        </div>
                    </div>
                )}

                {/* Info panel */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                            {isDoctor ? 'Patient Info' : 'Doctor Info'}
                        </h4>
                        <button
                            onClick={loadHistory}
                            disabled={historyLoaded || isLoadingHistory}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700 disabled:text-slate-400 disabled:cursor-default transition-colors"
                        >
                            {isLoadingHistory
                                ? 'Loading...'
                                : historyLoaded
                                  ? 'History loaded'
                                  : 'View History'}
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12">
                            <Image
                                src={`https://picsum.photos/seed/${isDoctor ? 'patient' : 'doctor'}/100/100`}
                                fill
                                className="rounded-2xl object-cover"
                                alt="User"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {isDoctor
                                    ? appointmentInfo?.patient.name
                                    : appointmentInfo?.doctor.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {isDoctor ? 'Patient' : appointmentInfo?.doctor.specialization}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chat input */}
                <div className="p-6 border-t border-slate-100">
                    <form onSubmit={handleSendMessage} className="relative group" autoComplete="off">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className={FORM_CONTROL_CHAT_COMPOSER}
                            {...NO_BROWSER_INPUT_HELPERS}
                            value={message}
                            onChange={(e) => handleTyping(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-[11px] bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </motion.aside>

            <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        </>
    );
}
