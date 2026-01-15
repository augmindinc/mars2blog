'use client';

import { Post, CATEGORY_LABELS } from '@/types/blog';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { Link } from '@/i18n/routing';

interface PostCardProps {
    post: Post;
    priority?: boolean;
}

export function PostCard({ post, priority = false }: PostCardProps) {
    const locale = useLocale() as 'en' | 'ko';

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
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
                    <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded-full">
                        {CATEGORY_LABELS[post.category]?.[locale] || post.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {/* Handle Timestamp or Date object robustly */}
                        {post.createdAt?.seconds
                            ? format(new Date(post.createdAt.seconds * 1000), 'yyyy.MM.dd')
                            : format(new Date(), 'yyyy.MM.dd')}
                    </span>
                </div>
                <h3 className="font-bold text-lg line-clamp-2 leading-tight">
                    <Link href={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                    </Link>
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
    );
}
