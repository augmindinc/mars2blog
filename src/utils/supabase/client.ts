import { createBrowserClient } from '@supabase/ssr'

// Custom fetch with logging and relaxed 15s timeout for production stability
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined') console.warn(`[Supabase Fetch] TIMEOUT_TRIGGERED (15s): ${urlString}`);
        controller.abort(new Error('Supabase request timed out (15s)'));
    }, 15000);

    if (typeof window !== 'undefined') console.log(`[Supabase Fetch] INIT: ${urlString}`);
    const start = Date.now();
    try {
        // Robust signal merging: Use AbortSignal.any if available (Chrome 116+, Node 20+)
        let signal = controller.signal;
        if (options?.signal) {
            if ((AbortSignal as any).any) {
                signal = (AbortSignal as any).any([controller.signal, options.signal]);
            } else {
                // Manual link if .any is missing
                const externalSignal = options.signal;
                if (externalSignal.aborted) {
                    controller.abort(externalSignal.reason);
                } else {
                    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
                }
                signal = controller.signal;
            }
        }

        const response = await fetch(url, { ...options, signal });
        clearTimeout(timeoutId);

        if (typeof window !== 'undefined') {
            const duration = Date.now() - start;
            console.log(`[Supabase Fetch] DONE: ${urlString} (Status: ${response.status}) in ${duration}ms`);
        }
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === 'AbortError' && controller.signal.aborted;
        if (typeof window !== 'undefined') {
            if (isTimeout) {
                console.error(`[Supabase Fetch] TIMEOUT_ABORT: ${urlString}`);
            } else if (error.name === 'AbortError') {
                console.log(`[Supabase Fetch] USER_CANCELLED: ${urlString}`);
            } else {
                console.error(`[Supabase Fetch] NETWORK_ERROR: ${urlString} - ${error.message}`);
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        if (typeof window !== 'undefined') {
            console.error("[Supabase Client] CRITICAL: Missing ENV vars", { url: !!supabaseUrl, key: !!supabaseKey });
        }
    }

    // Server-side logic (Always create fresh OR use common cache if needed)
    if (typeof window === 'undefined') {
        return createBrowserClient(supabaseUrl || '', supabaseKey || '', {
            global: { fetch: customFetch }
        });
    }

    // Singleton logic
    if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;

    if (typeof window !== 'undefined') {
        console.log("[Supabase Client] INTIALIZING_SINGLETON", { url: supabaseUrl?.substring(0, 20) + "..." });
    }

    window.__SUPABASE_CLIENT__ = createBrowserClient(supabaseUrl || '', supabaseKey || '', {
        global: { fetch: customFetch }
    });

    return window.__SUPABASE_CLIENT__;
}

// Export a proxy-like constant that always calls createClient() to ensure environment consistency
export const supabaseBrowser = createClient();
