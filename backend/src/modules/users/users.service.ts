import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { maybeDecrypt } from '../../utils/crypto';

const doctorProfileSelect = {
    id: true,
    userId: true,
    specialization: true,
    experienceYears: true,
    bio: true,
    consultationFee: true,
    registrationNumber: true,
    degree: true,
    verified: true,
    isActive: true,
} as const;

const patientProfileSelect = {
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
} as const;

export async function updateAvatar(userId: string, avatarFileId: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { avatarFileId },
        select: { id: true, avatarFileId: true },
    });
}

export async function getMe(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarFileId: true,
            doctorProfile: {
                select: doctorProfileSelect,
            },
            patient: {
                select: patientProfileSelect,
            },
        },
    });

    if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const { doctorProfile, patient, ...base } = user;

    // Decrypt patient PHI fields before returning to caller
    const decryptedPatient = patient
        ? {
              ...patient,
              phone: maybeDecrypt(patient.phone),
              dateOfBirth: maybeDecrypt(patient.dateOfBirth),
              bloodGroup: maybeDecrypt(patient.bloodGroup),
              emergencyContactPhone: maybeDecrypt(patient.emergencyContactPhone),
              address: maybeDecrypt(patient.address),
          }
        : undefined;

    return {
        ...base,
        doctorProfile: doctorProfile ?? undefined,
        patient: decryptedPatient,
    };
}
