import { request, uploadRequest, API_BASE } from './client';
import { useAuthStore } from '@/store/auth';

export interface FileRecord {
    id: string;
    originalName: string;
    /** Patient-supplied label for medical reports (null on legacy files). */
    description?: string | null;
    mimeType: string;
    type: string;
    sizeBytes: string;
    createdAt: string;
    uploadedBy: { id: string; name: string; role: string };
    /** Present on files attached to an appointment, null/undefined otherwise. */
    appointment?: { id: string; scheduledAt: string; reason: string | null } | null;
    appointmentId?: string | null;
}

export interface UploadOptions {
    /** Optional FK:appointment-scoped files keep this; patient reports leave it empty. */
    appointmentId?: string;
    /** Free-text label shown on the patient documents page (max 500 chars). */
    description?: string;
}

export const filesApi = {
    /**
     * Generic upload. Accepts either:
     *   - a plain `appointmentId` string (legacy shape:visit-scoped files), or
     *   - an `UploadOptions` object (new shape:supports `description` for
     *     patient-owned medical reports).
     * Passing `undefined` uploads a patient-owned file with no description.
     */
    upload: (file: File, optionsOrAppointmentId?: string | UploadOptions): Promise<FileRecord> => {
        const options: UploadOptions =
            typeof optionsOrAppointmentId === 'string'
                ? { appointmentId: optionsOrAppointmentId }
                : (optionsOrAppointmentId ?? {});
        const form = new FormData();
        form.append('file', file);
        if (options.appointmentId) form.append('appointmentId', options.appointmentId);
        if (options.description != null && options.description.trim().length > 0) {
            form.append('description', options.description.trim());
        }
        return uploadRequest('/files/upload', form);
    },

    getByAppointment: (appointmentId: string) =>
        request<FileRecord[]>(`/files/appointment/${appointmentId}`),

    getAll: () => request<FileRecord[]>('/files/mine'),

    /** Doctor-only: every document a patient has uploaded. Gated server-side. */
    getForPatient: (patientId: string) => request<FileRecord[]>(`/files/patient/${patientId}`),

    deleteFile: (fileId: string) =>
        request<{ success: boolean; deletedId: string }>(`/files/${fileId}`, {
            method: 'DELETE',
        }),

    fetchBlob: async (fileId: string): Promise<string> => {
        const token = useAuthStore.getState().token;
        const res = await fetch(`${API_BASE}/files/download/${fileId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch file');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    },

    getDownloadUrl: (fileId: string) => `${API_BASE}/files/download/${fileId}`,
};
