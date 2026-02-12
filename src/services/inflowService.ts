import { supabase } from '@/lib/supabase';
import { InflowLog } from '@/types/blog';

const TABLE_NAME = 'inflow_logs';

export const logInflow = async (log: Omit<InflowLog, 'id'>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                post_id: log.postId,
                post_title: log.postTitle,
                referrer: log.referrer,
                referrer_domain: log.referrerDomain,
                search_keyword: log.searchKeyword,
                user_agent: log.userAgent,
                created_at: new Date().toISOString()
            }]);

        if (error) throw error;
    } catch (error) {
        console.error("Error logging inflow:", error);
    }
};

export const getInflowLogs = async (max: number = 100): Promise<InflowLog[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(max);

        if (error) throw error;
        return (data || []) as InflowLog[];
    } catch (error) {
        console.error("Error fetching inflow logs:", error);
        return [];
    }
};

export const getInflowLogsByPost = async (postId: string): Promise<InflowLog[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as InflowLog[];
    } catch (error) {
        console.error("Error fetching inflow logs by post:", error);
        return [];
    }
};

export const getInflowLogsByDays = async (days: number): Promise<InflowLog[]> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .not('search_keyword', 'is', null)
            .gte('created_at', startDate.toISOString());

        if (error) throw error;
        return (data || []) as InflowLog[];
    } catch (error) {
        console.error("Error fetching inflow logs by days:", error);
        return [];
    }
};
