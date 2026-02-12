'use client';

import { Post, CATEGORY_LABELS } from '@/types/blog';
import { useLocale } from 'next-intl';
import { useCategories } from '@/hooks/useCategories';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { Link } from '@/i18n/routing';

interface PostCardProps {
    post: Post;
    priority?: boolean;
    fromPostTitle?: string;
}

export function PostCard({ post, priority = false, fromPostTitle }: PostCardProps) {
    const locale = useLocale() as 'en' | 'ko';
    const { data: categories } = useCategories();

    const postHref = fromPostTitle
        ? `/blog/${post.slug}?from_title=${encodeURIComponent(fromPostTitle)}`
        : `/blog/${post.slug}`;

    // Get dynamic label
    const dynamicCategory = categories?.find(c => c.id === post.category || c.slug.toUpperCase() === post.category);
    const categoryLabel = dynamicCategory
        ? (dynamicCategory.name[locale] || dynamicCategory.name['ko'] || dynamicCategory.name['en'])
        : (CATEGORY_LABELS[post.category]?.[locale] || post.category);

    return (
        <Link href={postHref} className="block h-full group">
            <Card className="rounded-none border-black/10 group-hover:border-black/20 group-hover:bg-black/[0.01] transition-all h-full flex flex-col">
                <div className="relative w-full h-48 bg-muted">
                    {post.thumbnail.url ? (
                        <Image
                            src={post.thumbnail.url}
                            alt={post.thumbnail.alt || post.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={priority}
                            unoptimized
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No Image
                        </div>
                    )}
                </div>
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-white px-2.5 py-1 bg-black">
                            {categoryLabel}
                        </span>
                        <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                            {/* Handle Timestamp or Date object robustly */}
                            {post.createdAt
                                ? format(new Date(post.createdAt as string), 'yyyy.MM.dd')
                                : format(new Date(), 'yyyy.MM.dd')}
                        </span>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2 leading-tight group-hover:text-black/70 transition-colors">
                        {post.title}
                    </h3>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {post.excerpt || post.content.substring(0, 100)}...
                    </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between items-center">
                    <span>by {post.author.name}</span>
                    <span>View {post.viewCount}</span>
                </CardFooter>
            </Card>
        </Link>
    );
}
