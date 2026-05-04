'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Star,
    Clock,
    Award,
    Users,
    Calendar,
    ChevronLeft,
    Video,
    CheckCircle2,
    Heart,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfDay, setHours, setMinutes } from 'date-fns';
import {
    doctorsApi,
    appointmentsApi,
    type AvailabilitySlot,
    type SpecializationOption,
} from '@/services/api';

// ─── Slot helpers ─────────────────────────────────────────────────────────────

/** Generate time slot strings ("09:00 AM") for a given date from weekly availability. */
function buildSlots(
    availability: AvailabilitySlot[],
    date: Date,
): Array<{ label: string; startsAt: string; durationMinutes: number }> {
    const weekday = date.getDay(); // 0 = Sun
    const slots: Array<{ label: string; startsAt: string; durationMinutes: number }> = [];

    for (const a of availability.filter((x) => x.weekday === weekday)) {
        const [sh, sm] = a.startTime.split(':').map(Number);
        const [eh, em] = a.endTime.split(':').map(Number);
        const step = a.slotDuration || 30;

        let cursor = setMinutes(setHours(startOfDay(date), sh), sm);
        const end = setMinutes(setHours(startOfDay(date), eh), em);

        while (cursor < end) {
            slots.push({
                label: format(cursor, 'hh:mm a'),
                startsAt: cursor.toISOString(),
                durationMinutes: step,
            });
            cursor = new Date(cursor.getTime() + step * 60_000);
        }
    }

    return slots;
}

