import { request } from './client';

export interface PrescriptionItem {
    id: string;
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    quantity: string | null;
    instructions: string | null;
}

export interface Prescription {
    id: string;
    doctorId: string;
    patientId: string;
    appointmentId: string | null;
    notes: string | null;
    createdAt: string;
    items: PrescriptionItem[];
    doctor?: {
        id: string;
        specialization: string;
        user: { id: string; name: string };
    };
    appointment?: {
        id: string;
        scheduledAt: string;
        reason: string | null;
    } | null;
}

export interface CreatePrescriptionInput {
    notes?: string | null;
    items: Array<{
        drugName: string;
        dosage?: string | null;
        frequency?: string | null;
        duration?: string | null;
        quantity?: string | null;
        instructions?: string | null;
    }>;
}

export const prescriptionsApi = {
    create: (appointmentId: string, data: CreatePrescriptionInput) =>
        request<Prescription>(`/prescriptions/appointment/${appointmentId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getByAppointment: (appointmentId: string) =>
        request<{ prescriptions: Prescription[] }>(`/prescriptions/appointment/${appointmentId}`),

    getMine: (params?: { limit?: number }) =>
        request<{ prescriptions: Prescription[] }>('/prescriptions/mine', {
            params: {
                ...(params?.limit ? { limit: String(params.limit) } : {}),
            },
        }),
};
