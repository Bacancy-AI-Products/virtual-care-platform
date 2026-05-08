'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { authApi } from '@/services/api';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';
import { BackNavLink } from '@/components/BackToHomeLink';
import {
    FORM_CONTROL_TRAILING_SLOT,
    FORM_AUTH_PRIMARY_BUTTON,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';

const PASSWORD_MAX_LENGTH = 128;

function getPasswordChecks(password: string) {
    return {
        minLength: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
        maxLength: password.length <= PASSWORD_MAX_LENGTH,
    };
}

function getStrengthLevel(password: string): {
    label: 'Weak' | 'Fair' | 'Good' | 'Strong';
    activeBars: number;
    barClassName: string;
    textClassName: string;
} {
    const checks = getPasswordChecks(password);
    const score =
        Number(checks.minLength) +
        Number(checks.uppercase) +
        Number(checks.lowercase) +
        Number(checks.number) +
        Number(checks.special);

    if (score >= 5) {
        return {
            label: 'Strong',
            activeBars: 4,
            barClassName: 'bg-emerald-500',
            textClassName: 'text-emerald-600',
        };
    }
    if (score === 4) {
        return {
            label: 'Good',
            activeBars: 3,
            barClassName: 'bg-sky-500',
            textClassName: 'text-sky-600',
        };
    }
    if (score === 3) {
        return {
            label: 'Fair',
            activeBars: 2,
            barClassName: 'bg-orange-500',
            textClassName: 'text-orange-600',
        };
    }
    return {
        label: 'Weak',
        activeBars: password ? 1 : 0,
        barClassName: 'bg-red-500',
        textClassName: 'text-red-600',
    };
}

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [errors, setErrors] = React.useState<{
        newPassword?: string;
        confirmPassword?: string;
        form?: string;
    }>({});
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);

    const passwordChecks = React.useMemo(() => getPasswordChecks(newPassword), [newPassword]);
    const strength = React.useMemo(() => getStrengthLevel(newPassword), [newPassword]);

    function validate(): boolean {
        const nextErrors: {
            newPassword?: string;
            confirmPassword?: string;
        } = {};

        if (!newPassword) {
            nextErrors.newPassword = 'New password is required.';
        } else if (!passwordChecks.maxLength) {
            nextErrors.newPassword = 'Must be less than 128 characters.';
        } else if (!passwordChecks.minLength) {
            nextErrors.newPassword = 'Must be at least 8 characters.';
        } else if (!passwordChecks.uppercase) {
            nextErrors.newPassword = 'Must contain at least one uppercase letter.';
        } else if (!passwordChecks.lowercase) {
            nextErrors.newPassword = 'Must contain at least one lowercase letter.';
        } else if (!passwordChecks.number) {
            nextErrors.newPassword = 'Must contain at least one number.';
        } else if (!passwordChecks.special) {
            nextErrors.newPassword = 'Must contain at least one special character.';
        }

        if (!confirmPassword) {
            nextErrors.confirmPassword = 'Please confirm your password.';
        } else if (confirmPassword !== newPassword) {
            nextErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!validate()) return;
        if (!token) {
            setErrors({
                form: 'Reset token is missing. Please use the reset link from your email.',
            });
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            await authApi.resetPassword(token, newPassword);
            setIsSuccess(true);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
            setErrors({ form: message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen lg:min-h-0 lg:h-dvh lg:max-h-dvh lg:overflow-hidden bg-slate-50 flex flex-col lg:flex-row">
            <div className="flex-1 flex flex-col min-h-0 px-6 py-6 lg:py-12 lg:px-24 bg-white relative lg:overflow-y-auto">
                <div className="flex-1 flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-md w-full mx-auto"
                    >
                        <div className="mb-10">
                            <BrandLogo />
                        </div>

                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Reset Password</h2>
                        <p className="text-slate-500 mb-10">Enter your new password below.</p>

                        {isSuccess ? (
                            <div className="space-y-6">
                                <p className="text-sm text-emerald-700 font-medium bg-emerald-50 px-4 py-3 rounded-2xl">
                                    Your password has been reset successfully! You can now log in
                                    with your new password.
                                </p>
                                <Link
                                    href="/login"
                                    className={`${FORM_AUTH_PRIMARY_BUTTON} inline-flex group`}
                                >
                                    Go to Login
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
                                        New Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            placeholder="Minimum 8 characters"
                                            disabled={isSubmitting}
                                            className={`${FORM_CONTROL_TRAILING_SLOT} ${
                                                errors.newPassword
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                                    : ''
                                            }`}
                                            {...NO_BROWSER_INPUT_HELPERS}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-500 transition-colors"
                                            aria-label={
                                                showNewPassword ? 'Hide password' : 'Show password'
                                            }
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                Password Strength
                                            </span>
                                            <span
                                                className={`text-xs font-bold ${strength.textClassName}`}
                                            >
                                                {strength.label}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[0, 1, 2, 3].map((index) => (
                                                <div
                                                    key={index}
                                                    className={`h-2 rounded-full ${
                                                        index < strength.activeBars
                                                            ? strength.barClassName
                                                            : 'bg-slate-200'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2">
                                        <p
                                            className={`text-xs font-medium ${
                                                passwordChecks.minLength
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {passwordChecks.minLength ? '✓' : '✕'} At least 8
                                            characters
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${
                                                passwordChecks.uppercase
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {passwordChecks.uppercase ? '✓' : '✕'} One uppercase
                                            letter
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${
                                                passwordChecks.lowercase
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {passwordChecks.lowercase ? '✓' : '✕'} One lowercase
                                            letter
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${
                                                passwordChecks.number
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {passwordChecks.number ? '✓' : '✕'} One number
                                        </p>
                                        <p
                                            className={`text-xs font-medium ${
                                                passwordChecks.special
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-500'
                                            }`}
                                        >
                                            {passwordChecks.special ? '✓' : '✕'} One special
                                            character
                                        </p>
                                    </div>

                                    {errors.newPassword && (
                                        <p className="text-xs text-red-500 font-medium ml-1">
                                            {errors.newPassword}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder="Re-enter your password"
                                            disabled={isSubmitting}
                                            className={`${FORM_CONTROL_TRAILING_SLOT} ${
                                                errors.confirmPassword
                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15'
                                                    : ''
                                            }`}
                                            {...NO_BROWSER_INPUT_HELPERS}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-500 transition-colors"
                                            aria-label={
                                                showConfirmPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-red-500 font-medium ml-1">
                                            {errors.confirmPassword}
                                        </p>
                                    )}
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
                                            Resetting password...
                                        </>
                                    ) : (
                                        <>
                                            Reset Password
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
                        Set a <span className="text-brand-500">New Password.</span>
                    </>
                }
                description="Create a strong password to secure your BacancyTeleCare account and continue safely. Your data stays encrypted at every step."
                imageSrc="/auth-reset.svg"
                imageAlt="Locked padlock with success check and password strength meter"
            />
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <React.Suspense fallback={null}>
            <ResetPasswordContent />
        </React.Suspense>
    );
}
