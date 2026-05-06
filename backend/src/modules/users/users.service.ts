import { prisma } from '../../db';

function serviceError(message: string, status: number, code: string): never {
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = status;
    err.code = code;
    throw err;
}

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
        serviceError('User not found', 404, 'NOT_FOUND');
    }

    const { doctorProfile, patient, ...base } = user;
    return {
        ...base,
        doctorProfile: doctorProfile ?? undefined,
        patient: patient ?? undefined,
    };
}
