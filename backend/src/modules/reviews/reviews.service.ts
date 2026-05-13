import { prisma } from '../../db';
import { AppError } from '../../utils/errors';

export interface PublicReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    patient: { name: string };
}

export interface ListReviewsParams {
    doctorId: string;
    page: number;
    limit: number;
}

export interface ReviewsSummary {
    averageRating: number | null;
    reviewCount: number;
    /** Counts by star rating, 1–5. */
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export async function getDoctorReviewsSummary(doctorId: string): Promise<ReviewsSummary> {
    const [agg, byRating] = await Promise.all([
        prisma.review.aggregate({
            where: { doctorId },
            _avg: { rating: true },
            _count: { _all: true },
        }),
        prisma.review.groupBy({
            by: ['rating'],
            where: { doctorId },
            _count: { _all: true },
        }),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of byRating) {
        const key = r.rating as 1 | 2 | 3 | 4 | 5;
        if (key >= 1 && key <= 5) distribution[key] = r._count._all;
    }

    return {
        averageRating: agg._avg.rating ?? null,
        reviewCount: agg._count._all,
        distribution,
    };
}

export async function listDoctorReviews(params: ListReviewsParams): Promise<{
    data: PublicReview[];
    total: number;
    page: number;
    limit: number;
    summary: ReviewsSummary;
}> {
    const { doctorId, page, limit } = params;

    const doctorExists = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { id: true },
    });
    if (!doctorExists) {
        throw new AppError('Doctor not found', 404, 'NOT_FOUND');
    }

    const [data, total, summary] = await Promise.all([
        prisma.review.findMany({
            where: { doctorId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                patient: { select: { user: { select: { name: true } } } },
            },
        }),
        prisma.review.count({ where: { doctorId } }),
        getDoctorReviewsSummary(doctorId),
    ]);

    return {
        data: data.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            patient: { name: r.patient.user.name },
        })),
        total,
        page,
        limit,
        summary,
    };
}

export interface CreateReviewInput {
    rating: number;
    comment?: string | null;
}

/**
 * Patient submits a review for a completed appointment they were part of.
 * Enforces: appointment exists, belongs to caller, is COMPLETED, no prior review.
 */
export async function createReviewForAppointment(
    appointmentId: string,
    userId: string,
    data: CreateReviewInput,
): Promise<PublicReview> {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            doctorId: true,
            patientId: true,
            status: true,
            patient: { select: { userId: true } },
            review: { select: { id: true } },
        },
    });

    if (!appointment) {
        throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }
    if (appointment.patient.userId !== userId) {
        throw new AppError('You can only review your own appointments', 403, 'FORBIDDEN');
    }
    if (appointment.status !== 'COMPLETED') {
        throw new AppError(
            'You can only review completed consultations',
            400,
            'INVALID_APPOINTMENT_STATUS',
        );
    }
    if (appointment.review) {
        throw new AppError('You have already reviewed this consultation', 409, 'ALREADY_REVIEWED');
    }

    const review = await prisma.review.create({
        data: {
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            rating: data.rating,
            comment: data.comment ?? null,
        },
        select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            patient: { select: { user: { select: { name: true } } } },
        },
    });

    return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        patient: { name: review.patient.user.name },
    };
}

export interface UpdateReviewInput {
    rating?: number;
    comment?: string | null;
}

/**
 * Patient updates their own review on a completed appointment.
 * Enforces: appointment exists, belongs to caller, review exists.
 */
export async function updateReviewForAppointment(
    appointmentId: string,
    userId: string,
    data: UpdateReviewInput,
): Promise<PublicReview> {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            patient: { select: { userId: true } },
            review: { select: { id: true } },
        },
    });

    if (!appointment) {
        throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }
    if (appointment.patient.userId !== userId) {
        throw new AppError('You can only edit your own review', 403, 'FORBIDDEN');
    }
    if (!appointment.review) {
        throw new AppError('No review to update', 404, 'NOT_FOUND');
    }

    const updates: { rating?: number; comment?: string | null } = {};
    if (data.rating !== undefined) updates.rating = data.rating;
    if (data.comment !== undefined) updates.comment = data.comment;

    const review = await prisma.review.update({
        where: { id: appointment.review.id },
        data: updates,
        select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            patient: { select: { user: { select: { name: true } } } },
        },
    });

    return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        patient: { name: review.patient.user.name },
    };
}

/**
 * Did this user already review this appointment? Used by the UI to show
 * "Write a review" vs "View your review" on completed appointments.
 */
export async function getReviewForAppointmentByPatient(
    appointmentId: string,
    userId: string,
): Promise<PublicReview | null> {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            patient: { select: { userId: true } },
            review: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                    patient: { select: { user: { select: { name: true } } } },
                },
            },
        },
    });
    if (!appointment) return null;
    if (appointment.patient.userId !== userId) return null;
    if (!appointment.review) return null;
    const r = appointment.review;
    return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        patient: { name: r.patient.user.name },
    };
}

export interface MyReview {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    appointmentId: string;
    doctor: {
        id: string;
        specialization: string;
        name: string;
    };
    visitDate: Date;
}

/**
 * All reviews written by the calling patient. Used by the patient feedback hub
 * so we don't have to query per-appointment.
 */
export async function listReviewsByPatientUserId(
    userId: string,
    options: { page: number; limit: number },
): Promise<{ data: MyReview[]; total: number; page: number; limit: number }> {
    const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!patient) {
        return { data: [], total: 0, page: options.page, limit: options.limit };
    }

    const [data, total] = await Promise.all([
        prisma.review.findMany({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'desc' },
            skip: (options.page - 1) * options.limit,
            take: options.limit,
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                appointmentId: true,
                doctor: {
                    select: {
                        id: true,
                        specialization: true,
                        user: { select: { name: true } },
                    },
                },
                appointment: { select: { scheduledAt: true } },
            },
        }),
        prisma.review.count({ where: { patientId: patient.id } }),
    ]);

    return {
        data: data.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            appointmentId: r.appointmentId,
            doctor: {
                id: r.doctor.id,
                specialization: r.doctor.specialization,
                name: r.doctor.user.name,
            },
            visitDate: r.appointment.scheduledAt,
        })),
        total,
        page: options.page,
        limit: options.limit,
    };
}
