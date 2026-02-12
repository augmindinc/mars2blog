import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PostList } from '@/components/blog/PostList';
import { Metadata } from 'next';
import { getCachedPosts, serializePost } from '@/services/blogService';
import { PostListSkeleton } from '@/components/blog/PostListSkeleton';

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
    const { locale } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';

    return {
        alternates: {
            canonical: `${baseUrl}/${locale}`,
            languages: {
                'ko': `${baseUrl}/ko`,
                'en': `${baseUrl}/en`,
                'ja': `${baseUrl}/ja`,
                'zh': `${baseUrl}/zh`,
                'x-default': `${baseUrl}/`,
            },
        },
    };
}

async function PostListSection({ locale }: { locale: string }) {
    // Pre-fetch posts and categories on the server to reduce client-side requests
    const [rawPosts, categories] = await Promise.all([
        getCachedPosts('ALL', locale),
        import('@/services/categoryService').then(m => m.getCategories())
    ]);

    const initialPosts = rawPosts.map(serializePost);

    return <PostList initialData={initialPosts} initialCategories={categories} />;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;
    const t = await getTranslations('HomePage');

    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <header className="mb-16 text-center">
                    <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">
                        {t('title')}
                    </h1>
                    <div className="flex justify-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-t border-black/10 pt-4 px-8">
                            {t('welcome')}
                        </p>
                    </div>
                </header>

                <Suspense fallback={<PostListSkeleton />}>
                    <PostListSection locale={locale} />
                </Suspense>
            </div>
        </main>
    );
}
