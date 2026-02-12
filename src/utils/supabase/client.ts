import { createBrowserClient } from '@supabase/ssr'

// Production-ready fetcher with essential tracing
const stableFetch = async (url: string | URL | Request, options?: RequestInit) => {
    if (typeof window === 'undefined') return fetch(url, options);

    const urlString = url.toString();
    const controller = new AbortController();

    // 15s timeout for high-latency environments (like some mobile networks)
    const timeoutId = setTimeout(() => {
        console.warn(`[Supabase_Network] TIMEOUT: ${urlString}`);
        controller.abort(new Error('Persistent network timeout (15s)'));
    }, 15000);

    try {
        let signal = controller.signal;

        // Safety: Manual signal linkage for older browser support or specific fetch versions
        if (options?.signal) {
            const external = options.signal;
            if (external.aborted) {
                controller.abort(external.reason);
            } else {
                external.addEventListener('abort', () => controller.abort(external.reason), { once: true });
            }
        }

        const response = await fetch(url, { ...options, signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
            console.error(`[Supabase_Network] ERROR: ${urlString}`, error.message);
        }
        throw error;
    }
};

declare global { interface Window { __SUPABASE_CLIENT_SINGLETON__?: any; } }

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (typeof window === 'undefined') return createBrowserClient(url, key);

    if (window.__SUPABASE_CLIENT_SINGLETON__) return window.__SUPABASE_CLIENT_SINGLETON__;

    // Initialize singleton with custom stableFetch
    window.__SUPABASE_CLIENT_SINGLETON__ = createBrowserClient(url, key, {
        global: { fetch: stableFetch }
    });

    return window.__SUPABASE_CLIENT_SINGLETON__;
}

export const supabaseBrowser = createClient();
