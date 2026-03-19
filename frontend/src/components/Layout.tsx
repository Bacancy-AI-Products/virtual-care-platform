"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Calendar,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Users,
  Settings,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import { usersApi, filesApi, appointmentsApi, prescriptionsApi } from "@/services/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const patientNav: NavItem[] = [
  { to: "/patient/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patient/doctors", icon: Search, label: "Find Doctors" },
  { to: "/patient/appointments", icon: Calendar, label: "Appointments" },
  { to: "/patient/records", icon: FileText, label: "Medical Records" },
  { to: "/patient/profile", icon: User, label: "Profile" },
];

const doctorNav: NavItem[] = [
  { to: "/doctor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/doctor/appointments", icon: ClipboardList, label: "Appointments" },
  { to: "/doctor/availability", icon: Calendar, label: "Availability" },
  { to: "/doctor/patients", icon: Users, label: "Patient Records" },
  { to: "/doctor/profile", icon: User, label: "Profile" },
];

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/doctors", icon: Stethoscope, label: "Manage Doctors" },
  { to: "/admin/patients", icon: Users, label: "Manage Patients" },
  { to: "/admin/appointments", icon: Calendar, label: "All Appointments" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

// Prefetch API data on hover so it's cached before the page mounts
const PREFETCH_MAP: Record<string, (qc: ReturnType<typeof useQueryClient>) => void> = {
  "/patient/appointments": (qc) =>
    qc.prefetchQuery({
      queryKey: ["appointments", "patient", "all"],
      queryFn: () => appointmentsApi.list({ limit: 100 }),
    }),
  "/patient/records": (qc) =>
    qc.prefetchQuery({
      queryKey: ["prescriptions", "mine"],
      queryFn: () => prescriptionsApi.getMine(),
    }),
  "/patient/dashboard": (qc) =>
    qc.prefetchQuery({
      queryKey: ["appointments", "patient", "upcoming"],
      queryFn: () => appointmentsApi.list({ limit: 10 }),
    }),
  "/doctor/appointments": (qc) =>
    qc.prefetchQuery({
      queryKey: ["appointments", "doctor", "all"],
      queryFn: () => appointmentsApi.list({ limit: 100 }),
    }),
  "/doctor/dashboard": (qc) =>
    qc.prefetchQuery({
      queryKey: ["appointments", "doctor", "all"],
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

  React.useEffect(() => { setPending(false); }, [active]);

  const isHighlighted = active || pending;

  return (
    <Link
      href={to}
      onMouseEnter={() => PREFETCH_MAP[to]?.(qc)}
      onClick={() => { setPending(true); onClick?.(); }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        isHighlighted
          ? "bg-brand-500 text-white shadow-md shadow-brand-200"
          : "text-slate-600 hover:bg-brand-50 hover:text-brand-600",
      )}
    >
      <Icon
        className={cn(
          "w-5 h-5",
          isHighlighted ? "text-white" : "text-slate-400 group-hover:text-brand-500",
        )}
      />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  role: "patient" | "doctor" | "admin";
}

export const Layout = ({ children, role }: LayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);

  const navItems = role === "patient" ? patientNav : role === "doctor" ? doctorNav : adminNav;

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const displayName = isHydrated && user?.name ? user.name : "Loading...";
  const avatarSeed = isHydrated && user?.id ? user.id : "default";

  const { data: me } = useQuery({
    queryKey: ["users", "me"],
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
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  function handleLogout() {
    setIsMobileMenuOpen(false);
    logout();
    router.push("/login");
  }

  const Sidebar = () => (
    <>
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-100">
          {role === "admin" ? (
            <ShieldCheck className="text-white w-6 h-6" />
          ) : (
            <Stethoscope className="text-white w-6 h-6" />
          )}
        </div>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">TeleCare</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <SidebarItem key={item.to} {...item} active={pathname === item.to} />
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex w-full max-w-full overflow-x-hidden">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-6 fixed h-full z-40">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col w-full max-w-full overflow-x-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30">
          <button
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 hidden lg:block">
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {(() => {
                const segments = pathname.split("/").filter(Boolean);
                if (segments.length === 0) return "dashboard";
                const last = segments[segments.length - 1];
                const secondLast = segments[segments.length - 2];
                const isUuidLike = /^[0-9a-fA-F-]{8,}$/.test(last);
                const raw = isUuidLike && secondLast ? secondLast : last;
                return raw.replace(/-/g, " ");
              })()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-10 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (role === "patient") {
                    router.push("/patient/profile");
                  } else if (role === "doctor") {
                    router.push("/doctor/profile");
                  } else {
                    router.push("/admin/dashboard");
                  }
                }}
                className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-full"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
                <div className="relative w-10 h-10">
                  <Image
                    src={avatarUrl ?? `https://picsum.photos/seed/${avatarSeed}/100/100`}
                    alt="Avatar"
                    fill
                    className="rounded-full border-2 border-white shadow-sm object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10 flex-1 w-full max-w-full overflow-x-hidden">
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
          <aside className="absolute inset-y-0 left-0 w-72 bg-white p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                  {role === "admin" ? (
                    <ShieldCheck className="text-white w-6 h-6" />
                  ) : (
                    <Stethoscope className="text-white w-6 h-6" />
                  )}
                </div>
                <span className="text-2xl font-bold text-slate-900">TeleCare</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-2">
              {navItems.map((item) => (
                <SidebarItem
                  key={item.to}
                  {...item}
                  active={pathname === item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
