'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';
import { BackToHomeLink } from '@/components/BackToHomeLink';
import {
    FORM_CONTROL_LEADING_ICON,
    FORM_AUTH_PRIMARY_BUTTON,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';

/** Allow redirect after login only to these prefixes (avoid open redirect). */
const ALLOWED_REDIRECT_PREFIXES = ['/patient/', '/doctor/', '/admin/', '/doctors'];

function isSafeRedirect(path: string | null): path is string {
    if (!path || !path.startsWith('/')) return false;
    return ALLOWED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default function LoginPage() {
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
            // Full navigation so the auth cookie is always visible to middleware on the next request
            // (client-side router transitions can race cookie persistence on some setups).
            window.location.assign(redirectTo);
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
            <div className="min-h-screen lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:overflow-hidden bg-slate-50 flex flex-col lg:flex-row">
                {/* Left Side - Form */}
                <div className="flex-1 flex flex-col min-h-0 px-6 py-6 lg:py-12 lg:px-24 bg-white relative lg:overflow-y-auto">
                    {/* Mobile top bar */}
                    <div className="flex items-center justify-between lg:hidden mb-6 shrink-0">
                        <BackToHomeLink className="lg:hidden">Back</BackToHomeLink>
                        <BrandLogo />
                    </div>

                    {/* Desktop back button */}
                    <BackToHomeLink desktopFixed>Back to home</BackToHomeLink>

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

                            <h2 className="text-3xl font-bold text-slate-900 mb-2">
                                Welcome Back!
                            </h2>
                            <p className="text-slate-500 mb-10">
                                Enter your account details to access BacancyTeleCare.
                            </p>

                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                                noValidate
                                autoComplete="off"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Email or Mobile Number
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="name@example.com or 9876543210"
                                            className={`${FORM_CONTROL_LEADING_ICON} ${
                                                errors.identifier
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                                    : ''
                                            }`}
                                            {...NO_BROWSER_INPUT_HELPERS}
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
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className={`${FORM_CONTROL_LEADING_ICON} ${
                                                errors.password
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                                    : ''
                                            }`}
                                            {...NO_BROWSER_INPUT_HELPERS}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    {errors.password && (
                                        <p className="text-xs text-red-500 font-medium ml-1">
                                            {errors.password}
                                        </p>
                                    )}
                                    <div className="flex justify-end">
                                        <Link
                                            href="/forgot-password"
                                            title="Forgot password?"
                                            className="text-brand-600 font-bold hover:text-brand-700"
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
                                    className={`${FORM_AUTH_PRIMARY_BUTTON} flex group`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Logging in...
                                        </>
                                    ) : (
                                        <>
                                            Login
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="mt-10 text-center space-y-4">
                                <p className="text-slate-500 font-medium">
                                    Don&apos;t have an account?
                                    <Link
                                        href="/signup"
                                        className="ml-2 text-brand-600 font-bold hover:text-brand-700"
                                    >
                                        Register
                                    </Link>
                                </p>
                                <p className="text-xs text-slate-400">
                                    <Link
                                        href="/privacy"
                                        className="hover:text-slate-600 underline-offset-2 hover:underline"
                                    >
                                        Privacy Policy
                                    </Link>
                                    <span className="mx-2 text-slate-300" aria-hidden>
                                        ·
                                    </span>
                                    <Link
                                        href="/terms"
                                        className="hover:text-slate-600 underline-offset-2 hover:underline"
                                    >
                                        Terms &amp; Conditions
                                    </Link>
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                <AuthVisualPanel
                    landingAligned
                    title={
                        <>
                            Your Health, <span className="text-brand-500">Our Priority.</span>
                        </>
                    }
                    description="Experience the future of healthcare with BacancyTeleCare. Connect with verified specialists, manage prescriptions, and access your records, all in one place."
                    imageSrc="/auth-login.svg"
                    imageAlt="Friendly doctor waving, welcome back"
                />
            </div>
        </React.Suspense>
    );
}
