'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    MapPin,
    Calendar,
    Edit,
    Camera,
    Stethoscope,
    Award,
    Clock,
    ChevronDown,
    Loader2,
    GraduationCap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    doctorsApi,
    usersApi,
    filesApi,
    type MyDoctorProfile,
    type DoctorStats,
    type UpdateDoctorProfileInput,
    type SpecializationOption,
} from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { getStates, getCities } from '@/constants/us-locations';
import {
    FORM_CONTROL_CLASS,
    FORM_SELECT_CLASS,
    NO_BROWSER_INPUT_HELPERS,
} from '@/constants/form-controls';
import { DoctorTrustStrip } from '@/components/doctor/DoctorTrustStrip';
import { CredentialList } from '@/components/doctor/CredentialList';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { LoadingState } from '@/components/ui/LoadingState';

export default function DoctorProfile() {
    const { user, token } = useAuth();
    const router = useRouter();
    const qClient = useQueryClient();
    const [mounted, setMounted] = React.useState(false);
    const [avatarBlobUrl, setAvatarBlobUrl] = React.useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
    const [avatarError, setAvatarError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
        if (mounted && (!token || user?.role !== 'DOCTOR')) {
            router.push('/login?from=/doctor/profile');
        }
    }, [mounted, token, user?.role, router]);

    const {
        data: profile,
        isPending,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['doctor', 'me'],
        queryFn: () => doctorsApi.getMe(),
        enabled: !!token && user?.role === 'DOCTOR',
        staleTime: 1000 * 60 * 5,
    });

    // Stats are fetched on a separate, longer cache window so the profile
    // page renders the moment the (cheap) profile query resolves.
    const { data: stats } = useQuery<DoctorStats>({
        queryKey: ['doctor', 'me', 'stats'],
        queryFn: () => doctorsApi.getMyStats(),
        enabled: !!token && user?.role === 'DOCTOR',
        staleTime: 1000 * 60 * 10,
    });

    const { data: specializationData } = useQuery({
        queryKey: ['doctor', 'specializations'],
        queryFn: () => doctorsApi.getSpecializations(),
        staleTime: 1000 * 60 * 60,
    });

    const { data: me } = useQuery({
        queryKey: ['users', 'me'],
        queryFn: () => usersApi.getMe(),
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
    });

    const [form, setForm] = React.useState<UpdateDoctorProfileInput>({
        specialization: '',
        experienceYears: undefined,
        bio: '',
        consultationFee: undefined,
        registrationNumber: '',
        degree: '',
        city: '',
        state: '',
        isActive: true,
    });

    const [selectedStateCode, setSelectedStateCode] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);

    const avatarFileId = me?.avatarFileId ?? null;

    React.useEffect(() => {
        let active = true;
        if (!avatarFileId) {
            setAvatarBlobUrl(null);
            return () => {
                active = false;
            };
        }
        filesApi
            .fetchBlob(avatarFileId)
            .then((url) => {
                if (active) setAvatarBlobUrl(url);
            })
            .catch(() => {
                if (active) setAvatarBlobUrl(null);
            });
        return () => {
            active = false;
        };
    }, [avatarFileId]);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarError(null);
        setUploadingAvatar(true);
        try {
            await usersApi.uploadAvatar(file);
            qClient.invalidateQueries({ queryKey: ['users', 'me'] });
        } catch (err: unknown) {
            setAvatarError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    React.useEffect(() => {
        if (profile) {
            setForm({
                specialization: profile.specialization ?? '',
                experienceYears: profile.experienceYears ?? undefined,
                bio: profile.bio ?? '',
                consultationFee: profile.consultationFee
                    ? Number(profile.consultationFee)
                    : undefined,
                registrationNumber: profile.registrationNumber ?? '',
                degree: profile.degree ?? '',
                city: profile.city ?? '',
                state: profile.state ?? '',
                isActive: profile.isActive,
            });
            // best-effort: map existing state name to state code
            const states = getStates();
            const match = states.find((s) => s.name === profile.state);
            if (match) {
                setSelectedStateCode(match.isoCode);
            }
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdateDoctorProfileInput) => doctorsApi.updateMe(data),
        onSuccess: (updated: MyDoctorProfile) => {
            qClient.setQueryData(['doctor', 'me'], updated);
            setIsEditing(false);
        },
        onError: (err: Error) => {
            alert(err.message);
        },
    });

    const states = React.useMemo(() => getStates(), []);
    const citiesForState = React.useMemo(
        () => (selectedStateCode ? getCities(selectedStateCode) : []),
        [selectedStateCode],
    );

    const onChange =
        (field: keyof UpdateDoctorProfileInput) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const value = e.target.value;
            if (field === 'experienceYears' || field === 'consultationFee') {
                setForm((prev) => ({
                    ...prev,
                    [field]: value ? Number(value) : undefined,
                }));
            } else {
                setForm((prev) => ({
                    ...prev,
                    [field]: value,
                }));
            }
        };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(form);
    };

    const onStateChange = (stateCode: string) => {
        setSelectedStateCode(stateCode);
        setForm((prev) => ({
            ...prev,
            state: stateCode
                ? (states.find((s) => s.isoCode === stateCode)?.name ?? prev.state ?? '')
                : '',
            city: '',
        }));
    };

    if (!mounted) {
        return <LoadingState message="Loading profile…" />;
    }

    if (!token || user?.role !== 'DOCTOR') {
        return null;
    }

    // No cached data + still fetching → first-time spinner.
    if (!profile && isPending) {
        return <LoadingState message="Loading profile…" />;
    }

    // No cached data + finished with an error → actionable retry UI.
    if (!profile && isError) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <p className="text-red-600 font-bold">We couldn’t load your profile.</p>
                <p className="text-sm text-slate-500 max-w-sm">
                    Check your connection and try again. If this keeps happening, please contact
                    support.
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-all active:scale-95"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!profile) {
        // Safety net: shouldn't reach here but guard so TS narrows below.
        return <LoadingState message="Loading profile…" />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-10"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    My Profile
                </h2>
                {isEditing ? (
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                // reset form back to latest profile values
                                setForm({
                                    specialization: profile.specialization ?? '',
                                    experienceYears: profile.experienceYears ?? undefined,
                                    bio: profile.bio ?? '',
                                    consultationFee: profile.consultationFee
                                        ? Number(profile.consultationFee)
                                        : undefined,
                                    registrationNumber: profile.registrationNumber ?? '',
                                    degree: profile.degree ?? '',
                                    city: profile.city ?? '',
                                    state: profile.state ?? '',
                                    isActive: profile.isActive,
                                });
                                const states = getStates();
                                const match = states.find((s) => s.name === profile.state);
                                setSelectedStateCode(match?.isoCode ?? '');
                                setIsEditing(false);
                            }}
                            className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-200 text-sm sm:text-base font-semibold text-slate-600 hover:bg-slate-50 transition-all whitespace-nowrap"
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="doctor-profile-form"
                            className="flex-1 sm:flex-none px-6 py-3 bg-brand-500 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 whitespace-nowrap"
                            disabled={updateMutation.isPending}
                        >
                            <Edit className="w-4 h-4" /> Save Changes
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                    >
                        <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-5 xl:gap-10">
                <div className="xl:col-span-2 xl:row-start-1">
                    <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm text-center relative group">
                        {/* Hidden file input for avatar upload */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <div
                            className="relative inline-block w-32 h-32 cursor-pointer group"
                            onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                            title="Change profile picture"
                        >
                            {avatarBlobUrl ? (
                                <Image
                                    src={avatarBlobUrl}
                                    alt={profile.user.name}
                                    fill
                                    className="rounded-[40px] object-cover border-4 border-white shadow-xl"
                                />
                            ) : !avatarFileId ? (
                                <Image
                                    src={`https://i.pravatar.cc/200?u=${me?.id ?? profile.id}`}
                                    alt={profile.user.name}
                                    fill
                                    className="rounded-[40px] object-cover border-4 border-white shadow-xl"
                                    referrerPolicy="no-referrer"
                                />
                            ) : null}
                            <div className="absolute inset-0 rounded-[40px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingAvatar ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="w-6 h-6 text-white" />
                                )}
                            </div>
                        </div>
                        {avatarError && (
                            <p className="text-xs text-red-500 font-semibold mt-2">{avatarError}</p>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 mt-6 flex items-center justify-center gap-2">
                            {profile.user.name}
                            {profile.verified && <VerificationBadge variant="icon" size="sm" />}
                        </h3>
                        <p className="text-brand-600 font-bold text-sm">{profile.specialization}</p>
                        {profile.registrationNumber && (
                            <p className="text-slate-500 font-medium text-xs mt-1">
                                Reg ID: {profile.registrationNumber}
                            </p>
                        )}

                        <div className="mt-8 pt-8 border-t border-slate-50 flex justify-around">
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-900">
                                    {profile.experienceYears ?? '—'}
                                </p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    Years Exp
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-900">
                                    {profile.consultationFee
                                        ? `$${Number(profile.consultationFee).toFixed(0)}`
                                        : 'Free'}
                                </p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    Fee
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-900">
                                    {profile.isActive ? 'Active' : 'Paused'}
                                </p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                    Status
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-2 xl:row-start-2">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-brand-500" /> Credentials &
                            Education
                        </h4>
                        {profile.credentials && profile.credentials.length > 0 ? (
                            <CredentialList credentials={profile.credentials} />
                        ) : (
                            <p className="text-xs text-slate-500 font-medium">
                                No credentials added yet.
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-8 xl:col-span-3 xl:col-start-3 xl:row-span-2 xl:row-start-1">
                    {isEditing ? (
                        <form
                            id="doctor-profile-form"
                            onSubmit={handleSubmit}
                            className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8"
                            autoComplete="off"
                        >
                            <h3 className="text-xl font-bold text-slate-900">
                                Professional Information
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <Stethoscope className="w-3.5 h-3.5" /> Specialization
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.specialization ?? ''}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    specialization: e.target.value,
                                                }))
                                            }
                                            className={FORM_SELECT_CLASS}
                                            required
                                        >
                                            <option value="">Select specialization</option>
                                            {specializationData?.data.map(
                                                (s: SpecializationOption) => (
                                                    <option key={s.id} value={s.name}>
                                                        {s.name}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <Award className="w-3.5 h-3.5" /> Degree
                                    </label>
                                    <input
                                        type="text"
                                        value={form.degree ?? ''}
                                        onChange={onChange('degree')}
                                        className={FORM_CONTROL_CLASS}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5" /> Experience (years)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.experienceYears ?? ''}
                                        onChange={onChange('experienceYears')}
                                        className={FORM_CONTROL_CLASS}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <Calendar className="w-3.5 h-3.5" /> Consultation Fee (USD)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.consultationFee ?? ''}
                                        onChange={onChange('consultationFee')}
                                        className={FORM_CONTROL_CLASS}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Reg. Number
                                    </label>
                                    <input
                                        type="text"
                                        value={form.registrationNumber ?? ''}
                                        onChange={onChange('registrationNumber')}
                                        className={FORM_CONTROL_CLASS}
                                        {...NO_BROWSER_INPUT_HELPERS}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        State
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedStateCode}
                                            onChange={(e) => onStateChange(e.target.value)}
                                            className={FORM_SELECT_CLASS}
                                        >
                                            <option value="">Select state</option>
                                            {states.map((state) => (
                                                <option key={state.isoCode} value={state.isoCode}>
                                                    {state.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <MapPin className="w-3.5 h-3.5" /> City
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={form.city ?? ''}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    city: e.target.value,
                                                }))
                                            }
                                            disabled={!selectedStateCode}
                                            className={FORM_SELECT_CLASS}
                                        >
                                            <option value="">Select city</option>
                                            {citiesForState.map((city) => (
                                                <option key={city.name} value={city.name}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Biography
                                </label>
                                <textarea
                                    rows={4}
                                    value={form.bio ?? ''}
                                    onChange={onChange('bio')}
                                    className={`${FORM_CONTROL_CLASS} resize-none`}
                                    {...NO_BROWSER_INPUT_HELPERS}
                                />
                            </div>
                        </form>
                    ) : (
                        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
                            <h3 className="text-xl font-bold text-slate-900">
                                Professional Information
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Stethoscope className="w-3.5 h-3.5" /> Specialization
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {profile.specialization || '—'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Award className="w-3.5 h-3.5" /> Degree
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {profile.degree || '—'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Experience
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {profile.experienceYears
                                            ? `${profile.experienceYears} Years`
                                            : '—'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Consultation Fee
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {profile.consultationFee
                                            ? `$${Number(profile.consultationFee).toFixed(0)}`
                                            : 'Free'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Registration Number
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {profile.registrationNumber || '—'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5" /> Location
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {[profile.city, profile.state].filter(Boolean).join(', ') ||
                                            '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Biography
                                </p>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {profile.bio || 'No biography added yet.'}
                                </p>
                            </div>

                            <div className="space-y-4 border-t border-slate-50 pt-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Trust signals
                                </p>
                                <p className="text-xs text-slate-500 font-medium">
                                    How your profile looks to patients searching for a doctor.
                                </p>
                                <DoctorTrustStrip
                                    experienceYears={profile.experienceYears}
                                    stats={
                                        stats ?? {
                                            averageRating: null,
                                            reviewCount: 0,
                                            consultationCount: 0,
                                            avgResponseMinutes: null,
                                        }
                                    }
                                />
                            </div>

                            {profile.languages && profile.languages.length > 0 && (
                                <div className="space-y-2 border-t border-slate-50 pt-6">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Languages
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.languages.map((lang) => (
                                            <span
                                                key={lang}
                                                className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                                            >
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
