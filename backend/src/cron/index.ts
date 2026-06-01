/**
 * Background cron jobs — started once at server boot.
 *
 * Jobs:
 *   - rawLlmResponsePurge: nulls out rawLlmResponse on SymptomCheck rows
 *     whose rawResponsePurgeAt has passed. Runs every 24 hours and once
 *     immediately at startup to catch anything that came due while the
 *     server was down.
 */

import { runRawLlmResponsePurge } from './purgeRawLlmResponse';

/** 24 hours in milliseconds */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Start all background cron jobs. Call once during server initialisation.
 * Returns a cleanup function that cancels all intervals — used in tests and
 * clean shutdowns.
 */
export function startCronJobs(): () => void {
    const intervals: ReturnType<typeof setInterval>[] = [];

    // ── rawLlmResponse purge ─────────────────────────────────────────────────
    // Fire once immediately (catches anything past-due from before the server
    // last restarted), then every 24 h.
    void runRawLlmResponsePurge().catch((err) => {
        console.error('[purge-cron] Initial run failed:', err);
    });

    const purgeInterval = setInterval(() => {
        void runRawLlmResponsePurge().catch((err) => {
            console.error('[purge-cron] Scheduled run failed:', err);
        });
    }, ONE_DAY_MS);

    // Node keeps the process alive as long as a setInterval is active.
    // Mark it as unref'd so it does NOT prevent a clean shutdown.
    purgeInterval.unref();
    intervals.push(purgeInterval);

    console.log('[cron] Background jobs started.');

    return () => {
        intervals.forEach(clearInterval);
        console.log('[cron] Background jobs stopped.');
    };
}
