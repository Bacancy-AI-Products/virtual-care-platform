import { request } from './client';

export type VitalType =
    | 'BP_SYSTOLIC'
    | 'BP_DIASTOLIC'
    | 'HEART_RATE'
    | 'BLOOD_SUGAR'
    | 'SPO2'
    | 'TEMPERATURE'
    | 'WEIGHT';

export type VitalStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type VitalEntryMethod = 'MANUAL' | 'BLUETOOTH_DEVICE' | 'CONNECTED_APP' | 'IMPORTED';

export interface VitalReference {
    type: VitalType;
    label: string;
    unit: string;
    normalMin: number;
    normalMax: number;
    validMin: number;
    validMax: number;
    decimals: 0 | 1 | 2;
}

export interface VitalReading {
    id: string;
    patientId: string;
    type: VitalType;
    value: number;
    unit: string;
    recordedAt: string;
    entryMethod: VitalEntryMethod;
    status: VitalStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VitalsListResponse {
    data: VitalReading[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface VitalSeriesPoint {
    id: string;
    recordedAt: string;
    value: number;
    status: VitalStatus;
}

export interface VitalSeries {
    type: VitalType;
    label: string;
    unit: string;
    reference: VitalReference;
    points: VitalSeriesPoint[];
    latest: { value: number; recordedAt: string; status: VitalStatus } | null;
}

export interface VitalTrendsResponse {
    days: number;
    generatedAt: string;
    series: VitalSeries[];
}

export interface CreateVitalReadingInput {
    type: VitalType;
    value: number;
    recordedAt?: string;
    entryMethod?: VitalEntryMethod;
    notes?: string | null;
}

export interface ListMyVitalsParams {
    type?: VitalType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface DoctorRecentStatusRow {
    patientId: string;
    criticalCount: number;
    warningCount: number;
    normalCount: number;
    latest: {
        type: VitalType;
        value: number;
        status: VitalStatus;
        recordedAt: string;
    } | null;
}

export interface DoctorRecentStatusResponse {
    days: number;
    data: DoctorRecentStatusRow[];
}

function toQuery(params: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') out[k] = String(v);
    }
    return out;
}

export const vitalsApi = {
    getReference: () => request<{ data: VitalReference[] }>('/vitals/reference'),

    create: (data: CreateVitalReadingInput) =>
        request<VitalReading>('/vitals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    listMine: (params: ListMyVitalsParams = {}) =>
        request<VitalsListResponse>('/vitals/mine', {
            params: toQuery(params as Record<string, unknown>),
        }),

    getMyTrends: (days = 30) =>
        request<VitalTrendsResponse>('/vitals/mine/trends', { params: { days: String(days) } }),

    listForPatient: (patientId: string, params: ListMyVitalsParams = {}) =>
        request<VitalsListResponse>(`/vitals/patient/${patientId}`, {
            params: toQuery(params as Record<string, unknown>),
        }),

    getTrendsForPatient: (patientId: string, days = 30) =>
        request<VitalTrendsResponse>(`/vitals/patient/${patientId}/trends`, {
            params: { days: String(days) },
        }),

    getDoctorRecentStatus: (days = 7) =>
        request<DoctorRecentStatusResponse>('/vitals/doctor/recent-status', {
            params: { days: String(days) },
        }),

    delete: (id: string) => request<{ id: string }>(`/vitals/${id}`, { method: 'DELETE' }),
};
