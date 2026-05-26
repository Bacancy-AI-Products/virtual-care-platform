import { Prisma, VitalStatus, VitalType, type VitalReading } from '../../../generated/prisma';
import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import type {
    CreateVitalReadingInput,
    ListMyVitalsQuery,
    TrendsQuery,
    VitalTypeLiteral,
} from './vitals.schemas';

// ─── Reference ranges & units ─────────────────────────────────────────────────
// Single source of truth for per-vital metadata used by both the API responses
// (so the client renders a consistent range bar) and the write-time status
// derivation below. Adding a new vital here is the only change needed.
//
// `valid` is the absolute physiological min/max — anything outside is rejected
// or flagged CRITICAL even without thresholds.
// `normal` is the "healthy" range for a generic adult; per-patient overrides
// can be layered on later without touching this table.

export interface VitalReferenceRange {
    type: VitalTypeLiteral;
    label: string;
    unit: string;
    normalMin: number;
    normalMax: number;
    validMin: number;
    validMax: number;
    // Decimal precision shown / accepted in the UI (e.g. temperature is xx.x).
    decimals: 0 | 1 | 2;
}

export const VITAL_REFERENCE: Record<VitalTypeLiteral, VitalReferenceRange> = {
    BP_SYSTOLIC: {
        type: 'BP_SYSTOLIC',
        label: 'BP Systolic',
        unit: 'mmHg',
        normalMin: 90,
        normalMax: 139,
        validMin: 60,
        validMax: 250,
        decimals: 0,
    },
    BP_DIASTOLIC: {
        type: 'BP_DIASTOLIC',
        label: 'BP Diastolic',
        unit: 'mmHg',
        normalMin: 60,
        normalMax: 89,
        validMin: 30,
        validMax: 150,
        decimals: 0,
    },
    HEART_RATE: {
        type: 'HEART_RATE',
        label: 'Heart Rate',
        unit: 'bpm',
        normalMin: 60,
        normalMax: 100,
        validMin: 30,
        validMax: 220,
        decimals: 0,
    },
    BLOOD_SUGAR: {
        type: 'BLOOD_SUGAR',
        label: 'Blood Sugar',
        unit: 'mg/dL',
        normalMin: 70,
        normalMax: 140,
        validMin: 20,
        validMax: 600,
        decimals: 0,
    },
    SPO2: {
        type: 'SPO2',
        label: 'SpO₂',
        unit: '%',
        normalMin: 95,
        normalMax: 100,
        validMin: 50,
        validMax: 100,
        decimals: 0,
    },
    TEMPERATURE: {
        type: 'TEMPERATURE',
        label: 'Temperature',
        unit: '°F',
        normalMin: 97.0,
        normalMax: 99.5,
        validMin: 90.0,
        validMax: 110.0,
        decimals: 1,
    },
    WEIGHT: {
        type: 'WEIGHT',
        label: 'Weight',
        unit: 'kg',
        normalMin: 0,
        normalMax: 999,
        validMin: 1,
        validMax: 500,
        decimals: 1,
    },
};

/**
 * Derive the warning/critical status from a value vs. the reference range for
 * its vital type. "Warning" = inside the valid range but outside normal.
 * "Critical" = outside the valid range entirely.
 */
export function deriveStatus(type: VitalTypeLiteral, value: number): VitalStatus {
    const ref = VITAL_REFERENCE[type];
    if (value < ref.validMin || value > ref.validMax) return VitalStatus.CRITICAL;
    if (value < ref.normalMin || value > ref.normalMax) return VitalStatus.WARNING;
    return VitalStatus.NORMAL;
}

// ─── Role-id helpers ──────────────────────────────────────────────────────────

async function getPatientIdForUser(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { patient: { select: { id: true } } },
    });
    return user?.patient?.id ?? null;
}

async function getDoctorIdForUser(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { doctorProfile: { select: { id: true } } },
    });
    return user?.doctorProfile?.id ?? null;
}

/**
 * A doctor may view a patient's vitals only when they have at least one
 * appointment together. Mirrors `getPatientForDoctor` access control in the
 * patients module so the rule stays in one shape.
 */
async function assertDoctorCanAccessPatient(doctorUserId: string, patientId: string) {
    const doctorId = await getDoctorIdForUser(doctorUserId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }
    const link = await prisma.appointment.findFirst({
        where: { doctorId, patientId },
        select: { id: true },
    });
    if (!link) {
        throw new AppError('You do not have access to this patient', 403, 'FORBIDDEN');
    }
}

