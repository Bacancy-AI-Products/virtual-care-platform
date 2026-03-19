"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  User, Mail, Phone, MapPin, Calendar,
  Edit, Save, X, Loader2,
  PhoneCall, Droplets, Activity,
  CheckCircle2, AlertCircle, Camera,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { usersApi, patientsApi, appointmentsApi, filesApi } from '@/services/api';
import { getStates, getCities } from '@/constants/us-locations';
import { useAuth } from '@/hooks/useAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
] as const;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all text-sm font-medium text-slate-900";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDOB(dob: string | null): string {
  if (!dob) return '—';
  try { return format(new Date(dob), 'MMMM d, yyyy'); }
  catch { return '—'; }
}

function getAge(dob: string | null): string | null {
  if (!dob) return null;
  try {
    const age = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return `${age} yrs`;
  } catch { return null; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </label>
      {children}
    </div>
  );
}

// ─── Form state type ──────────────────────────────────────────────────────────

interface EditForm {
  phone: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  height: string;
  weight: string;
  address: string;
  city: string;
  state: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientProfile() {
  const qClient = useQueryClient();
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EditForm, string>>>({});
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStateCode, setSelectedStateCode] = useState("");

  const [form, setForm] = useState<EditForm>({
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    height: '',
    weight: '',
    address: '',
    city: '',
    state: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => usersApi.getMe(),
    enabled: !!token,
  });

  const { data: apptData } = useQuery({
    queryKey: ['appointments', 'patient', 'all'],
    queryFn: () => appointmentsApi.list({ limit: 100 }),
    enabled: !!token,
  });

