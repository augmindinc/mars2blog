import { supabase } from '@/lib/supabase';
import { Post, Category } from '@/types/blog';
import { deleteContentPlansBySourceId } from './planService';

const TABLE_NAME = 'posts';

// Identity function for backward compatibility
export const serializePost = (post: Post): Post => post;

// Helper to convert database snake_case to TypeScript camelCase
export const mapPostFromDb = (data: any): Post => {
    return {
        ...data,
        groupId: data.group_id,
        viewCount: data.view_count,
        shortCode: data.short_code,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        linkedLandingPageId: data.linked_landing_page_id,
        thumbnail: {
            url: data.thumbnail_url || '',
            alt: data.thumbnail_alt || ''
        }
    };
};

// Helper to convert TypeScript camelCase to database snake_case
export const mapPostToDb = (post: Partial<Post>): any => {
    const { groupId, viewCount, shortCode, publishedAt, createdAt, updatedAt, thumbnail, linkedLandingPageId, ...rest } = post;
    const mapped: any = { ...rest };
    if (groupId !== undefined) mapped.group_id = groupId;
    if (viewCount !== undefined) mapped.view_count = viewCount;
    if (shortCode !== undefined) mapped.short_code = shortCode;
    if (publishedAt !== undefined) mapped.published_at = publishedAt;
    if (createdAt !== undefined) mapped.created_at = createdAt;
    if (updatedAt !== undefined) mapped.updated_at = updatedAt;
    if (linkedLandingPageId !== undefined) mapped.linked_landing_page_id = linkedLandingPageId;
    if (thumbnail !== undefined) {
        mapped.thumbnail_url = thumbnail.url;
        mapped.thumbnail_alt = thumbnail.alt;
    }
    return mapped;
};

// Helper to extract image URLs from content (remains the same as before)
const extractImageUrls = (content: string): string[] => {
    const urls: string[] = [];

    // 1. Markdown images: ![alt](url)
    const mdImgRegex = /!\[.*?\]\((.*?)\)/g;
    let mdMatch;
    while ((mdMatch = mdImgRegex.exec(content)) !== null) {
        if (mdMatch[1].includes('supabase.co')) {
            urls.push(mdMatch[1]);
        }
    }

    // 2. HTML images: <img src="url" ...>
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let htmlMatch;
    while ((htmlMatch = imgRegex.exec(content)) !== null) {
        if (htmlMatch[1].includes('supabase.co')) {
            urls.push(htmlMatch[1]);
        }
    }

    return Array.from(new Set(urls));
};

import { unstable_cache } from 'next/cache';

export const getPosts = async (category: Category = 'ALL', locale: string = 'ko'): Promise<Post[]> => {
    try {
        if (typeof window !== 'undefined') console.log(`[blogService] getPosts started (cat: ${category}, locale: ${locale})`);
        let query = supabase
            .from(TABLE_NAME)
            .select('*')
            .in('status', ['published', 'scheduled'])
            .eq('locale', locale)
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false })
            .limit(100);

        if (category !== 'ALL') {
            // Support both UUID and Slug for backward/forward compatibility
            query = query.or(`category.eq."${category}",category.eq."${category.toLowerCase()}",category.eq."${category.toUpperCase()}"`);
        }

        const { data, error, status, statusText } = await query;
        if (typeof window !== 'undefined') {
            console.log(`[blogService] getPosts response: status=${status} (${statusText}), error=${error?.message || 'none'}, count=${data?.length || 0}`);
        }

        if (error) throw error;
        return (data || []).map(mapPostFromDb);
    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
};

export const getCachedPosts = async (category: Category = 'ALL', locale: string = 'ko') => {
    // Temporarily bypassing cache for diagnostics
    console.log(`[blogService] Fetching posts for ${category} in ${locale}`);
    return getPosts(category, locale);
};
/*
export const getCachedPosts = unstable_cache(
    async (category: Category = 'ALL', locale: string = 'ko') => {
        return getPosts(category, locale);
    },
    ['posts-list'],
    { revalidate: 300, tags: ['posts'] }
);
*/

// Supabase Real-time subscription
export const subscribeToPosts = (category: Category, locale: string = 'ko', callback: (posts: Post[]) => void) => {
    const channel = supabase
        .channel('public:posts')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: TABLE_NAME,
            filter: `locale=eq.${locale}`
        }, async (payload: any) => {
            console.log(`[blogService] Realtime update received for locale: ${locale}`, payload.eventType);
            // Re-fetch data on change
            const posts = await getPosts(category, locale);
            callback(posts);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const getAdminPosts = async (): Promise<Post[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPostFromDb);
    } catch (error) {
        console.error("[blogService] getAdminPosts: ERROR", error);
        return [];
    }
};

