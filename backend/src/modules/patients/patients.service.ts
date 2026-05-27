import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeEncrypt, maybeDecrypt } from '../../utils/crypto';
import type { Prisma } from '../../../generated/prisma';
import type { Gender } from '../../../generated/prisma';

// Fields that must be encrypted at rest (HIPAA §164.312(a)(2)(iv)).
// Includes the demographic identifiers HIPAA classifies as "individually identifiable":
// name, phone, address, sub-state geography (city, state), DOB, blood group.
const PHI_STRING_FIELDS = [
    'address',
    'phone',
    'emergencyContactPhone',
    'emergencyContactName',
    'dateOfBirth',
    'bloodGroup',
    'city',
    'state',
] as const;
type PatientPhiField = (typeof PHI_STRING_FIELDS)[number];

/** Encrypt all PHI string fields before a Prisma write. */
function encryptPatientFields<
    T extends Partial<Record<PatientPhiField, string | null | undefined>>,
>(data: T): T {
    const out = { ...data };
    for (const field of PHI_STRING_FIELDS) {
        if (field in out) {
            (out as Record<string, unknown>)[field] = maybeEncrypt(
                out[field] as string | null | undefined,
            );
        }
    }
    return out;
}

/** Decrypt all PHI string fields after a Prisma read. */
function decryptPatientFields<
    T extends Partial<Record<PatientPhiField, string | null | undefined>>,
>(record: T): T {
    const out = { ...record };
    for (const field of PHI_STRING_FIELDS) {
        if (field in out) {
            (out as Record<string, unknown>)[field] = maybeDecrypt(
                out[field] as string | null | undefined,
            );
        }
    }
    return out;
}

const patientFullSelect = {
    id: true,
    userId: true,
    dateOfBirth: true,
    gender: true,
    phone: true,
    bloodGroup: true,
    height: true,
    weight: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    city: true,
    state: true,
    address: true,
    user: {
        select: { id: true, name: true, email: true },
    },
} as const;

/**
 * Full record select used for the doctor's patient details view.
 * Includes contact + address fields — this endpoint is protected and only
 * returns data for patients the doctor has an appointment with.
 */
const patientDoctorViewSelect = {
    id: true,
    userId: true,
    dateOfBirth: true,
    gender: true,
    phone: true,
    bloodGroup: true,
    height: true,
    weight: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    city: true,
    state: true,
    address: true,
    user: {
        select: { id: true, name: true, email: true },
    },
} as const;

async function getDoctorId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { doctorProfile: { select: { id: true } } },
    });
    return user?.doctorProfile?.id ?? null;
}

export interface UpdatePatientProfileData {
    phone?: string | null;
    dateOfBirth?: string | null; // ISO date string "YYYY-MM-DD" — stored encrypted at rest
    gender?: string | null;
    bloodGroup?: string | null;
    height?: number | null;
    weight?: number | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
}

export async function updateMyProfile(userId: string, data: UpdatePatientProfileData) {
    const patient = await prisma.patient.findUnique({
        where: { userId },
    });
    if (!patient) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }

    const updateData: Prisma.PatientUpdateInput = {};
    if (data.phone !== undefined) updateData.phone = maybeEncrypt(data.phone);
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = maybeEncrypt(data.dateOfBirth);
    if (data.gender !== undefined) updateData.gender = data.gender as Gender | null;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = maybeEncrypt(data.bloodGroup);
    if (data.height !== undefined) updateData.height = data.height;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.emergencyContactName !== undefined)
        updateData.emergencyContactName = maybeEncrypt(data.emergencyContactName);
    if (data.emergencyContactPhone !== undefined)
        updateData.emergencyContactPhone = maybeEncrypt(data.emergencyContactPhone);
    if (data.city !== undefined) updateData.city = maybeEncrypt(data.city);
    if (data.state !== undefined) updateData.state = maybeEncrypt(data.state);
    if (data.address !== undefined) updateData.address = maybeEncrypt(data.address);

    const updated = await prisma.patient.update({
        where: { userId },
        data: updateData,
        select: patientFullSelect,
    });

    return decryptPatientFields(updated);
}

export async function getPatientForDoctor(patientId: string, doctorUserId: string) {
    const doctorId = await getDoctorId(doctorUserId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const hasAppointment = await prisma.appointment.findFirst({
        where: {
            patientId,
            doctorId,
        },
        select: { id: true },
    });
    if (!hasAppointment) {
        throw new AppError('You do not have access to this patient', 403, 'FORBIDDEN');
    }

    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: patientDoctorViewSelect,
    });
    if (!patient) {
        throw new AppError('Patient not found', 404, 'NOT_FOUND');
    }

    return decryptPatientFields(patient);
}
