'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLocale } from 'next-intl';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const router = useRouter();
    const locale = useLocale();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const handleAuth = async () => {
            try {
                // 1. Fragment flow (#access_token) is handled automatically by getSession
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    router.push(`/${locale}/auth/auth-error`);
                    return;
                }

                if (session) {
                    router.push(`/${locale}/admin`);
                    return;
                }

                // 2. Code flow (?code=) exchange it manually
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                if (code) {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        console.error('Code exchange error:', exchangeError);
                        router.push(`/${locale}/auth/auth-error`);
                    } else {
                        router.push(`/${locale}/admin`);
                    }
                    return;
                }

                // 3. Fallback
                const timeout = setTimeout(() => {
                    router.push(`/${locale}/auth/auth-error`);
                }, 5000);

                return () => clearTimeout(timeout);
            } catch (err) {
                console.error('Unexpected auth callback error:', err);
                router.push(`/${locale}/auth/auth-error`);
            }
        };

        handleAuth();
    }, [mounted, router, locale]);

    // Avoid hydration mismatch by rendering nothing or a static shell during SSR
    if (!mounted) {
        return <div className="min-h-screen bg-white" />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <div className="flex flex-col items-center space-y-6">
                <Loader2 className="w-10 h-10 animate-spin text-black" />
                <div className="text-center">
                    <h1 className="text-xs font-black uppercase tracking-[0.2em] mb-2">Synchronizing Protocols</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                        Verifying Security Handshake...
                    </p>
                </div>
            </div>
        </div>
    );
}
