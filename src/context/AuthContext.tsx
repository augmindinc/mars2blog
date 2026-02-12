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

    useEffect(() => {
        // 1. Initial Profile Check
        const initAuth = async () => {
            if (typeof window !== 'undefined') console.log('[AuthContext] initAuth started');
            // Check for redirect result (OAuth)
            await handleRedirectResult();

            const { data: { session }, error } = await supabase.auth.getSession();
            if (typeof window !== 'undefined') {
                console.log('[AuthContext] getSession response:', { hasSession: !!session, error });
            }

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                if (typeof window !== 'undefined') console.log('[AuthContext] Fetching profile for:', currentUser.id);
                const userProfile = await getUserProfile(currentUser.id);
                if (typeof window !== 'undefined') {
                    console.log(`[AuthContext] Profile load result: exists=${!!userProfile}, role=${userProfile?.role}, status=${userProfile?.status}`);
                }
                setProfile(userProfile);
            } else {
                if (typeof window !== 'undefined') console.log('[AuthContext] No user session found');
            }
            setLoading(false);
        };

        initAuth().catch(err => {
            console.error('[AuthContext] initAuth uncaught error:', err);
            setLoading(false);
        });

        // 2. Auth State Change Listener
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

        // 3. Profile Subscription
        let profileChannel: any = null;
        if (user) {
            profileChannel = supabase
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
        }

        return () => {
            subscription.unsubscribe();
            if (profileChannel) {
                supabase.removeChannel(profileChannel);
            }
        };
    }, [user?.id]); // Re-subscribe if user changes

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
