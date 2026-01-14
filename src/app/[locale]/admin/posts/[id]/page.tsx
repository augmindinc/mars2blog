'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPost } from '@/services/blogService';
import { Post, CATEGORY_LABELS } from '@/types/blog';
import { Button } from '@/components/ui/button';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { Pencil, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function AdminPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const locale = useLocale() as 'en' | 'ko';
    // Unwrap params
    const { id } = use(params);

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            const data = await getPost(id);
            if (data) {
                setPost(data);
            } else {
                alert('Post not found');
                router.push(`/${locale}/admin`);
            }
            setIsLoading(false);
        };
        fetchPost();
    }, [id, router, locale]);

    if (isLoading) return <div className="p-8 text-center">Loading post...</div>;
    if (!post) return <div className="p-8 text-center">Post not found</div>;

    const categoryLabel = CATEGORY_LABELS[post.category][locale] || post.category;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <Button variant="ghost" className="gap-2" onClick={() => router.push(`/${locale}/admin`)}>
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Button>
                <div className="flex gap-2">
                    <Link href={`/admin/posts/${id}/edit`}>
                        <Button>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Post
                        </Button>
                    </Link>
                </div>
            </div>

            <article className="bg-background rounded-lg border p-8 shadow-sm">
                <div className="mb-8 border-b pb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {post.status.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full">
                            {categoryLabel}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{post.title}</h1>

                    <div className="text-muted-foreground text-sm flex items-center gap-4">
                        {post.author.photoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.author.photoUrl} alt={post.author.name} className="w-6 h-6 rounded-full" />
                        )}
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <span>
                            {post.createdAt?.seconds
                                ? format(new Date(post.createdAt.seconds * 1000), 'yyyy.MM.dd HH:mm')
                                : format(new Date(), 'yyyy.MM.dd HH:mm')}
                        </span>
                        <span>•</span>
                        <span>Views: {post.viewCount}</span>
                    </div>
                </div>

                {post.thumbnail.url && (
                    <div className="relative w-full aspect-video mb-8 rounded-xl overflow-hidden bg-muted border">
                        <Image
                            src={post.thumbnail.url}
                            alt={post.thumbnail.alt || post.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
                            priority
                            unoptimized
                        />
                    </div>
                )}

                {post.excerpt && (
                    <div className="mb-8 p-4 bg-muted/50 rounded-lg italic text-muted-foreground">
                        <p>{post.excerpt}</p>
                    </div>
                )}

                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {post.content}
                    </ReactMarkdown>
                </div>
            </article>
        </div>
    );
}
