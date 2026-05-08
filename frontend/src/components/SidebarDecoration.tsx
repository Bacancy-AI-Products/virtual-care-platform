'use client';

import Image from 'next/image';

const SIDEBAR_BG = '/branding/sidebar-doctor.jpg';

/** Full-sidebar cover image; readability scrims live in Layout (z-8 above this z-0 layer). */
export function SidebarDecoration() {
    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            {/* Base wash — soft medical mint canvas behind the photo */}
            <div className="absolute inset-0 bg-medical-soft/40" />

            {/* Background photo — visible but low opacity so menu stays readable on top */}
            <Image
                src={SIDEBAR_BG}
                alt=""
                fill
                sizes="288px"
                priority={false}
                className="object-cover object-[50%_30%] opacity-[0.32] saturate-[0.95] brightness-[1.05]"
            />

            {/* Brand-tinted ambient glow — warm orange top-right, calm teal bottom-left */}
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(90%_60%_at_100%_0%,rgba(245,130,32,0.10),transparent_60%),radial-gradient(85%_55%_at_0%_100%,rgba(20,184,166,0.10),transparent_58%)]" />

            {/* Top accent line — brand gradient hairline */}
            <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-medical-teal/40 via-brand-400/50 to-transparent" />
        </div>
    );
}
