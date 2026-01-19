import { Post } from '@/types/blog';
import { getRecommendedPosts, serializePost } from '@/services/blogService';
import { PostCard } from './PostCard';
import { getTranslations } from 'next-intl/server';

interface RelatedPostsProps {
    currentPost: Post;
}

export async function RelatedPosts({ currentPost }: RelatedPostsProps) {
    const rawPosts = await getRecommendedPosts(currentPost);
    const posts = rawPosts.map(serializePost);
    const t = await getTranslations('BlogPost');

    if (posts.length === 0) return null;

    return (
        <section className="mt-16 pt-16 border-t">
            <h2 className="text-2xl font-bold mb-8">{t('relatedPosts')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} fromPostTitle={currentPost.title} />
                ))}
            </div>
        </section>
    );
}
