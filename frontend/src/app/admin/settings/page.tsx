'use client';

import React from 'react';
import { Shield, Bell, Database, Globe, Lock, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const SettingItem = ({
    icon: Icon,
    label,
    description,
    color,
}: {
    icon: React.ElementType;
    label: string;
    description: string;
    color: string;
}) => (
    <div
        aria-disabled="true"
        className="w-full flex items-center justify-between p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm cursor-not-allowed opacity-90"
    >
        <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h4 className="font-bold text-slate-900">{label}</h4>
                <p className="text-sm text-slate-500 font-medium">{description}</p>
            </div>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
            Coming soon
        </span>
    </div>
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
                <h2 className="mb-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    Platform Settings
                </h2>
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

            <div className="bg-brand-50 p-8 rounded-[32px] border border-brand-100 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100">
                        <CheckCircle2 className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">System status: healthy</h4>
                        <p className="text-sm text-slate-500 font-medium">
                            All services are running normally.
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-full uppercase tracking-widest border border-brand-100 whitespace-nowrap">
                    Coming soon
                </span>
            </div>
        </motion.div>
    );
}
