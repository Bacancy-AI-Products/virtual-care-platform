'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, Mail, Lock, User, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

const COUNTRY_OPTIONS = [
    '+1 (USA)',
    '+65 (SGP)',
    '+63 (PHL)',
    '+60 (MYS)',
    '+62 (IDN)',
    '+55 (BRA)',
    '+52 (MEX)',
    '+54 (ARG)',
    '+56 (CHL)',
    '+84 (VNM)',
    '+971 (UAE)',
    '+965 (KW)',
    '+255 (TZA)',
    '+973 (BH)',
    '+966 (SA)',
    '+91 (IND)',
];

export default function SignupPage() {
    const router = useRouter();
    const [role, setRole] = React.useState<'patient' | 'doctor'>('patient');

    const [fullName, setFullName] = React.useState('');
    const [countryCode, setCountryCode] = React.useState('+1 (USA)');
    const [mobile, setMobile] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [errors, setErrors] = React.useState<{
        fullName?: string;
        mobile?: string;
        email?: string;
        password?: string;
    }>({});
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [formError, setFormError] = React.useState<string | null>(null);

    const validate = () => {
        const newErrors: {
            fullName?: string;
            mobile?: string;
            email?: string;
            password?: string;
        } = {};

        if (!fullName.trim()) {
            newErrors.fullName = 'Please enter your full name.';
        } else if (fullName.trim().length < 2) {
            newErrors.fullName = 'Name must be at least 2 characters.';
        }

        if (!mobile.trim()) {
            newErrors.mobile = 'Please enter your mobile number.';
        } else if (!/^\d{10}$/.test(mobile.trim())) {
            newErrors.mobile = 'Enter a valid 10-digit mobile number.';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                newErrors.email = 'Enter a valid email address.';
            }
        }

        if (!password) {
            newErrors.password = 'Please create a password.';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setFormError(null);
        try {
            const result = await authApi.signup({
                name: fullName.trim(),
                email: email.trim(),
                password,
                role: role === 'doctor' ? 'DOCTOR' : 'PATIENT',
            });
            login(result.token, result.user);
            router.push(`/${result.user.role.toLowerCase()}/dashboard`);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 bg-white relative overflow-hidden">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-semibold group mb-6 sm:mb-8 lg:mb-0 lg:absolute lg:top-8 lg:left-8"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full mx-auto"
                >
                    <div className="flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-100">
                            <Stethoscope className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">
                            TeleCare
                        </span>
                    </div>

                    <h2 className="text-4xl font-bold text-slate-900 mb-2">Join TeleCare</h2>
                    <p className="text-slate-500 mb-10">
                        Create your account and get started with secure online consultations.
                    </p>

                    {/* Role Switcher (Patient / Doctor only) */}
                    <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                        <button
                            type="button"
                            onClick={() => setRole('patient')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                role === 'patient'
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('doctor')}
                            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                role === 'doctor'
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Doctor
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">
                                Full Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                        errors.fullName
                                            ? 'border-red-500'
                                            : 'border-transparent focus:border-brand-500'
                                    }`}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            {errors.fullName && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    {errors.fullName}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">
                                Mobile Number
                            </label>
                            <div className="flex gap-3">
                                <div className="w-40">
                                    <select
                                        className="w-full min-h-[58px] h-full px-3 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none text-sm font-medium text-slate-700"
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                    >
                                        {COUNTRY_OPTIONS.map((code) => (
                                            <option key={code} value={code}>
                                                {code}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 relative group">
                                    <input
                                        type="tel"
                                        placeholder="10-digit mobile number"
                                        className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                            errors.mobile
                                                ? 'border-red-500'
                                                : 'border-transparent focus:border-brand-500'
                                        }`}
                                        value={mobile}
                                        onChange={(e) =>
                                            setMobile(e.target.value.replace(/\D/g, ''))
                                        }
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            {errors.mobile && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    {errors.mobile}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">
                                Email Address (optional)
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                        errors.email
                                            ? 'border-red-500'
                                            : 'border-transparent focus:border-brand-500'
                                    }`}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">
                                Create Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Minimum 8 characters"
                                    className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                        errors.password
                                            ? 'border-red-500'
                                            : 'border-transparent focus:border-brand-500'
                                    }`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 font-medium ml-1">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {formError && (
                            <p className="text-sm text-red-500 font-medium text-center bg-red-50 px-4 py-3 rounded-2xl">
                                {formError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 hover:shadow-brand-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 font-medium">
                            Already have an account?
                            <Link
                                href="/login"
                                className="ml-2 text-brand-600 font-bold hover:text-brand-700 underline decoration-2 underline-offset-4"
                            >
                                Log In
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex flex-1 bg-brand-600 relative overflow-hidden items-center justify-center p-24">
                <div className="relative z-10 max-w-lg text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center mx-auto mb-12 border border-white/30">
                            <Stethoscope className="text-white w-12 h-12" />
                        </div>
                        <h3 className="text-5xl font-bold text-white mb-8 leading-tight">
                            Your Health, Our Priority.
                        </h3>
                        <p className="text-xl text-brand-100 leading-relaxed">
                            Experience the future of healthcare with TeleCare. Connect with experts
                            in minutes and manage your health records seamlessly.
                        </p>
                    </motion.div>
                </div>

                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>
        </div>
    );
}
