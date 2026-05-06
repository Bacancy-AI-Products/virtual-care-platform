import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const SALT_ROUNDS = 10;

/** Hash a plain-text password for storage. */
export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Verify a plain-text password against a stored hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}

/** Payload embedded in the JWT, available as req.user. */
export interface JwtPayload {
    sub: string; // userId
    role: string; // PATIENT | DOCTOR | ADMIN
}

/** Sign a JWT for an authenticated user. */
export function signToken(payload: JwtPayload): string {
    const secret = config.jwtSecret;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return jwt.sign(payload, secret, { expiresIn: '12h' });
}

/** Decode and verify a JWT; throws if invalid. */
export function verifyToken(token: string): JwtPayload {
    const secret = config.jwtSecret;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    const decoded = jwt.verify(token, secret) as unknown;
    return decoded as JwtPayload;
}
