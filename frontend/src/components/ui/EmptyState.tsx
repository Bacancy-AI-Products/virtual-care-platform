interface EmptyStateProps {
    icon: React.ReactNode;
    title?: string;
    message: string;
    children?: React.ReactNode;
}

export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
    return (
        <div className="p-16 bg-white rounded-[40px] border border-dashed border-slate-200 text-center flex flex-col items-center gap-3">
            {icon}
            {title && <h4 className="text-xl font-bold text-slate-900">{title}</h4>}
            <p className="text-slate-500 font-medium">{message}</p>
            {children}
        </div>
    );
}
