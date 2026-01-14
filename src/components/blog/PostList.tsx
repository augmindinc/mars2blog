'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPosts, subscribeToPosts } from '@/services/blogService';
import { Category } from '@/types/blog';
import { CategoryFilter } from './CategoryFilter';
import { PostCard } from './PostCard';

export function PostList() {
    const [category, setCategory] = useState<Category>('ALL');
    const queryClient = useQueryClient();

    const { data: posts, isLoading, isError } = useQuery({
        queryKey: ['posts', category],
        queryFn: () => getPosts(category),
    });

    useEffect(() => {
        // Subscribe to real-time updates
        const unsubscribe = subscribeToPosts(category, (newPosts) => {
            queryClient.setQueryData(['posts', category], newPosts);
        });

        return () => unsubscribe();
    }, [category, queryClient]);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <CategoryFilter currentCategory={category} onSelectCategory={setCategory} />

            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-80 bg-muted/20 animate-pulse rounded-xl" />
                    ))}
                </div>
            )}

            {isError && (
                <div className="text-center py-12 text-destructive">
                    Failed to load posts. Please try again later.
                </div>
            )}

            {!isLoading && !isError && posts && posts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No posts found in this category.
                </div>
            )}

            {!isLoading && posts && posts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post, index) => (
                        <PostCard key={post.id} post={post} priority={index < 6} />
                    ))}
                </div>
            )}
        </div>
    );
}
