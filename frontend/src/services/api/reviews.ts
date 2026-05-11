import { request } from './client';

export interface DoctorReview {
    id: string;
    rating: number; // 1–5
    comment: string | null;
    createdAt: string; // ISO
    patient: { name: string };
}

export interface ReviewsSummary {
    averageRating: number | null;
    reviewCount: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface DoctorReviewsResponse {
    data: DoctorReview[];
    total: number;
    page: number;
    limit: number;
    summary: ReviewsSummary;
}

export interface CreateReviewInput {
    rating: number;
    comment?: string | null;
}

/** A review the calling patient has submitted, with doctor context. */
export interface MyReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    appointmentId: string;
    doctor: {
        id: string;
        specialization: string;
        name: string;
    };
    visitDate: string;
}

export interface MyReviewsResponse {
    data: MyReview[];
    total: number;
    page: number;
    limit: number;
}

export const reviewsApi = {
    listByDoctor: (doctorId: string, params?: { page?: number; limit?: number }) =>
        request<DoctorReviewsResponse>(`/doctors/${doctorId}/reviews`, {
            params: {
                ...(params?.page ? { page: String(params.page) } : {}),
                ...(params?.limit ? { limit: String(params.limit) } : {}),
            },
        }),

    /** All reviews the calling patient has submitted. */
    getMine: (params?: { page?: number; limit?: number }) =>
        request<MyReviewsResponse>('/reviews/mine', {
            params: {
                ...(params?.page ? { page: String(params.page) } : {}),
                ...(params?.limit ? { limit: String(params.limit) } : {}),
            },
        }),

    /** GET review the caller wrote for this appointment, if any. */
    getForAppointment: (appointmentId: string) =>
        request<{ data: DoctorReview | null }>(`/appointments/${appointmentId}/review`),

    /** Submit a review after a completed appointment. */
    create: (appointmentId: string, data: CreateReviewInput) =>
        request<DoctorReview>(`/appointments/${appointmentId}/review`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};
