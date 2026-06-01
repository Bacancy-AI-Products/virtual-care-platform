import crypto from 'node:crypto';
import { prisma } from '../../db';
import { config } from '../../config';

// ─── Action constants ─────────────────────────────────────────────────────────

export const AuditAction = {
    // Files
    FILE_LIST: 'FILE_LIST',
    FILE_UPLOAD: 'FILE_UPLOAD',
    FILE_DOWNLOAD: 'FILE_DOWNLOAD',
    FILE_DELETE: 'FILE_DELETE',
    FILE_LIST_APPOINTMENT: 'FILE_LIST_APPOINTMENT',
    FILE_INTEGRITY_MISMATCH: 'FILE_INTEGRITY_MISMATCH',
    // Prescriptions
    PRESCRIPTION_CREATE: 'PRESCRIPTION_CREATE',
    PRESCRIPTION_READ: 'PRESCRIPTION_READ',
    PRESCRIPTION_LIST: 'PRESCRIPTION_LIST',
    // Messages
    MESSAGE_LIST: 'MESSAGE_LIST',
    MESSAGE_CREATE: 'MESSAGE_CREATE',
    // Appointments
    APPOINTMENT_LIST: 'APPOINTMENT_LIST',
    APPOINTMENT_CREATE: 'APPOINTMENT_CREATE',
    APPOINTMENT_READ: 'APPOINTMENT_READ',
    APPOINTMENT_STATUS_UPDATE: 'APPOINTMENT_STATUS_UPDATE',
    APPOINTMENT_CANCEL: 'APPOINTMENT_CANCEL',
    // Patients
    PATIENT_PROFILE_READ: 'PATIENT_PROFILE_READ',
    PATIENT_PROFILE_UPDATE: 'PATIENT_PROFILE_UPDATE',
    // Video
    VIDEO_ROOM_CREATE: 'VIDEO_ROOM_CREATE',
    VIDEO_TOKEN_ISSUE: 'VIDEO_TOKEN_ISSUE',
    VIDEO_SESSION_START: 'VIDEO_SESSION_START',
    VIDEO_SESSION_END: 'VIDEO_SESSION_END',
    VIDEO_INFO_READ: 'VIDEO_INFO_READ',
    // Vitals
    VITAL_CREATE: 'VITAL_CREATE',
    VITAL_LIST: 'VITAL_LIST',
    VITAL_READ: 'VITAL_READ',
    VITAL_DELETE: 'VITAL_DELETE',
    VITAL_TRENDS: 'VITAL_TRENDS',
    // Reports
    REPORT_VITALS_SUMMARY: 'REPORT_VITALS_SUMMARY',
    REPORT_VITALS_SUMMARY_PDF: 'REPORT_VITALS_SUMMARY_PDF',
    REPORT_RPM_MINUTES: 'REPORT_RPM_MINUTES',
    REPORT_PRODUCTIVITY: 'REPORT_PRODUCTIVITY',
    // Auth
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    SIGNUP: 'SIGNUP',
    LOGOUT: 'LOGOUT',
    PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
    PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
    // Symptom checker (AI triage)
    SYMPTOM_CHECK_CREATED: 'SYMPTOM_CHECK_CREATED',
    SYMPTOM_CHECK_VIEWED: 'SYMPTOM_CHECK_VIEWED',
    SYMPTOM_CHECK_LIST: 'SYMPTOM_CHECK_LIST',
    SYMPTOM_CHECK_RED_FLAG_FIRED: 'SYMPTOM_CHECK_RED_FLAG_FIRED',
    SYMPTOM_CHECK_LLM_UNDER_TRIAGE: 'SYMPTOM_CHECK_LLM_UNDER_TRIAGE',
    SYMPTOM_CHECK_RAW_PURGED: 'SYMPTOM_CHECK_RAW_PURGED',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogAccessParams {
    userId?: string;
    actorRole?: string;
    action: AuditActionType | string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    httpMethod?: string;
    path?: string;
    statusCode?: number;
    success: boolean;
    metadata?: Record<string, unknown>;
}

// ─── HMAC helper ──────────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 of `data` using LOG_HMAC_KEY.
 * Returns empty string when the key is not configured (e.g. dev without the key set).
 */
function computeHmac(data: string): string {
    const key = config.logHmacKey;
    if (!key) return '';
    return crypto.createHmac('sha256', key).update(data).digest('hex');
}

// ─── Extended client — append-only guard ─────────────────────────────────────

/**
 * Prisma client extended to block mutations on AccessLog.
 * All writes to access_logs must go through this client.
 *
 * NOTE: this is a code-layer guard. For production, also revoke UPDATE/DELETE
 * on the access_logs table for the application DB user (Postgres REVOKE).
 */
const auditPrisma = prisma.$extends({
    query: {
        accessLog: {
            async update() {
                throw new Error('[audit] AccessLog is append-only: update is not permitted');
            },
            async updateMany() {
                throw new Error('[audit] AccessLog is append-only: updateMany is not permitted');
            },
            async delete() {
                throw new Error('[audit] AccessLog is append-only: delete is not permitted');
            },
            async deleteMany() {
                throw new Error('[audit] AccessLog is append-only: deleteMany is not permitted');
            },
        },
    },
});

// ─── Core logging function ────────────────────────────────────────────────────

// Tracks in-flight audit writes so tests can drain them before disconnecting
// Prisma. Callers still use `void logAccess(...)` — fire-and-forget semantics
// at the call site are unchanged.
const _pendingWrites = new Set<Promise<void>>();

/**
 * Wait for all in-flight audit writes to settle. For test teardown only —
 * production code should never block on this.
 */
export async function _drainPendingAuditWrites(): Promise<void> {
    while (_pendingWrites.size > 0) {
        await Promise.allSettled([..._pendingWrites]);
    }
}

/**
 * Write an immutable audit log entry.
 *
 * - Fire-and-forget safe: errors are swallowed so a logging failure never
 *   crashes or blocks an application request.
 * - HMAC chain: each row stores `prevHash` (the previous row's hash) and its
 *   own `hash`. Under concurrent writes the chain may branch — that is expected
 *   and detectable during verification. What matters is that no row can be
 *   silently edited after creation.
 */
export function logAccess(params: LogAccessParams): Promise<void> {
    const promise = _writeAccessLog(params);
    _pendingWrites.add(promise);
    promise.finally(() => _pendingWrites.delete(promise));
    return promise;
}

async function _writeAccessLog(params: LogAccessParams): Promise<void> {
    try {
        // Best-effort previous hash for tamper-evidence chain
        const lastLog = await prisma.accessLog.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { hash: true },
        });
        const prevHash = lastLog?.hash ?? 'genesis';

        // Hash covers all meaningful fields + prevHash to chain them
        const rowContent = JSON.stringify({
            userId: params.userId,
            action: params.action,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            ip: params.ip,
            success: params.success,
            prevHash,
        });
        const hash = computeHmac(rowContent);

        await auditPrisma.accessLog.create({
            data: {
                userId: params.userId,
                actorRole: params.actorRole,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                ip: params.ip,
                userAgent: params.userAgent,
                requestId: params.requestId,
                httpMethod: params.httpMethod,
                path: params.path,
                statusCode: params.statusCode,
                success: params.success,
                metadata: params.metadata ?? undefined,
                prevHash,
                hash: hash || undefined,
            },
        });
    } catch (err) {
        // Audit logging must never crash the application
        console.error('[audit] Failed to write access log:', err);
    }
}
