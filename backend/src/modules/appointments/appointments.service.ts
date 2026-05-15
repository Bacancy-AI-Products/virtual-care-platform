import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeEncrypt, maybeDecrypt } from '../../utils/crypto';
import type { Prisma, AppointmentStatus } from '../../../generated/prisma';

/** Consistent shape returned for any appointment query. */
const appointmentSelect = {
    id: true,
    scheduledAt: true,
    durationMinutes: true,
    status: true,
    reason: true,
    declineReason: true,
    videoRoomId: true,
    meetingLink: true,
    sessionStartedAt: true,
    sessionEndedAt: true,
    createdAt: true,
    doctor: {
        select: {
            id: true,
            specialization: true,
            consultationFee: true,
            user: { select: { id: true, name: true, email: true } },
        },
    },
    patient: {
        select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
        },
    },
} as const;

/** Decrypt the `reason` PHI field on any appointment-shaped object. */
function decryptAppointment<T extends { reason?: string | null }>(appt: T): T {
    return { ...appt, reason: maybeDecrypt(appt.reason) };
}

/** Decrypt `reason` on an array of appointments. */
function decryptAppointments<T extends { reason?: string | null }>(appts: T[]): T[] {
    return appts.map(decryptAppointment);
}

async function getDoctorId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { doctorProfile: { select: { id: true } } },
    });
    return user?.doctorProfile?.id ?? null;
}

async function getPatientId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { patient: { select: { id: true } } },
    });
    return user?.patient?.id ?? null;
}

export type UpdateStatusResult = {
    id: string;
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    status: string;
    reason: string | null;
    declineReason: string | null;
    createdAt: Date;
    patientUserId: string;
    patientEmail: string;
    patientName: string;
    doctorName: string;
};

/**
 * Doctor confirms or declines an appointment. Only the appointment's doctor can set CONFIRMED or CANCELLED_BY_DOCTOR.
 * Returns updated appointment and patientUserId for notification.
 */
export async function updateStatus(
    appointmentId: string,
    userId: string,
    role: string,
    status: 'CONFIRMED' | 'CANCELLED_BY_DOCTOR',
    declineReason?: string,
): Promise<UpdateStatusResult> {
    if (role !== 'DOCTOR') {
        throw new AppError('Only doctors can confirm or decline appointments', 403, 'FORBIDDEN');
    }

    const doctorId = await getDoctorId(userId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
            patient: { include: { user: { select: { id: true, name: true, email: true } } } },
            doctor: { include: { user: { select: { name: true } } } },
        },
    });

    if (!appointment) {
        throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }
    if (appointment.doctorId !== doctorId) {
        throw new AppError(
            'You can only update status for your own appointments',
            403,
            'FORBIDDEN',
        );
    }

    const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
            status,
            ...(status === 'CANCELLED_BY_DOCTOR' ? { declineReason: declineReason ?? null } : {}),
        },
        include: {
            patient: { include: { user: { select: { id: true, name: true, email: true } } } },
            doctor: { include: { user: { select: { name: true } } } },
        },
    });

    return {
        id: updated.id,
        patientId: updated.patientId,
        doctorId: updated.doctorId,
        scheduledAt: updated.scheduledAt,
        status: updated.status,
        reason: maybeDecrypt(updated.reason) ?? null, // decrypt PHI before returning
        declineReason: updated.declineReason,
        createdAt: updated.createdAt,
        patientUserId: updated.patient.userId,
        patientEmail: updated.patient.user.email,
        patientName: updated.patient.user.name,
        doctorName: updated.doctor.user.name,
    };
}

export type CreateAppointmentResult = {
    id: string;
    patientId: string;
    doctorId: string;
    scheduledAt: Date;
    durationMinutes: number;
    status: string;
    reason: string | null;
    createdAt: Date;
    doctorUserId: string;
};

export interface CreateAppointmentData {
    doctorId: string;
    scheduledAt: string;
    durationMinutes: number;
    reason?: string | null;
}

