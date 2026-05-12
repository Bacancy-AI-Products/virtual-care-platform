import { prisma } from '../src/db';

/**
 * Wipe all application tables between tests.
 *
 * Strategy: a single `TRUNCATE ... RESTART IDENTITY CASCADE` is faster than
 * deleting per-table and respects FK ordering automatically. We exclude Prisma's
 * own `_prisma_migrations` table so the schema state survives.
 *
 * Call this in `beforeEach` of any test that touches the database.
 */
export async function resetDb(): Promise<void> {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT LIKE '_prisma_%'
    `;

    if (tables.length === 0) return;

    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Disconnect Prisma at the end of a test suite. Vitest will hang otherwise
 * because Prisma keeps the pool open.
 */
export async function disconnectDb(): Promise<void> {
    await prisma.$disconnect();
}
