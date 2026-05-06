'use client';

/** Background layers aligned with the landing page (grid + soft teal / brand wash). */
export function SidebarDecoration() {
    return (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-white via-medical-soft/25 to-white" />
            <div
                className="absolute inset-0 opacity-[0.3] bg-[linear-gradient(to_right,rgb(148_163_184_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184_/_0.06)_1px,transparent_1px)] bg-[size:48px_48px]"
                aria-hidden
            />
            <div className="absolute inset-0 bg-[radial-gradient(115%_75%_at_100%_0%,rgba(245,130,32,0.07),transparent_52%),radial-gradient(85%_55%_at_-5%_100%,rgba(20,184,166,0.06),transparent_48%)]" />
        </div>
    );
}
