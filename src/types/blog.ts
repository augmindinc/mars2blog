import { Timestamp } from 'firebase/firestore';

export type Category = 'ALL' | 'PLANNING' | 'SHOPPING' | 'COOKING' | 'TRAVEL' | 'ISSUE';

export const CATEGORY_LABELS: Record<Category, { ko: string; en: string }> = {
    ALL: { ko: '전체', en: 'All' },
    PLANNING: { ko: '기획', en: 'Planning' },
    SHOPPING: { ko: '쇼핑', en: 'Shopping' },
    COOKING: { ko: '요리', en: 'Cooking' },
    TRAVEL: { ko: '여행', en: 'Travel' },
    ISSUE: { ko: '이슈', en: 'Issue' },
};

export interface Post {
    id: string;
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
    shortCode?: string;
}
