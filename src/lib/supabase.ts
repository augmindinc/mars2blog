// Consolidated Supabase Client re-export
// This ensures that legacy services (blogService, categoryService, etc.) 
// use the same singleton instance as the AuthContext and SSR utilities.
import { supabaseBrowser } from '@/utils/supabase/client';

export const supabase = supabaseBrowser;
