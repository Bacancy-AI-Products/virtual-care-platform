import { PublicHeader } from '@/components/PublicHeader';
import { BackToHomeLink } from '@/components/BackToHomeLink';

export function LegalDocumentShell({
    title,
    lastUpdated,
    children,
}: {
    title: string;
    lastUpdated: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-brand-50/40">
            <div className="relative border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <PublicHeader />
                </div>
            </div>
            <main>
                <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <p className="mb-6">
                        <BackToHomeLink />
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
                        {title}
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mb-10">
                        Last updated: {lastUpdated}
                    </p>
                    <div className="space-y-8 text-slate-600 leading-relaxed text-[15px] sm:text-base">
                        {children}
                    </div>
                </article>
            </main>
        </div>
    );
}

export function LegalSection({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
            <div className="space-y-3">{children}</div>
        </section>
    );
}

export function LegalP({ children }: { children: React.ReactNode }) {
    return <p>{children}</p>;
}

export function LegalUl({ children }: { children: React.ReactNode }) {
    return <ul className="list-disc pl-5 space-y-2 marker:text-medical-teal">{children}</ul>;
}
