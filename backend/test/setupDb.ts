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
import { prisma } from '../src/db';
import { disconnectDb, resetDb } from './resetDb';

beforeEach(async () => {
    // Reconnect in case a prior test file's afterAll disconnected the engine
    // before the audit-log fire-and-forget writes had settled.
    await prisma.$connect();
    await resetDb();
});

afterAll(async () => {
    await disconnectDb();
});
