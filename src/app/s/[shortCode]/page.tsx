import { getPostByShortCode, getPostTranslations } from '@/services/blogService';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';

interface ShortUrlPageProps {
    params: Promise<{
        shortCode: string;
    }>;
}

export default async function ShortUrlPage({ params }: ShortUrlPageProps) {
    const { shortCode } = await params;
    const headerList = await headers();
    const acceptLanguage = headerList.get('accept-language') || '';

    // Simple browser language detection
    let preferredLocale = 'ko';
    if (acceptLanguage.toLowerCase().startsWith('en')) {
        preferredLocale = 'en';
    } else if (acceptLanguage.toLowerCase().startsWith('ja')) {
        preferredLocale = 'ja';
    } else if (acceptLanguage.toLowerCase().startsWith('zh')) {
        preferredLocale = 'zh';
    }

    // Fetch initial post by short code
    const initialPost = await getPostByShortCode(shortCode);

    if (!initialPost) {
        notFound();
    }

    // Fetch all translations in the same group to find the best language match
    const translations = await getPostTranslations(initialPost.groupId);

    // Try to find a published translation that matches the user's preferred language
    const bestMatch = translations.find(t =>
        t.locale === preferredLocale &&
        t.status === 'published'
    ) || (initialPost.status === 'published' ? initialPost : translations.find(t => t.status === 'published'));

    if (bestMatch) {
        redirect(`/${bestMatch.locale}/blog/${bestMatch.slug}`);
    } else {
        notFound();
    }
}