export interface ListAppointmentsParams {
    status?: AppointmentStatus;
    page: number;
    limit: number;
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Book a new appointment.
 * - Resolves patient + doctor profiles from their user IDs.
 * - Rejects with 409 if the doctor already has an overlapping PENDING/CONFIRMED appointment.
 * - Returns appointment and doctorUserId for APPOINTMENT_REQUESTED notification.
 */
export async function createAppointment(
    patientUserId: string,
    data: CreateAppointmentData,
): Promise<CreateAppointmentResult> {
    const patient = await prisma.patient.findUnique({ where: { userId: patientUserId } });
    if (!patient) throw new AppError('Patient profile not found', 404, 'NOT_FOUND');

    const doctor = await prisma.doctorProfile.findUnique({
        where: { id: data.doctorId },
        select: { id: true, userId: true, isActive: true },
    });
    if (!doctor || !doctor.isActive) {
        throw new AppError('Doctor not found or not accepting appointments', 404, 'NOT_FOUND');
    }

    const scheduledAt = new Date(data.scheduledAt);
    const durationMs = data.durationMinutes * 60_000;
    const endAt = new Date(scheduledAt.getTime() + durationMs);

    // Any existing active appointment whose start time falls inside the new slot window is a conflict.
    const conflict = await prisma.appointment.findFirst({
        where: {
            doctorId: data.doctorId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            scheduledAt: {
                gte: new Date(scheduledAt.getTime() - durationMs), // starts at most one slot before
                lt: endAt, // starts before this slot ends
            },
        },
    });

    if (conflict) {
        throw new AppError(
            'This time slot is already booked. Please choose a different slot.',
            409,
            'CONFLICT',
        );
    }

    const appointment = await prisma.appointment.create({
        data: {
            patientId: patient.id,
            doctorId: data.doctorId,
            scheduledAt,
            durationMinutes: data.durationMinutes,
            reason: maybeEncrypt(data.reason ?? null) ?? null,
            status: 'PENDING',
        },
        include: { doctor: { select: { userId: true } } },
    });

    return {
        id: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        scheduledAt: appointment.scheduledAt,
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        reason: maybeDecrypt(appointment.reason) ?? null, // decrypt before returning to caller
        createdAt: appointment.createdAt,
        doctorUserId: appointment.doctor.userId,
    };
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List appointments scoped to the caller's role:
 *   PATIENT → only their appointments
 *   DOCTOR  → only their appointments
 *   ADMIN   → all appointments
 */
export async function listAppointments(
    userId: string,
    role: string,
    params: ListAppointmentsParams,
) {
    const { status, page, limit } = params;
    const where: Prisma.AppointmentWhereInput = {};

    if (role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (!patient) throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
        where.patientId = patient.id;
    } else if (role === 'DOCTOR') {
        const doctor = await prisma.doctorProfile.findUnique({ where: { userId } });
        if (!doctor) throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
        where.doctorId = doctor.id;
    }

    if (status) where.status = status;

    const [data, total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            select: appointmentSelect,
            orderBy: {
                createdAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.appointment.count({ where }),
    ]);

    return { data: decryptAppointments(data), total, page, limit };
}

// ─── Get ──────────────────────────────────────────────────────────────────────

/** Fetch a single appointment, enforcing that only its doctor, patient, or an admin can view it. */
export async function getAppointment(appointmentId: string, userId: string, role: string) {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: appointmentSelect,
    });

    if (!appointment) throw new AppError('Appointment not found', 404, 'NOT_FOUND');

    if (role !== 'ADMIN') {
        const isDoctor = appointment.doctor.user.id === userId;
        const isPatient = appointment.patient.user.id === userId;
        if (!isDoctor && !isPatient) throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return decryptAppointment(appointment);
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancel an appointment.
 * Sets CANCELLED_BY_PATIENT or CANCELLED_BY_DOCTOR depending on who cancels.
 * Admins cancel as CANCELLED_BY_DOCTOR by convention.
 */
export async function cancelAppointment(appointmentId: string, userId: string, role: string) {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true,
            status: true,
            doctor: { select: { user: { select: { id: true } } } },
            patient: { select: { user: { select: { id: true } } } },
        },
    });

    if (!appointment) throw new AppError('Appointment not found', 404, 'NOT_FOUND');

    const isDoctor = appointment.doctor.user.id === userId;
    const isPatient = appointment.patient.user.id === userId;

    if (role !== 'ADMIN' && !isDoctor && !isPatient) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const terminalStatuses: AppointmentStatus[] = [
        'COMPLETED',
        'CANCELLED_BY_PATIENT',
        'CANCELLED_BY_DOCTOR',
    ];
    if (terminalStatuses.includes(appointment.status as AppointmentStatus)) {
        throw new AppError(
            `Cannot cancel an appointment with status: ${appointment.status}`,
            400,
            'BAD_REQUEST',
        );
    }

    const newStatus: AppointmentStatus = isPatient ? 'CANCELLED_BY_PATIENT' : 'CANCELLED_BY_DOCTOR';

    const cancelled = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: newStatus },
        select: appointmentSelect,
    });
    return decryptAppointment(cancelled);
}
