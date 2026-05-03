import { io, Socket } from 'socket.io-client';
import { Message } from './api';
import { useAuthStore } from '@/store/auth';

const SOCKET_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4001';

export interface SocketEvents {
    onMessage: (message: Message) => void;
    onFileUploaded: (file: {
        file: {
            id: string;
            originalName: string;
            mimeType: string;
            type: string;
            uploadedBy: { id: string; name: string; role: string };
            createdAt: string;
        };
    }) => void;
    onParticipantJoined: (data: { userId: string; role: string }) => void;
    onParticipantLeft: (data: { userId: string }) => void;
    onUserTyping: (data: { userId: string; isTyping: boolean }) => void;
    onCallStarted: (data: { userId: string }) => void;
    onCallEnded: (data: { userId: string }) => void;
    onError: (error: { message: string }) => void;
    onJoined: (data: { appointmentId: string; messages: Message[]; role: string }) => void;
}

class ConsultationSocket {
    private socket: Socket | null = null;
    private appointmentId: string | null = null;
    private listeners: Partial<SocketEvents> = {};

    connect(): Socket {
        if (this.socket?.connected) {
            return this.socket;
        }

        const token = useAuthStore.getState().token;

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected');
            if (this.appointmentId) {
                this.joinConsultation(this.appointmentId);
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });

        this.setupEventListeners();

        return this.socket;
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on('joined', (data) => {
            this.listeners.onJoined?.(data);
        });

        this.socket.on('new-message', (message: Message) => {
            this.listeners.onMessage?.(message);
        });

        this.socket.on('file-uploaded', (data) => {
            this.listeners.onFileUploaded?.(data);
        });

        this.socket.on('participant-joined', (data) => {
            this.listeners.onParticipantJoined?.(data);
        });

        this.socket.on('participant-left', (data) => {
            this.listeners.onParticipantLeft?.(data);
        });

        this.socket.on('user-typing', (data) => {
            this.listeners.onUserTyping?.(data);
        });

        this.socket.on('call-started', (data) => {
            this.listeners.onCallStarted?.(data);
        });

        this.socket.on('call-ended', (data) => {
            this.listeners.onCallEnded?.(data);
        });

        this.socket.on('error', (error) => {
            console.error('[Socket] Error:', error);
            this.listeners.onError?.(error);
        });
    }

    setListeners(listeners: Partial<SocketEvents>): void {
        this.listeners = { ...this.listeners, ...listeners };
    }

    joinConsultation(appointmentId: string): void {
        // Leave previous room if any
        if (this.appointmentId && this.appointmentId !== appointmentId) {
            this.leaveConsultation();
        }
        this.appointmentId = appointmentId;
        if (this.socket?.connected) {
            this.socket.emit('join-consultation', appointmentId);
        }
    }

    leaveConsultation(): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('leave-consultation', this.appointmentId);
            this.appointmentId = null;
        }
    }

    sendMessage(content: string): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('send-message', {
                appointmentId: this.appointmentId,
                content,
            });
        }
    }

    shareFile(fileId: string): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('file-shared', {
                appointmentId: this.appointmentId,
                fileId,
            });
        }
    }

    setTyping(isTyping: boolean): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('typing', {
                appointmentId: this.appointmentId,
                isTyping,
            });
        }
    }

    notifyCallStarted(): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('call-started', this.appointmentId);
        }
    }

    notifyCallEnded(): void {
        if (this.socket?.connected && this.appointmentId) {
            this.socket.emit('call-ended', this.appointmentId);
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.leaveConsultation();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /** Connect (if not already) and listen for real-time notification events. */
    subscribeToNotifications(callback: (n: unknown) => void): () => void {
        const socket = this.connect();
        socket.on('notification', callback);
        return () => socket.off('notification', callback);
    }
}

export const consultationSocket = new ConsultationSocket();
