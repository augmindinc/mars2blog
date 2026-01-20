import { getPostBySlug, getPostTranslations, serializePost } from '@/services/blogService';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { getCategoryLabel } from '@/services/categoryService';
import { Metadata } from 'next';
import Image from 'next/image';
import { cache } from 'react';

import { TranslationManager } from '@/components/blog/TranslationManager';
import { ViewCounter } from '@/components/blog/ViewCounter';
import { RelatedPosts } from '@/components/blog/RelatedPosts';

const getPost = cache(async (slug: string, locale: string) => {
    return await getPostBySlug(slug, locale);
});

interface BlogPostPageProps {
    params: Promise<{
        slug: string;
        locale: string;
    }>;
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug, locale } = await params;
    const post = await getPost(slug, locale);

    if (!post) {
        return {
            title: 'Post Not Found',
        };
    }

    const title = post.seo.metaTitle || post.title;
    const description = post.seo.metaDesc || post.excerpt || post.content.replace(/[#*`]/g, '').substring(0, 160);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mars.it.kr';

    // Fetch all translations to build hreflang
    const translations = await getPostTranslations(post.groupId);
    const languages: Record<string, string> = {};
    translations.forEach(t => {
        languages[t.locale] = `${baseUrl}/${t.locale}/blog/${t.slug}`;
    });

    return {
        title: title,
        description: description,
        alternates: {
            canonical: `${baseUrl}/${locale}/blog/${post.slug}`,
            languages: languages,
        },
        openGraph: {
            title: title,
            description: description,
            images: post.thumbnail.url ? [post.thumbnail.url] : [],
            type: 'article',
            publishedTime: post.publishedAt?.toDate().toISOString(),
            modifiedTime: post.updatedAt?.toDate().toISOString(),
            authors: [post.author.name],
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: post.thumbnail.url ? [post.thumbnail.url] : [],
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug, locale } = await params;
    const post = await getPost(slug, locale);

    if (!post) {
        return notFound();
    }

    const serializedPost = serializePost(post);

    const categoryLabel = await getCategoryLabel(post.category, locale);

    const jsonLd = post.seo.structuredData || {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.seo.metaDesc || post.excerpt || post.content.replace(/[#*`]/g, '').substring(0, 160),
        image: post.thumbnail.url ? [post.thumbnail.url] : [],
        datePublished: post.publishedAt?.toDate().toISOString(),
        dateModified: post.updatedAt?.toDate().toISOString(),
        author: {
            '@type': 'Person',
            name: post.author.name,
            image: post.author.photoUrl,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Mars2Blog',
            logo: {
                '@type': 'ImageObject',
                url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/logo.png`,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${process.env.NEXT_PUBLIC_APP_URL || ''}/${locale}/blog/${post.slug}`,
        },
    };

    // Fetch all translations for language switcher
    const allTranslations = await getPostTranslations(post.groupId);
    const translationMap: Record<string, string> = {};
    allTranslations.forEach(t => {
        translationMap[t.locale] = t.slug;
    });

    return (
        <article className="container mx-auto px-4 py-8 max-w-3xl">
            <TranslationManager translations={translationMap} />
            <ViewCounter postId={serializedPost.id} postTitle={serializedPost.title} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="mb-12 text-center">
                <div className="flex justify-center gap-2 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white px-3 py-1 bg-black">
                        {categoryLabel}
                    </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{serializedPost.title}</h1>
                <div className="text-muted-foreground text-sm flex justify-center items-center gap-4">
                    {serializedPost.author.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={serializedPost.author.photoUrl} alt={serializedPost.author.name} className="w-6 h-6 rounded-none border border-black/10" />
                    )}
                    <span>{serializedPost.author.name}</span>
                    <span>•</span>
                    <span>
                        {serializedPost.createdAt?.seconds
                            ? format(new Date(serializedPost.createdAt.seconds * 1000), 'yyyy.MM.dd')
                            : format(new Date(), 'yyyy.MM.dd')}
                    </span>
                </div>
            </div>

            {serializedPost.thumbnail.url && (
                <div className="relative w-full aspect-video mb-16 rounded-none overflow-hidden border border-black">
                    <Image
                        src={serializedPost.thumbnail.url}
                        alt={serializedPost.thumbnail.alt || serializedPost.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
                        unoptimized
                    />
                </div>
            )}

            {serializedPost.excerpt && (
                <div className="mb-16 p-8 bg-black/[0.02] border border-black/10">
                    <h2 className="text-sm font-semibold mb-4 text-black border-b border-black/5 pb-2 inline-block">Key Highlights</h2>
                    <p className="text-muted-foreground leading-relaxed italic text-lg">
                        {serializedPost.excerpt}
                    </p>
                </div>
            )}

            <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {serializedPost.content}
                </ReactMarkdown>
            </div>

            <RelatedPosts currentPost={serializedPost} />
        </article>
    );
}
