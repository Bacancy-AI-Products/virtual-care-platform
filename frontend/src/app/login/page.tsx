'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';

/** Allow redirect after login only to these prefixes (avoid open redirect). */
const ALLOWED_REDIRECT_PREFIXES = ['/patient/', '/doctor/', '/admin/', '/doctors'];

function isSafeRedirect(path: string | null): path is string {
    if (!path || !path.startsWith('/')) return false;
    return ALLOWED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from');

    const { login } = useAuth();
    const [identifier, setIdentifier] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [errors, setErrors] = React.useState<{
        identifier?: string;
        password?: string;
        form?: string;
    }>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const validate = () => {
        const newErrors: { identifier?: string; password?: string } = {};

        if (!identifier.trim()) {
            newErrors.identifier = 'Please enter your email or mobile number.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10}$/;
            if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
                newErrors.identifier = 'Enter a valid email address or 10-digit mobile number.';
            }
        }

        if (!password) {
            newErrors.password = 'Please enter your password.';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setErrors({});
        try {
            const result = await authApi.login(identifier.trim(), password);
            login(result.token, result.user);
            const redirectTo = isSafeRedirect(from)
                ? from
                : `/${result.user.role.toLowerCase()}/dashboard`;
            router.push(redirectTo);
        } catch (err) {
            setErrors({
                form: err instanceof Error ? err.message : 'Login failed. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <React.Suspense fallback={null}>
            <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
                {/* Left Side - Form */}
                <div className="flex-1 flex flex-col px-6 py-6 lg:py-12 lg:px-24 bg-white relative overflow-hidden">
                    {/* Mobile top bar */}
                    <div className="flex items-center justify-between lg:hidden mb-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-semibold group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Back
                        </Link>
                        <BrandLogo />
                    </div>

                    {/* Desktop back button */}
                    <Link
                        href="/"
                        className="hidden lg:flex absolute top-8 left-8 items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-semibold group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>

                    <div className="flex-1 flex flex-col justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="max-w-md w-full mx-auto"
                        >
                            {/* Desktop BrandLogo */}
                            <div className="hidden lg:flex mb-10">
                                <BrandLogo />
                            </div>

                            <h2 className="text-4xl font-bold text-slate-900 mb-2">
                                Welcome Back!
                            </h2>
                            <p className="text-slate-500 mb-10">
                                Enter your account details to access BacancyTeleCare.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Email or Mobile Number
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="name@example.com or 9876543210"
                                            className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                                errors.identifier
                                                    ? 'border-red-500'
                                                    : 'border-slate-200 focus:border-brand-500'
                                            }`}
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                        />
                                    </div>
                                    {errors.identifier && (
                                        <p className="text-xs text-red-500 font-medium ml-1">
                                            {errors.identifier}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-sm font-bold text-slate-700">
                                            Password
                                        </label>
                                        {/* Desktop: inline with label */}
                                        <Link
                                            href="/forgot-password"
                                            title="Forgot password?"
                                            className="hidden lg:inline text-base font-bold text-brand-600 hover:text-brand-700"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                                errors.password
                                                    ? 'border-red-500'
                                                    : 'border-slate-200 focus:border-brand-500'
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
                                    {/* Mobile/Tablet: below the input, right-aligned */}
                                    <div className="flex justify-end lg:hidden">
                                        <Link
                                            href="/forgot-password"
                                            title="Forgot password?"
                                            className="text-base font-bold text-brand-600 hover:text-brand-700 underline decoration-2 underline-offset-4"
                                        >
                                            Forgot Password?
                                        </Link>
                                    </div>
                                </div>

                                {errors.form && (
                                    <p className="text-sm text-red-500 font-medium text-center bg-red-50 px-4 py-3 rounded-2xl">
                                        {errors.form}
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
                                            Logging in...
                                        </>
                                    ) : (
                                        <>
                                            Login
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-10 text-center">
                                <p className="text-slate-500 font-medium">
                                    Don&apos;t have an account?
                                    <Link
                                        href="/signup"
                                        className="ml-2 text-brand-600 font-bold hover:text-brand-700 underline decoration-2 underline-offset-4"
                                    >
                                        Register
                                    </Link>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <AuthVisualPanel
                    title={
                        <>
                            Your Health,{' '}
                            <span className="text-brand-500">Our Priority.</span>
                        </>
                    }
                    description="Experience the future of healthcare with BacancyTeleCare. Connect with verified specialists, manage prescriptions, and access your records — all in one place."
                    imageSrc="/auth-login.svg"
                    imageAlt="Friendly doctor waving — welcome back"
                />
            </div>
        </React.Suspense>
    );
}
