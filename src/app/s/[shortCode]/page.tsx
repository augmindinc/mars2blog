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
        // Redirect to the specific language version of the post
        redirect(`/${post.locale}/blog/${post.slug}`);
    } else {
        // Post not found
        notFound();
    }
}
