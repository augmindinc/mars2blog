'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

// Static QueryClient to ensure absolute singleton behavior across re-renders
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always create a new one
        return new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                },
            },
        });
    } else {
        // Browser: use singleton
        if (!browserQueryClient) {
            console.warn('[Providers] Initializing Browser QueryClient Singleton');
            browserQueryClient = new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        retry: 1,
                    },
                },
            });
        }
        return browserQueryClient;
    }
}

export function Providers({
    children,
    initialUser,
    initialProfile
}: {
    children: ReactNode;
    initialUser?: any;
    initialProfile?: any;
}) {
    const queryClient = getQueryClient();

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
