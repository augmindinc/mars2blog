import { MetadataRoute } from 'next';
import { getAllPublishedPosts } from '@/services/blogService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';
    const locales = ['ko', 'en', 'ja', 'zh'];

    // Fetch all published posts across all locales
    const posts = await getAllPublishedPosts();

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/${post.locale}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // Add static pages for all locales
    const staticPages: MetadataRoute.Sitemap = locales.map((locale) => ({
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.9,
    }));

    return [...staticPages, ...postEntries];
}
