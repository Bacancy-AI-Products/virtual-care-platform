import { useAuthStore } from '@/store/auth';
import type { AuthUser } from '@/store/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1';

// ─── Transport helpers ────────────────────────────────────────────────────────

/** Reads the token from the Zustand store — works outside React components. */
function getToken(): string | null {
    return useAuthStore.getState().token;
}

async function request<T>(
    path: string,
    init: RequestInit & { params?: Record<string, string> } = {},
): Promise<T> {
    const { params, ...rest } = init;

    let url = `${API_BASE}${path}`;
    if (params && Object.keys(params).length) {
        url += `?${new URLSearchParams(params)}`;
    }

    const token = getToken();
    const res = await fetch(url, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...rest.headers,
        },
    });

    if (!res.ok) {
        // 401 means the token expired — log out so middleware redirects to /login
        if (res.status === 401) {
            useAuthStore.getState().logout();
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? body?.message ?? 'Request failed');
    }

    return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type { AuthUser };

export interface AuthResult {
    token: string;
    user: AuthUser;
}

export const authApi = {
    login: (email: string, password: string) =>
        request<AuthResult>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    signup: (data: { name: string; email: string; password: string; role: 'PATIENT' | 'DOCTOR' }) =>
        request<AuthResult>(`/auth/signup/${data.role.toLowerCase()}`, {
            method: 'POST',
            body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
        }),

    forgotPassword: (email: string) =>
        request<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    resetPassword: (token: string, newPassword: string) =>
        request<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        }),
};

// ─── Doctors ──────────────────────────────────────────────────────────────────

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

// ─── Appointments ─────────────────────────────────────────────────────────────

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

// ─── Patients ─────────────────────────────────────────────────────────────────
// DOCTOR-only endpoint. Backend checks that the requesting doctor has
// at least one appointment with this patient before returning data.

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

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserMe {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarFileId: string | null;
    patient?: {
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
    };
    doctorProfile?: {
        id: string;
        userId: string;
        specialization: string;
        experienceYears: number | null;
        bio: string | null;
        consultationFee: string | null;
        registrationNumber: string | null;
        degree: string | null;
        verified: boolean;
        isActive: boolean;
    };
}

export const usersApi = {
    getMe: () => request<UserMe>('/users/me'),

    uploadAvatar: async (file: File): Promise<{ avatarFileId: string }> => {
        const token = getToken();
        const form = new FormData();
        form.append('avatar', file);
        const res = await fetch(`${API_BASE}/users/me/avatar`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error?.message ?? body?.message ?? 'Upload failed');
        }
        return res.json();
    },
};

// ─── Video ────────────────────────────────────────────────────────────────────

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

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    appointmentId: string | null;
    content: string | null;
    createdAt: string;
    sender: { id: string; name: string; role: string };
}

export const messagesApi = {
    getByAppointment: (appointmentId: string) =>
        request<Message[]>(`/messages/appointment/${appointmentId}`),
};

// ─── Files ────────────────────────────────────────────────────────────────────

export interface FileRecord {
    id: string;
    originalName: string;
    mimeType: string;
    type: string;
    sizeBytes: string;
    createdAt: string;
    uploadedBy: { id: string; name: string; role: string };
    appointment?: { id: string; scheduledAt: string; reason: string | null } | null;
}

export const filesApi = {
    upload: async (file: File, appointmentId?: string): Promise<FileRecord> => {
        const token = getToken();
        const form = new FormData();
        form.append('file', file);
        if (appointmentId) form.append('appointmentId', appointmentId);

        const res = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message ?? 'Upload failed');
        }
        return res.json();
    },

    getByAppointment: (appointmentId: string) =>
        request<FileRecord[]>(`/files/appointment/${appointmentId}`),

    getAll: () => request<FileRecord[]>('/files/mine'),

    fetchBlob: async (fileId: string): Promise<string> => {
        const token = getToken();
        const res = await fetch(`${API_BASE}/files/download/${fileId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch file');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    },

    getDownloadUrl: (fileId: string) => `${API_BASE}/files/download/${fileId}`,
};

// ─── Prescriptions ────────────────────────────────────────────────────────────

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

// ─── Notifications ─────────────────────────────────────────────────────────────

export interface AppNotification {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string | null;
    read: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export const notificationsApi = {
    list: (params?: { limit?: number; before?: string }) =>
        request<{ notifications: AppNotification[] }>('/notifications', {
            params: {
                ...(params?.limit ? { limit: String(params.limit) } : {}),
                ...(params?.before ? { before: params.before } : {}),
            },
        }),

    getUnreadCount: () => request<{ count: number }>('/notifications/unread-count'),

    markRead: (id: string) =>
        request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

    markAllRead: () =>
        request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' }),
};
