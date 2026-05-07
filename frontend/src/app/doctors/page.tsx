'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    Star,
    Clock,
    MapPin,
    ArrowRight,
    Loader2,
    ChevronDown,
    XCircle,
    RotateCw,
    SlidersHorizontal,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doctorsApi, type DoctorSummary, type SpecializationOption } from '@/services/api';
import { getStates, getCities } from '@/constants/us-locations';
import { PublicHeader } from '@/components/PublicHeader';
import { FORM_CONTROL_SEARCH, FORM_SELECT_CLASS, NO_BROWSER_INPUT_HELPERS } from '@/constants/form-controls';

function DoctorCard({
    doctor,
    specializationLabel,
}: {
    doctor: DoctorSummary;
    specializationLabel: string;
}) {
    return (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start gap-6 mb-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                        src={`https://picsum.photos/seed/${doctor.id}/100/100`}
                        alt={doctor.user.name}
                        fill
                        className="rounded-3xl object-cover border-4 border-white shadow-md"
                        referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                            {doctor.user.name}
                        </h4>
                        <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">
                            <Star className="w-3 h-3 fill-amber-500" /> 4.8
                        </div>
                    </div>
                    <p className="text-sm font-semibold text-brand-600 mb-2">
                        {specializationLabel}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium flex-wrap">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {doctor.experienceYears
                                ? `${doctor.experienceYears} Yrs Exp.`
                                : 'Experienced'}
                        </span>
                        {(doctor.city || doctor.state) && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[doctor.city, doctor.state].filter(Boolean).join(', ') || 'Online'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Consultation Fee
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                        {doctor.consultationFee
                            ? `$${Number(doctor.consultationFee).toFixed(0)}`
                            : 'Free'}
                    </p>
                </div>
                <Link
                    href={`/doctors/${doctor.id}`}
                    className="px-6 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 flex items-center gap-2"
                >
                    View Profile{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}

function PublicDoctorsContent() {
    const router = useRouter();
    const qClient = useQueryClient();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState<string>('all');
    const [selectedStateCode, setSelectedStateCode] = React.useState('');
    const [selectedCity, setSelectedCity] = React.useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

    const {
        data: specializationData,
        isLoading: isLoadingSpecializations,
        isError: isErrorSpecializations,
    } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const specializationNameById = React.useMemo(() => {
        const map = new Map<string, string>();
        specializationData?.data.forEach((s) => {
            map.set(s.id, s.name);
        });
        return map;
    }, [specializationData]);

    React.useEffect(() => {
        const stateCode = searchParams.get('stateCode');
        const city = searchParams.get('city');
        const specialty = searchParams.get('specialty');
        if (stateCode) setSelectedStateCode(stateCode);
        if (city) setSelectedCity(city);
        if (
            specialty &&
            specializationData?.data.some((s: SpecializationOption) => s.id === specialty)
        ) {
            setSelectedSpecialtyId(specialty);
        } else {
            setSelectedSpecialtyId('all');
        }
        if (stateCode || city || specialty) {
            setMobileFiltersOpen(true);
        }
    }, [searchParams, specializationData]);

    const activeFilterCount = React.useMemo(() => {
        let n = 0;
        if (selectedStateCode) n += 1;
        if (selectedCity) n += 1;
        if (selectedSpecialtyId !== 'all') n += 1;
        return n;
    }, [selectedStateCode, selectedCity, selectedSpecialtyId]);

    const states = React.useMemo(() => getStates(), []);
    const selectedStateName = React.useMemo(
        () => states.find((s) => s.isoCode === selectedStateCode)?.name ?? '',
        [states, selectedStateCode],
    );
    const citiesForState = React.useMemo(
        () => (selectedStateCode ? getCities(selectedStateCode) : []),
        [selectedStateCode],
    );

    const onStateChange = (stateCode: string) => {
        setSelectedStateCode(stateCode);
        setSelectedCity('');
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ['doctors', 'public', selectedSpecialtyId, selectedStateName, selectedCity],
        queryFn: () =>
            doctorsApi.list({
                specialization: selectedSpecialtyId !== 'all' ? selectedSpecialtyId : undefined,
                state: selectedStateName || undefined,
                city: selectedCity || undefined,
                limit: 50,
            }),
    });

    const doctors = data?.data ?? [];
    const filtered = searchTerm.trim()
        ? doctors.filter(
              (d) =>
                  d.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.specialization.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : doctors;

    return (
        <div className="min-h-screen bg-white">
            {/* Public navbar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <PublicHeader bordered />
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-5 sm:space-y-10"
                >
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 mb-1 sm:text-2xl sm:mb-2">
                            Find a doctor
                        </h1>
                        <p className="text-sm text-slate-500 sm:text-base">
                            Browse by specialty and location. Click a profile to see details; sign
                            in to book an appointment.
                        </p>
                    </div>
                    <div className="bg-white p-3 sm:p-8 rounded-2xl sm:rounded-[40px] border border-slate-100 shadow-sm space-y-3 sm:space-y-6">
                        <div className="flex flex-row gap-2 items-center sm:gap-3 sm:justify-between">
                            <div className="min-w-0 flex-1 relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:left-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Name or specialty..."
                                    className={`${FORM_CONTROL_SEARCH} max-w-full py-2.5 pl-9 text-sm sm:py-[11px] sm:pl-10 sm:text-base`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    {...NO_BROWSER_INPUT_HELPERS}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedStateCode('');
                                    setSelectedCity('');
                                    setSelectedSpecialtyId('all');
                                    setMobileFiltersOpen(false);
                                    router.push('/doctors');
                                }}
                                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-50 sm:gap-2 sm:px-3 sm:text-xs whitespace-nowrap"
                                aria-label="Clear all filters"
                            >
                                <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                Clear
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileFiltersOpen((o) => !o)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-left sm:hidden"
                            aria-expanded={mobileFiltersOpen}
                        >
                            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800">
                                <SlidersHorizontal
                                    className="h-4 w-4 shrink-0 text-brand-600"
                                    aria-hidden
                                />
                                <span className="truncate">
                                    Location &amp; specialty
                                    {activeFilterCount > 0 ? (
                                        <span className="font-semibold text-brand-600">
                                            {' '}
                                            ({activeFilterCount})
                                        </span>
                                    ) : null}
                                </span>
                            </span>
                            <ChevronDown
                                className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                                    mobileFiltersOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden
                            />
                        </button>

                        <div
                            className={`grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 ${
                                !mobileFiltersOpen ? 'max-sm:hidden' : ''
                            }`}
                        >
                            <div>
                                <label
                                    htmlFor="public-state-select"
                                    className="block text-xs font-bold text-slate-700 mb-1 sm:text-sm sm:mb-2"
                                >
                                    State
                                </label>
                                <div className="relative">
                                    <select
                                        id="public-state-select"
                                        value={selectedStateCode}
                                        onChange={(e) => onStateChange(e.target.value)}
                                        className={FORM_SELECT_CLASS}
                                    >
                                        <option value="">All states</option>
                                        {states.map((state) => (
                                            <option key={state.isoCode} value={state.isoCode}>
                                                {state.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label
                                    htmlFor="public-city-select"
                                    className="block text-xs font-bold text-slate-700 mb-1 sm:text-sm sm:mb-2"
                                >
                                    City
                                </label>
                                <div className="relative">
                                    <select
                                        id="public-city-select"
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        disabled={!selectedStateCode}
                                        className={FORM_SELECT_CLASS}
                                    >
                                        <option value="">All cities</option>
                                        {citiesForState.map((city) => (
                                            <option key={city.name} value={city.name}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label
                                    htmlFor="public-specialty-select"
                                    className="block text-xs font-bold text-slate-700 mb-1 sm:text-sm sm:mb-2"
                                >
                                    Specialty
                                </label>
                                <div className="relative">
                                    <select
                                        id="public-specialty-select"
                                        value={selectedSpecialtyId}
                                        onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                                        className={FORM_SELECT_CLASS}
                                        disabled={
                                            isLoadingSpecializations || isErrorSpecializations
                                        }
                                    >
                                        <option value="all">
                                            {isLoadingSpecializations
                                                ? 'Loading specialties...'
                                                : 'All specialties'}
                                        </option>
                                        {!isLoadingSpecializations &&
                                            !isErrorSpecializations &&
                                            specializationData?.data.map(
                                                (s: SpecializationOption) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name}
                                                    </option>
                                                ),
                                            )}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                        <h3 className="text-xl font-bold text-slate-900 px-0.5 sm:text-2xl sm:px-2">
                            {isLoading ? 'Loading...' : `${filtered.length} Specialists Found`}
                        </h3>

                        {isLoading && (
                            <div className="flex justify-center py-24">
                                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            </div>
                        )}

                        {isError && (
                            <div className="p-12 bg-red-50 rounded-[40px] text-center">
                                <p className="text-red-500 font-bold mb-6">
                                    Failed to load doctors. Please try again.
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        qClient.invalidateQueries({
                                            queryKey: ['doctors', 'public'],
                                        })
                                    }
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-white text-red-600 font-bold rounded-2xl border border-red-200 hover:bg-red-50 transition-all active:scale-95"
                                >
                                    <RotateCw className="w-4 h-4" /> Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && !isError && filtered.length === 0 && (
                            <div className="p-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h4 className="text-xl font-bold text-slate-900 mb-2">
                                    No doctors found
                                </h4>
                                <p className="text-slate-500 max-w-xs mx-auto">
                                    Try adjusting your search or filters.
                                </p>
                            </div>
                        )}

                        {!isLoading && !isError && filtered.length > 0 && (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {filtered.map((doctor) => {
                                    const specializationLabel =
                                        specializationNameById.get(doctor.specialization) ??
                                        doctor.specialization;
                                    return (
                                        <DoctorCard
                                            key={doctor.id}
                                            doctor={doctor}
                                            specializationLabel={specializationLabel}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

export default function PublicDoctorsPage() {
    return (
        <React.Suspense fallback={null}>
            <PublicDoctorsContent />
        </React.Suspense>
    );
}
