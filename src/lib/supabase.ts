import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
        console.warn('Supabase credentials are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env settings.');
    }
}

// Custom fetch with logging and strict 10s timeout to debug production hangs
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s global timeout

    if (typeof window !== 'undefined') console.log(`[Supabase Fetch] INIT: ${urlString}`);
    const start = Date.now();
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (typeof window !== 'undefined') {
            console.log(`[Supabase Fetch] DONE: ${urlString} (Status: ${response.status}) in ${Date.now() - start}ms`);
        }
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === 'AbortError';
        if (typeof window !== 'undefined') {
            console.error(`[Supabase Fetch] ${isTimeout ? 'TIMEOUT' : 'FAIL'}: ${urlString} - Error: ${error.message}`);
        }
        throw error;
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: customFetch
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
