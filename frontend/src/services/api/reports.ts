import { request, API_BASE } from './client';
import { useAuthStore } from '@/store/auth';
import type { VitalStatus, VitalType } from './vitals';

export interface PatientVitalsSummary {
    patient: {
        id: string;
        name: string;
        email: string;
        dateOfBirth: string | null;
    };
    window: { days: number; from: string; to: string };
    perVital: Array<{
        type: VitalType;
        label: string;
        unit: string;
        normalRange: string;
        count: number;
        min: number | null;
        max: number | null;
        avg: number | null;
        latest: { value: number; recordedAt: string; status: VitalStatus } | null;
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

export interface RpmMinutesRow {
    patientId: string;
    patientName: string;
    totalMinutes: number;
    sessionsCount: number;
    cpt99457Eligible: boolean;
    cpt99458Units: number;
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
    avgResponseMinutes: number | null;
    completionRate: number;
    declineRate: number;
    perDay: Array<{ date: string; completed: number }>;
}

export const reportsApi = {
    getVitalsSummary: (days = 30) =>
        request<PatientVitalsSummary>('/reports/vitals-summary', {
            params: { days: String(days) },
        }),

    /**
     * Patient-side PDF download. Uses fetch directly (instead of `request`)
     * because the response is a binary stream, not JSON.
     */
    async downloadVitalsSummaryPdf(days = 30): Promise<Blob> {
        const token = useAuthStore.getState().token;
        const res = await fetch(`${API_BASE}/reports/vitals-summary.pdf?days=${days}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Download failed (${res.status})`);
        }
        return res.blob();
    },

    getRpmMinutes: (params: { month?: string; patientId?: string } = {}) => {
        const q: Record<string, string> = {};
        if (params.month) q.month = params.month;
        if (params.patientId) q.patientId = params.patientId;
        return request<RpmMinutesReport>('/reports/rpm-minutes', { params: q });
    },

    getProductivity: (days = 30) =>
        request<ProductivityReport>('/reports/productivity', {
            params: { days: String(days) },
        }),
};
