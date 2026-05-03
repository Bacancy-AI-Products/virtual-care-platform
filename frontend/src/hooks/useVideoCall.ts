import { useState, useRef, useCallback, useEffect } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { videoApi } from '@/services/api';
import { consultationSocket } from '@/services/socket';
import { useRouter } from 'next/navigation';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'leaving' | 'error' | 'left';

export interface ParticipantVideo {
    sessionId: string;
    userName: string;
    isLocal: boolean;
    videoTrack: MediaStreamTrack | null;
    audioTrack: MediaStreamTrack | null;
    isVideoOn: boolean;
    isAudioOn: boolean;
}

interface UseVideoCallOptions {
    appointmentId: string;
    isDoctor: boolean | undefined;
}

// 'sendable' = local track enabled; 'playable' = remote track playing
const isTrackOn = (state: string | undefined): boolean =>
    state === 'playable' || state === 'sendable';

export function useVideoCall({ appointmentId, isDoctor }: UseVideoCallOptions) {
    const router = useRouter();
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [participants, setParticipants] = useState<ParticipantVideo[]>([]);
    const [callDuration, setCallDuration] = useState(0);

    const callObjectRef = useRef<DailyCall | null>(null);
    const isLeavingRef = useRef(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // Duration timer
    useEffect(() => {
        if (connectionState !== 'connected') return;
        const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
        return () => clearInterval(interval);
    }, [connectionState]);

    // Re-attach tracks after DOM paints on connect
    useEffect(() => {
        if (connectionState === 'connected' && callObjectRef.current) {
            updateVideoElements(callObjectRef.current);
        }
    }, [connectionState]);

    // Cleanup on unmount — safe to call even if already left
    useEffect(() => {
        return () => {
            const co = callObjectRef.current;
            if (co) {
                callObjectRef.current = null;
                co.leave()
                    .catch(() => {})
                    .finally(() => co.destroy());
            }
        };
    }, []);

    const updateVideoElements = (callObject: DailyCall) => {
        Object.values(callObject.participants()).forEach((p) => {
            const videoTrack = p.tracks.video?.persistentTrack ?? null;
            const audioTrack = p.tracks.audio?.persistentTrack ?? null;
            const videoOn = isTrackOn(p.tracks.video?.state);
            const audioOn = isTrackOn(p.tracks.audio?.state);

            if (p.local && localVideoRef.current) {
                if (videoOn && videoTrack) {
                    const cur = localVideoRef.current.srcObject as MediaStream | null;
                    if (cur?.getVideoTracks()[0]?.id !== videoTrack.id) {
                        localVideoRef.current.srcObject = new MediaStream([videoTrack]);
                    }
                } else {
                    // Clear to avoid showing frozen/black frame
                    localVideoRef.current.srcObject = null;
                }
            }

            if (!p.local) {
                if (remoteVideoRef.current) {
                    if (videoOn && videoTrack) {
                        const cur = remoteVideoRef.current.srcObject as MediaStream | null;
                        if (cur?.getVideoTracks()[0]?.id !== videoTrack.id) {
                            remoteVideoRef.current.srcObject = new MediaStream([videoTrack]);
                        }
                    } else {
                        // Clear so the element doesn't freeze on the last frame
                        remoteVideoRef.current.srcObject = null;
                    }
                }
                if (remoteAudioRef.current && audioOn && audioTrack) {
                    const el = remoteAudioRef.current;
                    const cur = el.srcObject as MediaStream | null;
                    if (cur?.getAudioTracks()[0]?.id !== audioTrack.id) {
                        el.srcObject = new MediaStream([audioTrack]);
                        el.play().catch(() => {});
                    }
                }
            }
        });
    };

    const updateParticipants = (callObject: DailyCall) => {
        const list: ParticipantVideo[] = Object.values(callObject.participants()).map((p) => ({
            sessionId: p.session_id,
            userName: p.user_name || 'Unknown',
            isLocal: p.local,
            videoTrack: p.tracks.video?.persistentTrack ?? null,
            audioTrack: p.tracks.audio?.persistentTrack ?? null,
            isVideoOn: isTrackOn(p.tracks.video?.state),
            isAudioOn: isTrackOn(p.tracks.audio?.state),
        }));
        setParticipants(list);
        updateVideoElements(callObject);
    };

    const initializeVideoCall = useCallback(async () => {
        if (!appointmentId || connectionState !== 'idle') return;
        setConnectionState('connecting');
        setError(null);

        try {
            await videoApi.createRoom(appointmentId);
            const { token, roomUrl } = await videoApi.getToken(appointmentId);

            const callObject = DailyIframe.createCallObject({
                videoSource: true,
                audioSource: true,
            });
            callObjectRef.current = callObject;

            callObject.on('joined-meeting', () => {
                setConnectionState('connected');
                consultationSocket.notifyCallStarted();
                videoApi.startSession(appointmentId);
                updateParticipants(callObject);
            });

            callObject.on('left-meeting', () => {
                setConnectionState('left');
                consultationSocket.notifyCallEnded();
            });

            callObject.on('participant-joined', () => updateParticipants(callObject));
            callObject.on('participant-left', () => updateParticipants(callObject));
            callObject.on('participant-updated', () => updateParticipants(callObject));
            callObject.on('track-started', (e) => {
                if (e.participant) updateParticipants(callObject);
            });
            // track-stopped must update participants state (not just DOM elements) so video-off is reflected
            callObject.on('track-stopped', (e) => {
                if (e.participant) updateParticipants(callObject);
            });
            callObject.on('error', (e) => {
                console.error('Daily error:', e);
                setError('Video call error occurred');
                setConnectionState('error');
            });

            await callObject.join({ url: roomUrl, token });
        } catch (err) {
            console.error('Failed to join video call:', err);
            setError(
                'Failed to join video call. Please check your camera and microphone permissions.',
            );
            setConnectionState('error');
        }
    }, [appointmentId, connectionState]);

    const toggleMute = useCallback(() => {
        if (!callObjectRef.current) return;
        callObjectRef.current.setLocalAudio(isMuted);
        setIsMuted((m) => !m);
    }, [isMuted]);

    const toggleVideo = useCallback(() => {
        if (!callObjectRef.current) return;
        callObjectRef.current.setLocalVideo(isVideoOff);
        setIsVideoOff((v) => !v);
    }, [isVideoOff]);

    const leaveCall = useCallback(async () => {
        // Guard against double-clicks or concurrent calls
        if (isLeavingRef.current) return;
        isLeavingRef.current = true;
        setConnectionState('leaving');

        try {
            if (callObjectRef.current) {
                await callObjectRef.current.leave();
                callObjectRef.current.destroy();
                callObjectRef.current = null;
            }
        } catch (err) {
            console.error('Error leaving call:', err);
        }

        if (isDoctor) {
            try {
                await videoApi.endSession(appointmentId);
            } catch (err) {
                console.error('Failed to end session:', err);
                // Don't block navigation — session will expire naturally
            }
        }

        router.push(isDoctor ? '/doctor/appointments' : '/patient/appointments');
    }, [appointmentId, isDoctor, router]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const resetError = useCallback(() => {
        setConnectionState('idle');
        setError(null);
    }, []);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return {
        connectionState,
        error,
        isMuted,
        isVideoOff,
        isFullscreen,
        participants,
        callDuration,
        localVideoRef,
        remoteVideoRef,
        remoteAudioRef,
        initializeVideoCall,
        toggleMute,
        toggleVideo,
        leaveCall,
        toggleFullscreen,
        resetError,
        formatDuration,
    };
}
