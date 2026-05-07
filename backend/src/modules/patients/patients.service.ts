import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import type { Prisma } from '../../../generated/prisma';
import type { Gender } from '../../../generated/prisma';

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

/** Evaluation-only fields for doctors (excludes phone, emergency contact, address). */
const patientEvaluationSelect = {
    id: true,
    dateOfBirth: true,
    gender: true,
    bloodGroup: true,
    height: true,
    weight: true,
    user: {
        select: { name: true, email: true },
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
    dateOfBirth?: Date | null;
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
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updateData.gender = data.gender as Gender | null;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.emergencyContactName !== undefined)
        updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined)
        updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.address !== undefined) updateData.address = data.address;

    const updated = await prisma.patient.update({
        where: { userId },
        data: updateData,
        select: patientFullSelect,
    });

    return updated;
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
        select: patientEvaluationSelect,
    });
    if (!patient) {
        throw new AppError('Patient not found', 404, 'NOT_FOUND');
    }

    return patient;
}
