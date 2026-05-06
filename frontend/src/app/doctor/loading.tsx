export default function DoctorLoading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-brand-500 animate-spin" />
                </div>
                <p className="text-sm font-medium text-slate-400">Loading...</p>
            </div>
        </div>
    );
}
