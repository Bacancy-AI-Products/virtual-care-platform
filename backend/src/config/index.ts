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
    /**
     * HIPAA §164.312(a)(2)(iv) — Field-level AES-256-GCM master key.
     * Must be exactly 32 bytes, encoded as base64 (44 chars).
     * Generate: `openssl rand -base64 32`
     * Required in production; optional in dev (encryption is skipped when absent).
     */
    masterKey: getOptionalEnv('MASTER_KEY'),
    /**
     * Identifier for the current master key. Used inside encrypted payloads to
     * support key rotation without re-encrypting all rows at once.
     * Defaults to "v1". Increment (e.g. "v2") when rotating the master key.
     */
    keyId: getOptionalEnv('KEY_ID', 'v1'),
    /** Redis connection string for Socket.io adapter. Optional in dev. Required for multi-instance prod. */
    redisUrl: getOptionalEnv('REDIS_URL'),
    /**
     * AI symptom checker — feature settings. See docs/symptom-checker-plan.md.
     * `enabled` is a kill switch — defaults to true in dev, false in production
     * until the LLM-provider BAA is signed. The deterministic Phase 1 layer is
     * safe to ship, but the feature is gated as a single unit.
     */
    symptomChecker: {
        enabled:
            (getOptionalEnv('SYMPTOM_CHECKER_ENABLED') ?? '').toLowerCase() === 'true' ||
            (getOptionalEnv('SYMPTOM_CHECKER_ENABLED') === undefined &&
                process.env.NODE_ENV !== 'production'),
        /** Days before rawLlmResponse is purged by the cron (set up in a later phase). */
        rawResponseTtlDays: parseInt(getOptionalEnv('RAW_LLM_RESPONSE_TTL_DAYS', '30') ?? '30', 10),
        /**
         * LLM provider for the triage call. When the API key is absent the
         * service falls back to Phase 1 deterministic behaviour — safe but
         * dumb (everything non-emergency routes to GP).
         */
        llm: {
            anthropicApiKey: getOptionalEnv('ANTHROPIC_API_KEY'),
            model: getOptionalEnv('LLM_MODEL', 'claude-sonnet-4-5') ?? 'claude-sonnet-4-5',
            timeoutMs: parseInt(getOptionalEnv('LLM_TIMEOUT_MS', '8000') ?? '8000', 10),
            maxRetries: parseInt(getOptionalEnv('LLM_MAX_RETRIES', '2') ?? '2', 10),
            maxOutputTokens: parseInt(
                getOptionalEnv('LLM_MAX_OUTPUT_TOKENS', '1024') ?? '1024',
                10,
            ),
        },
    },
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },
} as const;

if (config.nodeEnv === 'production' && !config.jwtSecret) {
    throw new Error('JWT_SECRET is required in production');
}

if (config.nodeEnv === 'production' && !config.logHmacKey) {
    throw new Error('LOG_HMAC_KEY is required in production for audit-log tamper-evidence');
}

if (config.nodeEnv === 'production' && !config.masterKey) {
    throw new Error('MASTER_KEY is required in production for PHI field encryption');
}

// HIPAA §164.312(e)(1) — encryption in transit.
// TODO: Change console.error → throw once HTTPS is configured on the production domain.
//       Running over HTTP in production is a §164.312(e)(1) violation — this must be
//       resolved before the app is used with real patient data.
if (config.nodeEnv === 'production' && config.frontendUrl.startsWith('http://')) {
    console.error(
        '[HIPAA] WARNING: FRONTEND_URL is HTTP in production. ' +
            'PHI is being transmitted without TLS encryption — this violates §164.312(e)(1). ' +
            'Configure HTTPS and change this warning to a throw before handling real patient data.',
    );
}

// Validate key length when provided: must be exactly 32 bytes (base64 → 44 chars)
if (config.masterKey) {
    const keyBytes = Buffer.from(config.masterKey, 'base64');
    if (keyBytes.length !== 32) {
        throw new Error(`MASTER_KEY must be exactly 32 bytes (base64), got ${keyBytes.length}`);
    }
}
