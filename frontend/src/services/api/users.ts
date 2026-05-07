import { request, uploadRequest } from './client';

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

    uploadAvatar: (file: File): Promise<{ avatarFileId: string }> => {
        const form = new FormData();
        form.append('avatar', file);
        return uploadRequest('/users/me/avatar', form);
    },
};
