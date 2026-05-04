'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';

function ForgotPasswordContent() {
    const searchParams = useSearchParams();
    const [email, setEmail] = React.useState('');
    const [fieldError, setFieldError] = React.useState<string | null>(null);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);

    React.useEffect(() => {
        const error = searchParams.get('error');
        if (error) setFormError(error);
    }, [searchParams]);

    function validate(): boolean {
        const value = email.trim();
        if (!value) {
            setFieldError('Please enter your email address.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            setFieldError('Enter a valid email address.');
            return false;
        }

        setFieldError(null);
        return true;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setFieldError(null);
        setFormError(null);

        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            setIsSuccess(true);
        } catch (err) {
            setFormError(
                err instanceof Error ? err.message : 'Failed to send reset link. Please try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col px-6 py-6 lg:py-12 lg:px-24 bg-white relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full mx-auto"
                >
                    <div className="mb-10">
                        <BrandLogo />
                    </div>

                    <h2 className="text-4xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                    <p className="text-slate-500 mb-10">
                        Enter your registered email address. We&apos;ll send you a secure reset
                        link.
                    </p>

                    {isSuccess ? (
                        <div className="space-y-6">
                            <p className="text-sm text-emerald-700 font-medium bg-emerald-50 px-4 py-3 rounded-2xl">
                                A password reset link has been sent to your email address. Please
                                check your inbox.
                            </p>
                            <Link
                                href="/login"
                                className="w-full py-5 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 hover:shadow-brand-200 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 group"
                            >
                                Back to Login
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${
                                            fieldError
                                                ? 'border-red-500'
                                                : 'border-slate-200 focus:border-brand-500'
                                        }`}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                                {fieldError && (
                                    <p className="text-xs text-red-500 font-medium ml-1">
                                        {fieldError}
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
                                        Sending reset link...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-10 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 underline decoration-2 underline-offset-4"
                        >
                            <span aria-hidden="true">←</span>
                            Back to Login
                        </Link>
                    </div>
                </motion.div>
            </div>

            <AuthVisualPanel
                title={
                    <>
                        Secure Account{' '}
                        <span className="text-brand-500">Recovery.</span>
                    </>
                }
                description="We'll help you get back into BacancyTeleCare safely. Reset your password and continue your care journey without missing a beat."
                imageSrc="/auth-forgot.svg"
                imageAlt="Padlock with floating key — recovering your account"
            />
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <React.Suspense fallback={null}>
            <ForgotPasswordContent />
        </React.Suspense>
    );
}
