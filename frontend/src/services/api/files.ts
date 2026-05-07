import { request, uploadRequest, API_BASE } from './client';
import { useAuthStore } from '@/store/auth';

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
    upload: (file: File, appointmentId?: string): Promise<FileRecord> => {
        const form = new FormData();
        form.append('file', file);
        if (appointmentId) form.append('appointmentId', appointmentId);
        return uploadRequest('/files/upload', form);
    },

    getByAppointment: (appointmentId: string) =>
        request<FileRecord[]>(`/files/appointment/${appointmentId}`),

    getAll: () => request<FileRecord[]>('/files/mine'),

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
