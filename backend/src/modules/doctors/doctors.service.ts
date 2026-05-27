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
    credentials: true,
    languages: true,
    city: true,
    state: true,
    verified: true,
    isActive: true,
    user: {
        select: { name: true, email: true },
    },
} as const;

/** Trust-signal stats derived from reviews + completed appointments. */
export interface DoctorStats {
    averageRating: number | null; // null when no reviews yet
    reviewCount: number;
    consultationCount: number; // count of COMPLETED appointments
    avgResponseMinutes: number | null; // avg (sessionStartedAt - scheduledAt) over completed
}

/**
 * Compute aggregate trust signals for one or more doctors in a single round-trip
 * per metric. Returns a Map keyed by doctorId.
 */
async function getStatsByDoctorIds(doctorIds: string[]): Promise<Map<string, DoctorStats>> {
    if (doctorIds.length === 0) return new Map();

    const [ratingAgg, completedAgg, completedWithSession] = await Promise.all([
        prisma.review.groupBy({
            by: ['doctorId'],
            where: { doctorId: { in: doctorIds } },
            _avg: { rating: true },
            _count: { _all: true },
        }),
        prisma.appointment.groupBy({
            by: ['doctorId'],
            where: { doctorId: { in: doctorIds }, status: 'COMPLETED' },
            _count: { _all: true },
        }),
        prisma.appointment.findMany({
            where: {
                doctorId: { in: doctorIds },
                status: 'COMPLETED',
                sessionStartedAt: { not: null },
            },
            select: { doctorId: true, scheduledAt: true, sessionStartedAt: true },
        }),
    ]);

    const responseTotals = new Map<string, { sum: number; n: number }>();
    for (const a of completedWithSession) {
        if (!a.sessionStartedAt) continue;
        const minutes = Math.max(
            0,
            (a.sessionStartedAt.getTime() - a.scheduledAt.getTime()) / 60_000,
        );
        const cur = responseTotals.get(a.doctorId) ?? { sum: 0, n: 0 };
        cur.sum += minutes;
        cur.n += 1;
        responseTotals.set(a.doctorId, cur);
    }

    const out = new Map<string, DoctorStats>();
    for (const id of doctorIds) {
        const rating = ratingAgg.find((r) => r.doctorId === id);
        const completed = completedAgg.find((c) => c.doctorId === id);
        const resp = responseTotals.get(id);
        out.set(id, {
            averageRating: rating?._avg.rating ?? null,
            reviewCount: rating?._count._all ?? 0,
            consultationCount: completed?._count._all ?? 0,
            avgResponseMinutes: resp && resp.n > 0 ? Math.round(resp.sum / resp.n) : null,
        });
    }
    return out;
}

export interface ListDoctorsParams {
    specialization?: string;
    city?: string;
    state?: string;
    /** Name, matching specialization record(s), or bio */
    q?: string;
    verified?: boolean;
    page: number;
    limit: number;
}

export interface DoctorWithStats {
    id: string;
    userId: string;
    specialization: string;
    experienceYears: number | null;
    bio: string | null;
    consultationFee: Prisma.Decimal | null;
    registrationNumber: string | null;
    degree: string | null;
    credentials: Prisma.JsonValue | null;
    languages: string[];
    city: string | null;
    state: string | null;
    verified: boolean;
    isActive: boolean;
    user: { name: string; email: string };
    stats: DoctorStats;
}

/**
 * Same shape as DoctorWithStats but without the aggregated `stats` block.
 * Returned by /doctors/me and PUT /doctors/me so those endpoints can stay
 * a single DB query. Stats are fetched separately via /doctors/me/stats
 * which can be cached independently on the client.
 */
export type MyDoctorProfile = Omit<DoctorWithStats, 'stats'>;

export interface ListDoctorsResult {
    data: DoctorWithStats[];
    total: number;
    page: number;
    limit: number;
}

export interface GetAvailabilityOptions {
    from?: string;
    to?: string;
}

export async function listDoctors(params: ListDoctorsParams): Promise<ListDoctorsResult> {
    const { specialization, city, state, verified, page, limit, q } = params;

    const andConditions: Prisma.DoctorProfileWhereInput[] = [{ isActive: true }];

    if (specialization?.trim()) {
        andConditions.push({
            specialization: { contains: specialization.trim(), mode: 'insensitive' },
        });
    }
    if (city?.trim()) {
        andConditions.push({ city: { contains: city.trim(), mode: 'insensitive' } });
    }
    if (state?.trim()) {
        andConditions.push({ state: { contains: state.trim(), mode: 'insensitive' } });
    }
    if (verified !== undefined) {
        andConditions.push({ verified });
    }

    if (q?.trim()) {
        const qTrim = q.trim();
        const matchingSpecs = await prisma.specialization.findMany({
            where: { name: { contains: qTrim, mode: 'insensitive' } },
            select: { id: true },
        });
        const specIds = matchingSpecs.map((s) => s.id);
        andConditions.push({
            OR: [
                { user: { is: { name: { contains: qTrim, mode: 'insensitive' } } } },
                { bio: { contains: qTrim, mode: 'insensitive' } },
                ...(specIds.length > 0 ? [{ specialization: { in: specIds } }] : []),
            ],
        });
    }

    const where: Prisma.DoctorProfileWhereInput = { AND: andConditions };

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

    const stats = await getStatsByDoctorIds(data.map((d) => d.id));

    return {
        data: data.map((d) => ({
            ...d,
            stats: stats.get(d.id) ?? {
                averageRating: null,
                reviewCount: 0,
                consultationCount: 0,
                avgResponseMinutes: null,
            },
        })),
        total,
        page,
        limit,
    };
}

export async function getDoctorById(id: string): Promise<DoctorWithStats> {
    const doctor = await prisma.doctorProfile.findUnique({
        where: { id },
        select: doctorListSelect,
    });
    if (!doctor) {
        throw new AppError('Doctor not found', 404, 'NOT_FOUND');
    }
    const stats = await getStatsByDoctorIds([id]);
    return {
        ...doctor,
        stats: stats.get(id) ?? {
            averageRating: null,
            reviewCount: 0,
            consultationCount: 0,
            avgResponseMinutes: null,
        },
    };
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

export async function getMyProfile(userId: string): Promise<MyDoctorProfile> {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
        select: doctorListSelect,
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }
    return profile;
}

export async function getMyStats(userId: string): Promise<DoctorStats> {
    const profile = await prisma.doctorProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }
    const stats = await getStatsByDoctorIds([profile.id]);
    return (
        stats.get(profile.id) ?? {
            averageRating: null,
            reviewCount: 0,
            consultationCount: 0,
            avgResponseMinutes: null,
        }
    );
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

export interface CredentialInput {
    title: string;
    institution: string;
    year: number;
}

export interface UpdateDoctorProfileData {
    specialization?: string;
    experienceYears?: number;
    bio?: string | null;
    consultationFee?: number | null;
    registrationNumber?: string | null;
    degree?: string | null;
    credentials?: CredentialInput[] | null;
    languages?: string[];
    city?: string | null;
    state?: string | null;
    isActive?: boolean;
}

export async function updateMyProfile(
    userId: string,
    data: UpdateDoctorProfileData,
): Promise<MyDoctorProfile> {
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
    if (data.credentials !== undefined)
        updateData.credentials = data.credentials as unknown as Prisma.InputJsonValue;
    if (data.languages !== undefined) updateData.languages = data.languages;
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
