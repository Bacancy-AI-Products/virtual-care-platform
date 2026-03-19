'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

/** Official Bacancy mark — do not edit the asset; only scale via CSS. */
const LOGO_MARK_SRC = '/branding/bacancy-logo-without-name.png';

interface BrandLogoProps {
    href?: string;
    compact?: boolean;
}

export function BrandLogo({ href = '/doctors', compact }: BrandLogoProps) {
    return (
        <Link href={href} className="flex items-center gap-2 sm:gap-2.5">
            <Image
                src={LOGO_MARK_SRC}
                alt="Bacancy"
                width={160}
                height={160}
                className={
                    compact
                        ? 'h-8 w-auto max-w-[120px] object-contain object-left'
                        : 'h-9 w-auto max-w-[140px] sm:h-10 object-contain object-left'
                }
                priority
            />
            <span
                className={`font-bold text-brand-500 tracking-tight ${
                    compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
                }`}
            >
                BacancyTeleCare
            </span>
        </Link>
    );
}