// ─── Public service surface ───────────────────────────────────────────────────

export async function createReading(userId: string, role: string, input: CreateVitalReadingInput) {
    if (role !== 'PATIENT') {
        throw new AppError('Only patients can log their own vitals', 403, 'FORBIDDEN');
    }
    const patientId = await getPatientIdForUser(userId);
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }

    const ref = VITAL_REFERENCE[input.type];
    if (input.value < ref.validMin / 2 || input.value > ref.validMax * 2) {
        // Hard outer bound — reject implausible readings outright (e.g. HR of 9000).
        throw new AppError(
            `Value out of accepted range for ${ref.label}`,
            422,
            'VALUE_OUT_OF_RANGE',
        );
    }

    const status = deriveStatus(input.type, input.value);
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();

    const reading = await prisma.vitalReading.create({
        data: {
            patientId,
            type: input.type as VitalType,
            value: new Prisma.Decimal(input.value),
            unit: ref.unit,
            recordedAt,
            entryMethod: input.entryMethod ?? 'MANUAL',
            status,
            notes: input.notes ?? null,
        },
    });

    return serializeReading(reading);
}

export async function listForMe(userId: string, role: string, query: ListMyVitalsQuery) {
    if (role !== 'PATIENT') {
        throw new AppError('Only patients have their own vitals list', 403, 'FORBIDDEN');
    }
    const patientId = await getPatientIdForUser(userId);
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }
    return listForPatient(patientId, query);
}

export async function listForPatientByDoctor(
    doctorUserId: string,
    patientId: string,
    query: ListMyVitalsQuery,
) {
    await assertDoctorCanAccessPatient(doctorUserId, patientId);
    return listForPatient(patientId, query);
}

