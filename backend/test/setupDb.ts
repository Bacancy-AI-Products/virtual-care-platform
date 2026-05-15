/**
 * Integration test setup. Import this at the top of any test file that touches the DB:
 *
 *     import '../../../test/setupDb';
 *
 * It registers `beforeEach` / `afterAll` hooks that:
 *   - Wipe all tables before every test (clean slate)
 *   - Disconnect Prisma after the suite (let Vitest exit cleanly)
 *
 * No `beforeAll` migration step — we expect `prisma migrate deploy` to have run
 * against the test DB once before the suite starts (see `package.json` test scripts).
 */
import { afterAll, beforeEach } from 'vitest';
import { _drainPendingAuditWrites } from '../src/modules/audit/audit.service';
import { disconnectDb, resetDb } from './resetDb';

beforeEach(async () => {
    await resetDb();
});

afterAll(async () => {
    // Drain fire-and-forget audit writes so they don't race with $disconnect
    // and leave the engine in a state the next test file can't reconnect to.
    await _drainPendingAuditWrites();
    await disconnectDb();
});
