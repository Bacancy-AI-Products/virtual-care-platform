'use client';

import React from 'react';
import {
    Shield,
    Bell,
    Database,
    Globe,
    Lock,
    Mail,
    CheckCircle2,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

const SettingItem = ({
    icon: Icon,
    label,
    description,
    color,
}: {
    icon: any;
    label: string;
    description: string;
    color: string;
}) => (
    <button className="w-full flex items-center justify-between p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-100 transition-all group text-left">
        <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {label}
                </h4>
                <p className="text-sm text-slate-500 font-medium">{description}</p>
            </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
    </button>
);

export default function AdminSettings() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto space-y-10"
        >
            <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Platform Settings</h2>
                <p className="text-slate-500 font-medium">
                    Configure global platform parameters and security.
                </p>
            </div>

            <div className="grid gap-6">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
                        General Configuration
                    </h3>
                    <SettingItem
                        icon={Globe}
                        label="General Settings"
                        description="Platform name, logo, and basic information."
                        color="bg-blue-50 text-blue-500"
                    />
                    <SettingItem
                        icon={Bell}
                        label="Notification Settings"
                        description="Manage email and push notification templates."
                        color="bg-brand-50 text-brand-500"
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
                        Security & Access
                    </h3>
                    <SettingItem
                        icon={Shield}
                        label="Security Policies"
                        description="Password requirements, 2FA, and session management."
                        color="bg-purple-50 text-purple-500"
                    />
                    <SettingItem
                        icon={Lock}
                        label="Role Management"
                        description="Define permissions for doctors, patients, and admins."
                        color="bg-red-50 text-red-500"
                    />
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
                        System & Data
                    </h3>
                    <SettingItem
                        icon={Database}
                        label="Database Backups"
                        description="Schedule and manage platform data backups."
                        color="bg-green-50 text-green-500"
                    />
                    <SettingItem
                        icon={Mail}
                        label="Email Server (SMTP)"
                        description="Configure outgoing email server settings."
                        color="bg-amber-50 text-amber-500"
                    />
                </div>
            </div>

            <div className="bg-brand-50 p-8 rounded-[32px] border border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100">
                        <CheckCircle2 className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">System Status: Healthy</h4>
                        <p className="text-sm text-slate-500 font-medium">
                            All services are running normally.
                        </p>
                    </div>
                </div>
                <button className="px-6 py-3 bg-white text-brand-600 font-bold rounded-xl border border-brand-200 hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all active:scale-95">
                    Run Diagnostics
                </button>
            </div>
        </motion.div>
    );
}
