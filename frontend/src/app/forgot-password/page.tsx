'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { BrandLogo } from '@/components/BrandLogo';
import { BackNavLink } from '@/components/BackToHomeLink';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';
import {
    FORM_CONTROL_LEADING_ICON,
    FORM_AUTH_PRIMARY_BUTTON,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';

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
        <div className="min-h-screen lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:overflow-hidden bg-slate-50 flex flex-col lg:flex-row">
            {/* Left Side - Form */}
            <div className="flex-1 flex flex-col min-h-0 px-6 py-6 lg:py-12 lg:px-24 bg-white relative lg:overflow-y-auto">
                <div className="flex-1 flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-md w-full mx-auto"
                    >
                        <div className="mb-10">
                            <BrandLogo href="/" />
                        </div>

                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                        <p className="text-slate-500 mb-10">
                            Enter your registered email address. We&apos;ll send you a secure reset
                            link.
                        </p>

                        {isSuccess ? (
                            <div className="space-y-6">
                                <p className="text-sm text-emerald-700 font-medium bg-emerald-50 px-4 py-3 rounded-2xl">
                                    A password reset link has been sent to your email address.
                                    Please check your inbox.
                                </p>
                                <Link
                                    href="/login"
                                    className={`${FORM_AUTH_PRIMARY_BUTTON} inline-flex group`}
                                >
                                    Back to Login
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-4"
                                noValidate
                                autoComplete="off"
                            >
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input
                                            type="email"
                                            placeholder="name@example.com"
                                            className={`${FORM_CONTROL_LEADING_ICON} ${
                                                fieldError
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                                    : ''
                                            }`}
                                            {...NO_BROWSER_INPUT_HELPERS}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
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
                                    className={`${FORM_AUTH_PRIMARY_BUTTON} flex group`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending reset link...
                                        </>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="mt-10 text-center space-y-4">
                            <BackNavLink href="/login">Back to login</BackNavLink>
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
                        Secure Account <span className="text-brand-500">Recovery.</span>
                    </>
                }
                description="We'll help you get back into BacancyTeleCare safely. Reset your password and continue your care journey without missing a beat."
                imageSrc="/auth-forgot.svg"
                imageAlt="Padlock with floating key, recovering your account"
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
