'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPosts, subscribeToPosts } from '@/services/blogService';
import { Category } from '@/types/blog';
import { CategoryFilter } from './CategoryFilter';
import { PostCard } from './PostCard';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function PostList() {
    const [category, setCategory] = useState<Category>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const t = useTranslations('PostList');

    const { data: posts, isLoading, isError } = useQuery({
        queryKey: ['posts', category, locale],
        queryFn: () => getPosts(category, locale),
    });

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubscribe = subscribeToPosts(category, locale, (newPosts) => {
            queryClient.setQueryData(['posts', category, locale], newPosts);
        });

        return () => unsubscribe();
    }, [category, locale, queryClient]);

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        if (!searchTerm.trim()) return posts;

        const term = searchTerm.toLowerCase().trim();
        return posts.filter(post =>
            post.title.toLowerCase().includes(term) ||
            post.content.toLowerCase().includes(term) ||
            post.excerpt?.toLowerCase().includes(term)
        );
    }, [posts, searchTerm]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <CategoryFilter currentCategory={category} onSelectCategory={setCategory} />

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 pr-10 h-10 rounded-none border-black/10 focus-visible:ring-black/5 bg-white/50"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-80 bg-muted/20 animate-pulse rounded-none border border-black/5" />
                    ))}
                </div>
            )}

            {isError && (
                <div className="text-center py-12 text-destructive font-medium uppercase tracking-widest text-xs">
                    Failed to load posts. Please try again later.
                </div>
            )}

            {!isLoading && !isError && filteredPosts.length === 0 && (
                <div className="text-center py-20 border border-dashed border-black/10">
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">
                        {searchTerm ? t('noSearchResults') : t('noPosts')}
                    </p>
                </div>
            )}

            {!isLoading && filteredPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredPosts.map((post, index) => (
                        <PostCard key={post.id} post={post} priority={index < 6} />
                    ))}
                </div>
            )}
        </div>
    );
}
