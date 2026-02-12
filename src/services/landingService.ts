import { supabase } from '@/lib/supabase';
import { LandingPage, LandingPageSubmission } from '@/types/landing';

const TABLE_NAME = 'landing_pages';
const SUBMISSIONS_TABLE = 'landing_submissions';

// Helper to convert database snake_case to TypeScript camelCase
export const mapLandingPageFromDb = (data: any): LandingPage => {
    return {
        ...data,
        groupId: data.group_id,
        templateId: data.template_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        formConfig: data.form_config,
        stats: {
            views: data.view_count || 0,
            conversions: data.conversion_count || 0
        }
    };
};

// Helper to convert TypeScript camelCase to database snake_case
export const mapLandingPageToDb = (page: Partial<LandingPage>): any => {
    const { groupId, templateId, formConfig, stats, createdAt, updatedAt, ...rest } = page;
    const mapped: any = { ...rest };
    if (groupId !== undefined) mapped.group_id = groupId;
    if (templateId !== undefined) mapped.template_id = templateId;
    if (formConfig !== undefined) mapped.form_config = formConfig;
    if (stats !== undefined) {
        mapped.view_count = stats.views;
        mapped.conversion_count = stats.conversions;
    }
    if (createdAt !== undefined) mapped.created_at = createdAt;
    if (updatedAt !== undefined) mapped.updated_at = updatedAt;
    return mapped;
};

// Helper for submissions
export const mapSubmissionFromDb = (data: any): LandingPageSubmission => {
    return {
        ...data,
        pageId: data.page_id,
        createdAt: data.created_at
    };
};

export const mapSubmissionToDb = (submission: Partial<LandingPageSubmission>): any => {
    const { pageId, createdAt, ...rest } = submission;
    const mapped: any = { ...rest };
    if (pageId !== undefined) mapped.page_id = pageId;
    if (createdAt !== undefined) mapped.created_at = createdAt;
    return mapped;
};

export const getLandingPages = async (): Promise<LandingPage[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapLandingPageFromDb);
    } catch (error) {
        console.error("Error fetching landing pages:", error);
        return [];
    }
};

export const subscribeToLandingPages = (callback: (pages: LandingPage[]) => void) => {
    const channel = supabase
        .channel('public:landing_pages')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, async () => {
            const pages = await getLandingPages();
            callback(pages);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const getLandingPage = async (id: string): Promise<LandingPage | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data ? mapLandingPageFromDb(data) : null;
    } catch (error) {
        console.error("Error fetching landing page:", error);
        return null;
    }
};

export const createLandingPage = async (page: Omit<LandingPage, 'id'>): Promise<string> => {
    try {
        const mappedPage = mapLandingPageToDb(page);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([mappedPage])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error("Error creating landing page:", error);
        throw error;
    }
};

export const updateLandingPage = async (id: string, page: Partial<LandingPage>): Promise<void> => {
    try {
        const mappedPage = mapLandingPageToDb(page);
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(mappedPage)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating landing page:", error);
        throw error;
    }
};

export const deleteLandingPage = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting landing page:", error);
        throw error;
    }
};

export const getLandingPageBySlug = async (slug: string, locale?: string): Promise<LandingPage | null> => {
    try {
        let query = supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('slug', slug);

        const { data: initialDocs, error } = await query;
        if (error) throw error;
        if (!initialDocs || initialDocs.length === 0) return null;

        // 2. Prioritize precise slug + locale match
        if (locale) {
            const preciseMatch = initialDocs.find((d: any) => d.locale === locale);
            if (preciseMatch) return preciseMatch as LandingPage;
        }

        // 3. Robust Translation lookup via groupId
        const referenceDoc = initialDocs[0];
        if (locale && referenceDoc.groupId) {
            const { data: groupDocs, error: groupError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('group_id', referenceDoc.groupId);

            if (groupError) throw groupError;
            if (groupDocs && groupDocs.length > 0) {
                const groupMatch = groupDocs.find((d: any) => d.locale === locale);
                if (groupMatch) return groupMatch as LandingPage;

                const groupFallback = groupDocs.find((d: any) => d.locale === 'ko' || !d.locale) || groupDocs[0];
                return groupFallback as LandingPage;
            }
        }

        const finalFallback = initialDocs.find((d: any) => d.locale === 'ko' || !d.locale) || initialDocs[0];
        return mapLandingPageFromDb(finalFallback);
    } catch (error) {
        console.error("Error fetching landing page by slug:", error);
        return null;
    }
};

export const getLandingPageTranslations = async (groupId: string): Promise<LandingPage[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('groupId', groupId);

        if (error) throw error;
        return (data || []).map(mapLandingPageFromDb);
    } catch (error) {
        console.error("Error fetching landing page translations:", error);
        return [];
    }
};

export const getSubmissions = async (pageId?: string): Promise<LandingPageSubmission[]> => {
    try {
        let query = supabase
            .from(SUBMISSIONS_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (pageId) {
            query = query.eq('page_id', pageId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapSubmissionFromDb);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return [];
    }
};

export const createSubmission = async (submission: Omit<LandingPageSubmission, 'id'>): Promise<string> => {
    try {
        const mappedSubmission = mapSubmissionToDb(submission);
        const { data, error } = await supabase
            .from(SUBMISSIONS_TABLE)
            .insert([mappedSubmission])
            .select()
            .single();

        if (error) throw error;

        // 2. Increment conversion stat (Atomic increment in Supabase)
        await supabase.rpc('increment_landing_conversions', { page_id: submission.pageId });

        return data.id;
    } catch (error) {
        console.error("Error creating submission:", error);
        throw error;
    }
};

export const incrementPageView = async (pageId: string): Promise<void> => {
    try {
        await supabase.rpc('increment_landing_views', { page_id: pageId });
    } catch (error) {
        console.error("Error incrementing landing views:", error);
    }
};
