'use client';

import React from 'react';
import Image from 'next/image';
import {
    Search,
    Filter,
    Plus,
    MoreVertical,
    Star,
    CheckCircle2,
    XCircle,
    Edit,
    Trash2,
} from 'lucide-react';
import { MOCK_DOCTORS } from '@/constants';
import { motion } from 'motion/react';
import { FORM_CONTROL_SEARCH, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

export default function AdminDoctors() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Manage Doctors
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Add, edit, or remove doctors from the platform.
                    </p>
                </div>
                <button className="px-6 py-[19px] bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95">
                    <Plus className="w-5 h-5" /> Add New Doctor
                </button>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name, specialization, or email..."
                        className={`${FORM_CONTROL_SEARCH} max-w-full`}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                </div>
                <button className="w-full md:w-auto px-6 py-[19px] bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Filter className="w-5 h-5" /> Filter
                </button>
            </div>

            {/* Doctors Table */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Doctor
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Specialization
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Experience
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Rating
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Status
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {MOCK_DOCTORS.map((doctor) => (
                                <tr
                                    key={doctor.id}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12">
                                                <Image
                                                    src={
                                                        doctor.avatar ||
                                                        `https://i.pravatar.cc/150?u=${doctor.id}`
                                                    }
                                                    fill
                                                    className="rounded-2xl object-cover shadow-sm"
                                                    alt={doctor.name}
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {doctor.name}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {doctor.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-bold">
                                            {doctor.specialization}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                                        {doctor.experience} Years
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                            <Star className="w-4 h-4 fill-amber-500" />{' '}
                                            {doctor.rating}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-green-500 font-bold text-xs uppercase tracking-wider">
                                            <CheckCircle2 className="w-4 h-4" /> Active
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Extra dummy doctors */}
                            {[
                                {
                                    name: 'Dr. Robert Brown',
                                    spec: 'Neurologist',
                                    exp: 20,
                                    rating: 4.9,
                                    email: 'robert.b@telecare.com',
                                },
                                {
                                    name: 'Dr. Sophia Garcia',
                                    spec: 'General Physician',
                                    exp: 6,
                                    rating: 4.6,
                                    email: 'sophia.g@telecare.com',
                                },
                            ].map((doc, i) => (
                                <tr
                                    key={i}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12">
                                                <Image
                                                    src={
                                                        [
                                                            'https://i.pravatar.cc/150?img=65',
                                                            'https://i.pravatar.cc/150?img=32',
                                                        ][i] ??
                                                        `https://i.pravatar.cc/150?u=doc${i}`
                                                    }
                                                    fill
                                                    className="rounded-2xl object-cover shadow-sm"
                                                    alt={doc.name}
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {doc.name}
                                                </p>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {doc.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-bold">
                                            {doc.spec}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                                        {doc.exp} Years
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                                            <Star className="w-4 h-4 fill-amber-500" /> {doc.rating}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                            <XCircle className="w-4 h-4" /> Inactive
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all">
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 className="w-5 h-5" />
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
