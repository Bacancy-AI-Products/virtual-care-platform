export default function LoginLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-brand-500 animate-spin" />
            </div>
        </div>
    );
}
