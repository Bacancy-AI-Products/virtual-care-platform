/**
 * Tiny test factories. Each function returns input ready to pass to a
 * service or Prisma create. Keep them flat — no chaining, no fluent builders.
 *
 * Convention: every factory accepts a `Partial<T>` overrides object so tests
 * can change only what matters to the assertion.
 */
import { Role } from '../generated/prisma';

let counter = 0;
const uniq = (): number => ++counter;

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
