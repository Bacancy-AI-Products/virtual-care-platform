'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Lock, User, Stethoscope, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import clsx from 'clsx';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthVisualPanel } from '@/components/AuthVisualPanel';
import { BackToHomeLink } from '@/components/BackToHomeLink';
import {
    FORM_CONTROL_CLASS,
    FORM_CONTROL_LEADING_ICON,
    FORM_SELECT_CLASS,
    FORM_AUTH_PRIMARY_BUTTON,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';

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

const ROLE_TOGGLE_SPRING = {
    type: 'spring' as const,
    stiffness: 520,
    damping: 30,
    mass: 0.72,
};

export default function SignupPage() {
    const prefersReducedMotion = useReducedMotion();
    const toggleTransition = prefersReducedMotion ? { duration: 0 } : ROLE_TOGGLE_SPRING;
    const [role, setRole] = React.useState<'patient' | 'doctor'>('patient');
    const prevRoleRef = React.useRef<'patient' | 'doctor' | null>(null);
    const [toggleBurstId, setToggleBurstId] = React.useState(0);

    React.useEffect(() => {
        if (prevRoleRef.current !== null && prevRoleRef.current !== role) {
            setToggleBurstId((n) => n + 1);
        }
        prevRoleRef.current = role;
    }, [role]);

    const pillInnerKey =
        prefersReducedMotion || toggleBurstId === 0 ? 'pill-static' : `burst-${toggleBurstId}`;

    /** Replay icon nudge when burst or segment identity changes */
    const patientIconKey = `patient-icon-${toggleBurstId}-${role}`;
    const doctorIconKey = `doctor-icon-${toggleBurstId}-${role}`;
    const iconNudgeTransition =
        prefersReducedMotion || toggleBurstId === 0
            ? { duration: 0 }
            : {
                  duration: 0.42,
                  times: [0, 0.28, 0.62, 1],
                  ease: [0.22, 1, 0.36, 1] as const,
              };

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
            window.location.assign(`/${result.user.role.toLowerCase()}/dashboard`);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
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
                            Join BacancyTeleCare
                        </h2>
                        <p className="text-slate-500 mb-10">
                            Create your account and get started with secure online consultations.
                        </p>

                        {/* Role: patient / doctor - segmented control with sliding indicator */}
                        <div className="mb-6 flex flex-col items-center gap-2">
                            <div
                                role="group"
                                aria-label="Sign up as patient or doctor"
                                className="relative grid w-max min-w-[10.75rem] grid-cols-2 gap-0.5 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 p-1 shadow-sm"
                            >
                                <AnimatePresence initial={false}>
                                    {!prefersReducedMotion && toggleBurstId > 0 ? (
                                        <motion.div
                                            key={toggleBurstId}
                                            aria-hidden
                                            className="pointer-events-none absolute inset-0 z-[1] rounded-[10px] bg-brand-400/25"
                                            initial={{ opacity: 0.55, scale: 0.88 }}
                                            animate={{ opacity: 0, scale: 1.12 }}
                                            transition={{
                                                duration: 0.6,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                        />
                                    ) : null}
                                </AnimatePresence>
                                <motion.div
                                    aria-hidden
                                    layout={false}
                                    initial={false}
                                    className="pointer-events-none absolute inset-y-1 left-1 z-[2] w-[calc(50%-5px)]"
                                    animate={{
                                        x: role === 'patient' ? 0 : 'calc(100% + 0.125rem)',
                                    }}
                                    transition={toggleTransition}
                                >
                                    <motion.div
                                        key={pillInnerKey}
                                        className="h-full w-full rounded-lg bg-brand-500 shadow-md shadow-brand-500/25"
                                        initial={
                                            prefersReducedMotion || toggleBurstId === 0
                                                ? false
                                                : { scale: 0.82, opacity: 0.88 }
                                        }
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={
                                            prefersReducedMotion
                                                ? { duration: 0 }
                                                : toggleBurstId === 0
                                                  ? { duration: 0 }
                                                  : {
                                                        type: 'spring',
                                                        stiffness: 580,
                                                        damping: 22,
                                                    }
                                        }
                                    />
                                </motion.div>
                                <motion.button
                                    type="button"
                                    aria-pressed={role === 'patient'}
                                    onClick={() => setRole('patient')}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 600,
                                        damping: 28,
                                    }}
                                    className={clsx(
                                        'relative z-10 flex min-w-[5rem] cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2',
                                        role === 'patient'
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    <motion.span
                                        key={patientIconKey}
                                        aria-hidden
                                        initial={false}
                                        animate={{
                                            scale: role === 'patient' ? 1.08 : 1,
                                            opacity: role === 'patient' ? 1 : 0.82,
                                            rotate:
                                                prefersReducedMotion ||
                                                toggleBurstId === 0 ||
                                                role !== 'patient'
                                                    ? 0
                                                    : [0, -3.5, 3.5, 0],
                                        }}
                                        transition={{
                                            scale: toggleTransition,
                                            opacity: toggleTransition,
                                            rotate: iconNudgeTransition,
                                        }}
                                        className="inline-flex origin-center"
                                    >
                                        <User className="size-3 shrink-0" />
                                    </motion.span>
                                    Patient
                                </motion.button>
                                <motion.button
                                    type="button"
                                    aria-pressed={role === 'doctor'}
                                    onClick={() => setRole('doctor')}
                                    whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 600,
                                        damping: 28,
                                    }}
                                    className={clsx(
                                        'relative z-10 flex min-w-[5rem] cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2',
                                        role === 'doctor'
                                            ? 'text-white'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                >
                                    <motion.span
                                        key={doctorIconKey}
                                        aria-hidden
                                        initial={false}
                                        animate={{
                                            scale: role === 'doctor' ? 1.08 : 1,
                                            opacity: role === 'doctor' ? 1 : 0.82,
                                            rotate:
                                                prefersReducedMotion ||
                                                toggleBurstId === 0 ||
                                                role !== 'doctor'
                                                    ? 0
                                                    : [0, 3.5, -3.5, 0],
                                        }}
                                        transition={{
                                            scale: toggleTransition,
                                            opacity: toggleTransition,
                                            rotate: iconNudgeTransition,
                                        }}
                                        className="inline-flex origin-center"
                                    >
                                        <Stethoscope className="size-3 shrink-0" />
                                    </motion.span>
                                    Doctor
                                </motion.button>
                            </div>
                            <p className="sr-only" aria-live="polite" aria-atomic="true">
                                {role === 'patient'
                                    ? 'Patient account selected.'
                                    : 'Healthcare provider account selected.'}
                            </p>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.p
                                    key={role}
                                    role="status"
                                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                                    transition={
                                        prefersReducedMotion
                                            ? { duration: 0 }
                                            : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                                    }
                                    className="max-w-sm text-center text-xs font-medium leading-snug text-slate-500"
                                >
                                    {role === 'patient'
                                        ? 'Book visits, manage records, and message your care team.'
                                        : 'Deliver consultations, availability, and prescriptions in one place.'}
                                </motion.p>
                            </AnimatePresence>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-4"
                            noValidate
                            autoComplete="off"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className={clsx(
                                            FORM_CONTROL_LEADING_ICON,
                                            errors.fullName &&
                                                'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                        )}
                                        {...NO_BROWSER_INPUT_HELPERS}
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
                                            className={clsx(
                                                FORM_SELECT_CLASS,
                                                'h-auto text-slate-700',
                                            )}
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
                                            className={clsx(
                                                FORM_CONTROL_CLASS,
                                                errors.mobile &&
                                                    'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                            )}
                                            {...NO_BROWSER_INPUT_HELPERS}
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
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        className={clsx(
                                            FORM_CONTROL_LEADING_ICON,
                                            errors.email &&
                                                'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                        )}
                                        {...NO_BROWSER_INPUT_HELPERS}
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
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        className={clsx(
                                            FORM_CONTROL_LEADING_ICON,
                                            errors.password &&
                                                'border-red-500 focus:border-red-500 focus:ring-red-500/15',
                                        )}
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
                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center space-y-4">
                            <p className="text-slate-500 font-medium">
                                Already have an account?
                                <Link
                                    href="/login"
                                    className="ml-2 text-brand-600 font-bold hover:text-brand-700"
                                >
                                    Log In
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
                        Start Your <span className="text-brand-500">Care Journey.</span>
                    </>
                }
                description="Create your BacancyTeleCare account in minutes: book consultations, manage prescriptions, and connect with verified specialists from anywhere."
                imageSrc="/auth-signup.svg"
                imageAlt="Onboarding checklist, building your profile"
            />
        </div>
    );
}
