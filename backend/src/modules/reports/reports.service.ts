import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../db';
import { AppError } from '../../utils/errors';
import { VITAL_REFERENCE, deriveStatus } from '../vitals/vitals.service';
import type { VitalTypeLiteral } from '../vitals/vitals.schemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDoctorIdForUser(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { doctorProfile: { select: { id: true } } },
    });
    return user?.doctorProfile?.id ?? null;
}

async function getPatientIdForUser(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { patient: { select: { id: true } } },
    });
    return user?.patient?.id ?? null;
}

function monthRange(monthStr?: string): { from: Date; to: Date; label: string } {
    const now = new Date();
    const [yStr, mStr] = monthStr
        ? monthStr.split('-')
        : [String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0')];
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const label = from.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return { from, to, label };
}

// ─── Patient: Vitals summary ──────────────────────────────────────────────────

export interface PatientVitalsSummary {
    patient: {
        id: string;
        name: string;
        email: string;
        dateOfBirth: string | null;
    };
    window: { days: number; from: string; to: string };
    perVital: Array<{
        type: VitalTypeLiteral;
        label: string;
        unit: string;
        normalRange: string;
        count: number;
        min: number | null;
        max: number | null;
        avg: number | null;
        latest: { value: number; recordedAt: string; status: string } | null;
        criticalCount: number;
        warningCount: number;
    }>;
    totals: {
        readings: number;
        critical: number;
        warning: number;
        normal: number;
        normalPct: number;
    };
}

export async function buildVitalsSummaryForMe(
    userId: string,
    role: string,
    days: number,
): Promise<PatientVitalsSummary> {
    if (role !== 'PATIENT') {
        throw new AppError('Only patients can export their own vitals summary', 403, 'FORBIDDEN');
    }
    const patientId = await getPatientIdForUser(userId);
    if (!patientId) {
        throw new AppError('Patient profile not found', 404, 'NOT_FOUND');
    }
    return buildVitalsSummary(patientId, days);
}

async function buildVitalsSummary(patientId: string, days: number): Promise<PatientVitalsSummary> {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const [patient, readings] = await Promise.all([
        prisma.patient.findUnique({
            where: { id: patientId },
            select: {
                id: true,
                dateOfBirth: true,
                user: { select: { name: true, email: true } },
            },
        }),
        prisma.vitalReading.findMany({
            where: { patientId, recordedAt: { gte: from, lte: to } },
            orderBy: { recordedAt: 'asc' },
            select: {
                type: true,
                value: true,
                unit: true,
                recordedAt: true,
                status: true,
            },
        }),
    ]);
    if (!patient) {
        throw new AppError('Patient not found', 404, 'NOT_FOUND');
    }

    const perVital: PatientVitalsSummary['perVital'] = [];
    for (const type of Object.keys(VITAL_REFERENCE) as VitalTypeLiteral[]) {
        const ref = VITAL_REFERENCE[type];
        const ofType = readings.filter((r) => r.type === type);
        const values = ofType.map((r) => Number(r.value));
        const latest = ofType[ofType.length - 1] ?? null;
        const min = values.length > 0 ? Math.min(...values) : null;
        const max = values.length > 0 ? Math.max(...values) : null;
        const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null;
        perVital.push({
            type,
            label: ref.label,
            unit: ref.unit,
            normalRange: `${ref.normalMin}–${ref.normalMax} ${ref.unit}`,
            count: ofType.length,
            min,
            max,
            avg,
            latest: latest
                ? {
                      value: Number(latest.value),
                      recordedAt: latest.recordedAt.toISOString(),
                      status: latest.status,
                  }
                : null,
            criticalCount: ofType.filter((r) => r.status === 'CRITICAL').length,
            warningCount: ofType.filter((r) => r.status === 'WARNING').length,
        });
    }

    const totals = {
        readings: readings.length,
        critical: readings.filter((r) => r.status === 'CRITICAL').length,
        warning: readings.filter((r) => r.status === 'WARNING').length,
        normal: readings.filter((r) => r.status === 'NORMAL').length,
        normalPct:
            readings.length > 0
                ? Math.round(
                      (readings.filter((r) => r.status === 'NORMAL').length / readings.length) *
                          100,
                  )
                : 0,
    };

    // deriveStatus reference forces TS to keep the import; safety check kept here:
    void deriveStatus;

    return {
        patient: {
            id: patient.id,
            name: patient.user.name,
            email: patient.user.email,
            dateOfBirth: patient.dateOfBirth,
        },
        window: {
            days,
            from: from.toISOString(),
            to: to.toISOString(),
        },
        perVital,
        totals,
    };
}

// ─── Doctor: RPM minutes per patient (per calendar month) ─────────────────────

export interface RpmMinutesRow {
    patientId: string;
    patientName: string;
    totalMinutes: number;
    sessionsCount: number;
    // 99457 covers the first 20 min; 99458 each additional 20 min after that.
    cpt99457Eligible: boolean;
    cpt99458Units: number; // each 20-min block beyond the first 20
}

export interface RpmMinutesReport {
    month: string;
    label: string;
    doctorId: string;
    doctorName: string;
    rows: RpmMinutesRow[];
    totals: {
        patients: number;
        totalMinutes: number;
        eligible99457: number;
        units99458: number;
    };
}

export async function buildRpmMinutesReport(
    doctorUserId: string,
    role: string,
    query: { month?: string; patientId?: string },
): Promise<RpmMinutesReport> {
    if (role !== 'DOCTOR') {
        throw new AppError('Only doctors can view the RPM minutes report', 403, 'FORBIDDEN');
    }
    const doctorId = await getDoctorIdForUser(doctorUserId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const { from, to, label } = monthRange(query.month);

    const where: Prisma.AppointmentWhereInput = {
        doctorId,
        sessionStartedAt: { gte: from, lt: to, not: null },
        sessionEndedAt: { not: null },
    };
    if (query.patientId) {
        where.patientId = query.patientId;
    }

    const appointments = await prisma.appointment.findMany({
        where,
        select: {
            id: true,
            patientId: true,
            sessionStartedAt: true,
            sessionEndedAt: true,
            patient: { select: { user: { select: { name: true } } } },
        },
    });

    type Agg = { totalMinutes: number; sessions: number; name: string };
    const byPatient = new Map<string, Agg>();

    for (const a of appointments) {
        if (!a.sessionStartedAt || !a.sessionEndedAt) continue;
        const minutes = (a.sessionEndedAt.getTime() - a.sessionStartedAt.getTime()) / 60_000;
        if (minutes <= 0 || minutes > 12 * 60) continue; // sanity guard
        const agg = byPatient.get(a.patientId) ?? {
            totalMinutes: 0,
            sessions: 0,
            name: a.patient.user.name,
        };
        agg.totalMinutes += minutes;
        agg.sessions += 1;
        byPatient.set(a.patientId, agg);
    }

    const rows: RpmMinutesRow[] = Array.from(byPatient.entries())
        .map(([patientId, agg]) => {
            const rounded = Math.round(agg.totalMinutes);
            // 99457 once the first 20 minutes are met; 99458 every full 20-min block beyond.
            const cpt99457Eligible = rounded >= 20;
            const cpt99458Units = cpt99457Eligible ? Math.floor((rounded - 20) / 20) : 0;
            return {
                patientId,
                patientName: agg.name,
                totalMinutes: rounded,
                sessionsCount: agg.sessions,
                cpt99457Eligible,
                cpt99458Units,
            };
        })
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

    const doctor = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { user: { select: { name: true } } },
    });

    return {
        month: from.toISOString().slice(0, 7),
        label,
        doctorId,
        doctorName: doctor?.user.name ?? '',
        rows,
        totals: {
            patients: rows.length,
            totalMinutes: rows.reduce((s, r) => s + r.totalMinutes, 0),
            eligible99457: rows.filter((r) => r.cpt99457Eligible).length,
            units99458: rows.reduce((s, r) => s + r.cpt99458Units, 0),
        },
    };
}

