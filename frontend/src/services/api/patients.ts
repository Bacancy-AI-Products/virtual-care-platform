import { request } from './client';

export interface PatientProfile {
    id: string;
    dateOfBirth: string | null;
    gender: string | null;
    bloodGroup: string | null;
    allergies: string | null;
    chronicConditions: string | null;
    user: { id: string; name: string; email: string };
}

export const patientsApi = {
    getById: (patientId: string) => request<PatientProfile>(`/patients/${patientId}`),

    updateMe: (data: {
        phone?: string | null;
        dateOfBirth?: string | null;
        gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
        bloodGroup?: string | null;
        height?: number | null;
        weight?: number | null;
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
        city?: string | null;
        state?: string | null;
        address?: string | null;
    }) =>
        request<{
            id: string;
            userId: string;
            phone: string | null;
            dateOfBirth: string | null;
            gender: string | null;
            bloodGroup: string | null;
            height: number | null;
            weight: number | null;
            emergencyContactName: string | null;
            emergencyContactPhone: string | null;
            city: string | null;
            state: string | null;
            address: string | null;
            user: { id: string; name: string; email: string };
        }>('/patients/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};
