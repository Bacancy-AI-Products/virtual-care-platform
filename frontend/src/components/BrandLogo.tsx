'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

/** Official Bacancy mark — do not edit the asset; only scale via CSS. */
const LOGO_MARK_SRC = '/branding/bacancy-logo-without-name.png';

interface BrandLogoProps {
    /** Pass null to render as a plain element (no navigation). */
    href?: string | null;
    compact?: boolean;
}

export function BrandLogo({ href = '/doctors', compact }: BrandLogoProps) {
    const wrapperClass = 'flex items-center gap-2 sm:gap-2.5 min-w-0';
    const inner = (
        <>
            <Image
                src={LOGO_MARK_SRC}
                alt="Bacancy"
                width={160}
                height={160}
                className={
                    compact
                        ? 'h-8 w-auto max-w-[120px] object-contain object-left flex-shrink-0'
                        : 'h-9 w-auto max-w-[140px] sm:h-10 object-contain object-left flex-shrink-0'
                }
                priority
            />
            <span
                className={`font-bold text-brand-500 tracking-tight truncate ${
                    compact ? 'text-base sm:text-lg' : 'text-base sm:text-xl'
                }`}
            >
                BacancyTeleCare
            </span>
        </>
    );

    if (href === null) {
        return <div className={wrapperClass}>{inner}</div>;
    }

    return (
        <Link href={href} className={wrapperClass}>
            {inner}
        </Link>
    );
}
