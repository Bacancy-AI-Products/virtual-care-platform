import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Star, ArrowRight } from 'lucide-react';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { type SuggestedDoctor } from '@/services/api';

function SuggestedDoctorCard({ doctor }: { doctor: SuggestedDoctor }) {
    const hasRating = doctor.averageRating != null;
    const location = [doctor.city, doctor.state].filter(Boolean).join(', ');

    return (
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
            {/* Avatar */}
            <div className="relative h-14 w-14 shrink-0">
                <Image
                    src={`https://picsum.photos/seed/${doctor.id}/100/100`}
                    alt={doctor.name}
                    fill
                    className="rounded-2xl object-cover border-2 border-white shadow-sm"
                    referrerPolicy="no-referrer"
                />
                {doctor.verified && (
                    <div className="absolute -bottom-1 -right-1 z-10">
                        <VerificationBadge variant="icon" size="sm" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{doctor.name}</p>
                <p className="truncate text-xs font-semibold text-brand-600">
                    {doctor.specialization}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    {hasRating && (
                        <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                            {doctor.averageRating!.toFixed(1)}
                            <span className="text-slate-300">({doctor.reviewCount})</span>
                        </span>
                    )}
                    {location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden />
                            {location}
                        </span>
                    )}
                </div>
            </div>

            {/* Fee + Book */}
            <div className="shrink-0 text-right">
                <p className="text-base font-bold text-slate-900">
                    {doctor.consultationFee
                        ? `$${Number(doctor.consultationFee).toFixed(0)}`
                        : 'Free'}
                </p>
                <Link
                    href={`/patient/doctors/${doctor.id}`}
                    className="mt-2 inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition-all hover:bg-brand-100 active:scale-95"
                    aria-label={`View profile and book with ${doctor.name}`}
                >
                    Book
                    <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
            </div>
        </div>
    );
}

interface ResultDoctorListProps {
    doctors: SuggestedDoctor[];
}

export function ResultDoctorList({ doctors }: ResultDoctorListProps) {
    if (doctors.length === 0) return null;

    return (
        <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Matched doctors
            </p>
            <div className="space-y-3">
                {doctors.map((d) => (
                    <SuggestedDoctorCard key={d.id} doctor={d} />
                ))}
            </div>
        </div>
    );
}
