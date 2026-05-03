'use client';

import React from 'react';
import {
    Search,
    Filter,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Video,
    MoreVertical,
    User,
    Stethoscope,
} from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_ALL_APPOINTMENTS = [
    {
        id: '1',
        patient: 'John Doe',
        doctor: 'Dr. Sarah Johnson',
        date: 'Mar 15, 2024',
        time: '10:00 AM',
        status: 'Scheduled',
        type: 'Video',
        amount: '$50',
    },
    {
        id: '2',
        patient: 'Emily Smith',
        doctor: 'Dr. Michael Chen',
        date: 'Mar 15, 2024',
        time: '11:30 AM',
        status: 'Completed',
        type: 'Video',
        amount: '$65',
    },
    {
        id: '3',
        patient: 'Robert Brown',
        doctor: 'Dr. Emily White',
        date: 'Mar 16, 2024',
        time: '02:00 PM',
        status: 'Cancelled',
        type: 'Video',
        amount: '$45',
    },
    {
        id: '4',
        patient: 'Sarah Wilson',
        doctor: 'Dr. Sarah Johnson',
        date: 'Mar 16, 2024',
        time: '09:00 AM',
        status: 'Scheduled',
        type: 'Video',
        amount: '$50',
    },
    {
        id: '5',
        patient: 'Michael Chen',
        doctor: 'Dr. Michael Chen',
        date: 'Mar 17, 2024',
        time: '04:30 PM',
        status: 'Pending',
        type: 'Video',
        amount: '$65',
    },
];

export default function AdminAppointments() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">All Appointments</h2>
                    <p className="text-slate-500 font-medium">
                        Monitor and manage all consultations across the platform.
                    </p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by patient, doctor, or date..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none transition-all font-medium"
                    />
                </div>
                <button className="w-full md:w-auto px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Filter className="w-5 h-5" /> Filter
                </button>
            </div>

            {/* Appointments Table */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Patient
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Doctor
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Date & Time
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Status
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Type
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Payment
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {MOCK_ALL_APPOINTMENTS.map((appt) => (
                                <tr
                                    key={appt.id}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <p className="font-bold text-slate-900">
                                                {appt.patient}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center">
                                                <Stethoscope className="w-4 h-4 text-brand-500" />
                                            </div>
                                            <p className="font-bold text-slate-900">
                                                {appt.doctor}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />{' '}
                                                {appt.date}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />{' '}
                                                {appt.time}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                appt.status === 'Completed'
                                                    ? 'bg-green-50 text-green-600'
                                                    : appt.status === 'Scheduled'
                                                      ? 'bg-blue-50 text-blue-600'
                                                      : appt.status === 'Cancelled'
                                                        ? 'bg-red-50 text-red-600'
                                                        : 'bg-amber-50 text-amber-600'
                                            }`}
                                        >
                                            {appt.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <Video className="w-4 h-4 text-brand-500" /> {appt.type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-900">
                                        {appt.amount}
                                    </td>
                                    <td className="px-6 py-5">
                                        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
