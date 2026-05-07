import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import type { Prisma } from '../../../generated/prisma';

const doctorListSelect = {
    id: true,
    userId: true,
    specialization: true,
    experienceYears: true,
    bio: true,
    consultationFee: true,
    registrationNumber: true,
    degree: true,
    city: true,
    state: true,
    verified: true,
    isActive: true,
    user: {
        select: { name: true, email: true },
    },
} as const;

export interface ListDoctorsParams {
    specialization?: string;
    city?: string;
    state?: string;
    verified?: boolean;
    page: number;
    limit: number;
}

export interface ListDoctorsResult {
    data: Array<{
        id: string;
        userId: string;
        specialization: string;
        experienceYears: number | null;
        bio: string | null;
        consultationFee: Prisma.Decimal | null;
        registrationNumber: string | null;
        degree: string | null;
        city: string | null;
        state: string | null;
        verified: boolean;
        isActive: boolean;
        user: { name: string; email: string };
    }>;
    total: number;
    page: number;
    limit: number;
}

export interface GetAvailabilityOptions {
    from?: string;
    to?: string;
}

export async function listDoctors(params: ListDoctorsParams): Promise<ListDoctorsResult> {
    const { specialization, city, state, verified, page, limit } = params;

    const where: Prisma.DoctorProfileWhereInput = {
        isActive: true,
    };
    if (specialization?.trim()) {
        where.specialization = { contains: specialization.trim(), mode: 'insensitive' };
    }
    if (city?.trim()) {
        where.city = { contains: city.trim(), mode: 'insensitive' };
    }
    if (state?.trim()) {
        where.state = { contains: state.trim(), mode: 'insensitive' };
    }
    if (verified !== undefined) {
        where.verified = verified;
    }

    const [data, total] = await Promise.all([
        prisma.doctorProfile.findMany({
            where,
            select: doctorListSelect,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.doctorProfile.count({ where }),
    ]);

    return {
        data: data.map((d) => ({
            ...d,
            consultationFee: d.consultationFee,
        })),
        total,
        page,
        limit,
    };
}

export async function getDoctorById(id: string) {
    const doctor = await prisma.doctorProfile.findUnique({
        where: { id },
        select: doctorListSelect,
    });
    if (!doctor) {
        throw new AppError('Doctor not found', 404, 'NOT_FOUND');
    }
    return doctor;
}

export async function getAvailability(doctorId: string, options: GetAvailabilityOptions = {}) {
    const doctor = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { id: true },
    });
    if (!doctor) {
        throw new AppError('Doctor not found', 404, 'NOT_FOUND');
    }

    const availability = await prisma.doctorAvailability.findMany({
        where: { doctorId },
        orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
        select: {
            id: true,
            weekday: true,
            startTime: true,
            endTime: true,
            slotDuration: true,
        },
    });

    const bookedAppointments =
        options.from && options.to
            ? (
                  await prisma.appointment.findMany({
                      where: {
                          doctorId,
                          status: { in: ['PENDING', 'CONFIRMED'] },
                          scheduledAt: {
                              gte: new Date(options.from),
                              lt: new Date(options.to),
                          },
                      },
                      orderBy: { scheduledAt: 'asc' },
                      select: { scheduledAt: true, durationMinutes: true },
                  })
              ).map((appointment) => ({
                  scheduledAt: appointment.scheduledAt.toISOString(),
                  durationMinutes: appointment.durationMinutes,
              }))
            : [];

    return { availability, bookedAppointments };
}

export async function getMyAvailability(userId: string) {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }
    return getAvailability(profile.id);
}

export async function getMyProfile(userId: string) {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
        select: doctorListSelect,
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }
    return profile;
}

export async function updateMyAvailability(
    userId: string,
    data: {
        availability: Array<{
            weekday: number;
            startTime: string;
            endTime: string;
            slotDuration: number;
        }>;
    },
) {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
        await tx.doctorAvailability.deleteMany({ where: { doctorId: profile.id } });
        if (data.availability && data.availability.length > 0) {
            await tx.doctorAvailability.createMany({
                data: data.availability.map((slot) => ({
                    doctorId: profile.id,
                    weekday: slot.weekday,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    slotDuration: slot.slotDuration,
                })),
            });
        }
    });

    return getAvailability(profile.id);
}

export interface UpdateDoctorProfileData {
    specialization?: string;
    experienceYears?: number;
    bio?: string | null;
    consultationFee?: number | null;
    registrationNumber?: string | null;
    degree?: string | null;
    city?: string | null;
    state?: string | null;
    isActive?: boolean;
}

export async function updateMyProfile(userId: string, data: UpdateDoctorProfileData) {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const updateData: Prisma.DoctorProfileUpdateInput = {};
    if (data.specialization !== undefined) updateData.specialization = data.specialization;
    if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.consultationFee !== undefined) updateData.consultationFee = data.consultationFee;
    if (data.registrationNumber !== undefined)
        updateData.registrationNumber = data.registrationNumber;
    if (data.degree !== undefined) updateData.degree = data.degree;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.doctorProfile.update({
        where: { userId },
        data: updateData,
        select: doctorListSelect,
    });

    return updated;
}

export async function listSpecializations() {
    return prisma.specialization.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    });
}
