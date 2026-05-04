import crypto from 'node:crypto';
import { config } from '../../config';
import { prisma } from '../../db';
import { hashPassword, signToken, verifyPassword } from '../../utils';
import { Role } from '../../../generated/prisma';
import type { User } from '../../../generated/prisma';
import { sendPasswordReset } from '../email';

const RESET_TOKEN_EXPIRY_HOURS = 1;

const DOCTOR_PROFILE_PLACEHOLDER_SPECIALIZATION = 'Pending';

/** Generic message to avoid leaking whether email exists (timing/count attacks). */
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

function authError(message: string, status: number, code: string): never {
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = status;
    err.code = code;
    throw err;
}

export interface AuthResult {
    token: string;
    user: { id: string; name: string; email: string; role: string };
}

function toAuthResult(user: User): AuthResult {
    return {
        token: signToken({ sub: user.id, role: user.role }),
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };
}

/**
 * Authenticate user with email and password. Single DB query + password verification.
 */
export async function login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw authError(INVALID_CREDENTIALS_MESSAGE, 401, 'UNAUTHORIZED');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
        throw authError(INVALID_CREDENTIALS_MESSAGE, 401, 'UNAUTHORIZED');
    }

    return toAuthResult(user);
}

/**
 * Register a new user. Checks email uniqueness once before transaction to fail fast.
 */
export async function signup(
    name: string,
    email: string,
    password: string,
    role: Role,
): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw authError('Email already registered', 409, 'CONFLICT');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
            data: { name, email, passwordHash, role },
        });
        if (role === Role.PATIENT) {
            await tx.patient.create({ data: { userId: u.id } });
        } else if (role === Role.DOCTOR) {
            await tx.doctorProfile.create({
                data: {
                    userId: u.id,
                    specialization: DOCTOR_PROFILE_PLACEHOLDER_SPECIALIZATION,
                },
            });
        }
        return u;
    });

    return toAuthResult(user);
}

/**
 * Request password reset. Sends email if user exists; same response either way.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: token,
                passwordResetExpires: expiresAt,
            },
        });
        const baseUrl = config.appBaseUrl.replace(/\/$/, '');
        const resetLink = `${baseUrl}/reset-password?token=${token}`;
        try {
            await sendPasswordReset(user.email, resetLink);
        } catch (err) {
            const msg =
                err && typeof err === 'object' && 'message' in err
                    ? String((err as Error).message)
                    : '';
            const code =
                err && typeof err === 'object' && 'code' in err
                    ? (err as NodeJS.ErrnoException).code
                    : '';
            const isSmtpUnreachable =
                code === 'ESOCKET' || code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED');
            if (isSmtpUnreachable && config.nodeEnv === 'development') {
                console.warn(
                    '[BacancyTeleCare] SMTP unreachable. Run Mailpit: docker compose up mailpit -d',
                );
                console.warn(`[BacancyTeleCare] Dev reset link for ${user.email}: ${resetLink}`);
                return { message: 'If an account exists, a reset link was sent.' };
            }
            throw err;
        }
    }
    return { message: 'If an account exists, a reset link was sent.' };
}

/**
 * Reset password with token. Throws if token invalid or expired.
 */
export async function resetPassword(
    token: string,
    newPassword: string,
): Promise<{ message: string }> {
    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: token,
            passwordResetExpires: { gt: new Date() },
        },
    });
    if (!user) {
        throw authError('Invalid or expired reset token', 400, 'BAD_REQUEST');
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
        },
    });
    return { message: 'Password reset successful.' };
}
