'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
    ChevronLeft,
    Loader2,
    LogIn,
    Calendar,
    Search,
    Languages,
    GraduationCap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, type AvailabilitySlot } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { PublicHeader } from '@/components/PublicHeader';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { RatingStars } from '@/components/ui/RatingStars';
import { DoctorTrustStrip } from '@/components/doctor/DoctorTrustStrip';
import { CredentialList } from '@/components/doctor/CredentialList';
import { ReviewsSection } from '@/components/doctor/ReviewsSection';

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
                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
                    <div className="max-w-md w-full bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Doctor not found</h2>
                        <p className="text-slate-500 font-medium mb-8">
                            We couldn&apos;t load this profile. The doctor may no longer be
                            available.
                        </p>
                        <Link
                            href="/doctors"
                            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                        >
                            <ChevronLeft className="w-5 h-5" /> Back to all doctors
                        </Link>
                    </div>
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
                                {doctor.verified && (
                                    <div className="absolute -bottom-3 -right-3 z-10">
                                        <VerificationBadge variant="icon" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                                        {doctor.user.name}
                                    </h1>
                                    {doctor.verified && <VerificationBadge />}
                                    {doctor.stats.averageRating != null && (
                                        <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-3 py-1 rounded-full text-sm font-bold">
                                            <RatingStars
                                                value={doctor.stats.averageRating}
                                                size="sm"
                                                showValue
                                                count={doctor.stats.reviewCount}
                                            />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xl font-bold text-brand-600 mb-4">
                                    {doctor.specialization}
                                </p>
                                {(doctor.city || doctor.state) && (
                                    <p className="text-slate-500 font-medium mb-6">
                                        {[doctor.city, doctor.state].filter(Boolean).join(', ')}
                                    </p>
                                )}

                                <DoctorTrustStrip
                                    experienceYears={doctor.experienceYears}
                                    stats={doctor.stats}
                                />

                                {doctor.languages && doctor.languages.length > 0 && (
                                    <div className="mt-5 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <Languages className="w-3.5 h-3.5" /> Speaks
                                        </span>
                                        {doctor.languages.map((lang) => (
                                            <span
                                                key={lang}
                                                className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                                            >
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                )}
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

                    {doctor.credentials && doctor.credentials.length > 0 && (
                        <div className="bg-white p-8 sm:p-10 rounded-[48px] border border-slate-100 shadow-sm">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                                <GraduationCap className="w-6 h-6 text-brand-500" /> Credentials &
                                Education
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mb-6">
                                Degrees, fellowships, and board certifications verified by our team.
                            </p>
                            <CredentialList credentials={doctor.credentials} />
                        </div>
                    )}

                    <ReviewsSection doctorId={doctor.id} />

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
                                <p className="text-2xl font-bold text-brand-600">
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
