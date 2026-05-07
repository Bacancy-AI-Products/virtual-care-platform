'use client';

import Image from 'next/image';

/** Unsplash — photo-1576091160550 · stethoscope + laptop (telemedicine / desk). */
const SIDEBAR_BG = '/branding/sidebar-telemedicine-desk.jpg';

/** Full-sidebar cover image; readability scrims live in Layout (z-8 above this z-0 layer). */
export function SidebarDecoration() {
    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-medical-soft/65" />
            <Image
                src={SIDEBAR_BG}
                alt=""
                fill
                sizes="288px"
                priority={false}
                className="object-cover object-[56%_62%] opacity-[0.26] brightness-[1.03] contrast-[1.06] sm:object-[55%_58%] sm:opacity-[0.28]"
            />
            <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-medical-teal/25 via-brand-400/35 to-transparent" />
            <div
                className="absolute inset-0 z-[1] opacity-[0.14] bg-[linear-gradient(to_right,rgb(148_163_184_/_0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
                aria-hidden
            />
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(80%_55%_at_100%_0%,rgba(245,130,32,0.05),transparent_58%),radial-gradient(72%_50%_at_0%_100%,rgba(20,184,166,0.06),transparent_54%)]" />
        </div>
    );
}
