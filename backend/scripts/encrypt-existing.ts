/**
 * HIPAA Phase 1.2 — Field-level encryption backfill
 *
 * Encrypts all existing plaintext PHI fields in the database.
 * Safe to run multiple times — already-encrypted values are skipped.
 *
 * Run:
 *   cd backend
 *   MASTER_KEY=<your-key> KEY_ID=v1 npx ts-node scripts/encrypt-existing.ts
 *
 * Or, if the key is already in .env:
 *   npx ts-node scripts/encrypt-existing.ts
 *
 * Progress is printed per batch. If interrupted, re-run — it resumes safely.
 */

import '../src/config'; // loads dotenv + validates MASTER_KEY length
import { PrismaClient } from '../generated/prisma';
import { encryptField, isEncryptedField, encryptBuffer, checksumBuffer } from '../src/utils/crypto';
import { config } from '../src/config';

const prisma = new PrismaClient();
const BATCH = 100; // rows per batch

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enc(value: string | null | undefined): string | null {
    if (!value) return value ?? null;
    if (isEncryptedField(value)) return value; // already encrypted
    return encryptField(value);
}

/**
 * Encode a value for the `Notification.metadata` jsonb column.
 * Result is always `{ enc: "<ciphertext envelope>" }` (matches notifications.service).
 * Returns null when input is null; returns the value as-is if it already has that shape.
 */
function encJson(value: unknown): { enc: string } | null {
    if (value == null) return null;
    if (
        typeof value === 'object' &&
        value !== null &&
        'enc' in value &&
        typeof (value as { enc: unknown }).enc === 'string' &&
        isEncryptedField((value as { enc: string }).enc)
    ) {
        return value as { enc: string };
    }
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return { enc: encryptField(str) };
}

// ─── Per-model backfill functions ─────────────────────────────────────────────

