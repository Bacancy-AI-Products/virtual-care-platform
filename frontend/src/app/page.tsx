'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Stethoscope,
    Shield,
    Clock,
    Video,
    ArrowRight,
    Users,
    Calendar,
    FileText,
    Search,
    MapPin,
    Building2,
    ChevronDown,
    BadgeCheck,
    Lock,
    UserCog,
    ShieldCheck,
    KeyRound,
    Check,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, type SpecializationOption } from '@/services/api';
import { getStates, getCities } from '@/constants/us-locations';
import { PublicHeader } from '@/components/PublicHeader';
import { BrandLogo } from '@/components/BrandLogo';
import { HowItWorksJourneyArt, SpecialtyChipGlyph, specializationIdToGlyphKind } from '@/components/landing/LandingSectionSvgs';

const FeatureCard = ({
    icon: Icon,
    title,
    description,
}: {
    icon: any;
    title: string;
    description: string;
}) => (
    <div className="relative overflow-hidden p-8 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-medical-soft/40 shadow-md shadow-slate-200/40 hover:shadow-xl hover:shadow-brand-100/30 hover:-translate-y-2 transition-all duration-300 group text-center sm:text-left ring-1 ring-white/80">
        <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500 opacity-90 sm:block hidden"
            aria-hidden
        />
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-medical-teal/[0.06] blur-2xl" aria-hidden />
        <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-medical-soft rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 ring-1 ring-brand-100/80 group-hover:from-brand-500 group-hover:to-brand-600 transition-all duration-300">
            <Icon className="w-7 h-7 text-brand-600 group-hover:text-white transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
);

function HeroHighlights() {
    const items = [
        'Search verified doctors by specialty and city, even before you create an account.',
        'Book HD video visits, manage appointments, and follow digital prescriptions in one place.',
        'Separate secure workspaces for patients and doctors, with encryption and access controls.',
    ];
    return (
        <ul className="mb-6 max-w-lg space-y-2.5 sm:mb-7" aria-label="What you can do on BacancyTeleCare">
            {items.map((text) => (
                <li
                    key={text}
                    className="flex gap-2.5 text-sm leading-snug text-slate-600 sm:text-[15px]"
                >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-medical-soft text-medical-teal ring-1 ring-teal-100/80">
                        <Check className="h-3 w-3 shrink-0 stroke-[2.5]" aria-hidden />
                    </span>
                    <span>{text}</span>
                </li>
            ))}
        </ul>
    );
}

