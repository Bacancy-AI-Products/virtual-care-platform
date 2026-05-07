import { request } from './client';

export interface AppointmentDoctor {
    id: string;
    specialization: string;
    consultationFee: string | null;
    user: { id: string; name: string; email: string };
}

export interface AppointmentPatient {
    id: string;
    user: { id: string; name: string; email: string };
}

export interface Appointment {
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    status: string;
    reason: string | null;
    declineReason: string | null;
    videoRoomId: string | null;
    meetingLink: string | null;
    sessionStartedAt: string | null;
    sessionEndedAt: string | null;
    createdAt: string;
    doctor: AppointmentDoctor;
    patient: AppointmentPatient;
}

export interface BookAppointmentInput {
    doctorId: string;
    scheduledAt: string;
    durationMinutes?: number;
    reason?: string;
}

export const appointmentsApi = {
    book: (data: BookAppointmentInput) =>
        request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),

    list: (params?: { status?: string; page?: number; limit?: number }) =>
        request<{ data: Appointment[]; total: number; page: number; limit: number }>(
            '/appointments',
            {
                params: {
                    ...(params?.status ? { status: params.status } : {}),
                    ...(params?.page ? { page: String(params.page) } : {}),
                    ...(params?.limit ? { limit: String(params.limit) } : {}),
                },
            },
        ),

    getById: (id: string) => request<Appointment>(`/appointments/${id}`),

    cancel: (id: string) => request<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),

    updateStatus: (
        id: string,
        status: 'CONFIRMED' | 'CANCELLED_BY_DOCTOR',
        declineReason?: string,
    ) =>
        request<Appointment>(`/appointments/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, ...(declineReason ? { declineReason } : {}) }),
        }),
};
