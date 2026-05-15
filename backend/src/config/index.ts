import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from project root .env if present; otherwise fall back to default lookup.
// At runtime this file lives in dist/config, so go up three levels to reach the repo root.
const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
} else {
    dotenv.config();
}

function getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key] ?? defaultValue;
    if (!value) {
        throw new Error(`Missing required env: ${key}`);
    }
    return value;
}

function getDatabaseUrl(): string {
    const direct = process.env.DATABASE_URL;
    if (direct) return direct;
    const host = process.env.DB_HOST ?? 'localhost';
    const port = process.env.DB_PORT ?? '5432';
    const user = getEnv('DB_USER');
    const password = getEnv('DB_PASSWORD');
    const name = getEnv('DB_NAME');
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
}

/** Default ports: backend 4001, frontend 3000. Set PORT / FRONTEND_PORT / APP_BASE_URL to override. */
const appBaseUrl =
    getOptionalEnv('APP_BASE_URL') ?? `http://localhost:${getOptionalEnv('FRONTEND_PORT', '3000')}`;

export const config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4001', 10),
    appBaseUrl,
    jwtSecret:
        process.env.JWT_SECRET ??
        (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-in-production'),
    databaseUrl: getDatabaseUrl(),
    /** Email (Nodemailer). Optional in dev; required when sending transactional emails. */
    email: {
        smtpHost: getOptionalEnv('SMTP_HOST', 'localhost'),
        smtpPort: parseInt(getOptionalEnv('SMTP_PORT', '1025') ?? '1025', 10),
        smtpUser: getOptionalEnv('SMTP_USER'),
        smtpPass: getOptionalEnv('SMTP_PASS'),
        mailFrom: getOptionalEnv('MAIL_FROM', 'BacancyTeleCare <noreply@localhost>'),
    },
    dailyApiKey: process.env.DAILY_API_KEY ?? '',
    dailyDomain: process.env.DAILY_DOMAIN ?? '',
    frontendUrl: process.env.FRONTEND_URL ?? appBaseUrl,
    /**
     * HIPAA §164.312(b) — Audit log HMAC chain key.
     * 32+ byte base64 string. If absent, hashes are skipped (logs still written).
     * Required in production for tamper-evidence.
     */
    logHmacKey: getOptionalEnv('LOG_HMAC_KEY'),
    /** Redis connection string for Socket.io adapter. Optional in dev. Required for multi-instance prod. */
    redisUrl: getOptionalEnv('REDIS_URL'),
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },
} as const;

if (config.nodeEnv === 'production' && !config.jwtSecret) {
    throw new Error('JWT_SECRET is required in production');
}
