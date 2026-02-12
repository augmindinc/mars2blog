'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '@/types/user';
import { getUserProfile, mapProfileFromDb } from '@/services/authService';

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

export function AuthProvider({
    children,
    initialUser = null,
    initialProfile = null
}: {
    children: React.ReactNode;
    initialUser?: User | null;
    initialProfile?: UserProfile | null;
}) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
    const [loading, setLoading] = useState(!initialUser && !initialProfile);

    // Use the unified singleton browser client
    const supabaseClient = createClient();

    // 1. Initial Sync & Hydration (Phase: SSR Transition)
    useEffect(() => {
        const syncAuth = async () => {
            // Even if we had initial data, it's good to check on the client 
            // once to ensure everything is in sync with local storage
            const { data: { session } } = await supabaseClient.auth.getSession();
            const currentUser = session?.user ?? null;

            if (currentUser && !profile) {
                // If we have a user but no profile injected, fetch it
                const userProfile = await getUserProfile(currentUser.id);
                setProfile(userProfile);
            }

            setUser(currentUser);
            setLoading(false);
        };

        syncAuth();
    }, [supabaseClient]);

    // 2. Auth State Change Listener
    useEffect(() => {
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
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
    }, [supabaseClient]);

    // 3. Profile Real-time Subscription (Depends on user)
    useEffect(() => {
        if (!user) return;

        const profileChannel = supabaseClient
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
            supabaseClient.removeChannel(profileChannel);
        };
    }, [user?.id, supabaseClient]);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