  // Load avatar blob URL whenever the file ID changes
  const avatarFileId = me?.avatarFileId ?? null;
  useEffect(() => {
    if (!avatarFileId) { setAvatarBlobUrl(null); return; }
    let active = true;
    filesApi.fetchBlob(avatarFileId)
      .then(url => { if (active) setAvatarBlobUrl(url); })
      .catch(() => { if (active) setAvatarBlobUrl(null); });
    return () => { active = false; };
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

  const patient = me?.patient;
  const completedVisits = (apptData?.data ?? []).filter(a => a.status === 'COMPLETED').length;
  const totalAppointments = (apptData?.data ?? []).length;

  const startEdit = () => {
    setForm({
      phone: patient?.phone ?? '',
      dateOfBirth: patient?.dateOfBirth
        ? format(new Date(patient.dateOfBirth), 'yyyy-MM-dd')
        : '',
      gender: patient?.gender ?? '',
      bloodGroup: patient?.bloodGroup ?? '',
      height: patient?.height != null ? String(patient.height) : '',
      weight: patient?.weight != null ? String(patient.weight) : '',
      address: patient?.address ?? '',
      city: patient?.city ?? '',
      state: patient?.state ?? '',
      emergencyContactName: patient?.emergencyContactName ?? '',
      emergencyContactPhone: patient?.emergencyContactPhone ?? '',
    });
    const states = getStates();
    const match = states.find((s) => s.name === patient?.state);
    setSelectedStateCode(match?.isoCode ?? '');
    setSaveError(null);
    setSaved(false);
    setFieldErrors({});
    setEditing(true);
  };

  const validate = (f: EditForm): Partial<Record<keyof EditForm, string>> => {
    const errors: Partial<Record<keyof EditForm, string>> = {};
    if (f.height) {
      const h = parseInt(f.height, 10);
      if (isNaN(h) || h < 50 || h > 250) errors.height = 'Must be between 50 and 250 cm';
    }
    if (f.weight) {
      const w = parseFloat(f.weight);
      if (isNaN(w) || w < 1 || w > 500) errors.weight = 'Must be between 1 and 500 kg';
    }
    if (f.dateOfBirth && new Date(f.dateOfBirth) >= new Date()) {
      errors.dateOfBirth = 'Date of birth must be in the past';
    }
    return errors;
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      patientsApi.updateMe({
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: (form.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY') || null,
        bloodGroup: form.bloodGroup || null,
        height: form.height ? parseInt(form.height, 10) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
      }),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const states = React.useMemo(() => getStates(), []);
  const citiesForState = React.useMemo(
    () => (selectedStateCode ? getCities(selectedStateCode) : []),
    [selectedStateCode],
  );

  const onStateChange = (stateCode: string) => {
    setSelectedStateCode(stateCode);
    setForm((prev) => ({
      ...prev,
      state: stateCode
        ? states.find((s) => s.isoCode === stateCode)?.name ?? prev.state ?? ''
        : '',
      city: '',
    }));
  };

  const handleSave = () => {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaveError(null);
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const genderLabel = GENDERS.find(g => g.value === patient?.gender)?.label ?? '—';
  const locationStr = [patient?.city, patient?.state].filter(Boolean).join(', ') || '—';
  const age = getAge(patient?.dateOfBirth ?? null);
  const initial = me?.name?.[0]?.toUpperCase() ?? 'P';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">My Profile</h2>
          <p className="text-slate-500 mt-1 font-medium">Manage your personal and medical information</p>
        </div>
        {!editing ? (
          <button
            onClick={startEdit}
            className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95 self-start sm:self-auto"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => { setEditing(false); setSaveError(null); setFieldErrors({}); }}
              className="px-5 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Feedback banners */}
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          Profile updated successfully.
        </div>
      )}
      {saveError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-semibold text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {saveError}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Avatar card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Avatar with upload overlay */}
            <div
              className="relative w-28 h-28 mx-auto cursor-pointer group"
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              title="Change profile picture"
            >
              {avatarBlobUrl ? (
                <Image
                  src={avatarBlobUrl}
                  alt="Profile picture"
                  fill
                  className="rounded-[28px] object-cover shadow-lg"
                  unoptimized
                />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-brand-400 to-brand-600 rounded-[28px] flex items-center justify-center shadow-lg shadow-brand-100">
                  <span className="text-4xl font-bold text-white select-none">{initial}</span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-[28px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                  : <Camera className="w-7 h-7 text-white" />
                }
              </div>
            </div>

            {avatarError && (
              <p className="text-xs text-red-500 font-semibold mt-2">{avatarError}</p>
            )}

            <h3 className="text-xl font-bold text-slate-900 mt-5">{me?.name ?? '—'}</h3>
            <p className="text-sm text-slate-400 font-medium mt-0.5">{me?.email}</p>
            {age && (
              <span className="inline-block mt-3 px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-full">
                {age}
              </span>
            )}
            <p className="text-xs text-slate-400 mt-3 font-medium">Click photo to update</p>
          </div>

          {/* Health overview card */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Overview</h4>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Blood Group</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {patient?.bloodGroup || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Height</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {patient?.height ? `${patient.height} cm` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Weight</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {patient?.weight ? `${patient.weight} kg` : '—'}
              </span>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Completed Visits</span>
                <span className="text-sm font-bold text-brand-600">{completedVisits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Total Appointments</span>
                <span className="text-sm font-bold text-slate-800">{totalAppointments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Personal information card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h3>

            {!editing ? (
              <div className="grid sm:grid-cols-2 gap-6">
                <InfoField icon={User} label="Full Name" value={me?.name ?? ''} />
                <InfoField icon={Mail} label="Email Address" value={me?.email ?? ''} />
                <InfoField icon={Phone} label="Phone Number" value={patient?.phone ?? ''} />
                <InfoField
                  icon={Calendar}
                  label="Date of Birth"
                  value={[formatDOB(patient?.dateOfBirth ?? null), age].filter(Boolean).join(' · ')}
                />
                <InfoField icon={User} label="Gender" value={genderLabel} />
                <InfoField icon={MapPin} label="Location" value={locationStr} />
                {patient?.address && (
                  <div className="sm:col-span-2">
                    <InfoField icon={MapPin} label="Address" value={patient.address} />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {/* Read-only fields */}
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <User className="w-3.5 h-3.5" /> Full Name
                  </span>
                  <p className="px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-400 border-2 border-slate-100">
                    {me?.name}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </span>
                  <p className="px-3.5 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-400 border-2 border-slate-100">
                    {me?.email}
                  </p>
                </div>

                {/* Editable fields */}
                <FormField label="Phone Number" icon={Phone}>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </FormField>

                <FormField label="Date of Birth" icon={Calendar}>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => { setForm(f => ({ ...f, dateOfBirth: e.target.value })); setFieldErrors(fe => ({ ...fe, dateOfBirth: undefined })); }}
                    className={`${INPUT_CLASS} ${fieldErrors.dateOfBirth ? 'border-red-400 focus:border-red-400' : ''}`}
                  />
                  {fieldErrors.dateOfBirth && <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.dateOfBirth}</p>}
                </FormField>

                <FormField label="Gender" icon={User}>
                  <select
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select gender</option>
                    {GENDERS.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Blood Group" icon={Droplets}>
                  <select
                    value={form.bloodGroup}
                    onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Height (cm)" icon={Activity}>
                  <input
                    type="number"
                    placeholder="175"
                    min={50}
                    max={250}
                    step={1}
                    value={form.height}
                    onChange={e => { setForm(f => ({ ...f, height: e.target.value })); setFieldErrors(fe => ({ ...fe, height: undefined })); }}
                    className={`${INPUT_CLASS} ${fieldErrors.height ? 'border-red-400 focus:border-red-400' : ''}`}
                  />
                  {fieldErrors.height && <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.height}</p>}
                </FormField>

                <FormField label="Weight (kg)" icon={Activity}>
                  <input
                    type="number"
                    placeholder="70"
                    min={1}
                    max={500}
                    step={0.1}
                    value={form.weight}
                    onChange={e => { setForm(f => ({ ...f, weight: e.target.value })); setFieldErrors(fe => ({ ...fe, weight: undefined })); }}
                    className={`${INPUT_CLASS} ${fieldErrors.weight ? 'border-red-400 focus:border-red-400' : ''}`}
                  />
                  {fieldErrors.weight && <p className="text-xs text-red-500 font-semibold mt-1">{fieldErrors.weight}</p>}
                </FormField>

                <FormField label="State" icon={MapPin}>
                  <div className="relative">
                    <select
                      value={selectedStateCode}
                      onChange={e => onStateChange(e.target.value)}
                      className={INPUT_CLASS}
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state.isoCode} value={state.isoCode}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>

                <FormField label="City" icon={MapPin}>
                  <div className="relative">
                    <select
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      disabled={!selectedStateCode}
                      className={INPUT_CLASS}
                    >
                      <option value="">Select city</option>
                      {citiesForState.map((city) => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Full Address" icon={MapPin}>
                    <input
                      type="text"
                      placeholder="123 Main Street, Apartment 4B"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>

          {/* Emergency contact card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Emergency Contact</h3>

            {!editing ? (
              <div className="grid sm:grid-cols-2 gap-6">
                <InfoField icon={User} label="Contact Name" value={patient?.emergencyContactName ?? ''} />
                <InfoField icon={PhoneCall} label="Contact Phone" value={patient?.emergencyContactPhone ?? ''} />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField label="Contact Name" icon={User}>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={form.emergencyContactName}
                    onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </FormField>
                <FormField label="Contact Phone" icon={PhoneCall}>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.emergencyContactPhone}
                    onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </FormField>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
