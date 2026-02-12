'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPost } from '@/services/blogService';
import { Post } from '@/types/blog';
import { useCategories } from '@/hooks/useCategories';
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
    const { data: categories } = useCategories();

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

    if (isLoading) return <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Retrieving Record...</div>;
    if (!post) return <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Record not found</div>;

    const dynamicCat = categories?.find(c => c.id === post.category || c.slug.toUpperCase() === post.category);
    const categoryLabel = dynamicCat
        ? (dynamicCat.name[locale] || dynamicCat.name['ko'] || dynamicCat.name['en'])
        : post.category;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="gap-2 rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-black/[0.05]" onClick={() => router.push(`/${locale}/admin`)}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Terminal
                </Button>
                <div className="flex gap-2">
                    <Link href={`/admin/posts/${id}/edit`}>
                        <Button className="rounded-none bg-black text-white hover:bg-black/90 font-bold text-[10px] uppercase tracking-widest px-6 h-10">
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Modify Entry
                        </Button>
                    </Link>
                </div>
            </div>

            <article className="bg-white rounded-none border border-black/10 p-12 shadow-none overflow-hidden">
                <div className="mb-12 border-b border-black/5 pb-8">
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`px-2.5 py-1 border text-[10px] font-black uppercase tracking-widest rounded-none ${post.status === 'published' ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20'}`}>
                            {post.status}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground px-3 py-1 bg-black/[0.02] border border-black/5 rounded-none uppercase tracking-tight">
                            {categoryLabel}
                        </span>
                    </div>

                    <h1 className="text-3xl font-black mb-6 leading-tight uppercase tracking-tighter text-black">{post.title}</h1>

                    <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest flex items-center gap-4">
                        {post.author.photoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.author.photoUrl} alt={post.author.name} className="w-6 h-6 rounded-none border border-black/10 grayscale" />
                        )}
                        <span className="text-black">{post.author.name}</span>
                        <span className="text-black/10">•</span>
                        <span>
                            {post.createdAt
                                ? format(new Date(post.createdAt?.seconds ? post.createdAt.seconds * 1000 : post.createdAt), 'yyyy.MM.dd')
                                : format(new Date(), 'yyyy.MM.dd')}
                        </span>
                        <span className="text-black/10">•</span>
                        <span>Engagement: {post.viewCount.toLocaleString().padStart(2, '0')}</span>
                    </div>
                </div>

                {post.thumbnail.url && (
                    <div className="relative w-full aspect-video mb-12 rounded-none overflow-hidden bg-black/[0.02] border border-black/10">
                        <Image
                            src={post.thumbnail.url}
                            alt={post.thumbnail.alt || post.title}
                            fill
                            className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 60vw"
                            priority
                            unoptimized
                        />
                    </div>
                )}

                {post.excerpt && (
                    <div className="mb-12 p-8 bg-black/[0.02] border-l-2 border-black rounded-none">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-black mb-3">Manifesto / Abstract</h2>
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground uppercase tracking-tight italic">
                            "{post.excerpt}"
                        </p>
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