async function listForPatient(patientId: string, query: ListMyVitalsQuery) {
    const where: Prisma.VitalReadingWhereInput = { patientId };
    if (query.type) where.type = query.type as VitalType;
    if (query.from || query.to) {
        where.recordedAt = {};
        if (query.from) where.recordedAt.gte = new Date(query.from);
        if (query.to) where.recordedAt.lte = new Date(query.to);
    }

    const [total, rows] = await Promise.all([
        prisma.vitalReading.count({ where }),
        prisma.vitalReading.findMany({
            where,
            orderBy: { recordedAt: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(serializeReading),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
        },
    };
}

export async function deleteReading(userId: string, role: string, readingId: string) {
    if (role !== 'PATIENT') {
        throw new AppError('Only patients can delete their own vitals', 403, 'FORBIDDEN');
    }
    const patientId = await getPatientIdForUser(userId);
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }
    const reading = await prisma.vitalReading.findUnique({
        where: { id: readingId },
        select: { id: true, patientId: true },
    });
    if (!reading || reading.patientId !== patientId) {
        throw new AppError('Vital reading not found', 404, 'NOT_FOUND');
    }
    await prisma.vitalReading.delete({ where: { id: readingId } });
    return { id: readingId };
}

/**
 * Trend data for the doctor view. Returns the per-vital latest reading plus a
 * compact per-type series for charting. `days` is the look-back window.
 */
export async function getTrendsForPatientByDoctor(
    doctorUserId: string,
    patientId: string,
    query: TrendsQuery,
) {
    await assertDoctorCanAccessPatient(doctorUserId, patientId);
    return buildTrends(patientId, query.days);
}

export async function getMyTrends(userId: string, role: string, query: TrendsQuery) {
    if (role !== 'PATIENT') {
        throw new AppError('Only patients have their own trends', 403, 'FORBIDDEN');
    }
    const patientId = await getPatientIdForUser(userId);
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }
    return buildTrends(patientId, query.days);
}

async function buildTrends(patientId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await prisma.vitalReading.findMany({
        where: { patientId, recordedAt: { gte: since } },
        orderBy: { recordedAt: 'asc' },
        select: {
            id: true,
            type: true,
            value: true,
            unit: true,
            recordedAt: true,
            status: true,
        },
    });

    // Group by type with latest + series points.
    const byType = new Map<
        VitalTypeLiteral,
        Array<{ id: string; recordedAt: string; value: number; status: VitalStatus }>
    >();
    for (const r of readings) {
        const key = r.type as VitalTypeLiteral;
        const arr = byType.get(key) ?? [];
        arr.push({
            id: r.id,
            recordedAt: r.recordedAt.toISOString(),
            value: Number(r.value),
            status: r.status,
        });
        byType.set(key, arr);
    }

    const series: Array<{
        type: VitalTypeLiteral;
        label: string;
        unit: string;
        reference: VitalReferenceRange;
        points: Array<{ id: string; recordedAt: string; value: number; status: VitalStatus }>;
        latest: { value: number; recordedAt: string; status: VitalStatus } | null;
    }> = [];

    for (const type of Object.keys(VITAL_REFERENCE) as VitalTypeLiteral[]) {
        const points = byType.get(type) ?? [];
        const last = points[points.length - 1] ?? null;
        series.push({
            type,
            label: VITAL_REFERENCE[type].label,
            unit: VITAL_REFERENCE[type].unit,
            reference: VITAL_REFERENCE[type],
            points,
            latest: last
                ? { value: last.value, recordedAt: last.recordedAt, status: last.status }
                : null,
        });
    }

    return { days, generatedAt: new Date().toISOString(), series };
}

/**
 * Returns the reference table for the client so the form's range bar and
 * status badge match the server's truth.
 */
export function getReferenceTable() {
    return Object.values(VITAL_REFERENCE);
}

/**
 * Per-patient vitals status summary for the doctor's patient list. Returns one
 * row per patient the doctor has *at least one* appointment with, including
 * counts of WARNING / CRITICAL readings in the last `days` window and the most
 * recent reading timestamp. Empty values mean the patient hasn't logged any
 * vitals in that window — the UI can decide to render "no recent vitals" or
 * stay quiet.
 */
export async function getRecentStatusForDoctorPanel(doctorUserId: string, days: number) {
    const doctorId = await getDoctorIdForUser(doctorUserId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Distinct patientIds the doctor has appointments with.
    const linked = await prisma.appointment.findMany({
        where: { doctorId },
        distinct: ['patientId'],
        select: { patientId: true },
    });
    const patientIds = linked.map((l) => l.patientId);
    if (patientIds.length === 0) {
        return { days, data: [] as Array<RecentStatusRow> };
    }

    // One aggregation pass per patient: counts in window + latest reading anywhere.
    const recent = await prisma.vitalReading.groupBy({
        by: ['patientId', 'status'],
        where: { patientId: { in: patientIds }, recordedAt: { gte: since } },
        _count: { _all: true },
    });

    const latest = await prisma.vitalReading.findMany({
        where: { patientId: { in: patientIds } },
        orderBy: { recordedAt: 'desc' },
        distinct: ['patientId'],
        select: { patientId: true, recordedAt: true, status: true, type: true, value: true },
    });
    const latestByPatient = new Map<string, (typeof latest)[number]>();
    for (const row of latest) latestByPatient.set(row.patientId, row);

    const counts = new Map<string, { critical: number; warning: number; normal: number }>();
    for (const r of recent) {
        const bucket = counts.get(r.patientId) ?? { critical: 0, warning: 0, normal: 0 };
        const n = r._count._all;
        if (r.status === 'CRITICAL') bucket.critical = n;
        else if (r.status === 'WARNING') bucket.warning = n;
        else bucket.normal = n;
        counts.set(r.patientId, bucket);
    }

    const data: RecentStatusRow[] = patientIds.map((pid) => {
        const c = counts.get(pid) ?? { critical: 0, warning: 0, normal: 0 };
        const last = latestByPatient.get(pid) ?? null;
        return {
            patientId: pid,
            criticalCount: c.critical,
            warningCount: c.warning,
            normalCount: c.normal,
            latest: last
                ? {
                      type: last.type as VitalTypeLiteral,
                      value: Number(last.value),
                      status: last.status,
                      recordedAt: last.recordedAt.toISOString(),
                  }
                : null,
        };
    });

    return { days, data };
}

export interface RecentStatusRow {
    patientId: string;
    criticalCount: number;
    warningCount: number;
    normalCount: number;
    latest: {
        type: VitalTypeLiteral;
        value: number;
        status: VitalStatus;
        recordedAt: string;
    } | null;
}

// ─── Serialization ────────────────────────────────────────────────────────────

function serializeReading(r: VitalReading) {
    return {
        id: r.id,
        patientId: r.patientId,
        type: r.type,
        value: Number(r.value),
        unit: r.unit,
        recordedAt: r.recordedAt.toISOString(),
        entryMethod: r.entryMethod,
        status: r.status,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
    };
}
