import { Timestamp } from 'firebase/firestore';

export type Category = 'ALL' | 'PLANNING' | 'SHOPPING' | 'COOKING' | 'TRAVEL' | 'ISSUE';

export const CATEGORY_LABELS: Record<Category, Record<string, string>> = {
    ALL: { ko: '전체', en: 'All', ja: 'すべて', zh: '全部' },
    PLANNING: { ko: '기획', en: 'Planning', ja: '企画', zh: '策划' },
    SHOPPING: { ko: '쇼핑', en: 'Shopping', ja: 'ショッピング', zh: '购物' },
    COOKING: { ko: '요리', en: 'Cooking', ja: '料理', zh: '烹饪' },
    TRAVEL: { ko: '여행', en: 'Travel', ja: '旅行', zh: '旅行' },
    ISSUE: { ko: '이슈', en: 'Issue', ja: '話題', zh: '热점' },
};

export interface Post {
    id: string;
    groupId: string; // To link translations
    locale: string;  // ko, en, ja, zh
    title: string;
    content: string; // Markdown
    excerpt: string; // AI 요약 및 검색 결과용 (TL;DR)
    slug: string;
    category: Category;
    tags: string[];
    author: {
        id: string;
        name: string;
        photoUrl: string | null;
    };
    thumbnail: {
        url: string;
        alt: string;
    };
    seo: {
        metaTitle: string;
        metaDesc: string;
        structuredData?: any; // JSON-LD 생성용
    };
    status: 'published' | 'draft' | 'scheduled';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    publishedAt: Timestamp;
    viewCount: number;
    shortCode: string | null;
}

export interface ContentPlan {
    id: string;
    title: string;
    description: string;
    reason: string;
    completed: boolean;
    contentType: 'informational' | 'trend';
    sourcePostId: string;
    createdAt: Timestamp;
    authorId: string;
}

export interface InflowLog {
    id: string;
    postId: string;
    postTitle: string;
    referrer: string;
    referrerDomain: string;
    searchKeyword: string | null;
    userAgent: string;
    createdAt: Timestamp;
}
