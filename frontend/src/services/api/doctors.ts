import { request } from './client';

export interface Credential {
    title: string;
    institution: string;
    year: number;
}

export interface DoctorStats {
    /** Average rating across all reviews, null when none. */
    averageRating: number | null;
    reviewCount: number;
    /** Count of COMPLETED appointments. */
    consultationCount: number;
    /** Average minutes from scheduledAt to sessionStartedAt across completed visits. */
    avgResponseMinutes: number | null;
}

export interface DoctorSummary {
    id: string;
    userId: string;
    specialization: string;
    experienceYears: number | null;
    bio: string | null;
    consultationFee: string | null;
    registrationNumber: string | null;
    degree: string | null;
    credentials: Credential[] | null;
    languages: string[];
    city: string | null;
    state: string | null;
    verified: boolean;
    isActive: boolean;
    user: { name: string; email: string };
    stats: DoctorStats;
}

/** Same shape as DoctorSummary but without aggregated stats. Returned by
 * /doctors/me — stats are fetched separately via /doctors/me/stats so the
 * profile fetch stays a single DB query and stats can be cached independently. */
export type MyDoctorProfile = Omit<DoctorSummary, 'stats'>;

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
    credentials?: Credential[] | null;
    languages?: string[];
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
        q?: string;
        page?: number;
        limit?: number;
    }) =>
        request<{ data: DoctorSummary[]; total: number; page: number; limit: number }>('/doctors', {
            params: {
                ...(params?.specialization ? { specialization: params.specialization } : {}),
                ...(params?.city ? { city: params.city } : {}),
                ...(params?.state ? { state: params.state } : {}),
                ...(params?.q ? { q: params.q } : {}),
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

    getMe: () => request<MyDoctorProfile>('/doctors/me'),

    getMyStats: () => request<DoctorStats>('/doctors/me/stats'),

    updateMe: (data: UpdateDoctorProfileInput) =>
        request<MyDoctorProfile>('/doctors/me', {
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
