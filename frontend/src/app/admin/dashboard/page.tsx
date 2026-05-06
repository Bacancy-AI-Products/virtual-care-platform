'use client';

import React from 'react';
import {
    Users,
    Stethoscope,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

const StatCard = ({
    icon: Icon,
    label,
    value,
    color,
    trend,
}: {
    icon: any;
    label: string;
    value: string;
    color: string;
    trend?: string;
}) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                    {trend}
                </span>
            )}
        </div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
);

export default function AdminDashboard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        Admin Overview
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Manage your platform's doctors, patients, and appointments.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    label="Total Patients"
                    value="12,450"
                    color="bg-blue-50 text-blue-500"
                    trend="+12%"
                />
                <StatCard
                    icon={Stethoscope}
                    label="Active Doctors"
                    value="482"
                    color="bg-brand-50 text-brand-500"
                    trend="+5%"
                />
                <StatCard
                    icon={Calendar}
                    label="Total Appointments"
                    value="8,920"
                    color="bg-purple-50 text-purple-500"
                    trend="+18%"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Revenue"
                    value="$124,500"
                    color="bg-green-50 text-green-500"
                    trend="+22%"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
                {/* Recent Activity */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">
                        Recent Platform Activity
                    </h3>
                    <div className="space-y-6">
                        {[
                            {
                                icon: CheckCircle2,
                                text: 'Dr. Sarah Johnson completed a consultation with John Doe',
                                time: '5 mins ago',
                                color: 'text-green-500',
                            },
                            {
                                icon: Clock,
                                text: 'New appointment booked: Emily Smith with Dr. Michael Chen',
                                time: '12 mins ago',
                                color: 'text-blue-500',
                            },
                            {
                                icon: Users,
                                text: 'New patient registered: Robert Brown',
                                time: '45 mins ago',
                                color: 'text-brand-500',
                            },
                            {
                                icon: AlertCircle,
                                text: 'Appointment cancelled: David Wilson with Dr. Emily White',
                                time: '1 hour ago',
                                color: 'text-red-500',
                            },
                        ].map((activity, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className={`mt-1 ${activity.color}`}>
                                    <activity.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">
                                        {activity.text}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">System Health</h3>
                    <div className="space-y-8">
                        {[
                            {
                                label: 'Server Status',
                                value: '99.9% Uptime',
                                color: 'bg-green-500',
                            },
                            { label: 'API Response Time', value: '120ms', color: 'bg-blue-500' },
                            { label: 'Database Load', value: '24%', color: 'bg-brand-500' },
                            { label: 'Storage Usage', value: '45%', color: 'bg-orange-500' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-700">
                                        {item.label}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                        {item.value}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color}`}
                                        style={{ width: item.value.split('%')[0] + '%' }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
