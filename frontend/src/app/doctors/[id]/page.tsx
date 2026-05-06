'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
    Star,
    Clock,
    Award,
    Users,
    Heart,
    ChevronLeft,
    CheckCircle2,
    Loader2,
    LogIn,
    Calendar,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, type AvailabilitySlot } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { PublicHeader } from '@/components/PublicHeader';

export default function PublicDoctorProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const isPatient = user?.role === 'PATIENT';

    const {
        data: doctor,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['doctor', 'public', id],
        queryFn: () => doctorsApi.getById(id),
        enabled: !!id,
    });

    const { data: availabilityData } = useQuery({
        queryKey: ['doctor', 'public', id, 'availability'],
        queryFn: () => doctorsApi.getAvailability(id),
        enabled: !!id,
    });

    React.useEffect(() => {
        if (doctor) {
            const name = doctor.user.name || 'Doctor';
            document.title = `${name} | BacancyTeleCare`;
        }
    }, [doctor]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                    <PublicHeader bordered />
                </div>
                <div className="flex-1 flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (isError || !doctor) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
                    <PublicHeader bordered />
                </div>
                <div className="flex-1 flex items-center justify-center p-20">
                    <p className="text-slate-500 font-bold">Doctor not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Public navbar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <PublicHeader bordered />
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                >
                    <Link
                        href="/doctors"
                        className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-bold group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        Back to doctors
                    </Link>

                    {/* Doctor info only (no slots, no booking for guests) */}
                    <div className="bg-white p-8 sm:p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start relative z-10">
                            <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0">
                                <Image
                                    src={`https://picsum.photos/seed/${doctor.id}/200/200`}
                                    alt={doctor.user.name}
                                    fill
                                    className="rounded-[40px] object-cover border-8 border-slate-50 shadow-xl"
                                    referrerPolicy="no-referrer"
                                />
                                <div className="absolute -bottom-3 -right-3 bg-brand-500 p-2.5 rounded-2xl shadow-lg shadow-brand-100 z-10">
                                    <CheckCircle2 className="text-white w-5 h-5" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                                        {doctor.user.name}
                                    </h1>
                                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-sm font-bold">
                                        <Star className="w-4 h-4 fill-amber-500" /> 4.8
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-brand-600 mb-4">
                                    {doctor.specialization}
                                </p>
                                {(doctor.city || doctor.state) && (
                                    <p className="text-slate-500 font-medium mb-6">
                                        {[doctor.city, doctor.state].filter(Boolean).join(', ')}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        {
                                            icon: Award,
                                            label: 'Experience',
                                            value: doctor.experienceYears
                                                ? `${doctor.experienceYears} Years`
                                                : '—',
                                        },
                                        { icon: Users, label: 'Patients', value: '1.2k+' },
                                        { icon: Heart, label: 'Rating', value: '4.8/5' },
                                    ].map(({ icon: Icon, label, value }) => (
                                        <div
                                            key={label}
                                            className="p-4 bg-slate-50 rounded-3xl text-center"
                                        >
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm text-brand-500">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                {label}
                                            </p>
                                            <p className="text-lg font-bold text-slate-900">
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-0" />
                    </div>

                    {doctor.bio && (
                        <div className="bg-white p-8 sm:p-10 rounded-[48px] border border-slate-100 shadow-sm">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">About</h2>
                            <p className="text-lg text-slate-500 leading-relaxed">{doctor.bio}</p>
                        </div>
                    )}

                    {availabilityData?.availability?.length ? (
                        <DoctorAvailability slots={availabilityData.availability} />
                    ) : null}

                    {/* CTA: view-only for guests; book link for logged-in patients */}
                    <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div>
                                <p className="text-2xl font-bold text-slate-900 mb-1">
                                    Consultation Fee
                                </p>
                                <p className="text-3xl font-bold text-brand-600">
                                    {doctor.consultationFee
                                        ? `$${Number(doctor.consultationFee).toFixed(0)}`
                                        : 'Free'}
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Video consultation • No payment required now
                                </p>
                            </div>

                            {isPatient ? (
                                <Link
                                    href={`/patient/doctors/${id}`}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                                >
                                    <Calendar className="w-5 h-5" /> Book appointment
                                </Link>
                            ) : (
                                <Link
                                    href={`/login?from=${encodeURIComponent(`/patient/doctors/${id}`)}`}
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                                >
                                    <LogIn className="w-5 h-5" /> Sign in to book an appointment
                                </Link>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

function DoctorAvailability({ slots }: { slots: AvailabilitySlot[] }) {
    const byDay = React.useMemo(() => {
        const map = new Map<number, AvailabilitySlot[]>();
        for (const slot of slots) {
            const list = map.get(slot.weekday) ?? [];
            list.push(slot);
            map.set(slot.weekday, list);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => a - b)
            .map(([weekday, daySlots]) => ({
                weekday,
                slots: daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
            }));
    }, [slots]);

    const labels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="bg-white p-8 sm:p-10 rounded-[48px] border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">Typical availability</h2>
            <p className="text-sm text-slate-500">
                These are the hours this doctor usually offers video consultations. Actual available
                slots may vary when you book.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {byDay.map(({ weekday, slots: daySlots }) => (
                    <div
                        key={weekday}
                        className="border border-slate-100 rounded-2xl p-4 bg-slate-50"
                    >
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            {labels[weekday]}
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                            {daySlots.map((s) => (
                                <li key={`${s.startTime}-${s.endTime}`}>
                                    {s.startTime}–{s.endTime} · {s.slotDuration} min
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
