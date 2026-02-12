import { createBrowserClient } from '@supabase/ssr'

// Custom fetch with granular tracing for production debugging
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    if (typeof window === 'undefined') return fetch(url, options); // Skip tracing on server for now

    const urlString = url.toString();
    console.log(`[Supabase Trace] 1. fetch_enter: ${urlString}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn(`[Supabase Trace] TIMEOUT_SIGNAL_SENDING: ${urlString}`);
        controller.abort(new Error('Supabase request timed out (15s)'));
    }, 15000);

    try {
        console.log(`[Supabase Trace] 2. preparing_signal: ${urlString}`);
        let signal = controller.signal;

        // Use basic manual linkage if external signal exists
        if (options?.signal) {
            const external = options.signal;
            if (external.aborted) {
                console.warn(`[Supabase Trace] 2b. external_signal_already_aborted: ${urlString}`);
                controller.abort(external.reason);
            } else {
                external.addEventListener('abort', () => {
                    console.log(`[Supabase Trace] 2c. external_signal_triggered: ${urlString}`);
                    controller.abort(external.reason);
                }, { once: true });
            }
        }

        console.log(`[Supabase Trace] 3. calling_native_fetch: ${urlString}`);
        const response = await fetch(url, { ...options, signal });

        clearTimeout(timeoutId);
        console.log(`[Supabase Trace] 4. fetch_done: ${urlString} (Status: ${response.status})`);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            const reason = controller.signal.aborted ? 'InternalTimeout' : 'UserCancellation';
            console.error(`[Supabase Trace] FAIL_ABORT (${reason}): ${urlString}`);
        } else {
            console.error(`[Supabase Trace] FAIL_NETWORK: ${urlString} - ${error.message}`);
        }
        throw error;
    }
};

// Singleton storage
declare global {
    interface Window {
        __SUPABASE_CLIENT__?: any;
    }
}

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (typeof window === 'undefined') {
        return createBrowserClient(url, key);
    }

    if (window.__SUPABASE_CLIENT__) return window.__SUPABASE_CLIENT__;

    console.log("[Supabase Client] INIT_NEW_INSTANCE", {
        urlLength: url.length,
        hasKey: !!key,
        env: process.env.NODE_ENV
    });

    window.__SUPABASE_CLIENT__ = createBrowserClient(url, key, {
        global: { fetch: customFetch }
    });

    return window.__SUPABASE_CLIENT__;
}

export const supabaseBrowser = createClient();
