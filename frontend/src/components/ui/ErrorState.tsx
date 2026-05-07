interface ErrorStateProps {
    message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
    return (
        <div className="p-12 bg-red-50 rounded-[40px] text-center">
            <p className="text-red-500 font-bold">{message}</p>
        </div>
    );
}
