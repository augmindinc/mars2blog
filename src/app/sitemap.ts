import { MetadataRoute } from 'next';
import { getPosts } from '@/services/blogService';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';

    // Fetch all published posts
    const posts = await getPosts('ALL');

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/ko/blog/${post.slug}`,
        lastModified: post.updatedAt?.toDate() || new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // Add static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/ko`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
    ];

    return [...staticPages, ...postEntries];
}
