import { Award, MessageCircle, Star, Stethoscope, Timer } from 'lucide-react';
import type { DoctorStats } from '@/services/api';
import { StatTile } from '@/components/ui/StatTile';

interface DoctorTrustStripProps {
    experienceYears: number | null;
    stats: DoctorStats;
}

function formatResponseTime(minutes: number | null): string {
    if (minutes == null) return '—';
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    return `${hours} hr`;
}

/**
 * The trust-signal row beneath a doctor's name on the profile pages.
 * Shows: experience, completed consultations, average rating + review count,
 * and average response time. Designed to slot into the existing profile layout
 * without removing anything.
 */
export function DoctorTrustStrip({ experienceYears, stats }: DoctorTrustStripProps) {
    const ratingValue = stats.averageRating != null ? `${stats.averageRating.toFixed(1)}/5` : 'New';
    const ratingHint =
        stats.reviewCount > 0
            ? `${stats.reviewCount.toLocaleString()} review${stats.reviewCount === 1 ? '' : 's'}`
            : 'No reviews yet';
    const consultations =
        stats.consultationCount > 0 ? `${stats.consultationCount.toLocaleString()}+` : '—';
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            <StatTile
                icon={Award}
                label="Experience"
                value={experienceYears ? `${experienceYears} Years` : '—'}
                hint={experienceYears ? 'Practising' : 'Newly joined'}
            />
            <StatTile
                icon={Stethoscope}
                label="Consultations"
                value={consultations}
                hint="Completed visits"
            />
            <StatTile icon={Star} label="Rating" value={ratingValue} hint={ratingHint} />
            <StatTile
                icon={stats.avgResponseMinutes != null ? Timer : MessageCircle}
                label="Response"
                value={formatResponseTime(stats.avgResponseMinutes)}
                hint={stats.avgResponseMinutes != null ? 'Avg. join time' : 'New on platform'}
            />
        </div>
    );
}
