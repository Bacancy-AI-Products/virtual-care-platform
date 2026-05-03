'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
    Video,
    Mic,
    MicOff,
    VideoOff,
    PhoneOff,
    MessageSquare,
    FileText,
    Paperclip,
    User,
    Maximize2,
    Minimize2,
    Loader2,
    AlertCircle,
    CameraOff,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { videoApi, VideoInfoResponse } from '@/services/api';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useConsultationChat } from '@/hooks/useConsultationChat';
import { ChatPanel } from '@/components/consultation/ChatPanel';
import { PrescriptionModal } from '@/components/consultation/PrescriptionModal';
import { UploadModal } from '@/components/consultation/UploadModal';

export default function ConsultationRoom() {
    const params = useParams();
    const appointmentId = params?.id as string;

    const [appointmentInfo, setAppointmentInfo] = useState<VideoInfoResponse | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Lock body scroll so the underlying Layout doesn't expand the viewport on mobile
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Load appointment info on mount
    useEffect(() => {
        if (!appointmentId) return;
        videoApi
            .getInfo(appointmentId)
            .then(setAppointmentInfo)
            .catch((err) => {
                console.error('Failed to load appointment info:', err);
            });
    }, [appointmentId]);

    const video = useVideoCall({
        appointmentId,
        isDoctor: appointmentInfo?.isDoctor,
    });

    const chat = useConsultationChat(appointmentId);

    const remoteParticipant = video.participants.find((p) => !p.isLocal);

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col lg:flex-row overflow-hidden">
            {/* ── Video Area ── */}
            <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                {/* Header overlay */}
                <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                            <Video className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">
                                {appointmentInfo?.isPatient
                                    ? appointmentInfo.doctor.name
                                    : appointmentInfo?.patient.name || 'Loading...'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {video.connectionState === 'connected' && (
                                    <>
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-white/70 text-sm font-medium">
                                            {video.formatDuration(video.callDuration)} • Live
                                        </span>
                                    </>
                                )}
                                {video.connectionState === 'connecting' && (
                                    <span className="text-white/70 text-sm font-medium">
                                        Connecting...
                                    </span>
                                )}
                                {video.connectionState === 'idle' && (
                                    <span className="text-white/70 text-sm font-medium">
                                        Ready to start
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                        {appointmentInfo?.isDoctor && (
                            <button
                                onClick={() => setShowPrescriptionModal(true)}
                                className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" /> Prescription
                            </button>
                        )}
                        <button
                            onClick={video.toggleFullscreen}
                            className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
                        >
                            {video.isFullscreen ? (
                                <Minimize2 className="w-5 h-5" />
                            ) : (
                                <Maximize2 className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={() => setIsChatOpen((o) => !o)}
                            className={`p-3 backdrop-blur-md rounded-2xl transition-all ${
                                isChatOpen
                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                            title={isChatOpen ? 'Close chat' : 'Open chat'}
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Video feeds */}
                <div className="flex-1 relative bg-slate-800 flex items-center justify-center min-h-0 overflow-hidden">
                    {/* Idle */}
                    {video.connectionState === 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="text-center space-y-6">
                                <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto border border-white/20">
                                    <Video className="text-white/50 w-16 h-16" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-xl mb-2">
                                        Ready to Start Consultation
                                    </p>
                                    <p className="text-white/50 mb-6">
                                        Click below to join the video call
                                    </p>
                                    <button
                                        onClick={video.initializeVideoCall}
                                        className="px-8 py-4 bg-brand-500 text-white rounded-2xl font-bold text-lg hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/30"
                                    >
                                        Join Video Call
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connecting */}
                    {video.connectionState === 'connecting' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="text-center space-y-4">
                                <Loader2 className="w-16 h-16 text-brand-500 animate-spin mx-auto" />
                                <p className="text-white font-medium">
                                    Connecting to video call...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {video.connectionState === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="text-center space-y-4 max-w-md px-4">
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                                <p className="text-white font-bold text-xl">Connection Error</p>
                                <p className="text-white/60">{video.error}</p>
                                <button
                                    onClick={video.resetError}
                                    className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-all"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Leaving overlay */}
                    {video.connectionState === 'leaving' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/80">
                            <div className="text-center space-y-4">
                                <Loader2 className="w-16 h-16 text-brand-500 animate-spin mx-auto" />
                                <p className="text-white font-medium">Ending call...</p>
                            </div>
                        </div>
                    )}

                    {/* Remote feed */}
                    {video.connectionState === 'connected' && (
                        <div className="w-full h-full relative overflow-hidden bg-slate-800">
                            {/* Video element — shown only when remote has camera on */}
                            <video
                                ref={video.remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`w-full h-full object-cover ${
                                    remoteParticipant?.isVideoOn ? '' : 'hidden'
                                }`}
                            />

                            {/* No remote participant yet */}
                            {!remoteParticipant && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                            <User className="text-white/30 w-16 h-16" />
                                        </div>
                                        <p className="text-white/50 font-medium">
                                            Waiting for other participant...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Remote participant has camera off */}
                            {remoteParticipant && !remoteParticipant.isVideoOn && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                    <div className="text-center">
                                        <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                            <CameraOff className="text-white/40 w-14 h-14" />
                                        </div>
                                        <p className="text-white/60 font-medium text-lg">
                                            {remoteParticipant.userName}
                                        </p>
                                        <p className="text-white/40 text-sm mt-1">Camera is off</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Local PiP */}
                    {video.connectionState === 'connected' && (
                        <div className="absolute bottom-24 lg:bottom-10 right-10 w-48 h-64 lg:w-64 lg:h-48 bg-slate-700 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 z-10">
                            <video
                                ref={video.localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover [transform:scaleX(-1)] ${video.isVideoOff ? 'hidden' : ''}`}
                            />
                            {video.isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                    <VideoOff className="text-slate-600 w-10 h-10" />
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] text-white font-bold uppercase tracking-wider">
                                You
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls bar */}
                <div className="h-24 shrink-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-center gap-4 lg:gap-8 px-6 z-20">
                    <button
                        onClick={video.toggleMute}
                        disabled={video.connectionState !== 'connected'}
                        className={`p-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            video.isMuted
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        {video.isMuted ? (
                            <MicOff className="w-6 h-6" />
                        ) : (
                            <Mic className="w-6 h-6" />
                        )}
                    </button>
                    <button
                        onClick={video.toggleVideo}
                        disabled={video.connectionState !== 'connected'}
                        className={`p-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            video.isVideoOff
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        {video.isVideoOff ? (
                            <VideoOff className="w-6 h-6" />
                        ) : (
                            <Video className="w-6 h-6" />
                        )}
                    </button>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="p-4 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all active:scale-95"
                        title="Upload Medical Reports"
                    >
                        <Paperclip className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setIsChatOpen((o) => !o)}
                        title={isChatOpen ? 'Close chat' : 'Open chat'}
                        className={`p-4 rounded-2xl transition-all active:scale-95 ${
                            isChatOpen
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        <MessageSquare className="w-6 h-6" />
                    </button>
                    <button
                        onClick={video.leaveCall}
                        disabled={
                            video.connectionState === 'leaving' || video.connectionState === 'left'
                        }
                        className="p-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 active:scale-95 flex items-center gap-3 px-8 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {video.connectionState === 'leaving' ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <PhoneOff className="w-6 h-6" />
                        )}
                        <span className="font-bold hidden sm:block">
                            {video.connectionState === 'leaving' ? 'Ending...' : 'End Call'}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Chat Panel ── */}
            <AnimatePresence>
                {isChatOpen && (
                    <ChatPanel
                        appointmentInfo={appointmentInfo}
                        chat={chat}
                        onClose={() => setIsChatOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showPrescriptionModal && appointmentInfo && (
                    <PrescriptionModal
                        appointmentId={appointmentId}
                        appointmentInfo={appointmentInfo}
                        onFileSaved={chat.addSharedFile}
                        onClose={() => setShowPrescriptionModal(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showUploadModal && (
                    <UploadModal
                        appointmentId={appointmentId}
                        onFileSaved={chat.addSharedFile}
                        onClose={() => setShowUploadModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Hidden audio for remote participant */}
            <audio ref={video.remoteAudioRef} autoPlay playsInline />
        </div>
    );
}