/** Convert a date + "hh:mm a" slot string into an ISO datetime. */
function toISO(date: Date, slot: string): string {
    const [time, period] = slot.split(' ');
    const [h, m] = time.split(':').map(Number);
    let hours = h % 12;
    if (period === 'PM') hours += 12;
    return setMinutes(setHours(startOfDay(date), hours), m).toISOString();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const qClient = useQueryClient();

    const today = startOfDay(new Date());
    const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const availabilityRange = React.useMemo(
        () => ({
            from: today.toISOString(),
            to: addDays(today, 7).toISOString(),
        }),
        [today],
    );

    const [selectedDate, setSelectedDate] = React.useState<Date>(today);
    const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
    const [reason, setReason] = React.useState('');
    const [bookingError, setBookingError] = React.useState<string | null>(null);

    const {
        data: doctor,
        isLoading: loadingDoctor,
        isError: errorDoctor,
    } = useQuery({
        queryKey: ['doctor', id],
        queryFn: () => doctorsApi.getById(id),
        enabled: !!id,
    });

    const { data: specializationData } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const specializationNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        specializationData?.data.forEach((s: SpecializationOption) => {
            map.set(s.id, s.name);
        });
        return map;
    }, [specializationData]);

    const { data: availData, isLoading: loadingSlots } = useQuery({
        queryKey: ['doctor-availability', id, availabilityRange.from, availabilityRange.to],
        queryFn: () => doctorsApi.getAvailability(id, availabilityRange),
        enabled: !!id,
    });

    const slots = availData ? buildSlots(availData.availability, selectedDate) : [];
    const bookedAppointments = React.useMemo(
        () => availData?.bookedAppointments ?? [],
        [availData?.bookedAppointments],
    );

    // Reset slot on date change.
    React.useEffect(() => {
        setSelectedSlot(null);
    }, [selectedDate]);

    const specializationLabel = doctor
        ? (specializationNameById.get(doctor.specialization) ?? doctor.specialization)
        : '';

    React.useEffect(() => {
        if (doctor) {
            const name = doctor.user.name || 'Doctor';
            document.title = `${name} | BacancyTeleCare`;
        }
    }, [doctor]);

    const bookMutation = useMutation({
        mutationFn: () =>
            appointmentsApi.book({
                doctorId: id,
                scheduledAt: toISO(selectedDate, selectedSlot!),
                durationMinutes: 30,
                reason: reason.trim() || undefined,
            }),
        onSuccess: () => {
            qClient.invalidateQueries({ queryKey: ['appointments', 'patient', 'all'] });
            router.push('/patient/appointments');
        },
        onError: (err: Error) => setBookingError(err.message),
    });

    if (loadingDoctor) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (errorDoctor || !doctor) {
        return (
            <div className="max-w-xl mx-auto py-12">
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Doctor not found</h2>
                    <p className="text-slate-500 font-medium mb-8">
                        We couldn&apos;t load this profile. The doctor may no longer be available.
                    </p>
                    <Link
                        href="/patient/doctors"
                        className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98]"
                    >
                        <ChevronLeft className="w-5 h-5" /> Back to find doctors
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto w-full space-y-6 sm:space-y-8 lg:space-y-10"
        >
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-bold group"
            >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Back to Results
            </button>

            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 min-w-0">
                {/* Doctor info */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">
                    <div className="w-full bg-white p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] lg:rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-center md:items-start relative z-10 min-w-0">
                            <div className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 flex-shrink-0">
                                <Image
                                    src={`https://picsum.photos/seed/${doctor.id}/200/200`}
                                    alt={doctor.user.name}
                                    fill
                                    className="rounded-[28px] sm:rounded-[32px] lg:rounded-[40px] object-cover border-4 lg:border-8 border-slate-50 shadow-xl"
                                    referrerPolicy="no-referrer"
                                />
                                <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-brand-500 p-2 sm:p-2.5 lg:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-brand-100 z-10">
                                    <CheckCircle2 className="text-white w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 w-full text-center md:text-left">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3">
                                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                                        {doctor.user.name}
                                    </h2>
                                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500" />{' '}
                                        4.8
                                    </div>
                                </div>
                                <p className="text-base sm:text-lg lg:text-xl font-bold text-brand-600 mb-4 sm:mb-6">
                                    {specializationLabel}
                                </p>

                                <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
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
                                            className="min-w-0 p-2.5 sm:p-4 bg-slate-50 rounded-2xl sm:rounded-3xl text-center overflow-hidden"
                                        >
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-sm text-brand-500">
                                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <p className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wide truncate">
                                                {label}
                                            </p>
                                            <p className="text-xs sm:text-base lg:text-lg font-bold text-slate-900 truncate">
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 sm:w-52 lg:w-64 h-40 sm:h-52 lg:h-64 bg-brand-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-0" />
                    </div>

                    {doctor.bio && (
                        <div className="bg-white p-5 sm:p-8 lg:p-10 rounded-[28px] sm:rounded-[36px] lg:rounded-[48px] border border-slate-100 shadow-sm">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
                                About Doctor
                            </h3>
                            <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
                                {doctor.bio}
                            </p>
                        </div>
                    )}
                </div>

                {/* Booking panel */}
                <div className="min-w-0">
                    <div className="bg-white p-5 sm:p-7 lg:p-8 rounded-[28px] sm:rounded-[36px] lg:rounded-[48px] border border-slate-100 shadow-xl shadow-slate-100 lg:sticky lg:top-28 space-y-5 sm:space-y-6 max-w-md mx-auto lg:max-w-none lg:mx-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="min-w-0 text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
                                Book Appointment
                            </h3>
                            {doctor.consultationFee && (
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        Fee
                                    </p>
                                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-brand-600">
                                        ${Number(doctor.consultationFee).toFixed(0)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Date strip */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-brand-500" /> Select Date
                            </p>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {next7Days.map((d) => {
                                    const active =
                                        format(d, 'yyyy-MM-dd') ===
                                        format(selectedDate, 'yyyy-MM-dd');
                                    return (
                                        <button
                                            key={d.toISOString()}
                                            onClick={() => setSelectedDate(d)}
                                            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${
                                                active
                                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-100'
                                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="text-xs font-bold uppercase">
                                                {format(d, 'MMM')}
                                            </span>
                                            <span className="text-xl font-bold">
                                                {format(d, 'd')}
                                            </span>
                                            <span className="text-xs font-medium">
                                                {format(d, 'EEE')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time slots */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-500" /> Select Time
                            </p>
                            {loadingSlots ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                                </div>
                            ) : slots.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">
                                    No slots on {format(selectedDate, 'MMM d')}
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                                    {slots.map((slot) => {
                                        const slotStart = new Date(slot.startsAt).getTime();
                                        const slotEnd = slotStart + slot.durationMinutes * 60_000;
                                        const isBooked = bookedAppointments.some((appointment) => {
                                            const appointmentStart = new Date(
                                                appointment.scheduledAt,
                                            ).getTime();
                                            const appointmentEnd =
                                                appointmentStart +
                                                appointment.durationMinutes * 60_000;
                                            return (
                                                slotStart < appointmentEnd &&
                                                slotEnd > appointmentStart
                                            );
                                        });

                                        return (
                                            <button
                                                key={slot.startsAt}
                                                onClick={() => {
                                                    if (!isBooked) {
                                                        setSelectedSlot(slot.label);
                                                    }
                                                }}
                                                disabled={isBooked}
                                                className={`min-h-16 rounded-2xl text-sm font-bold transition-all border-2 px-3 ${
                                                    isBooked
                                                        ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed'
                                                        : selectedSlot === slot.label
                                                          ? 'bg-brand-50 border-brand-500 text-brand-600'
                                                          : 'bg-white border-slate-100 text-slate-500 hover:border-brand-200'
                                                }`}
                                            >
                                                {isBooked ? (
                                                    <div className="flex h-full flex-col items-center justify-center gap-1.5">
                                                        <span className="blur-[1px] opacity-70">
                                                            {slot.label}
                                                        </span>
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                            Already booked
                                                        </span>
                                                    </div>
                                                ) : (
                                                    slot.label
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-2">
                                Reason (optional)
                            </p>
                            <textarea
                                rows={2}
                                placeholder="Brief description of your concern..."
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none transition-all text-sm font-medium resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        {/* Video badge */}
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-brand-500">
                                <Video className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                    Video Consultation
                                </p>
                                <p className="text-xs text-slate-500">Secure 1-on-1 video call</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-brand-500" />
                        </div>

                        {bookingError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-2xl text-red-500 text-sm font-medium">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {bookingError}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setBookingError(null);
                                bookMutation.mutate();
                            }}
                            disabled={!selectedSlot || bookMutation.isPending}
                            className={`w-full py-5 rounded-[24px] font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
                                !selectedSlot
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-brand-500 text-white shadow-brand-100 hover:bg-brand-600'
                            }`}
                        >
                            {bookMutation.isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Booking...
                                </>
                            ) : (
                                <>
                                    Confirm Booking <CheckCircle2 className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <p className="text-center text-xs text-slate-400 font-medium">
                            No payment required now. Pay after consultation.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
