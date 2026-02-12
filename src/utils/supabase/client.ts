import { createBrowserClient } from '@supabase/ssr'

// Custom fetch with logging and relaxed 15s timeout for production stability
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Supabase request timed out (15s)')), 15000);

    if (typeof window !== 'undefined') console.log(`[Supabase Fetch] INIT: ${urlString}`);
    const start = Date.now();
    try {
        // Merge signals: either our timeout OR the one passed in (e.g. from TanStack Query)
        let signal = controller.signal;
        if (options?.signal && (AbortSignal as any).any) {
            signal = (AbortSignal as any).any([controller.signal, options.signal]);
        } else if (options?.signal) {
            // Fallback if AbortSignal.any is not supported (unlikely in 2026)
            // We prioritize the incoming signal but our timeout will still trigger via the controller
            signal = options.signal;
        }

        const response = await fetch(url, {
            ...options,
            signal
        });
        clearTimeout(timeoutId);
        if (typeof window !== 'undefined') {
            console.log(`[Supabase Fetch] DONE: ${urlString} (Status: ${response.status}) in ${Date.now() - start}ms`);
        }
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === 'AbortError' && controller.signal.aborted;
        if (typeof window !== 'undefined') {
            if (isTimeout) {
                console.warn(`[Supabase Fetch] TIMEOUT (15s): ${urlString}`);
            } else if (error.name === 'AbortError') {
                // If it's an AbortError but NOT our timeout, it's an intentional cancellation (e.g. unmount)
                console.log(`[Supabase Fetch] CANCELLED: ${urlString}`);
            } else {
                console.error(`[Supabase Fetch] FAIL: ${urlString} - ${error.message}`);
            }
        }
        throw error;
    }
};

// Singleton instance stored on window to be absolutely certain across HMR/bundles
declare global {
    interface Window {
        __SUPABASE_CLIENT__?: any;
    }
}

export function createClient() {
    if (typeof window === 'undefined') {
        // Server-side: create a new one every time (or use useMemo if needed)
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;

    window.__SUPABASE_CLIENT__ = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                fetch: customFetch
            }
        }
    )
    return window.__SUPABASE_CLIENT__;
}

// Export a constant for easy use in non-hook files
export const supabaseBrowser = createClient();
