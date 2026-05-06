'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Wraps children with a React Query client.
 * Uses useState so each Next.js render gets its own client instance.
 */
export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000, // data is fresh for 30s — no background refetch
                        gcTime: 10 * 60 * 1000, // keep cache for 10 min — instant back-navigation
                        refetchOnWindowFocus: false, // don't refetch when the tab regains focus
                        refetchOnReconnect: true, // do refetch when internet reconnects
                        placeholderData: keepPreviousData, // show old data while reloading — no empty flashes
                        retry: 1,
                    },
                },
            }),
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
