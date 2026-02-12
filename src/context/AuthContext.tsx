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
                // Add a timeout to prevent infinite hang in production
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase session fetch timed out')), 7000)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
                const session = result.data?.session;
                const sessionError = result.error;

                if (typeof window !== 'undefined') {
                    console.log(`[AuthContext] Session result: hasSession=${!!session}, user=${session?.user?.id || 'none'}`);
                }

                if (sessionError) throw sessionError;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const userProfile = await getUserProfile(currentUser.id);
                    setProfile(userProfile);
                }
            } catch (err: any) {
                console.error('[AuthContext] initAuth failed:', err.message || err);
            } finally {
                setLoading(false);
                if (typeof window !== 'undefined') console.log('[AuthContext] initAuth finished');
            }
        };

        initAuth();
    }, []); // RUN ONCE

    // 2. Auth State Change Listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
            subscription.unsubscribe();
        };
    }, []); // RUN ONCE

    // 3. Profile Real-time Subscription (Depends on user)
    useEffect(() => {
        if (!user) return;

        const profileChannel = supabase
            .channel(`public:profiles:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                if (payload.new) {
                    setProfile(mapProfileFromDb(payload.new));
                }
            })
            .subscribe();

        return () => {
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
