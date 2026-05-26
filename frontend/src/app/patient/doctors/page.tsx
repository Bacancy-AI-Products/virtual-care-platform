'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Clock,
    MapPin,
    Building2,
    Stethoscope,
    ArrowRight,
    Loader2,
    ChevronDown,
    X,
    RotateCw,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { doctorsApi, type DoctorSummary, type SpecializationOption } from '@/services/api';
import { getStates, getCities } from '@/constants/us-locations';
import {
    FORM_CONTROL_LEADING_ICON,
    FORM_SELECT_CLASS,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';
import { twMerge } from 'tailwind-merge';
import { RatingStars } from '@/components/ui/RatingStars';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useScrollToTopOnPageChange } from '@/hooks/useScrollToTopOnPageChange';

/** Server page size for the doctors grid (3 columns × 3 rows at xl). */
const PAGE_SIZE = 9;

/** Compact pagination: all pages if ≤9, otherwise 1 … window … last. */
function getPaginationItems(totalPages: number, currentPage: number): Array<number | 'ellipsis'> {
    if (totalPages <= 1) return [];
    if (totalPages <= 9) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
        if (i >= 1 && i <= totalPages) pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const out: Array<number | 'ellipsis'> = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            out.push('ellipsis');
        }
        out.push(sorted[i]);
    }
    return out;
}

