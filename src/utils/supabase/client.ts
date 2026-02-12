import { createBrowserClient } from '@supabase/ssr'

// Custom fetch with logging and relaxed 15s timeout for production stability
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        if (typeof window !== 'undefined') console.warn(`[Supabase Fetch] TIMEOUT_TRIGGERED: ${urlString}`);
        controller.abort(new Error('Supabase request timed out (15s)'));
    }, 15000);

    if (typeof window !== 'undefined') console.log(`[Supabase Fetch] INIT: ${urlString}`);
    const start = Date.now();
    try {
        // Robust signal merging
        let signal = controller.signal;
        if (options?.signal) {
            const externalSignal = options.signal;
            if (externalSignal.aborted) {
                controller.abort(externalSignal.reason);
            } else {
                externalSignal.addEventListener('abort', () => {
                    controller.abort(externalSignal.reason);
                }, { once: true });
            }
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
                console.error(`[Supabase Fetch] TIMEOUT_FINAL (15s): ${urlString}`);
            } else if (error.name === 'AbortError') {
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
    // Basic env check (non-blocking log)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (typeof window !== 'undefined') console.error("[Supabase Client] CRITICAL: Environment variables missing!");
    }

    if (typeof window === 'undefined') {
        // Server-side: create a fresh one
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    fetch: customFetch
                }
            }
        );
    }

    if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;

    if (typeof window !== 'undefined') console.log("[Supabase Client] Creating new browser singleton...");
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
