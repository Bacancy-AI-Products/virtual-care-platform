import { request } from './client';

export interface VideoRoomResponse {
    roomName: string;
    meetingLink: string;
    appointmentId: string;
}

export interface VideoTokenResponse {
    token: string;
    roomUrl: string;
    roomName: string;
    userName: string;
    isDoctor: boolean;
}

export interface VideoInfoResponse {
    appointmentId: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    reason: string | null;
    videoRoomId: string | null;
    meetingLink: string | null;
    sessionStartedAt: string | null;
    sessionEndedAt: string | null;
    doctor: { id: string; name: string; specialization: string };
    patient: { id: string; name: string };
    isDoctor: boolean;
    isPatient: boolean;
}

export const videoApi = {
    createRoom: (appointmentId: string) =>
        request<VideoRoomResponse>(`/video/rooms/${appointmentId}`, { method: 'POST' }),

    getToken: (appointmentId: string) =>
        request<VideoTokenResponse>(`/video/token/${appointmentId}`),

    getInfo: (appointmentId: string) => request<VideoInfoResponse>(`/video/info/${appointmentId}`),

    startSession: (appointmentId: string) =>
        request<{ success: boolean; sessionStartedAt: string }>(
            `/video/session/start/${appointmentId}`,
            { method: 'POST' },
        ),

    endSession: (appointmentId: string) =>
        request<{ success: boolean; sessionEndedAt: string; status: string }>(
            `/video/session/end/${appointmentId}`,
            { method: 'POST' },
        ),
};