function DoctorCard({
    doctor,
    specializationLabel,
}: {
    doctor: DoctorSummary;
    specializationLabel: string;
}) {
    const hasRating = doctor.stats.averageRating != null;
    return (
        <div className="w-full max-w-full bg-white p-4 sm:p-6 rounded-3xl sm:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start gap-4 sm:gap-6 mb-6">
                <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                        src={`https://i.pravatar.cc/150?u=${doctor.userId}`}
                        alt={doctor.user.name}
                        fill
                        className="max-w-full h-auto rounded-3xl object-cover border-4 border-white shadow-md"
                        referrerPolicy="no-referrer"
                    />
                    {doctor.verified && (
                        <div className="absolute -bottom-1.5 -right-1.5 z-10">
                            <VerificationBadge variant="icon" size="sm" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                            {doctor.user.name}
                        </h4>
                        {hasRating ? (
                            <div className="flex-shrink-0">
                                <RatingStars
                                    value={doctor.stats.averageRating ?? 0}
                                    size="sm"
                                    showValue
                                    count={doctor.stats.reviewCount}
                                />
                            </div>
                        ) : (
                            <span className="flex-shrink-0 rounded-full bg-slate-50 border border-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                New
                            </span>
                        )}
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
                        {doctor.stats.consultationCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                {doctor.stats.consultationCount.toLocaleString()} consults
                            </span>
                        )}
                        {(doctor.city || doctor.state) && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[doctor.city, doctor.state].filter(Boolean).join(', ') || 'Online'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-50">
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
                    href={`/patient/doctors/${doctor.id}`}
                    className="w-full sm:w-auto px-6 py-3 bg-brand-500 text-white text-sm font-bold rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-brand-100 active:scale-95 flex items-center justify-center gap-2"
                >
                    View Profile{' '}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}

function DoctorDiscoveryContent() {
    const qClient = useQueryClient();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [debouncedQ, setDebouncedQ] = React.useState('');
    const [page, setPage] = React.useState(1);
    useScrollToTopOnPageChange(page);
    const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState<string>('all');
    const [selectedStateCode, setSelectedStateCode] = React.useState('');
    const [selectedCity, setSelectedCity] = React.useState('');
    const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(searchTerm.trim()), 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    React.useEffect(() => {
        setPage(1);
    }, [debouncedQ, selectedSpecialtyId, selectedStateCode, selectedCity]);

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

    const { data, isLoading, isFetching, isError } = useQuery({
        queryKey: [
            'doctors',
            'patient',
            selectedSpecialtyId,
            selectedStateName,
            selectedCity,
            debouncedQ,
            page,
        ],
        queryFn: () =>
            doctorsApi.list({
                specialization: selectedSpecialtyId !== 'all' ? selectedSpecialtyId : undefined,
                state: selectedStateName || undefined,
                city: selectedCity || undefined,
                q: debouncedQ || undefined,
                page,
                limit: PAGE_SIZE,
            }),
        placeholderData: keepPreviousData,
    });

    const doctors = data?.data ?? [];
    const total = data?.total ?? 0;
    const limit = data?.limit ?? PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const showResultsLoadingOverlay = isFetching && !isLoading;
    const showLoader = isLoading || (isFetching && !data);
    const showError = !showLoader && isError && !data;
    const paginationItems = React.useMemo(
        () => getPaginationItems(totalPages, page),
        [totalPages, page],
    );

    React.useEffect(() => {
        if (data == null) return;
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [data, page, totalPages]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-6"
        >
            {/* Search & Filter — compact on mobile; filters collapsible to show results sooner */}
            <div className="w-full max-w-full bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-2 sm:space-y-3 overflow-x-hidden">
                <div className="relative min-w-0 group">
                    <Search className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none group-focus-within:text-brand-500" />
                    <input
                        type="text"
                        placeholder="Name or specialty..."
                        className={twMerge(
                            FORM_CONTROL_LEADING_ICON,
                            'py-2 text-sm',
                            searchTerm.trim() ? 'pr-10' : 'pr-3.5',
                        )}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        {...NO_BROWSER_INPUT_HELPERS}
                    />
                    {searchTerm.trim() ? (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200/80 hover:text-slate-700 sm:right-2"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" aria-hidden />
                        </button>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={() => setMobileFiltersOpen((o) => !o)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-2 text-left sm:hidden"
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

                {/* State, City & Specialty dropdowns */}
                <div
                    className={`grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 ${
                        !mobileFiltersOpen ? 'max-sm:hidden' : ''
                    }`}
                >
                    <div>
                        <label
                            htmlFor="state-select"
                            className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <MapPin
                                className="h-3.5 w-3.5 shrink-0 text-medical-teal"
                                aria-hidden
                            />
                            State
                        </label>
                        <div className="relative">
                            <select
                                id="state-select"
                                value={selectedStateCode}
                                onChange={(e) => onStateChange(e.target.value)}
                                className={twMerge(FORM_SELECT_CLASS, 'py-2')}
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
                            htmlFor="city-select"
                            className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                            City
                        </label>
                        <div className="relative">
                            <select
                                id="city-select"
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                disabled={!selectedStateCode}
                                className={twMerge(FORM_SELECT_CLASS, 'py-2')}
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
                            htmlFor="patient-specialty-select"
                            className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                        >
                            <Stethoscope
                                className="h-3.5 w-3.5 shrink-0 text-brand-500"
                                aria-hidden
                            />
                            Specialty
                        </label>
                        <div className="relative">
                            <select
                                id="patient-specialty-select"
                                value={selectedSpecialtyId}
                                onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                                className={twMerge(FORM_SELECT_CLASS, 'py-2')}
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
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col gap-1 px-0.5 sm:px-2">
                    <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        {isLoading
                            ? 'Loading...'
                            : `${total} Specialist${total === 1 ? '' : 's'} found`}
                    </h3>
                    {!isLoading && total > 0 && (
                        <p className="text-sm text-slate-500">
                            {showResultsLoadingOverlay ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                                    Loading results…
                                </span>
                            ) : (
                                <>
                                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{' '}
                                    of {total}
                                </>
                            )}
                        </p>
                    )}
                </div>

                {showLoader && <LoadingState message="Loading doctors…" />}

                {showError && (
                    <div className="p-6 sm:p-12 bg-red-50 rounded-3xl sm:rounded-[40px] text-center">
                        <p className="text-red-500 font-bold mb-6">
                            Failed to load doctors. Please try again.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                qClient.invalidateQueries({
                                    queryKey: ['doctors', 'patient'],
                                })
                            }
                            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-red-600 font-bold rounded-2xl border border-red-200 hover:bg-red-50 transition-all active:scale-95"
                        >
                            <RotateCw className="w-4 h-4" /> Retry
                        </button>
                    </div>
                )}

                {!showLoader && !showError && doctors.length === 0 && (
                    <div className="p-8 sm:p-20 bg-white rounded-3xl sm:rounded-[40px] border border-dashed border-slate-200 text-center">
                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h4 className="text-xl font-bold text-slate-900 mb-2">No doctors found</h4>
                        <p className="text-slate-500 max-w-xs mx-auto">
                            Try adjusting your search or filters.
                        </p>
                    </div>
                )}

                {!showLoader && !showError && doctors.length > 0 && (
                    <div
                        className="relative space-y-6 w-full max-w-full"
                        aria-busy={showResultsLoadingOverlay}
                    >
                        {showResultsLoadingOverlay && (
                            <div
                                className="absolute inset-0 z-20 flex items-center justify-center rounded-[24px] bg-white/70 backdrop-blur-[2px] sm:rounded-[40px]"
                                role="status"
                                aria-live="polite"
                            >
                                <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white px-8 py-6 shadow-lg">
                                    <Loader2
                                        className="h-10 w-10 text-brand-500 animate-spin"
                                        aria-hidden
                                    />
                                    <span className="text-sm font-semibold text-slate-600">
                                        Loading doctors…
                                    </span>
                                </div>
                            </div>
                        )}
                        <div
                            className={`space-y-6 ${showResultsLoadingOverlay ? 'min-h-[280px] sm:min-h-[320px]' : ''}`}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 xl:gap-8 w-full max-w-full">
                                {doctors.map((doctor) => {
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

                            {totalPages > 1 && (
                                <nav
                                    className="flex flex-col items-stretch gap-4 border-t border-slate-100 pt-6"
                                    aria-label="Pagination"
                                >
                                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
                                        <p className="order-2 text-sm text-slate-500 sm:order-1">
                                            Page {page} of {totalPages}
                                        </p>
                                        <div className="order-1 flex items-center gap-2 sm:order-2">
                                            <button
                                                type="button"
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                disabled={page <= 1 || showResultsLoadingOverlay}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                            >
                                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                                Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPage((p) => Math.min(totalPages, p + 1))
                                                }
                                                disabled={
                                                    page >= totalPages || showResultsLoadingOverlay
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" aria-hidden />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className="flex flex-wrap items-center justify-center gap-1.5"
                                        role="group"
                                        aria-label="Go to page"
                                    >
                                        {paginationItems.map((item, idx) =>
                                            item === 'ellipsis' ? (
                                                <span
                                                    key={`e-${idx}`}
                                                    className="px-1.5 py-2 text-sm font-semibold text-slate-400"
                                                    aria-hidden
                                                >
                                                    …
                                                </span>
                                            ) : (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => setPage(item)}
                                                    disabled={showResultsLoadingOverlay}
                                                    aria-current={
                                                        page === item ? 'page' : undefined
                                                    }
                                                    className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition-all disabled:pointer-events-none disabled:opacity-40 ${
                                                        page === item
                                                            ? 'bg-brand-500 text-white shadow-brand-100 ring-2 ring-brand-500/20'
                                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {item}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </nav>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function DoctorDiscovery() {
    return (
        <React.Suspense fallback={null}>
            <DoctorDiscoveryContent />
        </React.Suspense>
    );
}
