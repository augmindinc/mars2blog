import { Timestamp } from 'firebase/firestore';

export type Category = string;

export interface CategoryMeta {
    id: string;
    name: Record<string, string>; // { ko: '기획', en: 'Planning', ja: '企画', zh: '策划' }
    slug: string; // e.g., 'planning'
    order: number;
    createdAt: Timestamp;
}

export const CATEGORY_LABELS: Record<string, Record<string, string>> = {
    ALL: { ko: '전체', en: 'All', ja: 'すべて', zh: '全部' },
    PLANNING: { ko: '기획', en: 'Planning', ja: '企画', zh: '策划' },
    SHOPPING: { ko: '쇼핑', en: 'Shopping', ja: 'ショッピング', zh: '购物' },
    COOKING: { ko: '요리', en: 'Cooking', ja: '料理', zh: '烹饪' },
    TRAVEL: { ko: '여행', en: 'Travel', ja: '旅行', zh: '旅行' },
    ISSUE: { ko: '이슈', en: 'Issue', ja: '話題', zh: '热점' },
    ESSAY: { ko: '에세이', en: 'Essay', ja: 'エッセ이', zh: '散文' },
    TRIAL: { ko: '체험단', en: 'Trial', ja: '体験団', zh: '体验团' },
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
    embedding?: number[];
    linkedLandingPageId?: string | null; // ID of the landing page to be promoted in this post
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

export interface BotLog {
    id: string;
    botName: string;
    botCompany: string;
    pagePath: string;
    userAgent: string;
    ip?: string;
    createdAt: Timestamp;
}
