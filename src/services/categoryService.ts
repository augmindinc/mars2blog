import { supabase } from '@/lib/supabase';
import { CategoryMeta, CATEGORY_LABELS } from '@/types/blog';

const TABLE_NAME = 'categories';

export const getCategories = async (): Promise<CategoryMeta[]> => {
    try {
        const start = Date.now();
        if (typeof window !== 'undefined') console.log('[categoryService] getCategories: START_DATABASE_QUERY');

        const query = supabase
            .from(TABLE_NAME)
            .select('*')
            .order('order', { ascending: true });

        if (typeof window !== 'undefined') console.log('[categoryService] getCategories: AWAITING_QUERY_PROMISE...');
        const { data, error, status } = await query;

        if (error) {
            console.error("[categoryService] getCategories: Supabase error:", error.message);
            throw error;
        }

        if (typeof window !== 'undefined') {
            const duration = Date.now() - start;
            console.log(`[categoryService] getCategories: QUERY_RETURNED in ${duration}ms`, { count: data?.length || 0, status });
        }

        return (data || []).map((d: any) => ({
            ...d,
            createdAt: d.created_at
        })) as CategoryMeta[];
    } catch (error: any) {
        console.error("[categoryService] getCategories: CRITICAL_ERROR", error.message || error);
        return [];
    }
};

export const addCategory = async (data: Omit<CategoryMeta, 'id' | 'createdAt'>) => {
    try {
        const { data: newCat, error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                ...data,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return newCat.id;
    } catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
};

export const updateCategory = async (id: string, data: Partial<CategoryMeta>) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, createdAt, ...updateData } = data;

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                ...updateData,
                created_at: createdAt ? (createdAt as string) : undefined
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error updating category:", error);
        throw error;
    }
};

export const deleteCategory = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting category:", error);
        throw error;
    }
};

export const seedCategories = async (initialLabels: Record<string, Record<string, string>>) => {
    const existing = await getCategories();
    if (existing.length > 0) return;

    const entries = Object.entries(initialLabels).filter(([key]) => key !== 'ALL');

    for (let i = 0; i < entries.length; i++) {
        const [key, labels] = entries[i];
        await addCategory({
            name: labels,
            slug: key.toLowerCase(),
            order: i
        });
    }
};

export const getCategoryLabel = async (categoryId: string, locale: string): Promise<string> => {
    try {
        const categories = await getCategories();
        const cat = categories.find(c => c.id === categoryId || c.slug.toUpperCase() === categoryId);
        if (cat) {
            return cat.name[locale] || cat.name['ko'] || cat.name['en'] || categoryId;
        }
        return CATEGORY_LABELS[categoryId]?.[locale] || categoryId;
    } catch (error) {
        return CATEGORY_LABELS[categoryId]?.[locale] || categoryId;
    }
};
