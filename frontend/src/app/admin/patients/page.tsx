'use client';

import React from 'react';
import Image from 'next/image';
import { Search, Filter, MoreVertical, Mail, Phone, History, FileText } from 'lucide-react';
import { motion } from 'motion/react';

const MOCK_PATIENTS = [
    {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 234 567 8901',
        joined: 'Jan 12, 2024',
        appointments: 12,
        lastVisit: 'Mar 10, 2024',
        avatar: 'https://picsum.photos/seed/p1/100/100',
    },
    {
        id: '2',
        name: 'Emily Smith',
        email: 'emily.s@example.com',
        phone: '+1 234 567 8902',
        joined: 'Feb 05, 2024',
        appointments: 4,
        lastVisit: 'Mar 08, 2024',
        avatar: 'https://picsum.photos/seed/p2/100/100',
    },
    {
        id: '3',
        name: 'Robert Brown',
        email: 'robert.b@example.com',
        phone: '+1 234 567 8903',
        joined: 'Dec 20, 2023',
        appointments: 8,
        lastVisit: 'Feb 28, 2024',
        avatar: 'https://picsum.photos/seed/p3/100/100',
    },
    {
        id: '4',
        name: 'Sarah Wilson',
        email: 'sarah.w@example.com',
        phone: '+1 234 567 8904',
        joined: 'Jan 30, 2024',
        appointments: 2,
        lastVisit: 'Mar 01, 2024',
        avatar: 'https://picsum.photos/seed/p4/100/100',
    },
    {
        id: '5',
        name: 'Michael Chen',
        email: 'michael.c@example.com',
        phone: '+1 234 567 8905',
        joined: 'Feb 15, 2024',
        appointments: 1,
        lastVisit: 'Mar 11, 2024',
        avatar: 'https://picsum.photos/seed/p5/100/100',
    },
];

export default function AdminPatients() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Manage Patients</h2>
                    <p className="text-slate-500 font-medium">
                        View and manage all registered patients on the platform.
                    </p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none transition-all font-medium"
                    />
                </div>
                <button className="w-full md:w-auto px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Filter className="w-5 h-5" /> Filter
                </button>
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Patient
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Contact
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Joined Date
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Appointments
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Last Visit
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {MOCK_PATIENTS.map((patient) => (
                                <tr
                                    key={patient.id}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12">
                                                <Image
                                                    src={patient.avatar}
                                                    fill
                                                    className="rounded-2xl object-cover shadow-sm"
                                                    alt={patient.name}
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {patient.name}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    ID: #{patient.id}00{patient.id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />{' '}
                                                {patient.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />{' '}
                                                {patient.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                                        {patient.joined}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">
                                                {patient.appointments}
                                            </div>
                                            <span className="text-xs font-medium text-slate-400">
                                                Total
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                                        {patient.lastVisit}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
                                                title="View History"
                                            >
                                                <History className="w-5 h-5" />
                                            </button>
                                            <button
                                                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                title="View Records"
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>
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