// ─── Doctor: Productivity ─────────────────────────────────────────────────────

export interface ProductivityReport {
    window: { days: number; from: string; to: string };
    doctor: { id: string; name: string };
    appointments: {
        total: number;
        completed: number;
        cancelledByDoctor: number;
        cancelledByPatient: number;
        noShow: number;
    };
    avgConsultMinutes: number | null;
    avgResponseMinutes: number | null; // mean (scheduled → joined) for joined sessions
    completionRate: number; // completed / (completed + cancelled + no_show)
    declineRate: number; // cancelledByDoctor / total decisions
    perDay: Array<{ date: string; completed: number }>;
}

export async function buildProductivityReport(
    doctorUserId: string,
    role: string,
    days: number,
): Promise<ProductivityReport> {
    if (role !== 'DOCTOR') {
        throw new AppError('Only doctors can view productivity', 403, 'FORBIDDEN');
    }
    const doctorId = await getDoctorIdForUser(doctorUserId);
    if (!doctorId) {
        throw new AppError('Doctor profile not found', 404, 'NOT_FOUND');
    }

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const appts = await prisma.appointment.findMany({
        where: { doctorId, scheduledAt: { gte: from, lte: to } },
        select: {
            status: true,
            scheduledAt: true,
            sessionStartedAt: true,
            sessionEndedAt: true,
        },
    });

    const total = appts.length;
    const completed = appts.filter((a) => a.status === 'COMPLETED');
    const cancelledByDoctor = appts.filter((a) => a.status === 'CANCELLED_BY_DOCTOR').length;
    const cancelledByPatient = appts.filter((a) => a.status === 'CANCELLED_BY_PATIENT').length;
    const noShow = appts.filter((a) => a.status === 'NO_SHOW').length;

    const durations: number[] = [];
    const responseMinutes: number[] = [];
    for (const a of completed) {
        if (a.sessionStartedAt && a.sessionEndedAt) {
            const mins = (a.sessionEndedAt.getTime() - a.sessionStartedAt.getTime()) / 60_000;
            if (mins > 0 && mins < 12 * 60) durations.push(mins);
        }
        if (a.sessionStartedAt) {
            const r = (a.sessionStartedAt.getTime() - a.scheduledAt.getTime()) / 60_000;
            if (r >= 0 && r < 24 * 60) responseMinutes.push(r);
        }
    }
    const avgConsultMinutes =
        durations.length > 0
            ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
            : null;
    const avgResponseMinutes =
        responseMinutes.length > 0
            ? Math.round(
                  (responseMinutes.reduce((s, d) => s + d, 0) / responseMinutes.length) * 10,
              ) / 10
            : null;

    const completionDecisionTotal = completed.length + cancelledByDoctor + noShow;
    const completionRate =
        completionDecisionTotal > 0
            ? Math.round((completed.length / completionDecisionTotal) * 100)
            : 0;
    const declineRate =
        completionDecisionTotal > 0
            ? Math.round((cancelledByDoctor / completionDecisionTotal) * 100)
            : 0;

    // Day-by-day completed counts (sparse OK; UI fills gaps).
    const perDayMap = new Map<string, number>();
    for (const a of completed) {
        const key = a.scheduledAt.toISOString().slice(0, 10);
        perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1);
    }
    const perDay = Array.from(perDayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, completed: count }));

    const doctor = await prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        select: { user: { select: { name: true } } },
    });

    return {
        window: { days, from: from.toISOString(), to: to.toISOString() },
        doctor: { id: doctorId, name: doctor?.user.name ?? '' },
        appointments: {
            total,
            completed: completed.length,
            cancelledByDoctor,
            cancelledByPatient,
            noShow,
        },
        avgConsultMinutes,
        avgResponseMinutes,
        completionRate,
        declineRate,
        perDay,
    };
}
