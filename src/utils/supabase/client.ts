import { createBrowserClient } from '@supabase/ssr'

// ABSOLUTE MINIMAL FETCHER
const simpleFetch = async (...args: any[]) => {
    const url = args[0]?.toString() || 'unknown';
    if (typeof window !== 'undefined') {
        console.warn(`[Supabase_SimpleFetch] START: ${url}`);
        (window as any).__LAST_FETCH_URL__ = url;
    }
    try {
        const res = await fetch(...(args as [any, any]));
        if (typeof window !== 'undefined') console.warn(`[Supabase_SimpleFetch] SUCCESS: ${url} (${res.status})`);
        return res;
    } catch (e: any) {
        if (typeof window !== 'undefined') console.error(`[Supabase_SimpleFetch] CRITICAL_FAIL: ${url}`, e.message);
        throw e;
    }
};

declare global { interface Window { __SUPABASE_SINGLETON__?: any; } }

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (typeof window === 'undefined') return createBrowserClient(url, key);
    if (window.__SUPABASE_SINGLETON__) return window.__SUPABASE_SINGLETON__;

    console.warn("[Supabase_Singleton] BOOTING_MINIMAL_CLIENT", { hasUrl: !!url });

    window.__SUPABASE_SINGLETON__ = createBrowserClient(url, key, {
        global: { fetch: simpleFetch }
    });

    return window.__SUPABASE_SINGLETON__;
}

export const supabaseBrowser = createClient();
