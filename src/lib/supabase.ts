import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined') {
    console.log('[Supabase] Initializing...');
    console.log('[Supabase] URL prefix:', supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'MISSING');
    console.log('[Supabase] Key length:', supabaseAnonKey ? supabaseAnonKey.length : 'MISSING');
    console.log('[Supabase] Environment:', process.env.NODE_ENV);

    // Connectivity test with proper header
    if (supabaseUrl && supabaseAnonKey) {
        fetch(`${supabaseUrl}/auth/v1/health`, {
            headers: { 'apikey': supabaseAnonKey }
        })
            .then(res => console.log('[Supabase] Connectivity test (health):', res.status))
            .catch(err => console.error('[Supabase] Connectivity test failed:', err.message));
    }
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
