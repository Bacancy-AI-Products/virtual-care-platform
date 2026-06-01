/**
 * Cron job: purge stale rawLlmResponse fields from SymptomCheck rows.
 *
 * Why: rawLlmResponse is a HIPAA-risk field — it can contain verbatim PHI
 * from the patient's symptoms submission, plus the LLM's full reasoning chain.
 * Retaining it longer than necessary violates the HIPAA minimum-necessary rule
 * (§164.514(b)). Each row gets a `rawResponsePurgeAt` timestamp set at creation
 * (default: +30 days via RAW_LLM_RESPONSE_TTL_DAYS). This job nulls out the
 * field once that timestamp passes.
 *
 * Audit: one SYMPTOM_CHECK_RAW_PURGED entry is written per run, recording the
 * count of rows purged. The row IDs are included in metadata for traceability.
 */

import { prisma } from '../db';
import { logAccess, AuditAction } from '../modules/audit/audit.service';

/** Max rows to process in a single run to limit memory and DB load. */
const BATCH_SIZE = 500;

/**
 * Null out rawLlmResponse on all SymptomCheck rows where rawResponsePurgeAt
 * has passed. Returns the number of rows purged.
 */
export async function runRawLlmResponsePurge(): Promise<number> {
    const now = new Date();

    // Find up to BATCH_SIZE rows that are due for purge and still have data.
    const due = await prisma.symptomCheck.findMany({
        where: {
            rawLlmResponse: { not: null },
            rawResponsePurgeAt: { lte: now },
        },
        select: { id: true },
        take: BATCH_SIZE,
        orderBy: { rawResponsePurgeAt: 'asc' }, // oldest-due first
    });

    if (due.length === 0) return 0;

    const ids = due.map((r) => r.id);

    // Null out the raw response field. Leave rawResponsePurgeAt in place so the
    // row shows it was eligible — useful if you later need to audit what ran when.
    await prisma.symptomCheck.updateMany({
        where: { id: { in: ids } },
        data: { rawLlmResponse: null },
    });

    // Write one audit entry for the whole batch. Storing all IDs keeps it
    // traceable without creating N rows for N purges.
    void logAccess({
        actorRole: 'SYSTEM',
        action: AuditAction.SYMPTOM_CHECK_RAW_PURGED,
        resourceType: 'SymptomCheck',
        success: true,
        metadata: {
            purgedCount: ids.length,
            purgedIds: ids,
            ranAt: now.toISOString(),
        },
    });

    console.log(`[purge-cron] Purged rawLlmResponse from ${ids.length} SymptomCheck row(s).`);
    return ids.length;
}
