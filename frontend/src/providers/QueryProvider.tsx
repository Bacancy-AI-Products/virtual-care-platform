'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { useState, Component, ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-8 text-center">
                    <div>
                        <p className="text-xl font-bold text-slate-900 mb-2">
                            Something went wrong
                        </p>
                        <p className="text-slate-500 mb-6">
                            Reload the page or contact support if the problem persists.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-colors"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        gcTime: 10 * 60 * 1000,
                        refetchOnWindowFocus: false,
                        refetchOnReconnect: true,
                        placeholderData: keepPreviousData,
                        retry: 1,
                    },
                },
            }),
    );

    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: { fontWeight: 600 },
                    }}
                />
            </QueryClientProvider>
        </ErrorBoundary>
    );
}
