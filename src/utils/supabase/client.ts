import { createBrowserClient } from '@supabase/ssr'

// Custom fetch with logging and relaxed 15s timeout for production stability
const customFetch = async (url: string | URL | Request, options?: RequestInit) => {
    const urlString = url.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
            if (isTimeout) {
                console.warn(`[Supabase Fetch] TIMEOUT (15s): ${urlString}`);
            } else {
                console.error(`[Supabase Fetch] FAIL: ${urlString} - ${error.message}`);
            }
        }
        throw error;
    }
};

// Singleton instance to prevent "Multiple GoTrueClient instances" warning
let browserClient: any = null;

export function createClient() {
    if (browserClient) return browserClient;

    browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                fetch: customFetch
            }
        }
    )
    return browserClient;
}

// Export a constant for easy use in non-hook files
export const supabaseBrowser = createClient();