async function backfillPatients() {
    let skip = 0;
    let count = 0;
    console.log('\n[patients] Starting…');
    for (;;) {
        const rows = await prisma.patient.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: {
                id: true,
                address: true,
                phone: true,
                emergencyContactPhone: true,
                emergencyContactName: true,
                dateOfBirth: true,
                bloodGroup: true,
                city: true,
                state: true,
            },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            const needsUpdate =
                (row.address && !isEncryptedField(row.address)) ||
                (row.phone && !isEncryptedField(row.phone)) ||
                (row.emergencyContactPhone && !isEncryptedField(row.emergencyContactPhone)) ||
                (row.emergencyContactName && !isEncryptedField(row.emergencyContactName)) ||
                (row.dateOfBirth && !isEncryptedField(row.dateOfBirth)) ||
                (row.bloodGroup && !isEncryptedField(row.bloodGroup)) ||
                (row.city && !isEncryptedField(row.city)) ||
                (row.state && !isEncryptedField(row.state));

            if (needsUpdate) {
                await prisma.patient.update({
                    where: { id: row.id },
                    data: {
                        address: enc(row.address),
                        phone: enc(row.phone),
                        emergencyContactPhone: enc(row.emergencyContactPhone),
                        emergencyContactName: enc(row.emergencyContactName),
                        dateOfBirth: enc(row.dateOfBirth),
                        bloodGroup: enc(row.bloodGroup),
                        city: enc(row.city),
                        state: enc(row.state),
                    },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[patients] Done — encrypted ${count} rows.`);
}

async function backfillAppointments() {
    let skip = 0;
    let count = 0;
    console.log('\n[appointments] Starting…');
    for (;;) {
        const rows = await prisma.appointment.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: { id: true, reason: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            if (row.reason && !isEncryptedField(row.reason)) {
                await prisma.appointment.update({
                    where: { id: row.id },
                    data: { reason: encryptField(row.reason) },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[appointments] Done — encrypted ${count} rows.`);
}

async function backfillPrescriptions() {
    let skip = 0;
    let count = 0;
    console.log('\n[prescriptions] Starting…');
    for (;;) {
        const rows = await prisma.prescription.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: { id: true, notes: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            if (row.notes && !isEncryptedField(row.notes)) {
                await prisma.prescription.update({
                    where: { id: row.id },
                    data: { notes: encryptField(row.notes) },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[prescriptions] Done — encrypted ${count} rows.`);
}

async function backfillPrescriptionItems() {
    let skip = 0;
    let count = 0;
    console.log('\n[prescription_items] Starting…');
    for (;;) {
        const rows = await prisma.prescriptionItem.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: {
                id: true,
                drugName: true,
                dosage: true,
                frequency: true,
                duration: true,
                instructions: true,
            },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            const needsUpdate =
                !isEncryptedField(row.drugName) ||
                (row.dosage && !isEncryptedField(row.dosage)) ||
                (row.frequency && !isEncryptedField(row.frequency)) ||
                (row.duration && !isEncryptedField(row.duration)) ||
                (row.instructions && !isEncryptedField(row.instructions));

            if (needsUpdate) {
                await prisma.prescriptionItem.update({
                    where: { id: row.id },
                    data: {
                        drugName: encryptField(row.drugName),
                        dosage: enc(row.dosage),
                        frequency: enc(row.frequency),
                        duration: enc(row.duration),
                        instructions: enc(row.instructions),
                    },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[prescription_items] Done — encrypted ${count} rows.`);
}

async function backfillMessages() {
    let skip = 0;
    let count = 0;
    console.log('\n[messages] Starting…');
    for (;;) {
        const rows = await prisma.message.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: { id: true, content: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            if (row.content && !isEncryptedField(row.content)) {
                await prisma.message.update({
                    where: { id: row.id },
                    data: { content: encryptField(row.content) },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[messages] Done — encrypted ${count} rows.`);
}

async function backfillNotifications() {
    let skip = 0;
    let count = 0;
    console.log('\n[notifications] Starting…');
    for (;;) {
        const rows = await (prisma as any).notification.findMany({
            take: BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: { id: true, body: true, metadata: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            const bodyNeedsEnc = row.body && !isEncryptedField(row.body);
            const meta = row.metadata as unknown;
            const metaAlreadyEnveloped =
                meta != null &&
                typeof meta === 'object' &&
                'enc' in (meta as Record<string, unknown>) &&
                typeof (meta as { enc: unknown }).enc === 'string' &&
                isEncryptedField((meta as { enc: string }).enc);
            const metaNeedsEnc = meta != null && !metaAlreadyEnveloped;

            if (bodyNeedsEnc || metaNeedsEnc) {
                await (prisma as any).notification.update({
                    where: { id: row.id },
                    data: {
                        ...(bodyNeedsEnc ? { body: encryptField(row.body) } : {}),
                        ...(metaNeedsEnc ? { metadata: encJson(meta) } : {}),
                    },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[notifications] Done — encrypted ${count} rows.`);
}

async function backfillFiles() {
    let skip = 0;
    let count = 0;
    // Files can be up to 10MB each — use a small batch to avoid loading 1GB into memory at once
    const FILE_BATCH = 5;
    console.log('\n[files] Starting…');
    for (;;) {
        const rows = await prisma.file.findMany({
            take: FILE_BATCH,
            skip,
            orderBy: { id: 'asc' },
            select: { id: true, data: true, keyId: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            // Skip rows with no blob data or already encrypted
            if (!row.data || row.keyId) continue;

            const plaintext = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data);
            const checksum = checksumBuffer(plaintext);
            const enc = encryptBuffer(plaintext);

            await prisma.file.update({
                where: { id: row.id },
                data: {
                    data: new Uint8Array(enc.ciphertext),
                    iv: enc.iv,
                    tag: enc.tag,
                    keyId: enc.keyId,
                    checksum,
                },
            });
            count++;
        }
        skip += rows.length;
    }
    console.log(`[files] Done — encrypted ${count} rows.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (!config.masterKey) {
        console.error('ERROR: MASTER_KEY is not set. Cannot encrypt existing records.');
        console.error('Set MASTER_KEY in your .env file and re-run.');
        process.exit(1);
    }

    console.log(`Starting PHI field encryption backfill (keyId="${config.keyId}")…`);
    console.log('Idempotent — already-encrypted rows are skipped.\n');

    await backfillPatients();
    await backfillAppointments();
    await backfillPrescriptions();
    await backfillPrescriptionItems();
    await backfillMessages();
    await backfillNotifications();
    await backfillFiles();

    console.log('\n✅ Backfill complete.');
}

main()
    .catch((e) => {
        console.error('Backfill failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
