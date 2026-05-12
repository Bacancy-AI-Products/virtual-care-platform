/**
 * Tiny test factories. Each function returns input ready to pass to a
 * service or Prisma create. Keep them flat — no chaining, no fluent builders.
 *
 * Convention: every factory accepts a `Partial<T>` overrides object so tests
 * can change only what matters to the assertion.
 */
import { Role } from '../generated/prisma';
import { prisma } from '../src/db';
import { hashPassword } from '../src/utils';

let counter = 0;
const uniq = (): number => ++counter;

// ─── Input factories (return plain objects) ───────────────────────────────────

export interface UserFactoryInput {
    name: string;
    email: string;
    password: string;
    role: Role;
}

export const aUserInput = (overrides: Partial<UserFactoryInput> = {}): UserFactoryInput => {
    const n = uniq();
    return {
        name: `Test User ${n}`,
        email: `test.user.${n}@telecare.local`,
        password: 'Demo@1234',
        role: Role.PATIENT,
        ...overrides,
    };
};

export const aPatientInput = (overrides: Partial<UserFactoryInput> = {}) =>
    aUserInput({ role: Role.PATIENT, ...overrides });

export const aDoctorInput = (overrides: Partial<UserFactoryInput> = {}) =>
    aUserInput({ role: Role.DOCTOR, ...overrides });

// ─── DB factories (insert real rows; return persisted Prisma records) ─────────

interface CreatedPatient {
    userId: string;
    patientId: string;
    email: string;
    name: string;
}

interface CreatedDoctor {
    userId: string;
    doctorId: string;
    email: string;
    name: string;
}

/**
 * Create a real patient (User + Patient rows) in the DB. Returns the
 * IDs and basic identity fields tests typically need.
 */
export async function createPatient(
    overrides: Partial<UserFactoryInput> = {},
): Promise<CreatedPatient> {
    const input = aPatientInput(overrides);
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            passwordHash,
            role: Role.PATIENT,
            patient: { create: {} },
        },
        include: { patient: true },
    });
    return {
        userId: user.id,
        patientId: user.patient!.id,
        email: user.email,
        name: user.name,
    };
}

/**
 * Create a real doctor (User + DoctorProfile rows) in the DB. `isActive`
 * defaults to true; pass `{ isActive: false }` to simulate a deactivated doctor.
 */
export async function createDoctor(
    overrides: Partial<UserFactoryInput> & {
        specialization?: string;
        isActive?: boolean;
    } = {},
): Promise<CreatedDoctor> {
    const { specialization = 'General Medicine', isActive = true, ...userOverrides } = overrides;
    const input = aDoctorInput(userOverrides);
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            passwordHash,
            role: Role.DOCTOR,
            doctorProfile: {
                create: {
                    specialization,
                    isActive,
                },
            },
        },
        include: { doctorProfile: true },
    });
    return {
        userId: user.id,
        doctorId: user.doctorProfile!.id,
        email: user.email,
        name: user.name,
    };
}

/**
 * Create an appointment between a patient and doctor. Defaults: 30-minute
 * slot starting one hour from "now", PENDING status.
 */
export async function createAppointment(
    patientId: string,
    doctorId: string,
    overrides: Partial<{
        scheduledAt: Date;
        durationMinutes: number;
        status:
            | 'PENDING'
            | 'CONFIRMED'
            | 'COMPLETED'
            | 'CANCELLED_BY_PATIENT'
            | 'CANCELLED_BY_DOCTOR'
            | 'NO_SHOW';
        reason: string | null;
    }> = {},
) {
    const {
        scheduledAt = new Date(Date.now() + 60 * 60_000),
        durationMinutes = 30,
        status = 'PENDING',
        reason = 'Routine check-up',
    } = overrides;

    return prisma.appointment.create({
        data: {
            patientId,
            doctorId,
            scheduledAt,
            durationMinutes,
            status,
            reason,
        },
    });
}
