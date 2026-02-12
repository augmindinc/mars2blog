'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';
import { getUserProfile, handleRedirectResult, mapProfileFromDb } from '@/services/authService';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Initial Load Flow (Phase: Bootstrapping)
    useEffect(() => {
        const initAuth = async () => {
            if (typeof window !== 'undefined') console.log('[AuthContext] initAuth started (Phase: Initial)');

            try {
                if (typeof window !== 'undefined') console.log('[AuthContext] Fetching session with timeout protection...');

                // Add a timeout to prevent infinite hang in production
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase session fetch timed out')), 10000)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
                const session = result.data?.session;
                const sessionError = result.error;

                if (typeof window !== 'undefined') {
                    console.log(`[AuthContext] Session result: hasSession=${!!session}, user=${session?.user?.id || 'none'}, error=${sessionError?.message || 'none'}`);
                }

                if (sessionError) throw sessionError;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    if (typeof window !== 'undefined') console.log('[AuthContext] Fetching profile for:', currentUser.id);
                    const userProfile = await getUserProfile(currentUser.id);
                    if (typeof window !== 'undefined') {
                        console.log(`[AuthContext] Profile result: exists=${!!userProfile}, role=${userProfile?.role}`);
                    }
                    setProfile(userProfile);
                }
            } catch (err: any) {
                console.error('[AuthContext] initAuth failed:', err.message || err);
            } finally {
                setLoading(false);
                if (typeof window !== 'undefined') console.log('[AuthContext] initAuth sequence finished');
            }
        };

        initAuth();
    }, []); // RUN ONCE

    // 2. Auth State Change Listener
    useEffect(() => {
        if (typeof window !== 'undefined') console.log('[AuthContext] Setting up AuthState listener');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (typeof window !== 'undefined') console.log('[AuthContext] Auth state changed:', event);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const userProfile = await getUserProfile(currentUser.id);
                setProfile(userProfile);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            if (typeof window !== 'undefined') console.log('[AuthContext] Cleaning up AuthState listener');
            subscription.unsubscribe();
        };
    }, []); // RUN ONCE

    // 3. Profile Real-time Subscription (Depends on user)
    useEffect(() => {
        if (!user) return;

        if (typeof window !== 'undefined') console.log('[AuthContext] Setting up Profile subscription for:', user.id);
        const profileChannel = supabase
            .channel(`public:profiles:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                if (payload.new) {
                    if (typeof window !== 'undefined') console.log('[AuthContext] Profile updated via real-time');
                    setProfile(mapProfileFromDb(payload.new));
                }
            })
            .subscribe();

        return () => {
            if (typeof window !== 'undefined') console.log('[AuthContext] Cleaning up Profile subscription');
            supabase.removeChannel(profileChannel);
        };
    }, [user?.id]); // RUN WHEN USER CHANGES

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