function TrustStatsStrip() {
    const items = [
        {
            icon: BadgeCheck,
            title: 'Verified clinicians',
            subtitle: 'Credentials reviewed on platform',
        },
        {
            icon: Shield,
            title: 'Privacy-first',
            subtitle: 'Encrypted visits & records',
        },
        {
            icon: Clock,
            title: 'Flexible hours',
            subtitle: 'Book slots that fit you',
        },
    ];
    return (
        <section className="relative border-y border-slate-200/70 bg-white/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255)_0%,rgb(240_253_250_/_0.5)_50%,rgb(255_255_255)_100%)]" aria-hidden />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
                    {items.map(({ icon: Icon, title, subtitle }) => (
                        <div
                            key={title}
                            className="flex flex-row items-center gap-4 rounded-2xl border border-slate-100/90 bg-white/90 p-4 shadow-sm shadow-slate-200/30"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-medical-soft text-brand-600 ring-1 ring-brand-100/80">
                                <Icon className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">{title}</p>
                                <p className="mt-0.5 text-xs text-slate-600 leading-snug">{subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/** Hero compliance / trust pills — keep wording aligned with actual product capabilities. */
function HeroCompliancePills() {
    const pills = [
        { icon: Shield, label: 'HIPAA-aligned safeguards' },
        { icon: Lock, label: 'Encryption in transit' },
        { icon: UserCog, label: 'Role-based access' },
        { icon: ShieldCheck, label: 'Secure sessions' },
        { icon: KeyRound, label: 'MFA available' },
    ];
    return (
        <ul
            className="mt-6 sm:mt-7 flex flex-wrap gap-2 sm:gap-2.5 max-w-lg"
            aria-label="Security and compliance highlights"
        >
            {pills.map(({ icon: Icon, label }) => (
                <li key={label}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm shadow-slate-200/25 ring-1 ring-white/80 sm:text-xs">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-medical-teal" aria-hidden />
                        {label}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function WhoItsForSection() {
    const ctaButtonClass =
        'inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-200/40 transition-all hover:from-brand-600 hover:to-brand-700 sm:w-auto';
    const roles = [
        {
            icon: Users,
            title: 'Patients',
            bullets: [
                'Book video visits with verified specialists',
                'Access health records and digital prescriptions',
                'Request appointments that fit your schedule',
            ],
            href: '/signup',
            cta: 'Create an account',
            buttonClass: ctaButtonClass,
        },
        {
            icon: Stethoscope,
            title: 'Doctors',
            bullets: [
                'Manage availability and appointment requests',
                'Conduct secure video consultations',
                'Support patients with notes and prescriptions',
            ],
            href: '/doctor/dashboard',
            cta: 'Doctor workspace',
            buttonClass: ctaButtonClass,
        },
    ];
    return (
        <section
            className="relative py-16 sm:py-20 overflow-hidden bg-gradient-to-b from-white via-medical-soft/20 to-white"
            aria-labelledby="who-its-for-heading"
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.3] bg-[linear-gradient(to_right,rgb(148_163_184_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_0.06)_1px,transparent_1px)] bg-[size:48px_48px]"
                aria-hidden
            />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
                    <div className="flex justify-center mb-4">
                        <span className="h-1 w-12 rounded-full bg-gradient-to-r from-medical-teal to-brand-500" />
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 mb-2">
                        Built for everyone
                    </p>
                    <h2
                        id="who-its-for-heading"
                        className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4"
                    >
                        Who it&apos;s for
                    </h2>
                    <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                        Whether you&apos;re receiving care or providing it, BacancyTeleCare keeps
                        workflows simple and secure.
                    </p>
                </div>
                <div className="grid gap-6 sm:gap-8 md:grid-cols-2 md:max-w-4xl md:mx-auto">
                    {roles.map((r) => (
                        <div
                            key={r.title}
                            className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-medical-soft/35 p-8 shadow-md shadow-slate-200/35 ring-1 ring-white/80 transition-all duration-300 hover:shadow-xl hover:shadow-brand-100/25 hover:-translate-y-1"
                        >
                            <div
                                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500 opacity-90 sm:block hidden"
                                aria-hidden
                            />
                            <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-medical-soft rounded-2xl flex items-center justify-center mb-5 mx-auto md:mx-0 ring-1 ring-brand-100/80">
                                <r.icon className="w-7 h-7 text-brand-600" aria-hidden />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center md:text-left">
                                {r.title}
                            </h3>
                            <ul className="space-y-2.5 mb-6 flex-1 text-sm text-slate-600 leading-relaxed">
                                {r.bullets.map((line) => (
                                    <li key={line} className="flex gap-2">
                                        <Check
                                            className="h-4 w-4 shrink-0 text-medical-teal mt-0.5"
                                            aria-hidden
                                        />
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href={r.href} className={r.buttonClass}>
                                {r.cta}
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function HowItWorksSection() {
    const steps = [
        {
            step: '01',
            icon: Search,
            title: 'Search & compare',
            body: 'Filter by specialty and city to find the right doctor for you.',
        },
        {
            step: '02',
            icon: Calendar,
            title: 'Book in seconds',
            body: 'Pick a slot, confirm details, and get calendar-ready reminders.',
        },
        {
            step: '03',
            icon: Video,
            title: 'Consult from home',
            body: 'Join a secure video visit, review notes, and receive digital prescriptions.',
        },
    ];
    return (
        <section
            id="how-it-works"
            className="relative scroll-mt-24 pt-12 pb-16 sm:scroll-mt-28 sm:pt-14 sm:pb-20 overflow-hidden bg-gradient-to-b from-white via-slate-50/80 to-white"
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[linear-gradient(to_right,rgb(148_163_184_/_0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_0.07)_1px,transparent_1px)] bg-[size:56px_56px]"
                aria-hidden
            />
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
                    <div className="flex justify-center mb-4">
                        <span className="h-1 w-12 rounded-full bg-gradient-to-r from-medical-teal to-brand-500" />
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 mb-2">
                        Simple steps
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                        How BacancyTeleCare works
                    </h2>
                    <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                        A clear path from discovery to care, similar to leading health platforms, built
                        for speed and trust.
                    </p>
                </div>
                <HowItWorksJourneyArt className="mx-auto mb-8 hidden h-[72px] w-full max-w-3xl md:block lg:max-w-4xl lg:mb-10" />
                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                    {steps.map((s) => (
                        <div
                            key={s.step}
                            className="relative overflow-hidden p-8 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-medical-soft/40 shadow-md shadow-slate-200/40 hover:shadow-xl hover:shadow-brand-100/30 hover:-translate-y-2 transition-all duration-300 group text-center sm:text-left ring-1 ring-white/80"
                        >
                            <div
                                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500 opacity-90 sm:block hidden"
                                aria-hidden
                            />
                            <div
                                className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-medical-teal/[0.06] blur-2xl"
                                aria-hidden
                            />
                            <span className="mb-4 inline-block text-xs font-extrabold tracking-widest text-brand-500/90 sm:mb-5 md:hidden">
                                {s.step}
                            </span>
                            <div className="w-14 h-14 bg-gradient-to-br from-brand-50 to-medical-soft rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 ring-1 ring-brand-100/80 group-hover:from-brand-500 group-hover:to-brand-600 transition-all duration-300">
                                <s.icon
                                    className="w-7 h-7 text-brand-600 group-hover:text-white transition-colors duration-300"
                                    aria-hidden
                                />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function PopularSpecialtiesSection() {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['doctor', 'specializations', 'landing-chips'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const chips = React.useMemo(() => {
        const list = data?.data ?? [];
        return list.slice(0, 10);
    }, [data]);

    if (isError || (!isLoading && chips.length === 0)) return null;

    const chipVariants = {
        hidden: { opacity: 0, y: 14, scale: 0.96 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: 'spring', stiffness: 420, damping: 26 },
        },
    } as const;

    const chipListVariants = {
        hidden: {},
        show: {
            transition: { staggerChildren: 0.06, delayChildren: 0.08 },
        },
    } as const;

    return (
        <section className="relative py-14 sm:py-20 bg-gradient-to-b from-slate-50 to-white">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                <motion.div
                    className="mb-8 flex flex-col items-center gap-5 text-center sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:text-left"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="max-w-2xl sm:max-w-xl">
                        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 mb-2">
                            Explore care
                        </p>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Popular specialties
                        </h2>
                        <p className="text-slate-600 mt-2 max-w-xl mx-auto sm:mx-0 text-sm sm:text-[15px] leading-relaxed">
                            Jump straight into doctor listings. No account needed to browse.
                        </p>
                    </div>
                    <motion.div
                        whileHover={{ x: 2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    >
                        <Link
                            href="/doctors"
                            className="inline-flex items-center justify-center gap-2 text-sm font-bold text-brand-600 transition-colors hover:text-brand-700 shrink-0 max-sm:w-full max-sm:max-w-xs max-sm:rounded-full max-sm:border max-sm:border-slate-200/90 max-sm:bg-white max-sm:px-5 max-sm:py-2.5 max-sm:shadow-sm max-sm:hover:border-brand-200 max-sm:hover:bg-brand-50"
                        >
                            View all doctors
                            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                        </Link>
                    </motion.div>
                </motion.div>
                <motion.div
                    className="flex flex-wrap justify-center gap-2.5 sm:justify-start sm:gap-3"
                    variants={chipListVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-40px' }}
                >
                    {isLoading &&
                        Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-10 w-28 rounded-full bg-slate-200/70 animate-pulse"
                            />
                        ))}
                    {!isLoading &&
                        chips.map((s: SpecializationOption) => (
                            <motion.div key={s.id} variants={chipVariants} className="[contain:layout]">
                                <Link
                                    href={`/doctors?specialty=${encodeURIComponent(s.id)}`}
                                    className="group inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3.5 py-2 sm:px-4 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/30 backdrop-blur-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                                >
                                    <span className="transition-transform duration-300 group-hover:scale-110">
                                        <SpecialtyChipGlyph
                                            kind={specializationIdToGlyphKind(s.id)}
                                            className="h-4 w-4 shrink-0 text-medical-teal group-hover:text-brand-600"
                                        />
                                    </span>
                                    <span className="max-w-[200px] truncate sm:max-w-[240px]">{s.name}</span>
                                </Link>
                            </motion.div>
                        ))}
                </motion.div>
            </div>
        </section>
    );
}

function FindDoctorsBlock() {
    const router = useRouter();
    const [stateCode, setStateCode] = React.useState('');
    const [city, setCity] = React.useState('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState<string>('all');

    const states = React.useMemo(() => getStates(), []);
    const cities = React.useMemo(() => (stateCode ? getCities(stateCode) : []), [stateCode]);
    React.useEffect(() => setCity(''), [stateCode]);

    const {
        data: specializationData,
        isLoading: isLoadingSpecializations,
        isError: isErrorSpecializations,
    } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const handleFindDoctors = () => {
        const params = new URLSearchParams();
        if (stateCode) params.set('stateCode', stateCode);
        if (city) params.set('city', city);
        if (selectedSpecialtyId && selectedSpecialtyId !== 'all')
            params.set('specialty', selectedSpecialtyId);
        router.push(`/doctors${params.toString() ? `?${params.toString()}` : ''}`);
    };

    /** Matches landing strip density; sits flush inside one bordered shell */
    const stripSelectClass =
        'w-full appearance-none rounded-lg border border-slate-200 bg-white py-[10px] pl-3 pr-10 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60';

    const fieldCell =
        'flex min-h-0 min-w-0 flex-1 flex-col justify-end gap-2 bg-white px-4 py-3 sm:px-5 sm:py-4';

    return (
        <div
            role="search"
            aria-label="Find doctors by location and specialty"
            className="relative"
        >
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/35 ring-1 ring-slate-100">
                <div className="flex flex-col divide-y divide-slate-200 lg:flex-row lg:divide-x lg:divide-y-0 lg:items-stretch">
                    <div className={fieldCell}>
                        <label
                            htmlFor="landing-state"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-medical-teal" aria-hidden />{' '}
                            State
                        </label>
                        <div className="relative">
                            <select
                                id="landing-state"
                                value={stateCode}
                                onChange={(e) => setStateCode(e.target.value)}
                                className={stripSelectClass}
                            >
                                <option value="">Select state</option>
                                {states.map((s) => (
                                    <option key={s.isoCode} value={s.isoCode}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className={fieldCell}>
                        <label
                            htmlFor="landing-city"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-sky-600" aria-hidden />{' '}
                            City
                        </label>
                        <div className="relative">
                            <select
                                id="landing-city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={!stateCode}
                                className={stripSelectClass}
                            >
                                <option value="">Select city</option>
                                {cities.map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className={fieldCell}>
                        <label
                            htmlFor="landing-specialty"
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <Stethoscope className="w-3.5 h-3.5 shrink-0 text-brand-500" aria-hidden />{' '}
                            Specialty
                        </label>
                        <div className="relative">
                            <select
                                id="landing-specialty"
                                value={selectedSpecialtyId}
                                onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                                className={stripSelectClass}
                                disabled={isLoadingSpecializations || isErrorSpecializations}
                            >
                                <option value="all">
                                    {isLoadingSpecializations
                                        ? 'Loading specialties...'
                                        : 'All specialties'}
                                </option>
                                {!isLoadingSpecializations &&
                                    !isErrorSpecializations &&
                                    specializationData?.data.map((s: SpecializationOption) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleFindDoctors}
                        className="inline-flex w-full shrink-0 items-center justify-center gap-2 bg-brand-500 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-600 active:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:min-h-full lg:w-[4.5rem] lg:py-4 xl:w-[5rem]"
                    >
                        <Search className="h-5 w-5 shrink-0 opacity-95 lg:h-6 lg:w-6" aria-hidden />
                        <span className="lg:sr-only">Find doctors</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-brand-50/40">
            <header className="relative z-20 sticky top-0 border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm shadow-slate-200/25">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <PublicHeader />
                </div>
            </header>

            <section
                id="find-doctors"
                className="relative scroll-mt-24 sm:scroll-mt-28 bg-gradient-to-b from-slate-100/60 via-slate-50/40 to-transparent"
                aria-labelledby="find-doctor-heading"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
                    <div className="relative border-b border-slate-200/70 pb-8">
                        <div className="flex justify-start mb-4">
                            <span className="h-1 w-12 rounded-full bg-gradient-to-r from-medical-teal to-brand-500" />
                        </div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 mb-2">
                            Search first
                        </p>
                        <h2
                            id="find-doctor-heading"
                            className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 tracking-tight"
                        >
                            Find a doctor
                        </h2>
                        <p className="text-slate-600 mb-6 max-w-3xl text-sm sm:text-[15px] leading-snug">
                            Search by location and specialty, open results on a new page, and no
                            sign-in needed.
                        </p>
                        <FindDoctorsBlock />
                    </div>
                </div>
            </section>

            <section
                id="hero"
                className="relative pb-6 sm:pb-10 lg:pb-12"
                aria-labelledby="hero-heading"
            >
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(20_184_166_/_0.12),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_50%,rgb(245_130_32_/_0.06),transparent_50%)]"
                    aria-hidden
                />
                <div className="pointer-events-none absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-medical-teal/[0.07] blur-3xl sm:h-80 sm:w-80" aria-hidden />
                <div className="relative max-w-7xl mx-auto grid grid-cols-1 items-start gap-8 px-4 sm:px-6 sm:gap-10 lg:grid-cols-2 lg:grid-flow-row lg:gap-x-12 lg:gap-y-0 xl:gap-x-16">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="min-w-0"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-50 to-medical-soft px-4 py-2 text-sm font-bold text-brand-700 ring-1 ring-brand-100/80 shadow-sm shadow-brand-100/40 mb-5 sm:mb-6">
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-medical-teal animate-pulse ring-2 ring-medical-teal/30" />
                            Trusted by 10,000+ Patients
                        </div>
                        <h1
                            id="hero-heading"
                            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-[1.15] mb-5 sm:mb-6 tracking-tight"
                        >
                            Quality Healthcare,{' '}
                            <span className="text-brand-500">Anywhere, Anytime.</span>
                        </h1>
                        <p className="mb-4 max-w-lg text-sm font-normal leading-relaxed text-slate-600 sm:text-[15px]">
                            Connect with top-rated doctors for instant video consultations, digital
                            prescriptions, and personalized care from the comfort of your home.
                        </p>
                        <p className="mb-6 max-w-lg text-sm leading-relaxed text-slate-600 sm:mb-7 sm:text-[15px]">
                            BacancyTeleCare is built for end-to-end virtual care: discover a clinician,
                            request or confirm a time, join a secure visit, then track notes and
                            prescriptions alongside your health record.
                        </p>
                        <HeroHighlights />
                        <Link
                            href="/signup"
                            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 via-brand-500 to-brand-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-brand-200/45 ring-1 ring-brand-400/35 transition-all hover:from-brand-600 hover:to-brand-700 hover:shadow-lg hover:shadow-brand-300/30 sm:px-8 sm:py-3.5 sm:text-[15px] group"
                        >
                            Book an Appointment
                            <ArrowRight className="h-4 w-4 shrink-0 sm:h-[1.05rem] sm:w-[1.05rem] group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <HeroCompliancePills />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative w-full min-w-0 justify-self-center max-w-md lg:max-w-none lg:justify-self-stretch"
                    >
                        <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:mx-0 lg:ml-auto lg:max-w-lg xl:max-w-xl">
                            <div className="relative z-10 aspect-[4/5] w-full">
                                <Image
                                    src="/hero-telemedicine.svg"
                                    alt="Online doctor consultation illustration"
                                    fill
                                    className="object-contain object-top object-center"
                                    priority
                                />
                            </div>
                            <div
                                className="pointer-events-none absolute left-1/2 top-[18%] -z-10 h-[min(100%,28rem)] w-[min(140%,24rem)] -translate-x-1/2 rounded-full opacity-70 blur-3xl bg-[radial-gradient(circle,rgb(240_253_250)_0%,rgb(255_248_244)_45%,transparent_70%)]"
                                aria-hidden
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            <TrustStatsStrip />
            <WhoItsForSection />
            <HowItWorksSection />
            <PopularSpecialtiesSection />

            {/* Features Section */}
            <section
                id="features"
                className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-b from-slate-100/90 via-medical-soft/25 to-slate-50"
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.4] bg-[linear-gradient(to_right,rgb(148_163_184_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_0.06)_1px,transparent_1px)] bg-[size:48px_48px]"
                    aria-hidden
                />
                <div className="max-w-7xl mx-auto px-6 relative">
                    <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
                        <div className="flex justify-center mb-4">
                            <span className="h-1 w-12 rounded-full bg-gradient-to-r from-medical-teal to-brand-500" />
                        </div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 mb-2">
                            Clinical-grade convenience
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                            Why Choose BacancyTeleCare?
                        </h2>
                        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                            We combine cutting-edge technology with compassionate care to provide
                            the best healthcare experience.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        <FeatureCard
                            icon={Video}
                            title="Video Consultations"
                            description="High-quality video calls with specialized doctors from anywhere in the world."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Secure & Private"
                            description="Your medical data is encrypted and stored securely, ensuring complete privacy."
                        />
                        <FeatureCard
                            icon={Clock}
                            title="24/7 Availability"
                            description="Access healthcare services around the clock, even on weekends and holidays."
                        />
                        <FeatureCard
                            icon={FileText}
                            title="Digital Prescriptions"
                            description="Receive and manage your prescriptions digitally, ready for any pharmacy."
                        />
                        <FeatureCard
                            icon={Users}
                            title="Expert Doctors"
                            description="Our platform hosts verified specialists across multiple medical fields."
                        />
                        <FeatureCard
                            icon={Calendar}
                            title="Easy Scheduling"
                            description="Book appointments in seconds with our intuitive calendar interface."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section - solid brand orange (matches logo) */}
            <section className="relative py-10 sm:py-14 lg:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-brand-500 shadow-lg shadow-brand-900/20 sm:rounded-3xl">
                        <div className="absolute inset-x-6 top-0 h-px bg-white/25 sm:inset-x-10" aria-hidden />
                        <div className="relative z-10 px-5 py-8 text-center sm:px-10 sm:py-10 lg:px-12 lg:py-11">
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-100/85 sm:text-[11px] mb-2.5 sm:mb-3">
                                Get started today
                            </p>
                            <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl lg:text-[1.65rem] max-w-md mx-auto mb-3 sm:mb-4">
                                Ready to start your journey?
                            </h2>
                            <p className="text-sm text-brand-100/90 max-w-md mx-auto leading-relaxed mb-5 sm:text-[15px] sm:mb-6">
                                Join thousands of patients who trust BacancyTeleCare for their daily
                                healthcare needs.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 sm:gap-2.5 sm:mb-7">
                                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/95 ring-1 ring-white/15 backdrop-blur-sm sm:text-xs sm:px-3.5 sm:py-1">
                                    Video visits
                                </span>
                                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/95 ring-1 ring-white/15 backdrop-blur-sm sm:text-xs sm:px-3.5 sm:py-1">
                                    Encrypted &amp; private
                                </span>
                                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/95 ring-1 ring-white/15 backdrop-blur-sm sm:text-xs sm:px-3.5 sm:py-1">
                                    Verified doctors
                                </span>
                            </div>
                            <div className="flex flex-col gap-2.5 justify-center sm:flex-row sm:flex-wrap sm:gap-3">
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-brand-500 shadow-md shadow-brand-900/20 transition-all hover:bg-brand-50 active:scale-[0.98] sm:px-7 sm:py-3"
                                >
                                    Create an Account
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                </Link>
                                <Link
                                    href="/doctor/dashboard"
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 bg-transparent px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-white/15 sm:px-7 sm:py-3"
                                >
                                    Join as a Doctor
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-10 sm:py-12 border-t border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-100/50">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-medical-teal/20 to-transparent" aria-hidden />
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <BrandLogo compact />
                    <p className="text-slate-600 text-sm text-center md:text-left">
                        © 2026 BacancyTeleCare Inc. All rights reserved.
                    </p>
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
                        <Link
                            href="/privacy"
                            className="text-slate-500 hover:text-medical-teal transition-colors text-sm font-medium"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-slate-500 hover:text-medical-teal transition-colors text-sm font-medium"
                        >
                            Terms &amp; Conditions
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
