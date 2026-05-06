import { Doctor, Appointment, MedicalRecord, Prescription } from './types';

export const MOCK_DOCTORS: Doctor[] = [
    {
        id: 'd1',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.j@telecare.com',
        role: 'doctor',
        specialization: 'Cardiologist',
        experience: 12,
        rating: 4.8,
        reviewsCount: 124,
        fee: 150,
        about: 'Dr. Sarah Johnson is a highly experienced cardiologist with over 12 years of practice. She specializes in non-invasive cardiology and heart failure management.',
        availableSlots: ['09:00 AM', '10:30 AM', '02:00 PM', '04:00 PM'],
        avatar: 'https://picsum.photos/seed/doctor1/200/200',
    },
    {
        id: 'd2',
        name: 'Dr. Michael Chen',
        email: 'michael.c@telecare.com',
        role: 'doctor',
        specialization: 'Dermatologist',
        experience: 8,
        rating: 4.9,
        reviewsCount: 89,
        fee: 120,
        about: 'Dr. Michael Chen focuses on clinical and cosmetic dermatology. He is known for his patient-centric approach and expertise in skin conditions.',
        availableSlots: ['11:00 AM', '01:30 PM', '03:00 PM', '05:30 PM'],
        avatar: 'https://picsum.photos/seed/doctor2/200/200',
    },
    {
        id: 'd3',
        name: 'Dr. Emily White',
        email: 'emily.w@telecare.com',
        role: 'doctor',
        specialization: 'Pediatrician',
        experience: 15,
        rating: 4.7,
        reviewsCount: 210,
        fee: 100,
        about: 'Dr. Emily White has been caring for children for over 15 years. She provides comprehensive pediatric care from newborns to adolescents.',
        availableSlots: ['08:30 AM', '10:00 AM', '01:00 PM', '03:30 PM'],
        avatar: 'https://picsum.photos/seed/doctor3/200/200',
    },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'a1',
        patientId: 'p1',
        doctorId: 'd1',
        doctorName: 'Dr. Sarah Johnson',
        doctorSpecialization: 'Cardiologist',
        date: '2026-03-15',
        time: '10:30 AM',
        status: 'upcoming',
        type: 'video',
    },
    {
        id: 'a2',
        patientId: 'p1',
        doctorId: 'd2',
        doctorName: 'Dr. Michael Chen',
        doctorSpecialization: 'Dermatologist',
        date: '2026-03-10',
        time: '03:00 PM',
        status: 'completed',
        type: 'chat',
    },
];

export const MOCK_RECORDS: MedicalRecord[] = [
    {
        id: 'r1',
        patientId: 'p1',
        date: '2026-03-10',
        doctorName: 'Dr. Michael Chen',
        diagnosis: 'Mild Eczema',
        prescriptionUrl: '#',
    },
];

export const MOCK_PRESCRIPTION: Prescription = {
    id: 'pr1',
    appointmentId: 'a2',
    date: '2026-03-10',
    doctorName: 'Dr. Michael Chen',
    medicines: [
        {
            name: 'Hydrocortisone Cream',
            dosage: 'Apply twice daily',
            duration: '7 days',
            instructions: 'Apply to affected areas only',
        },
        {
            name: 'Cetirizine 10mg',
            dosage: '1 tablet daily',
            duration: '10 days',
            instructions: 'Take at bedtime',
        },
    ],
    notes: 'Avoid harsh soaps and keep skin moisturized. Follow up if symptoms persist after 7 days.',
};
