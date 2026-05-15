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
import { encryptField, isEncryptedField } from '../src/utils/crypto';
import { config } from '../src/config';

const prisma = new PrismaClient();
const BATCH = 100; // rows per batch

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enc(value: string | null | undefined): string | null {
    if (!value) return value ?? null;
    if (isEncryptedField(value)) return value; // already encrypted
    return encryptField(value);
}

function encJson(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string' && isEncryptedField(value)) return value;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return encryptField(str);
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
            select: {
                id: true,
                address: true,
                phone: true,
                emergencyContactPhone: true,
                dateOfBirth: true,
                bloodGroup: true,
            },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            const needsUpdate =
                (row.address && !isEncryptedField(row.address)) ||
                (row.phone && !isEncryptedField(row.phone)) ||
                (row.emergencyContactPhone && !isEncryptedField(row.emergencyContactPhone)) ||
                (row.dateOfBirth && !isEncryptedField(row.dateOfBirth)) ||
                (row.bloodGroup && !isEncryptedField(row.bloodGroup));

            if (needsUpdate) {
                await prisma.patient.update({
                    where: { id: row.id },
                    data: {
                        address: enc(row.address),
                        phone: enc(row.phone),
                        emergencyContactPhone: enc(row.emergencyContactPhone),
                        dateOfBirth: enc(row.dateOfBirth),
                        bloodGroup: enc(row.bloodGroup),
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
            select: { id: true, body: true, metadata: true },
        });
        if (rows.length === 0) break;

        for (const row of rows) {
            const bodyNeedsEnc = row.body && !isEncryptedField(row.body);
            const metaNeedsEnc =
                row.metadata != null &&
                !(typeof row.metadata === 'string' && isEncryptedField(row.metadata));

            if (bodyNeedsEnc || metaNeedsEnc) {
                await (prisma as any).notification.update({
                    where: { id: row.id },
                    data: {
                        ...(bodyNeedsEnc ? { body: encryptField(row.body) } : {}),
                        ...(metaNeedsEnc ? { metadata: encJson(row.metadata) } : {}),
                    },
                });
                count++;
            }
        }
        skip += rows.length;
    }
    console.log(`[notifications] Done — encrypted ${count} rows.`);
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

    console.log('\n✅ Backfill complete.');
}

main()
    .catch((e) => {
        console.error('Backfill failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
