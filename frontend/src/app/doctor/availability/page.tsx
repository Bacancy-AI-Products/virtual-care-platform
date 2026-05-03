'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorsApi, type AvailabilitySlot, type AvailabilitySlotInput } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Calendar, Plus, Trash2 } from 'lucide-react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function groupByWeekday(slots: AvailabilitySlot[]): AvailabilitySlotInput[][] {
    const result: AvailabilitySlotInput[][] = Array.from({ length: 7 }, () => []);
    for (const slot of slots) {
        result[slot.weekday].push({
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDuration: slot.slotDuration,
        });
    }
    return result;
}

export default function DoctorAvailabilityPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const qClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['doctor', 'me', 'availability'],
        queryFn: () => doctorsApi.getMyAvailability(),
        enabled: !!token && user?.role === 'DOCTOR',
    });

    const [local, setLocal] = React.useState<AvailabilitySlotInput[][]>(
        Array.from({ length: 7 }, (_, weekday) => [
            {
                weekday,
                startTime: '09:00',
                endTime: '12:00',
                slotDuration: 30,
            },
        ]),
    );

    React.useEffect(() => {
        if (data?.availability) {
            setLocal(groupByWeekday(data.availability));
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: (slots: AvailabilitySlotInput[]) => doctorsApi.updateMyAvailability(slots),
        onSuccess: (result) => {
            qClient.setQueryData(['doctor', 'me', 'availability'], result);
        },
        onError: (err: Error) => {
            alert(err.message);
        },
    });

    if (!token || user?.role !== 'DOCTOR') {
        router.push('/login?from=/doctor/availability');
        return null;
    }

    const addSlot = (weekday: number) => {
        setLocal((prev) => {
            const copy = prev.map((slots) => [...slots]);
            copy[weekday].push({
                weekday,
                startTime: '14:00',
                endTime: '17:00',
                slotDuration: 30,
            });
            return copy;
        });
    };

    const removeSlot = (weekday: number, index: number) => {
        setLocal((prev) => {
            const copy = prev.map((slots) => [...slots]);
            copy[weekday].splice(index, 1);
            return copy;
        });
    };

    const updateField =
        (weekday: number, index: number, field: keyof AvailabilitySlotInput) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setLocal((prev) => {
                const copy = prev.map((slots) => [...slots]);
                const slot = { ...copy[weekday][index] };
                if (field === 'slotDuration') {
                    slot[field] = value ? Number(value) : 0;
                } else {
                    (slot as any)[field] = value;
                }
                copy[weekday][index] = slot;
                return copy;
            });
        };

    const handleSave = () => {
        const flat = local.flat();
        mutation.mutate(flat);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-1">Availability</h2>
                    <p className="text-slate-500 font-medium">
                        Set your weekly schedule. Patients will only see slots within these windows.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all active:scale-95 disabled:opacity-60"
                    disabled={mutation.isPending}
                >
                    Save schedule
                </button>
            </div>

            {isLoading && (
                <div className="flex justify-center py-24">
                    <p className="text-slate-500 font-medium">Loading availability...</p>
                </div>
            )}

            {isError && (
                <div className="p-12 bg-red-50 rounded-[40px] text-center">
                    <p className="text-red-500 font-bold">Failed to load availability.</p>
                </div>
            )}

            {!isLoading && !isError && (
                <div className="grid lg:grid-cols-2 gap-6">
                    {WEEKDAYS.map((label, weekday) => (
                        <div
                            key={label}
                            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-brand-500" />
                                    <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addSlot(weekday)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                                >
                                    <Plus className="w-3 h-3" /> Add slot
                                </button>
                            </div>

                            {local[weekday].length === 0 ? (
                                <p className="text-xs text-slate-400">No slots for this day.</p>
                            ) : (
                                <div className="space-y-3">
                                    {local[weekday].map((slot, index) => (
                                        <div
                                            key={index}
                                            className="bg-slate-50 rounded-2xl px-3 py-3 border border-slate-100 space-y-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={slot.startTime}
                                                        onChange={updateField(
                                                            weekday,
                                                            index,
                                                            'startTime',
                                                        )}
                                                        className="w-full max-w-[150px] px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
                                                    />
                                                    <span className="text-xs text-slate-400">
                                                        to
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={slot.endTime}
                                                        onChange={updateField(
                                                            weekday,
                                                            index,
                                                            'endTime',
                                                        )}
                                                        className="w-full max-w-[150px] px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 pl-7">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                                                        Slot duration
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        value={slot.slotDuration}
                                                        onChange={updateField(
                                                            weekday,
                                                            index,
                                                            'slotDuration',
                                                        )}
                                                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium"
                                                    />
                                                    <span className="text-[10px] text-slate-400">
                                                        min
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(weekday, index)}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
