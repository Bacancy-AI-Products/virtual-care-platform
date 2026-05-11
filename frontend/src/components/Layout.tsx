'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Search,
    Calendar,
    FileText,
    User,
    LogOut,
    Menu,
    X,
    Users,
    Settings,
    ClipboardList,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { SidebarDecoration } from '@/components/SidebarDecoration';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationBell } from '@/components/NotificationBell';
import { authApi, usersApi, filesApi, appointmentsApi, prescriptionsApi } from '@/services/api';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const ROLE_HEADER_TAGLINE: Record<'patient' | 'doctor' | 'admin', string> = {
    patient: 'Stay on top of appointments, records, and visits.',
    doctor: 'Schedule, visits, and patient context in one place.',
    admin: 'Monitor providers, patients, and platform activity.',
};

interface NavItem {
    to: string;
    icon: React.ElementType;
    label: string;
}

const patientNav: NavItem[] = [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patient/doctors', icon: Search, label: 'Find Doctors' },
    { to: '/patient/appointments', icon: Calendar, label: 'Appointments' },
    { to: '/patient/records', icon: FileText, label: 'Medical Records' },
    { to: '/patient/profile', icon: User, label: 'Profile' },
];

const doctorNav: NavItem[] = [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/appointments', icon: ClipboardList, label: 'Appointments' },
    { to: '/doctor/availability', icon: Calendar, label: 'Availability' },
    { to: '/doctor/patients', icon: Users, label: 'Patient Records' },
    { to: '/doctor/profile', icon: User, label: 'Profile' },
];

