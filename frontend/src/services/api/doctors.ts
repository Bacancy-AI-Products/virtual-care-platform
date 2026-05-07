import { request } from './client';

export interface DoctorSummary {
    id: string;
    userId: string;
    specialization: string;
    experienceYears: number | null;
    bio: string | null;
    consultationFee: string | null;
    registrationNumber: string | null;
    degree: string | null;
    city: string | null;
    state: string | null;
    verified: boolean;
    isActive: boolean;
    user: { name: string; email: string };
}

export interface AvailabilitySlot {
    id: string;
    weekday: number; // 0 = Sunday … 6 = Saturday
    startTime: string; // "HH:mm"
    endTime: string;
    slotDuration: number; // minutes
}

export interface DoctorAvailabilityResponse {
    availability: AvailabilitySlot[];
    bookedAppointments: Array<{
        scheduledAt: string;
        durationMinutes: number;
    }>;
}

export type UpdateDoctorProfileInput = {
    specialization?: string;
    experienceYears?: number;
    bio?: string | null;
    consultationFee?: number | null;
    registrationNumber?: string | null;
    degree?: string | null;
    city?: string | null;
    state?: string | null;
    isActive?: boolean;
};

export type AvailabilitySlotInput = {
    weekday: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
};

export interface SpecializationOption {
    id: string;
    name: string;
}

export const doctorsApi = {
    list: (params?: {
        specialization?: string;
        city?: string;
        state?: string;
        page?: number;
        limit?: number;
    }) =>
        request<{ data: DoctorSummary[]; total: number; page: number; limit: number }>('/doctors', {
            params: {
                ...(params?.specialization ? { specialization: params.specialization } : {}),
                ...(params?.city ? { city: params.city } : {}),
                ...(params?.state ? { state: params.state } : {}),
                ...(params?.page ? { page: String(params.page) } : {}),
                ...(params?.limit ? { limit: String(params.limit) } : {}),
            },
        }),

    getById: (id: string) => request<DoctorSummary>(`/doctors/${id}`),

    getAvailability: (id: string, params?: { from?: string; to?: string }) =>
        request<DoctorAvailabilityResponse>(`/doctors/${id}/availability`, {
            params: {
                ...(params?.from ? { from: params.from } : {}),
                ...(params?.to ? { to: params.to } : {}),
            },
        }),

    getMe: () => request<DoctorSummary>('/doctors/me'),

    updateMe: (data: UpdateDoctorProfileInput) =>
        request<DoctorSummary>('/doctors/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getMyAvailability: () => request<DoctorAvailabilityResponse>('/doctors/me/availability'),

    updateMyAvailability: (slots: AvailabilitySlotInput[]) =>
        request<{ availability: AvailabilitySlot[] }>('/doctors/me/availability', {
            method: 'PUT',
            body: JSON.stringify({ availability: slots }),
        }),

    getSpecializations: () => request<{ data: SpecializationOption[] }>('/doctors/specializations'),
};
