'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

export function Providers({
    children,
    initialUser,
    initialProfile
}: {
    children: ReactNode;
    initialUser?: any;
    initialProfile?: any;
}) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
                    <LanguageProvider>
                        {children}
                    </LanguageProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
