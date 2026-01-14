import { getPostByShortCode } from '@/services/blogService';
import { redirect, notFound } from 'next/navigation';

interface ShortUrlPageProps {
    params: Promise<{
        shortCode: string;
    }>;
}

export default async function ShortUrlPage({ params }: ShortUrlPageProps) {
    const { shortCode } = await params;

    // Fetch post by short code
    const post = await getPostByShortCode(shortCode);

    if (post) {
        // Redirection logic: default to 'ko' or detect from post if needed
        // For now, redirect to the Korean version of the blog
        redirect(`/ko/blog/${post.slug}`);
    } else {
        // Post not found
        notFound();
    }
}
