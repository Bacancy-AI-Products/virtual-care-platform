'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function BackToHomeLink({
    href = '/',
    children = 'Back to home',
    className,
    desktopFixed = false,
}: {
    href?: string;
    children?: React.ReactNode;
    className?: string;
    /** Auth desktop: fixed top-left on large screens */
    desktopFixed?: boolean;
}) {
    return (
        <Link
            href={href}
            className={twMerge(
                clsx(
                    'group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 rounded-lg px-2 py-1.5 -ml-2',
                    'transition-colors hover:text-brand-600 hover:bg-slate-50/90',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2',
                    desktopFixed &&
                        'hidden lg:inline-flex lg:absolute lg:top-8 lg:left-8 lg:z-10 lg:ml-0',
                    className,
                ),
            )}
        >
            <ChevronLeft
                className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
            />
            {children}
        </Link>
    );
}

/** Same chevron treatment for in-flow auth links (e.g. Back to login). */
export function BackNavLink({
    href,
    children,
    className,
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={clsx(
                'group inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 rounded-lg px-2 py-1.5',
                'transition-colors hover:text-brand-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2',
                className,
            )}
        >
            <ChevronLeft
                className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
            />
            {children}
        </Link>
    );
}
