import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeEncrypt, maybeDecrypt } from '../../utils/crypto';

// ─── PHI decrypt helpers ──────────────────────────────────────────────────────

/** Decrypt the sensitive fields on a single PrescriptionItem. */
function decryptItem<
    T extends {
        drugName?: string;
        dosage?: string | null;
        frequency?: string | null;
        duration?: string | null;
        instructions?: string | null;
    },
>(item: T): T {
    return {
        ...item,
        drugName: maybeDecrypt(item.drugName) ?? '',
        dosage: maybeDecrypt(item.dosage),
        frequency: maybeDecrypt(item.frequency),
        duration: maybeDecrypt(item.duration),
        instructions: maybeDecrypt(item.instructions),
    };
}

/** Decrypt the sensitive fields on a prescription (including nested items). */
function decryptPrescription<
    T extends {
        notes?: string | null;
        items?: Array<{
            drugName?: string;
            dosage?: string | null;
            frequency?: string | null;
            duration?: string | null;
            instructions?: string | null;
        }>;
    },
>(rx: T): T {
    return {
        ...rx,
        notes: maybeDecrypt(rx.notes),
        items: rx.items ? rx.items.map(decryptItem) : rx.items,
    };
}

const prescriptionSelect = {
    id: true,
    doctorId: true,
    patientId: true,
    appointmentId: true,
    notes: true,
    createdAt: true,
    items: {
        select: {
            id: true,
            drugName: true,
            dosage: true,
            frequency: true,
            duration: true,
            quantity: true,
            instructions: true,
        },
    },
} as const;

/** Resolve userId + role to doctorId (DoctorProfile.id) or patientId (Patient.id). */
async function resolveParticipantIds(userId: string, role: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            doctorProfile: { select: { id: true } },
            patient: { select: { id: true } },
        },
    });
    if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return {
        doctorId: user.doctorProfile?.id ?? null,
        patientId: user.patient?.id ?? null,
    };
}

/** Check if user can access appointment (doctor, patient, or admin). */
async function canAccessAppointment(
    appointmentId: string,
    userId: string,
    role: string,
): Promise<boolean> {
    if (role === 'ADMIN') return true;

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { doctorId: true, patientId: true },
    });
    if (!appointment) return false;

    const { doctorId, patientId } = await resolveParticipantIds(userId, role);
    return (
        (role === 'DOCTOR' && doctorId === appointment.doctorId) ||
        (role === 'PATIENT' && patientId === appointment.patientId)
    );
}

/** Check if user can access prescription (doctor, patient, or admin). */
async function canAccessPrescription(
    prescriptionId: string,
    userId: string,
    role: string,
): Promise<boolean> {
    if (role === 'ADMIN') return true;

    const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        select: { doctorId: true, patientId: true },
    });
    if (!prescription) return false;

    const { doctorId, patientId } = await resolveParticipantIds(userId, role);
    return (
        (role === 'DOCTOR' && doctorId === prescription.doctorId) ||
        (role === 'PATIENT' && patientId === prescription.patientId)
    );
}

export interface CreatePrescriptionData {
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

export async function createPrescription(
    appointmentId: string,
    userId: string,
    role: string,
    data: CreatePrescriptionData,
) {
    if (role !== 'DOCTOR') {
        throw new AppError('Only doctors can create prescriptions', 403, 'FORBIDDEN');
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, doctorId: true, patientId: true },
    });
    if (!appointment) {
        throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }

    const { doctorId } = await resolveParticipantIds(userId, role);
    if (!doctorId || doctorId !== appointment.doctorId) {
        throw new AppError(
            'You can only create prescriptions for your own appointments',
            403,
            'FORBIDDEN',
        );
    }

    const prescription = await prisma.prescription.create({
        data: {
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            notes: maybeEncrypt(data.notes ?? null) ?? null,
            items: {
                create: data.items.map((item) => ({
                    drugName: maybeEncrypt(item.drugName) ?? item.drugName,
                    dosage: maybeEncrypt(item.dosage ?? null) ?? null,
                    frequency: maybeEncrypt(item.frequency ?? null) ?? null,
                    duration: maybeEncrypt(item.duration ?? null) ?? null,
                    quantity: item.quantity ?? null, // quantity is not a PHI field
                    instructions: maybeEncrypt(item.instructions ?? null) ?? null,
                })),
            },
        },
        select: prescriptionSelect,
    });

    return decryptPrescription(prescription);
}

export async function listByAppointment(appointmentId: string, userId: string, role: string) {
    const allowed = await canAccessAppointment(appointmentId, userId, role);
    if (!allowed) {
        throw new AppError('You do not have access to this appointment', 403, 'FORBIDDEN');
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true },
    });
    if (!appointment) {
        throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }

    const prescriptions = await prisma.prescription.findMany({
        where: { appointmentId },
        select: prescriptionSelect,
        orderBy: { createdAt: 'desc' },
    });

    return { prescriptions: prescriptions.map(decryptPrescription) };
}

export async function getById(prescriptionId: string, userId: string, role: string) {
    const prescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        select: prescriptionSelect,
    });
    if (!prescription) {
        throw new AppError('Prescription not found', 404, 'NOT_FOUND');
    }

    const allowed = await canAccessPrescription(prescriptionId, userId, role);
    if (!allowed) {
        throw new AppError('You do not have access to this prescription', 403, 'FORBIDDEN');
    }

    return decryptPrescription(prescription);
}

export interface ListPrescriptionsForUserOptions {
    limit: number;
}

export async function listForUser(
    userId: string,
    role: string,
    options: ListPrescriptionsForUserOptions,
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            doctorProfile: { select: { id: true } },
            patient: { select: { id: true } },
        },
    });

    const where =
        role === 'DOCTOR' && user?.doctorProfile
            ? { doctorId: user.doctorProfile.id }
            : role === 'PATIENT' && user?.patient
              ? { patientId: user.patient.id }
              : role === 'ADMIN'
                ? {}
                : { id: 'none' }; // no match

    const prescriptions = await prisma.prescription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        select: {
            id: true,
            doctorId: true,
            patientId: true,
            appointmentId: true,
            notes: true,
            createdAt: true,
            items: {
                select: {
                    id: true,
                    drugName: true,
                    dosage: true,
                    frequency: true,
                    duration: true,
                    quantity: true,
                    instructions: true,
                },
            },
            doctor: {
                select: {
                    id: true,
                    specialization: true,
                    user: { select: { id: true, name: true } },
                },
            },
            patient: {
                select: {
                    id: true,
                    user: { select: { id: true, name: true } },
                },
            },
            appointment: {
                select: {
                    id: true,
                    scheduledAt: true,
                    reason: true,
                },
            },
        },
    });

    return { prescriptions: prescriptions.map(decryptPrescription) };
}
