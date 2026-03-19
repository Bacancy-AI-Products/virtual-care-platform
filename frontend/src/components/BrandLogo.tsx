'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface BrandLogoProps {
  href?: string;
  compact?: boolean;
}

export function BrandLogo({ href, compact = false }: BrandLogoProps) {
  const iconSize = compact ? 32 : 40;

  const inner = (
    <div className="flex items-start gap-3">
      <Image
        src="/branding/bacancy-logo-without-name.png"
        alt="Bacancy"
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0"
      />
      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-[0.06em] uppercase text-slate-900 leading-tight ${
            compact ? 'text-base' : 'text-xl'
          }`}
        >
          Bacancy
        </span>
        <span className="font-semibold text-slate-500 tracking-widest uppercase text-[11px] leading-tight">
          TeleCare
        </span>
      </div>
    </div>
  );

  if (href === undefined) {
    return inner;
  }

  return (
    <Link href={href} className="inline-flex items-start">
      {inner}
    </Link>
  );
}
