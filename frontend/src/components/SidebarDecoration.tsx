'use client';

import { useId } from 'react';

/** Soft brand-orange healthcare motif behind desktop sidebar (matches Bacancy TeleCare theme). */
export function SidebarDecoration() {
    const uid = useId();
    const paperId = `${uid}-sidebar-paper`;

    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(115%_75%_at_100%_0%,rgba(245,130,32,0.14),transparent_52%),radial-gradient(85%_55%_at_-5%_100%,rgba(255,200,150,0.12),transparent_48%)]" />
            <svg
                className="absolute inset-0 h-full w-full opacity-90"
                viewBox="0 0 288 720"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <pattern
                        id={paperId}
                        width="48"
                        height="48"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M0 24h48M24 0v48"
                            stroke="#f58220"
                            strokeOpacity="0.055"
                            strokeWidth="0.5"
                        />
                    </pattern>
                </defs>
                <rect width="288" height="720" fill={`url(#${paperId})`} />
                <path
                    d="M-24 512H28L38 478L48 548L58 500H92L102 468L114 556L124 508H168L182 482L190 540L198 498H248L260 472L272 552L282 502H340"
                    stroke="#e06d10"
                    strokeOpacity="0.14"
                    strokeWidth="1.75"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    fill="none"
                />
            </svg>
        </div>
    );
}
