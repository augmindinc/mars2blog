import { supabase } from '@/lib/supabase';
import { UserRole, UserProfile, UserStatus } from '@/types/user';

const COLLECTION_USERS = 'profiles'; // Renamed to 'profiles' to match standard Supabase patterns

// Helper to convert database snake_case to TypeScript camelCase
export const mapProfileFromDb = (data: any): UserProfile => {
    return {
        ...data,
        uid: data.id,
        displayName: data.display_name,
        photoURL: data.photo_url || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

// Helper to convert TypeScript camelCase to database snake_case
export const mapProfileToDb = (profile: Partial<UserProfile>): any => {
    const { uid, displayName, photoURL, createdAt, updatedAt, ...rest } = profile;
    const mapped: any = { ...rest };
    if (uid !== undefined) mapped.id = uid;
    if (displayName !== undefined) mapped.display_name = displayName;
    if (photoURL !== undefined) mapped.photo_url = photoURL;
    if (createdAt !== undefined) mapped.created_at = createdAt;
    if (updatedAt !== undefined) mapped.updated_at = updatedAt;
    return mapped;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const { data, error } = await supabase
            .from(COLLECTION_USERS)
            .select('*')
            .eq('id', uid)
            .maybeSingle();

        if (error) {
            console.error("Supabase error fetching user profile:", error.message);
            throw error;
        }

        return data ? mapProfileFromDb(data) : null;
    } catch (error: any) {
        console.error("Error in getUserProfile:", error.message || error);
        return null;
    }
};

export const getUsers = async (): Promise<UserProfile[]> => {
    try {
        const { data, error } = await supabase
            .from(COLLECTION_USERS)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapProfileFromDb);
    } catch (error) {
        console.error("Error in getUsers:", error);
        return [];
    }
};

export const updateProfile = async (uid: string, updates: Partial<UserProfile>) => {
    try {
        const mappedUpdates = mapProfileToDb(updates);
        const { error } = await supabase
            .from(COLLECTION_USERS)
            .update({
                ...mappedUpdates,
                updated_at: new Date().toISOString()
            })
            .eq('id', uid);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error in updateProfile:", error);
        throw error;
    }
};

export const registerWithEmail = async (email: string, password: string, displayName: string, role: UserRole = 'author') => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                    role: role // Injected for trigger to use
                }
            }
        });

        if (authError) throw authError;

        return { user: authData.user };
    } catch (error) {
        console.error("Registration failed", error);
        throw error;
    }
};

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            const profile = await getUserProfile(data.user.id);
            return { user: data.user, profile };
        }
        return { user: null, profile: null };
    } catch (error) {
        console.error("Email login failed", error);
        throw error;
    }
};

export const loginWithGoogle = async (requestedRole: UserRole = 'author') => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
                queryParams: {
                    prompt: 'select_account',
                }
            }
        });

        if (error) throw error;

        return data;
    } catch (error) {
        console.error("Google login failed", error);
        throw error;
    }
};

export const handleRedirectResult = async () => {
    try {
        if (typeof window !== 'undefined') console.log('[authService] handleRedirectResult started');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
            if (typeof window !== 'undefined') console.log('[authService] handleRedirectResult: session found for', session.user.id);
            // Profile is now created automatically by DB trigger
            const profile = await getUserProfile(session.user.id);
            if (typeof window !== 'undefined') console.log('[authService] handleRedirectResult completed with user');
            return session.user;
        }
        if (typeof window !== 'undefined') console.log('[authService] handleRedirectResult completed (no session)');
    } catch (error) {
        console.error("Redirect result error", error);
    }
    return null;
};

export const logout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error("Logout failed", error);
        throw error;
    }
};