const adminNav: NavItem[] = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/doctors', icon: Search, label: 'Manage Doctors' },
    { to: '/admin/patients', icon: Users, label: 'Manage Patients' },
    { to: '/admin/appointments', icon: Calendar, label: 'All Appointments' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

// Prefetch API data on hover so it's cached before the page mounts
const PREFETCH_MAP: Record<string, (qc: ReturnType<typeof useQueryClient>) => void> = {
    '/patient/appointments': (qc) =>
        qc.prefetchQuery({
            queryKey: ['appointments', 'patient', 'all'],
            queryFn: () => appointmentsApi.list({ limit: 100 }),
        }),
    '/patient/records': (qc) =>
        qc.prefetchQuery({
            queryKey: ['prescriptions', 'mine'],
            queryFn: () => prescriptionsApi.getMine(),
        }),
    '/patient/dashboard': (qc) =>
        qc.prefetchQuery({
            queryKey: ['appointments', 'patient', 'upcoming'],
            queryFn: () => appointmentsApi.list({ limit: 10 }),
        }),
    '/doctor/appointments': (qc) =>
        qc.prefetchQuery({
            queryKey: ['appointments', 'doctor', 'all'],
            queryFn: () => appointmentsApi.list({ limit: 100 }),
        }),
    '/doctor/dashboard': (qc) =>
        qc.prefetchQuery({
            queryKey: ['appointments', 'doctor', 'all'],
            queryFn: () => appointmentsApi.list({ limit: 100 }),
        }),
};

function SidebarItem({
    to,
    icon: Icon,
    label,
    active,
    onClick,
}: NavItem & { active: boolean; onClick?: () => void }) {
    const [pending, setPending] = React.useState(false);
    const qc = useQueryClient();

    React.useEffect(() => {
        setPending(false);
    }, [active]);

    const isHighlighted = active || pending;

    return (
        <Link
            href={to}
            aria-current={active ? 'page' : undefined}
            onMouseEnter={() => PREFETCH_MAP[to]?.(qc)}
            onClick={() => {
                setPending(true);
                onClick?.();
            }}
            className={cn(
                'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 text-sm transition-all duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                isHighlighted
                    ? 'py-3 font-semibold text-brand-900 bg-brand-100 shadow-[inset_0_0_0_1px_rgba(245,130,32,0.25)]'
                    : 'py-2.5 font-semibold text-slate-900 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0',
                !isHighlighted &&
                    'bg-white/55 shadow-sm shadow-slate-900/5 ring-1 ring-white/80 backdrop-blur-[2px] hover:bg-white/88 hover:shadow-md hover:shadow-slate-900/8',
            )}
        >
            <span
                className={cn(
                    'absolute left-0 top-1/2 h-[72%] w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500 transition-[opacity,transform] duration-200',
                    isHighlighted ? 'opacity-90 scale-y-100' : 'opacity-0 scale-y-50',
                )}
                aria-hidden
            />
            <Icon
                className={cn(
                    'relative z-[1] h-5 w-5 shrink-0 transition-transform duration-200 motion-safe:group-hover:scale-[1.05]',
                    isHighlighted ? 'text-brand-700' : 'text-slate-600 group-hover:text-brand-600',
                )}
                aria-hidden
            />
            <span className="relative z-[1] min-w-0 flex-1 leading-snug [text-shadow:0_1px_0_rgb(255_255_255_/_.75)]">
                {label}
            </span>
        </Link>
    );
}

interface LayoutProps {
    children: React.ReactNode;
    role: 'patient' | 'doctor' | 'admin';
}

export const Layout = ({ children, role }: LayoutProps) => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
    const [isHydrated, setIsHydrated] = React.useState(false);
    const [headerDate, setHeaderDate] = React.useState<{ line: string; iso: string } | null>(null);

    const navItems = role === 'patient' ? patientNav : role === 'doctor' ? doctorNav : adminNav;

    React.useEffect(() => {
        setIsHydrated(true);
    }, []);

    React.useEffect(() => {
        const d = new Date();
        setHeaderDate({
            iso: d.toISOString().slice(0, 10),
            line: new Intl.DateTimeFormat(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(d),
        });
    }, []);

    const dashboardPath = `/${role}/dashboard`;
    const brandLogoHref =
        role === 'patient'
            ? '/patient/dashboard'
            : role === 'doctor'
              ? '/doctor/dashboard'
              : '/admin/dashboard';

    const displayName = isHydrated && user?.name ? user.name : 'Loading...';
    const avatarSeed = isHydrated && user?.id ? user.id : 'default';
    const isOnDashboard = pathname === dashboardPath;

    const { data: me } = useQuery({
        queryKey: ['users', 'me'],
        queryFn: () => usersApi.getMe(),
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    const avatarFileId = me?.avatarFileId ?? null;

    React.useEffect(() => {
        let active = true;
        if (!avatarFileId) {
            setAvatarUrl(null);
            return () => {
                active = false;
            };
        }
        filesApi
            .fetchBlob(avatarFileId)
            .then((url) => {
                if (active) setAvatarUrl(url);
            })
            .catch(() => {
                if (active) setAvatarUrl(null);
            });
        return () => {
            active = false;
        };
    }, [avatarFileId]);

    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    React.useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    React.useEffect(() => {
        if (!isMobileMenuOpen) {
            document.body.style.overflow = '';
            return;
        }

        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    async function handleLogout() {
        setIsMobileMenuOpen(false);
        try {
            await authApi.logout();
        } catch {
            // Fall back to local logout even if revoke request fails.
        }
        logout();
        router.push('/login');
    }

    /** Paren + `<div` share one line so SWC never parses `=` newline `<` as an expression. */
    const sidebarLogoRow = (
        <div className="-mx-4 mb-3 flex h-[66px] shrink-0 items-center px-4">
            <BrandLogo href={brandLogoHref} />
        </div>
    );

    const Sidebar = ({
        header,
        onNavClick,
    }: {
        header?: React.ReactNode;
        onNavClick?: () => void;
    } = {}) => {
        return (
            <>
                {header ?? sidebarLogoRow}

                <nav
                    className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto no-scrollbar pb-1"
                    aria-label="Primary"
                >
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.to}
                            {...item}
                            active={pathname === item.to}
                            onClick={onNavClick}
                        />
                    ))}
                </nav>

                <div className="shrink-0 border-t border-slate-200/80 pt-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/60 bg-white/55 px-3 py-2.5 text-left text-sm font-semibold text-slate-900 shadow-sm shadow-slate-900/5 ring-1 ring-white/80 backdrop-blur-[2px] transition-all duration-200 hover:border-red-200/90 hover:bg-red-50/95 hover:text-red-700 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100/95 text-slate-600 transition-colors group-hover:bg-red-100 group-hover:text-red-600">
                            <LogOut className="h-[18px] w-[18px]" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-col">
                            <span className="leading-tight [text-shadow:0_1px_0_rgb(255_255_255_/_.75)]">
                                Sign out
                            </span>
                            <span className="text-[11px] font-medium text-slate-600 group-hover:text-red-600/90">
                                End your session securely
                            </span>
                        </span>
                    </button>
                </div>
            </>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex w-full max-w-full overflow-x-hidden">
            {/* Sidebar — Desktop */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white/92 shadow-[6px_0_32px_-18px_rgba(15,23,42,0.12)] backdrop-blur-md lg:flex lg:flex-col">
                <div
                    className="pointer-events-none absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500"
                    aria-hidden
                />
                <SidebarDecoration />
                {/* Between photo (z-0) and nav (z-10): vertical fades only — no left scrim */}
                <div className="pointer-events-none absolute inset-0 z-[8]" aria-hidden>
                    <div className="absolute inset-x-0 top-0 h-[min(58vh,24rem)] bg-gradient-to-b from-white/[0.82] via-white/[0.48] via-[52%] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-[6.5rem] bg-gradient-to-t from-white/[0.72] via-white/[0.28] to-transparent" />
                </div>
                <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-0">
                    <Sidebar />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex min-h-screen w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden pt-[66px] lg:ml-72">
                {/* Fixed within content column — desktop aligns with lg:ml-72 sidebar */}
                <header className="fixed left-0 right-0 top-0 z-[38] flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/92 px-4 shadow-[0_4px_28px_-10px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:px-6 lg:left-72 lg:gap-6 lg:px-10">
                    <span
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-medical-teal/0 via-brand-400/50 to-medical-teal/0"
                        aria-hidden
                    />
                    <button
                        type="button"
                        className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm ring-1 ring-slate-100/90 transition-colors hover:border-brand-200 hover:bg-brand-50/70 hover:text-brand-800 active:scale-[0.98]"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" aria-hidden />
                    </button>

                    <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <time
                                dateTime={headerDate?.iso}
                                className="text-sm font-semibold text-slate-800"
                                suppressHydrationWarning
                            >
                                {headerDate?.line ?? '\u00a0'}
                            </time>
                            {!isOnDashboard && (
                                <Link
                                    href={dashboardPath}
                                    className="text-xs font-semibold text-brand-600 transition-colors hover:text-brand-800"
                                >
                                    Overview
                                </Link>
                            )}
                        </div>
                        <p className="mt-0.5 hidden truncate text-xs leading-snug text-slate-500 sm:block">
                            {ROLE_HEADER_TAGLINE[role]}
                        </p>
                    </div>

                    <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3">
                        <NotificationBell />
                        <button
                            type="button"
                            onClick={() => {
                                if (role === 'patient') {
                                    router.push('/patient/profile');
                                } else if (role === 'doctor') {
                                    router.push('/doctor/profile');
                                } else {
                                    router.push('/admin/dashboard');
                                }
                            }}
                            className="group flex min-w-0 max-w-[min(11.5rem,calc(100vw-9.5rem))] items-center gap-2 rounded-full border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 py-1.5 pl-2.5 pr-1 shadow-sm shadow-slate-200/35 ring-1 ring-white/90 transition-[border-color,box-shadow] hover:border-brand-200/95 hover:shadow-md hover:shadow-brand-100/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 sm:max-w-none sm:py-1 sm:pl-4"
                            aria-label="Open profile"
                        >
                            <div className="min-w-0 flex-1 text-left sm:text-right">
                                <p className="truncate text-xs font-semibold leading-tight text-slate-900 sm:text-sm">
                                    {displayName}
                                </p>
                                <p className="truncate text-[10px] font-medium capitalize leading-tight text-slate-500 sm:text-[11px]">
                                    {role}
                                </p>
                            </div>
                            <div className="relative h-10 w-10 shrink-0 rounded-full shadow-md shadow-slate-400/25 ring-2 ring-white transition-transform group-hover:ring-brand-100/80 sm:h-9 sm:w-9">
                                <Image
                                    src={
                                        avatarUrl ??
                                        `https://picsum.photos/seed/${avatarSeed}/100/100`
                                    }
                                    alt="Avatar"
                                    fill
                                    className="rounded-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    {children}
                </div>
            </main>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 flex max-h-full w-[min(20.5rem,calc(100vw-1.25rem))] flex-col overflow-hidden border-l-[3px] border-l-medical-teal bg-white/92 shadow-[6px_0_40px_-22px_rgba(15,23,42,0.2)] backdrop-blur-md">
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-medical-teal via-brand-400 to-brand-500 opacity-90"
                            aria-hidden
                        />
                        <SidebarDecoration />
                        <div className="pointer-events-none absolute inset-0 z-[8]" aria-hidden>
                            <div className="absolute inset-x-0 top-0 h-[min(58vh,24rem)] bg-gradient-to-b from-white/[0.82] via-white/[0.48] via-[52%] to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 h-[6.5rem] bg-gradient-to-t from-white/[0.72] via-white/[0.28] to-transparent" />
                        </div>
                        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-0">
                            <Sidebar
                                header={
                                    <div className="-mx-4 mb-3 flex h-[66px] shrink-0 items-center justify-between gap-2 px-4">
                                        <BrandLogo href={brandLogoHref} />
                                        <button
                                            type="button"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/80 hover:text-brand-800"
                                            aria-label="Close menu"
                                        >
                                            <X className="h-5 w-5" aria-hidden />
                                        </button>
                                    </div>
                                }
                                onNavClick={() => setIsMobileMenuOpen(false)}
                            />
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};
