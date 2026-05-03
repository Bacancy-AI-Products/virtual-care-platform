export type UserRole = 'patient' | 'doctor';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export interface Doctor extends User {
    specialization: string;
    experience: number;
    rating: number;
    reviewsCount: number;
    fee: number;
    about: string;
    availableSlots: string[];
}

export interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    date: string;
    time: string;
    status: 'upcoming' | 'completed' | 'cancelled';
    type: 'video' | 'chat';
}

export interface MedicalRecord {
    id: string;
    patientId: string;
    date: string;
    doctorName: string;
    diagnosis: string;
    prescriptionUrl?: string;
}

export interface Prescription {
    id: string;
    appointmentId: string;
    date: string;
    doctorName: string;
    medicines: {
        name: string;
        dosage: string;
        duration: string;
        instructions: string;
    }[];
    notes: string;
}