export const getAllPublishedPosts = async (): Promise<Post[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .in('status', ['published', 'scheduled'])
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapPostFromDb);
    } catch (error) {
        console.error("Error fetching all published posts:", error);
        return [];
    }
};

/**
 * Super fast vector search using Supabase pgvector!
 */
export const getRecommendedPosts = async (currentPost: Post, limitNum: number = 3): Promise<Post[]> => {
    try {
        if (!currentPost.embedding || currentPost.embedding.length === 0) {
            // Fallback to basic category search
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .in('status', ['published', 'scheduled'])
                .lte('published_at', new Date().toISOString())
                .eq('locale', currentPost.locale)
                .eq('category', currentPost.category)
                .neq('id', currentPost.id)
                .limit(limitNum);

            if (error) throw error;
            return (data || []).map(mapPostFromDb);
        }

        // Call RPC function for vector similarity
        const { data, error } = await supabase.rpc('match_posts', {
            query_embedding: currentPost.embedding,
            match_threshold: 0.5,
            match_count: limitNum,
            current_post_id: currentPost.id,
            current_locale: currentPost.locale
        });

        if (error) throw error;
        return (data || []).map(mapPostFromDb);
    } catch (error) {
        console.error("Error fetching recommended posts:", error);
        return [];
    }
};

export const subscribeToAdminPosts = (callback: (posts: Post[]) => void) => {
    const channel = supabase
        .channel('admin:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, async () => {
            const posts = await getAdminPosts();
            callback(posts);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const getPost = async (id: string): Promise<Post | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ? mapPostFromDb(data) : null;
    } catch (error) {
        console.error("Error fetching post:", error);
        return null;
    }
}

export const getPostBySlug = async (slug: string, locale: string = 'ko'): Promise<Post | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('slug', slug)
            .eq('locale', locale)
            .single();

        if (error) throw error;
        return data ? mapPostFromDb(data) : null;
    } catch (error) {
        console.error("Error fetching post by slug:", error);
        return null;
    }
}

export const getPostTranslations = async (groupId: string): Promise<Post[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('group_id', groupId);

        if (error) throw error;
        return (data || []).map(mapPostFromDb);
    } catch (error) {
        console.error("Error fetching post translations:", error);
        return [];
    }
}

export const getPostByShortCode = async (shortCode: string): Promise<Post | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('short_code', shortCode)
            .in('status', ['published', 'scheduled'])
            .limit(1);

        if (error) throw error;
        return data && data.length > 0 ? mapPostFromDb(data[0]) : null;
    } catch (error) {
        console.error("Error fetching post by short code:", error);
        return null;
    }
}

export const deletePost = async (id: string) => {
    try {
        // In Supabase, image deletion can be handled by Storage methods
        // but for now we focus on the database record.
        // Associated plans deletion can be handled by DB Foreign Key ON DELETE CASCADE
        // or we can call the service.
        await deleteContentPlansBySourceId(id);

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

export const createPost = async (post: Omit<Post, 'id'>) => {
    try {
        const mappedData = mapPostToDb(post);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([mappedData])
            .select()
            .single();

        if (error) throw error;
        return data ? mapPostFromDb(data) : null;
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
}

export const bulkInsertPosts = async (posts: Omit<Post, 'id'>[]) => {
    try {
        const mappedPosts = posts.map(p => mapPostToDb(p));
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert(mappedPosts);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error bulk inserting posts:", error);
        throw error;
    }
}

export const updatePost = async (id: string, data: Partial<Post>) => {
    try {
        const mappedData = mapPostToDb(data);

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                ...mappedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error updating post:", error);
        throw error;
    }
}

export const incrementViewCount = async (id: string) => {
    try {
        // Supabase atomic increment using rpc or update with math
        // Best practice is to use rpc or just a raw update if concurrency is low
        const { error } = await supabase.rpc('increment_view_count', { post_id: id });

        if (error) {
            // Fallback if RPC not defined yet
            const { data: post } = await supabase.from(TABLE_NAME).select('view_count').eq('id', id).single();
            if (post) {
                await supabase.from(TABLE_NAME).update({ view_count: (post.view_count || 0) + 1 }).eq('id', id);
            }
        }
    } catch (error) {
        console.error("Error incrementing view count:", error);
    }
}

export const bulkUpdateCategory = async (ids: string[], category: Category) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                category,
                updated_at: new Date().toISOString()
            })
            .in('id', ids);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error bulk updating categories:", error);
        throw error;
    }
};
