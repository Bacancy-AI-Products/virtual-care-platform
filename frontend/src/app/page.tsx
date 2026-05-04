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
    ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, type SpecializationOption } from '@/services/api';
import { getStates, getCities } from '@/constants/us-locations';
import { PublicHeader } from '@/components/PublicHeader';
import { BrandLogo } from '@/components/BrandLogo';

const SELECT_CLASS =
    'w-full appearance-none pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium text-slate-900 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

const FeatureCard = ({
    icon: Icon,
    title,
    description,
}: {
    icon: any;
    title: string;
    description: string;
}) => (
    <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group text-center sm:text-left">
        <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 group-hover:bg-brand-500 transition-colors duration-300">
            <Icon className="w-7 h-7 text-brand-500 group-hover:text-white transition-colors duration-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
);

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

    return (
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label
                            htmlFor="landing-state"
                            className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            <MapPin className="w-3.5 h-3.5 inline mr-1" /> State
                        </label>
                        <div className="relative">
                            <select
                                id="landing-state"
                                value={stateCode}
                                onChange={(e) => setStateCode(e.target.value)}
                                className={SELECT_CLASS}
                            >
                                <option value="">Select state</option>
                                {states.map((s) => (
                                    <option key={s.isoCode} value={s.isoCode}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label
                            htmlFor="landing-city"
                            className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            City
                        </label>
                        <div className="relative">
                            <select
                                id="landing-city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                disabled={!stateCode}
                                className={SELECT_CLASS}
                            >
                                <option value="">Select city</option>
                                {cities.map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label
                            htmlFor="landing-specialty"
                            className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
                        >
                            <Stethoscope className="w-3.5 h-3.5 inline mr-1" /> Specialty
                        </label>
                        <div className="relative">
                            <select
                                id="landing-specialty"
                                value={selectedSpecialtyId}
                                onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                                className={SELECT_CLASS}
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
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleFindDoctors}
                    className="flex items-center justify-center gap-2 px-8 py-3.5 bg-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-600 transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <Search className="w-5 h-5" /> Find Doctors
                </button>
            </div>
        </div>
    );
}

export default function Landing() {
    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {/* Navbar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <PublicHeader />
            </div>

            {/* Find Doctors (public results → /doctors) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Find a doctor</h2>
                <p className="text-slate-500 mb-6 max-w-xl">
                    Search by location and specialty. Results open on a separate page—no login
                    required to browse.
                </p>
                <FindDoctorsBlock />
            </section>

            {/* Hero Section — no top padding, Find Doctors block sits directly above */}
            <section className="relative pb-10 sm:pb-16 lg:pb-40">
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-sm font-bold mb-8">
                            <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
                            Trusted by 10,000+ Patients
                        </div>
                        <h1 className="text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8 tracking-tight">
                            Quality Healthcare,{' '}
                            <span className="text-brand-500">Anywhere, Anytime.</span>
                        </h1>
                        <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-lg">
                            Connect with top-rated doctors for instant video consultations, digital
                            prescriptions, and personalized care from the comfort of your home.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                href="/signup"
                                className="px-10 py-5 bg-brand-500 text-white text-lg font-bold rounded-full shadow-xl shadow-brand-100 hover:bg-brand-600 hover:shadow-brand-200 transition-all flex items-center justify-center gap-2 group"
                            >
                                Book an Appointment{' '}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative max-w-xs sm:max-w-md mx-auto w-full lg:max-w-none lg:mx-0"
                    >
                        <div className="relative z-10 aspect-[4/5]">
                            <Image
                                src="/hero-telemedicine.svg"
                                alt="Online doctor consultation illustration"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        {/* Background elements */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-50 rounded-full blur-3xl -z-10 opacity-50"></div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
                            Why Choose BacancyTeleCare?
                        </h2>
                        <p className="text-xl text-slate-500 leading-relaxed">
                            We combine cutting-edge technology with compassionate care to provide
                            the best healthcare experience.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-brand-600 rounded-[48px] p-12 lg:p-24 text-center relative overflow-hidden shadow-2xl shadow-brand-200">
                        <div className="relative z-10">
                            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8">
                                Ready to start your journey?
                            </h2>
                            <p className="text-xl text-brand-100 mb-12 max-w-2xl mx-auto">
                                Join thousands of patients who trust BacancyTeleCare for their daily
                                healthcare needs.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/signup"
                                    className="px-12 py-5 bg-white text-brand-600 text-lg font-bold rounded-full hover:bg-brand-50 transition-all shadow-xl"
                                >
                                    Create an Account
                                </Link>
                                <Link
                                    href="/doctor/dashboard"
                                    className="px-12 py-5 bg-brand-700 text-white text-lg font-bold rounded-full hover:bg-brand-800 transition-all border border-brand-500"
                                >
                                    Join as a Doctor
                                </Link>
                            </div>
                        </div>
                        {/* Background patterns */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <BrandLogo compact />
                    <p className="text-slate-500 text-sm">
                        © 2026 BacancyTeleCare Inc. All rights reserved.
                    </p>
                    <div className="flex gap-8">
                        <a
                            href="#"
                            className="text-slate-400 hover:text-brand-500 transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-brand-500 transition-colors"
                        >
                            Terms of Service
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
