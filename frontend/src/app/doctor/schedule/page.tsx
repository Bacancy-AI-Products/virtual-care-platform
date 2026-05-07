'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, ChevronLeft, ChevronRight, Video, Loader2 } from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    startOfDay,
} from 'date-fns';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, type Appointment } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Time slot row ────────────────────────────────────────────────────────────

function BookedSlot({ appt }: { appt: Appointment }) {
    return (
        <div className="p-6 rounded-[32px] border border-slate-100 bg-white shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-sm bg-brand-50 text-brand-600">
                    {format(new Date(appt.scheduledAt), 'hh:mm')}
                    <span className="text-[9px] ml-0.5">
                        {format(new Date(appt.scheduledAt), 'a')}
                    </span>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900">{appt.patient.user.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                        Video Consultation • {appt.durationMinutes} mins
                    </p>
                </div>
            </div>
            <Link
                href={`/doctor/consultation/${appt.id}`}
                className="px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 flex items-center gap-2"
            >
                <Video className="w-4 h-4" /> Start Call
            </Link>
        </div>
    );
}

function EmptySlot({ label }: { label: string }) {
    return (
        <div className="p-6 rounded-[32px] border border-dashed border-slate-200 bg-brand-50 flex items-center gap-6 cursor-pointer hover:bg-brand-100 transition-all">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-sm bg-white text-slate-400">
                <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs">{label}</h4>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoctorSchedule() {
    const { user, token } = useAuth();
    const [viewMonth, setViewMonth] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState(startOfDay(new Date()));

    const { data, isLoading } = useQuery({
        queryKey: ['appointments', 'doctor', 'all'],
        queryFn: () => appointmentsApi.list({ limit: 100 }),
        enabled: !!token,
    });

    const allAppointments = data?.data ?? [];

    // Appointments for the selected date
    const dayAppointments = allAppointments
        .filter(
            (a) =>
                isSameDay(new Date(a.scheduledAt), selectedDate) &&
                (a.status === 'PENDING' || a.status === 'CONFIRMED'),
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    // Days in view month that have appointments (for dot indicators)
    const appointmentDays = new Set(
        allAppointments
            .filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
            .map((a) => format(new Date(a.scheduledAt), 'yyyy-MM-dd')),
    );

    const monthDays = eachDayOfInterval({
        start: startOfMonth(viewMonth),
        end: endOfMonth(viewMonth),
    });

    // Pad to start on Sunday
    const startPad = startOfMonth(viewMonth).getDay();

    // Summary stats
    const upcomingTotal = allAppointments.filter(
        (a) => a.status === 'PENDING' || a.status === 'CONFIRMED',
    ).length;

    const completedTotal = allAppointments.filter((a) => a.status === 'COMPLETED').length;

    const cancelRate =
        allAppointments.length > 0
            ? (
                  (allAppointments.filter(
                      (a) =>
                          a.status === 'CANCELLED_BY_DOCTOR' || a.status === 'CANCELLED_BY_PATIENT',
                  ).length /
                      allAppointments.length) *
                  100
              ).toFixed(1)
            : '0.0';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
        >
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Calendar sidebar */}
                <div className="lg:w-80 space-y-8">
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-900">
                                {format(viewMonth, 'MMMM yyyy')}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                                    className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                                    className="p-2 text-slate-400 hover:text-brand-500 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-2 text-center mb-4">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <span
                                    key={i}
                                    className="text-[10px] font-bold text-slate-400 uppercase"
                                >
                                    {d}
                                </span>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 gap-2 text-center">
                            {Array.from({ length: startPad }, (_, i) => (
                                <div key={`pad-${i}`} />
                            ))}
                            {monthDays.map((day) => {
                                const key = format(day, 'yyyy-MM-dd');
                                const isSelected = isSameDay(day, selectedDate);
                                const hasAppt = appointmentDays.has(key);
                                const isCurrentMonth = isSameMonth(day, viewMonth);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedDate(startOfDay(day))}
                                        className={`relative w-8 h-8 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center mx-auto ${
                                            isSelected
                                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-100'
                                                : isToday(day)
                                                  ? 'bg-brand-50 text-brand-600'
                                                  : isCurrentMonth
                                                    ? 'text-slate-600 hover:bg-slate-50'
                                                    : 'text-slate-300'
                                        }`}
                                    >
                                        {format(day, 'd')}
                                        {hasAppt && !isSelected && (
                                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-brand-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4">Schedule Stats</h3>
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm font-medium">
                                        Upcoming
                                    </span>
                                    <span className="font-bold">
                                        {isLoading ? '—' : upcomingTotal}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm font-medium">
                                        Completed
                                    </span>
                                    <span className="font-bold">
                                        {isLoading ? '—' : completedTotal}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 text-sm font-medium">
                                        Cancellation Rate
                                    </span>
                                    <span className="font-bold text-green-400">
                                        {isLoading ? '—' : `${cancelRate}%`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    </div>
                </div>

                {/* Daily schedule */}
                <div className="flex-1 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {isToday(selectedDate) ? 'Today, ' : ''}
                                {format(selectedDate, 'EEEE, MMMM d')}
                            </h3>
                            <p className="text-slate-500 font-medium mt-1">
                                {isLoading
                                    ? 'Loading...'
                                    : `${dayAppointments.length} appointment${dayAppointments.length === 1 ? '' : 's'} scheduled`}
                            </p>
                        </div>
                        <Link
                            href="/doctor/appointments"
                            className="px-6 py-4 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Calendar className="w-5 h-5" /> All Appointments
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                        </div>
                    ) : dayAppointments.length === 0 ? (
                        <div className="space-y-4">
                            <EmptySlot label="No appointments — day is free" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dayAppointments.map((appt) => (
                                <BookedSlot key={appt.id} appt={appt} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
