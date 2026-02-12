import { supabase } from '@/lib/supabase';
import { ContentPlan } from '@/types/blog';

const TABLE_NAME = 'content_plans';

export const getContentPlans = async (sourcePostId?: string): Promise<ContentPlan[]> => {
    try {
        let query = supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (sourcePostId) {
            query = query.eq('source_post_id', sourcePostId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []).map(d => ({
            ...d,
            sourcePostId: d.source_post_id,
            createdAt: d.created_at
        })) as ContentPlan[];
    } catch (error) {
        console.error("Error fetching content plans:", error);
        return [];
    }
};

export const createContentPlan = async (plan: Omit<ContentPlan, 'id'>) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                source_post_id: plan.sourcePostId,
                title: plan.title,
                target_platform: (plan as any).targetPlatform || null,
                status: (plan as any).status || 'pending',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error("Error creating content plan:", error);
        throw error;
    }
};

export const updateContentPlan = async (id: string, data: Partial<ContentPlan>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error updating content plan:", error);
        throw error;
    }
};

export const deleteContentPlan = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting content plan:", error);
        throw error;
    }
};

export const deleteContentPlansBySourceId = async (sourcePostId: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('source_post_id', sourcePostId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting content plans by source ID:", error);
        throw error;
    }
};
